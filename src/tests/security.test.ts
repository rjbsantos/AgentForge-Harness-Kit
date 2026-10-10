import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { install, remove, targets } from '../installer.js';
import { generated } from '../generators.js';
import { loadModels } from '../routing.js';
import { applyHardening, denyRules, hardeningApplied, removeHardening } from '../hardening.js';
import { roles } from '../roles.js';
import { skills } from '../skills.js';
import { workflows } from '../capabilities.js';

// Segurança do próprio kit: o que ele escreve nos projectos dos utilizadores não pode conter segredos
// nem dar a agentes de segurança mais alcance do que o declarado.
const secretPatterns: [string, RegExp][] = [
  ['chave privada', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['chave AWS', /\bAKIA[0-9A-Z]{16}\b/],
  ['token GitHub', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ['chave de API no formato sk-', /\bsk-[A-Za-z0-9]{20,}\b/],
  ['token Slack', /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/]
];

async function walk(dir: string, found: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, found); else found.push(path);
  }
  return found;
}

test('os ficheiros gerados para todos os CLIs não contêm segredos', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-secrets-'));
  try {
    await install(root, [...targets]);
    const files = await walk(root);
    assert.ok(files.length > 100);
    for (const file of files) {
      const text = await readFile(file, 'utf8');
      for (const [name, pattern] of secretPatterns) assert.doesNotMatch(text, pattern, `${file}: possível ${name}`);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('os agentes de segurança têm limites explícitos: só o projecto, sem produção nem alvos de terceiros', () => {
  const tester = roles['security-tester'];
  assert.ok(tester && !tester.readOnly, 'o security-tester precisa de executar comandos');
  assert.match(tester.body, /nunca produção/);
  assert.match(tester.body, /sistemas de terceiros/);
  assert.match(tester.body, /autorização escrita/);
  assert.match(tester.body, /Não copia segredos/);
  assert.match(roles.secops.body, /Nunca copiar segredos/);
  assert.equal(roles.secops.readOnly, true);
  assert.match(skills['forge-security-testing'], /Nunca testar sistemas de terceiros nem produção/);
  assert.match(skills['forge-security-testing'], /Não instalar nada sem aprovação/);
  assert.match(skills['forge-security'], /nunca o valor/);
});

test('os fluxos de construção, alteração e avaliação incluem modelo de ameaças e testes de segurança executáveis', () => {
  assert.ok(workflows['forge-build'].skills.includes('forge-threat-model'));
  for (const name of ['forge-build', 'change-request', 'security-assessment']) {
    assert.ok(workflows[name].skills.includes('forge-security-testing'), name);
  }
  const workers = workflows['forge-build'].parallelGroups.flatMap(group => group.workers.map(worker => worker.role));
  assert.ok(workers.includes('secops') && workers.includes('security-tester'));
  assert.match(workflows['security-assessment'].steps[0], /sem produção nem sistemas de terceiros/);
});

test('papéis só de leitura do OpenCode recusam flags do git que escrevem ou executam programas', () => {
  const file = generated('opencode')['.opencode/agents/secops.md'];
  const rules = [...file.matchAll(/^ {4}"(.+)": (allow|deny)$/gm)].map(match => [match[1], match[2]]);
  const last = (command: string) => {
    const escape = (text: string) => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return rules.filter(([pattern]) => new RegExp(`^${escape(pattern)}$`).test(command)).at(-1)?.[1];
  };
  assert.equal(last('git diff HEAD'), 'allow');
  assert.equal(last('git diff --output=/tmp/x'), 'deny');
  assert.equal(last('git log --output=x'), 'deny');
  assert.equal(last('git show --ext-diff'), 'deny');
  assert.equal(last('rm -rf .'), 'deny');
});

test('model-profiles.json não é lido através de um symlink', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-link-'));
  const outside = await mkdtemp(join(tmpdir(), 'agentforge-outside-'));
  try {
    await mkdir(join(root, '.agentforge/work'), { recursive: true });
    await writeFile(join(outside, 'm.json'), '{"claude":{"thinking":"EXFIL"}}');
    await symlink(join(outside, 'm.json'), join(root, '.agentforge/work/model-profiles.json'));
    await assert.rejects(loadModels(root), /Symlink não permitido/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test('um temporário obsoleto do manifesto não bloqueia a instalação', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-tmp-'));
  try {
    await install(root, ['codex']);
    await writeFile(join(root, '.agentforge/manifest.json.tmp'), 'lixo');
    await install(root, ['claude']);
    await remove(root, ['claude']);
    assert.deepEqual(await install(root, ['codex']), ['Instalação já atualizada.']);
    assert.ok((await readdir(join(root, '.agentforge'))).every(name => !name.endsWith('.tmp')));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('harden acrescenta e remove só as regras do AgentForge, preservando as do utilizador', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-harden-'));
  try {
    await mkdir(join(root, '.claude'));
    const settings = join(root, '.claude/settings.json');
    await writeFile(settings, JSON.stringify({ model: 'x', permissions: { allow: ['Bash(ls)'], deny: ['Read(./.env)', 'Bash(rm *)'] } }));
    assert.equal(await hardeningApplied(root), false);
    await applyHardening(root);
    assert.equal(await hardeningApplied(root), true);
    const applied = JSON.parse(await readFile(settings, 'utf8'));
    assert.equal(applied.model, 'x');
    assert.deepEqual(applied.permissions.allow, ['Bash(ls)']);
    assert.equal(applied.permissions.deny.filter((rule: string) => rule === 'Read(./.env)').length, 1);
    assert.equal(await applyHardening(root), 'Regras de recusa já presentes.');
    await removeHardening(root);
    const restored = JSON.parse(await readFile(settings, 'utf8'));
    assert.deepEqual(restored.permissions.deny, ['Read(./.env)', 'Bash(rm *)']);
    assert.ok(denyRules.length > 5);
  } finally { await rm(root, { recursive: true, force: true }); }
});
