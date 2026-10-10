import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { audit } from './audit.js';
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
const defaultContextBudget = 1200;
const maxContextBudget = 32000;
const ledgerKey = '.agentforge/work/lessons.json';
const contextKey = '.agentforge/work/context.md';
const stateKey = '.agentforge/work/state.md';
const sealKey = '.agentforge/work/lessons.seal';

// O ficheiro de lições é reinjectado em prompts. O selo é um HMAC cuja chave vive fora do projecto
// (AGENTFORGE_HOME ou ~/.config/agentforge): quem só consegue escrever no repositório (um PR, um
// clone, um ficheiro editado à mão) não consegue forjá-lo. Não protege contra quem já executa
// código com a conta do utilizador, que pode ler a chave; para isso a aprovação exige terminal.
export type Integrity = 'sealed' | 'tampered' | 'unsealed';
const sealPrefix = 'hmac-sha256:';

function keyPath(): string {
  return join(process.env.AGENTFORGE_HOME || join(homedir(), '.config', 'agentforge'), 'seal.key');
}

async function sealKeyFile(create: boolean): Promise<Buffer | undefined> {
  const path = keyPath();
  try {
    return Buffer.from((await readFile(path, 'utf8')).trim(), 'hex');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (!create) return undefined;
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  try {
    await writeFile(path, randomBytes(32).toString('hex') + '\n', { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
  return Buffer.from((await readFile(path, 'utf8')).trim(), 'hex');
}

const sign = (key: Buffer, value: string) => sealPrefix + createHmac('sha256', key).update(value).digest('hex');

export async function lessonsIntegrity(project: string): Promise<Integrity> {
  const root = rootOf(project);
  let seal: string;
  try { seal = (await read(root, sealKey)).trim(); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 'unsealed';
    throw error;
  }
  // Selo das versões até à 0.10 (SHA-256 sem chave): não é verificável, tem de ser revisto e refeito.
  if (!seal.startsWith(sealPrefix)) return 'unsealed';
  const key = await sealKeyFile(false);
  if (!key) return 'tampered';
  const expected = Buffer.from(sign(key, await read(root, ledgerKey)));
  const actual = Buffer.from(seal);
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? 'sealed' : 'tampered';
}

async function writeLedger(root: string, store: Ledger): Promise<void> {
  const content = JSON.stringify(store, null, 2) + '\n';
  const key = (await sealKeyFile(true))!;
  await write(root, ledgerKey, content);
  await write(root, sealKey, sign(key, content) + '\n');
}

// Aceita o estado actual de lessons.json depois de uma revisão humana.
export async function resealLessons(project: string): Promise<void> {
  const root = rootOf(project);
  await ledger(root);
  const key = (await sealKeyFile(true))!;
  await write(root, sealKey, sign(key, await read(root, ledgerKey)) + '\n');
  await audit(root, 'lessons.reseal');
}

async function mutableLedger(root: string): Promise<Ledger> {
  if (await lessonsIntegrity(root) === 'tampered') {
    throw new Error('lessons.json foi alterado fora do CLI ou o selo não pertence a esta conta; reveja o ficheiro e execute `agentforge learn reseal`');
  }
  return ledger(root);
}

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
  const store = await mutableLedger(root);
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
  await writeLedger(root, store);
  await audit(root, 'lesson.add', { id: item.id, scope });
  return item;
}

export async function changeLesson(project: string, id: string, action: 'approve' | 'retire'): Promise<Lesson> {
  const root = rootOf(project);
  const store = await mutableLedger(root);
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
  await writeLedger(root, store);
  await audit(root, `lesson.${action}`, { id: item.id });
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

function estimateTokens(value: string): number {
  return Math.ceil(value.length / 4);
}

export async function getContext(project: string, topic?: string, budgetTokens = defaultContextBudget): Promise<{
  state: string;
  summary: string;
  lessons: Lesson[];
  budget: { limitTokens: number; estimatedTokens: number; omittedLessons: number; estimate: 'chars-divided-by-4' };
  warnings: string[];
}> {
  if (!Number.isInteger(budgetTokens) || budgetTokens < 1 || budgetTokens > maxContextBudget) {
    throw new Error(`Orçamento de contexto inválido (1-${maxContextBudget} tokens)`);
  }
  const root = rootOf(project);
  const [state, summary, store] = await Promise.all([
    read(root, stateKey), read(root, contextKey), ledger(root)
  ]);
  const query = topic?.trim().toLowerCase();
  const integrity = await lessonsIntegrity(root);
  const warnings: string[] = [];
  const trusted = integrity !== 'tampered';
  if (!trusted) warnings.push('lessons.json foi alterado fora do CLI (ou o selo é de outra conta): lições omitidas até `agentforge learn reseal`');
  else if (integrity === 'unsealed' && store.lessons.some(item => item.status === 'approved')) {
    warnings.push('lessons.json sem selo de integridade: origem das lições aprovadas não verificada');
  }
  const approved = store.lessons.filter(item => trusted && item.status === 'approved' &&
    (!query || `${item.lesson} ${item.evidence} ${item.anchor ?? ''}`.toLowerCase().includes(query)));
  const fixedTokens = estimateTokens(`${state}\n${summary}`) + 16;
  if (fixedTokens > budgetTokens) {
    throw new Error(`Estado e resumo activos excedem o orçamento (${fixedTokens}/${budgetTokens} tokens estimados); compacte work/context.md ou aumente --budget-tokens`);
  }
  let estimatedTokens = fixedTokens;
  let omittedLessons = 0;
  const lessons: Lesson[] = [];
  for (const item of approved.slice().reverse()) {
    const itemTokens = estimateTokens(JSON.stringify(item));
    if (lessons.length >= 5 || estimatedTokens + itemTokens > budgetTokens) {
      omittedLessons++;
      continue;
    }
    lessons.push(item);
    estimatedTokens += itemTokens;
  }
  return {
    state,
    summary,
    lessons,
    budget: { limitTokens: budgetTokens, estimatedTokens, omittedLessons, estimate: 'chars-divided-by-4' },
    warnings
  };
}
