import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { safe } from './installer.js';
import { claudeDenyRules, opencodeReadRules } from './secrets.js';

// Endurecimento opcional: recusa a leitura de ficheiros de segredos através das ferramentas
// nativas. Claude Code: regras `permissions.deny` em `.claude/settings.json`. OpenCode: regras
// `permission.read` em `opencode.json`; o `opencode.json` gerado pelo kit já as inclui, por isso
// isto só actua num `opencode.json` do utilizador (que o instalador preserva). O estado em
// `.agentforge/work/hardening.json` regista o que foi acrescentado, para remover sem tocar no resto.
// Não cobre `cat .env` por Bash: isso exige uma sandbox. O Codex não tem regras equivalentes verificadas.
const claudeKey = '.claude/settings.json';
const opencodeKey = 'opencode.json';
const stateKey = '.agentforge/work/hardening.json';
const manifestKey = '.agentforge/manifest.json';

export const denyRules = claudeDenyRules;

type Json = { [key: string]: unknown };
interface State { version: 1; added: string[]; opencode: string[] }

async function readJson(root: string, key: string): Promise<Json | undefined> {
  const path = safe(root, key);
  if (!existsSync(path)) return undefined;
  const value: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${key} inválido`);
  return value as Json;
}

async function writeJson(root: string, key: string, value: Json): Promise<void> {
  const path = safe(root, key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + '\n');
}

function claudeDeny(settings: Json): string[] | undefined {
  const permissions = settings.permissions;
  if (permissions === undefined) return undefined;
  if (typeof permissions !== 'object' || permissions === null || Array.isArray(permissions)) throw new Error(`${claudeKey}: "permissions" inválido`);
  const deny = (permissions as Json).deny;
  if (deny !== undefined && (!Array.isArray(deny) || deny.some(rule => typeof rule !== 'string'))) {
    throw new Error(`${claudeKey}: "permissions.deny" inválido`);
  }
  return deny as string[] | undefined;
}

async function loadState(root: string): Promise<State> {
  const value = await readJson(root, stateKey);
  if (!value) return { version: 1, added: [], opencode: [] };
  const list = (name: string): string[] => {
    const entry = value[name] ?? [];
    if (!Array.isArray(entry) || entry.some(item => typeof item !== 'string')) throw new Error(`${stateKey} inválido`);
    return entry as string[];
  };
  return { version: 1, added: list('added'), opencode: list('opencode') };
}

async function opencodeManaged(root: string): Promise<boolean> {
  const manifest = await readJson(root, manifestKey);
  return Boolean(manifest && typeof manifest.files === 'object' && manifest.files && opencodeKey in manifest.files);
}

export async function applyHardening(project: string): Promise<string> {
  const root = resolve(project);
  const state = await loadState(root);
  const notes: string[] = [];

  const settings = (await readJson(root, claudeKey)) ?? {};
  const deny = claudeDeny(settings) ?? [];
  const fresh = claudeDenyRules.filter(rule => !deny.includes(rule));
  if (fresh.length) {
    const permissions = (settings.permissions ??= {}) as Json;
    permissions.deny = [...deny, ...fresh];
    await writeJson(root, claudeKey, settings);
    state.added = [...new Set([...state.added, ...fresh])];
    notes.push(`${fresh.length} regra(s) permissions.deny acrescentadas a ${claudeKey}`);
  } else notes.push('Claude Code: regras já presentes');

  const config = await readJson(root, opencodeKey);
  if (!config) notes.push('OpenCode: sem opencode.json (o `install --cli opencode` já o gera com as regras)');
  else if (await opencodeManaged(root)) notes.push('OpenCode: o opencode.json gerado pelo kit já inclui as regras');
  else {
    const permission = config.permission;
    if (permission !== undefined && (typeof permission !== 'object' || permission === null || Array.isArray(permission))) {
      notes.push('OpenCode: "permission" não é um objecto; acrescente à mão as regras `read` de src/secrets.ts');
    } else {
      const holder = ((config.permission ??= {}) as Json);
      const read = holder.read;
      if (read !== undefined && (typeof read !== 'object' || read === null || Array.isArray(read))) {
        notes.push('OpenCode: "permission.read" não é um objecto; acrescente as regras à mão');
      } else {
        const map = ((holder.read ??= {}) as Json);
        const added = Object.keys(opencodeReadRules).filter(key => !(key in map));
        for (const key of added) map[key] = opencodeReadRules[key];
        if (added.length) {
          await writeJson(root, opencodeKey, config);
          state.opencode = [...new Set([...state.opencode, ...added])];
        }
        notes.push(added.length ? `${added.length} regra(s) permission.read acrescentadas a ${opencodeKey}` : 'OpenCode: regras já presentes');
      }
    }
  }
  if (state.added.length || state.opencode.length) await writeJson(root, stateKey, state as unknown as Json);
  return `${notes.join('; ')}. Não cobre leituras por Bash; o Codex não tem regras equivalentes verificadas.`;
}

export async function removeHardening(project: string): Promise<string> {
  const root = resolve(project);
  const state = await loadState(root);
  if (!state.added.length && !state.opencode.length) return 'Nenhuma regra acrescentada pelo AgentForge.';

  const settings = await readJson(root, claudeKey);
  if (settings && state.added.length) {
    const kept = (claudeDeny(settings) ?? []).filter(rule => !state.added.includes(rule));
    const permissions = settings.permissions as Json | undefined;
    if (permissions) {
      if (kept.length) permissions.deny = kept; else delete permissions.deny;
      if (!Object.keys(permissions).length) delete settings.permissions;
    }
    if (Object.keys(settings).length) await writeJson(root, claudeKey, settings);
    else await rm(safe(root, claudeKey), { force: true });
  }

  const config = await readJson(root, opencodeKey);
  if (config && state.opencode.length && !(await opencodeManaged(root))) {
    const holder = config.permission as Json | undefined;
    const read = holder?.read as Json | undefined;
    if (holder && read) {
      for (const key of state.opencode) if (read[key] === opencodeReadRules[key]) delete read[key];
      if (!Object.keys(read).length) delete holder.read;
      if (!Object.keys(holder).length) delete config.permission;
      await writeJson(root, opencodeKey, config);
    }
  }
  await rm(safe(root, stateKey), { force: true });
  return 'Regras acrescentadas pelo AgentForge removidas; as que já existiam foram preservadas.';
}

export async function hardeningApplied(project: string): Promise<boolean> {
  const root = resolve(project);
  const deny = claudeDeny((await readJson(root, claudeKey)) ?? {}) ?? [];
  return claudeDenyRules.every(rule => deny.includes(rule));
}
