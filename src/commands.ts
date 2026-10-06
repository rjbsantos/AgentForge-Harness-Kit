import { workflows } from './capabilities.js';

// Comandos de utilizador (/af-…). Fonte única: geram os comandos nativos do Claude Code e do OpenCode
// e a tabela de comandos do MENU.md, que o agente apresenta depois do arranque em qualquer CLI.
export interface Command { description: string; prompt: string }

const common = 'Lê `.agentforge/work/state.md`. Faz só as perguntas necessárias (forge-clarify) e respeita as aprovações humanas.';

export const utilityCommands: Record<string, Command> = {
  'af-menu': {
    description: 'Lista os comandos e as opções do AgentForge, com a explicação de cada um',
    prompt: 'Lê `.agentforge/MENU.md` e apresenta a tabela de comandos e a de opções, com a explicação de cada uma. Não alteres nada.'
  },
  'af-estado': {
    description: 'Mostra o estado do projecto, a fase actual e os próximos passos',
    prompt: 'Lê `.agentforge/work/state.md` e resume o fluxo, a fase, as aprovações dadas, os artefactos e os próximos passos. Não alteres nada.'
  },
  'af-retomar': {
    description: 'Retoma o trabalho do último ponto seguro registado',
    prompt: `${common} Lê também \`.agentforge/work/context.md\`, confirma com a pessoa o ponto de retoma e continua a partir daí; nunca repitas trabalho já aprovado.`
  },
  'af-plano': {
    description: 'Propõe o perfil, o fluxo e os especialistas para um pedido, sem executar',
    prompt: `${common} Classifica o pedido (consulta \`.agentforge/MODEL_ROUTING.md\` e \`.agentforge/CAPABILITIES.md\`), propõe perfil, fluxo, especialistas e competências e pára para aprovação. Não executes nada.`
  },
  'af-contexto': {
    description: 'Mostra e compacta o contexto activo e as lições pendentes',
    prompt: 'Consulta `.agentforge/CONTEXT_LEARNING.md` e `.agentforge/work/context.md`, resume o contexto activo, indica o que pode ser compactado e lista as lições pendentes de aprovação. Não aprovas lições por ti.'
  }
};

export const commandName = (workflow: string): string => `af-${workflow.replace(/^forge-/, '')}`;

export const commands: Record<string, Command> = {
  ...utilityCommands,
  ...Object.fromEntries(Object.entries(workflows).map(([name, workflow]) => [commandName(name), {
    description: workflow.description,
    prompt: `Executa o fluxo \`${name}\` do AgentForge: lê \`.agentforge/workflows/${name}.json\`. ${common} Pára nos pontos de aprovação e não declares nada concluído sem evidência.`
  }]))
};
