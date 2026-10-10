import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { operationInsights, recordRun } from '../operations.js';
import { install } from '../installer.js';

test('operation insights aggregate only explicit execution records and surface repeated errors', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-insights-'));
  try {
    await install(root, ['codex']);
    assert.equal((await operationInsights(root)).totalRuns, 0);
    const run = {
      role: 'senior-developer' as const,
      workflow: 'bug-investigation',
      result: 'failed' as const,
      validation: 'failed' as const,
      durationMs: 200,
      toolsUsed: ['file-system'],
      retries: 1,
      tokens: 100,
      cost: 0.02,
      errorCode: 'TEST_TIMEOUT'
    };
    await recordRun(root, run);
    await recordRun(root, { ...run, durationMs: 400, tokens: 200, cost: 0.04 });
    await recordRun(root, {
      role: 'project-manager',
      workflow: 'project-status',
      result: 'passed',
      validation: 'passed',
      durationMs: 600,
      toolsUsed: ['file-system']
    });

    const summary = await operationInsights(root);
    assert.deepEqual(summary.outcomes, { passed: 1, failed: 2, blocked: 0 });
    assert.deepEqual(summary.validations, { passed: 1, failed: 2, 'not-run': 0 });
    assert.deepEqual(summary.tokens, { reportedRuns: 2, total: 300 });
    assert.deepEqual(summary.cost, { reportedRuns: 2, total: 0.06 });
    assert.equal(summary.averageDurationMs, 400);
    assert.deepEqual(summary.recurringErrors, [{
      workflow: 'bug-investigation', errorCode: 'TEST_TIMEOUT', occurrences: 2, lines: [1, 2]
    }]);
    assert.equal(summary.byWorkflow.find(item => item.workflow === 'bug-investigation')?.retries, 2);
    const cli = fileURLToPath(new URL('../cli/index.js', import.meta.url));
    const cliSummary = JSON.parse(execFileSync(process.execPath,
      [cli, 'insights', '--project', root], { encoding: 'utf8' }));
    assert.equal(cliSummary.totalRuns, 3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('insights reject malformed operation history with the offending line', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-insights-invalid-'));
  try {
    await install(root, ['codex']);
    await writeFile(join(root, '.agentforge/work/operations.jsonl'), '{"workflow":"bug-investigation"}\n');
    await assert.rejects(operationInsights(root), /linha 1: campos incompatíveis/);
    await writeFile(join(root, '.agentforge/work/operations.jsonl'),
      '{"role":"toString","workflow":"bug-investigation","result":"failed","validation":"failed","durationMs":1,"toolsUsed":[]}\n');
    await assert.rejects(operationInsights(root), /linha 1: campos incompatíveis/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a evidência registada é verificada: alterada ou em falta deixa de contar como verificada', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-evidence-'));
  try {
    await install(root, ['codex']);
    const base = { role: 'project-manager' as const, workflow: 'project-status', result: 'passed' as const,
      validation: 'passed' as const, durationMs: 1, toolsUsed: ['file-system'] };
    await writeFile(join(root, 'saida.txt'), 'ok 12 testes');
    await recordRun(root, { ...base, evidence: 'saida.txt' });
    await recordRun(root, base);
    assert.deepEqual((await operationInsights(root)).passedEvidence, { verified: 1, changed: 0, missing: 0, none: 1 });
    await writeFile(join(root, 'saida.txt'), 'adulterado');
    assert.deepEqual((await operationInsights(root)).passedEvidence, { verified: 0, changed: 1, missing: 0, none: 1 });
    await rm(join(root, 'saida.txt'));
    assert.deepEqual((await operationInsights(root)).passedEvidence, { verified: 0, changed: 0, missing: 1, none: 1 });
    await writeFile(join(root, 'vazio.txt'), '');
    await assert.rejects(recordRun(root, { ...base, evidence: 'vazio.txt' }), /Evidência vazia/);
    await assert.rejects(recordRun(root, { ...base, evidence: '../fora.txt' }), /inválido/);
    await assert.rejects(recordRun(root, { ...base, evidence: 'inexistente.txt' }), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
