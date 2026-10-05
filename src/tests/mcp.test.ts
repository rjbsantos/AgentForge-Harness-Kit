import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { install } from '../installer.js';

const cli = fileURLToPath(new URL('../cli/index.js', import.meta.url));

function exchange(project: string, messages: object[]): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, 'mcp', '--project', project]);
    let out = '';
    child.stdout.on('data', chunk => { out += chunk; });
    child.on('error', reject);
    child.on('close', () => resolve(out.trim().split('\n').filter(Boolean).map(line => JSON.parse(line))));
    child.stdin.end(messages.map(message => JSON.stringify(message)).join('\n') + '\n');
  });
}

test('MCP server lists read-only tools and answers plan, route and context calls', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentforge-mcp-'));
  try {
    await install(root, ['claude']);
    const call = (id: number, name: string, args: object) =>
      ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });
    const replies = await exchange(root, [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'tools/list' },
      call(3, 'agentforge_route', { cli: 'claude', prompt: 'Design the architecture' }),
      call(4, 'agentforge_plan', { cli: 'claude', prompt: 'Faz uma auditoria ao repositório' }),
      call(5, 'agentforge_context', {}),
      call(6, 'agentforge_route', { cli: 'nope', prompt: 'x' }),
      call(9, 'agentforge_graph', { mode: 'explain', node: 'forge-graph' }),
      call(7, 'agentforge_unknown', {}),
      { jsonrpc: '2.0', id: 8, method: 'resources/list' }
    ]);
    const byId = new Map(replies.map(reply => [reply.id, reply]));
    assert.equal(replies.length, 9); // a notificação não tem resposta
    assert.equal(byId.get(1).result.serverInfo.name, 'agentforge');
    const listed = byId.get(2).result.tools;
    assert.deepEqual(listed.map((tool: any) => tool.name).sort(),
      ['agentforge_context', 'agentforge_graph', 'agentforge_insights', 'agentforge_lessons', 'agentforge_plan', 'agentforge_route']);
    assert.ok(listed.every((tool: any) => tool.annotations.readOnlyHint));
    assert.equal(JSON.parse(byId.get(3).result.content[0].text).tier, 'thinking');
    assert.equal(JSON.parse(byId.get(4).result.content[0].text).workflow, 'repository-audit');
    assert.equal(JSON.parse(byId.get(5).result.content[0].text).lessons.length, 0);
    assert.match(JSON.parse(byId.get(9).result.content[0].text).connections.join('\n'), /workflow:repository-audit --uses_skill--> skill:forge-graph/);
    assert.equal(byId.get(6).result.isError, true);
    assert.equal(byId.get(7).error.code, -32602);
    assert.equal(byId.get(8).error.code, -32601);
  } finally { await rm(root, { recursive: true, force: true }); }
});
