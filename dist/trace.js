import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { safe } from './installer.js';
const idPattern = /^REQ[-_]?\d+[A-Za-z0-9-]*$/i;
const idGlobal = /\bREQ[-_]?\d+[A-Za-z0-9-]*\b/gi;
const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', '.agentforge', 'graphify-out', 'coverage']);
const testFile = /(?:[._-](?:test|spec)\.[a-z]+$|^test_.*\.py$)/i;
const testDirs = new Set(['test', 'tests', '__tests__']);
const maxFiles = 5000;
const maxBytes = 1_000_000;
const plain = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
const normalizeId = (id) => id.toUpperCase().replace(/_/g, '-');
function cells(line) {
    return line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
}
async function testReferences(root) {
    const ids = new Set();
    let files = 0;
    async function walk(dir, inTests) {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
            if (entry.isSymbolicLink() || files >= maxFiles)
                continue;
            const path = join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!skipDirs.has(entry.name))
                    await walk(path, inTests || testDirs.has(entry.name));
            }
            else if (entry.isFile() && (inTests || testFile.test(entry.name))) {
                if ((await stat(path)).size > maxBytes)
                    continue;
                files++;
                for (const match of (await readFile(path, 'utf8')).matchAll(idGlobal))
                    ids.add(normalizeId(match[0]));
            }
        }
    }
    await walk(root, false);
    return { ids, files };
}
export async function trace(project, options = {}) {
    const root = resolve(project);
    const requirementsKey = options.requirements ?? '.agentforge/work/requirements.md';
    const planKey = options.plan ?? '.agentforge/work/plan.md';
    const findings = [];
    const raw = await readFile(safe(root, requirementsKey), 'utf8').catch((error) => {
        if (error.code === 'ENOENT')
            throw new Error(`Requisitos em falta: ${requirementsKey}`);
        throw error;
    });
    let header;
    const rows = [];
    for (const line of raw.split(/\r?\n/)) {
        if (!line.trim().startsWith('|'))
            continue;
        const row = cells(line);
        if (row.every(cell => /^:?-+:?$/.test(cell)))
            continue;
        if (plain(row[0]) === 'id') {
            header = row.map(plain);
            continue;
        }
        if (!header || !idPattern.test(row[0]))
            continue;
        const at = (...names) => {
            const index = header.findIndex(name => names.some(wanted => name.startsWith(wanted)));
            return index >= 0 ? row[index] ?? '' : '';
        };
        rows.push({ id: normalizeId(row[0]), priority: plain(at('prioridade', 'priority')),
            acceptance: at('criterio', 'aceitacao', 'acceptance'), approval: at('aprovacao', 'approval') });
    }
    if (!header)
        throw new Error(`${requirementsKey}: tabela de requisitos sem coluna ID`);
    const seen = new Set();
    for (const row of rows) {
        if (seen.has(row.id))
            findings.push({ type: 'duplicate-id', id: row.id, detail: 'Identificador repetido' });
        seen.add(row.id);
    }
    const must = rows.filter(row => /\bmust\b|obrigat/.test(row.priority));
    for (const row of must) {
        if (!row.acceptance || /^(?:-|n\/a|tbd|por definir)$/i.test(row.acceptance)) {
            findings.push({ type: 'no-acceptance', id: row.id, detail: 'Requisito obrigatório sem critério de aceitação' });
        }
        if (!row.approval || /^(?:-|nao|pendente|n\/a)$/.test(plain(row.approval))) {
            findings.push({ type: 'unapproved', id: row.id, detail: 'Requisito obrigatório sem aprovação registada' });
        }
    }
    const known = new Set(rows.map(row => row.id));
    let planned = new Set();
    try {
        planned = new Set([...(await readFile(safe(root, planKey), 'utf8')).matchAll(idGlobal)].map(match => normalizeId(match[0])));
        for (const row of must) {
            if (!planned.has(row.id))
                findings.push({ type: 'not-in-plan', id: row.id, detail: `Não aparece em ${planKey}` });
        }
        for (const id of planned) {
            if (!known.has(id))
                findings.push({ type: 'unknown-in-plan', id, detail: `${planKey} refere um requisito inexistente` });
        }
    }
    catch (error) {
        if (error.code !== 'ENOENT')
            throw error;
        findings.push({ type: 'no-plan', detail: `Plano em falta: ${planKey}` });
    }
    const tests = await testReferences(root);
    if (!tests.files)
        findings.push({ type: 'no-tests', detail: 'Nenhum ficheiro de testes encontrado' });
    else
        for (const row of must) {
            if (!tests.ids.has(row.id))
                findings.push({ type: 'no-test', id: row.id, detail: 'Nenhum teste cita este requisito' });
        }
    const ratio = (covered) => `${must.filter(row => covered.has(row.id)).length}/${must.length}`;
    return {
        requirements: { file: relative(root, safe(root, requirementsKey)), total: rows.length, must: must.length },
        coverage: { plan: ratio(planned), tests: ratio(tests.ids) },
        findings
    };
}
//# sourceMappingURL=trace.js.map