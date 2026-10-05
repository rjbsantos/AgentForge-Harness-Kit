import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../cli/index.js', import.meta.url));
const run = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });

async function project(fn: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-cli-'));
  try { await fn(root); } finally { await rm(root, { recursive: true, force: true }); }
}

test('help exits cleanly; unknown commands and options exit with code 2', () => {
  assert.equal(run('--help').status, 0);
  assert.match(run('--help').stdout, /Uso: agentforge/);
  assert.equal(run('nope').status, 2);
  assert.equal(run('install', '--unknown').status, 2);
  assert.equal(run('install', '--cli', 'bogus').status, 2);
  assert.equal(run('install', '--project').status, 2);
});

test('options that do not belong to a command are rejected', async () => project(async root => {
  assert.equal(run('install', '--project', root, '--prompt', 'x').status, 2);
  assert.equal(run('status', '--project', root, '--dry-run').status, 2);
  assert.equal(run('route', '--project', root, '--cli', 'codex', '--prompt', 'x', '--approved').status, 2);
  assert.equal(run('context', '--project', root, '--budget-tokens', '0').status, 2);
  assert.equal(run('insights', '--project', root, '--budget-tokens', '10').status, 2);
  assert.equal(run('record', '--project', root, '--role', 'nope').status, 2);
}));

test('install, status, route and uninstall work end to end', async () => project(async root => {
  const dry = run('install', '--project', root, '--cli', 'claude', '--dry-run');
  assert.equal(dry.status, 0);
  await assert.rejects(readFile(join(root, 'CLAUDE.md'), 'utf8'), /ENOENT/);
  assert.equal(run('install', '--project', root, '--cli', 'claude').status, 0);
  assert.match(await readFile(join(root, 'CLAUDE.md'), 'utf8'), /agentforge:claude:begin/);
  assert.match(run('status', '--project', root).stdout, /CLIs: claude/);
  const routed = JSON.parse(run('route', '--project', root, '--cli', 'claude', '--prompt', 'Design the architecture').stdout);
  assert.equal(routed.tier, 'thinking');
  const failed = run('uninstall', '--project', join(root, 'missing'));
  assert.equal(failed.status, 1);
  assert.equal(run('uninstall', '--project', root, '--cli', 'claude').status, 0);
}));

test('record, insights and lessons round-trip through the CLI', async () => project(async root => {
  assert.equal(run('install', '--project', root, '--cli', 'codex').status, 0);
  const record = run('record', '--project', root, '--role', 'senior-developer', '--workflow', 'repository-audit',
    '--result', 'passed', '--validation', 'passed', '--duration-ms', '120', '--tokens', '10');
  assert.equal(record.status, 0, record.stderr);
  assert.equal(JSON.parse(run('insights', '--project', root).stdout).totalRuns, 1);
  assert.equal(run('record', '--project', root, '--role', 'senior-developer', '--workflow', 'repository-audit',
    '--result', 'weird', '--validation', 'passed', '--duration-ms', '1').status, 2);
  assert.equal(run('context', 'save', '--project', root, '--summary', 'Fase 1', '--next', 'Testar').status, 0);
  assert.match(JSON.parse(run('context', '--project', root, '--budget-tokens', '800').stdout).summary, /Fase 1/);
  assert.equal(JSON.parse(run('learn', 'list', '--project', root).stdout).length, 0);
}));
