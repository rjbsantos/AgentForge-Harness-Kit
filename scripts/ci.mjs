#!/usr/bin/env node
// CI local: repete os passos de .github/workflows/ci.yml para quando a CI remota não está disponível
// (por exemplo, conta GitHub sem quota ou com o pagamento em atraso). Não cobre o Windows.
//
//   npm run ci                       instalação limpa, testes, auditoria, dist/ e smoke, em Node 20 e 22
//   npm run ci -- --skip-install     não reinstala dependências (npm ci apaga node_modules)
//   npm run ci -- --node 22          só estas versões de Node nos testes (lista separada por vírgulas, ou «none»)
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const skipInstall = args.includes('--skip-install');
const nodeIndex = args.indexOf('--node');
const versions = nodeIndex === -1 ? ['20', '22'] : (args[nodeIndex + 1] ?? '').split(',').filter(v => v && v !== 'none');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const results = [];

function step(name, command, commandArgs) {
  process.stdout.write(`\n== ${name}\n`);
  const run = spawnSync(command, commandArgs, { stdio: 'inherit' });
  const ok = run.status === 0;
  results.push([name, ok]);
  return ok;
}

if (!skipInstall) step('npm ci', npm, ['ci']);
step('npm test', npm, ['test']);
step('npm audit --audit-level=high', npm, ['audit', '--audit-level=high']);
// `npm test` reconstrói dist/: tem de ficar igual ao que está versionado.
step('dist/ sincronizado com src/', 'git', ['diff', '--exit-code', '--', 'dist']);
step('npm run smoke', npm, ['run', 'smoke']);
for (const version of versions) step(`testes em Node ${version}`, npx, ['-y', '-p', `node@${version}`, 'node', 'scripts/test.mjs']);

console.log('\n== Resumo');
for (const [name, ok] of results) console.log(`${ok ? 'ok   ' : 'FALHA'} ${name}`);
const failed = results.filter(([, ok]) => !ok).length;
console.log(failed ? `\nCI local: ${failed} passo(s) falharam` : '\nCI local: tudo ok (Windows não coberto)');
process.exit(failed ? 1 : 0);
