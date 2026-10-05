import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { safe } from './installer.js';

// Observabilidade opcional para o Claude Code. Regista só o instante e o nome da ferramenta:
// nunca argumentos, resultados, caminhos nem texto de conversas. Só existe se o utilizador
// executar `agentforge hooks install`; o resto do kit funciona sem isto.
const settingsKey = '.claude/settings.json';
const eventsKey = '.agentforge/work/events.jsonl';
const marker = 'agentforge hook-event';

interface HookEntry { matcher?: string; hooks?: { type?: string; command?: string }[] }
type Settings = { hooks?: Record<string, HookEntry[]>; [key: string]: unknown };

async function readSettings(root: string): Promise<Settings> {
  const path = safe(root, settingsKey);
  if (!existsSync(path)) return {};
  const value: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${settingsKey} inválido`);
  const settings = value as Settings;
  if (settings.hooks !== undefined && (typeof settings.hooks !== 'object' || settings.hooks === null ||
      Array.isArray(settings.hooks))) throw new Error(`${settingsKey}: "hooks" inválido`);
  return settings;
}

const ours = (entry: HookEntry) => entry.hooks?.some(hook => hook.command?.includes(marker)) ?? false;

export async function installHook(project: string): Promise<string> {
  const root = resolve(project);
  const settings = await readSettings(root);
  const hooks = settings.hooks ??= {};
  const list = hooks.PostToolUse ??= [];
  if (list.some(ours)) return 'Hook já instalado.';
  list.push({ matcher: '*', hooks: [{ type: 'command', command: `${marker} --project "$CLAUDE_PROJECT_DIR"` }] });
  const path = safe(root, settingsKey);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(settings, null, 2) + '\n');
  return `Hook PostToolUse acrescentado a ${settingsKey}. Requer o comando agentforge no PATH. Regista apenas hora e nome da ferramenta em ${eventsKey}.`;
}

export async function removeHook(project: string): Promise<string> {
  const root = resolve(project);
  const settings = await readSettings(root);
  const list = settings.hooks?.PostToolUse;
  if (!list?.some(ours)) return 'Hook não instalado.';
  settings.hooks!.PostToolUse = list.filter(entry => !ours(entry));
  if (!settings.hooks!.PostToolUse.length) delete settings.hooks!.PostToolUse;
  if (!Object.keys(settings.hooks!).length) delete settings.hooks;
  const path = safe(root, settingsKey);
  if (Object.keys(settings).length) await writeFile(path, JSON.stringify(settings, null, 2) + '\n');
  else await rm(path);
  return `Hook removido de ${settingsKey}. ${eventsKey} foi preservado.`;
}

// Chamado pelo hook: lê o JSON do evento em stdin e guarda apenas campos não sensíveis.
export async function recordEvent(project: string, stdin: string): Promise<void> {
  const root = resolve(project);
  let tool = 'unknown';
  try {
    const payload: unknown = JSON.parse(stdin);
    const name = (payload as { tool_name?: unknown })?.tool_name;
    if (typeof name === 'string' && /^[\w.:-]{1,80}$/.test(name)) tool = name;
  } catch { /* um evento ilegível não deve falhar a sessão do utilizador */ }
  const path = safe(root, eventsKey);
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, JSON.stringify({ timestamp: new Date().toISOString(), tool }) + '\n');
}

export async function eventSummary(project: string): Promise<{ total: number; byTool: Record<string, number> }> {
  const path = safe(resolve(project), eventsKey);
  const byTool: Record<string, number> = {};
  let total = 0;
  if (existsSync(path)) {
    for (const line of (await readFile(path, 'utf8')).split('\n')) {
      if (!line.trim()) continue;
      try {
        const tool = (JSON.parse(line) as { tool?: unknown }).tool;
        if (typeof tool === 'string') { byTool[tool] = (byTool[tool] ?? 0) + 1; total++; }
      } catch { /* linhas truncadas são ignoradas */ }
    }
  }
  return { total, byTool };
}
