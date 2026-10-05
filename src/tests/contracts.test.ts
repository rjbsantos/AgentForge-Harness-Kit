import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { install, targets } from '../installer.js';

// Contratos estruturais dos ficheiros nativos gerados para cada CLI. Não substituem a validação
// contra a versão real de cada ferramenta, mas apanham quebras de formato antes da distribuição.
async function installed(fn: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-contract-'));
  try {
    await install(root, [...targets]);
    await fn(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}

function frontmatter(text: string, file: string): Record<string, string> {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  assert.ok(match, `${file}: frontmatter em falta`);
  const fields: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    if (/^ +\S/.test(line)) continue; // linha aninhada (por exemplo `permission:` do OpenCode)
    const pair = /^([A-Za-z_]+):(?: (.+))?$/.exec(line);
    assert.ok(pair, `${file}: linha de frontmatter inválida: ${line}`);
    fields[pair[1]] = pair[2] ?? '';
  }
  return fields;
}

const files = (root: string, dir: string, ext: string) =>
  readdir(join(root, dir)).then(names => names.filter(name => name.endsWith(ext)));

test('skills: frontmatter com name igual à pasta e descrição numa só linha', () => installed(async root => {
  for (const base of ['.agents/skills', '.claude/skills']) {
    const dirs = await readdir(join(root, base));
    assert.ok(dirs.length > 0);
    for (const dir of dirs) {
      const file = `${base}/${dir}/SKILL.md`;
      const fields = frontmatter(await readFile(join(root, file), 'utf8'), file);
      assert.equal(fields.name, dir, file);
      assert.ok(fields.description.length > 10, file);
    }
  }
}));

test('agentes Claude e OpenCode: campos obrigatórios e modo válido', () => installed(async root => {
  for (const name of await files(root, '.claude/agents', '.md')) {
    const file = `.claude/agents/${name}`;
    const fields = frontmatter(await readFile(join(root, file), 'utf8'), file);
    assert.equal(fields.name, name.replace(/\.md$/, ''), file);
    assert.ok(fields.description, file);
  }
  const modes: Record<string, number> = { primary: 0, subagent: 0 };
  for (const name of await files(root, '.opencode/agents', '.md')) {
    const file = `.opencode/agents/${name}`;
    const fields = frontmatter(await readFile(join(root, file), 'utf8'), file);
    assert.ok(fields.description, file);
    assert.ok(fields.mode in modes, `${file}: modo ${fields.mode}`);
    modes[fields.mode]++;
  }
  assert.equal(modes.primary, 1);
  assert.ok(modes.subagent > 0);
}));

test('agentes Codex: TOML com chaves obrigatórias e name igual ao ficheiro', () => installed(async root => {
  for (const name of await files(root, '.codex/agents', '.toml')) {
    const file = `.codex/agents/${name}`;
    const text = await readFile(join(root, file), 'utf8');
    const keys = Object.fromEntries([...text.matchAll(/^([a-z_]+) = (".*")$/gm)].map(match => [match[1], JSON.parse(match[2])]));
    assert.equal(keys.name, name.replace(/\.toml$/, ''), file);
    assert.ok(keys.description && keys.developer_instructions, file);
    assert.equal(text.trim().split('\n').length, 'sandbox_mode' in keys ? 4 : 3, `${file}: cada chave numa só linha`);
  }
}));

test('OpenCode: configuração, TUI, tema e comando coerentes entre si', () => installed(async root => {
  const config = JSON.parse(await readFile(join(root, 'opencode.json'), 'utf8'));
  const tui = JSON.parse(await readFile(join(root, 'tui.json'), 'utf8'));
  assert.equal(config.$schema, 'https://opencode.ai/config.json');
  assert.equal(tui.$schema, 'https://opencode.ai/tui.json');
  const agents = await files(root, '.opencode/agents', '.md');
  assert.ok(agents.includes(`${config.default_agent}.md`), 'default_agent aponta para um agente inexistente');
  const themes = await files(root, '.opencode/themes', '.json');
  assert.ok(themes.includes(`${tui.theme}.json`), 'tema configurado inexistente');
  const theme = JSON.parse(await readFile(join(root, `.opencode/themes/${tui.theme}.json`), 'utf8'));
  for (const [key, value] of Object.entries<string>(theme.theme)) {
    assert.ok(value in theme.defs || /^#[0-9a-f]{6}$/i.test(value), `tema: ${key} -> ${value}`);
  }
  const command = frontmatter(await readFile(join(root, '.opencode/commands/agentforge.md'), 'utf8'), 'command');
  assert.ok(agents.includes(`${command.agent}.md`));
  assert.match(await readFile(join(root, '.opencode/commands/agentforge.md'), 'utf8'), /\$ARGUMENTS/);
}));

test('Antigravity e fluxos partilhados: regra sempre activa e JSON válido', () => installed(async root => {
  const rule = frontmatter(await readFile(join(root, '.agents/rules/agentforge.md'), 'utf8'), 'rule');
  assert.equal(rule.trigger, 'always_on');
  for (const name of await files(root, '.agentforge/workflows', '.json')) {
    const workflow = JSON.parse(await readFile(join(root, '.agentforge/workflows', name), 'utf8'));
    assert.equal(`${workflow.name}.json`, name);
    assert.ok(workflow.steps.length > 0);
  }
}));

test('competência de terceiros claude-automation-recommender: só no Claude, com licença e sem alterações', () => installed(async root => {
  const base = '.claude/skills/claude-automation-recommender';
  const skill = await readFile(join(root, base, 'SKILL.md'), 'utf8');
  assert.match(skill, /^---\nname: claude-automation-recommender\n/);
  assert.match(skill, /This skill is read-only/);
  assert.match(await readFile(join(root, base, 'LICENSE'), 'utf8'), /Apache License/);
  const references = await readdir(join(root, base, 'references'));
  assert.equal(references.length, 5);
  await assert.rejects(readdir(join(root, '.agents/skills/claude-automation-recommender')), /ENOENT/);
  assert.match(await readFile(new URL('../../THIRD_PARTY_NOTICES.md', import.meta.url), 'utf8'), /claude-automation-recommender/);
}));

test('orçamento de arranque: instruções lidas em cada sessão cabem em 3000 tokens estimados', () => installed(async root => {
  // Ficheiros que o bloco de instruções e o HARNESS mandam ler sempre; o resto é lido a pedido.
  const startup = ['CLAUDE.md', '.agentforge/HARNESS.md', '.agentforge/MODEL_ROUTING.md', '.agentforge/work/state.md',
    '.agentforge/work/context.md', '.agentforge/work/operator.json'];
  let chars = 0;
  for (const file of startup) chars += (await readFile(join(root, file), 'utf8')).length;
  assert.ok(Math.ceil(chars / 4) <= 3000, `arranque com ~${Math.ceil(chars / 4)} tokens`);
  const block = await readFile(join(root, 'CLAUDE.md'), 'utf8');
  assert.doesNotMatch(block, /OPERATOR\.md/);
}));

test('o HARNESS instala as regras de estilo concisos sem comprimir avisos de risco', () => installed(async root => {
  const harness = await readFile(join(root, '.agentforge/HARNESS.md'), 'utf8');
  assert.match(harness, /## Estilo de resposta e higiene de contexto/);
  assert.match(harness, /Avisos de risco, pedidos de aprovação, decisões e limitações nunca se comprimem/);
  assert.match(harness, /\.agentforge\/work\/logs\//);
}));

test('papéis e competências seguem a estrutura comum e só referem competências existentes', async () => {
  const { roles } = await import('../roles.js');
  const { skills } = await import('../skills.js');
  for (const [name, role] of Object.entries(roles)) {
    for (const section of ['Competências:', 'Faz:', 'Limites:', 'Entrega:']) assert.ok(role.body.includes(section), `${name}: falta «${section}»`);
    assert.match(role.description, /^Usar /, `${name}: a descrição deve dizer quando usar o agente`);
    for (const ref of role.body.match(/forge-[a-z-]+/g) ?? []) assert.ok(ref in skills, `${name}: refere ${ref}, que não existe`);
  }
  for (const [name, content] of Object.entries(skills)) {
    const meta = frontmatter(content, name);
    assert.match(meta.description, /^Usar /, `${name}: a descrição deve dizer quando usar a competência`);
    assert.match(content, /Validação:/, `${name}: falta uma linha «Validação:»`);
  }
});

test('papéis só de leitura negam a escrita no formato nativo de cada CLI', async () => {
  const { roles } = await import('../roles.js');
  const readOnly = Object.entries(roles).filter(([, role]) => role.readOnly).map(([name]) => name);
  assert.deepEqual(readOnly.sort(), ['code-critic', 'reverse-engineer', 'secops']);
  await installed(async root => {
    for (const name of readOnly) {
      assert.match(await readFile(join(root, `.claude/agents/${name}.md`), 'utf8'), /^tools: Read, Grep, Glob$/m, name);
      assert.match(await readFile(join(root, `.opencode/agents/${name}.md`), 'utf8'), /^permission:\n {2}edit: deny$/m, name);
      assert.match(await readFile(join(root, `.codex/agents/${name}.toml`), 'utf8'), /^sandbox_mode = "read-only"$/m, name);
    }
    assert.doesNotMatch(await readFile(join(root, '.claude/agents/lead-developer.md'), 'utf8'), /^tools:/m);
  });
});
