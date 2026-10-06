import { profiles, tools, validateCatalog, workflows, type Profile } from './capabilities.js';
import { route, type Route, type RoutingOptions } from './routing.js';
import { loadOperator, type Operator } from './operator.js';
import { type Target } from './catalog.js';
import { ambiguityMargin, minimumScore, score } from './intent.js';

export type SelectionSource = 'explicit' | 'intent' | 'operator';

export interface Proposal {
  role: Profile;
  agent: string;
  workflow: string;
  selectedBy: SelectionSource;
  operator: { roles: Profile[]; riskPosture: Operator['riskPosture']; verbosity: Operator['verbosity'] };
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

const explicit = Object.entries(profiles).map(([role, profile]) =>
  ({ role: role as Profile, pattern: new RegExp(`\\b${role.replace(/-/g, '[ -]')}\\b|\\b${profile.title}\\b`, 'i') }));

export function select(prompt: string, requestedRole?: Profile, preference: Profile[] = []):
  { role: Profile; workflow: string; selectedBy: SelectionSource } {
  validateCatalog();
  if (!prompt.trim()) throw new Error('Pedido vazio');
  if (requestedRole && !(requestedRole in profiles)) throw new Error(`Perfil desconhecido: ${requestedRole}`);
  if (preference.some(role => !(role in profiles))) throw new Error('Perfil desconhecido na preferência do operador');
  const indicated = requestedRole ?? explicit.find(entry => entry.pattern.test(prompt))?.role;
  // Com um perfil indicado só contam os fluxos desse perfil; sem perfil, contam todos.
  const scored = score(prompt)
    .filter(item => item.score >= minimumScore && (!indicated || (profiles[indicated].workflows as readonly string[]).includes(item.intent.workflow)))
    .sort((a, b) => b.score - a.score);
  if (scored.length) {
    const top = scored[0].score;
    const contenders = scored.filter(item => item.score >= top - ambiguityMargin);
    const candidates = [...new Set(contenders.map(item => item.intent.role))];
    if (!indicated && candidates.length > 1) {
      // Um pedido que cruza gestão e técnica é normal para um perfil híbrido: a ordem declarada
      // pelo operador desempata de forma determinística, em vez de bloquear o pedido.
      const preferred = preference.find(role => candidates.includes(role));
      if (!preferred) throw new Error(`Pedido ambíguo: escolher --role (${candidates.join(', ')})`);
      const match = contenders.find(item => item.intent.role === preferred)!;
      return { role: match.intent.role, workflow: match.intent.workflow, selectedBy: 'operator' };
    }
    const best = scored[0].intent;
    return { role: indicated ?? best.role, workflow: best.workflow, selectedBy: requestedRole ? 'explicit' : 'intent' };
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
    operator: { roles: operator.roles, riskPosture: operator.riskPosture, verbosity: operator.verbosity },
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
