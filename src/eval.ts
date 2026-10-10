import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { atomicWrite, install, safe, type Target } from './installer.js';

// Avaliação de eficácia com as tuas próprias tarefas: corre o mesmo pedido com e sem o kit, no CLI
// que escolheres, e aplica verificações determinísticas ao resultado. Não usa modelo próprio nem
// chama serviços: só executa o comando que indicares, e é esse comando que gasta tokens. Por isso
// recusa corridas acima de `maxRuns`, a não ser que o aumentes de propósito.
//
// Um ficheiro de suite é código: as verificações do tipo `command` correm no shell. Corre só suites
// em que confias.
export type Check =
  | { type: 'output-matches' | 'output-not-matches'; pattern: string; flags?: string }
  | { type: 'file-exists' | 'file-not-exists'; path: string }
  | { type: 'file-matches'; path: string; pattern: string; flags?: string }
  | { type: 'command'; run: string; expectExit?: number };
export interface Task { id: string; prompt: string; fixture?: string; checks: Check[] }
export interface Suite { version: 1; tasks: Task[] }
export type Arm = 'kit' | 'plain';
export interface RunResult {
  task: string; arm: Arm; repetition: number; exitCode: number | null; timedOut: boolean; durationMs: number;
  checks: { type: string; ok: boolean; detail?: string }[]; passed: boolean; outputBytes: number;
}
export interface ArmSummary { runs: number; passed: number; passRate: number; meanCheckRate: number; meanDurationMs: number }
export interface EvalReport {
  suite: string; command: string; cli: Target; repeat: number; arms: Arm[]; startedAt: string;
  summary: Partial<Record<Arm, ArmSummary>>;
  delta?: { passRate: number; meanCheckRate: number; meanDurationMs: number };
  byTask: Record<string, Partial<Record<Arm, { passed: number; runs: number }>>>;
  runs: RunResult[];
  warnings: string[];
}

export const defaultMaxRuns = 12;
const maxOutput = 1_048_576;
const maxTasks = 50;

export function parseSuite(raw: string): Suite {
  const value = JSON.parse(raw) as Suite;
  if (!value || value.version !== 1 || !Array.isArray(value.tasks) || !value.tasks.length || value.tasks.length > maxTasks) {
    throw new Error(`Suite inválida: esperado { "version": 1, "tasks": [1 a ${maxTasks}] }`);
  }
  const ids = new Set<string>();
  for (const task of value.tasks) {
    if (!task || typeof task.id !== 'string' || !/^[\w-]{1,40}$/.test(task.id) || ids.has(task.id)) throw new Error(`Tarefa inválida ou repetida: ${task?.id}`);
    ids.add(task.id);
    if (typeof task.prompt !== 'string' || !task.prompt.trim() || task.prompt.length > 4000) throw new Error(`${task.id}: prompt inválido`);
    if (task.fixture !== undefined && (typeof task.fixture !== 'string' || isAbsolute(task.fixture) || task.fixture.split(/[\\/]/).includes('..'))) throw new Error(`${task.id}: fixture fora da pasta da suite`);
    if (!Array.isArray(task.checks) || !task.checks.length) throw new Error(`${task.id}: sem verificações`);
    for (const check of task.checks) {
      const known = ['output-matches', 'output-not-matches', 'file-exists', 'file-not-exists', 'file-matches', 'command'];
      if (!check || !known.includes(check.type)) throw new Error(`${task.id}: verificação desconhecida`);
      if ('pattern' in check) new RegExp(check.pattern, check.flags); // falha cedo
    }
  }
  return value;
}

function runCommand(command: string, cwd: string, env: NodeJS.ProcessEnv, timeoutMs: number):
  Promise<{ code: number | null; timedOut: boolean; output: string }> {
  return new Promise(done => {
    const child = spawn('/bin/sh', ['-c', command], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let timedOut = false;
    const take = (chunk: Buffer) => { if (output.length < maxOutput) output += chunk.toString('utf8'); };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
    child.on('error', error => { clearTimeout(timer); done({ code: null, timedOut, output: String(error) }); });
    child.on('close', code => { clearTimeout(timer); done({ code, timedOut, output }); });
  });
}

const inside = (root: string, path: string): string => {
  const full = resolve(root, path);
  const rel = relative(root, full);
  if (!rel || rel.startsWith('..' + sep) || isAbsolute(rel)) throw new Error(`Caminho fora da área de trabalho: ${path}`);
  return full;
};

async function evaluateChecks(task: Task, workspace: string, output: string, env: NodeJS.ProcessEnv): Promise<RunResult['checks']> {
  const results: RunResult['checks'] = [];
  for (const check of task.checks) {
    try {
      if (check.type === 'output-matches' || check.type === 'output-not-matches') {
        const hit = new RegExp(check.pattern, check.flags).test(output);
        results.push({ type: check.type, ok: check.type === 'output-matches' ? hit : !hit });
      } else if (check.type === 'file-exists' || check.type === 'file-not-exists') {
        const exists = existsSync(inside(workspace, check.path));
        results.push({ type: check.type, ok: check.type === 'file-exists' ? exists : !exists, detail: check.path });
      } else if (check.type === 'file-matches') {
        const text = await readFile(inside(workspace, check.path), 'utf8').catch(() => undefined);
        results.push({ type: check.type, ok: text !== undefined && new RegExp(check.pattern, check.flags).test(text), detail: check.path });
      } else {
        const command = check as Extract<Check, { type: 'command' }>;
        const run = await runCommand(command.run, workspace, env, 120_000);
        results.push({ type: 'command', ok: run.code === (command.expectExit ?? 0), detail: `${command.run} → ${run.code}` });
      }
    } catch (error) {
      results.push({ type: check.type, ok: false, detail: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}

const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

export async function runEvaluation(options: {
  suitePath: string; command: string; cli: Target; arms: Arm[]; repeat: number; timeoutMs: number; maxRuns: number;
  dryRun?: boolean; project?: string;
}): Promise<EvalReport & { invocations: number }> {
  const suitePath = resolve(options.suitePath);
  const suite = parseSuite(await readFile(suitePath, 'utf8'));
  if (!options.command.trim()) throw new Error('--command em falta');
  if (!Number.isInteger(options.repeat) || options.repeat < 1 || options.repeat > 10) throw new Error('--repeat inválido (1-10)');
  const invocations = suite.tasks.length * options.arms.length * options.repeat;
  if (invocations > options.maxRuns) {
    throw new Error(`${invocations} execuções acima do limite de ${options.maxRuns}: cada uma gasta tokens no CLI. Reduza a suite ou use --max-runs ${invocations}`);
  }
  const report: EvalReport & { invocations: number } = {
    suite: suitePath, command: options.command, cli: options.cli, repeat: options.repeat, arms: options.arms,
    startedAt: new Date().toISOString(), summary: {}, byTask: {}, runs: [], warnings: [], invocations
  };
  if (options.dryRun) return report;

  for (const task of suite.tasks) {
    for (const arm of options.arms) {
      for (let repetition = 1; repetition <= options.repeat; repetition++) {
        const workspace = await mkdtemp(join(tmpdir(), 'agentforge-eval-'));
        try {
          if (task.fixture) {
            const fixture = resolve(dirname(suitePath), task.fixture);
            await cp(fixture, workspace, { recursive: true, verbatimSymlinks: true });
          }
          if (arm === 'kit') await install(workspace, [options.cli]);
          const env = { ...process.env, AGENTFORGE_EVAL_PROMPT: task.prompt, AGENTFORGE_EVAL_ARM: arm, AGENTFORGE_EVAL_TASK: task.id };
          const started = Date.now();
          const run = await runCommand(options.command, workspace, env, options.timeoutMs);
          const durationMs = Date.now() - started;
          const checks = await evaluateChecks(task, workspace, run.output, env);
          report.runs.push({ task: task.id, arm, repetition, exitCode: run.code, timedOut: run.timedOut, durationMs, checks,
            passed: !run.timedOut && checks.every(check => check.ok), outputBytes: Buffer.byteLength(run.output) });
        } finally {
          await rm(workspace, { recursive: true, force: true });
        }
      }
    }
  }
  for (const arm of options.arms) {
    const runs = report.runs.filter(item => item.arm === arm);
    report.summary[arm] = {
      runs: runs.length, passed: runs.filter(item => item.passed).length,
      passRate: runs.length ? runs.filter(item => item.passed).length / runs.length : 0,
      meanCheckRate: mean(runs.map(item => item.checks.filter(check => check.ok).length / item.checks.length)),
      meanDurationMs: Math.round(mean(runs.map(item => item.durationMs)))
    };
  }
  for (const item of report.runs) {
    const cell = ((report.byTask[item.task] ??= {})[item.arm] ??= { passed: 0, runs: 0 });
    cell.runs++;
    if (item.passed) cell.passed++;
  }
  const kit = report.summary.kit;
  const plain = report.summary.plain;
  if (kit && plain) {
    report.delta = { passRate: kit.passRate - plain.passRate, meanCheckRate: kit.meanCheckRate - plain.meanCheckRate,
      meanDurationMs: kit.meanDurationMs - plain.meanDurationMs };
  }
  const perArm = suite.tasks.length * options.repeat;
  if (perArm < 10) report.warnings.push(`Só ${perArm} execuções por braço: a diferença pode ser ruído; repita ou alargue a suite antes de concluir.`);
  if (options.repeat < 3) report.warnings.push('Menos de 3 repetições por tarefa: o comportamento do modelo não é determinístico.');
  if (options.arms.length < 2) report.warnings.push('Só um braço: sem comparação com e sem o kit não há efeito a medir.');
  if (options.project) {
    const stamp = report.startedAt.replace(/[:.]/g, '-');
    const path = safe(resolve(options.project), `.agentforge/work/eval/${stamp}.json`);
    await mkdir(dirname(path), { recursive: true });
    await atomicWrite(path, JSON.stringify(report, null, 2) + '\n');
  }
  return report;
}
