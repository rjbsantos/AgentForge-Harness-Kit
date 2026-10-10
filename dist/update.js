import { execFile } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { kitVersion } from './version.js';
// Aviso de nova versão. Nunca atrasa nem falha um comando: lê uma cache local, só consulta a rede
// quando há um terminal (a pessoa está a olhar), no máximo uma vez por dia e com um limite curto de
// tempo, e escreve o aviso no stderr para não tocar na saída JSON. Desactivar com
// AGENTFORGE_NO_UPDATE_CHECK=1 (ou com CI definido). Só envia um pedido ao GitHub, sem dados do projecto.
//
// O repositório do kit é privado: a consulta usa `gh api`, que usa a autenticação da pessoa. Sem `gh`
// ou sem acesso, a verificação fica em silêncio. `AGENTFORGE_UPDATE_COMMAND` permite indicar outro
// comando que imprime a última versão (por exemplo `npm view … version`).
const slug = 'rjbsantos/AgentForge-Harness-Kit';
const day = 24 * 60 * 60 * 1000;
const retry = 6 * 60 * 60 * 1000;
const parse = (value) => {
    const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(value.trim());
    return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : undefined;
};
/** Negativo se `a` < `b`, positivo se `a` > `b`, 0 se iguais; `NaN` se algum não for uma versão. */
export function compareVersions(a, b) {
    const left = parse(a);
    const right = parse(b);
    if (!left || !right)
        return Number.NaN;
    for (let i = 0; i < 3; i++)
        if (left[i] !== right[i])
            return left[i] - right[i];
    return 0;
}
const cachePath = () => join(process.env.AGENTFORGE_HOME || join(homedir(), '.config', 'agentforge'), 'update-check.json');
function readCache() {
    try {
        const value = JSON.parse(readFileSync(cachePath(), 'utf8'));
        return typeof value.checkedAt === 'number' ? value : undefined;
    }
    catch {
        return undefined;
    }
}
function writeCache(cache) {
    try {
        mkdirSync(dirname(cachePath()), { recursive: true, mode: 0o700 });
        writeFileSync(cachePath(), JSON.stringify(cache) + '\n');
    }
    catch { /* sem cache: não é um erro */ }
}
export function fetchLatest(timeoutMs = 2000) {
    const custom = process.env.AGENTFORGE_UPDATE_COMMAND;
    const [file, args] = custom ? ['/bin/sh', ['-c', custom]]
        : ['gh', ['api', `repos/${slug}/releases/latest`, '--jq', '.tag_name']];
    return new Promise(done => {
        try {
            execFile(file, [...args], { timeout: timeoutMs, windowsHide: true }, (error, stdout) => {
                const tag = error ? undefined : stdout.trim().split('\n')[0];
                done(tag && parse(tag) ? tag.replace(/^v/, '') : undefined);
            });
        }
        catch {
            done(undefined);
        }
    });
}
export async function updateStatus(options) {
    const current = kitVersion;
    if (process.env.AGENTFORGE_NO_UPDATE_CHECK === '1' || process.env.CI)
        return { current, outdated: false, source: 'disabled' };
    const now = options.now ?? Date.now();
    const cache = readCache();
    let latest = cache?.latest;
    let source = latest ? 'cache' : 'unknown';
    const fresh = cache && now - cache.checkedAt < (latest ? options.ttlMs ?? day : retry);
    if (options.allowNetwork && !fresh) {
        const found = await (options.fetcher ?? fetchLatest)();
        if (found) {
            latest = found;
            source = 'network';
        }
        writeCache({ latest: found ?? latest, checkedAt: now });
    }
    const outdated = latest !== undefined && compareVersions(current, latest) < 0;
    return { current, latest, outdated, source };
}
export function updateNotice(info) {
    if (!info.outdated || !info.latest)
        return undefined;
    return `agentforge ${info.latest} disponível (instalada: ${info.current}). Para actualizar: ` +
        `gh release download v${info.latest} --repo ${slug} --pattern 'agentforge-harness-kit-*.tgz' && ` +
        `npm install -g "$PWD/agentforge-harness-kit-${info.latest}.tgz"; depois \`agentforge upgrade\` em cada projecto. ` +
        'Silenciar: AGENTFORGE_NO_UPDATE_CHECK=1';
}
//# sourceMappingURL=update.js.map