import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { safe } from './installer.js';
// Agentes que `classify` pode devolver, por nível. O grafo do catálogo usa esta tabela; um teste
// garante que `classify` nunca devolve um agente fora dela.
export const routingTable = {
    thinking: ['architect', 'secops', 'reverse-engineer'],
    economy: ['lead-developer', 'qa']
};
const thinking = /\b(architect(?:ure)?|design|brainstorm|research|investigat(?:e|ion)|compar(?:e|ison)|trade.?off|ambig(?:uous|uity)|root cause|audit|security|migration|why|explor(?:e|ation)|arquitetura|desenh[ao]|conceber|investigar|pesquis[ao]|comparar|alternativas?|decis[aã]o|ambiguidade|causa raiz|auditar|seguran[cç]a|migra[cç][aã]o|porqu[eê]|analis[ae])\b/i;
const planning = /^(?:please\s+|por favor\s+)?(?:plan|planeia|planejar|planear)\b|\bplanning\b/i;
const risky = /\b(auth(?:entication|orization)?|credentials?|secrets?|payments?|prod(?:uction)?|deploy|database|schema|destructive|delete|permission|compliance|privac[yi]|autentica[cç][aã]o|credenciais?|segredos?|pagamentos?|produ[cç][aã]o|implant(?:ar|a[cç][aã]o)|base de dados|eliminar|apagar|permiss[õo]es?|conformidade|privacidade)\b/i;
// Um pedido só de leitura (explicar, listar, mostrar…) que não contém verbos que alterem estado deixa de
// escalar por palavras como `auth` ou `database`. Segredos, credenciais e pagamentos escalam sempre:
// mostrá-los já é uma exposição. Na dúvida, a classificação mantém-se conservadora.
const readOnly = /^\s*(?:please\s+|por favor\s+)?(?:explain|describe|summari[sz]e|list|show|read|what|how does|how do|where|which|explica|descreve|resume|lista|mostra|l[eê]|o que|como funciona|onde|qual)\b/i;
const mutating = /\b(delete|remove|drop|deploy|update|change|modify|alter|write|implement|run|execute|rotate|migrate|create|fix|apagar|eliminar|remover|alterar|actualizar|atualizar|implementar|executar|rodar|migrar|escrever|criar|corrigir|borra|borrar|elimina|suprime|supprime|supprimer|cambia|cambiar|modifica|reset|truncate|grant|disable|push|publish|desactivar|desativar)\b/i;
const sensitive = /\b(credentials?|secrets?|payments?|credenciais?|segredos?|pagamentos?|passwords?|passphrase|api[ -]?keys?|tokens?|private key|contrase[nñ]as?|credenciales|palavras?-passe|senhas?|mot de passe)\b/i;
// Termos de risco acrescentados depois de uma medição com pedidos em inglês, espanhol e francês e com
// comandos destrutivos (um `DROP TABLE` ou `rm -rf` aprovado caía em «economy»). Conservador de propósito.
const riskyMore = /\b(?:passwords?|passphrase|api[ -]?keys?|tokens?|private key|ssh|sudo|root (?:user|account|password|access)|admin(?:istrator)?|privileges?|firewall|truncate|chmod|chown|force[- ]push|push|release|publish|exfiltrat\w*|palavras?-passe|senhas?|chaves? de api|publicar|lan[cç]ar|base de datos|producci[oó]n|credenciales|contrase[nñ]as?|borra(?:r)?|elimina(?:r)?|suprime|supprime(?:r)?|base de donn[eé]es|mot de passe|identifiants?)\b|--force\b|\brm\s+-\w*r\w*f|\bdrop\s+(?:table|database|schema)\b/i;
const riskyAny = (prompt) => risky.test(prompt) || riskyMore.test(prompt);
const isRisky = (prompt) => riskyAny(prompt) && (sensitive.test(prompt) || !readOnly.test(prompt) || mutating.test(prompt));
const simple = /\b(fix typo|format|rename|update (?:a |the )?string|corrigir gralha|formatar|renomear|alterar texto)\b/i;
export function classify(prompt, options = {}) {
    if (!prompt.trim())
        throw new Error('Prompt vazio');
    const reasons = [];
    if (thinking.test(prompt) || planning.test(prompt))
        reasons.push('requer análise, escolha ou descoberta');
    if (options.highRisk || isRisky(prompt))
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
    const agent = complex ? (options.highRisk || isRisky(prompt) ? 'secops' : 'architect') : 'lead-developer';
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
        raw = await readFile(safe(resolve(project), '.agentforge/work/model-profiles.json'), 'utf8');
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