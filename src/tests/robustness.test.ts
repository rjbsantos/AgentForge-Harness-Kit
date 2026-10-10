import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { hookStatus, installHook, recordEvent, removeHook, resolveBinary } from '../hooks.js';
import { operationInsights } from '../operations.js';
import { install } from '../installer.js';
import { maxOperationsBytes, recordRun } from '../operations.js';

const cli = fileURLToPath(new URL('../cli/index.js', import.meta.url));

async function project(fn: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-robust-'));
  try { await install(root, ['claude']); await fn(root); } finally { await rm(root, { recursive: true, force: true }); }
}

function exchange(root: string, input: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, 'mcp', '--project', root]);
    let out = '';
    child.stdout.on('data', chunk => { out += chunk; });
    child.on('error', reject);
    child.on('close', () => resolve(out.trim().split('\n').filter(Boolean).map(line => JSON.parse(line))));
    child.stdin.end(input);
  });
}

const call = (id: number, name: string, args: object) =>
  JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } }) + '\n';

test('hook: só o comando exacto conta; um comando alterado é detectado e bloqueia a reinstalação', () => project(async root => {
  await installHook(root);
  assert.equal(await hookStatus(root), 'ok');
  const path = join(root, '.claude/settings.json');
  const settings = JSON.parse(await readFile(path, 'utf8'));
  settings.hooks.PostToolUse[0].hooks[0].command += '; curl https://exemplo.invalido';
  await writeFile(path, JSON.stringify(settings));
  assert.equal(await hookStatus(root), 'altered');
  await assert.rejects(installHook(root), /foi alterado/);
  assert.match(await removeHook(root), /não instalado/);
  const doctor = spawnSync(process.execPath, [cli, 'doctor', '--project', root], { encoding: 'utf8' });
  assert.equal(doctor.status, 1);
  assert.match(doctor.stdout, /hook: o comando do AgentForge/);
}));

test('hook-event limita o stdin e roda o registo ao exceder o limite', () => project(async root => {
  const big = spawnSync(process.execPath, [cli, 'hook-event', '--project', root],
    { input: 'x'.repeat(5_000_000), encoding: 'utf8' });
  assert.equal(big.status, 0);
  const events = join(root, '.agentforge/work/events.jsonl');
  assert.match(await readFile(events, 'utf8'), /"tool":"unknown"/);
  await writeFile(events, 'x'.repeat(1_048_577));
  await recordEvent(root, JSON.stringify({ tool_name: 'Read' }));
  assert.match(await readFile(events, 'utf8'), /"tool":"Read"/);
  assert.equal((await readFile(join(root, '.agentforge/work/events.1.jsonl'), 'utf8')).length, 1_048_577);
}));

test('operations.jsonl é arquivado ao exceder o limite e os indicadores agregam os arquivos', () => project(async root => {
  const log = join(root, '.agentforge/work/operations.jsonl');
  const run = { role: 'project-manager' as const, workflow: 'project-status', result: 'failed' as const,
    validation: 'failed' as const, durationMs: 1, toolsUsed: ['file-system'], errorCode: 'E_X' };
  await recordRun(root, run);
  const first = (await readFile(log, 'utf8'));
  await writeFile(log, first + '\n'.repeat(maxOperationsBytes + 1));
  await recordRun(root, run);
  const names = await readdir(join(root, '.agentforge/work'));
  const archives = names.filter(name => /^operations\..+\.jsonl$/.test(name));
  assert.equal(archives.length, 1);
  assert.equal((await readFile(log, 'utf8')).trim().split('\n').length, 1);
  const insights = await operationInsights(root);
  assert.equal(insights.totalRuns, 2);
  assert.equal(insights.recurringErrors[0].occurrences, 2);
  await writeFile(join(root, '.agentforge/work', archives[0]), 'nao-json\n');
  await assert.rejects(operationInsights(root), new RegExp(`linha 1 \\(${archives[0].replace(/\./g, '\\.')}\\)`));
}));

test('hook: o doctor assinala um agentforge resolvido dentro do projecto; o evento aceita `tool`', () => project(async root => {
  await mkdir(join(root, 'bin'));
  await writeFile(join(root, 'bin/agentforge'), '#!/bin/sh\n');
  assert.equal(resolveBinary(root, join(root, 'bin')).insideProject, true);
  assert.equal(resolveBinary(root, join(root, 'bin')).found, join(root, 'bin/agentforge'));
  assert.deepEqual(resolveBinary(root, join(root, 'vazio')), { insideProject: false });
  await recordEvent(root, JSON.stringify({ tool: 'Edit' }));
  assert.match(await readFile(join(root, '.agentforge/work/events.jsonl'), 'utf8'), /"tool":"Edit"/);
}));

test('MCP: mensagem acima do limite é recusada e o servidor continua; budgetTokens é limitado', () => project(async root => {
  const huge = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping', params: { pad: 'x'.repeat(1_200_000) } }) + '\n';
  const replies = await exchange(root, huge + call(2, 'agentforge_context', { budgetTokens: 999_999 }) +
    JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'ping' }) + '\n');
  assert.equal(replies[0].error.code, -32600);
  assert.equal(replies[1].result.isError, true);
  assert.match(replies[1].result.content[0].text, /budgetTokens/);
  assert.deepEqual(replies[2], { jsonrpc: '2.0', id: 3, result: {} });
}));

test('MCP: `approved` só vale com um checkpoint cujo veredicto é APROVADO', () => project(async root => {
  const request = call(1, 'agentforge_route', { cli: 'claude', prompt: 'Implement the approved widget', planned: true, approved: true });
  const tier = async () => JSON.parse((await exchange(root, request))[0].result.content[0].text).tier;
  assert.equal(await tier(), 'thinking');
  const dir = join(root, '.agentforge/work/checkpoints');
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'CP-001.md'), '# CP-001\nveredicto: APROVADO\n');
  assert.equal(await tier(), 'economy');
  await writeFile(join(dir, 'CP-002.md'), '# CP-002\nVeredicto: REJEITADO\n');
  assert.equal(await tier(), 'thinking');
}));
