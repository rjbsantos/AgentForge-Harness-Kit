import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { audit } from './audit.js';
import { workflows } from './capabilities.js';
import { atomicWrite, safe } from './installer.js';

// Registo de execução de um fluxo, para que um fluxo corra sempre completo e pela mesma ordem.
// O catálogo diz que passos existem; isto regista o que foi feito, com evidência ou nota, e
// recusa fechar com passos pendentes. Os passos que exigem decisão humana (validação N1/N2,
// autorização) só avançam com confirmação num terminal, como a aprovação de lições.
export type StepStatus = 'pending' | 'done' | 'skipped';
export interface StepState {
  n: number;
  text: string;
  human: boolean;
  status: StepStatus;
  evidence?: string;
  evidenceHash?: string;
  note?: string;
  reason?: string;
  at?: string;
}
export interface FlowState {
  version: 1;
  workflow: string;
  startedAt: string;
  steps: StepState[];
  groups: number[][];
}
export interface FlowStatus {
  workflow: string;
  total: number;
  done: number;
  skipped: number;
  pending: number;
  next: { n: number; text: string; human: boolean }[];
  complete: boolean;
}

const flowKey = '.agentforge/work/flow.json';
const archiveDir = '.agentforge/work/flows';
const humanStep = /valida[cç][aã]o (?:N[12]|humana)|autoriza[cç][aã]o|aprova[cç][aã]o/i;
const digest = (value: Buffer) => createHash('sha256').update(value).digest('hex');

async function load(root: string): Promise<FlowState | undefined> {
  const path = safe(root, flowKey);
  if (!existsSync(path)) return undefined;
  const value: unknown = JSON.parse(await readFile(path, 'utf8'));
  const state = value as FlowState;
  if (!state || state.version !== 1 || typeof state.workflow !== 'string' || !Array.isArray(state.steps) ||
      !Array.isArray(state.groups) || !(state.workflow in workflows)) throw new Error('flow.json inválido');
  return state;
}

async function save(root: string, state: FlowState): Promise<void> {
  const path = safe(root, flowKey);
  await mkdir(dirname(path), { recursive: true });
  await atomicWrite(path, JSON.stringify(state, null, 2) + '\n');
}

const resolved = (step: StepState) => step.status !== 'pending';
const siblings = (state: FlowState, a: number, b: number) => state.groups.some(group => group.includes(a) && group.includes(b));
const allowed = (state: FlowState, n: number) =>
  state.steps.every(step => step.n >= n || resolved(step) || siblings(state, step.n, n));

function summarize(state: FlowState): FlowStatus {
  const pending = state.steps.filter(step => step.status === 'pending');
  return {
    workflow: state.workflow, total: state.steps.length,
    done: state.steps.filter(step => step.status === 'done').length,
    skipped: state.steps.filter(step => step.status === 'skipped').length,
    pending: pending.length,
    next: pending.filter(step => allowed(state, step.n)).map(step => ({ n: step.n, text: step.text, human: step.human })),
    complete: pending.length === 0
  };
}

async function need(root: string): Promise<FlowState> {
  const state = await load(root);
  if (!state) throw new Error('Nenhum fluxo activo; execute `agentforge flow start --workflow FLUXO`');
  return state;
}

export async function startFlow(project: string, workflow: string): Promise<FlowStatus> {
  const root = resolve(project);
  if (!(workflow in workflows)) throw new Error(`Fluxo desconhecido: ${workflow}`);
  const active = await load(root);
  if (active) throw new Error(`Já existe um fluxo activo (${active.workflow}); feche-o com \`flow close\` ou abandone-o com \`flow abandon\``);
  const definition = workflows[workflow];
  const state: FlowState = {
    version: 1, workflow, startedAt: new Date().toISOString(),
    steps: definition.steps.map((text, index) => ({ n: index + 1, text, human: humanStep.test(text), status: 'pending' as const })),
    groups: definition.parallelGroups.map(group => group.workers.map(worker => worker.step))
  };
  await save(root, state);
  await audit(root, 'flow.start', { workflow });
  return summarize(state);
}

export async function flowStatus(project: string): Promise<FlowStatus & { steps: StepState[] }> {
  const state = await need(resolve(project));
  return { ...summarize(state), steps: state.steps };
}

interface Resolve { evidence?: string; note?: string; reason?: string; confirm?: (text: string) => Promise<void> }

async function resolveStep(project: string, n: number, mode: 'done' | 'skipped', options: Resolve): Promise<FlowStatus> {
  const root = resolve(project);
  const state = await need(root);
  const step = state.steps.find(item => item.n === n);
  if (!step) throw new Error(`Passo inexistente: ${n} (o fluxo ${state.workflow} tem ${state.steps.length})`);
  if (step.status !== 'pending') throw new Error(`O passo ${n} já está ${step.status === 'done' ? 'concluído' : 'dispensado'}`);
  if (!allowed(state, n)) {
    const before = state.steps.filter(item => item.n < n && !resolved(item) && !siblings(state, item.n, n)).map(item => item.n);
    throw new Error(`O passo ${n} não pode avançar: faltam os passos ${before.join(', ')}`);
  }
  if (mode === 'done') {
    if (!options.evidence && !options.note?.trim()) throw new Error('Um passo concluído exige --evidence CAMINHO ou --note TEXTO');
    if (options.evidence) {
      const file = safe(root, options.evidence);
      if (!(await stat(file)).isFile()) throw new Error(`Evidência não é ficheiro: ${options.evidence}`);
      step.evidence = options.evidence;
      step.evidenceHash = digest(await readFile(file));
    }
    if (options.note?.trim()) step.note = options.note.trim().slice(0, 300);
  } else {
    if (!options.reason || options.reason.trim().length < 10) throw new Error('Dispensar um passo exige --reason com pelo menos 10 caracteres');
    step.reason = options.reason.trim().slice(0, 300);
  }
  if (step.human) {
    if (!options.confirm) throw new Error(`O passo ${n} exige decisão humana e confirmação num terminal`);
    await options.confirm(`Passo ${n} de ${state.workflow}: ${step.text}\n${mode === 'done' ? 'Confirma que foi concluído e aprovado?' : 'Confirma dispensar este passo de decisão humana?'}`);
  }
  step.status = mode;
  step.at = new Date().toISOString();
  await save(root, state);
  await audit(root, 'flow.step', { workflow: state.workflow, step: String(n), status: mode });
  return summarize(state);
}

export const completeStep = (project: string, n: number, options: Resolve) => resolveStep(project, n, 'done', options);
export const skipStep = (project: string, n: number, options: Resolve) => resolveStep(project, n, 'skipped', options);

export async function closeFlow(project: string): Promise<{ archive: string; done: number; skipped: number }> {
  const root = resolve(project);
  const state = await need(root);
  const pending = state.steps.filter(step => step.status === 'pending');
  if (pending.length) throw new Error(`Fluxo incompleto: faltam os passos ${pending.map(step => step.n).join(', ')}`);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archive = `${archiveDir}/${stamp}-${state.workflow}.json`;
  const path = safe(root, archive);
  await mkdir(dirname(path), { recursive: true });
  await atomicWrite(path, JSON.stringify({ ...state, closedAt: new Date().toISOString() }, null, 2) + '\n');
  await rm(safe(root, flowKey));
  const summary = summarize(state);
  await audit(root, 'flow.close', { workflow: state.workflow, done: String(summary.done), skipped: String(summary.skipped) });
  return { archive, done: summary.done, skipped: summary.skipped };
}

export async function abandonFlow(project: string): Promise<string> {
  const root = resolve(project);
  const state = await need(root);
  await rm(safe(root, flowKey));
  await audit(root, 'flow.abandon', { workflow: state.workflow });
  return state.workflow;
}
