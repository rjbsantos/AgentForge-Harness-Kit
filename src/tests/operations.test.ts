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
