import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { choose, plan } from '../orchestrator.js';
import { profiles, templates, tools, validateCatalog, workflows } from '../capabilities.js';
import { skills, roles } from '../catalog.js';
import { install, remove, status } from '../installer.js';
import { recordRun } from '../operations.js';

const cases = [
  ['project-manager', 'project-status', 'Prepara um relatório do estado do projecto'],
  ['project-manager', 'meeting-followup', 'Produz acta da reunião'],
  ['project-manager', 'risk-review', 'Avalia riscos do projecto'],
  ['ai-engineer', 'ai-solution-design', 'Desenha uma solução de IA usando RAG'],
  ['ai-engineer', 'ai-evaluation', 'Preciso de uma avaliação de RAG'],
  ['senior-developer', 'bug-investigation', 'Analisa este erro da aplicação'],
  ['senior-developer', 'repository-audit', 'Faz uma auditoria ao repositório'],
  ['senior-developer', 'repository-audit', 'Identifica código morto, ficheiros obsoletos e dependências não utilizadas'],
  ['magazine-editor', 'magazine-article', 'Escreve um artigo para revista'],
  ['university-student', 'academic-research', 'Faz uma pesquisa académica com fontes'],
  ['university-student', 'study-session', 'Prepara flashcards para exame'],
  ['systems-analyst', 'system-analysis', 'Analisa AS-IS e TO-BE'],
  ['systems-analyst', 'incident-analysis', 'Faz análise de incidente e causa raiz'],
  ['it-project-manager', 'solution-briefing', 'Preciso de um caso de negócio: comprar ou construir o portal'],
  ['it-project-manager', 'automation-opportunity', 'Como automatizar este processo manual de aprovação'],
  ['it-project-manager', 'tech-exploration', 'Quero uma prova de conceito para esta ferramenta'],
  ['it-project-manager', 'continuous-improvement', 'Prepara a retrospectiva com lições aprendidas']
] as const;

test('catalog contracts: all roles, workflows, skills, tools and templates resolve', () => {
  validateCatalog();
  assert.equal(Object.keys(profiles).length, 7);
  for (const [id, profile] of Object.entries(profiles)) {
    assert.ok(profile.agent in roles, id);
    for (const workflowName of profile.workflows) assert.ok(workflowName in workflows, workflowName);
  }
  for (const [name, workflow] of Object.entries(workflows)) {
    assert.ok(workflow.skills.every(skill => skill in skills), name);
    assert.ok(workflow.tools.every(tool => tool in tools), name);
    assert.ok(workflow.template in templates, name);
    for (const group of workflow.parallelGroups) {
      for (const worker of group.workers) {
        assert.ok(worker.role in roles, `${name}: worker role ${worker.role}`);
        assert.ok(worker.skills.every(skill => skill in skills), `${name}: worker skills`);
      }
    }
    for (const field of ['trigger', 'description', 'output', 'postcondition', 'errorHandling'] as const) {
      assert.ok(workflow[field].trim(), `${name}.${field}`);
    }
    assert.ok(workflow.steps.length && workflow.validation.length && workflow.preconditions.length);
  }
});

test('role and workflow detection uses functional intent, not role-specific duplicate skills', () => {
  for (const [role, workflow, prompt] of cases) {
    assert.deepEqual(choose(prompt), { role, workflow }, prompt);
  }
  assert.throws(() => choose('Plan a magazine article and RAG architecture'), /ambíguo/);
  assert.throws(() => choose('Do a thing'), /não identificados/);
  assert.throws(() => choose('Hello', 'project-manager'), /Fluxo não identificado/);
});

test('every workflow yields a bounded, non-executed proposal and generated outputs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-roles-'));
  try {
    await install(root, ['opencode', 'claude', 'codex', 'antigravity']);
    for (const worker of ['code-critic', 'secops', 'reverse-engineer']) {
      assert.ok((await readFile(join(root, `.codex/agents/${worker}.toml`), 'utf8')).includes(`name = "${worker}"`));
    }
    for (const [role, workflow, prompt] of cases) {
      const proposal = await plan(root, 'codex', prompt);
      assert.deepEqual([proposal.role, proposal.workflow, proposal.status, proposal.toolStatus],
        [role, workflow, 'proposed', 'unverified']);
      assert.equal(proposal.coordination.maxDelegationDepth, 1);
      assert.equal(proposal.coordination.singleWriter, true);
      assert.ok(proposal.skills.every(skill => skill in skills));
      assert.ok(proposal.validation.length && proposal.steps.length);
      assert.match(await readFile(join(root, proposal.template), 'utf8'), /^#/);
      assert.match(await readFile(join(root, `.agentforge/workflows/${workflow}.json`), 'utf8'), /validation/);
      const native = await readFile(join(root, `.agents/workflows/${workflow}.md`), 'utf8');
      for (const marker of ['Gatilho:', 'Pré-condições:', 'Entradas:', 'Competências:', 'Ferramentas', 'Validação:', 'Resultado:', 'Se houver bloqueio:', 'Pós-condição:']) {
        assert.ok(native.includes(marker), `${workflow}: ${marker}`);
      }
    }
    assert.deepEqual((await plan(root, 'claude', 'Prepare requirements', {
      role: 'systems-analyst', workflow: 'requirements-analysis'
    })).skills, workflows['requirements-analysis'].skills);
    const audit = await plan(root, 'codex', 'Run repository audit', {
      role: 'senior-developer', workflow: 'repository-audit'
    });
    assert.deepEqual(audit.coordination, {
      mode: 'parallel-if-host-supports',
      parallelGroups: [{
        after: [1],
        workers: [
          { step: 2, role: 'code-critic', skills: ['forge-audit'], agent: 'code-critic' },
          { step: 3, role: 'secops', skills: ['forge-audit'], agent: 'secops' },
          { step: 4, role: 'reverse-engineer', skills: ['forge-performance'], agent: 'reverse-engineer' }
        ]
      }],
      maxConcurrentAgents: 3,
      maxDelegationDepth: 1,
      singleWriter: true
    });
    const sequential = await plan(root, 'codex', 'Plan a magazine article', {
      role: 'magazine-editor', workflow: 'magazine-article'
    });
    assert.deepEqual(sequential.coordination.parallelGroups, []);
    assert.equal(sequential.coordination.mode, 'sequential');
    await assert.rejects(plan(root, 'codex', 'hello', {
      role: 'magazine-editor', workflow: 'ai-evaluation'
    }), /não pertence/);
    assert.match(await readFile(join(root, '.agentforge/CAPABILITIES.md'), 'utf8'), /Analista de Sistemas/);
    assert.match(await readFile(join(root, '.agents/skills/forge-hygiene/SKILL.md'), 'utf8'), /ligações simbólicas que escapem/);
    assert.match(await readFile(join(root, '.agentforge/HARNESS.md'), 'utf8'), /Limite do projecto e organização/);
    assert.ok(workflows['repository-audit'].skills.includes('forge-hygiene'));
    assert.match(workflows['repository-audit'].validation.join(' '), /dentro do projecto/);
    assert.match((await status(root))[1], /nenhum/);
    await remove(root, ['antigravity']);
    await assert.rejects(readFile(join(root, '.agents/workflows/magazine-article.md')));
    assert.match(await readFile(join(root, '.agents/skills/forge-research/SKILL.md'), 'utf8'), /forge-research/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('only explicit verified run events are logged; proposals do not claim execution', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-logs-'));
  try {
    await install(root, ['codex']);
    const key = join(root, '.agentforge/work/operations.jsonl');
    await plan(root, 'codex', 'Prepara relatório do estado do projecto');
    await assert.rejects(readFile(key), /ENOENT/);
    await assert.rejects(recordRun(root, { role: 'project-manager', workflow: 'project-status',
      result: 'passed', validation: 'not-run', durationMs: 10, toolsUsed: [] }), /inválido/);
    await recordRun(root, { role: 'project-manager', workflow: 'project-status',
      result: 'passed', validation: 'passed', durationMs: 230, toolsUsed: ['file-system'],
      skillsUsed: ['forge-verify'], tokens: 100 });
    const entry = JSON.parse((await readFile(key, 'utf8')).trim());
    assert.equal(entry.agent, 'product-manager');
    assert.equal(entry.tokens, 100);
    assert.equal(entry.workflow, 'project-status');
    assert.deepEqual(entry.skillsUsed, ['forge-verify']);
    assert.deepEqual(entry.skillsPlanned, ['forge-research', 'forge-verify']);
    await assert.rejects(recordRun(root, { role: 'project-manager', workflow: 'project-status',
      result: 'passed', validation: 'passed', durationMs: 230, toolsUsed: [], skillsUsed: ['forge-implementation'] }), /inválido/);
    const cli = fileURLToPath(new URL('../cli/index.js', import.meta.url));
    const proposal = JSON.parse(execFileSync(process.execPath, [cli, 'plan', '--cli', 'claude',
      '--prompt', 'Escreve um artigo para revista', '--project', root], { encoding: 'utf8' }));
    assert.deepEqual([proposal.agent, proposal.workflow, proposal.status],
      ['editor', 'magazine-article', 'proposed']);
    execFileSync(process.execPath, [cli, 'record', '--role', 'magazine-editor',
      '--workflow', 'magazine-article', '--result', 'blocked', '--validation', 'not-run',
      '--duration-ms', '4', '--retries', '1', '--tokens', '25', '--cost', '0.01',
      '--error-code', 'SOURCE_UNAVAILABLE', '--project', root]);
    assert.equal((await readFile(key, 'utf8')).trim().split('\n').length, 2);
    const blocked = JSON.parse((await readFile(key, 'utf8')).trim().split('\n')[1]);
    assert.deepEqual([blocked.retries, blocked.tokens, blocked.cost, blocked.errorCode],
      [1, 25, 0.01, 'SOURCE_UNAVAILABLE']);
  } finally { await rm(root, { recursive: true, force: true }); }
});
