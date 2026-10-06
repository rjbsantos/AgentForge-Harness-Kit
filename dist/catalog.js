import { profiles, templates, tools, workflows } from './capabilities.js';
import { commands } from './commands.js';
import { guide, manual, modelRouting, contextLearning, operatorProfile, operatorDefault, state, activeContext } from './docs.js';
import { generated } from './generators.js';
import { roles } from './roles.js';
import { skills } from './skills.js';
export { targets } from './target.js';
export { generated, roles, skills };
const capabilities = `# Catálogo de capacidades AgentForge

| Perfil | Agente | Fluxos de trabalho |
| --- | --- | --- |
${Object.entries(profiles).map(([id, profile]) => `| ${profile.title} (\`${id}\`) | \`${profile.agent}\` | ${profile.workflows.map(name => `\`${name}\``).join(', ')} |`).join('\n')}

Competências transversais: ${Object.keys(skills).map(name => `\`${name}\``).join(', ')}.
Ferramentas disponíveis **apenas se forem disponibilizadas pelo CLI**:
${Object.entries(tools).map(([name, description]) => `- \`${name}\`: ${description}`).join('\n')}

Os fluxos declarativos em \`.agentforge/workflows/\` especificam entradas, passos, validação, tratamento de erros, resultados, modelo de saída e grupos paralelos permitidos (passos numerados a partir de 1, com dependências explícitas). O comando \`agentforge plan\` selecciona uma composição e declara os grupos, mas não executa ferramentas nem agentes; o paralelismo depende do suporte do CLI. Consulta \`work/state.md\` e confirma as permissões antes de agir.
`;
// Lista de opções, mostrada depois do arranque mínimo (e não lida de início). Gerada do catálogo.
const menu = `# Opções AgentForge

Descreve o que queres fazer, ou escolhe uma opção. Faço só as perguntas necessárias antes de avançar.

## Comandos

| Comando | O que faz |
| --- | --- |
${Object.entries(commands).map(([name, command]) => `| \`/${name}\` | ${command.description} |`).join('\n')}

Em Claude Code e OpenCode os comandos são nativos (escreve \`/\` para os ver). Nos restantes CLIs escreve o nome do comando (por exemplo \`/af-build\`) ou descreve o que queres: o agente reconhece o mesmo comando.

## Opções (fluxos)

| Quero… | Fluxo | Especialista |
| --- | --- | --- |
${Object.entries(workflows).map(([name, workflow]) => {
    const owner = Object.values(profiles).find(profile => profile.workflows.includes(name));
    return `| ${workflow.description} | \`${name}\` | ${owner ? `\`${owner.agent}\`` : '—'} |`;
}).join('\n')}

Na linha de comandos do sistema: \`agentforge plan --prompt "..."\` e \`agentforge status\`. Detalhes dos fluxos em \`.agentforge/workflows/\`.
`;
export const shared = {
    '.agentforge/HARNESS.md': guide,
    '.agentforge/GUIDE.md': manual,
    '.agentforge/MENU.md': menu,
    '.agentforge/CAPABILITIES.md': capabilities,
    '.agentforge/MODEL_ROUTING.md': modelRouting,
    '.agentforge/CONTEXT_LEARNING.md': contextLearning,
    '.agentforge/OPERATOR.md': operatorProfile,
    '.agentforge/work/state.md': state,
    '.agentforge/work/context.md': activeContext,
    '.agentforge/work/operator.json': operatorDefault,
    '.agentforge/work/lessons.json': '{\n  "version": 1,\n  "lessons": []\n}\n',
    ...Object.fromEntries(Object.entries(workflows).map(([name, workflow]) => [`.agentforge/workflows/${name}.json`, JSON.stringify({ name, ...workflow }, null, 2) + '\n'])),
    ...Object.fromEntries(Object.entries(templates).map(([name, content]) => [`.agentforge/templates/${name}.md`, content])),
    ...Object.fromEntries(Object.entries(roles).map(([name, role]) => [`.agentforge/roles/${name}.md`, `# ${name}\n\n${role.description}\n\n${role.body}\n`]))
};
export const instruction = (target) => `Para as tarefas abrangidas pelo harness, actua como AgentForge. No arranque lê só \`.agentforge/HARNESS.md\` e \`.agentforge/work/state.md\`; depois apresenta as opções de \`.agentforge/MENU.md\`. O resto (\`.agentforge/GUIDE.md\`, contexto, encaminhamento, operador, lições, papéis e competências) carrega-se apenas quando a tarefa o exigir. Mantém todas as alterações e artefactos do projecto dentro da raiz; valida caminhos antes de escrever, copiar ou eliminar, e pára perante destinos externos ou ligações simbólicas que escapem à raiz. ${target === 'claude' ? 'Agente principal opcional: claude --agent agentforge; subagentes nativos: .claude/agents/.' : target === 'opencode' ? 'Selecciona agentforge como agente principal; subagentes: .opencode/agents/.' : 'Segue as instruções dos papéis; delega apenas se o host suportar essa capacidade.'}`;
// Os dois catálogos são declarados em módulos distintos; esta verificação em tempo de carregamento
// impede que um workflow passe a referir uma skill inexistente sem ninguém dar por isso.
export function validateSkillReferences() {
    for (const [name, workflow] of Object.entries(workflows)) {
        const missing = workflow.skills.filter(item => !(item in skills));
        if (missing.length)
            throw new Error(`Workflow ${name} refere skills inexistentes: ${missing.join(', ')}`);
        for (const group of workflow.parallelGroups) {
            for (const worker of group.workers) {
                if (!(worker.role in roles))
                    throw new Error(`Workflow ${name} refere papel paralelo inexistente: ${worker.role}`);
                const missingWorkerSkills = worker.skills.filter(item => !(item in skills));
                if (missingWorkerSkills.length) {
                    throw new Error(`Workflow ${name} refere skills paralelas inexistentes: ${missingWorkerSkills.join(', ')}`);
                }
            }
        }
    }
    for (const [id, profile] of Object.entries(profiles)) {
        if (!(profile.agent in roles))
            throw new Error(`Perfil ${id} refere um agente inexistente: ${profile.agent}`);
    }
}
validateSkillReferences();
//# sourceMappingURL=catalog.js.map