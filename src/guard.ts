import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { audit } from './audit.js';
import { atomicWrite, safe } from './installer.js';

// Guarda das acções que não se desfazem ou que publicam. Corre como hook PreToolUse do Claude Code
// antes de cada comando Bash e só decide sobre o texto do comando e o ramo actual. Não é uma sandbox:
// um comando construído de forma indirecta (um script, uma variável) escapa à análise, e um agente
// com acesso ao terminal da pessoa pode conceder-se a si próprio uma licença. Trava o caso comum e
// deixa um registo; a defesa em profundidade é o `flow`, a aprovação em terminal e a sandbox do host.
export type Scope = 'main' | 'publish';
export interface Decision { allow: boolean; rule?: string; reason?: string }
interface Permit { scope: Scope; grantedAt: string; expiresAt: string; by: string }

const permitKey = '.agentforge/work/guard-permit.json';
const protectedBranches = new Set(['main', 'master']);
const maxMinutes = 240;

export function currentBranch(project: string): string | undefined {
  try {
    let gitDir = join(project, '.git');
    if (statSync(gitDir).isFile()) {
      const pointer = /^gitdir:\s*(.+)$/m.exec(readFileSync(gitDir, 'utf8'))?.[1];
      if (!pointer) return undefined;
      gitDir = resolve(project, pointer.trim());
    }
    return /^ref:\s*refs\/heads\/(.+)$/m.exec(readFileSync(join(gitDir, 'HEAD'), 'utf8'))?.[1].trim();
  } catch { return undefined; }
}

async function permits(root: string, now: number): Promise<Permit[]> {
  const path = safe(root, permitKey);
  if (!existsSync(path)) return [];
  try {
    const value: unknown = JSON.parse(await readFile(path, 'utf8'));
    return (Array.isArray(value) ? value : []).filter((item): item is Permit =>
      !!item && (item.scope === 'main' || item.scope === 'publish') && typeof item.expiresAt === 'string' &&
      Date.parse(item.expiresAt) > now);
  } catch { return []; }
}

export async function grantPermit(project: string, scope: Scope, minutes: number): Promise<Permit> {
  const root = resolve(project);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > maxMinutes) throw new Error(`Duração inválida (1-${maxMinutes} minutos)`);
  const now = Date.now();
  const permit: Permit = { scope, grantedAt: new Date(now).toISOString(), expiresAt: new Date(now + minutes * 60_000).toISOString(), by: userInfo().username };
  const path = safe(root, permitKey);
  await mkdir(dirname(path), { recursive: true });
  await atomicWrite(path, JSON.stringify([...(await permits(root, now)).filter(item => item.scope !== scope), permit], null, 2) + '\n');
  await audit(root, 'guard.permit', { scope, minutes: String(minutes) });
  return permit;
}

export async function revokePermits(project: string): Promise<void> {
  const root = resolve(project);
  await rm(safe(root, permitKey), { force: true });
  await audit(root, 'guard.revoke');
}

export async function activePermits(project: string): Promise<Permit[]> {
  return permits(resolve(project), Date.now());
}

// Divide o comando em simples e devolve, para cada um, os tokens sem atribuições de ambiente.
function segments(command: string): string[][] {
  return command.split(/&&|\|\||;|\||\n|\(|\)|`|\$\(/).map(part => {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    while (tokens.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[0]) || ['sudo', 'command', 'time', 'nice', 'env'].includes(tokens[0]))) tokens.shift();
    return tokens;
  }).filter(tokens => tokens.length);
}

const withArg = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path']);

function gitParts(tokens: string[]): { sub: string; args: string[] } | undefined {
  if (tokens[0] !== 'git') return undefined;
  let i = 1;
  while (i < tokens.length && tokens[i].startsWith('-')) i += withArg.has(tokens[i]) ? 2 : 1;
  return tokens[i] ? { sub: tokens[i], args: tokens.slice(i + 1) } : undefined;
}

const isProtected = (ref: string | undefined): boolean => {
  if (!ref) return false;
  const name = ref.replace(/^\+/, '').split(':').pop()!.replace(/^refs\/heads\//, '');
  return protectedBranches.has(name);
};

export async function evaluate(project: string, command: string, branch = currentBranch(resolve(project))): Promise<Decision> {
  const root = resolve(project);
  const active = new Set((await permits(root, Date.now())).map(item => item.scope));
  const deny = (rule: string, reason: string, scope: Scope): Decision =>
    active.has(scope) ? { allow: true } : { allow: false, rule, reason };

  for (const tokens of segments(command)) {
    const git = gitParts(tokens);
    if (git) {
      const { sub, args } = git;
      if (['commit', 'merge', 'cherry-pick', 'revert', 'rebase', 'am'].includes(sub) && branch && protectedBranches.has(branch)) {
        const result = deny('commit-em-main', `\`git ${sub}\` no ramo ${branch}: trabalhe num ramo próprio. Uma pessoa pode autorizar com \`agentforge guard permit-main\`, num terminal.`, 'main');
        if (!result.allow) return result;
      }
      if (sub === 'push') {
        const positional = args.filter(arg => !arg.startsWith('-'));
        const forced = args.some(arg => /^(--force|--force-with-lease(=.*)?|-f)$/.test(arg) || arg.startsWith('+')) || positional.some(arg => arg.startsWith('+'));
        const deleting = args.includes('--delete') || args.includes('-d') || positional.some(arg => arg.startsWith(':'));
        const refspecs = positional.slice(1).map(ref => ref === 'HEAD' && branch ? branch : ref.replace(/^HEAD:/, `${branch ?? 'HEAD'}:`)); // o primeiro é o remoto
        const toProtected = refspecs.some(isProtected) || (refspecs.length === 0 && branch !== undefined && protectedBranches.has(branch)) ||
          args.includes('--all') || args.includes('--mirror');
        if ((forced || deleting) && (toProtected || refspecs.length === 0)) {
          const result = deny('push-forcado', '`git push` forçado ou a apagar ramos: pode destruir o histórico. Uma pessoa pode autorizar com `agentforge guard permit-main`.', 'main');
          if (!result.allow) return result;
        } else if (toProtected) {
          const result = deny('push-para-main', '`git push` para o ramo principal: abra um pull request. Uma pessoa pode autorizar com `agentforge guard permit-main`.', 'main');
          if (!result.allow) return result;
        }
        if (args.includes('--tags') || args.includes('--follow-tags') || refspecs.some(ref => /^(refs\/tags\/|v\d)/.test(ref))) {
          const result = deny('publicar-tag', 'Publicar uma tag dispara a release: exige autorização expressa. Uma pessoa pode conceder com `agentforge guard permit-publish`, num terminal.', 'publish');
          if (!result.allow) return result;
        }
      }
      if (sub === 'tag' && args.some(arg => !arg.startsWith('-')) && !args.some(arg => ['-l', '--list', '-d', '--delete', '-v', '--verify'].includes(arg))) {
        const result = deny('criar-tag', 'Criar uma tag de versão exige autorização expressa (`agentforge guard permit-publish`).', 'publish');
        if (!result.allow) return result;
      }
      continue;
    }
    const [tool, sub, action] = tokens;
    if ((tool === 'gh' && sub === 'release' && ['create', 'edit', 'delete'].includes(action)) ||
        (tool === 'gh' && sub === 'pr' && action === 'merge') ||
        (tool === 'npm' && sub === 'publish') || (tool === 'pnpm' && sub === 'publish') || (tool === 'yarn' && sub === 'publish')) {
      const result = deny('publicar', `\`${tokens.slice(0, 3).join(' ')}\` publica ou integra: exige autorização expressa (\`agentforge guard permit-publish\`, num terminal).`, 'publish');
      if (!result.allow) return result;
    }
  }
  return { allow: true };
}
