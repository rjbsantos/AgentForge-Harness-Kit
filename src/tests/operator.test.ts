import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadOperator, setOperator } from '../operator.js';
import { choose, plan, select } from '../orchestrator.js';
import { classify } from '../routing.js';
import { install } from '../installer.js';

const cli = fileURLToPath(new URL('../cli/index.js', import.meta.url));

test('operator profile is validated, persisted and defaults to an empty, neutral profile', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-operator-'));
  try {
    await install(root, ['codex']);
    assert.deepEqual(await loadOperator(root), { version: 1, roles: [], riskPosture: 'balanced', verbosity: 'normal', interests: [],
      headline: undefined, language: undefined });
    const saved = await setOperator(root, {
      headline: 'Gestor de Projectos de SI com perfil técnico',
      roles: ['it-project-manager', 'systems-analyst', 'ai-engineer'],
      language: 'pt-PT', riskPosture: 'cautious',
      interests: ['arquitectura de sistemas', 'AI engineering', 'automação']
    });
    assert.deepEqual(saved.roles, ['it-project-manager', 'systems-analyst', 'ai-engineer']);
    assert.equal(saved.riskPosture, 'cautious');
    assert.deepEqual((await loadOperator(root)).interests, ['arquitectura de sistemas', 'AI engineering', 'automação']);
    // Uma alteração parcial preserva o resto do perfil.
    assert.equal((await setOperator(root, { riskPosture: 'balanced' })).language, 'pt-PT');
    await assert.rejects(setOperator(root, { roles: ['gestor-de-projectos'] }), /Perfil desconhecido/);
    await assert.rejects(setOperator(root, { roles: ['ai-engineer', 'ai-engineer'] }), /repetidos/);
    await assert.rejects(setOperator(root, { riskPosture: 'yolo' }), /Postura de risco inválida/);
    await assert.rejects(setOperator(root, { language: 'português de Portugal' }), /Idioma inválido/);
    await assert.rejects(setOperator(root, {}), /Nada a alterar/);
    const shown = JSON.parse(execFileSync(process.execPath, [cli, 'operator', 'show', '--project', root], { encoding: 'utf8' }));
    assert.equal(shown.headline, 'Gestor de Projectos de SI com perfil técnico');
    execFileSync(process.execPath, [cli, 'operator', 'set', '--roles', 'senior-developer', '--project', root]);
    assert.deepEqual((await loadOperator(root)).roles, ['senior-developer']);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('declared role preference resolves hybrid requests instead of blocking them', () => {
  const hybrid = 'Faz uma prova de conceito com um agente MCP';
  assert.throws(() => choose(hybrid), /ambíguo/);
  assert.deepEqual(select(hybrid, undefined, ['it-project-manager', 'ai-engineer']),
    { role: 'it-project-manager', workflow: 'tech-exploration', selectedBy: 'operator' });
  assert.deepEqual(select(hybrid, undefined, ['ai-engineer', 'it-project-manager']),
    { role: 'ai-engineer', workflow: 'ai-solution-design', selectedBy: 'operator' });
  // Uma preferência que não cobre os candidatos não inventa uma escolha.
  assert.throws(() => select(hybrid, undefined, ['database-engineer']), /ambíguo/);
  assert.throws(() => select('Do a thing', undefined, ['it-project-manager']), /perfis habituais/);
  assert.equal(select('Analisa este erro da aplicação').selectedBy, 'intent');
  assert.equal(select('Analisa este erro da aplicação', 'senior-developer').selectedBy, 'explicit');
});

test('risk posture only escalates reasoning and is reported in the proposal', async () => {
  assert.equal(classify('corrigir gralha', { planned: true, approved: true }).tier, 'economy');
  const escalated = classify('corrigir gralha', { planned: true, approved: true, cautious: true });
  assert.equal(escalated.tier, 'thinking');
  assert.ok(escalated.reasons.some(reason => reason.includes('postura cautelosa')));
  const root = await mkdtemp(join(tmpdir(), 'agentforge-posture-'));
  try {
    await install(root, ['codex']);
    await setOperator(root, { roles: ['it-project-manager', 'ai-engineer'], riskPosture: 'cautious' });
    const bounded = await plan(root, 'codex', 'Prepara a retrospectiva com lições aprendidas',
      { planned: true, approved: true });
    assert.equal(bounded.model.tier, 'thinking');
    assert.equal(bounded.operator.riskPosture, 'cautious');
    assert.deepEqual(bounded.operator.roles, ['it-project-manager', 'ai-engineer']);
    assert.equal(bounded.selectedBy, 'intent');
    const hybrid = await plan(root, 'codex', 'Faz uma prova de conceito com um agente MCP');
    assert.deepEqual([hybrid.role, hybrid.workflow, hybrid.selectedBy, hybrid.agent],
      ['it-project-manager', 'tech-exploration', 'operator', 'solution-advisor']);
    // 'exploratory' nunca reduz o rigor de um pedido que já exige raciocínio.
    await setOperator(root, { riskPosture: 'exploratory' });
    const risky = await plan(root, 'codex', 'Rever a arquitectura de autenticação em produção',
      { role: 'it-project-manager', workflow: 'solution-briefing', planned: true, approved: true });
    assert.equal(risky.model.tier, 'thinking');
    assert.match(await readFile(join(root, '.agentforge/OPERATOR.md'), 'utf8'), /só pode aumentar o rigor/);
    assert.match(await readFile(join(root, '.agentforge/templates/decision-record.md'), 'utf8'), /Opções consideradas/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
