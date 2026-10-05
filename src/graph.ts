import { profiles, tools, workflows } from './capabilities.js';
import { roles } from './roles.js';
import { skills } from './skills.js';
import { routingTable } from './routing.js';

// Grafo de conhecimento do próprio catálogo (perfis, agentes, fluxos, competências, ferramentas
// e modelos de saída), inspirado no graphify: determinístico, sem LLM nem índice vectorial, e
// com cada aresta explicada por uma etiqueta de confiança.
//   EXTRACTED — declarada explicitamente no catálogo.
//   INFERRED  — deduzida das declarações (co-utilização), a tratar como hipótese.
//   AMBIGUOUS — requer decisão humana (ex.: papel que nenhum perfil nem fluxo referencia).
export type Confidence = 'EXTRACTED' | 'INFERRED' | 'AMBIGUOUS';
export type Kind = 'profile' | 'role' | 'workflow' | 'skill' | 'tool' | 'template' | 'route';
export interface GraphNode { id: string; kind: Kind; label: string; text: string }
export interface GraphEdge { source: string; target: string; relation: string; confidence: Confidence }
export interface Graph { nodes: GraphNode[]; edges: GraphEdge[] }

const id = (kind: Kind, name: string) => `${kind}:${name}`;

export function buildGraph(): Graph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const node = (kind: Kind, name: string, text = '') => {
    if (!nodes.has(id(kind, name)) || text) nodes.set(id(kind, name), { id: id(kind, name), kind, label: name, text });
  };
  const edge = (source: string, target: string, relation: string, confidence: Confidence = 'EXTRACTED') => {
    if (!edges.some(e => e.source === source && e.target === target && e.relation === relation)) {
      edges.push({ source, target, relation, confidence });
    }
  };
  for (const [name, profile] of Object.entries(profiles)) node('profile', name, profile.title);
  for (const [name, role] of Object.entries(roles)) node('role', name, role.description);
  for (const [name, body] of Object.entries(skills)) node('skill', name, /^description: (.+)$/m.exec(body)?.[1] ?? '');
  for (const [name, description] of Object.entries(tools)) node('tool', name, description);
  const referencedRoles = new Set<string>();
  const skillPairs = new Map<string, number>();
  for (const [name, profile] of Object.entries(profiles)) {
    edge(id('profile', name), id('role', profile.agent), 'led_by');
    referencedRoles.add(profile.agent);
    for (const workflow of profile.workflows) edge(id('profile', name), id('workflow', workflow), 'has_workflow');
  }
  for (const [name, workflow] of Object.entries(workflows)) {
    node('workflow', name, `${workflow.description}. ${workflow.trigger}`);
    node('template', workflow.template, workflow.output);
    edge(id('workflow', name), id('template', workflow.template), 'outputs_with');
    for (const skill of workflow.skills) edge(id('workflow', name), id('skill', skill), 'uses_skill');
    for (const tool of workflow.tools) edge(id('workflow', name), id('tool', tool), 'requires_tool');
    for (const group of workflow.parallelGroups) {
      for (const worker of group.workers) {
        referencedRoles.add(worker.role);
        edge(id('workflow', name), id('role', worker.role), 'delegates_to');
        for (const skill of worker.skills) edge(id('role', worker.role), id('skill', skill), 'applies_skill');
      }
    }
    const sorted = [...workflow.skills].sort();
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]}|${sorted[j]}`;
        skillPairs.set(key, (skillPairs.get(key) ?? 0) + 1);
      }
    }
  }
  for (const [key, count] of skillPairs) {
    const [a, b] = key.split('|');
    if (count >= 2) edge(id('skill', a), id('skill', b), `co_used_with(${count})`, 'INFERRED');
  }
  for (const [tier, names] of Object.entries(routingTable)) {
    node('route', tier, `Encaminhamento ${tier}`);
    for (const name of names) {
      referencedRoles.add(name);
      edge(id('route', tier), id('role', name), 'routes_to');
    }
  }
  for (const name of Object.keys(roles)) {
    if (!referencedRoles.has(name)) edge(id('role', name), id('role', name), 'unreferenced_by_catalog', 'AMBIGUOUS');
  }
  return { nodes: [...nodes.values()], edges };
}

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const tokens = (value: string) => fold(value).split(/[^a-z0-9]+/).filter(token => token.length > 2);
const describe = (_g: Graph, e: GraphEdge) => {
  return `${e.source} --${e.relation}--> ${e.target} [${e.confidence}]`;
};
const degree = (g: Graph, key: string) =>
  g.edges.filter(e => e.source !== e.target && (e.source === key || e.target === key)).length;

function resolve(g: Graph, name: string): GraphNode {
  const wanted = fold(name.trim());
  const exact = g.nodes.filter(n => fold(n.label) === wanted || n.id === wanted);
  const found = exact.length ? exact : g.nodes.filter(n => fold(n.label).includes(wanted));
  // Um nome parcial só resolve se identificar um único nó; caso contrário pede-se precisão.
  if (!wanted || !found.length) throw new Error(`Nó desconhecido: ${name}`);
  if (found.length > 1) throw new Error(`Nó ambíguo: ${name} (${found.map(n => n.id).join(', ')})`);
  return found[0];
}

export function explain(g: Graph, name: string): { node: GraphNode; degree: number; connections: string[] } {
  const node = resolve(g, name);
  const own = g.edges.filter(e => e.source === node.id || e.target === node.id);
  return { node, degree: degree(g, node.id), connections: own.map(e => describe(g, e)) };
}

export function path(g: Graph, from: string, to: string): { hops: number; steps: string[] } {
  const start = resolve(g, from);
  const goal = resolve(g, to);
  const previous = new Map<string, { via: GraphEdge; from: string }>();
  const seen = new Set([start.id]);
  const queue = [start.id];
  while (queue.length && !seen.has(goal.id)) {
    const current = queue.shift()!;
    for (const e of g.edges) {
      if (e.source === e.target) continue;
      const other = e.source === current ? e.target : e.target === current ? e.source : undefined;
      if (other === undefined || seen.has(other)) continue;
      seen.add(other);
      previous.set(other, { via: e, from: current });
      queue.push(other);
    }
  }
  if (!seen.has(goal.id)) throw new Error(`Sem ligação entre ${start.label} e ${goal.label}`);
  const steps: string[] = [];
  for (let at = goal.id; at !== start.id;) {
    const step = previous.get(at)!;
    steps.unshift(describe(g, step.via));
    at = step.from;
  }
  return { hops: steps.length, steps };
}

// Subgrafo relevante para uma pergunta: nós cujo nome partilha termos com ela, expandidos um nível.
// O orçamento limita o tamanho da resposta (estimativa de 4 caracteres por token, como em `context`).
export function query(g: Graph, question: string, budgetTokens = 800):
  { seeds: string[]; edges: string[]; omitted: number; estimatedTokens: number } {
  const terms = tokens(question);
  if (!terms.length) throw new Error('Pergunta sem termos utilizáveis');
  const scored = g.nodes.map(n => ({ n, score: terms.filter(t => fold(`${n.label} ${n.text}`).includes(t)).length }))
    .filter(item => item.score > 0).sort((a, b) => b.score - a.score || degree(g, b.n.id) - degree(g, a.n.id));
  if (!scored.length) throw new Error(`Nenhum nó corresponde a: ${question}`);
  const best = scored[0].score;
  const seeds = scored.filter(item => item.score === best).slice(0, 5).map(item => item.n);
  const seedIds = new Set(seeds.map(n => n.id));
  const rank = { EXTRACTED: 0, INFERRED: 1, AMBIGUOUS: 2 } as const;
  const related = g.edges.filter(e => seedIds.has(e.source) || seedIds.has(e.target))
    .sort((a, b) => rank[a.confidence] - rank[b.confidence]);
  const out: string[] = [];
  let used = 0;
  for (const e of related) {
    const line = describe(g, e);
    const cost = Math.ceil(line.length / 4);
    if (used + cost > budgetTokens) break;
    out.push(line);
    used += cost;
  }
  return { seeds: seeds.map(n => n.id), edges: out, omitted: related.length - out.length, estimatedTokens: used };
}

export function report(g: Graph): {
  counts: Record<string, number>; confidence: Record<Confidence, number>;
  godNodes: { node: string; degree: number }[]; bridges: { skill: string; profiles: string[] }[];
  orphans: string[]; ambiguous: string[];
} {
  const counts: Record<string, number> = {};
  for (const n of g.nodes) counts[n.kind] = (counts[n.kind] ?? 0) + 1;
  const confidence: Record<Confidence, number> = { EXTRACTED: 0, INFERRED: 0, AMBIGUOUS: 0 };
  for (const e of g.edges) confidence[e.confidence]++;
  const godNodes = g.nodes.map(n => ({ node: n.id, degree: degree(g, n.id) }))
    .sort((a, b) => b.degree - a.degree || a.node.localeCompare(b.node)).slice(0, 5);
  const bridges = g.nodes.filter(n => n.kind === 'skill').map(skill => ({
    skill: skill.id,
    profiles: Object.entries(profiles).filter(([, profile]) => profile.workflows.some(name =>
      workflows[name].skills.includes(skill.label))).map(([name]) => name)
  })).filter(item => item.profiles.length >= 3).sort((a, b) => b.profiles.length - a.profiles.length);
  const orphans = g.nodes.filter(n => degree(g, n.id) === 0).map(n => n.id);
  const ambiguous = g.edges.filter(e => e.confidence === 'AMBIGUOUS').map(e => describe(g, e));
  return { counts, confidence, godNodes, bridges, orphans, ambiguous };
}
