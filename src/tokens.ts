import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beginning, ending } from './blocks.js';
import { safe } from './installer.js';
import { targets } from './target.js';

// Mede o que o harness põe em contexto sem ninguém ver ("tokens fantasma"): instruções de arranque,
// texto do utilizador nos ficheiros de instruções e crescimento de estado, contexto e registos.
// A estimativa é a mesma do comando `context`: caracteres ÷ 4, não uma contagem exacta de um modelo.
export const startupBudgetTokens = 3000;
const estimate = (chars: number) => Math.ceil(chars / 4);

const startupFiles = ['.agentforge/HARNESS.md', '.agentforge/MODEL_ROUTING.md', '.agentforge/work/state.md',
  '.agentforge/work/context.md', '.agentforge/work/operator.json'];
const limits = { state: 600, context: 1200, userInstructions: 2000, log: 200_000 };

export interface TokenReport {
  startup: { files: { file: string; tokens: number }[]; total: number; budget: number };
  instructions: { file: string; managedTokens: number; userTokens: number }[];
  work: { file: string; tokens?: number; bytes?: number }[];
  findings: string[];
  estimate: 'chars-divided-by-4';
}

async function size(root: string, key: string): Promise<{ chars: number; bytes: number } | undefined> {
  const path = safe(root, key);
  if (!existsSync(path)) return undefined;
  const text = await readFile(path, 'utf8');
  return { chars: text.length, bytes: (await stat(path)).size };
}

export async function tokenReport(project: string): Promise<TokenReport> {
  const root = resolve(project);
  if (!existsSync(root)) throw new Error(`Projeto inexistente: ${root}`);
  const findings: string[] = [];
  const files: TokenReport['startup']['files'] = [];
  for (const file of startupFiles) {
    const found = await size(root, file);
    if (found) files.push({ file, tokens: estimate(found.chars) });
  }
  const instructions: TokenReport['instructions'] = [];
  for (const file of ['CLAUDE.md', 'AGENTS.md']) {
    const path = safe(root, file);
    if (!existsSync(path)) continue;
    let text = await readFile(path, 'utf8');
    let managed = 0;
    for (const target of targets) {
      const open = text.indexOf(beginning(target));
      const close = text.indexOf(ending(target));
      if (open !== -1 && close > open) {
        const end = close + ending(target).length;
        managed += end - open;
        text = text.slice(0, open) + text.slice(end);
      }
    }
    const entry = { file, managedTokens: estimate(managed), userTokens: estimate(text.length) };
    instructions.push(entry);
    files.push({ file: `${file} (bloco AgentForge)`, tokens: entry.managedTokens });
    if (entry.userTokens > limits.userInstructions) {
      findings.push(`${file}: ~${entry.userTokens} tokens de instruções do utilizador, lidas em cada sessão (limite sugerido ${limits.userInstructions}); mova o que for raro para ficheiros lidos a pedido`);
    }
  }
  const total = files.reduce((sum, item) => sum + item.tokens, 0);
  if (total > startupBudgetTokens) findings.push(`Arranque com ~${total} tokens, acima do orçamento de ${startupBudgetTokens}`);
  const work: TokenReport['work'] = [];
  for (const [file, key, limit] of [['state.md', '.agentforge/work/state.md', limits.state],
    ['context.md', '.agentforge/work/context.md', limits.context]] as const) {
    const found = await size(root, key);
    if (!found) continue;
    work.push({ file, tokens: estimate(found.chars) });
    if (estimate(found.chars) > limit) findings.push(`${file}: ~${estimate(found.chars)} tokens (limite sugerido ${limit}); compacte com \`agentforge context save\``);
  }
  for (const [file, key] of [['operations.jsonl', '.agentforge/work/operations.jsonl'], ['events.jsonl', '.agentforge/work/events.jsonl'],
    ['lessons.json', '.agentforge/work/lessons.json']] as const) {
    const found = await size(root, key);
    if (!found) continue;
    work.push({ file, bytes: found.bytes });
    if (found.bytes > limits.log && file !== 'lessons.json') {
      findings.push(`${file}: ${found.bytes} bytes; não é lido no arranque, mas \`insights\` percorre-o inteiro`);
    }
  }
  return { startup: { files, total, budget: startupBudgetTokens }, instructions, work, findings, estimate: 'chars-divided-by-4' };
}
