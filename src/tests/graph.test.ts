import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildGraph, explain, path, query, report } from '../graph.js';
import { profiles, workflows } from '../capabilities.js';
import { classify, routingTable } from '../routing.js';
import { skills } from '../skills.js';

const graph = buildGraph();

test('every catalog declaration becomes an EXTRACTED edge and inferences are labelled', () => {
  for (const [name, workflow] of Object.entries(workflows)) {
    for (const skill of workflow.skills) {
      assert.ok(graph.edges.some(e => e.source === `workflow:${name}` && e.target === `skill:${skill}` &&
        e.relation === 'uses_skill' && e.confidence === 'EXTRACTED'), `${name} -> ${skill}`);
    }
  }
  for (const [name, profile] of Object.entries(profiles)) {
    assert.ok(graph.edges.some(e => e.source === `profile:${name}` && e.target === `role:${profile.agent}`));
  }
  const inferred = graph.edges.filter(e => e.confidence === 'INFERRED');
  assert.ok(inferred.length > 0 && inferred.every(e => e.relation.startsWith('co_used_with(')));
  assert.ok(graph.edges.every(e => ['EXTRACTED', 'INFERRED', 'AMBIGUOUS'].includes(e.confidence)));
});

test('the catalog has no orphan or unreferenced nodes', () => {
  const summary = report(graph);
  assert.deepEqual(summary.orphans, []);
  assert.deepEqual(summary.ambiguous, []);
  assert.equal(summary.counts.skill, Object.keys(skills).length);
  assert.equal(summary.godNodes.length, 5);
  assert.ok(summary.bridges.some(item => item.skill === 'skill:forge-verify'));
});

test('classify only returns agents that the routing table declares', () => {
  const declared = new Set(Object.values(routingTable).flat());
  for (const prompt of ['Design the architecture', 'Deploy to production', 'Implement the approved spec', 'Corrigir gralha']) {
    for (const options of [{}, { planned: true, approved: true }]) {
      const route = classify(prompt, options);
      assert.ok(declared.has(route.agent), route.agent);
      assert.ok(route.subagents.every(name => declared.has(name)), route.subagents.join());
    }
  }
});

test('query, path and explain answer from the graph and respect the budget', () => {
  const found = query(graph, 'auditoria do repositório');
  assert.deepEqual(found.seeds, ['workflow:repository-audit']);
  assert.ok(found.edges.some(line => line.includes('uses_skill--> skill:forge-hygiene')));
  const tight = query(graph, 'auditoria do repositório', 20);
  assert.ok(tight.estimatedTokens <= 20 && tight.omitted > 0);
  assert.equal(path(graph, 'forge-hygiene', 'senior-developer').hops, 2);
  assert.match(path(graph, 'profile:systems-analyst', 'skill:forge-fact-check').steps.join(' '), /has_workflow/);
  assert.ok(explain(graph, 'qa').connections.includes('route:economy --routes_to--> role:qa [EXTRACTED]'));
  assert.throws(() => explain(graph, 'nope'), /desconhecido/);
  assert.throws(() => explain(graph, 'repository-audit'), /ambíguo/);
  assert.throws(() => query(graph, 'zzzz qqqq'), /Nenhum nó/);
  assert.throws(() => path(graph, 'qa', 'nope'), /desconhecido/);
});
