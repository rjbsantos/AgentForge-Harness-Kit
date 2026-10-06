import { type Profile } from './capabilities.js';

// Encaminhamento por pontuação de sinais. Cada fluxo tem sinais (expressão, peso); a pontuação é a soma dos
// pesos dos sinais presentes no pedido (cada sinal conta uma só vez). O texto é comparado em minúsculas e sem
// acentos, por isso as expressões escrevem-se sem acentos. Pesos: 5-6 = termo que quase só pertence a este
// fluxo; 3-4 = indicação forte; 1-2 = contexto que só desempata. Um fluxo precisa de `minimumScore` para
// ser considerado, e quando outro perfil fica a menos de `ambiguityMargin` pontos do melhor, o pedido é
// ambíguo (resolve-se pela preferência do operador ou com --role). Os pedidos reais e as medições estão em
// src/tests/intent-data.ts e src/tests/intent.test.ts.
export const minimumScore = 3;
export const ambiguityMargin = 1;

type Signal = readonly [pattern: RegExp, weight: number];
export interface Intent { workflow: string; role: Profile; signals: Signal[] }

const intent = (workflow: string, role: Profile, ...signals: Signal[]): Intent => ({ workflow, role, signals });
const s = (pattern: RegExp, weight: number): Signal => [pattern, weight];

export const normalize = (text: string): string =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const buildVerbs = /\b(cria|criar|desenvolv\w*|constro\w*|construir|implement\w*|faz uma?|preciso de uma?|quero (?:um|uma)|create|develop|build an?)\b/;
const softwareObjects = /\b(app|apps|aplicac\w*|api|apis|webapp|website|portal|plataforma|backend|microservic\w*|software)\b/;
// Verbo de construção seguido de um objecto de software («criar uma app», «preciso de uma aplicação»).
const buildAnObject = /\b(cria|criar|desenvolv\w*|constro\w*|construir|implement\w*|preciso de uma?|quero (?:(?:criar|desenvolver|construir) )?(?:um|uma))\b[^.?!]{0,40}\b(app|apps|aplicac\w*|api|apis|webapp|website|portal|plataforma|backend|microservic\w*|software)\b/;
const aiTerms = /\b(llm|llms|rag|embeddings?|chatbot|assistente|ia|inteligencia artificial|modelo de linguagem|vectori\w*|vetori\w*|openai|anthropic|mcp)\b/;

export const intents: Intent[] = [
  intent('project-status', 'project-manager',
    s(/\b(estado do projecto|estado do projeto|project status|status report|ponto de situacao|progresso|andamento|relatorio de (?:estado|progresso))\b/, 5)),
  intent('meeting-followup', 'project-manager',
    s(/\b(meeting|minutes|actas?|atas?|reuniao|reunioes|follow.?up)\b/, 5)),
  intent('risk-review', 'project-manager',
    s(/\b(riscos?|risk register|risk review|gestao de riscos)\b/, 5)),
  intent('requirements-analysis', 'project-manager',
    s(/\b(requisitos?|requirements?|especificacoes|criterios de aceitacao|user stories|historias de utilizador)\b/, 5)),
  intent('solution-briefing', 'it-project-manager',
    s(/\b(comprar ou (?:construir|desenvolver)|build vs\.? buy|make or buy|construir ou comprar|escolher entre)\b/, 5),
    s(/\bvale a pena\b/, 5), s(/\b(ou ficamos com|devemos ado[pt]ar)\b/, 3),
    s(/\b(business case|solution brief|caso de negocio|custo.?beneficio|analise de opcoes|avaliacao de fornecedor\w*)\b/, 5)),
  intent('automation-opportunity', 'it-project-manager',
    s(/\b(automatiz\w*|automation|automate|rpa|repetitiv\w*)\b/, 4),
    s(/\b(manual|manuais|processo manual)\b/, 2)),
  intent('tech-exploration', 'it-project-manager',
    s(/\b(spike|proof of concept|poc|prova de conceito|technology radar|experimentar (?:a |o |uma? )?(?:nova |novo )?(?:tecnologia|ferramenta|framework|biblioteca)|testar (?:o|a) \w+ antes de)\b/, 5),
    s(/\b(ver se serve|antes de (?:o |a )?ado[pt]\w*|tecnologia nova)\b/, 4)),
  intent('continuous-improvement', 'it-project-manager',
    s(/\b(retrospectiv\w*|retrospetiv\w*|retrospective|lessons learned|licoes|melhoria continua|continuous improvement)\b/, 5)),
  intent('ai-solution-design', 'ai-engineer',
    s(aiTerms, 4), s(/\b(arquitect\w*|arquitet\w*|desenha|desenho|solucao|knowledge graph|agentic ai)\b/, 1)),
  intent('ai-evaluation', 'ai-engineer',
    s(/\b(avali\w*|benchmark|metricas?|golden dataset|medir)\b/, 3), s(aiTerms, 4),
    s(/\b(conjunto de (?:perguntas|exemplos|testes)|perguntas de teste|dataset)\b/, 4)),
  intent('agent-build', 'ai-engineer',
    s(/\b(langgraph|langchain|semantic kernel|autogen|agent framework|microsoft agent|crewai)\b/, 5),
    s(/\b(multi.?agentes?|multiagentes?)\b/, 4), s(/\b(agentes?|agent)\b/, 3)),
  intent('prompt-engineering', 'ai-engineer',
    s(/\b(prompts?|system prompt|engenharia de prompts?)\b/, 5), s(/\b(melhora\w*|otimiz\w*|optimiz\w*|inconsistent\w*)\b/, 2)),
  intent('context-memory-setup', 'ai-engineer',
    s(/\b(memoria|lembr\w*|esquece\w*|gestao de contexto|context management)\b/, 4),
    s(/\b(sessao anterior|entre sessoes|longo prazo)\b/, 4)),
  intent('forge-build', 'senior-developer',
    s(/\b(novo projecto|novo projeto|new project|greenfield|de raiz|ponta a ponta|end.to.end|e2e)\b/, 5),
    s(buildVerbs, 2), s(softwareObjects, 2), s(buildAnObject, 3), s(/\b(sistema|servico|modulo)\b/, 1),
    s(/\b(react|python|fastapi|flask|django|dotnet|node|typescript|postgres\w*|mysql|sql)\b|\.net\b|\bc#/, 1)),
  intent('change-request', 'senior-developer',
    s(/\b(change request|pedido de alteracao)\b/, 6), s(/\b(nova funcionalidade|funcionalidade nova)\b/, 5),
    s(/\b(migra|migrar|migrem|converte\w*|refactor\w*|refator\w*|reescreve\w*)\b/, 4),
    s(/\b(adiciona\w*|acrescenta\w*|altera\w*|muda\w*|estende\w*|modifica\w*)\b/, 3),
    s(/\b(?:escreve|escrever|adiciona|cria|faz)\w* testes\b/, 4)),
  intent('bug-investigation', 'senior-developer',
    s(/\b(bug|bugs|stack ?trace|excepc\w*|exception|nullreference|crash\w*|erro \d{3}|traceback|rebent\w*|erro da aplicacao|corrigir defeito)\b/, 5),
    s(/\b(erros?|falha\w*|falhar|nao funciona|nao consigo|partiu|deixou de funcionar|debug\w*|depurar)\b/, 3),
    s(/\b(fecha sozinh\w*|congela\w*|bloqueia\w*|nao abre|nao guarda|encerra sozinh\w*)\b/, 4),
    s(/\b(de vez em quando|intermitente\w*)\b/, 4)),
  intent('production-cleanup', 'senior-developer',
    s(/\b(para producao|pronto (?:para )?producao|production.?ready|hardening|go.?live)\b/, 6),
    s(/\b(lixo|limpa\w*|limpeza|clean.?up|codigo comentado|console\.log|ficheiros temporarios)\b/, 4),
    s(/\b(deploy|otimiz\w*|optimiz\w*)\b/, 2)),
  intent('repository-audit', 'senior-developer',
    s(/\b(auditoria|auditar|audita\w*|code review|revisao de codigo|divida tecnica|codigo morto|dead code|dependencias (?:nao|obsoletas)|vulnerabilidades)\b/, 5),
    s(/\b(reve|rever|revisao|revisa\w*)\b/, 2), s(/\b(seguranca|codigo|repositorio|pull request)\b/, 2)),
  intent('security-assessment', 'security-engineer',
    s(/\b(testes? de seguranca|security test\w*|pentest|teste de intrusao|owasp|modelo de ameacas|threat model\w*|avaliacao de seguranca|security assessment)\b/, 6),
    s(/\b(seguranca|security|vulnerabilidad\w*)\b/, 2)),
  intent('technical-documentation', 'senior-developer',
    s(/\b(documenta\w*|documentar|readme|manual (?:de|do) utilizador|user manual|wiki)\b/, 5)),
  intent('frontend-build', 'frontend-developer',
    s(/\b(frontend|front-end|tailwind|css|design system|wcag|acessiv\w*|acessibilidade|responsiv\w*)\b/, 4),
    s(/\b(react|angular|vue)\b/, 3), s(/\b(dashboard|graficos?)\b/, 3),
    s(/\b(ecra|ecras|interface|componentes?|botao|botoes|layout|ui|ux|telemovel|site|pagina|paginas)\b/, 2),
    s(/\b(bonito|visual|estilo)\b/, 2)),
  intent('database-optimization', 'database-engineer',
    s(/\b(query|queries|consultas? sql|full scan|explain|indices?|slow quer\w*|n\+1)\b/, 4),
    s(/\b(postgres\w*|mysql|sql|base de dados|bd|linhas|milhoes)\b/, 3),
    s(/\b(lent[ao]s?|demora\w*|devagar|desempenho|performance)\b/, 2)),
  intent('magazine-article', 'magazine-editor',
    s(/\b(magazine|article|revista|editorial|artigo|reportagem|entrevista|headline|cronica)\b/, 5)),
  intent('academic-research', 'university-student',
    s(/\b(academic research|literature review|research paper|bibliograf\w*|pesquisa academica|revisao de literatura|artigo cientifico|tese|dissertacao)\b/, 5),
    s(/\b(referencias|fontes)\b/, 2)),
  intent('study-session', 'university-student',
    s(/\b(estudar|estudo|exame|flashcards?|study plan|study session|exam prep|plano de estudo|universitari\w*)\b/, 4)),
  intent('incident-analysis', 'systems-analyst',
    s(/\b(incident analysis|incident report|analise de incidente|postmortem|causa raiz|root cause|incidente|caiu|indisponib\w*|downtime|outage|o que aconteceu)\b/, 5),
    s(/\b(falha de seguranca|brecha)\b/, 4)),
  intent('system-analysis', 'systems-analyst',
    s(/\b(as.?is|to.?be|gap analysis|impact analysis|systems analysis|analise de sistemas|analise de impacto|bpmn|uml|processo actual|processo atual)\b/, 5),
    s(/\b(impacto|erp|integracoes?|futuro|mapeia|mapear)\b/, 3))
];

export interface Scored { intent: Intent; score: number }

export function score(prompt: string): Scored[] {
  const text = normalize(prompt);
  return intents.map(entry => ({
    intent: entry,
    score: entry.signals.reduce((total, [pattern, weight]) => total + (pattern.test(text) ? weight : 0), 0)
  }));
}
