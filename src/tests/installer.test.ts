import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, rm, writeFile, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { install, remove, safe, status } from '../installer.js';

async function project(fn: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-kit-'));
  try { await fn(root); } finally { await rm(root, { recursive: true, force: true }); }
}

test('installs all CLI surfaces, keeps user instructions and supports idempotence', async () => project(async root => {
  await writeFile(join(root, 'AGENTS.md'), '# My rules\n');
  await install(root, ['opencode', 'codex', 'claude', 'antigravity']);
  const agents = await readFile(join(root, 'AGENTS.md'), 'utf8');
  assert.match(agents, /^# My rules/);
  assert.match(agents, /agentforge:codex:begin/);
  assert.match(agents, /agentforge:opencode:begin/);
  assert.match(await readFile(join(root, '.claude/agents/qa.md'), 'utf8'), /name: qa/);
  assert.match(await readFile(join(root, '.opencode/agents/qa.md'), 'utf8'), /mode: subagent/);
  assert.match(await readFile(join(root, '.agents/skills/forge-audit/SKILL.md'), 'utf8'), /name: forge-audit/);
  assert.match(await readFile(join(root, '.agents/workflows/forge-build.md'), 'utf8'), /processo AgentForge A/);
  assert.match(await readFile(join(root, '.agents/rules/agentforge.md'), 'utf8'), /trigger: always_on/);
  assert.match(await readFile(join(root, '.opencode/agents/agentforge.md'), 'utf8'), /mode: primary/);
  assert.equal(JSON.parse(await readFile(join(root, 'opencode.json'), 'utf8')).default_agent, 'agentforge');
  assert.equal(JSON.parse(await readFile(join(root, 'tui.json'), 'utf8')).theme, 'agentforge');
  assert.match(await readFile(join(root, '.opencode/themes/agentforge.json'), 'utf8'), /"primary": "blue"/);
  assert.match(await readFile(join(root, '.opencode/commands/agentforge.md'), 'utf8'), /Inicia uma sessão de trabalho AgentForge/);
  assert.match(await readFile(join(root, '.claude/agents/agentforge.md'), 'utf8'), /name: agentforge/);
  assert.match(await readFile(join(root, '.codex/agents/agentforge.toml'), 'utf8'), /name = "agentforge"/);
  assert.match(await readFile(join(root, '.agentforge/CONTEXT_LEARNING.md'), 'utf8'), /aprendizagem/);
  assert.match(await readFile(join(root, '.agents/skills/forge-context/SKILL.md'), 'utf8'), /name: forge-context/);
  assert.deepEqual(await install(root, ['codex', 'claude']), ['Instalação já atualizada.']);
  assert.match((await status(root))[0], /opencode/);
}));

test('configures AgentForge as OpenCode default and preserves an existing config', async () => project(async root => {
  const config = join(root, 'opencode.json');
  const original = '{\n  "$schema": "https://opencode.ai/config.json",\n  "model": "provider/model"\n}\n';
  await writeFile(config, original);
  const tuiConfig = join(root, 'tui.json');
  const originalTui = '{\n  "$schema": "https://opencode.ai/tui.json",\n  "keybinds": {}\n}\n';
  await writeFile(tuiConfig, originalTui);
  const changes = await install(root, ['opencode']);
  assert.equal(await readFile(config, 'utf8'), original);
  assert.equal(await readFile(tuiConfig, 'utf8'), originalTui);
  assert.ok(changes.some(change => change.includes('"default_agent": "agentforge"')));
  assert.ok(changes.some(change => change.includes('"theme": "agentforge"')));
  assert.match(await readFile(join(root, '.opencode/commands/agentforge.md'), 'utf8'), /agent: agentforge/);
  await remove(root, ['opencode']);
  assert.equal(await readFile(config, 'utf8'), original);
  assert.equal(await readFile(tuiConfig, 'utf8'), originalTui);
}));

test('removes one CLI without removing shared assets or user files', async () => project(async root => {
  await writeFile(join(root, 'AGENTS.md'), 'Keep me\n');
  await install(root, ['codex', 'opencode']);
  await remove(root, ['codex']);
  assert.equal(await readFile(join(root, 'AGENTS.md'), 'utf8').then(s => s.includes('agentforge:codex')), false);
  assert.match(await readFile(join(root, 'AGENTS.md'), 'utf8'), /Keep me/);
  assert.match(await readFile(join(root, '.agents/skills/forge-audit/SKILL.md'), 'utf8'), /forge-audit/);
  await remove(root, ['opencode']);
  assert.equal(await readFile(join(root, 'AGENTS.md'), 'utf8'), 'Keep me\n');
  await assert.rejects(readFile(join(root, 'opencode.json')));
  await writeFile(join(root, '.agentforge/work/state.md'), 'custom state');
  await writeFile(join(root, '.agentforge/work/context.md'), 'my context');
  await writeFile(join(root, '.agentforge/work/lessons.json'), '{"version":1,"lessons":[]}');
  await install(root, ['claude']);
  assert.equal(await readFile(join(root, '.agentforge/work/state.md'), 'utf8'), 'custom state');
  assert.equal(await readFile(join(root, '.agentforge/work/context.md'), 'utf8'), 'my context');
  await remove(root, ['claude']);
  assert.equal(await readFile(join(root, '.agentforge/work/context.md'), 'utf8'), 'my context');
}));

test('dry-run has no side effects; conflicts are detected before any writes', async () => project(async root => {
  await install(root, ['claude'], true);
  await assert.rejects(readFile(join(root, '.claude/agents/qa.md')));
  await mkdir(join(root, '.claude/agents'), { recursive: true });
  await writeFile(join(root, '.claude/agents/qa.md'), 'personal');
  await assert.rejects(install(root, ['claude']), /preexistente/);
  await assert.rejects(readFile(join(root, '.agentforge/manifest.json')));
}));

test('edited generated files are never overwritten or deleted', async () => project(async root => {
  await install(root, ['claude']);
  const role = join(root, '.claude/agents/qa.md');
  await writeFile(role, 'my changes');
  await assert.rejects(install(root, ['claude']), /modificado/);
  await assert.rejects(remove(root, ['claude']), /modificado/);
  assert.match((await status(root))[1], /qa.md/);
}));

test('reports missing instructions and preserves edits inside user instructions', async () => project(async root => {
  await install(root, ['codex', 'opencode']);
  const path = join(root, 'AGENTS.md');
  const content = await readFile(path, 'utf8');
  await writeFile(path, content.replace('agentforge:codex:begin', 'agentforge:codex:edited'));
  assert.match((await status(root))[1], /AGENTS.md \(codex\)/);
  await assert.rejects(remove(root, ['codex']), /Bloco de instruções alterado/);
  assert.match(await readFile(join(root, '.agents/skills/forge-audit/SKILL.md'), 'utf8'), /forge-audit/);
}));

test('updates an existing legacy instruction block without duplicating it', async () => project(async root => {
  await install(root, ['claude']);
  const key = join(root, 'CLAUDE.md');
  const current = await readFile(key, 'utf8');
  const legacy = '\n<!-- agentforge:claude:begin -->\nRead `.agentforge/HARNESS.md` and `.agentforge/work/state.md` before AgentForge pipeline work. Available roles: `.agentforge/roles/`. Use .claude/agents/ for native subagents.\n<!-- agentforge:claude:end -->\n';
  await writeFile(key, current.replace(/\n<!-- agentforge:claude:begin -->[\s\S]*?<!-- agentforge:claude:end -->\n/, legacy));
  const changes = await install(root, ['claude']);
  assert.ok(changes.some(item => item.includes('CLAUDE.md')));
  const updated = await readFile(key, 'utf8');
  assert.equal(updated.match(/agentforge:claude:begin/g)?.length, 1);
  assert.match(updated, /MODEL_ROUTING.md/);
}));

test('upgrades 0.3 instruction blocks while retaining an existing active state', async () => project(async root => {
  await install(root, ['codex']);
  const key = join(root, 'AGENTS.md');
  const current = await readFile(key, 'utf8');
  const prior = '\n<!-- agentforge:codex:begin -->\nRead `.agentforge/HARNESS.md`, `.agentforge/MODEL_ROUTING.md` and `.agentforge/work/state.md` before AgentForge pipeline work. Classify each task by complexity and use the configured thinking/economy model only if this host supports explicit selection. Available roles: `.agentforge/roles/`. Use the role descriptions; only delegate if this host offers a supported subagent mechanism.\n<!-- agentforge:codex:end -->\n';
  await writeFile(key, current.replace(/\n<!-- agentforge:codex:begin -->[\s\S]*?<!-- agentforge:codex:end -->\n/, prior));
  await writeFile(join(root, '.agentforge/work/state.md'), 'ongoing work');
  await install(root, ['codex']);
  assert.equal(await readFile(join(root, '.agentforge/work/state.md'), 'utf8'), 'ongoing work');
  assert.match(await readFile(key, 'utf8'), /CONTEXT_LEARNING.md/);
  assert.match(await readFile(join(root, '.agentforge/work/context.md'), 'utf8'), /Contexto ativo/);
}));

test('blocks generated paths through symlinks', async () => project(async root => {
  assert.throws(() => safe(root, '..\\outside.txt'), /Caminho inválido/);
  assert.throws(() => safe(root, join(root, 'outside.txt')), /Caminho inválido/);
  const external = await mkdtemp(join(tmpdir(), 'agentforge-external-'));
  try {
    await symlink(external, join(root, '.agentforge'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(install(root, ['codex']), /Symlink/);
  } finally { await rm(external, { recursive: true, force: true }); }
}));
