import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assessPrompt } from '../gate.js';
import { assessWithDecider } from '../decider.js';

const cli = fileURLToPath(new URL('../cli/index.js', import.meta.url));
const good = 'Há um erro 500 no endpoint /api/pagamentos quando o campo valor vem vazio; os testes devem passar';

// «Decisores» de teste: respondem como um modelo de decisão com o contrato do kit, sem rede.
const answer = (label: string, yes: number) => `cat >/dev/null; echo '{"label":"${label}","probabilities":{"sim":${yes},"nao":${1 - yes}}}'`;

test('decisões tipadas: pronto (sim/não), especificidade (pontuação) e fluxo (escolha com candidatos)', () => {
  const ready = assessPrompt(good);
  assert.equal(ready.decisions.ready.type, 'yes-no');
  assert.equal(ready.decisions.ready.value, true);
  assert.equal(ready.decisions.ready.calibrated, false);
  assert.equal(ready.decisions.specificity.type, 'score');
  assert.ok(ready.decisions.specificity.value > 0.6 && ready.decisions.specificity.value <= 1);
  assert.equal(ready.decisions.workflow.type, 'choice');
  assert.equal(ready.decisions.workflow.value, 'bug-investigation');
  assert.ok(ready.decisions.workflow.candidates.length >= 1);
  assert.ok(ready.decisions.workflow.candidates.every(item => item.score > 0 && item.score <= 1));
  const vague = assessPrompt('melhora isto');
  assert.equal(vague.decisions.ready.value, false);
  assert.ok(vague.decisions.specificity.value < 0.6);
});

test('decisor externo: só torna a porta mais exigente e nunca relaxa a heurística', async () => {
  // Sem decisor: igual à heurística.
  assert.equal((await assessWithDecider(good)).decider, undefined);
  // Concorda: continua pronto e regista a probabilidade.
  const agrees = await assessWithDecider(good, { decider: answer('sim', 0.92) });
  assert.equal(agrees.ready, true);
  assert.deepEqual(agrees.decider, { used: true, probability: 0.92 });
  // Discorda: o pedido passa a precisar de contexto, com uma pergunta acrescentada.
  const disagrees = await assessWithDecider(good, { decider: answer('nao', 0.2) });
  assert.equal(disagrees.ready, false);
  assert.equal(disagrees.decisions.ready.source, 'decider');
  assert.ok(disagrees.missing.some(item => item.field === 'contexto'));
  assert.ok(disagrees.missing.length <= 4);
  // O decisor dizer «sim» a um pedido vago não o liberta.
  const lenient = await assessWithDecider('melhora isto', { decider: answer('sim', 0.99) });
  assert.equal(lenient.ready, false);
});

test('decisor externo: escolhe o fluxo quando a heurística não identifica nenhum e falhas voltam à heurística', async () => {
  const route = `cat >/dev/null; echo '{"label":"release-closure","probabilities":{"release-closure":0.9,"sim":0.9,"nao":0.1}}'`;
  const unresolved = 'Vamos tratar da entrega 1.5.0 do projecto Alfa em breve';
  assert.equal(assessPrompt(unresolved).workflow, null);
  const routed = await assessWithDecider(unresolved, { decider: route });
  assert.equal(routed.workflow, 'release-closure');
  assert.equal(routed.decisions.workflow.source, 'decider');
  // um rótulo que não é um fluxo conhecido é ignorado
  const unknown = await assessWithDecider(unresolved, { decider: `cat >/dev/null; echo '{"label":"inventado","probabilities":{"inventado":0.99,"sim":0.9}}'` });
  assert.equal(unknown.workflow, null);
  for (const decider of ['exit 7', 'echo não é json', 'sleep 5', `cat >/dev/null; echo '{"label":"sim","probabilities":{"sim":7}}'`]) {
    const failed = await assessWithDecider(good, { decider, timeoutMs: 400 });
    assert.equal(failed.ready, true, decider);
    assert.equal(failed.decider?.used, false, decider);
    assert.ok(failed.decider?.error);
  }
});

test('decisor externo: o CLI aceita --decider só no gate e devolve o resultado tipado', () => {
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  const result = run('gate', '--prompt', good, '--decider', answer('sim', 0.9));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).decider.probability, 0.9);
  const blocked = run('gate', '--prompt', good, '--decider', answer('nao', 0.1));
  assert.equal(blocked.status, 3);
  assert.equal(run('plan', '--cli', 'claude', '--prompt', good, '--decider', 'true').status, 2);
});
