import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { install, remove } from '../installer.js';
import { addLesson, changeLesson, getContext, listLessons, saveContext } from '../memory.js';

async function project(fn: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-learn-'));
  try { await install(root, ['codex']); await fn(root); }
  finally { await rm(root, { recursive: true, force: true }); }
}

test('lessons require evidence and review; only approved relevant lessons enter brief context', () => project(async root => {
  await writeFile(join(root, 'evidence.txt'), 'verified');
  await assert.rejects(addLesson(root, 'Missing evidence', 'missing.txt:1'), /ENOENT/);
  await assert.rejects(addLesson(root, 'Outside', '..\\outside.txt'), /inválido|fora do projeto/);
  const item = await addLesson(root, 'Use focused checks for changed modules', 'evidence.txt:1');
  assert.equal(item.status, 'pending');
  assert.equal((await getContext(root)).lessons.length, 0);
  await assert.rejects(addLesson(root, item.lesson, item.evidence), /já registada/);
  const approved = await changeLesson(root, item.id, 'approve');
  assert.equal(approved.status, 'approved');
  assert.equal((await getContext(root, 'focused')).lessons[0].id, item.id);
  assert.equal((await getContext(root, 'unrelated')).lessons.length, 0);
  await assert.rejects(changeLesson(root, item.id, 'approve'), /pendentes/);
  await saveContext(root, 'Decision: use small batch; evidence: evidence.txt:1', 'Run checks');
  assert.match((await getContext(root)).summary, /Run checks/);
  assert.match((await getContext(root)).state, /Estado AgentForge/);
  await install(root, ['codex']);
  assert.equal((await listLessons(root))[0].status, 'approved');
  await remove(root, ['codex']);
  assert.equal((await listLessons(root))[0].status, 'approved');
  assert.match(await readFile(join(root, '.agentforge/work/context.md'), 'utf8'), /Decision:/);
  await changeLesson(root, item.id, 'retire');
  assert.equal((await getContext(root)).lessons.length, 0);
}));

test('reusable lessons require an anchor, stay concise and are capped', () => project(async root => {
  await writeFile(join(root, 'evidence.txt'), 'verified');
  await assert.rejects(addLesson(root, 'Generalises everywhere', 'evidence.txt:1', { scope: 'reusable' }),
    /âncora/);
  const long = 'x'.repeat(321);
  await assert.rejects(addLesson(root, long, 'evidence.txt:1', { scope: 'reusable', anchor: 'Node 20' }),
    /longo/);
  const reusable = await addLesson(root, 'Node 20 ESM requires explicit .js extensions in relative imports',
    'evidence.txt:1', { scope: 'reusable', anchor: 'Node 20' });
  assert.equal(reusable.scope, 'reusable');
  assert.equal(reusable.anchor, 'Node 20');
  for (let i = 0; i < 4; i++) {
    await addLesson(root, `Reusable lesson number ${i}`, 'evidence.txt:1', { scope: 'reusable', anchor: 'Node 20' });
  }
  await assert.rejects(addLesson(root, 'One too many', 'evidence.txt:1', { scope: 'reusable', anchor: 'Node 20' }),
    /Limite de 5/);
  const projectLesson = await addLesson(root, 'This file layout mirrors src/<module>', 'evidence.txt:1');
  assert.equal(projectLesson.scope, 'project');
  assert.equal(projectLesson.anchor, undefined);
}));

test('active summary is bounded and missing state is not hidden', () => project(async root => {
  await assert.rejects(saveContext(root, 'x'.repeat(1801), 'next'), /longo/);
  await assert.rejects(saveContext(root, 'ok', ' '), /vazio/);
  await rm(join(root, '.agentforge/work/state.md'));
  await assert.rejects(saveContext(root, 'ok', 'next'), /ENOENT/);
}));

test('CLI supports lesson capture, approval and concise retrieval', () => project(async root => {
  const cli = fileURLToPath(new URL('../cli/index.js', import.meta.url));
  const run = (...args: string[]) => JSON.parse(execFileSync(process.execPath,
    [cli, ...args, '--project', root], { encoding: 'utf8' }));
  await writeFile(join(root, 'proof.txt'), 'verified');
  const item = run('learn', 'add', '--lesson', 'Check contracts', '--evidence', 'proof.txt');
  assert.equal(item.status, 'pending');
  assert.equal(run('context').lessons.length, 0);
  run('learn', 'approve', '--id', item.id);
  assert.equal(run('context', '--topic', 'contracts').lessons[0].lesson, 'Check contracts');
  const reusable = run('learn', 'add', '--lesson', 'Node 20 ESM needs .js specifiers', '--evidence', 'proof.txt',
    '--scope', 'reusable', '--anchor', 'Node 20');
  assert.equal(reusable.scope, 'reusable');
  assert.equal(reusable.anchor, 'Node 20');
}));
