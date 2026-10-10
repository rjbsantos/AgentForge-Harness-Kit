import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compareVersions, fetchLatest, updateNotice, updateStatus } from '../update.js';
import { kitVersion } from '../version.js';

const cli = fileURLToPath(new URL('../cli/index.js', import.meta.url));

async function withHome<T>(fn: (home: string) => Promise<T>): Promise<T> {
  const home = await mkdtemp(join(tmpdir(), 'agentforge-update-'));
  const saved = { home: process.env.AGENTFORGE_HOME, off: process.env.AGENTFORGE_NO_UPDATE_CHECK, ci: process.env.CI };
  process.env.AGENTFORGE_HOME = home;
  delete process.env.AGENTFORGE_NO_UPDATE_CHECK;
  delete process.env.CI;
  try { return await fn(home); } finally {
    for (const [key, value] of [['AGENTFORGE_HOME', saved.home], ['AGENTFORGE_NO_UPDATE_CHECK', saved.off], ['CI', saved.ci]] as const) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await rm(home, { recursive: true, force: true });
  }
}

test('versões: compara major, minor e patch numericamente e ignora o prefixo v', () => {
  assert.ok(compareVersions('0.11.0', '0.12.0') < 0);
  assert.ok(compareVersions('0.9.2', '0.10.0') < 0); // numérico, não lexicográfico
  assert.ok(compareVersions('1.0.0', 'v0.99.9') > 0);
  assert.equal(compareVersions('v1.2.3', '1.2.3'), 0);
  assert.ok(Number.isNaN(compareVersions('abc', '1.0.0')));
});

test('actualização: consulta quando há rede permitida, guarda em cache e avisa só se estiver desactualizada', () => withHome(async home => {
  let calls = 0;
  const fetcher = async () => { calls++; return '99.0.0'; };
  const info = await updateStatus({ allowNetwork: true, fetcher });
  assert.deepEqual([info.outdated, info.latest, info.source, calls], [true, '99.0.0', 'network', 1]);
  assert.match(updateNotice(info)!, /99\.0\.0 disponível.*gh release download v99\.0\.0.*agentforge upgrade/s);
  // dentro do prazo usa a cache e não volta à rede
  const again = await updateStatus({ allowNetwork: true, fetcher });
  assert.deepEqual([again.source, calls], ['cache', 1]);
  // sem terminal (agente, CI) nunca vai à rede, mesmo com a cache expirada
  const stale = await updateStatus({ allowNetwork: false, fetcher, now: Date.now() + 3 * 86_400_000 });
  assert.deepEqual([stale.source, calls], ['cache', 1]);
  // com a cache expirada e rede permitida, volta a consultar
  await updateStatus({ allowNetwork: true, fetcher, now: Date.now() + 3 * 86_400_000 });
  assert.equal(calls, 2);
  // já na última: sem aviso
  await writeFile(join(home, 'update-check.json'), JSON.stringify({ latest: kitVersion, checkedAt: Date.now() }));
  const current = await updateStatus({ allowNetwork: true, fetcher });
  assert.equal(current.outdated, false);
  assert.equal(updateNotice(current), undefined);
}));

test('actualização: uma falha de rede é silenciosa e não repete a consulta de imediato; pode ser desactivada', () => withHome(async home => {
  let calls = 0;
  const failing = async () => { calls++; return undefined; };
  const first = await updateStatus({ allowNetwork: true, fetcher: failing });
  assert.deepEqual([first.outdated, first.source, calls], [false, 'unknown', 1]);
  await updateStatus({ allowNetwork: true, fetcher: failing });
  assert.equal(calls, 1); // recuo de algumas horas
  assert.equal(JSON.parse(await readFile(join(home, 'update-check.json'), 'utf8')).latest, undefined);
  process.env.AGENTFORGE_NO_UPDATE_CHECK = '1';
  assert.equal((await updateStatus({ allowNetwork: true, fetcher: async () => '99.0.0' })).source, 'disabled');
  delete process.env.AGENTFORGE_NO_UPDATE_CHECK;
  process.env.CI = 'true';
  assert.equal((await updateStatus({ allowNetwork: true, fetcher: async () => '99.0.0' })).source, 'disabled');
}));

test('actualização: o comando de consulta pode ser indicado e uma resposta que não é versão é ignorada', () => withHome(async () => {
  process.env.AGENTFORGE_UPDATE_COMMAND = 'echo v7.8.9';
  try { assert.equal(await fetchLatest(), '7.8.9'); } finally { delete process.env.AGENTFORGE_UPDATE_COMMAND; }
  process.env.AGENTFORGE_UPDATE_COMMAND = 'echo not-a-version';
  try { assert.equal(await fetchLatest(), undefined); } finally { delete process.env.AGENTFORGE_UPDATE_COMMAND; }
  process.env.AGENTFORGE_UPDATE_COMMAND = 'exit 3';
  try { assert.equal(await fetchLatest(), undefined); } finally { delete process.env.AGENTFORGE_UPDATE_COMMAND; }
}));

test('actualização: o CLI avisa no stderr a partir da cache, sem alterar o stdout nem os hooks', () => withHome(async home => {
  await writeFile(join(home, 'update-check.json'), JSON.stringify({ latest: '99.0.0', checkedAt: Date.now() }));
  const env = { ...process.env, AGENTFORGE_HOME: home, AGENTFORGE_NO_UPDATE_CHECK: '', CI: '' };
  delete (env as Record<string, string | undefined>).CI;
  const version = spawnSync(process.execPath, [cli, '--version'], { encoding: 'utf8', env });
  assert.equal(version.stdout.trim(), kitVersion); // o stdout continua limpo
  assert.match(version.stderr, /99\.0\.0 disponível/);
  const quiet = spawnSync(process.execPath, [cli, 'hook-event', '--project', home], { encoding: 'utf8', env, input: '{}' });
  assert.equal(quiet.stderr, '');
  const gate = spawnSync(process.execPath, [cli, 'gate', '--prompt', 'melhora isto'], { encoding: 'utf8', env });
  assert.equal(gate.stderr, '');
  const off = spawnSync(process.execPath, [cli, '--version'], { encoding: 'utf8', env: { ...env, AGENTFORGE_NO_UPDATE_CHECK: '1' } });
  assert.equal(off.stderr, '');
}));
