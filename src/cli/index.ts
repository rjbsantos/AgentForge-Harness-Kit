#!/usr/bin/env node
import { resolve } from 'node:path';
import { install, remove, status, targets, type Target } from '../installer.js';
import { route } from '../routing.js';
import { addLesson, changeLesson, getContext, listLessons, saveContext } from '../memory.js';
import { plan } from '../orchestrator.js';
import { loadOperator, setOperator } from '../operator.js';
import { recordRun, type RunRecord } from '../operations.js';
import { profiles, type Profile } from '../capabilities.js';

const help = 'Uso: agentforge <install|status|uninstall|route|plan|record|context|learn|operator> [--project CAMINHO]\n' +
  '  context [save --summary TEXTO --next TEXTO] [--topic TEXTO]\n' +
  '  learn <add --lesson TEXTO --evidence CAMINHO[:LINHA] [--scope project|reusable --anchor TEXTO]|list|approve --id ID|retire --id ID>\n' +
  '  operator <show|set [--headline TEXTO] [--roles PERFIL,PERFIL] [--language TAG] [--risk cautious|balanced|exploratory] [--interests A,B]>\n' +
  '  plan --cli NOME --prompt TEXTO [--role PERFIL --workflow FLUXO] [--planned --approved] [--high-risk]\n' +
  '  record --role PERFIL --workflow FLUXO --result passed|failed|blocked --validation passed|failed|not-run --duration-ms N [--tools LISTA --skills LISTA] [--retries N --tokens N --cost N --error-code CODIGO]';
function usage(): never {
  console.error(help);
  process.exit(2);
}

async function main(args: string[]): Promise<void> {
  const action = args.shift();
  if (action === '--help' || action === '-h') {
    console.log(help);
    return;
  }
  if (!action || !['install', 'status', 'uninstall', 'route', 'plan', 'record', 'context', 'learn', 'operator'].includes(action)) usage();
  const subcommand = (action === 'learn' || action === 'operator') && args[0] && !args[0].startsWith('--') ? args.shift()
    : action === 'context' && args[0] === 'save' ? args.shift() : undefined;
  let project = process.cwd();
  let cli: Target | 'all' = 'all';
  let dryRun = false;
  let prompt: string | undefined;
  let planned = false;
  let approved = false;
  let highRisk = false;
  let summary: string | undefined;
  let next: string | undefined;
  let topic: string | undefined;
  let lesson: string | undefined;
  let evidence: string | undefined;
  let id: string | undefined;
  let scope: 'project' | 'reusable' | undefined;
  let anchor: string | undefined;
  let headline: string | undefined;
  let roles: string[] | undefined;
  let language: string | undefined;
  let riskPosture: string | undefined;
  let interests: string[] | undefined;
  let role: Profile | undefined;
  let workflow: string | undefined;
  let result: RunRecord['result'] | undefined;
  let validation: RunRecord['validation'] | undefined;
  let durationMs: number | undefined;
  let toolsUsed: string[] = [];
  let skillsUsed: string[] | undefined;
  let retries: number | undefined;
  let tokens: number | undefined;
  let cost: number | undefined;
  let errorCode: string | undefined;
  while (args.length) {
    const arg = args.shift();
    if (arg === '--project') {
      const value = args.shift();
      if (!value) usage();
      project = resolve(value);
    } else if (arg === '--cli') {
      const value = args.shift();
      if (!value || (value !== 'all' && !targets.includes(value as Target))) usage();
      cli = value as Target | 'all';
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--prompt') {
      prompt = args.shift();
      if (!prompt) usage();
    } else if (arg === '--planned') {
      planned = true;
    } else if (arg === '--approved') {
      approved = true;
    } else if (arg === '--high-risk') {
      highRisk = true;
    } else if (arg === '--summary') {
      summary = args.shift();
      if (!summary) usage();
    } else if (arg === '--next') {
      next = args.shift();
      if (!next) usage();
    } else if (arg === '--topic') {
      topic = args.shift();
      if (!topic) usage();
    } else if (arg === '--lesson') {
      lesson = args.shift();
      if (!lesson) usage();
    } else if (arg === '--evidence') {
      evidence = args.shift();
      if (!evidence) usage();
    } else if (arg === '--id') {
      id = args.shift();
      if (!id) usage();
    } else if (arg === '--scope') {
      const value = args.shift();
      if (value !== 'project' && value !== 'reusable') usage();
      scope = value;
    } else if (arg === '--anchor') {
      anchor = args.shift();
      if (!anchor) usage();
    } else if (arg === '--headline') {
      headline = args.shift();
      if (!headline) usage();
    } else if (arg === '--roles') {
      const value = args.shift();
      if (!value) usage();
      roles = value.split(',').map(item => item.trim());
    } else if (arg === '--language') {
      language = args.shift();
      if (!language) usage();
    } else if (arg === '--risk') {
      riskPosture = args.shift();
      if (!riskPosture) usage();
    } else if (arg === '--interests') {
      const value = args.shift();
      if (!value) usage();
      interests = value.split(',').map(item => item.trim());
    } else if (arg === '--role') {
      const value = args.shift();
      if (!value || !(value in profiles)) usage();
      role = value as Profile;
    } else if (arg === '--workflow') {
      workflow = args.shift();
      if (!workflow) usage();
    } else if (arg === '--result') {
      const value = args.shift();
      if (value !== 'passed' && value !== 'failed' && value !== 'blocked') usage();
      result = value;
    } else if (arg === '--validation') {
      const value = args.shift();
      if (value !== 'passed' && value !== 'failed' && value !== 'not-run') usage();
      validation = value;
    } else if (arg === '--duration-ms') {
      const value = args.shift();
      if (!value || !/^\d+$/.test(value)) usage();
      durationMs = Number(value);
    } else if (arg === '--tools') {
      const value = args.shift();
      if (!value) usage();
      toolsUsed = value.split(',');
    } else if (arg === '--skills') {
      const value = args.shift();
      if (!value) usage();
      skillsUsed = value.split(',');
    } else if (arg === '--retries' || arg === '--tokens' || arg === '--cost') {
      const value = args.shift();
      if (!value || !/^(?:\d+)(?:\.\d+)?$/.test(value)) usage();
      if (arg === '--retries') retries = Number(value);
      else if (arg === '--tokens') tokens = Number(value);
      else cost = Number(value);
    } else if (arg === '--error-code') {
      errorCode = args.shift();
      if (!errorCode) usage();
    } else {
      usage();
    }
    if (action !== 'record' && (retries !== undefined || tokens !== undefined || cost !== undefined || errorCode || skillsUsed)) usage();
    if (action !== 'operator' && (headline || roles || language || riskPosture || interests)) usage();
  }
  if (action === 'operator') {
    if (cli !== 'all' || dryRun || prompt || planned || approved || highRisk || role || workflow ||
      result || validation || durationMs !== undefined || toolsUsed.length ||
      summary || next || topic || lesson || evidence || id || scope || anchor) usage();
    if (subcommand === 'show') {
      if (headline || roles || language || riskPosture || interests) usage();
      console.log(JSON.stringify(await loadOperator(project), null, 2));
    } else if (subcommand === 'set') {
      console.log(JSON.stringify(await setOperator(project, { headline, roles, language, riskPosture, interests }), null, 2));
    } else usage();
    return;
  }
  if (action === 'context' || action === 'learn') {
    if (cli !== 'all' || dryRun || prompt || planned || approved || highRisk || role || workflow || result || validation || durationMs !== undefined || toolsUsed.length) usage();
    if (action === 'context' && subcommand === 'save') {
      if (!summary || !next || topic || lesson || evidence || id || scope || anchor) usage();
      await saveContext(project, summary, next);
      console.log('Contexto ativo atualizado.');
    } else if (action === 'context' && !subcommand) {
      if (summary || next || lesson || evidence || id || scope || anchor) usage();
      console.log(JSON.stringify(await getContext(project, topic), null, 2));
    } else if (action === 'learn' && subcommand === 'add') {
      if (!lesson || !evidence || id || summary || next || topic) usage();
      console.log(JSON.stringify(await addLesson(project, lesson, evidence, { scope, anchor })));
    } else if (action === 'learn' && subcommand === 'list') {
      if (lesson || evidence || id || summary || next || topic || scope || anchor) usage();
      console.log(JSON.stringify(await listLessons(project), null, 2));
    } else if (action === 'learn' && (subcommand === 'approve' || subcommand === 'retire')) {
      if (!id || lesson || evidence || summary || next || topic || scope || anchor) usage();
      console.log(JSON.stringify(await changeLesson(project, id, subcommand)));
    } else usage();
    return;
  }
  if (summary || next || topic || lesson || evidence || id || scope || anchor) usage();
  if (action === 'record') {
    if (cli !== 'all' || prompt || planned || approved || highRisk || dryRun ||
      !role || !workflow || !result || !validation || durationMs === undefined) usage();
    await recordRun(project, { role, workflow, result, validation, durationMs, toolsUsed, skillsUsed, retries, tokens, cost, errorCode });
    console.log('Execução registada.');
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
  const selected = cli === 'all' ? [...targets] : [cli];
  const lines = action === 'install'
    ? await install(project, selected, dryRun)
    : action === 'uninstall'
      ? await remove(project, selected, dryRun)
      : await status(project);
  for (const line of lines) console.log(line);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
