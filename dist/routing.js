import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
const thinking = /\b(architect(?:ure)?|design|brainstorm|research|investigat(?:e|ion)|compar(?:e|ison)|trade.?off|ambig(?:uous|uity)|root cause|audit|security|migration|why|explor(?:e|ation)|arquitetura|desenh[ao]|conceber|investigar|pesquis[ao]|comparar|alternativas?|decis[aã]o|ambiguidade|causa raiz|auditar|seguran[cç]a|migra[cç][aã]o|porqu[eê]|analis[ae])\b/i;
const planning = /^(?:please\s+|por favor\s+)?(?:plan|planeia|planejar|planear)\b|\bplanning\b/i;
const risky = /\b(auth(?:entication|orization)?|credential|secret|payment|prod(?:uction)?|deploy|database|schema|destructive|delete|permission|compliance|privac[yi]|autentica[cç][aã]o|credenciais?|segredos?|pagamentos?|produ[cç][aã]o|implant(?:ar|a[cç][aã]o)|base de dados|eliminar|apagar|permiss[õo]es?|conformidade|privacidade)\b/i;
const simple = /\b(fix typo|format|rename|update (?:a |the )?string|corrigir gralha|formatar|renomear|alterar texto)\b/i;
export function classify(prompt, options = {}) {
    if (!prompt.trim())
        throw new Error('Prompt vazio');
    const reasons = [];
    if (thinking.test(prompt) || planning.test(prompt))
        reasons.push('requer análise, escolha ou descoberta');
    if (options.highRisk || risky.test(prompt))
        reasons.push('área de risco elevado');
    // A postura do operador só pode escalar o raciocínio, nunca baixá-lo: 'exploratory' não desactiva gates.
    if (options.cautious)
        reasons.push('perfil do operador define postura cautelosa');
    const bounded = options.planned && options.approved;
    if (!bounded && !simple.test(prompt))
        reasons.push('plano e aprovação não confirmados');
    if (options.planned && !options.approved)
        reasons.push('plano sem aprovação');
    const complex = reasons.length > 0;
    const tier = complex ? 'thinking' : 'economy';
    const agent = complex ? (options.highRisk || risky.test(prompt) ? 'secops' : 'architect') : 'lead-developer';
    return {
        tier,
        complexity: complex ? 'high' : 'bounded',
        reasons: reasons.length ? reasons : ['tarefa delimitada, de baixo risco'],
        agent,
        subagents: complex ? (agent === 'secops' ? ['reverse-engineer', 'qa'] : ['reverse-engineer']) : ['qa']
    };
}
export async function loadModels(project) {
    let raw;
    try {
        raw = await readFile(join(project, '.agentforge', 'work', 'model-profiles.json'), 'utf8');
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return {};
        throw error;
    }
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('model-profiles.json inválido');
    for (const [cli, models] of Object.entries(value)) {
        if (!['opencode', 'codex', 'claude', 'antigravity'].includes(cli) ||
            !models || typeof models !== 'object' || Array.isArray(models) ||
            Object.entries(models).some(([tier, name]) => !['thinking', 'economy'].includes(tier) ||
                typeof name !== 'string' || !name.trim())) {
            throw new Error(`Perfil de modelos inválido: ${cli}`);
        }
    }
    return value;
}
export async function route(project, cli, prompt, options = {}) {
    const location = await stat(project);
    if (!location.isDirectory())
        throw new Error(`Projeto inválido: ${project}`);
    const decision = classify(prompt, options);
    const models = await loadModels(project);
    const model = models[cli]?.[decision.tier] ?? null;
    return { ...decision, model, modelSelection: model ? 'configured' : 'host-default' };
}
//# sourceMappingURL=routing.js.map