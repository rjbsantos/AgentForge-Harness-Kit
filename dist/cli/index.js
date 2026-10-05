#!/usr/bin/env node
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { serve } from '../mcp.js';
import { eventSummary, installHook, recordEvent, removeHook } from '../hooks.js';
import { doctor, install, remove, status, targets, upgrade } from '../installer.js';
import { route } from '../routing.js';
import { addLesson, changeLesson, getContext, lessonsIntegrity, listLessons, resealLessons, saveContext } from '../memory.js';
import { plan } from '../orchestrator.js';
import { loadOperator, setOperator } from '../operator.js';
import { operationInsights, recordRun } from '../operations.js';
import { profiles } from '../capabilities.js';
const help = 'Uso: agentforge <install|upgrade|doctor|mcp|hooks|hook-event|status|uninstall|route|plan|record|context|learn|insights|operator> [--project CAMINHO]\n' +
    '  context [save --summary TEXTO --next TEXTO] [--topic TEXTO] [--budget-tokens N]\n' +
    '  learn <add --lesson TEXTO --evidence CAMINHO[:LINHA] [--scope project|reusable --anchor TEXTO]|list|approve --id ID|retire --id ID|reseal>\n' +
    '  hooks <install|remove>  regista (opcional, Claude Code) hora e nome das ferramentas usadas; hook-event é chamado pelo hook\n' +
    '  mcp  servidor MCP (stdio, só leitura) com plan, route, context, lessons e insights\n' +
    '  insights  resume execuções verificadas e padrões de erro recorrentes\n' +
    '  operator <show|set [--headline TEXTO] [--roles PERFIL,PERFIL] [--language TAG] [--risk cautious|balanced|exploratory] [--interests A,B]>\n' +
    '  plan --cli NOME --prompt TEXTO [--role PERFIL --workflow FLUXO] [--planned --approved] [--high-risk]\n' +
    '  record --role PERFIL --workflow FLUXO --result passed|failed|blocked --validation passed|failed|not-run --duration-ms N [--tools LISTA --skills LISTA] [--retries N --tokens N --cost N --error-code CODIGO]';
function usage() {
    console.error(help);
    process.exit(2);
}
async function main(args) {
    const action = args.shift();
    if (action === '--help' || action === '-h') {
        console.log(help);
        return;
    }
    if (!action || !['install', 'upgrade', 'doctor', 'mcp', 'hooks', 'hook-event', 'status', 'uninstall', 'route', 'plan', 'record', 'context', 'learn', 'insights', 'operator'].includes(action))
        usage();
    const subcommand = (action === 'learn' || action === 'operator' || action === 'hooks') && args[0] && !args[0].startsWith('--') ? args.shift()
        : action === 'context' && args[0] === 'save' ? args.shift() : undefined;
    let parsed;
    try {
        parsed = parseArgs({ args, allowPositionals: false, strict: true, options: {
                project: { type: 'string' }, cli: { type: 'string' }, 'dry-run': { type: 'boolean' },
                prompt: { type: 'string' }, planned: { type: 'boolean' }, approved: { type: 'boolean' },
                'high-risk': { type: 'boolean' }, summary: { type: 'string' }, next: { type: 'string' },
                topic: { type: 'string' }, 'budget-tokens': { type: 'string' }, lesson: { type: 'string' },
                evidence: { type: 'string' }, id: { type: 'string' }, scope: { type: 'string' },
                anchor: { type: 'string' }, headline: { type: 'string' }, roles: { type: 'string' },
                language: { type: 'string' }, risk: { type: 'string' }, interests: { type: 'string' },
                role: { type: 'string' }, workflow: { type: 'string' }, result: { type: 'string' },
                validation: { type: 'string' }, 'duration-ms': { type: 'string' }, tools: { type: 'string' },
                skills: { type: 'string' }, retries: { type: 'string' }, tokens: { type: 'string' },
                cost: { type: 'string' }, 'error-code': { type: 'string' }
            } }).values;
    }
    catch {
        usage();
    }
    const text = (name) => {
        const value = parsed[name];
        if (value === undefined)
            return undefined;
        if (typeof value !== 'string' || !value)
            usage();
        return value;
    };
    const list = (name, trim) => text(name)?.split(',').map(item => trim ? item.trim() : item);
    const number = (name, pattern) => {
        const value = text(name);
        if (value === undefined)
            return undefined;
        if (!pattern.test(value))
            usage();
        return Number(value);
    };
    const choice = (name, allowed) => {
        const value = text(name);
        if (value === undefined)
            return undefined;
        if (!allowed.includes(value))
            usage();
        return value;
    };
    const project = text('project') ? resolve(text('project')) : process.cwd();
    const cli = choice('cli', ['all', ...targets]) ?? 'all';
    const dryRun = parsed['dry-run'] === true;
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
    const scope = choice('scope', ['project', 'reusable']);
    const anchor = text('anchor');
    const headline = text('headline');
    const roles = list('roles', true);
    const language = text('language');
    const riskPosture = text('risk');
    const interests = list('interests', true);
    const roleName = text('role');
    if (roleName !== undefined && !(roleName in profiles))
        usage();
    const role = roleName;
    const workflow = text('workflow');
    const result = choice('result', ['passed', 'failed', 'blocked']);
    const validation = choice('validation', ['passed', 'failed', 'not-run']);
    const durationMs = number('duration-ms', /^\d+$/);
    const toolsUsed = list('tools', false) ?? [];
    const skillsUsed = list('skills', false);
    const retries = number('retries', /^\d+(?:\.\d+)?$/);
    const tokens = number('tokens', /^\d+(?:\.\d+)?$/);
    const cost = number('cost', /^\d+(?:\.\d+)?$/);
    const errorCode = text('error-code');
    const budgetTokens = number('budget-tokens', /^\d+$/);
    if (budgetTokens !== undefined && (!Number.isSafeInteger(budgetTokens) || budgetTokens < 1 || budgetTokens > 32000))
        usage();
    if (action !== 'record' && (retries !== undefined || tokens !== undefined || cost !== undefined || errorCode || skillsUsed))
        usage();
    if (action !== 'operator' && (headline || roles || language || riskPosture || interests))
        usage();
    if (action !== 'context' && budgetTokens !== undefined)
        usage();
    if (action === 'operator') {
        if (cli !== 'all' || dryRun || prompt || planned || approved || highRisk || role || workflow ||
            result || validation || durationMs !== undefined || toolsUsed.length ||
            summary || next || topic || lesson || evidence || id || scope || anchor)
            usage();
        if (subcommand === 'show') {
            if (headline || roles || language || riskPosture || interests)
                usage();
            console.log(JSON.stringify(await loadOperator(project), null, 2));
        }
        else if (subcommand === 'set') {
            console.log(JSON.stringify(await setOperator(project, { headline, roles, language, riskPosture, interests }), null, 2));
        }
        else
            usage();
        return;
    }
    if (action === 'context' || action === 'learn') {
        if (cli !== 'all' || dryRun || prompt || planned || approved || highRisk || role || workflow || result || validation || durationMs !== undefined || toolsUsed.length)
            usage();
        if (action === 'context' && subcommand === 'save') {
            if (!summary || !next || topic || budgetTokens !== undefined || lesson || evidence || id || scope || anchor)
                usage();
            await saveContext(project, summary, next);
            console.log('Contexto ativo atualizado.');
        }
        else if (action === 'context' && !subcommand) {
            if (summary || next || lesson || evidence || id || scope || anchor)
                usage();
            console.log(JSON.stringify(await getContext(project, topic, budgetTokens), null, 2));
        }
        else if (action === 'learn' && subcommand === 'add') {
            if (!lesson || !evidence || id || summary || next || topic)
                usage();
            console.log(JSON.stringify(await addLesson(project, lesson, evidence, { scope, anchor })));
        }
        else if (action === 'learn' && subcommand === 'list') {
            if (lesson || evidence || id || summary || next || topic || scope || anchor)
                usage();
            console.log(JSON.stringify(await listLessons(project), null, 2));
        }
        else if (action === 'learn' && subcommand === 'reseal') {
            if (lesson || evidence || id || summary || next || topic || scope || anchor)
                usage();
            await resealLessons(project);
            console.log('Selo de lessons.json actualizado.');
        }
        else if (action === 'learn' && (subcommand === 'approve' || subcommand === 'retire')) {
            if (!id || lesson || evidence || summary || next || topic || scope || anchor)
                usage();
            console.log(JSON.stringify(await changeLesson(project, id, subcommand)));
        }
        else
            usage();
        return;
    }
    if (action === 'insights') {
        if (cli !== 'all' || dryRun || prompt || planned || approved || highRisk || role || workflow ||
            result || validation || durationMs !== undefined || toolsUsed.length || budgetTokens !== undefined ||
            summary || next || topic || lesson || evidence || id || scope || anchor)
            usage();
        console.log(JSON.stringify({ ...await operationInsights(project), hookEvents: await eventSummary(project) }, null, 2));
        return;
    }
    if (summary || next || topic || lesson || evidence || id || scope || anchor)
        usage();
    if (action === 'record') {
        if (cli !== 'all' || prompt || planned || approved || highRisk || dryRun ||
            !role || !workflow || !result || !validation || durationMs === undefined)
            usage();
        await recordRun(project, { role, workflow, result, validation, durationMs, toolsUsed, skillsUsed, retries, tokens, cost, errorCode });
        console.log('Execução registada.');
        return;
    }
    if (action === 'plan') {
        if (!prompt || cli === 'all' || dryRun || (approved && !planned) || result || validation || durationMs !== undefined || toolsUsed.length)
            usage();
        console.log(JSON.stringify(await plan(project, cli, prompt, { role, workflow, planned, approved, highRisk }), null, 2));
        return;
    }
    if (action === 'route') {
        if (!prompt || cli === 'all' || dryRun || (approved && !planned) || role || workflow || result || validation || durationMs !== undefined || toolsUsed.length)
            usage();
        console.log(JSON.stringify(await route(project, cli, prompt, { planned, approved, highRisk }), null, 2));
        return;
    }
    if (prompt || planned || approved || highRisk || role || workflow || result || validation || durationMs !== undefined || toolsUsed.length || (action === 'status' && dryRun))
        usage();
    if (action === 'hooks' || action === 'hook-event') {
        if (cli !== 'all' || dryRun)
            usage();
        if (action === 'hook-event') {
            let input = '';
            for await (const chunk of process.stdin)
                input += chunk;
            await recordEvent(project, input);
        }
        else if (subcommand === 'install')
            console.log(await installHook(project));
        else if (subcommand === 'remove')
            console.log(await removeHook(project));
        else
            usage();
        return;
    }
    if (action === 'mcp') {
        if (cli !== 'all' || dryRun)
            usage();
        await serve(project);
        return;
    }
    if (action === 'upgrade' || action === 'doctor') {
        if (cli !== 'all')
            usage();
        if (action === 'doctor' && dryRun)
            usage();
        if (action === 'upgrade') {
            for (const line of await upgrade(project, dryRun))
                console.log(line);
            return;
        }
        const diagnosis = await doctor(project, () => lessonsIntegrity(project));
        for (const line of diagnosis.lines)
            console.log(line);
        if (diagnosis.problems.length)
            process.exitCode = 1;
        return;
    }
    const selected = cli === 'all' ? [...targets] : [cli];
    const lines = action === 'install'
        ? await install(project, selected, dryRun)
        : action === 'uninstall'
            ? await remove(project, selected, dryRun)
            : await status(project);
    for (const line of lines)
        console.log(line);
}
main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
//# sourceMappingURL=index.js.map