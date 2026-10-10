import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assessPrompt } from '../gate.js';
import { validateCatalog, workflows } from '../capabilities.js';
import { abandonFlow, closeFlow, completeStep, flowStatus, skipStep, startFlow } from '../flow.js';
import { install } from '../installer.js';
import { verifyAudit } from '../audit.js';
import { plan } from '../orchestrator.js';

const cli = fileURLToPath(new URL('../cli/index.js', import.meta.url));

async function project(fn: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-flow-'));
  try { await install(root, ['claude']); await fn(root); } finally { await rm(root, { recursive: true, force: true }); }
}

test('gate: pedidos vagos são recusados com as perguntas que faltam; pedidos concretos passam', () => {
  const vague = assessPrompt('melhora isto');
  assert.equal(vague.ready, false);
  assert.ok(vague.missing.length >= 1 && vague.missing.length <= 4);
  assert.ok(vague.missing.every(item => item.question && item.recommendation));
  assert.equal(assessPrompt('').ready, false);
  assert.equal(assessPrompt('Corrige tudo').ready, false);
  // O fluxo escolhido exige os seus dados: sem o relatório, o SAST não avança.
  const sast = assessPrompt('Corrige as vulnerabilidades do Checkmarx');
  assert.equal(sast.workflow, 'sast-remediation');
  assert.equal(sast.ready, true); // «Checkmarx» identifica o relatório
  assert.equal(assessPrompt('Analisa este erro da aplicação').ready, false);
  assert.equal(assessPrompt('Analisa este erro da aplicação').missing[0].field, 'local');
  const good = assessPrompt('Há um erro 500 no endpoint /api/pagamentos quando o campo valor vem vazio; os testes devem passar');
  assert.equal(good.ready, true);
  assert.equal(good.workflow, 'bug-investigation');
  assert.equal(assessPrompt('Fecha a versão 1.5.0 com a checklist').ready, true);
  assert.equal(assessPrompt('Fecha a versão com a checklist de release').ready, false);
});

test('gate: plan devolve needs-context com as perguntas, sem gastar o fluxo', () => project(async root => {
  const vague = await plan(root, 'claude', 'Analisa este erro da aplicação');
  assert.equal(vague.status, 'needs-context');
  assert.equal(vague.gate.ready, false);
  const ready = await plan(root, 'claude', 'Fecha a versão 1.5.0 com a checklist');
  assert.equal(ready.status, 'proposed');
  assert.ok(ready.composition.some(item => item.workflow === 'repository-audit'));
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, 'gate', ...args], { encoding: 'utf8' });
  const refused = run('--prompt', 'melhora isto');
  assert.equal(refused.status, 3);
  assert.equal(JSON.parse(refused.stdout).ready, false);
  assert.equal(run('--prompt', 'Fecha a versão 1.5.0 com a checklist').status, 0);
  assert.equal(run('--prompt', 'x', '--workflow', 'nope').status, 2);
  const withProject = spawnSync(process.execPath, [cli, 'gate', '--prompt', 'melhora isto', '--project', root], { encoding: 'utf8' });
  assert.equal(withProject.status, 3);
  assert.match(await readFile(join(root, '.agentforge/work/audit.jsonl'), 'utf8'), /"action":"gate"/);
}));

test('composição: sub-fluxos existem, não formam ciclos e cada passo está dentro do fluxo', () => {
  validateCatalog();
  assert.deepEqual(
    workflows['release-closure'].uses.map(item => item.workflow),
    ['repository-audit', 'security-assessment', 'sast-remediation', 'technical-documentation', 'production-cleanup']);
  assert.equal(workflows['bug-investigation'].uses[0].workflow, 'change-request');
  const broken = structuredClone(workflows['project-status'].uses);
  workflows['project-status'].uses = [{ workflow: 'nao-existe', step: 1, when: 'x', handoff: 'y' }];
  try { assert.throws(() => validateCatalog(), /Composição inválida/); } finally { workflows['project-status'].uses = broken; }
  workflows['risk-review'].uses = [{ workflow: 'project-status', step: 1, when: 'x', handoff: 'y' }];
  try { assert.throws(() => validateCatalog(), /circular/); } finally { workflows['risk-review'].uses = []; }
});

test('flow: não deixa dar passos fora de ordem, exige evidência e recusa fechar incompleto', () => project(async root => {
  await startFlow(root, 'risk-review');
  await assert.rejects(startFlow(root, 'risk-review'), /Já existe um fluxo activo/);
  await assert.rejects(completeStep(root, 2, { note: 'feito' }), /faltam os passos 1/);
  await assert.rejects(completeStep(root, 1, {}), /--evidence/);
  await assert.rejects(skipStep(root, 1, { reason: 'curto' }), /pelo menos 10/);
  await writeFile(join(root, 'riscos.md'), '| R1 | fuga |');
  assert.equal((await completeStep(root, 1, { evidence: 'riscos.md' })).done, 1);
  await assert.rejects(completeStep(root, 1, { note: 'x' }), /já está/);
  await assert.rejects(completeStep(root, 2, { evidence: '../fora.md' }), /inválido|fora/);
  await assert.rejects(closeFlow(root), /faltam os passos 2, 3, 4/);
  await completeStep(root, 2, { note: 'probabilidade e impacto avaliados' });
  // O passo 3 é «pedir aprovação»: exige confirmação humana.
  await assert.rejects(completeStep(root, 3, { note: 'aprovado' }), /decisão humana/);
  await assert.rejects(completeStep(root, 3, { note: 'aprovado', confirm: async () => { throw new Error('Não confirmado'); } }), /Não confirmado/);
  assert.equal((await flowStatus(root)).pending, 2);
  await completeStep(root, 3, { note: 'aprovado por quem decide', confirm: async () => undefined });
  await completeStep(root, 4, { note: 'risco aceite por quem decide, revisão em Janeiro' });
  const closed = await closeFlow(root);
  assert.equal(closed.done, 4);
  assert.match(closed.archive, /\.agentforge\/work\/flows\/.*-risk-review\.json$/);
  await assert.rejects(flowStatus(root), /Nenhum fluxo activo/);
  assert.equal((await readdir(join(root, '.agentforge/work/flows'))).length, 1);
  const audit = await readFile(join(root, '.agentforge/work/audit.jsonl'), 'utf8');
  assert.match(audit, /flow\.start/);
  assert.match(audit, /flow\.close/);
  assert.equal((await verifyAudit(root)).ok, true);
}));

test('flow: passos paralelos podem avançar por qualquer ordem e abandonar liberta o fluxo', () => project(async root => {
  await startFlow(root, 'repository-audit');
  await completeStep(root, 1, { note: 'mapeado' });
  // Os passos 2 a 4 são irmãos paralelos: 4 pode vir antes de 2.
  const status = await flowStatus(root);
  assert.deepEqual(status.next.map(step => step.n).slice(0, 3), [2, 3, 4]);
  await completeStep(root, 4, { note: 'desempenho medido' });
  await assert.rejects(completeStep(root, 6, { note: 'x' }), /faltam os passos 2, 3/);
  assert.equal(await abandonFlow(root), 'repository-audit');
  await startFlow(root, 'project-status');
}));

test('flow: no CLI, os passos de decisão humana são recusados com stdin redireccionado', () => project(async root => {
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, 'flow', ...args, '--project', root], { encoding: 'utf8', input: 's\n' });
  assert.equal(run('start', '--workflow', 'risk-review').status, 0);
  assert.equal(run('done', '--step', '1', '--note', 'riscos listados').status, 0);
  assert.equal(run('done', '--step', '2', '--note', 'avaliados').status, 0);
  const refused = run('done', '--step', '3', '--note', 'aprovado');
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /terminal interactivo/);
  assert.equal(run('close').status, 1);
  assert.equal(JSON.parse(run('status').stdout).pending, 2);
  assert.equal(run('done').status, 2);
  assert.equal(run('start').status, 2);
  await mkdir(join(root, 'x'), { recursive: true });
}));

test('novos fluxos: SAST, Edge, guardrails e red team estão completos, encaminhados e compostos', async () => {
  const { skills } = await import('../skills.js');
  const { templates, profiles } = await import('../capabilities.js');
  const { choose } = await import('../orchestrator.js');
  for (const [name, skill, template] of [['sast-remediation', 'forge-sast-remediation', 'sast-remediation'],
    ['edge-modernization', 'forge-edge-compat', 'edge-modernization'], ['guardrail-design', 'forge-guardrails', 'guardrails'],
    ['red-team', 'forge-red-team', 'red-team']]) {
    assert.ok(workflows[name].skills.includes(skill), `${name}: falta ${skill}`);
    assert.ok(template in templates, template);
    assert.ok(Object.values(profiles).some(profile => (profile.workflows as readonly string[]).includes(name)), name);
    assert.match(skills[skill], /Validação:/);
  }
  assert.equal(choose('Tenho o relatório do Checkmarx com 40 achados, corrige as vulnerabilidades').workflow, 'sast-remediation');
  assert.equal(choose('Quero deixar de usar o modo de compatibilidade do Internet Explorer no Edge').workflow, 'edge-modernization');
  assert.equal(choose('Faz um red team ao agente para ver se resiste a prompt injection').workflow, 'red-team');
  assert.equal(choose('Define os guardrails do agente de apoio ao cliente').workflow, 'guardrail-design');
  assert.match(skills['forge-sast-remediation'], /Nunca desactivar a regra/);
  assert.match(skills['forge-edge-compat'], /X-UA-Compatible/);
  assert.match(skills['forge-red-team'], /Nunca produção/);
  assert.ok(workflows['agent-build'].uses.some(item => item.workflow === 'red-team'));
});
