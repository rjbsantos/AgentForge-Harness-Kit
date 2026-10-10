import { StringDecoder } from 'node:string_decoder';
import { resolve } from 'node:path';
import { plan } from './orchestrator.js';
import { route } from './routing.js';
import { getContext, listLessons } from './memory.js';
import { operationInsights } from './operations.js';
import { targets } from './installer.js';
import { profiles } from './capabilities.js';
import { lastCheckpointApproved } from './checkpoints.js';
import { kitVersion } from './version.js';
import { buildGraph, explain, path as graphPath, query as graphQuery, report as graphReport } from './graph.js';
const cliProperty = { type: 'string', enum: [...targets] };
const text = (args, key) => {
    const value = args[key];
    if (typeof value !== 'string' || !value.trim())
        throw new Error(`Argumento em falta: ${key}`);
    return value;
};
const optional = (args, key) => args[key] === undefined ? undefined : text(args, key);
const flag = (args, key) => args[key] === true;
// `approved` vem do modelo: só vale se o último checkpoint registado tiver o veredicto APROVADO.
const approval = async (project, args) => flag(args, 'approved') && await lastCheckpointApproved(project);
const budget = (args) => {
    if (args.budgetTokens === undefined)
        return undefined;
    if (typeof args.budgetTokens !== 'number' || !Number.isInteger(args.budgetTokens) || args.budgetTokens < 1 || args.budgetTokens > 32000) {
        throw new Error('budgetTokens inválido (1-32000)');
    }
    return args.budgetTokens;
};
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
        run: async (project, args) => {
            const role = optional(args, 'role');
            if (role !== undefined && !(role in profiles))
                throw new Error(`Perfil desconhecido: ${role}`);
            return plan(project, cli(args), text(args, 'prompt'), {
                role: role, workflow: optional(args, 'workflow'),
                planned: flag(args, 'planned'), approved: await approval(project, args), highRisk: flag(args, 'highRisk')
            });
        }
    },
    agentforge_route: {
        description: 'Classifica a complexidade de uma tarefa e recomenda o nível de modelo.',
        properties: { cli: cliProperty, prompt: { type: 'string' }, planned: { type: 'boolean' },
            approved: { type: 'boolean' }, highRisk: { type: 'boolean' } },
        required: ['cli', 'prompt'],
        run: async (project, args) => route(project, cli(args), text(args, 'prompt'), { planned: flag(args, 'planned'), approved: await approval(project, args), highRisk: flag(args, 'highRisk') })
    },
    agentforge_context: {
        description: 'Devolve o estado, o resumo activo e as lições aprovadas pertinentes, dentro de um orçamento de tokens.',
        properties: { topic: { type: 'string' }, budgetTokens: { type: 'integer', minimum: 1, maximum: 32000 } },
        required: [],
        run: (project, args) => getContext(project, optional(args, 'topic'), budget(args))
    },
    agentforge_lessons: {
        description: 'Lista as lições (pendentes, aprovadas e retiradas). A aprovação só é possível pelo CLI, por uma pessoa.',
        properties: {}, required: [], run: project => listLessons(project)
    },
    agentforge_graph: {
        description: 'Consulta o grafo do catálogo (perfis, fluxos, competências, ferramentas) com confiança EXTRACTED/INFERRED/AMBIGUOUS: query, path, explain ou report.',
        properties: { mode: { type: 'string', enum: ['query', 'path', 'explain', 'report'] }, question: { type: 'string' },
            from: { type: 'string' }, to: { type: 'string' }, node: { type: 'string' }, budgetTokens: { type: 'integer', minimum: 1, maximum: 32000 } },
        required: ['mode'],
        run: async (_project, args) => {
            const g = buildGraph();
            const mode = text(args, 'mode');
            if (mode === 'report')
                return graphReport(g);
            if (mode === 'query')
                return graphQuery(g, text(args, 'question'), budget(args));
            if (mode === 'path')
                return graphPath(g, text(args, 'from'), text(args, 'to'));
            if (mode === 'explain')
                return explain(g, text(args, 'node'));
            throw new Error(`Modo desconhecido: ${mode}`);
        }
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
            serverInfo: { name: 'agentforge', version: kitVersion } });
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
const maxMessageBytes = 1_048_576;
// Lê mensagens linha a linha, uma de cada vez (sem fila ilimitada), e recusa linhas acima do limite.
export async function serve(project) {
    const root = resolve(project);
    const decoder = new StringDecoder('utf8');
    const send = (value) => process.stdout.write(JSON.stringify(value) + '\n');
    const respond = async (line) => {
        if (!line.trim())
            return;
        let message;
        try {
            message = JSON.parse(line);
        }
        catch {
            send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } });
            return;
        }
        const response = await handle(root, message);
        if (response)
            send(response);
    };
    let buffer = '';
    let discarding = false;
    for await (const chunk of process.stdin) {
        let data = decoder.write(chunk);
        if (discarding) {
            const end = data.indexOf('\n');
            if (end < 0)
                continue;
            data = data.slice(end + 1);
            discarding = false;
        }
        buffer += data;
        let end;
        while ((end = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, end);
            buffer = buffer.slice(end + 1);
            await respond(line);
        }
        if (Buffer.byteLength(buffer) > maxMessageBytes) {
            send({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Mensagem demasiado grande' } });
            buffer = '';
            discarding = true;
        }
    }
    if (!discarding)
        await respond(buffer);
}
//# sourceMappingURL=mcp.js.map