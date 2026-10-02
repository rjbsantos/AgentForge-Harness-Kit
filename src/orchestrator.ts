import { profiles, tools, validateCatalog, workflows, type Profile } from './capabilities.js';
import { route, type Route, type RoutingOptions } from './routing.js';
import { loadOperator, type Operator } from './operator.js';
import { type Target } from './catalog.js';

export type SelectionSource = 'explicit' | 'intent' | 'operator';

export interface Proposal {
  role: Profile;
  agent: string;
  workflow: string;
  selectedBy: SelectionSource;
  operator: { roles: Profile[]; riskPosture: Operator['riskPosture'] };
  skills: string[];
  requiredTools: string[];
  toolStatus: 'unverified';
  steps: string[];
  validation: string[];
  output: string;
  template: string;
  coordination: {
    mode: 'sequential' | 'parallel-if-host-supports';
    parallelGroups: {
      after: number[];
      workers: { step: number; role: string; agent: string; skills: string[] }[];
    }[];
    maxConcurrentAgents: number;
    maxDelegationDepth: 1;
    singleWriter: true;
  };
  model: Pick<Route, 'tier' | 'complexity' | 'reasons' | 'model' | 'modelSelection'>;
  status: 'proposed';
}

const rules: { role: Profile; workflow: string; pattern: RegExp }[] = [
  { role: 'project-manager', workflow: 'meeting-followup', pattern: /\b(meeting|minutes|actas?|reuni[aã]o|follow.up)\b/i },
  { role: 'project-manager', workflow: 'risk-review', pattern: /\b(project risk|risk register|riscos? do projecto|gest[aã]o de riscos)\b/i },
  { role: 'project-manager', workflow: 'project-status', pattern: /\b(project status|estado do projecto|status report|progresso do projecto|relat[oó]rio de (?:estado|progresso))\b/i },
  { role: 'it-project-manager', workflow: 'solution-briefing', pattern: /\b(business case|solution brief|build vs\.? buy|make or buy|caso de neg[oó]cio|an[aá]lise de op[cç][õo]es|custo.?benef[ií]cio|comprar ou (?:construir|desenvolver)|avalia[cç][aã]o de fornecedores?)\b/i },
  { role: 'it-project-manager', workflow: 'automation-opportunity', pattern: /\b(automat(?:e|ion|izar|iza[cç][aã]o)|rpa|processo manual|tarefas? repetitivas?)\b/i },
  { role: 'it-project-manager', workflow: 'tech-exploration', pattern: /\b(spike|proof of concept|poc|prova de conceito|technology radar|explorar (?:uma |a )?(?:nova )?tecnologia|experimentar (?:uma? |o )?(?:nov[ao] )?(?:tecnologia|ferramenta|framework|biblioteca|modelo))\b/i },
  { role: 'it-project-manager', workflow: 'continuous-improvement', pattern: /\b(retrospectiva|retrospetiva|retrospective|lessons learned|li[cç][õo]es aprendidas|melhoria cont[ií]nua|continuous improvement)\b/i },
  { role: 'ai-engineer', workflow: 'ai-evaluation', pattern: /\b(benchmark|model evaluation|ai evaluation|rag evaluation|avalia[cç][aã]o (?:de |do )?(?:modelo|rag|ia)|golden dataset)\b/i },
  { role: 'ai-engineer', workflow: 'ai-solution-design', pattern: /\b(llm|rag|embedding|vector database|knowledge graph|agentic ai|mcp|engenharia de ia|ai solution|solu[cç][aã]o (?:de )?ia)\b/i },
  { role: 'senior-developer', workflow: 'repository-audit', pattern: /\b(repo(?:sitory)? audit|auditor(?:ia|ar) (?:ao? )?(?:c[oó]digo|reposit[oó]rio)|audita(?:r)? (?:o )?(?:c[oó]digo|reposit[oó]rio)|code review|technical debt|d[ií]vida t[eé]cnica|dead code|c[oó]digo morto|c[oó]digo obsoleto|ficheiros? obsoletos?|depend[eê]ncias? (?:n[aã]o utilizadas|obsoletas)|limpeza do (?:projecto|projeto|reposit[oó]rio)|clean(?: up)? (?:the )?(?:project|repository|codebase))\b/i },
  { role: 'senior-developer', workflow: 'bug-investigation', pattern: /\b(bug|stack trace|debug|exception|erro da aplica[cç][aã]o|corrigir defeito)\b/i },
  { role: 'magazine-editor', workflow: 'magazine-article', pattern: /\b(magazine|revista|editorial|artigo jornal[ií]stico|headline|entrevista)\b/i },
  { role: 'university-student', workflow: 'academic-research', pattern: /\b(academic research|literature review|research paper|bibliograph|pesquisa acad[eé]mica|revis[aã]o de literatura|artigo cient[ií]fico)\b/i },
  { role: 'university-student', workflow: 'study-session', pattern: /\b(study plan|study session|flashcards?|exam prep|plano de estudo|estudar|exame|universit[aá]ri[oa])\b/i },
  { role: 'systems-analyst', workflow: 'incident-analysis', pattern: /\b(incident analysis|root cause analysis|incident report|an[aá]lise de incidente|causa raiz|postmortem)\b/i },
  { role: 'systems-analyst', workflow: 'system-analysis', pattern: /\b(as.is|to.be|gap analysis|impact analysis|systems analysis|an[aá]lise de sistemas|an[aá]lise de impacto|bpmn|uml)\b/i }
];

const explicit = Object.entries(profiles).map(([role, profile]) =>
  ({ role: role as Profile, pattern: new RegExp(`\\b${role.replace(/-/g, '[ -]')}\\b|\\b${profile.title}\\b`, 'i') }));

export function select(prompt: string, requestedRole?: Profile, preference: Profile[] = []):
  { role: Profile; workflow: string; selectedBy: SelectionSource } {
  validateCatalog();
  if (!prompt.trim()) throw new Error('Pedido vazio');
  if (requestedRole && !(requestedRole in profiles)) throw new Error(`Perfil desconhecido: ${requestedRole}`);
  if (preference.some(role => !(role in profiles))) throw new Error('Perfil desconhecido na preferência do operador');
  const indicated = requestedRole ?? explicit.find(entry => entry.pattern.test(prompt))?.role;
  const matches = rules.filter(rule => rule.pattern.test(prompt) && (!indicated || indicated === rule.role));
  const candidates = [...new Set(matches.map(item => item.role))];
  if (!indicated && candidates.length > 1) {
    // Um pedido que cruza gestão e técnica é normal para um perfil híbrido: a ordem declarada
    // pelo operador desempata de forma determinística, em vez de bloquear o pedido.
    const preferred = preference.find(role => candidates.includes(role));
    if (!preferred) throw new Error(`Pedido ambíguo: escolher --role (${candidates.join(', ')})`);
    const match = matches.find(item => item.role === preferred)!;
    return { role: match.role, workflow: match.workflow, selectedBy: 'operator' };
  }
  if (matches.length) {
    return { role: matches[0].role, workflow: matches[0].workflow, selectedBy: requestedRole ? 'explicit' : 'intent' };
  }
  if (indicated) {
    // An explicit role without a matching trigger needs a workflow choice rather than a guessed default.
    throw new Error(`Fluxo não identificado para ${indicated}; especifique --workflow (${profiles[indicated].workflows.join(', ')})`);
  }
  const hint = preference.length ? ` (perfis habituais: ${preference.join(', ')})` : '';
  throw new Error(`Perfil e fluxo não identificados; indique --role e --workflow${hint}`);
}

export function choose(prompt: string, requestedRole?: Profile): { role: Profile; workflow: string } {
  const { role, workflow } = select(prompt, requestedRole);
  return { role, workflow };
}

export async function plan(project: string, cli: Target, prompt: string,
  options: RoutingOptions & { role?: Profile; workflow?: string } = {}): Promise<Proposal> {
  validateCatalog();
  const operator = await loadOperator(project);
  let selection: { role: Profile; workflow: string; selectedBy: SelectionSource };
  if (options.workflow) {
    if (!options.role || !(options.role in profiles)) throw new Error('O workflow exige --role válido');
    if (!profiles[options.role].workflows.some(name => name === options.workflow)) {
      throw new Error(`Workflow ${options.workflow} não pertence a ${options.role}`);
    }
    selection = { role: options.role, workflow: options.workflow, selectedBy: 'explicit' };
  } else selection = select(prompt, options.role, operator.roles);
  const workflow = workflows[selection.workflow];
  const decision = await route(project, cli, prompt, { ...options, cautious: operator.riskPosture === 'cautious' });
  const { tier, complexity, reasons, model, modelSelection } = decision;
  if (!workflow.tools.every(tool => tool in tools)) throw new Error('Ferramenta desconhecida no catálogo');
  return {
    role: selection.role, agent: profiles[selection.role].agent, workflow: selection.workflow,
    selectedBy: selection.selectedBy,
    operator: { roles: operator.roles, riskPosture: operator.riskPosture },
    skills: workflow.skills, requiredTools: workflow.tools, toolStatus: 'unverified',
    steps: workflow.steps, validation: workflow.validation,
    output: workflow.output, template: `.agentforge/templates/${workflow.template}.md`,
    coordination: {
      mode: workflow.parallelGroups.length ? 'parallel-if-host-supports' : 'sequential',
      parallelGroups: workflow.parallelGroups.map(group => ({
        after: group.after,
        workers: group.workers.map(worker => ({
          ...worker,
          agent: worker.role
        }))
      })),
      maxConcurrentAgents: workflow.parallelGroups.length
        ? Math.max(...workflow.parallelGroups.map(group => group.workers.length))
        : 1,
      maxDelegationDepth: 1,
      singleWriter: true
    },
    model: { tier, complexity, reasons, model, modelSelection }, status: 'proposed'
  };
}
