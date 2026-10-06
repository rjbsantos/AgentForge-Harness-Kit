import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { beginning, ending } from './blocks.js';
import { safe } from './installer.js';
import { targets } from './target.js';
// Mede o que o harness põe em contexto sem ninguém ver ("tokens fantasma"): instruções de arranque,
// texto do utilizador nos ficheiros de instruções e crescimento de estado, contexto e registos.
// A estimativa é a mesma do comando `context`: caracteres ÷ 4, não uma contagem exacta de um modelo.
export const startupBudgetTokens = 1500;
const estimate = (chars) => Math.ceil(chars / 4);
// Só o essencial é lido no arranque; o menu, o guia, o encaminhamento, o contexto e o perfil carregam-se a pedido.
const startupFiles = ['.agentforge/HARNESS.md', '.agentforge/work/state.md'];
const limits = { state: 600, context: 1200, userInstructions: 2000, log: 200_000 };
async function size(root, key) {
    const path = safe(root, key);
    if (!existsSync(path))
        return undefined;
    const text = await readFile(path, 'utf8');
    return { chars: text.length, bytes: (await stat(path)).size };
}
async function listingTokens(root, dir, nested) {
    const base = safe(root, dir);
    if (!existsSync(base))
        return 0;
    let chars = 0;
    for (const entry of await readdir(base, { withFileTypes: true })) {
        const file = nested ? (entry.isDirectory() ? join(base, entry.name, 'SKILL.md') : '') : (entry.isFile() && entry.name.endsWith('.md') ? join(base, entry.name) : '');
        if (!file || !existsSync(file))
            continue;
        const header = /^---\n([\s\S]*?)\n---/.exec(await readFile(file, 'utf8'))?.[1] ?? '';
        const name = /^name: (.*)$/m.exec(header)?.[1] ?? entry.name.replace(/\.md$/, '');
        chars += name.length + (/^description: (.*)$/m.exec(header)?.[1] ?? '').length + 4;
    }
    return estimate(chars);
}
export async function tokenReport(project) {
    const root = resolve(project);
    if (!existsSync(root))
        throw new Error(`Projeto inexistente: ${root}`);
    const findings = [];
    const files = [];
    for (const file of startupFiles) {
        const found = await size(root, file);
        if (found)
            files.push({ file, tokens: estimate(found.chars) });
    }
    const instructions = [];
    for (const file of ['CLAUDE.md', 'AGENTS.md']) {
        const path = safe(root, file);
        if (!existsSync(path))
            continue;
        let text = await readFile(path, 'utf8');
        let managed = 0;
        for (const target of targets) {
            const open = text.indexOf(beginning(target));
            const close = text.indexOf(ending(target));
            if (open !== -1 && close > open) {
                const end = close + ending(target).length;
                managed += end - open;
                text = text.slice(0, open) + text.slice(end);
            }
        }
        const entry = { file, managedTokens: estimate(managed), userTokens: estimate(text.length) };
        instructions.push(entry);
        files.push({ file: `${file} (bloco AgentForge)`, tokens: entry.managedTokens });
        if (entry.userTokens > limits.userInstructions) {
            findings.push(`${file}: ~${entry.userTokens} tokens de instruções do utilizador, lidas em cada sessão (limite sugerido ${limits.userInstructions}); mova o que for raro para ficheiros lidos a pedido`);
        }
    }
    const total = files.reduce((sum, item) => sum + item.tokens, 0);
    if (total > startupBudgetTokens)
        findings.push(`Arranque com ~${total} tokens, acima do orçamento de ${startupBudgetTokens}`);
    const work = [];
    for (const [file, key, limit] of [['state.md', '.agentforge/work/state.md', limits.state],
        ['context.md', '.agentforge/work/context.md', limits.context]]) {
        const found = await size(root, key);
        if (!found)
            continue;
        work.push({ file, tokens: estimate(found.chars) });
        if (estimate(found.chars) > limit)
            findings.push(`${file}: ~${estimate(found.chars)} tokens (limite sugerido ${limit}); compacte com \`agentforge context save\``);
    }
    for (const [file, key] of [['operations.jsonl', '.agentforge/work/operations.jsonl'], ['events.jsonl', '.agentforge/work/events.jsonl'],
        ['lessons.json', '.agentforge/work/lessons.json']]) {
        const found = await size(root, key);
        if (!found)
            continue;
        work.push({ file, bytes: found.bytes });
        if (found.bytes > limits.log && file !== 'lessons.json') {
            findings.push(`${file}: ${found.bytes} bytes; não é lido no arranque, mas \`insights\` percorre-o inteiro`);
        }
    }
    const skillsTokens = await listingTokens(root, '.claude/skills', true);
    const agentsTokens = await listingTokens(root, '.claude/agents', false);
    const commandsTokens = await listingTokens(root, '.claude/commands', false);
    const nativeListings = { skills: skillsTokens, agents: agentsTokens, commands: commandsTokens, total: skillsTokens + agentsTokens + commandsTokens };
    return { startup: { files, total, budget: startupBudgetTokens }, nativeListings, instructions, work, findings, estimate: 'chars-divided-by-4' };
}
//# sourceMappingURL=tokens.js.map