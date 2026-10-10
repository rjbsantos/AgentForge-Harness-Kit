import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { activePermits, currentBranch, evaluate, grantPermit, revokePermits } from '../guard.js';
import { guardHookStatus, installGuardHook, removeGuardHook } from '../hooks.js';
import { install } from '../installer.js';
import { verifyAudit } from '../audit.js';

const cli = fileURLToPath(new URL('../cli/index.js', import.meta.url));

async function project(fn: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-guard-'));
  try { await install(root, ['claude']); await fn(root); } finally { await rm(root, { recursive: true, force: true }); }
}

const denied = async (root: string, command: string, branch = 'feature/x') => (await evaluate(root, command, branch));

test('guarda: bloqueia commit e push para main, push forçado e publicação; deixa passar o trabalho normal', () => project(async root => {
  for (const [command, branch, rule] of [
    ['git commit -m "x"', 'main', 'commit-em-main'],
    ['git add -A && git commit -m x', 'master', 'commit-em-main'],
    ['git -C . commit -m x', 'main', 'commit-em-main'],
    ['git merge feature', 'main', 'commit-em-main'],
    ['git push origin main', 'feature/x', 'push-para-main'],
    ['git push origin HEAD:main', 'feature/x', 'push-para-main'],
    ['git push', 'main', 'push-para-main'],
    ['git push -u origin HEAD', 'main', 'push-para-main'],
    ['git push --force origin feature/x main', 'feature/x', 'push-forcado'],
    ['git push -f origin +main', 'feature/x', 'push-forcado'],
    ['git push origin --delete main', 'feature/x', 'push-forcado'],
    ['git push origin v1.2.0', 'feature/x', 'publicar-tag'],
    ['git push --tags', 'feature/x', 'publicar-tag'],
    ['git tag v1.2.0', 'feature/x', 'criar-tag'],
    ['gh release create v1.2.0 a.tgz', 'feature/x', 'publicar'],
    ['gh pr merge 12 --merge', 'feature/x', 'publicar'],
    ['cd app && npm publish', 'feature/x', 'publicar'],
    ['FOO=1 sudo git commit -m x', 'main', 'commit-em-main']
  ] as const) {
    const decision = await denied(root, command, branch);
    assert.equal(decision.allow, false, command);
    assert.equal(decision.rule, rule, command);
    assert.ok(decision.reason);
  }
  for (const [command, branch] of [
    ['git commit -m "x"', 'feature/x'], ['git push -u origin feature/x', 'feature/x'], ['git push', 'feature/x'],
    ['git status && git diff', 'main'], ['git tag -l', 'main'], ['git tag -d v1', 'main'], ['git log --oneline', 'main'],
    ['git push --force-with-lease origin feature/x', 'feature/x'], ['gh pr create --fill', 'feature/x'],
    ['gh release list', 'main'], ['npm test && npm run build', 'main'], ['echo "git commit"', 'feature/x']
  ] as const) {
    assert.equal((await denied(root, command, branch)).allow, true, command);
  }
}));

test('guarda: uma autorização humana com prazo liberta só o seu âmbito e expira', () => project(async root => {
  assert.equal((await denied(root, 'git commit -m x', 'main')).allow, false);
  await grantPermit(root, 'main', 10);
  assert.equal((await denied(root, 'git commit -m x', 'main')).allow, true);
  assert.equal((await denied(root, 'gh release create v1 x', 'main')).allow, false); // âmbito diferente
  assert.equal((await activePermits(root)).length, 1);
  await revokePermits(root);
  assert.equal((await denied(root, 'git commit -m x', 'main')).allow, false);
  await assert.rejects(grantPermit(root, 'main', 0), /Duração inválida/);
  await assert.rejects(grantPermit(root, 'publish', 9999), /Duração inválida/);
  const path = join(root, '.agentforge/work/guard-permit.json');
  await grantPermit(root, 'publish', 1);
  const expired = JSON.parse(await readFile(path, 'utf8'));
  expired[0].expiresAt = new Date(Date.now() - 1000).toISOString();
  await writeFile(path, JSON.stringify(expired));
  assert.equal((await denied(root, 'npm publish', 'main')).allow, false);
  assert.equal((await verifyAudit(root)).ok, true);
}));

test('guarda: o hook instala-se, deteta alteração e remove-se sem tocar no resto', () => project(async root => {
  await mkdir(join(root, '.claude'), { recursive: true });
  await writeFile(join(root, '.claude/settings.json'), JSON.stringify({ permissions: { allow: ['Bash(ls)'] } }));
  assert.equal(await guardHookStatus(root), 'absent');
  assert.match(await installGuardHook(root), /acrescentado/);
  assert.equal(await guardHookStatus(root), 'ok');
  assert.match(await installGuardHook(root), /já instalado/);
  const settings = JSON.parse(await readFile(join(root, '.claude/settings.json'), 'utf8'));
  assert.equal(settings.hooks.PreToolUse[0].matcher, 'Bash');
  assert.deepEqual(settings.permissions, { allow: ['Bash(ls)'] });
  settings.hooks.PreToolUse[0].hooks[0].command += '; true';
  await writeFile(join(root, '.claude/settings.json'), JSON.stringify(settings));
  assert.equal(await guardHookStatus(root), 'altered');
  await assert.rejects(installGuardHook(root), /foi alterado/);
  const doctor = spawnSync(process.execPath, [cli, 'doctor', '--project', root], { encoding: 'utf8' });
  assert.equal(doctor.status, 1);
  assert.match(doctor.stdout, /guarda: o comando/);
  settings.hooks.PreToolUse[0].hooks[0].command = 'agentforge guard check --project "$CLAUDE_PROJECT_DIR"';
  await writeFile(join(root, '.claude/settings.json'), JSON.stringify(settings));
  assert.match(await removeGuardHook(root), /removido/);
  assert.deepEqual(JSON.parse(await readFile(join(root, '.claude/settings.json'), 'utf8')), { permissions: { allow: ['Bash(ls)'] } });
}));

test('guarda: o comando `guard check` bloqueia com código 2 no ramo main e deixa passar noutro', () => project(async root => {
  const git = (...args: string[]) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  assert.equal(currentBranch(root), 'main');
  const check = (command: string, tool = 'Bash') => spawnSync(process.execPath, [cli, 'guard', 'check', '--project', root],
    { encoding: 'utf8', input: JSON.stringify({ tool_name: tool, tool_input: { command } }) });
  const blocked = check('git commit -m "x"');
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /ramo próprio/);
  assert.equal(check('git commit -m "x"', 'Edit').status, 0);
  assert.equal(check('ls').status, 0);
  assert.equal(spawnSync(process.execPath, [cli, 'guard', 'check', '--project', root], { encoding: 'utf8', input: 'não é json' }).status, 0);
  git('checkout', '-q', '-b', 'feature/x');
  assert.equal(currentBranch(root), 'feature/x');
  assert.equal(check('git commit -m "x"').status, 0);
  assert.match(await readFile(join(root, '.agentforge/work/audit.jsonl'), 'utf8'), /guard\.deny/);
  // permissão só por terminal: com stdin redireccionado, é recusada
  const refused = spawnSync(process.execPath, [cli, 'guard', 'permit-main', '--project', root], { encoding: 'utf8', input: 's\n' });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /terminal interactivo/);
  assert.equal(spawnSync(process.execPath, [cli, 'guard', 'nope', '--project', root]).status, 2);
}));
