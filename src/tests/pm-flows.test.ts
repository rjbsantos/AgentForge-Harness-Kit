import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { skills } from '../skills.js';
import { templates, workflows, profiles, validateCatalog } from '../capabilities.js';
import { choose } from '../orchestrator.js';
import { commands } from '../commands.js';

test('fluxos de gestão: plano, alterações, comunicação e orçamento estão completos, encaminhados e compostos', () => {
  validateCatalog();
  for (const [name, skill, template] of [['project-plan', 'forge-project-planning', 'project-plan'],
    ['change-control', 'forge-change-control', 'change-control'], ['stakeholder-communication', 'forge-communication', 'stakeholder-plan'],
    ['budget-tracking', 'forge-budget', 'budget-tracking']]) {
    assert.ok(workflows[name].skills.includes(skill), `${name}: falta ${skill}`);
    assert.ok(template in templates, template);
    assert.ok((profiles['project-manager'].workflows as readonly string[]).includes(name), name);
    assert.ok((profiles['it-project-manager'].workflows as readonly string[]).includes(name), name);
    assert.ok(`af-${name}` in commands, name);
    assert.match(skills[skill], /Validação:/);
  }
  assert.equal(choose('Preciso do plano do projecto com marcos e caminho crítico').workflow, 'project-plan');
  assert.equal(choose('O cliente pediu para aumentar o âmbito, faz o controlo de alterações').workflow, 'change-control');
  assert.equal(choose('Prepara o plano de comunicação para as partes interessadas').workflow, 'stakeholder-communication');
  assert.equal(choose('Faz o acompanhamento do orçamento e a previsão de custos do projecto').workflow, 'budget-tracking');
  // Nada se inventa: valores com fonte, sem envio, sem alteração à linha de base antes da decisão.
  assert.match(skills['forge-budget'], /sem fonte não entra|Um valor sem fonte não entra/);
  assert.match(skills['forge-budget'], /Nunca comprometer custos/);
  assert.match(skills['forge-communication'], /O kit não envia nada/);
  assert.match(skills['forge-change-control'], /Nada se implementa antes/);
  assert.match(skills['forge-project-planning'], /Um número único sem fonte é um palpite/);
  // Complementam-se: as alterações aprovadas chegam ao plano, à comunicação e à implementação técnica.
  assert.deepEqual(workflows['change-control'].uses.map(item => item.workflow), ['project-plan', 'stakeholder-communication', 'change-request']);
  assert.ok(workflows['budget-tracking'].uses.some(item => item.workflow === 'change-control'));
  assert.ok(workflows['project-status'].uses.some(item => item.workflow === 'budget-tracking'));
  assert.ok(workflows['project-status'].steps.length >= 4);
});
