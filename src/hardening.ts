import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { safe } from './installer.js';

// Endurecimento opcional para o Claude Code: recusa a leitura de ficheiros de segredos através
// das ferramentas nativas. Só acrescenta regras `permissions.deny` a `.claude/settings.json` e
// regista em `.agentforge/work/hardening.json` as que acrescentou, para as poder remover sem
// tocar nas que o utilizador já tinha. Não cobre `cat .env` por Bash: isso exige uma sandbox.
const settingsKey = '.claude/settings.json';
const stateKey = '.agentforge/work/hardening.json';

export const denyRules: readonly string[] = [
  'Read(./.env)', 'Read(./.env.*)', 'Read(./**/.env)', 'Read(./**/.env.*)',
  'Read(./secrets/**)', 'Read(**/*.pem)', 'Read(**/*.key)',
  'Read(~/.ssh/**)', 'Read(~/.aws/**)', 'Read(~/.npmrc)'
];

type Settings = { permissions?: { deny?: string[]; [key: string]: unknown }; [key: string]: unknown };

async function readSettings(root: string): Promise<Settings> {
  const path = safe(root, settingsKey);
  if (!existsSync(path)) return {};
  const value: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${settingsKey} inválido`);
  const settings = value as Settings;
  const permissions = settings.permissions;
  if (permissions !== undefined && (typeof permissions !== 'object' || permissions === null || Array.isArray(permissions) ||
      (permissions.deny !== undefined && (!Array.isArray(permissions.deny) || permissions.deny.some(rule => typeof rule !== 'string'))))) {
    throw new Error(`${settingsKey}: "permissions" inválido`);
  }
  return settings;
}

async function added(root: string): Promise<string[]> {
  const path = safe(root, stateKey);
  if (!existsSync(path)) return [];
  const value: unknown = JSON.parse(await readFile(path, 'utf8'));
  const list = (value as { added?: unknown })?.added;
  if (!Array.isArray(list) || list.some(rule => typeof rule !== 'string')) throw new Error(`${stateKey} inválido`);
  return list as string[];
}

export async function applyHardening(project: string): Promise<string> {
  const root = resolve(project);
  const settings = await readSettings(root);
  const permissions = settings.permissions ??= {};
  const deny = permissions.deny ??= [];
  const fresh = denyRules.filter(rule => !deny.includes(rule));
  if (!fresh.length) return 'Regras de recusa já presentes.';
  deny.push(...fresh);
  const path = safe(root, settingsKey);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(settings, null, 2) + '\n');
  const state = safe(root, stateKey);
  await mkdir(dirname(state), { recursive: true });
  await writeFile(state, JSON.stringify({ version: 1, added: [...new Set([...await added(root), ...fresh])] }, null, 2) + '\n');
  return `${fresh.length} regra(s) permissions.deny acrescentadas a ${settingsKey} (leitura de .env, chaves e credenciais). Não cobre leituras por Bash.`;
}

export async function removeHardening(project: string): Promise<string> {
  const root = resolve(project);
  const ours = await added(root);
  if (!ours.length) return 'Nenhuma regra acrescentada pelo AgentForge.';
  const settings = await readSettings(root);
  const deny = settings.permissions?.deny ?? [];
  const kept = deny.filter(rule => !ours.includes(rule));
  if (settings.permissions) {
    if (kept.length) settings.permissions.deny = kept; else delete settings.permissions.deny;
    if (!Object.keys(settings.permissions).length) delete settings.permissions;
  }
  const path = safe(root, settingsKey);
  if (Object.keys(settings).length) await writeFile(path, JSON.stringify(settings, null, 2) + '\n');
  else await rm(path, { force: true });
  await rm(safe(root, stateKey), { force: true });
  return `Regras removidas de ${settingsKey}; as que já existiam foram preservadas.`;
}

export async function hardeningApplied(project: string): Promise<boolean> {
  const deny = (await readSettings(resolve(project))).permissions?.deny ?? [];
  return denyRules.every(rule => deny.includes(rule));
}
