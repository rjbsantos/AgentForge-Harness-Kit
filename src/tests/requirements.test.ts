import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Matriz requisito → teste do próprio kit (docs/architecture/REQUIREMENTS.md). Os ficheiros de
// teste são lidos de src/tests, onde estão os fontes, e não de dist/tests.
const root = fileURLToPath(new URL('../../', import.meta.url));
const document = readFileSync(`${root}docs/architecture/REQUIREMENTS.md`, 'utf8');
const rows = document.split('\n').filter(line => /^\| KREQ-\d+ /.test(line)).map(line => {
  const [id, text, priority, tests] = line.split('|').slice(1, 5).map(cell => cell.trim());
  return { id, text, priority, references: [...tests.matchAll(/`([^`:]+)::([^`]+)`/g)].map(match => [match[1], match[2]]) };
});

test('requisitos do kit: identificadores únicos e todos os Must têm teste', () => {
  assert.ok(rows.length >= 15);
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
  for (const row of rows) {
    assert.match(row.priority, /^(Must|Should|Could)$/, row.id);
    assert.ok(row.references.length, `${row.id}: sem testes`);
  }
});

test('requisitos do kit: cada teste referido existe no ficheiro indicado', () => {
  for (const row of rows) {
    for (const [file, title] of row.references) {
      const path = `${root}src/tests/${file}`;
      assert.ok(existsSync(path), `${row.id}: ${file} não existe`);
      assert.ok(readFileSync(path, 'utf8').includes(title), `${row.id}: «${title}» não consta de ${file}`);
    }
  }
});
