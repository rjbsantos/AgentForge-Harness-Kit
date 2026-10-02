import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { profiles, tools, workflows, type Profile } from './capabilities.js';
import { safe } from './installer.js';

export interface RunRecord {
  role: Profile;
  workflow: string;
  result: 'passed' | 'failed' | 'blocked';
  validation: 'passed' | 'failed' | 'not-run';
  durationMs: number;
  toolsUsed: string[];
  skillsUsed?: string[];
  retries?: number;
  tokens?: number;
  cost?: number;
  errorCode?: string;
}

export async function recordRun(project: string, record: RunRecord): Promise<void> {
  const root = resolve(project);
  if (!(record.role in profiles) || !profiles[record.role].workflows.some(name => name === record.workflow) ||
    !(record.workflow in workflows) || !['passed', 'failed', 'blocked'].includes(record.result) ||
    !['passed', 'failed', 'not-run'].includes(record.validation) ||
    record.result === 'passed' && record.validation !== 'passed' ||
    !Number.isFinite(record.durationMs) || record.durationMs < 0 ||
    !Array.isArray(record.toolsUsed) || !record.toolsUsed.every(tool => tool in tools) ||
    record.skillsUsed !== undefined && (!Array.isArray(record.skillsUsed) ||
      !record.skillsUsed.every(skill => workflows[record.workflow].skills.includes(skill))) ||
    record.retries !== undefined && (!Number.isInteger(record.retries) || record.retries < 0) ||
    record.tokens !== undefined && (!Number.isInteger(record.tokens) || record.tokens < 0) ||
    record.cost !== undefined && (!Number.isFinite(record.cost) || record.cost < 0) ||
    record.errorCode !== undefined && !/^[a-zA-Z0-9_-]{1,60}$/.test(record.errorCode)) {
    throw new Error('Registo de execução inválido');
  }
  await readFile(safe(root, '.agentforge/work/state.md'), 'utf8');
  const path = safe(root, '.agentforge/work/operations.jsonl');
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, JSON.stringify({
    timestamp: new Date().toISOString(),
    ...record,
    agent: profiles[record.role].agent,
    skillsPlanned: workflows[record.workflow].skills
  }) + '\n', 'utf8');
}
