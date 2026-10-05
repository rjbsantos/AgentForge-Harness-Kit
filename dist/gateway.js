import { existsSync } from 'node:fs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { safe } from './installer.js';
import { loadModels } from './routing.js';
export const gateways = {
    omniroute: {
        name: 'OmniRoute',
        baseUrl: 'http://localhost:20128/v1',
        models: { thinking: 'auto/coding', economy: 'auto/cheap' },
        connect: {
            claude: 'omniroute run claude --model auto/coding',
            codex: 'omniroute configure codex',
            opencode: 'omniroute configure opencode',
            antigravity: 'Configurar manualmente o endpoint compatível com OpenAI http://localhost:20128/v1 (ver docs/reference/CLI-TOOLS.md do OmniRoute)'
        },
        warnings: [
            'Os pedidos são enviados ao fornecedor que o gateway escolher, incluindo camadas gratuitas de terceiros: não o use com código, dados ou segredos que não possam sair da sua máquina.',
            'O OmniRoute lista fornecedores marcados como de risco nos termos de serviço; reveja o catálogo antes de os activar.',
            'O encaminhamento automático pode trocar de modelo entre pedidos; as validações e aprovações do AgentForge continuam a aplicar-se e não dependem do gateway.',
            'O kit só recomenda; não inicia o gateway, não guarda chaves e não altera a configuração dos CLIs.'
        ]
    }
};
const file = '.agentforge/work/model-profiles.json';
export async function applyGateway(project, id, selected, write) {
    const gateway = gateways[id];
    if (!gateway)
        throw new Error(`Gateway desconhecido: ${id} (disponíveis: ${Object.keys(gateways).join(', ')})`);
    const root = resolve(project);
    const existing = await loadModels(root);
    const merged = structuredClone(existing);
    const profiles = {};
    const skipped = [];
    const commands = {};
    for (const cli of selected) {
        commands[cli] = gateway.connect[cli];
        for (const tier of ['thinking', 'economy']) {
            const current = merged[cli]?.[tier];
            if (current !== undefined && current !== gateway.models[tier]) {
                skipped.push(`${cli}.${tier}: mantido '${current}'`);
                continue;
            }
            (merged[cli] ??= {})[tier] = gateway.models[tier];
            (profiles[cli] ??= {})[tier] = gateway.models[tier];
        }
    }
    if (write && Object.keys(profiles).length) {
        const path = safe(root, file);
        await mkdir(dirname(path), { recursive: true });
        const temporary = `${path}.${randomUUID()}.tmp`;
        try {
            await writeFile(temporary, JSON.stringify(merged, null, 2) + '\n', { flag: 'wx' });
            await rename(temporary, path);
        }
        finally {
            if (existsSync(temporary))
                await rm(temporary);
        }
    }
    return { gateway: gateway.name, baseUrl: gateway.baseUrl, profiles, skipped, commands,
        warnings: gateway.warnings, written: write && Object.keys(profiles).length > 0 };
}
//# sourceMappingURL=gateway.js.map