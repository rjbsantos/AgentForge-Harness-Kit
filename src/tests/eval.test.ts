import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseSuite, runEvaluation } from '../eval.js';
import { install } from '../installer.js';
import { usageInsights } from '../usage.js';
import { closeFlow, completeStep, skipStep, startFlow } from '../flow.js';
import { audit } from '../audit.js';

const cli = fileURLToPath(new URL('../cli/index.js', import.meta.url));

async function scratch(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'agentforge-eval-test-'));
  try { await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}

// «CLI» de teste: com o kit instalado (existe .agentforge) responde com perguntas e cria um ficheiro;
// sem o kit responde directamente. Não gasta tokens: prova que a avaliação distingue os dois braços.
const fakeCli = `if [ -d .agentforge ]; then echo "Preciso de saber: qual o ficheiro? $AGENTFORGE_EVAL_PROMPT"; echo ok > resultado.txt; else echo "feito: $AGENTFORGE_EVAL_PROMPT"; fi`;

const suite = {
  version: 1,
  tasks: [
    { id: 'vago', prompt: 'melhora isto', checks: [{ type: 'output-matches', pattern: 'Preciso de saber' }, { type: 'file-exists', path: 'resultado.txt' }] },
    { id: 'eco', prompt: 'corrige `a.ts`', fixture: 'fixture', checks: [{ type: 'file-matches', path: 'a.ts', pattern: 'original' }, { type: 'output-not-matches', pattern: 'ERRO' },
      { type: 'command', run: 'test -f a.ts' }] }
  ]
};

test('avaliação: distingue o braço com kit do braço sem kit e passa o pedido por ambiente', () => scratch(async dir => {
  await mkdir(join(dir, 'fixture'));
  await writeFile(join(dir, 'fixture/a.ts'), 'original');
  await writeFile(join(dir, 'suite.json'), JSON.stringify(suite));
  const report = await runEvaluation({ suitePath: join(dir, 'suite.json'), command: fakeCli, cli: 'claude',
    arms: ['plain', 'kit'], repeat: 2, timeoutMs: 20_000, maxRuns: 20, project: dir });
  assert.equal(report.invocations, 8);
  assert.equal(report.runs.length, 8);
  assert.equal(report.summary.plain?.runs, 4);
  // «vago» só passa com o kit; «eco» passa nos dois.
  assert.deepEqual(report.byTask.vago, { plain: { passed: 0, runs: 2 }, kit: { passed: 2, runs: 2 } });
  assert.deepEqual(report.byTask.eco, { plain: { passed: 2, runs: 2 }, kit: { passed: 2, runs: 2 } });
  assert.equal(report.delta?.passRate, 0.5);
  assert.ok(report.warnings.some(item => /ruído/.test(item)));
  assert.equal((await readdir(join(dir, '.agentforge/work/eval'))).length, 1);
  // o prompt com aspas e `$()` não é interpretado pelo shell: chega intacto por ambiente
  await writeFile(join(dir, 'inj.json'), JSON.stringify({ version: 1, tasks: [{ id: 'inj', prompt: '$(touch /tmp/agentforge-pwn) `id` "x"',
    checks: [{ type: 'output-matches', pattern: '\\$\\(touch /tmp/agentforge-pwn\\)' }] }] }));
  const injected = await runEvaluation({ suitePath: join(dir, 'inj.json'), command: 'echo "$AGENTFORGE_EVAL_PROMPT"', cli: 'claude',
    arms: ['plain'], repeat: 1, timeoutMs: 10_000, maxRuns: 5 });
  assert.equal(injected.runs[0].passed, true);
}));

test('avaliação: recusa gastar tokens acima do limite, valida a suite e respeita o tempo máximo', () => scratch(async dir => {
  await writeFile(join(dir, 'suite.json'), JSON.stringify(suite));
  await assert.rejects(runEvaluation({ suitePath: join(dir, 'suite.json'), command: 'true', cli: 'claude', arms: ['plain', 'kit'],
    repeat: 5, timeoutMs: 1000, maxRuns: 12 }), /acima do limite de 12/);
  const dry = await runEvaluation({ suitePath: join(dir, 'suite.json'), command: 'true', cli: 'claude', arms: ['plain', 'kit'],
    repeat: 3, timeoutMs: 1000, maxRuns: 12, dryRun: true });
  assert.equal(dry.invocations, 12);
  assert.equal(dry.runs.length, 0);
  assert.throws(() => parseSuite('{"version":1,"tasks":[]}'), /Suite inválida/);
  assert.throws(() => parseSuite(JSON.stringify({ version: 1, tasks: [{ id: 'a', prompt: 'x', checks: [{ type: 'rm' }] }] })), /desconhecida/);
  assert.throws(() => parseSuite(JSON.stringify({ version: 1, tasks: [{ id: 'a', prompt: 'x', fixture: '../fora', checks: [{ type: 'file-exists', path: 'a' }] }] })), /fixture/);
  assert.throws(() => parseSuite(JSON.stringify({ version: 1, tasks: [{ id: 'a', prompt: 'x', checks: [{ type: 'output-matches', pattern: '(' }] }] })));
  await writeFile(join(dir, 'slow.json'), JSON.stringify({ version: 1, tasks: [{ id: 'slow', prompt: 'x', checks: [{ type: 'output-matches', pattern: '.' }] }] }));
  const slow = await runEvaluation({ suitePath: join(dir, 'slow.json'), command: 'sleep 5', cli: 'claude', arms: ['plain'], repeat: 1, timeoutMs: 300, maxRuns: 2 });
  assert.equal(slow.runs[0].timedOut, true);
  assert.equal(slow.runs[0].passed, false);
}));

test('avaliação: o CLI exige --cli explícito e mostra o relatório', () => scratch(async dir => {
  await writeFile(join(dir, 'suite.json'), JSON.stringify({ version: 1, tasks: [{ id: 't', prompt: 'olá', checks: [{ type: 'output-matches', pattern: 'olá' }] }] }));
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, 'eval', 'run', '--project', dir, '--suite', 'suite.json', ...args], { encoding: 'utf8' });
  assert.equal(run('--command', 'echo "$AGENTFORGE_EVAL_PROMPT"').status, 2); // falta --cli
  const ok = run('--command', 'echo "$AGENTFORGE_EVAL_PROMPT"', '--cli', 'claude', '--arm', 'plain', '--repeat', '1');
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(JSON.parse(ok.stdout).summary.plain.passed, 1);
  assert.equal(run('--command', 'true', '--cli', 'claude', '--arm', 'both', '--repeat', '9', '--max-runs', '5').status, 1);
}));

test('indicadores de uso: fluxos fechados, passos dispensados, evidência, porta de entrada e guarda', () => scratch(async dir => {
  await install(dir, ['claude']);
  assert.deepEqual((await usageInsights(dir)).flows.started, 0);
  await writeFile(join(dir, 'e.txt'), 'saída');
  await startFlow(dir, 'risk-review');
  await completeStep(dir, 1, { evidence: 'e.txt' });
  await completeStep(dir, 2, { note: 'feito' });
  await completeStep(dir, 3, { note: 'ok', confirm: async () => undefined });
  await skipStep(dir, 4, { reason: 'sem risco aceite neste ciclo' });
  await closeFlow(dir);
  await startFlow(dir, 'project-status');
  await audit(dir, 'gate', { ready: 'false', workflow: 'nenhum', score: '20' });
  await audit(dir, 'gate', { ready: 'true', workflow: 'bug-investigation', score: '90' });
  await audit(dir, 'guard.deny', { rule: 'commit-em-main' });
  const usage = await usageInsights(dir);
  assert.equal(usage.flows.started, 2);
  assert.equal(usage.flows.closed, 1);
  assert.equal(usage.flows.completionRate, 0.5);
  assert.equal(usage.flows.stepsDone, 3);
  assert.equal(usage.flows.stepsSkipped, 1);
  assert.equal(usage.flows.skipRate, 0.25);
  assert.equal(usage.flows.evidenceRate, 0.333);
  assert.deepEqual(usage.gate, { checks: 2, rejected: 1, rejectionRate: 0.5 });
  assert.deepEqual(usage.guard.byRule, { 'commit-em-main': 1 });
  const cliOut = spawnSync(process.execPath, [cli, 'insights', '--project', dir], { encoding: 'utf8' });
  assert.equal(JSON.parse(cliOut.stdout).usage.flows.closed, 1);
  assert.match(await readFile(join(dir, '.agentforge/work/audit.jsonl'), 'utf8'), /"action":"gate"/);
}));

test('suite do repositório: é válida, as fixtures existem e a linha de base não passa por acaso', async () => {
  const { existsSync, statSync } = await import('node:fs');
  const suitePath = fileURLToPath(new URL('../../evals/suite.json', import.meta.url));
  const suite = parseSuite(await readFile(suitePath, 'utf8'));
  assert.equal(suite.tasks.length, 6);
  for (const task of suite.tasks) assert.ok(existsSync(join(suitePath, '..', task.fixture!)), task.id);
  // Os dublês da tarefa de publicação são executáveis.
  for (const name of ['gh', 'npm', 'git']) {
    assert.ok(statSync(join(suitePath, '..', 'fixtures/publicacao/bin', name)).mode & 0o111, name);
  }
  // Sem fazer nada (comando `true`), só a tarefa de «não publicar» passa: as outras medem trabalho real.
  const baseline = await runEvaluation({ suitePath, command: 'true', cli: 'claude', arms: ['plain'], repeat: 1, timeoutMs: 20_000, maxRuns: 6 });
  const passed = baseline.runs.filter(item => item.passed).map(item => item.task);
  assert.deepEqual(passed, ['nao-publica-sem-autorizacao']);
});
