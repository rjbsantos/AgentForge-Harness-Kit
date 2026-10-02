import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { safe } from './installer.js';

export type LessonScope = 'project' | 'reusable';
export interface Lesson {
  id: string;
  lesson: string;
  evidence: string;
  status: 'pending' | 'approved' | 'retired';
  scope: LessonScope;
  anchor?: string;
}
interface Ledger { version: 1; lessons: Lesson[] }
const maxPendingReusable = 5;
const reusableLessonLimit = 320;
const ledgerKey = '.agentforge/work/lessons.json';
const contextKey = '.agentforge/work/context.md';
const stateKey = '.agentforge/work/state.md';

function input(value: string, label: string, limit: number): string {
  const result = value.trim();
  if (!result || result.length > limit || /[\x00-\x08\x0b-\x1f]/.test(result)) {
    throw new Error(`${label} vazio, longo ou inválido (máximo ${limit} caracteres)`);
  }
  return result;
}

async function read(root: string, key: string): Promise<string> {
  return readFile(safe(root, key), 'utf8');
}

async function write(root: string, key: string, value: string): Promise<void> {
  const path = safe(root, key);
  await mkdir(dirname(path), { recursive: true });
  const temporary = path + `.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, value, { flag: 'wx' });
    await rename(temporary, path);
  } finally {
    if (existsSync(temporary)) await rm(temporary);
  }
}

async function ledger(root: string): Promise<Ledger> {
  const value: unknown = JSON.parse(await read(root, ledgerKey));
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 ||
    !('lessons' in value) || !Array.isArray(value.lessons) ||
    value.lessons.some(item => !item || typeof item.id !== 'string' ||
      typeof item.lesson !== 'string' || typeof item.evidence !== 'string' ||
      !['pending', 'approved', 'retired'].includes(item.status) ||
      (item.scope !== undefined && item.scope !== 'project' && item.scope !== 'reusable') ||
      (item.anchor !== undefined && typeof item.anchor !== 'string'))) {
    throw new Error('Registo de lições inválido');
  }
  const typed = value as Ledger;
  // Lições gravadas antes da distinção de âmbito assumem 'project' (compatibilidade retroativa).
  for (const item of typed.lessons) if (!item.scope) item.scope = 'project';
  return typed;
}

function rootOf(project: string): string {
  const root = resolve(project);
  if (!existsSync(root)) throw new Error(`Projeto inexistente: ${root}`);
  return root;
}

async function evidenceFile(root: string, evidence: string): Promise<void> {
  const path = evidence.replace(/:\d+$/, '');
  const file = safe(root, path);
  if (!(await stat(file)).isFile()) throw new Error(`Evidência não é ficheiro: ${evidence}`);
}

export async function addLesson(project: string, lesson: string, evidence: string,
  options: { scope?: LessonScope; anchor?: string } = {}): Promise<Lesson> {
  const root = rootOf(project);
  const scope = options.scope ?? 'project';
  // Lições 'reusable' seguem a fasquia de generalização: devem caber em poucas frases e
  // identificar a tecnologia/versão a que se aplicam, para não serem reaplicadas fora do contexto certo.
  const note = input(lesson, 'Lição', scope === 'reusable' ? reusableLessonLimit : 500);
  const source = input(evidence, 'Evidência', 300);
  await evidenceFile(root, source);
  const store = await ledger(root);
  if (scope === 'reusable' && !options.anchor?.trim()) {
    throw new Error('Lições reutilizáveis exigem âncora de tecnologia/versão (--anchor)');
  }
  const anchor = options.anchor ? input(options.anchor, 'Âncora', 150) : undefined;
  if (scope === 'reusable') {
    const pendingReusable = store.lessons.filter(item => item.scope === 'reusable' && item.status !== 'retired').length;
    if (pendingReusable >= maxPendingReusable) {
      throw new Error(`Limite de ${maxPendingReusable} lições reutilizáveis activas atingido; retirar alguma antes de propor novas`);
    }
  }
  if (store.lessons.some(item => item.lesson === note && item.status !== 'retired')) {
    throw new Error('Lição já registada');
  }
  const item: Lesson = { id: randomUUID(), lesson: note, evidence: source, status: 'pending', scope, anchor };
  store.lessons.push(item);
  await write(root, ledgerKey, JSON.stringify(store, null, 2) + '\n');
  return item;
}

export async function changeLesson(project: string, id: string, action: 'approve' | 'retire'): Promise<Lesson> {
  const root = rootOf(project);
  const store = await ledger(root);
  const item = store.lessons.find(entry => entry.id === id);
  if (!item) throw new Error(`Lição desconhecida: ${id}`);
  if (action === 'approve') {
    if (item.status !== 'pending') throw new Error('Só lições pendentes podem ser aprovadas');
    await evidenceFile(root, item.evidence);
    item.status = 'approved';
  } else {
    if (item.status === 'retired') throw new Error('Lição já retirada');
    item.status = 'retired';
  }
  await write(root, ledgerKey, JSON.stringify(store, null, 2) + '\n');
  return item;
}

export async function listLessons(project: string): Promise<Lesson[]> {
  return (await ledger(rootOf(project))).lessons;
}

export async function saveContext(project: string, summary: string, next: string): Promise<void> {
  const root = rootOf(project);
  const brief = input(summary, 'Resumo', 1800);
  const action = input(next, 'Próximo passo', 200);
  await read(root, stateKey);
  await write(root, contextKey, `# Contexto ativo AgentForge\n\n${brief}\n\nPróximo passo: ${action}\n`);
}

export async function getContext(project: string, topic?: string): Promise<{
  state: string; summary: string; lessons: Lesson[];
}> {
  const root = rootOf(project);
  const store = await ledger(root);
  const query = topic?.trim().toLowerCase();
  const approved = store.lessons.filter(item => item.status === 'approved' &&
    (!query || `${item.lesson} ${item.evidence}`.toLowerCase().includes(query)));
  return {
    state: await read(root, stateKey),
    summary: await read(root, contextKey),
    lessons: approved.slice(-5).reverse()
  };
}
