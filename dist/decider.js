import { spawn } from 'node:child_process';
import { workflows } from './capabilities.js';
import { assessPrompt } from './gate.js';
// Modelo de decisão opcional (por exemplo um JEV alojado ou um Laya local) por trás da porta de
// entrada. O kit não o inclui nem conhece a API de nenhum: executa o comando que indicares, com um
// contrato mínimo, e só o usa para ser MAIS exigente. A heurística local nunca é relaxada por ele.
//
//   stdin  : {"task":"readiness"|"route","text":"…","question":"…","labels":["…"]}
//   stdout : {"label":"…","probabilities":{"<rótulo>":0.0-1.0,…}}
//
// O texto do pedido é enviado ao comando: se for um serviço alojado, o pedido sai da máquina.
export const readyLabels = ['sim', 'nao'];
const readinessQuestion = 'O pedido tem objectivo, alvo concreto e contexto suficientes para executar sem perguntar mais?';
const defaultThreshold = 0.5;
const routeThreshold = 0.6;
function ask(command, payload, timeoutMs) {
    return new Promise((resolve, reject) => {
        const child = spawn('/bin/sh', ['-c', command], { stdio: ['pipe', 'pipe', 'pipe'] });
        let out = '';
        const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('o decisor excedeu o tempo limite')); }, timeoutMs);
        child.stdout.on('data', chunk => { if (out.length < 65_536)
            out += chunk.toString('utf8'); });
        child.on('error', error => { clearTimeout(timer); reject(error); });
        child.on('close', code => {
            clearTimeout(timer);
            if (code !== 0)
                return reject(new Error(`o decisor terminou com código ${code}`));
            try {
                const value = JSON.parse(out);
                const probabilities = value.probabilities;
                if (typeof value.label !== 'string' || !probabilities || typeof probabilities !== 'object' ||
                    Object.values(probabilities).some(p => typeof p !== 'number' || !Number.isFinite(p) || p < 0 || p > 1)) {
                    throw new Error('formato inválido');
                }
                resolve(value);
            }
            catch {
                reject(new Error('o decisor devolveu uma resposta inválida'));
            }
        });
        child.stdin.on('error', () => { });
        child.stdin.end(JSON.stringify(payload));
    });
}
export async function assessWithDecider(prompt, options = {}) {
    const base = assessPrompt(prompt, options.workflow);
    if (!options.decider)
        return base;
    const timeoutMs = options.timeoutMs ?? 5000;
    const threshold = options.threshold ?? defaultThreshold;
    try {
        let result = base;
        // Sem fluxo identificado pela heurística, deixa o decisor escolher entre os fluxos conhecidos.
        if (!base.workflow && !options.workflow) {
            const labels = Object.keys(workflows);
            const answer = await ask(options.decider, { task: 'route', text: prompt, labels }, timeoutMs);
            const probability = answer.probabilities[answer.label] ?? 0;
            if (labels.includes(answer.label) && probability >= routeThreshold) {
                result = assessPrompt(prompt, answer.label);
                result = { ...result, decisions: { ...result.decisions, workflow: { ...result.decisions.workflow, source: 'decider' } } };
            }
        }
        const answer = await ask(options.decider, { task: 'readiness', text: prompt, question: readinessQuestion, labels: [...readyLabels] }, timeoutMs);
        const yes = answer.probabilities.sim ?? (answer.label === 'sim' ? 1 : 0);
        const decider = { used: true, probability: Math.round(yes * 100) / 100 };
        if (result.ready && yes < threshold) {
            return { ...result, ready: false, decider,
                reasons: [...result.reasons, `o decisor considera o pedido pouco específico (${decider.probability})`],
                missing: [...result.missing, { field: 'contexto', question: 'Que resultado e que alvo concretos pretende? O pedido ainda deixa decisões em aberto.',
                        recommendation: 'Acrescente o ficheiro, a página ou o sistema, e uma frase com o critério de sucesso.' }].slice(0, 4),
                decisions: { ...result.decisions, ready: { type: 'yes-no', value: false, confidence: Math.round((1 - yes) * 100) / 100, source: 'decider', calibrated: false } } };
        }
        return { ...result, decider };
    }
    catch (error) {
        // Um decisor indisponível nunca bloqueia nem relaxa: vale a heurística.
        return { ...base, decider: { used: false, error: error instanceof Error ? error.message : String(error) } };
    }
}
//# sourceMappingURL=decider.js.map