import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { plan } from './orchestrator.js';
import { route } from './routing.js';
import { getContext, listLessons } from './memory.js';
import { operationInsights } from './operations.js';
import { targets, type Target } from './installer.js';
import { profiles, type Profile } from './capabilities.js';

// Servidor MCP mínimo (stdio, JSON-RPC 2.0, uma mensagem por linha). Expõe apenas leitura e
// propostas: nada aqui aprova lições, regista execuções nem altera ficheiros do projecto.
interface Tool {
  description: string;
  properties: Record<string, object>;
  required: string[];
  run: (project: string, args: Record<string, unknown>) => Promise<unknown>;
}

const cliProperty = { type: 'string', enum: [...targets] };
const text = (args: Record<string, unknown>, key: string): string => {
  const value = args[key];
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Argumento em falta: ${key}`);
  return value;
};
const optional = (args: Record<string, unknown>, key: string): string | undefined =>
  args[key] === undefined ? undefined : text(args, key);
const flag = (args: Record<string, unknown>, key: string): boolean => args[key] === true;
const cli = (args: Record<string, unknown>): Target => {
  const value = text(args, 'cli');
  if (!targets.includes(value as Target)) throw new Error(`CLI desconhecido: ${value}`);
  return value as Target;
};

export const tools: Record<string, Tool> = {
  agentforge_plan: {
    description: 'Propõe perfil, fluxo, competências, validação e coordenação para um pedido. Não executa nada.',
    properties: { cli: cliProperty, prompt: { type: 'string' }, role: { type: 'string', enum: Object.keys(profiles) },
      workflow: { type: 'string' }, planned: { type: 'boolean' }, approved: { type: 'boolean' }, highRisk: { type: 'boolean' } },
    required: ['cli', 'prompt'],
    run: (project, args) => {
      const role = optional(args, 'role');
      if (role !== undefined && !(role in profiles)) throw new Error(`Perfil desconhecido: ${role}`);
      return plan(project, cli(args), text(args, 'prompt'), {
        role: role as Profile | undefined, workflow: optional(args, 'workflow'),
        planned: flag(args, 'planned'), approved: flag(args, 'approved'), highRisk: flag(args, 'highRisk')
      });
    }
  },
  agentforge_route: {
    description: 'Classifica a complexidade de uma tarefa e recomenda o nível de modelo.',
    properties: { cli: cliProperty, prompt: { type: 'string' }, planned: { type: 'boolean' },
      approved: { type: 'boolean' }, highRisk: { type: 'boolean' } },
    required: ['cli', 'prompt'],
    run: (project, args) => route(project, cli(args), text(args, 'prompt'),
      { planned: flag(args, 'planned'), approved: flag(args, 'approved'), highRisk: flag(args, 'highRisk') })
  },
  agentforge_context: {
    description: 'Devolve o estado, o resumo activo e as lições aprovadas pertinentes, dentro de um orçamento de tokens.',
    properties: { topic: { type: 'string' }, budgetTokens: { type: 'integer', minimum: 1, maximum: 32000 } },
    required: [],
    run: (project, args) => getContext(project, optional(args, 'topic'),
      typeof args.budgetTokens === 'number' ? args.budgetTokens : undefined)
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

export async function handle(project: string, message: any): Promise<object | undefined> {
  const { id, method, params } = message ?? {};
  const reply = (result: unknown) => ({ jsonrpc: '2.0', id, result });
  const fail = (code: number, text: string) => ({ jsonrpc: '2.0', id, error: { code, message: text } });
  if (id === undefined) return undefined; // notificações (ex.: notifications/initialized) não têm resposta
  if (method === 'initialize') {
    return reply({ protocolVersion: params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} },
      serverInfo: { name: 'agentforge', version: '1' } });
  }
  if (method === 'ping') return reply({});
  if (method === 'tools/list') {
    return reply({ tools: Object.entries(tools).map(([name, tool]) => ({
      name, description: tool.description,
      inputSchema: { type: 'object', properties: tool.properties, required: tool.required, additionalProperties: false },
      annotations: { readOnlyHint: true }
    })) });
  }
  if (method === 'tools/call') {
    const tool = tools[params?.name];
    if (!tool) return fail(-32602, `Ferramenta desconhecida: ${params?.name}`);
    try {
      const value = await tool.run(project, params.arguments ?? {});
      return reply({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] });
    } catch (error) {
      return reply({ isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }] });
    }
  }
  return fail(-32601, `Método não suportado: ${method}`);
}

export async function serve(project: string): Promise<void> {
  const root = resolve(project);
  const lines = createInterface({ input: process.stdin });
  const pending: Promise<void>[] = [];
  for await (const line of lines) {
    if (!line.trim()) continue;
    pending.push((async () => {
      let message: unknown;
      try { message = JSON.parse(line); } catch {
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } }) + '\n');
        return;
      }
      const response = await handle(root, message);
      if (response) process.stdout.write(JSON.stringify(response) + '\n');
    })());
  }
  await Promise.all(pending);
}
