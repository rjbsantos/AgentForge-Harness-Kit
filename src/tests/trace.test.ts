import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { trace } from '../trace.js';

const header = '| ID | Actor | Descrição | Prioridade | Dependências | Critério de aceitação | Aprovação |\n| --- | --- | --- | --- | --- | --- | --- |\n';

async function project(fn: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-trace-'));
  try {
    await mkdir(join(root, '.agentforge/work'), { recursive: true });
    await fn(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('trace: um projecto com requisitos, plano e testes coerentes não tem lacunas', () => project(async root => {
  await writeFile(join(root, '.agentforge/work/requirements.md'), header +
    '| REQ-001 | Utilizador | Entrar | Must | - | Login devolve 200 | sim |\n' +
    '| REQ-002 | Utilizador | Tema | Could | - | - | - |\n');
  await writeFile(join(root, '.agentforge/work/plan.md'), '# Plano\n- T1 cobre REQ-001\n');
  await mkdir(join(root, 'tests'));
  await writeFile(join(root, 'tests/login.test.ts'), "test('REQ-001 login devolve 200', () => {});\n");
  const report = await trace(root);
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.requirements, { file: '.agentforge/work/requirements.md', total: 2, must: 1 });
  assert.deepEqual(report.coverage, { plan: '1/1', tests: '1/1' });
}));

test('trace: requisitos Must sem critério, aprovação, plano ou teste e referências órfãs são reportados', () => project(async root => {
  await writeFile(join(root, '.agentforge/work/requirements.md'), header +
    '| REQ-001 | U | A | Must | - | - | sim |\n' +
    '| REQ-002 | U | B | Must | - | Responde em 1 s | pendente |\n' +
    '| REQ-002 | U | B | Should | - | x | sim |\n');
  await writeFile(join(root, '.agentforge/work/plan.md'), 'Tarefa T1: REQ-009\n');
  await writeFile(join(root, 'a.test.js'), '// REQ-001\n');
  const types = (await trace(root)).findings.map(finding => `${finding.type}:${finding.id ?? ''}`).sort();
  assert.deepEqual(types, ['duplicate-id:REQ-002', 'no-acceptance:REQ-001', 'no-test:REQ-002', 'not-in-plan:REQ-001',
    'not-in-plan:REQ-002', 'unapproved:REQ-002', 'unknown-in-plan:REQ-009']);
}));

test('trace: CLI devolve 1 com lacunas, ignora symlinks e recusa ficheiros fora do projecto', () => project(async root => {
  const cli = fileURLToPath(new URL('../cli/index.js', import.meta.url));
  await writeFile(join(root, '.agentforge/work/requirements.md'), header + '| REQ-001 | U | A | Must | - | ok | sim |\n');
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, 'trace', '--project', root, ...args], { encoding: 'utf8' });
  const gaps = run();
  assert.equal(gaps.status, 1);
  assert.match(gaps.stdout, /no-plan/);
  assert.match(run('--requirements', '../x.md').stderr, /inválido/);
  assert.equal(spawnSync(process.execPath, [cli, 'install', '--project', root, '--plan', 'p.md']).status, 2);
}));
