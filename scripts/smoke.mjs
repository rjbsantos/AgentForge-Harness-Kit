// Teste de empacotamento ponta-a-ponta: embala, instala o tarball num projeto
// limpo e valida a instalação. `npm test` não cobre isto porque corre sobre
// `dist/` local, onde erros do campo `files` e artefactos obsoletos passam.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const work = mkdtempSync(join(tmpdir(), 'agentforge-smoke-'));
let failures = 0;
let tarball;

function run(file, args, options = {}) {
  return execFileSync(file, args, { encoding: 'utf8', stdio: 'pipe', ...options });
}

// O Node recusa executar `npm.cmd` via execFile sem shell (EINVAL), por isso
// no Windows passa-se pela shell com os argumentos citados.
function npm(args, options = {}) {
  return process.platform === 'win32'
    ? run('npm.cmd', args.map((a) => `"${a}"`), { ...options, shell: true })
    : run('npm', args, options);
}

function cli(project, args) {
  const entry = join(project, 'node_modules', 'agentforge-harness-kit', 'dist', 'cli', 'index.js');
  return run(process.execPath, [entry, ...args, '--project', project]);
}

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`ok   ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL ${label}${detail ? ` -- ${detail}` : ''}`);
  }
}

function project(name) {
  const dir = join(work, name);
  mkdirSync(dir);
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version: '1.0.0', private: true }));
  npm(['install', '--no-audit', '--no-fund', tarball], { cwd: dir });
  return dir;
}

console.log(`# smoke em ${work}`);
try {
  const packed = JSON.parse(npm(['pack', '--json', '--pack-destination', work], { cwd: root }));
  tarball = join(work, packed[0].filename);
  const shipped = packed[0].files.map((f) => f.path);

  check('tarball não inclui testes', !shipped.some((f) => f.startsWith('dist/tests/')));
  check('tarball não inclui source maps', !shipped.some((f) => f.endsWith('.map')));
  check('tarball inclui todos os módulos compilados', (() => {
    const built = run(process.execPath, ['-e',
      "const{readdirSync}=require('node:fs');" +
      "const walk=(d,p='')=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name,p+e.name+'/'):[p+e.name]);" +
      "process.stdout.write(walk('dist').join('\\n'))"], { cwd: root })
      .split('\n')
      .filter((f) => f.endsWith('.js') && !f.startsWith('tests/'));
    const missing = built.filter((f) => !shipped.includes(`dist/${f}`));
    if (missing.length) console.error(`     em falta: ${missing.join(', ')}`);
    return missing.length === 0;
  })());

  const globalPrefix = join(work, 'global');
  mkdirSync(globalPrefix);
  npm(['install', '--global', '--prefix', globalPrefix, '--no-audit', '--no-fund', tarball]);
  const globalBin = process.platform === 'win32' ? globalPrefix : join(globalPrefix, 'bin');
  const executable = join(globalBin, process.platform === 'win32' ? 'agentforge.cmd' : 'agentforge');
  check('instala CLI global a partir do tarball', existsSync(executable));
  const help = process.platform === 'win32'
    ? run('cmd.exe', ['/d', '/c', executable, '--help'])
    : run(executable, ['--help']);
  const reported = process.platform === 'win32'
    ? run('cmd.exe', ['/d', '/c', executable, '--version'])
    : run(executable, ['--version']);
  check('--version devolve a versão do pacote', reported.trim() === JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version);
  check('executável global responde', /^Uso: agentforge <install\|upgrade\|doctor\|/.test(help));

  // Um projeto com perfil de operador declarado.
  const withProfile = project('com-perfil');
  const installed = cli(withProfile, ['install', '--cli', 'all']);
  check('install reporta artefactos', installed.includes('.agentforge/HARNESS.md'));

  for (const file of [
    'AGENTS.md', 'CLAUDE.md', 'opencode.json', 'tui.json',
    '.agentforge/HARNESS.md', '.agentforge/OPERATOR.md', '.agentforge/manifest.json',
    '.agentforge/work/operator.json', '.agentforge/roles/solution-advisor.md',
    '.agentforge/templates/decision-record.md', '.agentforge/workflows/automation-opportunity.json',
    '.agentforge/workflows/repository-audit.json', '.agents/workflows/repository-audit.md',
    '.agents/skills/forge-tradeoff/SKILL.md', '.agents/skills/forge-spike/SKILL.md',
    '.claude/agents/solution-advisor.md', '.codex/agents/solution-advisor.toml',
    '.codex/agents/code-critic.toml', '.codex/agents/secops.toml', '.codex/agents/reverse-engineer.toml',
    '.opencode/agents/solution-advisor.md', '.opencode/themes/agentforge.json',
    '.opencode/commands/agentforge.md',
  ]) check(`gera ${file}`, existsSync(join(withProfile, ...file.split('/'))));
  check('define o agente AgentForge como predefinido no OpenCode',
    JSON.parse(readFileSync(join(withProfile, 'opencode.json'), 'utf8')).default_agent === 'agentforge');
  check('activa o tema AgentForge na TUI do OpenCode',
    JSON.parse(readFileSync(join(withProfile, 'tui.json'), 'utf8')).theme === 'agentforge');

  cli(withProfile, ['operator', 'set', '--roles', 'it-project-manager,ai-engineer', '--risk', 'cautious']);
  const operator = JSON.parse(cli(withProfile, ['operator', 'show']));
  check('perfil do operador persiste', operator.roles?.[0] === 'it-project-manager', JSON.stringify(operator));

  const hybrid = 'Prova de conceito de um agente MCP para automatizar o fecho de incidentes';
  const decision = JSON.parse(cli(withProfile, ['plan', '--cli', 'opencode', '--prompt', hybrid]));
  check('pedido híbrido resolve pelo perfil', decision.selectedBy === 'operator', String(decision.selectedBy));
  check('pedido híbrido escolhe it-project-manager', decision.role === 'it-project-manager', String(decision.role));
  check('postura cautelosa escala o tier', decision.model?.tier === 'thinking', String(decision.model?.tier));
  check('pedido de auditoria declara paralelismo limitado',
    JSON.stringify(JSON.parse(cli(withProfile, ['plan', '--cli', 'opencode', '--role', 'senior-developer',
      '--workflow', 'repository-audit', '--prompt', 'Audit repository'])).coordination.parallelGroups) ===
      '[{"after":[1],"workers":[{"step":2,"role":"code-critic","skills":["forge-audit"],"agent":"code-critic"},{"step":3,"role":"secops","skills":["forge-audit"],"agent":"secops"},{"step":4,"role":"reverse-engineer","skills":["forge-performance"],"agent":"reverse-engineer"}]}]');
  check('contexto respeita orçamento estimado',
    JSON.parse(cli(withProfile, ['context', '--budget-tokens', '600'])).budget.limitTokens === 600);
  cli(withProfile, ['record', '--role', 'it-project-manager', '--workflow', 'continuous-improvement',
    '--result', 'failed', '--validation', 'failed', '--duration-ms', '5', '--tokens', '17', '--error-code', 'SMOKE_FAILURE']);
  cli(withProfile, ['record', '--role', 'it-project-manager', '--workflow', 'continuous-improvement',
    '--result', 'failed', '--validation', 'failed', '--duration-ms', '7', '--tokens', '19', '--error-code', 'SMOKE_FAILURE']);
  const insights = JSON.parse(cli(withProfile, ['insights']));
  check('insights agregam execuções e erro recorrente',
    insights.totalRuns === 2 && insights.recurringErrors[0]?.occurrences === 2);

  // Sem perfil, a ambiguidade continua a ser um erro: a melhoria não pode
  // transformar-se numa adivinha silenciosa.
  const noProfile = project('sem-perfil');
  cli(noProfile, ['install', '--cli', 'all']);
  let ambiguous = '';
  try {
    cli(noProfile, ['plan', '--cli', 'opencode', '--prompt', hybrid]);
  } catch (error) {
    ambiguous = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
  check('sem perfil mantém erro de ambiguidade', ambiguous.includes('Pedido ambíguo'), ambiguous.trim());

  // Estado local sobrevive à reinstalação; desinstalar não deixa lixo.
  cli(withProfile, ['install', '--cli', 'all']);
  check('reinstalar preserva o perfil',
    JSON.parse(cli(withProfile, ['operator', 'show'])).roles?.[0] === 'it-project-manager');
  const state = cli(withProfile, ['status']);
  check('status não reporta ficheiros alterados',
    /Ficheiros alterados\/ausentes: nenhum/.test(state), state.trim());

  cli(withProfile, ['uninstall', '--cli', 'all']);
  // O ficheiro de instruções é removido quando pertencia inteiramente ao kit;
  // se o utilizador tinha texto próprio, sobrevive sem o bloco.
  const key = join(withProfile, 'AGENTS.md');
  check('uninstall remove o bloco de instruções',
    !existsSync(key) || !readFileSync(key, 'utf8').includes('agentforge:'));
  check('uninstall preserva o estado local', existsSync(join(withProfile, '.agentforge', 'work', 'operator.json')));
} catch (error) {
  failures += 1;
  console.error(`FAIL execução interrompida -- ${error.message}`);
  if (error.stdout) console.error(String(error.stdout));
  if (error.stderr) console.error(String(error.stderr));
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(failures === 0 ? '\n# smoke: tudo ok' : `\n# smoke: ${failures} falha(s)`);
process.exit(failures === 0 ? 0 : 1);
