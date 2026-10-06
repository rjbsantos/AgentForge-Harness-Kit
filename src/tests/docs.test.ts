import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { skills } from '../skills.js';
import { roles } from '../roles.js';

// Os testes correm a partir de dist/tests; a raiz do repositório fica dois níveis acima.
const root = join(dirname(new URL(import.meta.url).pathname), '..', '..');
const read = (file: string): string => readFileSync(join(root, file), 'utf8');
const version = (JSON.parse(read('package.json')) as { version: string }).version;

test('catálogos Markdown listam todas as competências e agentes de src/', () => {
  const skillDoc = read('docs/skills/CATALOG.md');
  for (const name of Object.keys(skills)) assert.ok(skillDoc.includes(`\`${name}\``), `docs/skills/CATALOG.md não lista ${name}`);
  const agentDoc = read('docs/agents/CATALOG.md');
  for (const name of Object.keys(roles)) assert.ok(agentDoc.includes(`\`${name}\``), `docs/agents/CATALOG.md não lista ${name}`);
});

test('a versão do pacote é a mesma no README, no README em inglês e no CHANGELOG', () => {
  for (const file of ['README.md', 'README.en.md']) {
    const versions = [...read(file).matchAll(/(?:agentforge-harness-kit-|v)(\d+\.\d+\.\d+)/g)].map(match => match[1]);
    assert.ok(versions.length > 0, `${file} não indica a versão`);
    for (const found of versions) assert.equal(found, version, `${file} refere ${found}, o pacote é ${version}`);
  }
  assert.match(read('CHANGELOG.md'), new RegExp(`^## ${version.replace(/\./g, '\\.')}$`, 'm'));
});

test('as ligações relativas da documentação apontam para ficheiros existentes', () => {
  const files = ['README.md', 'README.en.md', 'CONTRIBUTING.md', 'docs/README.md', 'docs/operations/COMMANDS.md', 'docs/testing/EVALUATION.md', 'docs/agents/CATALOG.md'];
  for (const file of files) {
    for (const match of read(file).matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
      const target = match[1];
      if (/^[a-z]+:/.test(target)) continue;
      assert.ok(existsSync(join(root, dirname(file), target)), `${file}: ligação quebrada para ${target}`);
    }
  }
});

test('o código-fonte referido pela documentação existe', () => {
  for (const file of ['CONTRIBUTING.md', 'docs/agents/CATALOG.md', 'docs/architecture/AUDIT.md', 'docs/architecture/OVERVIEW.md', 'docs/decisions/0001-composicao.md']) {
    for (const match of read(file).matchAll(/`(src\/[a-z-]+\.ts)`/g)) assert.ok(existsSync(join(root, match[1])), `${file} refere ${match[1]}, que não existe`);
  }
});
