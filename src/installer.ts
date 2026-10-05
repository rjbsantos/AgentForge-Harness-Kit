import { createHash } from 'node:crypto';
import { existsSync, lstatSync, statSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { generated, shared, targets, type Target } from './catalog.js';
import { kitVersion } from './version.js';
import { beginning, block, ending, instructions, superseded } from './blocks.js';
export { targets, type Target };

interface Entry { owners: Target[]; hash: string }
// `kit` regista a versão do kit que escreveu os ficheiros; falta em manifestos anteriores à 0.9.1.
interface Manifest { version: 1; kit?: string; files: Record<string, Entry> }
const manifestPath = '.agentforge/manifest.json';
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const mutable = new Set(['.agentforge/work/state.md', '.agentforge/work/context.md',
  '.agentforge/work/lessons.json', '.agentforge/work/operator.json']);

export function safe(root: string, key: string): string {
  if (isAbsolute(key) || key.split(/[\\/]/).includes('..')) throw new Error(`Caminho inválido no manifesto: ${key}`);
  const full = resolve(root, key);
  const rel = relative(root, full);
  if (!rel || rel.startsWith('..' + sep) || rel === '..' || isAbsolute(rel)) throw new Error(`Caminho fora do projeto: ${key}`);
  let current = root;
  for (const part of rel.split(sep)) {
    current = join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink()) throw new Error(`Symlink não permitido: ${current}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  return full;
}

async function text(root: string, key: string): Promise<string | undefined> {
  const path = safe(root, key);
  if (!existsSync(path)) return undefined;
  if (!lstatSync(path).isFile()) throw new Error(`Não é ficheiro: ${path}`);
  return readFile(path, 'utf8');
}

async function load(root: string): Promise<Manifest> {
  const raw = await text(root, manifestPath);
  if (raw === undefined) return { version: 1, files: {} };
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 ||
      !('files' in value) || !value.files || typeof value.files !== 'object' || Array.isArray(value.files)) {
    throw new Error('Manifesto AgentForge inválido');
  }
  const manifest = value as Manifest;
  if (manifest.kit !== undefined && (typeof manifest.kit !== 'string' || !/^\d+\.\d+\.\d+/.test(manifest.kit))) {
    throw new Error('Manifesto AgentForge inválido: versão do kit');
  }
  // `generated()` reconstrói todos os ficheiros de um CLI; calcula-se uma vez por CLI e não por entrada.
  const known = new Map<Target, Record<string, string>>();
  const owned = (owner: Target) => known.get(owner) ?? known.set(owner, generated(owner)).get(owner)!;
  for (const [key, entry] of Object.entries(manifest.files)) {
    safe(root, key);
    if (!entry || !Array.isArray(entry.owners) || !entry.owners.length ||
        entry.owners.some(owner => !targets.includes(owner)) ||
        typeof entry.hash !== 'string' || !/^[a-f0-9]{64}$/.test(entry.hash) ||
        !entry.owners.every(owner => key in owned(owner) || key in shared)) {
      throw new Error(`Entrada inválida no manifesto: ${key}`);
    }
  }
  return manifest;
}

async function save(root: string, manifest: Manifest): Promise<void> {
  const path = safe(root, manifestPath);
  await mkdir(dirname(path), { recursive: true });
  const tmp = path + '.tmp';
  if (existsSync(tmp)) throw new Error(`Ficheiro temporário já existe: ${tmp}`);
  try {
    await writeFile(tmp, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
    await rename(tmp, path);
  } finally {
    if (existsSync(tmp)) await rm(tmp);
  }
}

// Aplica as alterações como unidade: se uma escrita falhar a meio, repõe o conteúdo anterior
// de todos os ficheiros tocados, para que uma nova tentativa não encontre um estado intermédio.
async function transaction(root: string, keys: string[], apply: () => Promise<void>): Promise<void> {
  const before = new Map<string, string | undefined>();
  for (const key of new Set([...keys, manifestPath])) before.set(key, await text(root, key));
  try {
    await apply();
  } catch (error) {
    for (const [key, content] of before) {
      const path = safe(root, key);
      try {
        if (content === undefined) await rm(path, { force: true });
        else await writeFile(path, content, 'utf8');
      } catch { /* melhor esforço: preservar o erro original */ }
    }
    throw error;
  }
}

function checkProject(root: string): void {
  if (!existsSync(root) || !lstatSync(root).isDirectory()) throw new Error(`Projeto inexistente: ${root}`);
}

export async function install(project: string, selected: Target[], dryRun = false): Promise<string[]> {
  const root = resolve(project);
  checkProject(root);
  const manifest = await load(root);
  const next: Manifest = { version: 1, kit: kitVersion, files: structuredClone(manifest.files) };
  const desired: Record<string, { content: string; owners: Target[] }> = {};
  const notices: string[] = [];
  for (const target of selected) {
    for (const [key, content] of Object.entries({ ...shared, ...generated(target) })) {
      if (target === 'opencode' && ['opencode.json', 'tui.json'].includes(key) &&
          !manifest.files[key] && await text(root, key) !== undefined) {
        const setting = key === 'opencode.json'
          ? '"default_agent": "agentforge"'
          : '"theme": "agentforge"';
        notices.push(`${key} existente preservado; para activar a personalização AgentForge, acrescente ${setting} à configuração existente.`);
        continue;
      }
      const slot = desired[key] ??= { content, owners: [] };
      if (slot.content !== content) throw new Error(`Conteúdo incompatível: ${key}`);
      slot.owners.push(target);
    }
  }
  const writes: [string, string][] = [];
  const stagedInstructions = new Map<string, string>();
  const changes: string[] = [...notices];
  for (const [key, { content, owners }] of Object.entries(desired)) {
    const actual = await text(root, key);
    const previous = next.files[key];
    if (actual !== undefined && !previous && !mutable.has(key)) {
      throw new Error(`Ficheiro preexistente, não alterado: ${key}`);
    }
    if (previous && actual !== undefined && digest(actual) !== previous.hash && !mutable.has(key)) {
      throw new Error(`Ficheiro modificado pelo utilizador, não alterado: ${key}`);
    }
    if (previous && actual === undefined && !mutable.has(key)) throw new Error(`Ficheiro gerido removido: ${key}`);
    if (actual !== content && (!mutable.has(key) || actual === undefined)) {
      writes.push([key, content]);
      changes.push(`criar/atualizar ${key}`);
    }
    next.files[key] = { hash: mutable.has(key) && actual !== undefined ? digest(actual) : digest(content),
      owners: [...new Set([...(previous?.owners ?? []), ...owners])] };
  }
  for (const target of selected) {
    if (target === 'antigravity') continue;
    const key = instructions(target);
    const actual = stagedInstructions.get(key) ?? await text(root, key) ?? '';
    if (actual.includes(beginning(target)) || actual.includes(ending(target))) {
      if (actual.includes(block(target))) continue;
      const old = superseded(target).find(candidate => actual.includes(candidate));
      if (!old) throw new Error(`Bloco de instruções alterado: ${key}`);
      stagedInstructions.set(key, actual.replace(old, block(target)));
      changes.push(`atualizar ${key} (${target})`);
    } else {
      stagedInstructions.set(key, actual + block(target));
      changes.push(`ligar ${key} (${target})`);
    }
  }
  writes.push(...stagedInstructions);
  if (manifest.kit !== kitVersion && Object.keys(manifest.files).length) {
    changes.push(`registar versão do kit ${kitVersion}${manifest.kit ? ` (era ${manifest.kit})` : ''}`);
  }
  if (!dryRun) {
    await transaction(root, writes.map(([key]) => key), async () => {
      for (const [key, content] of writes) {
        const path = safe(root, key);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, content, 'utf8');
      }
      await save(root, next);
    });
  }
  return changes.length ? changes : ['Instalação já atualizada.'];
}

export async function remove(project: string, selected: Target[], dryRun = false): Promise<string[]> {
  const root = resolve(project);
  checkProject(root);
  const manifest = await load(root);
  const next: Manifest = { version: 1, kit: manifest.kit, files: structuredClone(manifest.files) };
  const deletes: string[] = [];
  const writes: [string, string][] = [];
  const stagedInstructions = new Map<string, string>();
  for (const [key, entry] of Object.entries(manifest.files)) {
    const owners = entry.owners.filter(owner => !selected.includes(owner));
    if (owners.length === entry.owners.length) continue;
    if (owners.length) {
      next.files[key].owners = owners;
      continue;
    }
    delete next.files[key];
    if (mutable.has(key)) continue;
    const actual = await text(root, key);
    if (actual !== undefined && digest(actual) !== entry.hash) throw new Error(`Ficheiro modificado, não removido: ${key}`);
    if (actual !== undefined) deletes.push(key);
  }
  for (const target of selected) {
    if (target === 'antigravity') continue;
    if (!Object.values(manifest.files).some(entry => entry.owners.includes(target))) continue;
    const key = instructions(target);
    const actual = stagedInstructions.get(key) ?? await text(root, key);
    if (actual === undefined || (!actual.includes(beginning(target)) && !actual.includes(ending(target)))) {
      throw new Error(`Bloco de instruções em falta: ${key} (${target})`);
    }
    const old = [block(target), ...superseded(target)].find(candidate => actual.includes(candidate));
    if (!old) throw new Error(`Bloco de instruções alterado: ${key}`);
    stagedInstructions.set(key, actual.replace(old, ''));
  }
  writes.push(...stagedInstructions);
  if (!dryRun) {
    await transaction(root, [...deletes, ...writes.map(([key]) => key)], async () => {
      for (const key of deletes) await rm(safe(root, key));
      for (const [key, content] of writes) {
        if (content) await writeFile(safe(root, key), content);
        else await rm(safe(root, key));
      }
      if (Object.keys(next.files).length) await save(root, next);
      else if (existsSync(safe(root, manifestPath))) await rm(safe(root, manifestPath));
    });
  }
  return [...deletes.map(key => `remover ${key}`), ...writes.map(([key]) => `desligar ${key}`),
    'Estado, contexto e lições preservados em .agentforge/work/.'];
}

export async function status(project: string): Promise<string[]> {
  const root = resolve(project);
  checkProject(root);
  const manifest = await load(root);
  const active = [...new Set(Object.values(manifest.files).flatMap(entry => entry.owners))];
  const modified: string[] = [];
  for (const [key, entry] of Object.entries(manifest.files)) {
    if (mutable.has(key)) continue;
    const actual = await text(root, key);
    if (actual === undefined || digest(actual) !== entry.hash) modified.push(key);
  }
  for (const target of active) {
    if (target === 'antigravity') continue;
    const key = instructions(target);
    const actual = await text(root, key) ?? '';
    if (![block(target), ...superseded(target)].some(candidate => actual.includes(candidate))) {
      modified.push(`${key} (${target})`);
    }
  }
  return [`CLIs: ${active.join(', ') || 'nenhum'}`, `Ficheiros alterados/ausentes: ${modified.join(', ') || 'nenhum'}`,
    `Kit: ${manifest.kit ?? 'anterior à 0.9.1'} instalado; CLI actual ${kitVersion}`];
}

export async function installedTargets(project: string): Promise<Target[]> {
  const root = resolve(project);
  checkProject(root);
  const manifest = await load(root);
  return targets.filter(target => Object.values(manifest.files).some(entry => entry.owners.includes(target)));
}

// Reaplica a versão instalada do kit aos CLIs já presentes no manifesto, sem exigir --cli.
export async function upgrade(project: string, dryRun = false): Promise<string[]> {
  const active = await installedTargets(project);
  if (!active.length) throw new Error('Nenhum CLI instalado; execute `agentforge install` primeiro');
  return install(project, active, dryRun);
}

export interface Diagnosis { problems: string[]; lines: string[] }

export async function doctor(project: string, integrity: () => Promise<string>): Promise<Diagnosis> {
  const root = resolve(project);
  const problems: string[] = [];
  if (Number(process.versions.node.split('.')[0]) < 20) problems.push(`Node ${process.versions.node} < 20`);
  try {
    checkProject(root);
    const active = await installedTargets(root);
    if (!active.length) problems.push('Nenhum CLI instalado');
    const [, altered, kitLine] = await status(root);
    if (!kitLine.startsWith(`Kit: ${kitVersion} `)) problems.push(`${kitLine}; execute \`agentforge upgrade\``);
    const names = altered.replace('Ficheiros alterados/ausentes: ', '');
    if (names !== 'nenhum') problems.push(`Ficheiros alterados/ausentes: ${names}`);
    if ((await upgrade(root, true))[0] !== 'Instalação já atualizada.' && names === 'nenhum') {
      problems.push('Há actualizações pendentes: execute `agentforge upgrade`');
    }
    if (await integrity() === 'tampered') problems.push('lessons.json alterado fora do CLI (ver `agentforge learn reseal`)');
  } catch (error) {
    problems.push(error instanceof Error ? error.message : String(error));
  }
  // Informativo: o grafo do graphify é opcional e nunca conta como problema.
  const graph = join(root, 'graphify-out', 'graph.json');
  const note = existsSync(graph)
    ? `ℹ graphify: graph.json presente (modificado há ${Math.floor((Date.now() - statSync(graph).mtimeMs) / 86_400_000)} dia(s)); usar forge-graph, e \`/graphify . --update\` se o código mudou`
    : 'ℹ graphify: sem graphify-out/graph.json (opcional; `/graphify .` cria o grafo que a competência forge-graph consulta)';
  return { problems, lines: [...(problems.length ? problems.map(item => `✗ ${item}`) : ['✓ Instalação saudável']), note] };
}
