import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { recommenderFiles } from '../vendor.js';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('a competência de terceiros embebida coincide com o resumo declarado', () => {
  const entries = Object.entries(recommenderFiles).sort(([a], [b]) => (a < b ? -1 : 1));
  const actual = createHash('sha256').update(JSON.stringify(entries)).digest('hex');
  const notices = readFileSync(`${root}THIRD_PARTY_NOTICES.md`, 'utf8');
  assert.equal(/Resumo SHA-256.*`([a-f0-9]{64})`/.exec(notices)?.[1], actual);
});

test('os fluxos de CI fixam acções por SHA e declaram permissões mínimas', () => {
  const dir = `${root}.github/workflows/`;
  const files = readdirSync(dir).filter(name => name.endsWith('.yml'));
  assert.ok(files.length >= 3);
  for (const name of files) {
    const text = readFileSync(dir + name, 'utf8');
    for (const [, action, ref] of text.matchAll(/^\s*-?\s*uses:\s*([^@\s]+)@(\S+)/gm)) {
      assert.match(ref, /^[a-f0-9]{40}$/, `${name}: ${action}@${ref} não está fixada por SHA`);
    }
    assert.match(text, /^permissions:/m, `${name}: sem bloco permissions ao nível do fluxo`);
  }
  const release = readFileSync(`${dir}release.yml`, 'utf8');
  assert.match(release, /sha256sum/);
  assert.match(release, /attest-build-provenance/);
  assert.ok(readFileSync(`${root}.github/dependabot.yml`, 'utf8').includes('github-actions'));
});
