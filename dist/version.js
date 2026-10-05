import { readFileSync } from 'node:fs';
// Versão do kit em execução, lida do package.json que viaja com o pacote (dist/ fica ao lado dele).
export const kitVersion = (() => {
    const value = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
    if (typeof value !== 'string' || !/^\d+\.\d+\.\d+/.test(value))
        throw new Error('Versão do kit ilegível em package.json');
    return value;
})();
//# sourceMappingURL=version.js.map