import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

test('doctor reports a healthy install and detects problems; upgrade needs no --cli', async () => project(async root => {
  assert.equal(run('doctor', '--project', root).status, 1);
  assert.equal(run('upgrade', '--project', root).status, 1);
  assert.equal(run('install', '--project', root, '--cli', 'claude').status, 0);
  const healthy = run('doctor', '--project', root);
  assert.equal(healthy.status, 0, healthy.stdout);
  assert.match(healthy.stdout, /saudável/);
  assert.equal(run('upgrade', '--project', root, '--dry-run').stdout.trim(), 'Instalação já atualizada.');
  await writeFile(join(root, '.agentforge/HARNESS.md'), 'edited');
  const broken = run('doctor', '--project', root);
  assert.equal(broken.status, 1);
  assert.match(broken.stdout, /HARNESS\.md/);
}));

test('hooks are opt-in, merge into existing settings and record only the tool name', async () => project(async root => {
  const { mkdir } = await import('node:fs/promises');
  const { spawnSync } = await import('node:child_process');
  await mkdir(join(root, '.claude'), { recursive: true });
  await writeFile(join(root, '.claude/settings.json'), JSON.stringify({ permissions: { allow: ['Bash(ls)'] } }));
  assert.match(run('hooks', 'install', '--project', root).stdout, /acrescentado/);
  const settings = JSON.parse(await readFile(join(root, '.claude/settings.json'), 'utf8'));
  assert.deepEqual(settings.permissions, { allow: ['Bash(ls)'] });
  assert.match(settings.hooks.PostToolUse[0].hooks[0].command, /agentforge hook-event/);
  assert.match(run('hooks', 'install', '--project', root).stdout, /já instalado/);
  const event = spawnSync(process.execPath, [fileURLToPath(new URL('../cli/index.js', import.meta.url)), 'hook-event', '--project', root],
    { input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'cat secrets' }, prompt: 'segredo' }), encoding: 'utf8' });
  assert.equal(event.status, 0);
  const events = await readFile(join(root, '.agentforge/work/events.jsonl'), 'utf8');
  assert.match(events, /"tool":"Bash"/);
  assert.doesNotMatch(events, /secrets|segredo/);
  assert.equal(JSON.parse(run('insights', '--project', root).stdout).hookEvents.byTool.Bash, 1);
  assert.match(run('hooks', 'remove', '--project', root).stdout, /removido/);
  assert.deepEqual(JSON.parse(await readFile(join(root, '.claude/settings.json'), 'utf8')), { permissions: { allow: ['Bash(ls)'] } });
}));
