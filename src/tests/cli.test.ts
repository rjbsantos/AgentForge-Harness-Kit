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

test('graph subcommands answer from the catalog and reject misuse', async () => project(async root => {
  const ok = (...args: string[]) => JSON.parse(run('graph', ...args, '--project', root).stdout);
  assert.equal(ok('report').orphans.length, 0);
  assert.equal(ok('query', '--prompt', 'auditoria do repositório').seeds[0], 'workflow:repository-audit');
  assert.ok(ok('path', '--from', 'forge-hygiene', '--to', 'senior-developer').hops >= 1);
  assert.equal(ok('explain', '--node', 'secops').node.id, 'role:secops');
  assert.equal(run('graph', 'report', '--prompt', 'x').status, 2);
  assert.equal(run('graph', 'path', '--from', 'a').status, 2);
  assert.equal(run('graph', 'explain', '--node', 'nope').status, 1);
  assert.equal(run('route', '--cli', 'codex', '--prompt', 'x', '--node', 'a').status, 2);
}));

test('doctor reports graphify as optional information, never as a problem', async () => project(async root => {
  assert.equal(run('install', '--project', root, '--cli', 'codex').status, 0);
  assert.match(run('doctor', '--project', root).stdout, /sem graphify-out\/graph\.json/);
  const { mkdir } = await import('node:fs/promises');
  await mkdir(join(root, 'graphify-out'), { recursive: true });
  await writeFile(join(root, 'graphify-out/graph.json'), '{}');
  const withGraph = run('doctor', '--project', root);
  assert.equal(withGraph.status, 0);
  assert.match(withGraph.stdout, /graph\.json presente/);
}));

test('gateway omniroute previews by default, writes only with --write and keeps existing models', async () => project(async root => {
  const { mkdir } = await import('node:fs/promises');
  const file = join(root, '.agentforge/work/model-profiles.json');
  const preview = JSON.parse(run('gateway', 'omniroute', '--project', root, '--cli', 'claude').stdout);
  assert.equal(preview.written, false);
  assert.deepEqual(preview.profiles.claude, { thinking: 'auto/coding', economy: 'auto/cheap' });
  assert.match(preview.commands.claude, /omniroute run claude/);
  assert.ok(preview.warnings.some((line: string) => /fornecedor/.test(line)));
  await assert.rejects(readFile(file, 'utf8'), /ENOENT/);
  await mkdir(join(root, '.agentforge/work'), { recursive: true });
  await writeFile(file, JSON.stringify({ claude: { thinking: 'opus' }, codex: { economy: 'x/y' } }));
  const written = JSON.parse(run('gateway', 'omniroute', '--project', root, '--write').stdout);
  assert.equal(written.written, true);
  assert.deepEqual(written.skipped.sort(), ['claude.thinking: mantido \'opus\'', 'codex.economy: mantido \'x/y\'']);
  const saved = JSON.parse(await readFile(file, 'utf8'));
  assert.deepEqual(saved.claude, { thinking: 'opus', economy: 'auto/cheap' });
  assert.deepEqual(saved.codex, { economy: 'x/y', thinking: 'auto/coding' });
  assert.equal(saved.opencode.thinking, 'auto/coding');
  const routed = JSON.parse(run('route', '--project', root, '--cli', 'opencode', '--prompt', 'Design the architecture').stdout);
  assert.equal(routed.model, 'auto/coding');
  assert.equal(run('gateway', 'nope', '--project', root).status, 1);
  assert.equal(run('gateway', '--project', root).status, 2);
  assert.equal(run('install', '--project', root, '--write').status, 2);
}));

test('tokens measures the startup footprint and flags oversized user instructions and state', async () => project(async root => {
  assert.equal(run('install', '--project', root, '--cli', 'claude').status, 0);
  const clean = run('tokens', '--project', root);
  assert.equal(clean.status, 0, clean.stdout);
  const report = JSON.parse(clean.stdout);
  assert.ok(report.startup.total > 0 && report.startup.total <= report.startup.budget);
  assert.ok(report.startup.files.some((item: { file: string }) => item.file.includes('HARNESS.md')));
  assert.ok(report.nativeListings.skills > 500 && report.nativeListings.agents > 200 && report.nativeListings.commands > 100);
  assert.equal(report.nativeListings.total, report.nativeListings.skills + report.nativeListings.agents + report.nativeListings.commands);
  assert.deepEqual(report.findings, []);
  const claude = join(root, 'CLAUDE.md');
  await writeFile(claude, 'x'.repeat(10_000) + '\n' + await readFile(claude, 'utf8'));
  await writeFile(join(root, '.agentforge/work/state.md'), 'y'.repeat(4_000));
  const bloated = run('tokens', '--project', root);
  assert.equal(bloated.status, 1);
  const findings: string[] = JSON.parse(bloated.stdout).findings;
  assert.ok(findings.some(line => line.startsWith('CLAUDE.md')));
  assert.ok(findings.some(line => line.startsWith('state.md')));
  assert.equal(run('tokens', '--project', root, '--dry-run').status, 2);
}));

test('operator verbosity is validated, persisted and exposed in the plan', async () => project(async root => {
  assert.equal(run('install', '--project', root, '--cli', 'codex').status, 0);
  assert.equal(JSON.parse(run('operator', 'show', '--project', root).stdout).verbosity, 'normal');
  assert.equal(run('operator', 'set', '--project', root, '--verbosity', 'loud').status, 1);
  assert.equal(JSON.parse(run('operator', 'set', '--project', root, '--verbosity', 'concise').stdout).verbosity, 'concise');
  const proposal = JSON.parse(run('plan', '--project', root, '--cli', 'codex', '--prompt', 'Faz uma auditoria ao repositório').stdout);
  assert.equal(proposal.operator.verbosity, 'concise');
  assert.equal(run('route', '--project', root, '--cli', 'codex', '--prompt', 'x', '--verbosity', 'concise').status, 2);
}));

test('kit version: --version, manifest record, status and doctor detect an outdated install', async () => project(async root => {
  const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.equal(run('--version').stdout.trim(), pkg.version);
  assert.equal(run('-v').stdout.trim(), pkg.version);
  assert.equal(run('install', '--project', root, '--cli', 'codex').status, 0);
  const manifestPath = join(root, '.agentforge/manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.equal(manifest.kit, pkg.version);
  assert.match(run('status', '--project', root).stdout, new RegExp(`Kit: ${pkg.version} instalado; CLI actual ${pkg.version}`));
  assert.equal(run('doctor', '--project', root).status, 0);
  // Instalação feita por uma versão anterior (ou anterior ao registo da versão)
  delete manifest.kit;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  assert.match(run('status', '--project', root).stdout, /anterior à 0\.9\.1/);
  const outdated = run('doctor', '--project', root);
  assert.equal(outdated.status, 1);
  assert.match(outdated.stdout, /agentforge upgrade/);
  assert.match(run('upgrade', '--project', root, '--dry-run').stdout, /registar versão do kit/);
  assert.equal(JSON.parse(await readFile(manifestPath, 'utf8')).kit, undefined);
  assert.match(run('upgrade', '--project', root).stdout, /registar versão do kit/);
  assert.equal(JSON.parse(await readFile(manifestPath, 'utf8')).kit, pkg.version);
  assert.equal(run('doctor', '--project', root).status, 0);
  assert.equal(run('upgrade', '--project', root).stdout.trim(), 'Instalação já atualizada.');
  manifest.kit = 'not-a-version';
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  assert.equal(run('status', '--project', root).status, 1);
}));
