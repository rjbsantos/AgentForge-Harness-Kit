import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, rename, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { profiles, tools, workflows } from './capabilities.js';
import { safe } from './installer.js';
export const maxOperationsBytes = 5_242_880;
function emptyInsights() {
    return {
        totalRuns: 0,
        outcomes: { passed: 0, failed: 0, blocked: 0 },
        validations: { passed: 0, failed: 0, 'not-run': 0 },
        tokens: { reportedRuns: 0, total: 0 },
        cost: { reportedRuns: 0, total: 0 },
        passedEvidence: { verified: 0, changed: 0, missing: 0, none: 0 },
        averageDurationMs: 0,
        byWorkflow: [],
        recurringErrors: []
    };
}
const evidenceDigest = (value) => createHash('sha256').update(value).digest('hex');
async function evidenceState(root, evidence, hash) {
    if (!evidence)
        return 'none';
    try {
        return evidenceDigest(await readFile(safe(root, evidence))) === hash ? 'verified' : 'changed';
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return 'missing';
        throw error;
    }
}
export async function operationInsights(project) {
    const root = resolve(project);
    let raw;
    try {
        raw = await readFile(safe(root, '.agentforge/work/operations.jsonl'), 'utf8');
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return emptyInsights();
        throw error;
    }
    const summary = emptyInsights();
    const workflowsSummary = new Map();
    const errors = new Map();
    let durationTotal = 0;
    for (const [index, line] of raw.split(/\r?\n/).entries()) {
        if (!line.trim())
            continue;
        let value;
        try {
            value = JSON.parse(line);
        }
        catch {
            throw new Error(`Registo de operações inválido na linha ${index + 1}: JSON malformado`);
        }
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`Registo de operações inválido na linha ${index + 1}: esperado objecto`);
        }
        const run = value;
        const durationMs = run.durationMs;
        if (typeof run.role !== 'string' || !Object.hasOwn(profiles, run.role) ||
            typeof run.workflow !== 'string' || !Object.hasOwn(workflows, run.workflow) ||
            !profiles[run.role].workflows.some(name => name === run.workflow) ||
            !['passed', 'failed', 'blocked'].includes(run.result ?? '') ||
            !['passed', 'failed', 'not-run'].includes(run.validation ?? '') ||
            run.result === 'passed' && run.validation !== 'passed' ||
            typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 0 ||
            !Array.isArray(run.toolsUsed) || !run.toolsUsed.every(tool => typeof tool === 'string' && Object.hasOwn(tools, tool)) ||
            run.tokens !== undefined && (!Number.isInteger(run.tokens) || run.tokens < 0) ||
            run.cost !== undefined && (!Number.isFinite(run.cost) || run.cost < 0) ||
            run.retries !== undefined && (!Number.isInteger(run.retries) || run.retries < 0) ||
            run.errorCode !== undefined && (typeof run.errorCode !== 'string' || !/^[a-zA-Z0-9_-]{1,60}$/.test(run.errorCode)) ||
            run.evidence !== undefined && (typeof run.evidence !== 'string' || !run.evidence || run.evidence.length > 300 ||
                typeof run.evidenceHash !== 'string' || !/^[a-f0-9]{64}$/.test(run.evidenceHash))) {
            throw new Error(`Registo de operações inválido na linha ${index + 1}: campos incompatíveis`);
        }
        const result = run.result;
        const validation = run.validation;
        summary.totalRuns++;
        summary.outcomes[result]++;
        summary.validations[validation]++;
        if (result === 'passed')
            summary.passedEvidence[await evidenceState(root, run.evidence, run.evidenceHash)]++;
        durationTotal += durationMs;
        if (run.tokens !== undefined) {
            summary.tokens.reportedRuns++;
            summary.tokens.total += run.tokens;
        }
        if (run.cost !== undefined) {
            summary.cost.reportedRuns++;
            summary.cost.total += run.cost;
        }
        const workflow = workflowsSummary.get(run.workflow) ?? {
            workflow: run.workflow, total: 0, failed: 0, blocked: 0, retries: 0
        };
        workflow.total++;
        if (result === 'failed')
            workflow.failed++;
        if (result === 'blocked')
            workflow.blocked++;
        workflow.retries += run.retries ?? 0;
        workflowsSummary.set(run.workflow, workflow);
        if (run.errorCode) {
            const key = `${run.workflow}\0${run.errorCode}`;
            const error = errors.get(key) ?? {
                workflow: run.workflow, errorCode: run.errorCode, occurrences: 0, lines: []
            };
            error.occurrences++;
            error.lines.push(index + 1);
            errors.set(key, error);
        }
    }
    summary.averageDurationMs = summary.totalRuns
        ? Math.round(durationTotal / summary.totalRuns)
        : 0;
    summary.byWorkflow = [...workflowsSummary.values()].sort((a, b) => a.workflow.localeCompare(b.workflow));
    summary.recurringErrors = [...errors.values()]
        .filter(error => error.occurrences > 1)
        .sort((a, b) => b.occurrences - a.occurrences || a.workflow.localeCompare(b.workflow));
    return summary;
}
export async function recordRun(project, record) {
    const root = resolve(project);
    let evidenceHash;
    if (record.evidence !== undefined) {
        if (!record.evidence.trim() || record.evidence.length > 300)
            throw new Error('Evidência inválida');
        const file = safe(root, record.evidence);
        if (!(await stat(file)).isFile())
            throw new Error(`Evidência não é ficheiro: ${record.evidence}`);
        if (record.result === 'passed' && (await stat(file)).size === 0)
            throw new Error('Evidência vazia: um resultado «passed» exige a saída real da verificação');
        evidenceHash = evidenceDigest(await readFile(file));
    }
    if (!(record.role in profiles) || !profiles[record.role].workflows.some(name => name === record.workflow) ||
        !(record.workflow in workflows) || !['passed', 'failed', 'blocked'].includes(record.result) ||
        !['passed', 'failed', 'not-run'].includes(record.validation) ||
        record.result === 'passed' && record.validation !== 'passed' ||
        !Number.isFinite(record.durationMs) || record.durationMs < 0 ||
        !Array.isArray(record.toolsUsed) || !record.toolsUsed.every(tool => tool in tools) ||
        record.skillsUsed !== undefined && (!Array.isArray(record.skillsUsed) ||
            !record.skillsUsed.every(skill => workflows[record.workflow].skills.includes(skill))) ||
        record.retries !== undefined && (!Number.isInteger(record.retries) || record.retries < 0) ||
        record.tokens !== undefined && (!Number.isInteger(record.tokens) || record.tokens < 0) ||
        record.cost !== undefined && (!Number.isFinite(record.cost) || record.cost < 0) ||
        record.errorCode !== undefined && !/^[a-zA-Z0-9_-]{1,60}$/.test(record.errorCode)) {
        throw new Error('Registo de execução inválido');
    }
    await readFile(safe(root, '.agentforge/work/state.md'), 'utf8');
    const path = safe(root, '.agentforge/work/operations.jsonl');
    await mkdir(dirname(path), { recursive: true });
    // Ao exceder o limite, o histórico passa para um arquivo datado; `insights` lê só o ficheiro actual.
    const size = await stat(path).then(info => info.size, () => 0);
    if (size > maxOperationsBytes) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        await rename(path, safe(root, `.agentforge/work/operations.${stamp}.jsonl`));
    }
    await appendFile(path, JSON.stringify({
        timestamp: new Date().toISOString(),
        ...record,
        evidenceHash,
        agent: profiles[record.role].agent,
        skillsPlanned: workflows[record.workflow].skills
    }) + '\n', 'utf8');
}
//# sourceMappingURL=operations.js.map