import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { safe } from './installer.js';
// Observabilidade opcional para o Claude Code. Regista só o instante e o nome da ferramenta:
// nunca argumentos, resultados, caminhos nem texto de conversas. Só existe se o utilizador
// executar `agentforge hooks install`; o resto do kit funciona sem isto.
const settingsKey = '.claude/settings.json';
const eventsKey = '.agentforge/work/events.jsonl';
const marker = 'agentforge hook-event';
const expectedCommand = `${marker} --project "$CLAUDE_PROJECT_DIR"`;
const maxEventsBytes = 1_048_576;
export const maxHookInputBytes = 65_536;
async function readSettings(root) {
    const path = safe(root, settingsKey);
    if (!existsSync(path))
        return {};
    const value = JSON.parse(await readFile(path, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error(`${settingsKey} inválido`);
    const settings = value;
    if (settings.hooks !== undefined && (typeof settings.hooks !== 'object' || settings.hooks === null ||
        Array.isArray(settings.hooks)))
        throw new Error(`${settingsKey}: "hooks" inválido`);
    return settings;
}
// Só conta como «nosso» o comando exacto que o kit escreve: um comando que apenas contenha a marca
// (por exemplo `agentforge hook-event; curl …`) é uma alteração, não uma instalação válida.
const ours = (entry) => entry.hooks?.some(hook => hook.command === expectedCommand) ?? false;
const tampered = (entry) => entry.hooks?.some(hook => hook.command?.includes(marker) && hook.command !== expectedCommand) ?? false;
export async function hookStatus(project) {
    const list = (await readSettings(resolve(project))).hooks?.PostToolUse ?? [];
    if (list.some(tampered))
        return 'altered';
    return list.some(ours) ? 'ok' : 'absent';
}
export async function installHook(project) {
    const root = resolve(project);
    const settings = await readSettings(root);
    const hooks = settings.hooks ??= {};
    const list = hooks.PostToolUse ??= [];
    if (list.some(tampered))
        throw new Error(`${settingsKey}: o hook do AgentForge foi alterado; reveja-o e remova-o à mão antes de reinstalar`);
    if (list.some(ours))
        return 'Hook já instalado.';
    list.push({ matcher: '*', hooks: [{ type: 'command', command: expectedCommand }] });
    const path = safe(root, settingsKey);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(settings, null, 2) + '\n');
    return `Hook PostToolUse acrescentado a ${settingsKey}. Requer o comando agentforge no PATH. Regista apenas hora e nome da ferramenta em ${eventsKey}.`;
}
export async function removeHook(project) {
    const root = resolve(project);
    const settings = await readSettings(root);
    const list = settings.hooks?.PostToolUse;
    if (!list?.some(ours))
        return 'Hook não instalado.';
    settings.hooks.PostToolUse = list.filter(entry => !ours(entry));
    if (!settings.hooks.PostToolUse.length)
        delete settings.hooks.PostToolUse;
    if (!Object.keys(settings.hooks).length)
        delete settings.hooks;
    const path = safe(root, settingsKey);
    if (Object.keys(settings).length)
        await writeFile(path, JSON.stringify(settings, null, 2) + '\n');
    else
        await rm(path);
    return `Hook removido de ${settingsKey}. ${eventsKey} foi preservado.`;
}
// Chamado pelo hook: lê o JSON do evento em stdin e guarda apenas campos não sensíveis.
export async function recordEvent(project, stdin) {
    const root = resolve(project);
    let tool = 'unknown';
    try {
        const payload = JSON.parse(stdin);
        const name = payload?.tool_name;
        if (typeof name === 'string' && /^[\w.:-]{1,80}$/.test(name))
            tool = name;
    }
    catch { /* um evento ilegível não deve falhar a sessão do utilizador */ }
    const path = safe(root, eventsKey);
    await mkdir(dirname(path), { recursive: true });
    // Rotação simples: o ficheiro actual passa a `events.1.jsonl` (substitui o anterior) ao exceder o limite.
    if (existsSync(path) && (await stat(path)).size > maxEventsBytes) {
        await rename(path, safe(root, '.agentforge/work/events.1.jsonl'));
    }
    await appendFile(path, JSON.stringify({ timestamp: new Date().toISOString(), tool }) + '\n');
}
export async function eventSummary(project) {
    const path = safe(resolve(project), eventsKey);
    const byTool = {};
    let total = 0;
    if (existsSync(path)) {
        for (const line of (await readFile(path, 'utf8')).split('\n')) {
            if (!line.trim())
                continue;
            try {
                const tool = JSON.parse(line).tool;
                if (typeof tool === 'string') {
                    byTool[tool] = (byTool[tool] ?? 0) + 1;
                    total++;
                }
            }
            catch { /* linhas truncadas são ignoradas */ }
        }
    }
    return { total, byTool };
}
//# sourceMappingURL=hooks.js.map