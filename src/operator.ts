import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { profiles, type Profile } from './capabilities.js';
import { safe } from './installer.js';

export type RiskPosture = 'cautious' | 'balanced' | 'exploratory';
export type Verbosity = 'normal' | 'concise';

export interface Operator {
  version: 1;
  headline?: string;
  roles: Profile[];
  language?: string;
  riskPosture: RiskPosture;
  verbosity: Verbosity;
  interests: string[];
}

export interface OperatorPatch {
  headline?: string;
  roles?: string[];
  language?: string;
  riskPosture?: string;
  verbosity?: string;
  interests?: string[];
}

const operatorKey = '.agentforge/work/operator.json';
const postures: RiskPosture[] = ['cautious', 'balanced', 'exploratory'];
const verbosities: Verbosity[] = ['normal', 'concise'];
const maxInterests = 12;

export const emptyOperator = (): Operator => ({ version: 1, roles: [], riskPosture: 'balanced', verbosity: 'normal', interests: [] });

function phrase(value: unknown, label: string, limit: number): string {
  if (typeof value !== 'string') throw new Error(`${label} inválido`);
  const text = value.trim();
  if (!text || text.length > limit || /[\x00-\x1f]/.test(text)) {
    throw new Error(`${label} vazio, longo ou inválido (máximo ${limit} caracteres)`);
  }
  return text;
}

function orderedRoles(value: unknown): Profile[] {
  if (!Array.isArray(value)) throw new Error('Lista de perfis inválida');
  const roles = value.map(item => phrase(item, 'Perfil', 40));
  if (roles.some(role => !(role in profiles))) {
    throw new Error(`Perfil desconhecido; use: ${Object.keys(profiles).join(', ')}`);
  }
  if (new Set(roles).size !== roles.length) throw new Error('Perfis repetidos na ordem de preferência');
  return roles as Profile[];
}

function interestList(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error('Lista de interesses inválida');
  if (value.length > maxInterests) throw new Error(`Máximo de ${maxInterests} interesses`);
  const interests = value.map(item => phrase(item, 'Interesse', 60));
  if (new Set(interests).size !== interests.length) throw new Error('Interesses repetidos');
  return interests;
}

function normalise(value: unknown): Operator {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Perfil de operador inválido');
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1) throw new Error('Perfil de operador inválido: versão não suportada');
  const posture = raw.riskPosture ?? 'balanced';
  if (typeof posture !== 'string' || !postures.includes(posture as RiskPosture)) {
    throw new Error(`Postura de risco inválida; use: ${postures.join(', ')}`);
  }
  const verbosity = raw.verbosity ?? 'normal';
  if (typeof verbosity !== 'string' || !verbosities.includes(verbosity as Verbosity)) {
    throw new Error(`Verbosidade inválida; use: ${verbosities.join(', ')}`);
  }
  return {
    version: 1,
    headline: raw.headline === undefined || raw.headline === '' ? undefined : phrase(raw.headline, 'Descrição', 200),
    roles: raw.roles === undefined ? [] : orderedRoles(raw.roles),
    language: raw.language === undefined || raw.language === '' ? undefined : language(raw.language),
    riskPosture: posture as RiskPosture,
    verbosity: verbosity as Verbosity,
    interests: raw.interests === undefined ? [] : interestList(raw.interests)
  };
}

function language(value: unknown): string {
  const tag = phrase(value, 'Idioma', 35);
  if (!/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(tag)) throw new Error('Idioma inválido (ex.: pt-PT, en-GB)');
  return tag;
}

function rootOf(project: string): string {
  const root = resolve(project);
  if (!existsSync(root)) throw new Error(`Projeto inexistente: ${root}`);
  return root;
}

export async function loadOperator(project: string): Promise<Operator> {
  const path = safe(rootOf(project), operatorKey);
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyOperator();
    throw error;
  }
  return normalise(JSON.parse(raw));
}

export async function setOperator(project: string, patch: OperatorPatch): Promise<Operator> {
  const root = rootOf(project);
  if (!Object.values(patch).some(value => value !== undefined)) throw new Error('Nada a alterar no perfil de operador');
  const current = await loadOperator(root);
  const next = normalise({ ...current, ...patch, version: 1 });
  const path = safe(root, operatorKey);
  await mkdir(dirname(path), { recursive: true });
  const temporary = path + `.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(next, null, 2) + '\n', { flag: 'wx' });
    await rename(temporary, path);
  } finally {
    if (existsSync(temporary)) await rm(temporary);
  }
  return next;
}
