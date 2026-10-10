import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { userInfo } from 'node:os';
import { dirname, resolve } from 'node:path';
import { safe } from './installer.js';
// Registo de auditoria das acções que alteram o que o agente passa a tratar como confiável
// (lições, selo). Cada linha inclui o hash da anterior: apagar ou editar uma entrada a meio
// quebra a cadeia, que `verifyAudit` detecta. Não guarda texto de lições nem segredos.
const auditKey = '.agentforge/work/audit.jsonl';
const sha = (value) => createHash('sha256').update(value).digest('hex');
const genesis = '0'.repeat(64);
function actor() {
    try {
        return userInfo().username;
    }
    catch {
        return 'desconhecido';
    }
}
export async function audit(project, action, detail = {}) {
    const root = resolve(project);
    const path = safe(root, auditKey);
    let previous = genesis;
    try {
        const lines = (await readFile(path, 'utf8')).split('\n').filter(Boolean);
        if (lines.length)
            previous = sha(lines[lines.length - 1]);
    }
    catch (error) {
        if (error.code !== 'ENOENT')
            throw error;
    }
    await mkdir(dirname(path), { recursive: true });
    const entry = { timestamp: new Date().toISOString(), actor: actor(), action, ...detail, prev: previous };
    await appendFile(path, JSON.stringify(entry) + '\n', 'utf8');
}
export async function verifyAudit(project) {
    const path = safe(resolve(project), auditKey);
    let raw;
    try {
        raw = await readFile(path, 'utf8');
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return { entries: 0, ok: true };
        throw error;
    }
    const lines = raw.split('\n').filter(Boolean);
    let previous = genesis;
    for (const [index, line] of lines.entries()) {
        let entry;
        try {
            entry = JSON.parse(line);
        }
        catch {
            return { entries: lines.length, ok: false, brokenAt: index + 1 };
        }
        if (entry.prev !== previous)
            return { entries: lines.length, ok: false, brokenAt: index + 1 };
        previous = sha(line);
    }
    return { entries: lines.length, ok: true };
}
//# sourceMappingURL=audit.js.map