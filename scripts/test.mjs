// O Node 20 interpreta `--test <dir>` como descoberta de testes, enquanto o 22+
// executa o caminho directamente, e nenhuma shell do Windows expande o glob
// `dist/tests/*.test.js`. Passar a lista explícita funciona em todas as versões.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = 'dist/tests';
const files = readdirSync(dir).filter((f) => f.endsWith('.test.js')).map((f) => `${dir}/${f}`);
if (!files.length) {
  console.error(`Nenhum teste encontrado em ${dir}/ — compilou com "npm run build"?`);
  process.exit(1);
}
// A chave do selo das lições vive fora do projecto; nos testes fica num directório descartável.
const home = mkdtempSync(join(tmpdir(), 'agentforge-home-'));
const run = spawnSync(process.execPath, ['--test', ...process.argv.slice(2), ...files],
  { stdio: 'inherit', env: { ...process.env, AGENTFORGE_HOME: home } });
rmSync(home, { recursive: true, force: true });
process.exit(run.status ?? 1);
