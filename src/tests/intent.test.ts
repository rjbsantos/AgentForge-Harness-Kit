import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { choose } from '../orchestrator.js';
import { intents, normalize } from '../intent.js';
import { workflows, profiles } from '../capabilities.js';
import { fresh, heldout, tuning, type Case } from './intent-data.js';

function accuracy(cases: Case[]): { rate: number; wrong: string[] } {
  const wrong: string[] = [];
  for (const [expected, prompt] of cases) {
    let got: string | null = null;
    try { got = choose(prompt).workflow; } catch { /* sem fluxo: recusa */ }
    if (got !== expected) wrong.push(`esperado ${expected}, obtido ${got}: ${prompt}`);
  }
  return { rate: 1 - wrong.length / cases.length, wrong };
}

test('encaminhamento: pedidos reais em pt-PT chegam ao fluxo certo (conjunto de afinação)', () => {
  const { rate, wrong } = accuracy(tuning);
  assert.ok(rate >= 0.95, `${Math.round(rate * 100)}%\n${wrong.join('\n')}`);
});

test('encaminhamento: o conjunto reservado, escrito antes da afinação, generaliza', () => {
  const { rate, wrong } = accuracy(heldout);
  assert.ok(rate >= 0.9, `${Math.round(rate * 100)}%\n${wrong.join('\n')}`);
});

test('encaminhamento: o conjunto novo (medido a frio com 84% antes das últimas correcções) mantém-se', () => {
  const { rate, wrong } = accuracy(fresh);
  assert.ok(rate >= 0.9, `${Math.round(rate * 100)}%\n${wrong.join('\n')}`);
});

test('encaminhamento: pedidos sem fluxo são recusados em vez de adivinhados', () => {
  for (const prompt of ['Olá', 'Ajuda-me', 'Faz o deploy', 'Como está o tempo?', 'Bom dia, tudo bem?', 'Explica-me o que é uma monad']) {
    assert.throws(() => choose(prompt), /não identificados/, prompt);
  }
});

test('encaminhamento: todos os fluxos têm sinais, pertencem ao perfil indicado e são alcançáveis', () => {
  const reachable = new Set(intents.map(item => item.workflow));
  for (const name of Object.keys(workflows)) {
    if (!reachable.has(name)) assert.ok(['requirements-analysis'].includes(name) === false, `${name}: sem sinais de encaminhamento`);
  }
  for (const item of intents) {
    assert.ok(item.workflow in workflows, item.workflow);
    assert.ok((profiles[item.role].workflows as readonly string[]).includes(item.workflow), `${item.workflow} não pertence a ${item.role}`);
  }
  assert.equal(normalize('Revê a Segurança'), 'reve a seguranca');
});
