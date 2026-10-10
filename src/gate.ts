import { minimumScore, normalize, score } from './intent.js';

// Porta de entrada dos fluxos: um pedido vago não deve gastar tokens num fluxo inteiro. Em vez de
// adivinhar, devolve o que falta (no máximo quatro perguntas, cada uma com uma recomendação) e só
// deixa avançar quando há objectivo, alvo concreto e os dados que o fluxo escolhido exige.
// Heurística determinística, sem modelo: mede se o pedido é específico, não se é correcto.
export interface GateQuestion { field: string; question: string; recommendation: string }
export interface GateResult {
  ready: boolean;
  score: number;
  workflow: string | null;
  missing: GateQuestion[];
  reasons: string[];
  estimatedTokens: number;
}

const maxQuestions = 4;
// Referência sem antecedente: «isto», «aquilo», «tudo»… sem nada que a concretize.
const vague = /\b(isto|isso|aquilo|aquele|tudo|qualquer coisa|alguma coisa|o que achares|como achares|como preferires|trata disso|faz o necessario|etc|coisas)\b/;
// Verbos que sozinhos não dizem nada («melhora», «corrige»); só são vagos num pedido muito curto.
const vagueVerb = /\b(arranja|melhora|melhorar|optimiza|otimiza|corrige|corrigir|resolve|trata)\b/;
const target = /(?:`[^`]+`|"[^"]{3,}"|https?:\/\/\S+|\b[\w.-]+\/[\w./-]+|\b[\w-]+\.(?:ts|js|tsx|jsx|py|cs|java|go|rs|php|sql|json|ya?ml|md|html|css|xml|csv|pdf)\b|\bv?\d+\.\d+(?:\.\d+)?\b|#\d+|\b[A-Z][a-z]+[A-Z]\w+\b|\b\w+_\w+\b|\b[A-Z]{2,}-\d+\b)/;
const symptom = /\b(erro|erros|falha|falhou|excepcao|exception|stack ?trace|crash|nao funciona|nao abre|nao guarda|lent[ao]|demora|mensagem|quando|ao (?:clicar|guardar|submeter|abrir|iniciar)|intermitente|500|404)\b/;
const place = /(?:\b(?:pagina|ecra|modulo|servico|endpoint|rota|funcao|classe|componente|ficheiro|tabela|api|formulario|botao|job|fila)\b|\b\w+\(\)|\/[\w.-]+)/;
const report = /\b(relatorio|report|scan|checkmarx|sast|xml|csv|json|pdf|exportad\w*|achados|findings)\b/;
const version = /\b(v?\d+\.\d+(?:\.\d+)?|major|minor|patch|proxima versao|versao \d+)\b/;
const browsers = /\b(edge|chrome|firefox|safari|chromium|navegador\w*|browsers?|ie ?11|internet explorer)\b/;
const criterion = /\b(deve|devem|tem de|tem que|criterio|aceita\w*|sem |garantir|para que|objectivo|objetivo|resultado|menos de|em \d+|ate |no maximo|so |apenas|nao (?:alterar|tocar|mudar))\b/;

interface Requirement { field: string; test: (text: string, raw: string) => boolean; question: string; recommendation: string }

const common: Requirement[] = [];
const byWorkflow: Record<string, Requirement[]> = {
  'bug-investigation': [
    { field: 'sintoma', test: t => symptom.test(t), question: 'Qual é o sintoma exacto (mensagem de erro, comportamento observado) e quando acontece?',
      recommendation: 'Cole a mensagem de erro ou os passos que o reproduzem.' },
    { field: 'local', test: (t, r) => place.test(t) || target.test(r), question: 'Onde acontece (página, módulo, endpoint ou ficheiro)?',
      recommendation: 'Indique o ecrã ou o ficheiro; se não souber, diga como o chegou a ver.' }
  ],
  'sast-remediation': [
    { field: 'relatorio', test: (t, r) => report.test(t) || target.test(r), question: 'Onde está o relatório do scan (caminho e formato) e de que ramo ou commit é?',
      recommendation: 'Indique o ficheiro exportado (XML, CSV ou JSON) e o commit analisado.' }
  ],
  'edge-modernization': [
    { field: 'ambito', test: (t, r) => target.test(r) || /\b(aplicacao|projecto|projeto|site|portal|app)\b/.test(t), question: 'Que aplicação ou pasta, e quais as páginas que dependem do modo de compatibilidade?',
      recommendation: 'Indique o projecto e, se souber, a lista de sites do modo IE.' },
    { field: 'navegadores', test: t => browsers.test(t), question: 'Que navegadores têm de ser suportados depois da alteração?',
      recommendation: 'Edge actual (Chromium) e, só se exigido, uma versão mínima de outro.' }
  ],
  'release-closure': [
    { field: 'versao', test: t => version.test(t), question: 'Que versão pretende fechar, ou qual o tipo (major, minor, patch)?',
      recommendation: 'Diga a versão actual e se há alterações incompatíveis; sem elas, minor ou patch.' }
  ],
  'red-team': [
    { field: 'alvo', test: (t, r) => target.test(r) || /\b(agente|prompt|modelo|assistente|aplicacao)\b/.test(t), question: 'Que agente, prompt ou aplicação é o alvo e em que ambiente local corre?',
      recommendation: 'Indique o alvo e confirme que é do projecto e de teste, com dados sintéticos.' }
  ],
  'guardrail-design': [
    { field: 'caso', test: t => /\b(agente|prompt|assistente|modelo|aplicacao|chatbot)\b/.test(t), question: 'Para que agente ou aplicação, e o que nunca pode acontecer?',
      recommendation: 'Diga o caso de uso e a pior consequência aceitável.' }
  ],
  'repository-audit': [], 'production-cleanup': [], 'security-assessment': []
};

const words = (text: string): number => text.split(/\s+/).filter(Boolean).length;

export function assessPrompt(prompt: string, workflow?: string): GateResult {
  const raw = prompt.trim();
  const text = normalize(raw);
  const reasons: string[] = [];
  const missing: GateQuestion[] = [];
  const estimatedTokens = Math.ceil(raw.length / 4);
  if (!raw) {
    return { ready: false, score: 0, workflow: null, estimatedTokens, reasons: ['pedido vazio'],
      missing: [{ field: 'objectivo', question: 'O que pretende obter?', recommendation: 'Diga o resultado e para quê.' }] };
  }

  const ranked = score(raw).filter(item => item.score >= minimumScore).sort((a, b) => b.score - a.score);
  const resolved = workflow ?? ranked[0]?.intent.workflow ?? null;
  let points = 100;

  if (!resolved) {
    points -= 45;
    reasons.push('não identifico um fluxo nem um objectivo');
    missing.push({ field: 'objectivo', question: 'Que resultado pretende (criar, corrigir, analisar, documentar, fechar uma versão…)?',
      recommendation: 'Comece por um verbo e o objecto, por exemplo «corrigir o erro 500 no formulário de pagamento».' });
  }
  const hasTarget = target.test(raw);
  if (words(raw) < 4) {
    points -= 25;
    reasons.push('pedido demasiado curto');
  }
  if ((vague.test(text) || (vagueVerb.test(text) && words(raw) <= 4)) && !hasTarget) {
    points -= 30;
    reasons.push('refere «isto», «tudo» ou verbos vagos sem indicar o alvo');
    missing.push({ field: 'alvo', question: 'A que ficheiro, módulo, página ou sistema se refere?',
      recommendation: 'Indique o caminho ou o nome; se não souber, diga onde o viu.' });
  }
  for (const requirement of [...common, ...(resolved ? byWorkflow[resolved] ?? [] : [])]) {
    if (!requirement.test(text, raw)) {
      points -= 25;
      reasons.push(`falta: ${requirement.field}`);
      missing.push({ field: requirement.field, question: requirement.question, recommendation: requirement.recommendation });
    }
  }
  if (resolved && !criterion.test(text) && words(raw) < 12) {
    points -= 10;
    reasons.push('sem critério de sucesso nem limite');
    if (missing.length < maxQuestions) {
      missing.push({ field: 'criterio', question: 'Como saberá que está feito (critério de sucesso ou limite)?',
        recommendation: 'Uma frase verificável, por exemplo «os testes passam e o relatório novo não tem achados Altos».' });
    }
  }

  // Os campos que o fluxo exige e o alvo em falta bloqueiam; um critério em falta só aconselha.
  const blocking = missing.some(item => item.field !== 'criterio') || points < 60;
  return { ready: !blocking, score: Math.max(0, points), workflow: resolved, estimatedTokens,
    reasons, missing: missing.slice(0, maxQuestions) };
}
