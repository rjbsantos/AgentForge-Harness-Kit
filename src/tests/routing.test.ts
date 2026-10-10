import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { classify, route } from '../routing.js';
import { install } from '../installer.js';

test('thinking prompts stay on a thinking profile even with a plan', () => {
  for (const prompt of [
    'Design the architecture for a new service',
    'Investigar causa raiz de um bug desconhecido',
    'Analisa alternativas para uma migração',
    'Plan a new feature',
    'Update production permissions based on this plan'
  ]) {
    assert.equal(classify(prompt, { planned: true, approved: true }).tier, 'thinking', prompt);
  }
  assert.equal(classify('Update production permissions based on this plan', { planned: true, approved: true }).agent, 'secops');
  assert.equal(classify('Do the task', { planned: true, approved: true, highRisk: true }).tier, 'thinking');
});

test('approved low-risk tasks use economy; missing plan or approval escalates', () => {
  assert.equal(classify('Implement the approved endpoint spec', { planned: true, approved: true }).tier, 'economy');
  assert.equal(classify('Execute the approved plan', { planned: true, approved: true }).tier, 'economy');
  assert.equal(classify('Implement the endpoint spec', { planned: true }).tier, 'thinking');
  assert.equal(classify('Implement the endpoint spec').tier, 'thinking');
  assert.equal(classify('Corrigir gralha no título').tier, 'economy');
  assert.throws(() => classify('   '), /vazio/);
});

test('route loads per-host model IDs or explicitly reports host default', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-route-'));
  try {
    const dir = join(root, '.agentforge', 'work');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'model-profiles.json'), JSON.stringify({
      opencode: { thinking: 'provider/strong', economy: 'provider/cheap' }
    }));
    const thought = await route(root, 'opencode', 'Design a new architecture');
    assert.deepEqual([thought.tier, thought.model, thought.modelSelection], ['thinking', 'provider/strong', 'configured']);
    const execution = await route(root, 'opencode', 'Implement the approved widget', { planned: true, approved: true });
    assert.deepEqual([execution.tier, execution.model, execution.agent, execution.subagents],
      ['economy', 'provider/cheap', 'lead-developer', ['qa']]);
    const noModel = await route(root, 'claude', 'Design architecture');
    assert.deepEqual([noModel.model, noModel.modelSelection], [null, 'host-default']);
    await writeFile(join(dir, 'model-profiles.json'), JSON.stringify({ opencode: { economy: '' } }));
    await assert.rejects(route(root, 'opencode', 'Test', { planned: true, approved: true }), /inválido/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('installs routing policy in every host and preserves model preferences', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-route-install-'));
  try {
    await install(root, ['opencode', 'codex', 'claude', 'antigravity']);
    assert.match(await readFile(join(root, '.agentforge', 'MODEL_ROUTING.md'), 'utf8'), /thinking/);
    assert.match(await readFile(join(root, '.agents', 'skills', 'forge-routing', 'SKILL.md'), 'utf8'), /name: forge-routing/);
    assert.match(await readFile(join(root, '.claude', 'skills', 'forge-routing', 'SKILL.md'), 'utf8'), /name: forge-routing/);
    assert.match(await readFile(join(root, '.opencode', 'agents', 'secops.md'), 'utf8'), /mode: subagent/);
    const config = join(root, '.agentforge', 'work', 'model-profiles.json');
    await writeFile(config, '{"claude":{"thinking":"opus","economy":"haiku"}}');
    await install(root, ['claude']);
    assert.equal(JSON.parse(await readFile(config, 'utf8')).claude.economy, 'haiku');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('CLI route emits a machine-readable decision with the selected model', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-route-cli-'));
  try {
    await mkdir(join(root, '.agentforge', 'work'), { recursive: true });
    await writeFile(join(root, '.agentforge', 'work', 'model-profiles.json'),
      '{"claude":{"thinking":"opus","economy":"haiku"}}');
    const cli = fileURLToPath(new URL('../cli/index.js', import.meta.url));
    const result = JSON.parse(execFileSync(process.execPath,
      [cli, 'route', '--project', root, '--cli', 'claude',
        '--prompt', 'Implement the accepted widget', '--planned', '--approved'], { encoding: 'utf8' }));
    assert.deepEqual([result.tier, result.model, result.agent, result.modelSelection],
      ['economy', 'haiku', 'lead-developer', 'configured']);
  } finally { await rm(root, { recursive: true, force: true }); }
});

// Corpus rotulado: regista o comportamento esperado do classificador e protege contra regressões
// ao alterar as expressões regulares. Cada linha: pedido, opções, nível esperado.
const corpus: [string, { planned?: boolean; approved?: boolean }, 'thinking' | 'economy'][] = [
  ['Implement the approved endpoint spec', { planned: true, approved: true }, 'economy'],
  ['Implementa a especificação aprovada', { planned: true, approved: true }, 'economy'],
  ['Corrigir gralha no título', {}, 'economy'],
  ['Format the changelog', {}, 'economy'],
  ['Rename the helper function', {}, 'economy'],
  ['Design the architecture for billing', { planned: true, approved: true }, 'thinking'],
  ['Compare two caching strategies', { planned: true, approved: true }, 'thinking'],
  ['Pesquisa alternativas para o motor de pesquisa', { planned: true, approved: true }, 'thinking'],
  ['Deploy the service to production', { planned: true, approved: true }, 'thinking'],
  ['Apagar a base de dados de testes', { planned: true, approved: true }, 'thinking'],
  ['Rotate the payment credentials', { planned: true, approved: true }, 'thinking'],
  ['Implement the endpoint spec', {}, 'thinking'],
  ['Add a button to the page', { planned: true }, 'thinking'],
  // Só leitura: não escala por palavras de risco isoladas
  ['Explain how auth works', { planned: true, approved: true }, 'economy'],
  ['Lista as tabelas da base de dados', { planned: true, approved: true }, 'economy'],
  ['Show the database schema', { planned: true, approved: true }, 'economy'],
  // Leitura que expõe segredos, ou que altera estado, continua a escalar
  ['Show the production secrets', { planned: true, approved: true }, 'thinking'],
  ['Mostra as credenciais de acesso', { planned: true, approved: true }, 'thinking'],
  ['Explain and then delete the production database', { planned: true, approved: true }, 'thinking'],
  ['Update the auth middleware', { planned: true, approved: true }, 'thinking']
];

test('labelled corpus keeps the classifier stable', () => {
  const wrong = corpus.filter(([prompt, options, tier]) => classify(prompt, options).tier !== tier)
    .map(([prompt]) => prompt);
  assert.deepEqual(wrong, []);
});

test('read-only requests skip secops unless they touch secrets or change state', () => {
  const options = { planned: true, approved: true };
  assert.equal(classify('Explain how auth works', options).agent, 'lead-developer');
  assert.equal(classify('Show the production secrets', options).agent, 'secops');
  assert.equal(classify('Explain how to deploy to production', options).agent, 'secops');
  assert.equal(classify('Explain how auth works', { ...options, highRisk: true }).agent, 'secops');
  assert.equal(classify('Update the auth middleware', options).agent, 'secops');
});

test('pedidos destrutivos ou sobre segredos em vários idiomas escalam mesmo com plano aprovado', () => {
  const options = { planned: true, approved: true };
  for (const prompt of [
    'borra la base de datos de producción', 'supprime la base de données de production', 'elimina las credenciales del servidor',
    'DROP TABLE users', 'rm -rf / on the server', 'Truncate the customers table',
    'push the hotfix straight to main and release it to customers', 'reset the admin password',
    'grant admin permissions to everyone', 'cambia la contraseña de root', 'update the api key in the config',
    'git push --force origin main', 'chmod 777 the whole server', 'disable the firewall', 'Apaga a palavra-passe do administrador'
  ]) {
    const decision = classify(prompt, options);
    assert.equal(decision.tier, 'thinking', prompt);
    assert.equal(decision.agent, 'secops', prompt);
  }
  // Leitura sem segredos continua a poder ser económica.
  for (const prompt of ['Lista as tabelas da base de dados', 'Show the release notes template', 'Implement the approved widget']) {
    assert.equal(classify(prompt, options).tier, 'economy', prompt);
  }
});
