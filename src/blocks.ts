import { instruction, type Target } from './catalog.js';

export const beginning = (target: Target) => `<!-- agentforge:${target}:begin -->`;
export const ending = (target: Target) => `<!-- agentforge:${target}:end -->`;
export const block = (target: Target) => `\n${beginning(target)}\n${instruction(target)}\n${ending(target)}\n`;
// Blocos de instruções de versões anteriores: reconhecidos para poderem ser actualizados ou
// removidos sem intervenção manual. Acrescentar aqui o bloco da versão anterior ao alterar `instruction`.
const hint = (target: Target) => target === 'claude' ? 'Use .claude/agents/ for native subagents.'
  : target === 'opencode' ? 'Use .opencode/agents/ for native subagents.'
  : 'Use the role descriptions; only delegate if this host offers a supported subagent mechanism.';
// Versão 0.8.x: lia MODEL_ROUTING.md e OPERATOR.md no arranque de cada sessão.
const releaseBlock = (target: Target) => `\n${beginning(target)}\nPara as tarefas abrangidas pelo harness, actua como AgentForge e lê \`.agentforge/HARNESS.md\`, \`.agentforge/MODEL_ROUTING.md\`, \`.agentforge/OPERATOR.md\`, \`.agentforge/work/state.md\` e \`.agentforge/work/context.md\`. Mantém todas as alterações e artefactos do projecto dentro da raiz; valida caminhos antes de escrever, copiar ou eliminar, e pára perante destinos externos ou ligações simbólicas que escapem à raiz. Consulta \`.agentforge/CONTEXT_LEARNING.md\` para consolidar lições verificadas. Classifica cada tarefa pela complexidade e usa modelos configurados apenas se este host permitir a sua selecção. Papéis: \`.agentforge/roles/\`. ${target === 'claude' ? 'Agente principal opcional: claude --agent agentforge; subagentes nativos: .claude/agents/.' : target === 'opencode' ? 'Selecciona agentforge como agente principal; subagentes: .opencode/agents/.' : 'Segue as instruções dos papéis; delega apenas se o host suportar essa capacidade.'}\n${ending(target)}\n`;
// Versões 0.8.2 e 0.8.3: igual ao bloco seguinte, ainda sem a frase sobre o limite da raiz do projecto.
const rootSentence = ' Mantém todas as alterações e artefactos do projecto dentro da raiz; valida caminhos antes de escrever, copiar ou eliminar, e pára perante destinos externos ou ligações simbólicas que escapem à raiz.';
const release083Block = (target: Target) => releaseBlock(target).replace(rootSentence, '');
const legacyBlock = (target: Target) =>
  `\n${beginning(target)}\nRead \`.agentforge/HARNESS.md\` and \`.agentforge/work/state.md\` before AgentForge pipeline work. Available roles: \`.agentforge/roles/\`. ${hint(target)}\n${ending(target)}\n`;
const previousBlock = (target: Target) =>
  `\n${beginning(target)}\nRead \`.agentforge/HARNESS.md\`, \`.agentforge/MODEL_ROUTING.md\` and \`.agentforge/work/state.md\` before AgentForge pipeline work. Classify each task by complexity and use the configured thinking/economy model only if this host supports explicit selection. Available roles: \`.agentforge/roles/\`. ${hint(target)}\n${ending(target)}\n`;
const priorBlock = (target: Target) =>
  `\n${beginning(target)}\nFor AgentForge harness work, act as AgentForge and read \`.agentforge/HARNESS.md\`, \`.agentforge/MODEL_ROUTING.md\`, \`.agentforge/work/state.md\` and \`.agentforge/work/context.md\`. Use \`.agentforge/CONTEXT_LEARNING.md\` to consolidate verified lessons. Classify each task by complexity and use configured models only if this host supports selection. Roles: \`.agentforge/roles/\`. ${target === 'claude' ? 'Optional main agent: claude --agent agentforge; native subagents: .claude/agents/.' : target === 'opencode' ? 'Choose primary agent agentforge; subagents: .opencode/agents/.' : 'Use role descriptions; delegate only if supported by the host.'}\n${ending(target)}\n`;
export const superseded = (target: Target) => [releaseBlock(target), release083Block(target), priorBlock(target), previousBlock(target), legacyBlock(target)];
export const instructions = (target: Target) => target === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
