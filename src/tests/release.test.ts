import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { skills } from '../skills.js';
import { templates, workflows, profiles } from '../capabilities.js';
import { commands } from '../commands.js';
import { plan } from '../orchestrator.js';
import { install } from '../installer.js';

test('release-closure: percorre as 14 áreas da checklist e só publica com autorização expressa', () => {
  const flow = workflows['release-closure'];
  const steps = flow.steps.join('\n');
  for (const area of ['agentforge trace', 'Limpeza', 'Base de dados', 'Segurança', 'Design system', 'Documentação', 'Playwright',
    'Git', 'Semantic Versioning', 'rollback', 'Relatório final']) assert.match(steps, new RegExp(area), area);
  assert.match(steps, /validação N2/);
  assert.match(steps, /Com autorização/);
  assert.ok(flow.skills.includes('forge-release') && flow.skills.includes('forge-e2e'));
  // As áreas independentes correm em paralelo depois dos requisitos; a escrita fica num só responsável.
  assert.deepEqual(flow.parallelGroups[0].workers.map(worker => worker.role),
    ['code-critic', 'database-optimizer', 'reverse-engineer', 'secops', 'ui-visual-validator', 'tech-writer']);
  assert.ok(profiles['senior-developer'].workflows.includes('release-closure'));
  assert.ok('af-release-closure' in commands);
});

test('release-closure: o modelo contém as 14 áreas, o critério de publicação e o relatório final', () => {
  const template = templates['release-closure'];
  assert.equal([...template.matchAll(/^\| \d+ \|/gm)].length, 14);
  for (const text of ['Critério de publicação', 'vulnerabilidades críticas', 'Autorização para commit, tag e publicação',
    'Versão, commit e tag', 'Riscos conhecidos']) assert.ok(template.includes(text), text);
});

test('forge-release e forge-e2e fixam as regras de versão, publicação e instabilidade', () => {
  assert.match(skills['forge-release'], /Major para alterações incompatíveis/);
  assert.match(skills['forge-release'], /não subir a Major só por ser uma release nova/);
  assert.match(skills['forge-release'], /Nunca forçar o push nem mover ou apagar uma tag já publicada/);
  assert.match(skills['forge-release'], /silêncio não é aprovação/);
  assert.match(skills['forge-e2e'], /nunca produção/);
  assert.match(skills['forge-e2e'], /Não aumentar repetições, saltar ou desactivar/);
  assert.match(skills['forge-e2e'], /Não afirmar que todos os cenários possíveis/);
});

test('release-closure: plano por pedido, e a checklist é instalada nos projectos', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-release-'));
  try {
    await install(root, ['claude']);
    const proposal = await plan(root, 'claude', 'Preciso de fechar a versão 1.5.0 com a checklist de release');
    assert.equal(proposal.workflow, 'release-closure');
    assert.equal(proposal.status, 'proposed');
    assert.equal(proposal.coordination.mode, 'parallel-if-host-supports');
    assert.match(await readFile(join(root, '.agentforge/templates/release-closure.md'), 'utf8'), /Fecho da versão/);
    assert.match(await readFile(join(root, '.claude/commands/af-release-closure.md'), 'utf8'), /release-closure/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
