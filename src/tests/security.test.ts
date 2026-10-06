import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { install, targets } from '../installer.js';
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
