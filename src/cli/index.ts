#!/usr/bin/env node
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { serve } from '../mcp.js';
import { applyGateway } from '../gateway.js';
import { tokenReport } from '../tokens.js';
import { kitVersion } from '../version.js';
import { buildGraph, explain, path as graphPath, query as graphQuery, report as graphReport } from '../graph.js';
import { applyHardening, hardeningApplied, removeHardening } from '../hardening.js';
import { trace } from '../trace.js';
import { assessWithDecider } from '../decider.js';
import { defaultMaxRuns, runEvaluation, type Arm } from '../eval.js';
import { usageInsights } from '../usage.js';
import { existsSync } from 'node:fs';
import { audit } from '../audit.js';
import { updateNotice, updateStatus } from '../update.js';
import { abandonFlow, closeFlow, completeStep, flowStatus, skipStep, startFlow } from '../flow.js';
import { evaluate, activePermits, grantPermit, revokePermits } from '../guard.js';
import { eventSummary, guardHookStatus, hookStatus, installGuardHook, removeGuardHook, resolveBinary, installHook, maxHookInputBytes, recordEvent, removeHook } from '../hooks.js';
import { doctor, install, installedTargets, remove, status, targets, upgrade } from '../installer.js';
import { route } from '../routing.js';
import { confirmOnTerminal } from '../approval.js';
import { addLesson, changeLesson, getContext, lessonsIntegrity, listLessons, resealLessons, saveContext } from '../memory.js';
import { plan } from '../orchestrator.js';
import { loadOperator, setOperator } from '../operator.js';
import { operationInsights, recordRun } from '../operations.js';
import { profiles, workflows, type Profile } from '../capabilities.js';

const help = 'Uso: agentforge <install|upgrade|doctor|tokens|mcp|graph|gateway|hooks|harden|trace|gate|flow|guard|eval|hook-event|status|uninstall|route|plan|record|context|learn|insights|operator> [--project CAMINHO] | --version\n' +
  '  context [save --summary TEXTO --next TEXTO] [--topic TEXTO] [--budget-tokens N]\n' +
  '  learn <add --lesson TEXTO --evidence CAMINHO[:LINHA] [--scope project|reusable --anchor TEXTO]|list|approve --id ID|retire --id ID|reseal>\n' +
  '  hooks <install|remove>  regista (opcional, Claude Code) hora e nome das ferramentas usadas; hook-event é chamado pelo hook\n' +
  '  eval run --suite FICHEIRO --command TEXTO --cli NOME [--arm kit|plain|both] [--repeat N] [--max-runs N] [--timeout-ms N] [--dry-run]  corre as tuas tarefas com e sem o kit no CLI indicado e compara; o comando gasta tokens\n' +
  '  guard <install|remove|status|permit-main|permit-publish [--minutes N]|revoke|check>  (opcional, Claude Code) trava commit em main, push forçado e publicação sem autorização humana; permit-* exige terminal\n' +
  '  flow <start --workflow FLUXO|status|done --step N (--evidence CAMINHO|--note TEXTO)|skip --step N --reason TEXTO|close|abandon>  regista os passos de um fluxo; recusa fechar com passos pendentes; os passos de decisão humana exigem terminal\n' +
  '  gate --prompt TEXTO [--workflow FLUXO] [--decider COMANDO]  verifica se o pedido tem contexto para um fluxo; se não, devolve as perguntas que faltam e termina com 3\n' +
  '  trace [--requirements CAMINHO] [--plan CAMINHO]  valida que cada requisito Must tem critério, plano e teste; termina com 1 se houver lacunas\n' +
  '  harden <apply|remove>  (opcional) recusa a leitura de .env, chaves e credenciais: Claude Code (.claude/settings.json) e opencode.json do utilizador\n' +
  '  graph <query --prompt TEXTO [--budget-tokens N]|path --from NÓ --to NÓ|explain --node NÓ|report>  grafo do catálogo, com confiança EXTRACTED/INFERRED/AMBIGUOUS\n' +
  '  tokens  mede o que o harness põe em contexto (arranque, instruções do utilizador, estado); termina com 1 se houver excessos\n' +
  '  gateway omniroute [--cli NOME] [--write]  propõe (ou grava com --write) o mapeamento thinking/economy para o gateway OmniRoute\n' +
  '  mcp  servidor MCP (stdio, só leitura) com plan, route, context, lessons e insights\n' +
  '  insights  resume execuções verificadas e padrões de erro recorrentes\n' +
  '  operator <show|set [--headline TEXTO] [--roles PERFIL,PERFIL] [--language TAG] [--risk cautious|balanced|exploratory] [--verbosity normal|concise] [--interests A,B]>\n' +
  '  plan --cli NOME --prompt TEXTO [--role PERFIL --workflow FLUXO] [--planned --approved] [--high-risk]\n' +
  '  record --role PERFIL --workflow FLUXO --result passed|failed|blocked --validation passed|failed|not-run --duration-ms N [--tools LISTA --skills LISTA] [--retries N --tokens N --cost N --error-code CODIGO --evidence CAMINHO|--no-evidence]';
function usage(): never {
  console.error(help);
  process.exit(2);
}

async function main(args: string[]): Promise<void> {
  const action = args.shift();
  if (action === '--version' || action === '-v') {
    console.log(kitVersion);
    return;
  }
  if (action === '--help' || action === '-h') {
    console.log(help);
    return;
  }
  if (!action || !['install', 'upgrade', 'doctor', 'tokens', 'mcp', 'graph', 'gateway', 'hooks', 'harden', 'trace', 'gate', 'flow', 'guard', 'eval', 'hook-event', 'status', 'uninstall', 'route', 'plan', 'record', 'context', 'learn', 'insights', 'operator'].includes(action)) usage();
  const subcommand = (action === 'learn' || action === 'operator' || action === 'flow' || action === 'guard' || action === 'eval' || action === 'hooks' || action === 'harden' || action === 'graph' || action === 'gateway') && args[0] && !args[0].startsWith('--') ? args.shift()
    : action === 'context' && args[0] === 'save' ? args.shift() : undefined;
  let parsed: ReturnType<typeof parseArgs>['values'];
  try {
    parsed = parseArgs({ args, allowPositionals: false, strict: true, options: {
      project: { type: 'string' }, cli: { type: 'string' }, 'dry-run': { type: 'boolean' }, write: { type: 'boolean' },
      prompt: { type: 'string' }, planned: { type: 'boolean' }, approved: { type: 'boolean' },
      'high-risk': { type: 'boolean' }, summary: { type: 'string' }, next: { type: 'string' },
      topic: { type: 'string' }, 'budget-tokens': { type: 'string' }, lesson: { type: 'string' },
      evidence: { type: 'string' }, id: { type: 'string' }, scope: { type: 'string' },
      anchor: { type: 'string' }, headline: { type: 'string' }, roles: { type: 'string' },
      language: { type: 'string' }, risk: { type: 'string' }, verbosity: { type: 'string' }, interests: { type: 'string' },
      role: { type: 'string' }, workflow: { type: 'string' }, result: { type: 'string' },
      validation: { type: 'string' }, 'duration-ms': { type: 'string' }, tools: { type: 'string' },
      skills: { type: 'string' }, retries: { type: 'string' }, tokens: { type: 'string' },
      cost: { type: 'string' }, 'error-code': { type: 'string' }, requirements: { type: 'string' }, plan: { type: 'string' }, step: { type: 'string' }, reason: { type: 'string' }, note: { type: 'string' }, minutes: { type: 'string' }, decider: { type: 'string' }, suite: { type: 'string' }, command: { type: 'string' },
      arm: { type: 'string' }, repeat: { type: 'string' }, 'max-runs': { type: 'string' }, 'timeout-ms': { type: 'string' }, 'no-evidence': { type: 'boolean' }, from: { type: 'string' }, to: { type: 'string' }, node: { type: 'string' }
    } }).values;
  } catch {
    usage();
  }
  const text = (name: string): string | undefined => {
    const value = parsed[name];
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !value) usage();
    return value;
  };
  const list = (name: string, trim: boolean): string[] | undefined =>
    text(name)?.split(',').map(item => trim ? item.trim() : item);
  const number = (name: string, pattern: RegExp): number | undefined => {
    const value = text(name);
    if (value === undefined) return undefined;
    if (!pattern.test(value)) usage();
    return Number(value);
  };
  const choice = <T extends string>(name: string, allowed: readonly T[]): T | undefined => {
    const value = text(name);
    if (value === undefined) return undefined;
    if (!allowed.includes(value as T)) usage();
    return value as T;
  };
  const project = text('project') ? resolve(text('project')!) : process.cwd();
  const cli = choice('cli', ['all', ...targets] as const) ?? 'all';
  const dryRun = parsed['dry-run'] === true;
  const write = parsed.write === true;
  if (write && action !== 'gateway') usage();
  if (parsed['no-evidence'] === true && action !== 'record') usage();
  const prompt = text('prompt');
  const planned = parsed.planned === true;
  const approved = parsed.approved === true;
  const highRisk = parsed['high-risk'] === true;
  const summary = text('summary');
  const next = text('next');
  const topic = text('topic');
  const lesson = text('lesson');
  const evidence = text('evidence');
  const id = text('id');
  const scope = choice('scope', ['project', 'reusable'] as const);
  const anchor = text('anchor');
  const headline = text('headline');
  const roles = list('roles', true);
  const language = text('language');
  const riskPosture = text('risk');
  const verbosity = text('verbosity');
  const interests = list('interests', true);
  const roleName = text('role');
  if (roleName !== undefined && !(roleName in profiles)) usage();
  const role = roleName as Profile | undefined;
  const workflow = text('workflow');
  const result = choice('result', ['passed', 'failed', 'blocked'] as const);
  const validation = choice('validation', ['passed', 'failed', 'not-run'] as const);
  const durationMs = number('duration-ms', /^\d+$/);
  const toolsUsed = list('tools', false) ?? [];
  const skillsUsed = list('skills', false);
  const retries = number('retries', /^\d+$/);
  const tokens = number('tokens', /^\d+$/);
  const cost = number('cost', /^\d+(?:\.\d+)?$/);
  const errorCode = text('error-code');
  const stepNumber = number('step', /^\d+$/);
  const reasonText = text('reason');
  const noteText = text('note');
  if (action !== 'flow' && (stepNumber !== undefined || reasonText || noteText)) usage();
  if (action !== 'gate' && text('decider')) usage();
  const requirementsFile = text('requirements');
  const planFile = text('plan');
  const from = text('from');
  const to = text('to');
  const nodeName = text('node');
  const budgetTokens = number('budget-tokens', /^\d+$/);
  if (budgetTokens !== undefined && (!Number.isSafeInteger(budgetTokens) || budgetTokens < 1 || budgetTokens > 32000)) usage();
  if (action !== 'record' && (retries !== undefined || tokens !== undefined || cost !== undefined || errorCode || skillsUsed)) usage();
  if (action !== 'operator' && (headline || roles || language || riskPosture || verbosity || interests)) usage();
  if (action !== 'context' && action !== 'graph' && budgetTokens !== undefined) usage();
  if (action !== 'graph' && (from || to || nodeName)) usage();
  if (action === 'tokens') {
    if (cli !== 'all' || dryRun) usage();
    const report = await tokenReport(project);
    console.log(JSON.stringify(report, null, 2));
    if (report.findings.length) process.exitCode = 1;
    return;
  }
  if (action === 'gateway') {
    if (!subcommand || dryRun || prompt || planned || approved || highRisk || role || workflow) usage();
    const selected = cli === 'all' ? [...targets] : [cli];
    console.log(JSON.stringify(await applyGateway(project, subcommand, selected, write), null, 2));
    return;
  }
  if (action === 'graph') {
    if (cli !== 'all' || dryRun || planned || approved || highRisk || role || workflow) usage();
    const g = buildGraph();
    if (subcommand === 'report' && !prompt && !from && !to && !nodeName && budgetTokens === undefined) {
      console.log(JSON.stringify(graphReport(g), null, 2));
    } else if (subcommand === 'query' && prompt && !from && !to && !nodeName) {
      console.log(JSON.stringify(graphQuery(g, prompt, budgetTokens), null, 2));
    } else if (subcommand === 'path' && from && to && !prompt && !nodeName && budgetTokens === undefined) {
      console.log(JSON.stringify(graphPath(g, from, to), null, 2));
    } else if (subcommand === 'explain' && nodeName && !prompt && !from && !to && budgetTokens === undefined) {
      console.log(JSON.stringify(explain(g, nodeName), null, 2));
    } else usage();
    return;
  }
  if (action === 'operator') {
    if (cli !== 'all' || dryRun || prompt || planned || approved || highRisk || role || workflow ||
      result || validation || durationMs !== undefined || toolsUsed.length ||
      summary || next || topic || lesson || evidence || id || scope || anchor) usage();
    if (subcommand === 'show') {
      if (headline || roles || language || riskPosture || verbosity || interests) usage();
      console.log(JSON.stringify(await loadOperator(project), null, 2));
    } else if (subcommand === 'set') {
      console.log(JSON.stringify(await setOperator(project, { headline, roles, language, riskPosture, verbosity, interests }), null, 2));
    } else usage();
    return;
  }
  if (action === 'context' || action === 'learn') {
    if (cli !== 'all' || dryRun || prompt || planned || approved || highRisk || role || workflow || result || validation || durationMs !== undefined || toolsUsed.length) usage();
    if (action === 'context' && subcommand === 'save') {
      if (!summary || !next || topic || budgetTokens !== undefined || lesson || evidence || id || scope || anchor) usage();
      await saveContext(project, summary, next);
      console.log('Contexto ativo atualizado.');
    } else if (action === 'context' && !subcommand) {
      if (summary || next || lesson || evidence || id || scope || anchor) usage();
      console.log(JSON.stringify(await getContext(project, topic, budgetTokens), null, 2));
    } else if (action === 'learn' && subcommand === 'add') {
      if (!lesson || !evidence || id || summary || next || topic) usage();
      console.log(JSON.stringify(await addLesson(project, lesson, evidence, { scope, anchor })));
    } else if (action === 'learn' && subcommand === 'list') {
      if (lesson || evidence || id || summary || next || topic || scope || anchor) usage();
      console.log(JSON.stringify(await listLessons(project), null, 2));
    } else if (action === 'learn' && subcommand === 'reseal') {
      if (lesson || evidence || id || summary || next || topic || scope || anchor) usage();
      const items = await listLessons(project);
      const counts = (['pending', 'approved', 'retired'] as const).map(status => `${items.filter(item => item.status === status).length} ${status}`);
      await confirmOnTerminal(`Aceitar o estado actual de lessons.json (${counts.join(', ')}) como revisto por si?`);
      await resealLessons(project);
      console.log('Selo de lessons.json actualizado.');
    } else if (action === 'learn' && (subcommand === 'approve' || subcommand === 'retire')) {
      if (!id || lesson || evidence || summary || next || topic || scope || anchor) usage();
      if (subcommand === 'approve') {
        const item = (await listLessons(project)).find(entry => entry.id === id);
        if (!item) throw new Error(`Lição desconhecida: ${id}`);
        await confirmOnTerminal(`Aprovar a lição (${item.scope}${item.anchor ? `, ${item.anchor}` : ''}):\n  ${item.lesson}\n  evidência: ${item.evidence}\nSerá reinjectada nos prompts dos agentes.`);
      }
      console.log(JSON.stringify(await changeLesson(project, id, subcommand)));
    } else usage();
    return;
  }
  if (action === 'eval') {
    const suiteFile = text('suite');
    const commandText = text('command');
    const armName = choice('arm', ['kit', 'plain', 'both'] as const) ?? 'both';
    const repeat = number('repeat', /^\d+$/) ?? 3;
    const maxRuns = number('max-runs', /^\d+$/) ?? defaultMaxRuns;
    const timeoutMs = number('timeout-ms', /^\d+$/) ?? 600_000;
    if (subcommand !== 'run' || !suiteFile || !commandText || cli === 'all' || planned || approved || highRisk || prompt || role ||
      workflow || result || validation || durationMs !== undefined || toolsUsed.length || summary || next || topic || lesson ||
      evidence || id || scope || anchor || budgetTokens !== undefined || stepNumber !== undefined || reasonText || noteText) usage();
    const arms: Arm[] = armName === 'both' ? ['plain', 'kit'] : [armName];
    const report = await runEvaluation({ suitePath: resolve(project, suiteFile), command: commandText, cli, arms, repeat,
      timeoutMs, maxRuns, dryRun, project });
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (action === 'guard') {
    const minutes = number('minutes', /^\d+$/);
    if (cli !== 'all' || dryRun || prompt || planned || approved || highRisk || role || workflow || result || validation ||
      durationMs !== undefined || toolsUsed.length || summary || next || topic || lesson || evidence || id || scope || anchor ||
      budgetTokens !== undefined || stepNumber !== undefined || reasonText || noteText) usage();
    if (minutes !== undefined && !subcommand?.startsWith('permit-')) usage();
    if (subcommand === 'install') console.log(await installGuardHook(project));
    else if (subcommand === 'remove') console.log(await removeGuardHook(project));
    else if (subcommand === 'status') {
      console.log(JSON.stringify({ hook: await guardHookStatus(project), permits: await activePermits(project) }, null, 2));
    } else if (subcommand === 'permit-main' || subcommand === 'permit-publish') {
      const scopeName = subcommand === 'permit-main' ? 'main' : 'publish';
      const length = minutes ?? 15;
      await confirmOnTerminal(`Autorizar ${scopeName === 'main' ? 'commit, merge e push para o ramo principal (e push forçado)' : 'publicação: tags, releases, pull requests e npm publish'} durante ${length} minuto(s) neste projecto?`);
      console.log(JSON.stringify(await grantPermit(project, scopeName, length), null, 2));
    } else if (subcommand === 'revoke') {
      await revokePermits(project);
      console.log('Autorizações revogadas.');
    } else if (subcommand === 'check') {
      // Chamado pelo hook PreToolUse: stdin traz o evento; exit 2 bloqueia e a mensagem vai para o agente.
      let input = '';
      for await (const chunk of process.stdin) {
        input += chunk;
        if (input.length > maxHookInputBytes) break;
      }
      let commandText = '';
      try {
        const payload = JSON.parse(input) as { tool_name?: unknown; tool_input?: { command?: unknown } };
        if (payload.tool_name === 'Bash' && typeof payload.tool_input?.command === 'string') commandText = payload.tool_input.command;
      } catch { /* evento ilegível: não bloquear */ }
      if (commandText) {
        const decision = await evaluate(project, commandText);
        if (!decision.allow) {
          const { audit } = await import('../audit.js');
          await audit(project, 'guard.deny', { rule: decision.rule ?? 'desconhecida' });
          console.error(`AgentForge guarda: ${decision.reason}`);
          process.exitCode = 2;
        }
      }
    } else usage();
    return;
  }
  if (action === 'flow') {
    if (cli !== 'all' || dryRun || prompt || planned || approved || highRisk || role || result || validation ||
      durationMs !== undefined || toolsUsed.length || summary || next || topic || lesson || id || scope || anchor || budgetTokens !== undefined) usage();
    const show = (value: unknown) => console.log(JSON.stringify(value, null, 2));
    if (subcommand === 'start' && workflow && stepNumber === undefined && !evidence && !reasonText && !noteText) show(await startFlow(project, workflow));
    else if (subcommand === 'status' && !workflow && stepNumber === undefined) show(await flowStatus(project));
    else if (subcommand === 'done' && stepNumber !== undefined && !workflow && !reasonText) {
      show(await completeStep(project, stepNumber, { evidence, note: noteText, confirm: confirmOnTerminal }));
    } else if (subcommand === 'skip' && stepNumber !== undefined && reasonText && !workflow && !evidence && !noteText) {
      show(await skipStep(project, stepNumber, { reason: reasonText, confirm: confirmOnTerminal }));
    } else if (subcommand === 'close' && !workflow && stepNumber === undefined) show(await closeFlow(project));
    else if (subcommand === 'abandon' && !workflow && stepNumber === undefined) console.log(`Fluxo ${await abandonFlow(project)} abandonado.`);
    else usage();
    return;
  }
  if (action === 'insights') {
    if (cli !== 'all' || dryRun || prompt || planned || approved || highRisk || role || workflow ||
      result || validation || durationMs !== undefined || toolsUsed.length || budgetTokens !== undefined ||
      summary || next || topic || lesson || evidence || id || scope || anchor) usage();
    console.log(JSON.stringify({ ...await operationInsights(project), hookEvents: await eventSummary(project), usage: await usageInsights(project) }, null, 2));
    return;
  }
  if (summary || next || topic || lesson || (evidence && action !== 'record') || id || scope || anchor) usage();
  if ((requirementsFile || planFile) && action !== 'trace') usage();
  if (action === 'trace') {
    if (cli !== 'all' || dryRun || evidence) usage();
    const report = await trace(project, { requirements: requirementsFile, plan: planFile });
    console.log(JSON.stringify(report, null, 2));
    if (report.findings.length) process.exitCode = 1;
    return;
  }
  if (action === 'record') {
    if (cli !== 'all' || prompt || planned || approved || highRisk || dryRun ||
      !role || !workflow || !result || !validation || durationMs === undefined) usage();
    if (result === 'passed' && !evidence && parsed['no-evidence'] !== true) {
      throw new Error('Um resultado passed exige --evidence CAMINHO (a saída real da verificação) ou, explicitamente, --no-evidence');
    }
    if (parsed['no-evidence'] === true && evidence) usage();
    await recordRun(project, { role, workflow, result, validation, durationMs, toolsUsed, skillsUsed, retries, tokens, cost, errorCode, evidence });
    console.log('Execução registada.');
    return;
  }
  if (action === 'gate') {
    if (!prompt || cli !== 'all' || dryRun || planned || approved || highRisk || role || result || validation || durationMs !== undefined || toolsUsed.length) usage();
    if (workflow !== undefined && !(workflow in workflows)) usage();
    const verdict = await assessWithDecider(prompt, { workflow, decider: text('decider') });
    if (existsSync(join(project, '.agentforge/work'))) {
      await audit(project, 'gate', { ready: String(verdict.ready), workflow: verdict.workflow ?? 'nenhum', score: String(verdict.score) });
    }
    console.log(JSON.stringify(verdict, null, 2));
    if (!verdict.ready) process.exitCode = 3;
    return;
  }
  if (action === 'plan') {
    if (!prompt || cli === 'all' || dryRun || (approved && !planned) || result || validation || durationMs !== undefined || toolsUsed.length) usage();
    console.log(JSON.stringify(await plan(project, cli, prompt, { role, workflow, planned, approved, highRisk }), null, 2));
    return;
  }
  if (action === 'route') {
    if (!prompt || cli === 'all' || dryRun || (approved && !planned) || role || workflow || result || validation || durationMs !== undefined || toolsUsed.length) usage();
    console.log(JSON.stringify(await route(project, cli, prompt, { planned, approved, highRisk }), null, 2));
    return;
  }
  if (prompt || planned || approved || highRisk || role || workflow || result || validation || durationMs !== undefined || toolsUsed.length || (action === 'status' && dryRun)) usage();
  if (action === 'harden') {
    if (cli !== 'all' || dryRun) usage();
    if (subcommand === 'apply') console.log(await applyHardening(project));
    else if (subcommand === 'remove') console.log(await removeHardening(project));
    else usage();
    return;
  }
  if (action === 'hooks' || action === 'hook-event') {
    if (cli !== 'all' || dryRun) usage();
    if (action === 'hook-event') {
      let input = '';
      for await (const chunk of process.stdin) {
        input += chunk;
        if (input.length > maxHookInputBytes) break; // um evento legítimo é pequeno; o resto é ignorado
      }
      await recordEvent(project, input);
    } else if (subcommand === 'install') console.log(await installHook(project));
    else if (subcommand === 'remove') console.log(await removeHook(project));
    else usage();
    return;
  }
  if (action === 'mcp') {
    if (cli !== 'all' || dryRun) usage();
    await serve(project);
    return;
  }
  if (action === 'upgrade' || action === 'doctor') {
    if (cli !== 'all') usage();
    if (action === 'doctor' && dryRun) usage();
    if (action === 'upgrade') {
      for (const line of await upgrade(project, dryRun)) console.log(line);
      return;
    }
    const diagnosis = await doctor(project, () => lessonsIntegrity(project));
    for (const line of diagnosis.lines) console.log(line);
    try {
      const info = await updateStatus({ allowNetwork: Boolean(process.stderr.isTTY) });
      if (info.source === 'disabled') console.log('ℹ versão: verificação de actualizações desactivada');
      else if (info.outdated) console.log(`ℹ versão: ${info.latest} disponível (instalada: ${info.current})`);
      else if (info.latest) console.log(`✓ versão: ${info.current} é a última`);
      else console.log('ℹ versão: não foi possível verificar a última (precisa de `gh` autenticado)');
    } catch { /* informativo */ }
    try {
      if (await guardHookStatus(project) === 'altered') {
        console.log('✗ guarda: o comando do guarda em .claude/settings.json foi alterado; reveja-o');
        process.exitCode = 1;
      }
      if (await hookStatus(project) === 'altered') {
        console.log('✗ hook: o comando do AgentForge em .claude/settings.json foi alterado; reveja-o (`agentforge hooks remove` não o reconhece)');
        process.exitCode = 1;
      }
      if (await hookStatus(project) === 'ok') {
        const binary = resolveBinary(project);
        if (binary.insideProject) {
          console.log(`✗ hook: \`agentforge\` resolve para ${binary.found}, dentro do projecto; o hook executaria código do repositório`);
          process.exitCode = 1;
        } else if (!binary.found) console.log('✗ hook: `agentforge` não está no PATH; o hook falhará em silêncio');
      }
      if ((await installedTargets(project)).includes('claude') && !await hardeningApplied(project)) {
        console.log('ℹ segredos: sem regras de recusa de leitura (.env, chaves); `agentforge harden apply` (opcional)');
      }
    } catch { /* o diagnóstico principal já reportou o problema */ }
    if (diagnosis.problems.length) process.exitCode = 1;
    return;
  }
  const selected = cli === 'all' ? [...targets] : [cli];
  const lines = action === 'install'
    ? await install(project, selected, dryRun)
    : action === 'uninstall'
      ? await remove(project, selected, dryRun)
      : await status(project);
  for (const line of lines) console.log(line);
}

// Aviso de nova versão: só em comandos que uma pessoa corre (não nos hooks nem no protocolo MCP), depois
// do resultado e no stderr. Nunca altera o código de saída.
const quiet = new Set(['hook-event', 'guard', 'mcp', 'gate', 'eval', 'doctor', '--help', '-h']);
async function announceUpdate(action: string | undefined): Promise<void> {
  if (!action || quiet.has(action)) return;
  try {
    const info = await updateStatus({ allowNetwork: Boolean(process.stderr.isTTY) });
    const notice = updateNotice(info);
    if (notice) console.error(`\nℹ ${notice}`);
  } catch { /* um aviso nunca falha o comando */ }
}

main(process.argv.slice(2)).then(() => announceUpdate(process.argv[2])).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
