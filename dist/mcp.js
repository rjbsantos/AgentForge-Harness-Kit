import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { plan } from './orchestrator.js';
import { route } from './routing.js';
import { getContext, listLessons } from './memory.js';
import { operationInsights } from './operations.js';
import { targets } from './installer.js';
import { profiles } from './capabilities.js';
const cliProperty = { type: 'string', enum: [...targets] };
const text = (args, key) => {
    const value = args[key];
    if (typeof value !== 'string' || !value.trim())
        throw new Error(`Argumento em falta: ${key}`);
    return value;
};
const optional = (args, key) => args[key] === undefined ? undefined : text(args, key);
const flag = (args, key) => args[key] === true;
const cli = (args) => {
    const value = text(args, 'cli');
    if (!targets.includes(value))
        throw new Error(`CLI desconhecido: ${value}`);
    return value;
};
export const tools = {
    agentforge_plan: {
        description: 'Propõe perfil, fluxo, competências, validação e coordenação para um pedido. Não executa nada.',
        properties: { cli: cliProperty, prompt: { type: 'string' }, role: { type: 'string', enum: Object.keys(profiles) },
            workflow: { type: 'string' }, planned: { type: 'boolean' }, approved: { type: 'boolean' }, highRisk: { type: 'boolean' } },
        required: ['cli', 'prompt'],
        run: (project, args) => {
            const role = optional(args, 'role');
            if (role !== undefined && !(role in profiles))
                throw new Error(`Perfil desconhecido: ${role}`);
            return plan(project, cli(args), text(args, 'prompt'), {
                role: role, workflow: optional(args, 'workflow'),
                planned: flag(args, 'planned'), approved: flag(args, 'approved'), highRisk: flag(args, 'highRisk')
            });
        }
    },
    agentforge_route: {
        description: 'Classifica a complexidade de uma tarefa e recomenda o nível de modelo.',
        properties: { cli: cliProperty, prompt: { type: 'string' }, planned: { type: 'boolean' },
            approved: { type: 'boolean' }, highRisk: { type: 'boolean' } },
        required: ['cli', 'prompt'],
        run: (project, args) => route(project, cli(args), text(args, 'prompt'), { planned: flag(args, 'planned'), approved: flag(args, 'approved'), highRisk: flag(args, 'highRisk') })
    },
    agentforge_context: {
        description: 'Devolve o estado, o resumo activo e as lições aprovadas pertinentes, dentro de um orçamento de tokens.',
        properties: { topic: { type: 'string' }, budgetTokens: { type: 'integer', minimum: 1, maximum: 32000 } },
        required: [],
        run: (project, args) => getContext(project, optional(args, 'topic'), typeof args.budgetTokens === 'number' ? args.budgetTokens : undefined)
    },
    agentforge_lessons: {
        description: 'Lista as lições (pendentes, aprovadas e retiradas). A aprovação só é possível pelo CLI, por uma pessoa.',
        properties: {}, required: [], run: project => listLessons(project)
    },
    agentforge_insights: {
        description: 'Resume as execuções registadas explicitamente e os erros recorrentes.',
        properties: {}, required: [], run: project => operationInsights(project)
    }
};
export async function handle(project, message) {
    const { id, method, params } = message ?? {};
    const reply = (result) => ({ jsonrpc: '2.0', id, result });
    const fail = (code, text) => ({ jsonrpc: '2.0', id, error: { code, message: text } });
    if (id === undefined)
        return undefined; // notificações (ex.: notifications/initialized) não têm resposta
    if (method === 'initialize') {
        return reply({ protocolVersion: params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} },
            serverInfo: { name: 'agentforge', version: '1' } });
    }
    if (method === 'ping')
        return reply({});
    if (method === 'tools/list') {
        return reply({ tools: Object.entries(tools).map(([name, tool]) => ({
                name, description: tool.description,
                inputSchema: { type: 'object', properties: tool.properties, required: tool.required, additionalProperties: false },
                annotations: { readOnlyHint: true }
            })) });
    }
    if (method === 'tools/call') {
        const tool = tools[params?.name];
        if (!tool)
            return fail(-32602, `Ferramenta desconhecida: ${params?.name}`);
        try {
            const value = await tool.run(project, params.arguments ?? {});
            return reply({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] });
        }
        catch (error) {
            return reply({ isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }] });
        }
    }
    return fail(-32601, `Método não suportado: ${method}`);
}
export async function serve(project) {
    const root = resolve(project);
    const lines = createInterface({ input: process.stdin });
    const pending = [];
    for await (const line of lines) {
        if (!line.trim())
            continue;
        pending.push((async () => {
            let message;
            try {
                message = JSON.parse(line);
            }
            catch {
                process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } }) + '\n');
                return;
            }
            const response = await handle(root, message);
            if (response)
                process.stdout.write(JSON.stringify(response) + '\n');
        })());
    }
    await Promise.all(pending);
}
//# sourceMappingURL=mcp.js.map