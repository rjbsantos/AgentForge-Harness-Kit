import { profiles, templates, tools, workflows } from './capabilities.js';
import { guide, modelRouting, contextLearning, operatorProfile, operatorDefault, state, activeContext } from './docs.js';
import { generated } from './generators.js';
import { roles } from './roles.js';
import { skills } from './skills.js';
import { type Target } from './target.js';

export { targets, type Target } from './target.js';
export { generated, roles, skills };
export type { Role } from './roles.js';

const capabilities = `# Catálogo de capacidades AgentForge

| Perfil | Agente | Fluxos de trabalho |
| --- | --- | --- |
${Object.entries(profiles).map(([id, profile]) =>
  `| ${profile.title} (\`${id}\`) | \`${profile.agent}\` | ${profile.workflows.map(name => `\`${name}\``).join(', ')} |`).join('\n')}

Competências transversais: ${Object.keys(skills).map(name => `\`${name}\``).join(', ')}.
Ferramentas disponíveis **apenas se forem disponibilizadas pelo CLI**:
${Object.entries(tools).map(([name, description]) => `- \`${name}\`: ${description}`).join('\n')}

Os fluxos declarativos em \`.agentforge/workflows/\` especificam entradas, passos, validação, tratamento de erros, resultados, modelo de saída e grupos paralelos permitidos (passos numerados a partir de 1, com dependências explícitas). O comando \`agentforge plan\` selecciona uma composição e declara os grupos, mas não executa ferramentas nem agentes; o paralelismo depende do suporte do CLI. Consulta \`work/state.md\` e confirma as permissões antes de agir.
`;

export const shared: Record<string, string> = {
  '.agentforge/HARNESS.md': guide,
  '.agentforge/CAPABILITIES.md': capabilities,
  '.agentforge/MODEL_ROUTING.md': modelRouting,
  '.agentforge/CONTEXT_LEARNING.md': contextLearning,
  '.agentforge/OPERATOR.md': operatorProfile,
  '.agentforge/work/state.md': state,
  '.agentforge/work/context.md': activeContext,
  '.agentforge/work/operator.json': operatorDefault,
  '.agentforge/work/lessons.json': '{\n  "version": 1,\n  "lessons": []\n}\n',
  ...Object.fromEntries(Object.entries(workflows).map(([name, workflow]) =>
    [`.agentforge/workflows/${name}.json`, JSON.stringify({ name, ...workflow }, null, 2) + '\n'])),
  ...Object.fromEntries(Object.entries(templates).map(([name, content]) =>
    [`.agentforge/templates/${name}.md`, content])),
  ...Object.fromEntries(Object.entries(roles).map(([name, role]) =>
    [`.agentforge/roles/${name}.md`, `# ${name}\n\n${role.description}\n\n${role.body}\n`]))
};

export const instruction = (target: Target): string =>
  `Para as tarefas abrangidas pelo harness, actua como AgentForge e lê \`.agentforge/HARNESS.md\`, \`.agentforge/MODEL_ROUTING.md\`, \`.agentforge/OPERATOR.md\`, \`.agentforge/work/state.md\` e \`.agentforge/work/context.md\`. Mantém todas as alterações e artefactos do projecto dentro da raiz; valida caminhos antes de escrever, copiar ou eliminar, e pára perante destinos externos ou ligações simbólicas que escapem à raiz. Consulta \`.agentforge/CONTEXT_LEARNING.md\` para consolidar lições verificadas. Classifica cada tarefa pela complexidade e usa modelos configurados apenas se este host permitir a sua selecção. Papéis: \`.agentforge/roles/\`. ${target === 'claude' ? 'Agente principal opcional: claude --agent agentforge; subagentes nativos: .claude/agents/.' : target === 'opencode' ? 'Selecciona agentforge como agente principal; subagentes: .opencode/agents/.' : 'Segue as instruções dos papéis; delega apenas se o host suportar essa capacidade.'}`;

// Os dois catálogos são declarados em módulos distintos; esta verificação em tempo de carregamento
// impede que um workflow passe a referir uma skill inexistente sem ninguém dar por isso.
export function validateSkillReferences(): void {
  for (const [name, workflow] of Object.entries(workflows)) {
    const missing = workflow.skills.filter(item => !(item in skills));
    if (missing.length) throw new Error(`Workflow ${name} refere skills inexistentes: ${missing.join(', ')}`);
    for (const group of workflow.parallelGroups) {
      for (const worker of group.workers) {
        if (!(worker.role in roles)) throw new Error(`Workflow ${name} refere papel paralelo inexistente: ${worker.role}`);
        const missingWorkerSkills = worker.skills.filter(item => !(item in skills));
        if (missingWorkerSkills.length) {
          throw new Error(`Workflow ${name} refere skills paralelas inexistentes: ${missingWorkerSkills.join(', ')}`);
        }
      }
    }
  }
  for (const [id, profile] of Object.entries(profiles)) {
    if (!(profile.agent in roles)) throw new Error(`Perfil ${id} refere um agente inexistente: ${profile.agent}`);
  }
}

validateSkillReferences();
