import { createHash } from 'node:crypto';
import { existsSync, lstatSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { generated, instruction, shared, targets } from './catalog.js';
export { targets };
const manifestPath = '.agentforge/manifest.json';
const digest = (text) => createHash('sha256').update(text).digest('hex');
const beginning = (target) => `<!-- agentforge:${target}:begin -->`;
const ending = (target) => `<!-- agentforge:${target}:end -->`;
const block = (target) => `\n${beginning(target)}\n${instruction(target)}\n${ending(target)}\n`;
const legacyBlock = (target) => `\n${beginning(target)}\nRead \`.agentforge/HARNESS.md\` and \`.agentforge/work/state.md\` before AgentForge pipeline work. Available roles: \`.agentforge/roles/\`. ${target === 'claude' ? 'Use .claude/agents/ for native subagents.' : target === 'opencode' ? 'Use .opencode/agents/ for native subagents.' : 'Use the role descriptions; only delegate if this host offers a supported subagent mechanism.'}\n${ending(target)}\n`;
const previousBlock = (target) => `\n${beginning(target)}\nRead \`.agentforge/HARNESS.md\`, \`.agentforge/MODEL_ROUTING.md\` and \`.agentforge/work/state.md\` before AgentForge pipeline work. Classify each task by complexity and use the configured thinking/economy model only if this host supports explicit selection. Available roles: \`.agentforge/roles/\`. ${target === 'claude' ? 'Use .claude/agents/ for native subagents.' : target === 'opencode' ? 'Use .opencode/agents/ for native subagents.' : 'Use the role descriptions; only delegate if this host offers a supported subagent mechanism.'}\n${ending(target)}\n`;
const priorBlock = (target) => `\n${beginning(target)}\nFor AgentForge harness work, act as AgentForge and read \`.agentforge/HARNESS.md\`, \`.agentforge/MODEL_ROUTING.md\`, \`.agentforge/work/state.md\` and \`.agentforge/work/context.md\`. Use \`.agentforge/CONTEXT_LEARNING.md\` to consolidate verified lessons. Classify each task by complexity and use configured models only if this host supports selection. Roles: \`.agentforge/roles/\`. ${target === 'claude' ? 'Optional main agent: claude --agent agentforge; native subagents: .claude/agents/.' : target === 'opencode' ? 'Choose primary agent agentforge; subagents: .opencode/agents/.' : 'Use role descriptions; delegate only if supported by the host.'}\n${ending(target)}\n`;
const superseded = (target) => [priorBlock(target), previousBlock(target), legacyBlock(target)];
const instructions = (target) => target === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
const mutable = new Set(['.agentforge/work/state.md', '.agentforge/work/context.md',
    '.agentforge/work/lessons.json', '.agentforge/work/operator.json']);
export function safe(root, key) {
    if (isAbsolute(key) || key.split(/[\\/]/).includes('..'))
        throw new Error(`Caminho inválido no manifesto: ${key}`);
    const full = resolve(root, key);
    const rel = relative(root, full);
    if (!rel || rel.startsWith('..' + sep) || rel === '..' || isAbsolute(rel))
        throw new Error(`Caminho fora do projeto: ${key}`);
    let current = root;
    for (const part of rel.split(sep)) {
        current = join(current, part);
        try {
            if (lstatSync(current).isSymbolicLink())
                throw new Error(`Symlink não permitido: ${current}`);
        }
        catch (error) {
            if (error.code !== 'ENOENT')
                throw error;
        }
    }
    return full;
}
async function text(root, key) {
    const path = safe(root, key);
    if (!existsSync(path))
        return undefined;
    if (!lstatSync(path).isFile())
        throw new Error(`Não é ficheiro: ${path}`);
    return readFile(path, 'utf8');
}
async function load(root) {
    const raw = await text(root, manifestPath);
    if (raw === undefined)
        return { version: 1, files: {} };
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 ||
        !('files' in value) || !value.files || typeof value.files !== 'object' || Array.isArray(value.files)) {
        throw new Error('Manifesto AgentForge inválido');
    }
    const manifest = value;
    for (const [key, entry] of Object.entries(manifest.files)) {
        safe(root, key);
        if (!entry || !Array.isArray(entry.owners) || !entry.owners.length ||
            entry.owners.some(owner => !targets.includes(owner)) ||
            typeof entry.hash !== 'string' || !/^[a-f0-9]{64}$/.test(entry.hash) ||
            !entry.owners.every(owner => key in generated(owner) || key in shared)) {
            throw new Error(`Entrada inválida no manifesto: ${key}`);
        }
    }
    return manifest;
}
async function save(root, manifest) {
    const path = safe(root, manifestPath);
    await mkdir(dirname(path), { recursive: true });
    const tmp = path + '.tmp';
    if (existsSync(tmp))
        throw new Error(`Ficheiro temporário já existe: ${tmp}`);
    try {
        await writeFile(tmp, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
        await rename(tmp, path);
    }
    finally {
        if (existsSync(tmp))
            await rm(tmp);
    }
}
function checkProject(root) {
    if (!existsSync(root) || !lstatSync(root).isDirectory())
        throw new Error(`Projeto inexistente: ${root}`);
}
export async function install(project, selected, dryRun = false) {
    const root = resolve(project);
    checkProject(root);
    const manifest = await load(root);
    const next = { version: 1, files: structuredClone(manifest.files) };
    const desired = {};
    const notices = [];
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
            if (slot.content !== content)
                throw new Error(`Conteúdo incompatível: ${key}`);
            slot.owners.push(target);
        }
    }
    const writes = [];
    const stagedInstructions = new Map();
    const changes = [...notices];
    for (const [key, { content, owners }] of Object.entries(desired)) {
        const actual = await text(root, key);
        const previous = next.files[key];
        if (actual !== undefined && !previous && !mutable.has(key)) {
            throw new Error(`Ficheiro preexistente, não alterado: ${key}`);
        }
        if (previous && actual !== undefined && digest(actual) !== previous.hash && !mutable.has(key)) {
            throw new Error(`Ficheiro modificado pelo utilizador, não alterado: ${key}`);
        }
        if (previous && actual === undefined && !mutable.has(key))
            throw new Error(`Ficheiro gerido removido: ${key}`);
        if (actual !== content && (!mutable.has(key) || actual === undefined)) {
            writes.push([key, content]);
            changes.push(`criar/atualizar ${key}`);
        }
        next.files[key] = { hash: mutable.has(key) && actual !== undefined ? digest(actual) : digest(content),
            owners: [...new Set([...(previous?.owners ?? []), ...owners])] };
    }
    for (const target of selected) {
        if (target === 'antigravity')
            continue;
        const key = instructions(target);
        const actual = stagedInstructions.get(key) ?? await text(root, key) ?? '';
        if (actual.includes(beginning(target)) || actual.includes(ending(target))) {
            if (actual.includes(block(target)))
                continue;
            const old = superseded(target).find(candidate => actual.includes(candidate));
            if (!old)
                throw new Error(`Bloco de instruções alterado: ${key}`);
            stagedInstructions.set(key, actual.replace(old, block(target)));
            changes.push(`atualizar ${key} (${target})`);
        }
        else {
            stagedInstructions.set(key, actual + block(target));
            changes.push(`ligar ${key} (${target})`);
        }
    }
    writes.push(...stagedInstructions);
    if (!dryRun) {
        for (const [key, content] of writes) {
            const path = safe(root, key);
            await mkdir(dirname(path), { recursive: true });
            await writeFile(path, content, 'utf8');
        }
        await save(root, next);
    }
    return changes.length ? changes : ['Instalação já atualizada.'];
}
export async function remove(project, selected, dryRun = false) {
    const root = resolve(project);
    checkProject(root);
    const manifest = await load(root);
    const next = { version: 1, files: structuredClone(manifest.files) };
    const deletes = [];
    const writes = [];
    const stagedInstructions = new Map();
    for (const [key, entry] of Object.entries(manifest.files)) {
        const owners = entry.owners.filter(owner => !selected.includes(owner));
        if (owners.length === entry.owners.length)
            continue;
        if (owners.length) {
            next.files[key].owners = owners;
            continue;
        }
        delete next.files[key];
        if (mutable.has(key))
            continue;
        const actual = await text(root, key);
        if (actual !== undefined && digest(actual) !== entry.hash)
            throw new Error(`Ficheiro modificado, não removido: ${key}`);
        if (actual !== undefined)
            deletes.push(key);
    }
    for (const target of selected) {
        if (target === 'antigravity')
            continue;
        if (!Object.values(manifest.files).some(entry => entry.owners.includes(target)))
            continue;
        const key = instructions(target);
        const actual = stagedInstructions.get(key) ?? await text(root, key);
        if (actual === undefined || (!actual.includes(beginning(target)) && !actual.includes(ending(target)))) {
            throw new Error(`Bloco de instruções em falta: ${key} (${target})`);
        }
        const old = [block(target), ...superseded(target)].find(candidate => actual.includes(candidate));
        if (!old)
            throw new Error(`Bloco de instruções alterado: ${key}`);
        stagedInstructions.set(key, actual.replace(old, ''));
    }
    writes.push(...stagedInstructions);
    if (!dryRun) {
        for (const key of deletes)
            await rm(safe(root, key));
        for (const [key, content] of writes) {
            if (content)
                await writeFile(safe(root, key), content);
            else
                await rm(safe(root, key));
        }
        if (Object.keys(next.files).length)
            await save(root, next);
        else if (existsSync(safe(root, manifestPath)))
            await rm(safe(root, manifestPath));
    }
    return [...deletes.map(key => `remover ${key}`), ...writes.map(([key]) => `desligar ${key}`),
        'Estado, contexto e lições preservados em .agentforge/work/.'];
}
export async function status(project) {
    const root = resolve(project);
    checkProject(root);
    const manifest = await load(root);
    const active = [...new Set(Object.values(manifest.files).flatMap(entry => entry.owners))];
    const modified = [];
    for (const [key, entry] of Object.entries(manifest.files)) {
        if (mutable.has(key))
            continue;
        const actual = await text(root, key);
        if (actual === undefined || digest(actual) !== entry.hash)
            modified.push(key);
    }
    for (const target of active) {
        if (target === 'antigravity')
            continue;
        const key = instructions(target);
        const actual = await text(root, key) ?? '';
        if (![block(target), ...superseded(target)].some(candidate => actual.includes(candidate))) {
            modified.push(`${key} (${target})`);
        }
    }
    return [`CLIs: ${active.join(', ') || 'nenhum'}`, `Ficheiros alterados/ausentes: ${modified.join(', ') || 'nenhum'}`];
}
//# sourceMappingURL=installer.js.map