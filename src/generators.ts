import { workflows } from './capabilities.js';
import { roles } from './roles.js';
import { skills } from './skills.js';
import { type Target } from './target.js';

const opencodeTheme = {
  $schema: 'https://opencode.ai/theme.json',
  defs: {
    background: '#101319',
    panel: '#171e29',
    element: '#202b3a',
    foreground: '#e6edf6',
    muted: '#9baabd',
    blue: '#62b5ff',
    cyan: '#54d6c7',
    violet: '#a78bfa',
    orange: '#ffb86b',
    red: '#ff6b7a',
    green: '#7bd88f'
  },
  theme: {
    primary: 'blue',
    secondary: 'cyan',
    accent: 'violet',
    error: 'red',
    warning: 'orange',
    success: 'green',
    info: 'blue',
    text: 'foreground',
    textMuted: 'muted',
    background: 'background',
    backgroundPanel: 'panel',
    backgroundElement: 'element',
    border: '#344052',
    borderActive: 'blue',
    borderSubtle: '#26303d',
    diffAdded: 'green',
    diffRemoved: 'red',
    diffContext: 'muted',
    diffHunkHeader: 'violet',
    diffHighlightAdded: 'green',
    diffHighlightRemoved: 'red',
    diffAddedBg: '#183127',
    diffRemovedBg: '#351e27',
    diffContextBg: 'panel',
    diffLineNumber: 'muted',
    diffAddedLineNumberBg: '#20352d',
    diffRemovedLineNumberBg: '#3a252b',
    markdownText: 'foreground',
    markdownHeading: 'blue',
    markdownLink: 'cyan',
    markdownLinkText: 'blue',
    markdownCode: 'green',
    markdownBlockQuote: 'muted',
    markdownEmph: 'orange',
    markdownStrong: 'violet',
    markdownHorizontalRule: 'muted',
    markdownListItem: 'cyan',
    markdownListEnumeration: 'blue',
    markdownImage: 'violet',
    markdownImageText: 'blue',
    markdownCodeBlock: 'foreground',
    syntaxComment: 'muted',
    syntaxKeyword: 'violet',
    syntaxFunction: 'blue',
    syntaxVariable: 'cyan',
    syntaxString: 'green',
    syntaxNumber: 'orange',
    syntaxType: 'cyan',
    syntaxOperator: 'blue',
    syntaxPunctuation: 'foreground'
  }
};

export function generated(target: Target): Record<string, string> {
  const files: Record<string, string> = {};
  if (target === 'codex' || target === 'opencode' || target === 'antigravity') {
    for (const [name, content] of Object.entries(skills)) {
      files[`.agents/skills/${name}/SKILL.md`] = content;
    }
  }
  if (target === 'claude') {
    for (const [name, content] of Object.entries(skills)) {
      files[`.claude/skills/${name}/SKILL.md`] = content;
    }
  }
  if (target === 'opencode' || target === 'claude') {
    const primary = target === 'opencode'
      ? '---\ndescription: Orquestrador AgentForge para fluxos de trabalho, encaminhamento de modelos e aprendizagem.\nmode: primary\n---\n'
      : '---\nname: agentforge\ndescription: Orquestrador AgentForge para fluxos de trabalho, encaminhamento de modelos e aprendizagem.\n---\n';
    files[`.${target}/agents/agentforge.md`] = `${primary}\nÉs o AgentForge. Lê .agentforge/HARNESS.md, .agentforge/work/state.md e .agentforge/work/context.md. Consulta .agentforge/CONTEXT_LEARNING.md ao consolidar uma fase. Mantém todas as alterações e artefactos do projecto sob a respectiva raiz; valida caminhos antes de escrever e pára perante destinos externos ou ligações simbólicas que escapem à raiz. Delega apenas quando a tarefa o justificar e preserva as aprovações humanas.\n`;
    for (const [name, role] of Object.entries(roles)) {
      const header = target === 'opencode'
        ? `---\ndescription: ${role.description}\nmode: subagent\n---\n`
        : `---\nname: ${name}\ndescription: ${role.description}\n---\n`;
      files[`.${target}/agents/${name}.md`] = `${header}\n${role.body}\n\nLê .agentforge/HARNESS.md e .agentforge/work/state.md antes de agir. Apresenta evidências e encaminha o trabalho; não pressuponhas aprovação.\n`;
    }
  }
  if (target === 'opencode') {
    files['opencode.json'] = `${JSON.stringify({
      $schema: 'https://opencode.ai/config.json',
      default_agent: 'agentforge'
    }, null, 2)}\n`;
    files['tui.json'] = `${JSON.stringify({
      $schema: 'https://opencode.ai/tui.json',
      theme: 'agentforge'
    }, null, 2)}\n`;
    files['.opencode/themes/agentforge.json'] = `${JSON.stringify(opencodeTheme, null, 2)}\n`;
    files['.opencode/commands/agentforge.md'] = `---
description: Inicia uma tarefa AgentForge escolhendo o tipo de trabalho
agent: agentforge
---

Inicia uma sessão de trabalho AgentForge. Se o utilizador não tiver especificado já um objetivo claro, apresenta primeiro esta escolha numerada e aguarda a resposta, sem executar tarefas nem alterar ficheiros:

1. Planear ou acompanhar um projeto
2. Desenhar uma solução de IA ou automação
3. Desenvolver, depurar, rever ou testar software
4. Pesquisar, escrever ou editar um texto
5. Estudar um tema ou preparar um trabalho académico
6. Analisar requisitos, processos ou sistemas
7. Outra tarefa

Depois da escolha, pergunta apenas os dados em falta para compreender o objetivo e os critérios de sucesso. Em seguida, consulta \`.agentforge/HARNESS.md\` e prepara a composição adequada de perfil, fluxo e competências. Distingue sempre um plano de uma execução; pede aprovação antes de operações que a exijam. Se o utilizador já tiver incluído o objetivo como argumento, usa-o como contexto e não repitas perguntas respondidas.

Pedido inicial: $ARGUMENTS
`;
  }
  if (target === 'antigravity') {
    files['.agents/rules/agentforge.md'] = `---\ntrigger: always_on\ndescription: Instruções do AgentForge para este espaço de trabalho.\n---\n\n# AgentForge\n\nÉs o AgentForge para as tarefas abrangidas pelo harness. Segue \`.agentforge/HARNESS.md\`; lê \`.agentforge/work/state.md\` e \`.agentforge/work/context.md\` antes de cada etapa. Mantém alterações e artefactos do projecto dentro da raiz; valida cada caminho antes de escrever e pára perante destinos externos ou ligações simbólicas que escapem à raiz. Utiliza os papéis em \`.agentforge/roles/\` como instruções; este instalador não configura subagentes nativos.\n`;
    for (const [name, pipeline] of Object.entries({ 'forge-build': 'A', 'forge-audit': 'B', 'forge-document': 'C' })) {
      files[`.agents/workflows/${name}.md`] = `# ${name}\n\nExecuta o processo AgentForge ${pipeline} descrito em \`.agentforge/HARNESS.md\`. Lê primeiro o estado do projeto. Segue as passagens de trabalho entre papéis e os controlos de aprovação; pára quando for necessária aprovação humana. Regista evidências e actualiza o estado após cada etapa verificada.\n`;
    }
    for (const [name, workflow] of Object.entries(workflows)) {
      const pipeline = name === 'forge-build' ? 'Executa o processo AgentForge A. ' : '';
      files[`.agents/workflows/${name}.md`] =
        `# AgentForge — ${name}\n\n${pipeline}${workflow.description}\n\n` +
        `Gatilho: ${workflow.trigger}.\nPré-condições: ${workflow.preconditions.join('; ')}.\nEntradas: ${workflow.inputs.join('; ')}.\n\n` +
        workflow.steps.map((step, index) => `${index + 1}. ${step}`).join('\n') +
        `\n\nGrupos paralelos (passos numerados a partir de 1; apenas se o host suportar subagentes): ${workflow.parallelGroups.length
          ? workflow.parallelGroups.map(group => `após [${group.after.join(', ')}] -> ` +
            group.workers.map(worker => `${worker.step}:${worker.role} (${worker.skills.join(', ')})`).join(', ')).join('; ')
          : 'nenhum; executar sequencialmente'}.\n` +
        `\n\nCompetências: ${workflow.skills.join(', ')}. Ferramentas (confirmar disponibilidade): ${workflow.tools.join(', ')}.\n` +
        `Validação: ${workflow.validation.join('; ')}. Resultado: ${workflow.output}, segundo .agentforge/templates/${workflow.template}.md.\n` +
        `Se houver bloqueio: ${workflow.errorHandling}.\nPós-condição: ${workflow.postcondition}.\n`;
    }
  }
  if (target === 'codex') {
    files['.codex/agents/agentforge.toml'] = `name = "agentforge"\ndescription = "Orquestrador AgentForge para fluxos de trabalho, contexto e aprendizagem."\ndeveloper_instructions = "És o AgentForge para as tarefas abrangidas pelo harness. Lê .agentforge/HARNESS.md, .agentforge/work/state.md e .agentforge/work/context.md. Mantém alterações e artefactos do projecto dentro da raiz; valida cada caminho antes de escrever e pára perante destinos externos ou ligações simbólicas que escapem à raiz. Respeita as aprovações humanas e consulta .agentforge/CONTEXT_LEARNING.md para as lições. Delega tarefas delimitadas quando adequado."\n`;
    for (const name of Object.keys(roles)) {
      const role = roles[name];
      files[`.codex/agents/${name}.toml`] = `name = ${JSON.stringify(name)}\ndescription = ${JSON.stringify(role.description)}\ndeveloper_instructions = ${JSON.stringify(`És o especialista AgentForge ${name}. ${role.body} Segue .agentforge/HARNESS.md; entrega evidência e encaminha o trabalho.`)}\n`;
    }
  }
  return files;
}
