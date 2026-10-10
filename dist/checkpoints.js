import { existsSync, lstatSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { safe } from './installer.js';
// `forge-checkpoint` grava a aprovação humana em `.agentforge/work/checkpoints/CP-NNN.md` com uma
// linha «veredicto: APROVADO». Esta leitura só liga um pedido de aprovação a esse registo, para
// que seja rastreável: um agente que escreva o ficheiro continua a poder fabricá-lo, mas deixa um
// artefacto que uma pessoa pode rever, ao contrário de uma flag booleana.
const dir = '.agentforge/work/checkpoints';
const plain = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
export async function lastCheckpointApproved(project) {
    const root = resolve(project);
    const base = safe(root, dir);
    if (!existsSync(base))
        return false;
    const latest = (await readdir(base))
        .map(name => ({ name, number: /^CP-(\d+)\.md$/i.exec(name)?.[1] }))
        .filter((item) => item.number !== undefined)
        .sort((a, b) => Number(b.number) - Number(a.number))[0];
    if (!latest)
        return false;
    const path = safe(root, `${dir}/${latest.name}`);
    const info = lstatSync(path);
    if (!info.isFile() || info.size > 64_000)
        return false;
    const verdict = /veredicto[^\n:]*:\s*\**\s*([^\n*]+)/i.exec(await readFile(path, 'utf8'))?.[1];
    return verdict !== undefined && plain(verdict) === 'aprovado';
}
//# sourceMappingURL=checkpoints.js.map