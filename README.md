# AgentForge Harness Kit

O **AgentForge Harness Kit** é um instalador de instruções e capacidades de IA para projetos de software e trabalho técnico. Prepara o contexto do projeto para que o CLI de IA escolhido trabalhe com papéis, competências, fluxos de trabalho, critérios de validação e regras de segurança consistentes.

O kit suporta **OpenCode, Codex CLI, Claude Code e Google Antigravity**. Instala os ficheiros nativos de cada ferramenta e mantém uma configuração partilhada do AgentForge no projeto. Não é um modelo de IA, não substitui os CLIs e não executa autonomamente agentes, ferramentas, integrações ou operações externas.

## O que oferece

- **Sete perfis de trabalho:** gestor de projetos, gestor de projetos de sistemas de informação, engenheiro de IA, programador sénior, editor de revistas, estudante universitário e analista de sistemas.
- **Competências reutilizáveis:** análise de requisitos, investigação, verificação de factos, auditoria, implementação, testes, análise de desempenho, tomada de decisão, experimentação técnica, encaminhamento de modelos e gestão de contexto.
- **Fluxos de trabalho verificáveis:** análise de incidentes, auditoria de repositórios, desenho e avaliação de soluções de IA, análise de sistemas, exploração técnica, automação de processos, entre outros.
- **Encaminhamento por complexidade:** recomenda modelos de raciocínio para decisões incertas ou de risco elevado e modelos económicos para execução delimitada e aprovada. Só selecciona um modelo quando o CLI suporta essa opção e existe um modelo configurado.
- **Contexto e memória locais:** guarda o estado do projeto, um resumo activo e lições com evidência, âmbito e aprovação humana. O contexto pode ser limitado por um orçamento estimado.
- **Melhoria contínua auditável:** agrega execuções registadas e evidencia erros recorrentes sem alterar automaticamente instruções ou aprovar lições.
- **Coordenação de subagentes condicionada ao CLI:** identifica trabalho independente que pode ser delegado, com dependências, papel, competências e limites explícitos. Se o CLI não suportar subagentes, a execução é sequencial.
- **Instalação reversível e segura:** detecta conflitos, preserva alterações do utilizador e mantém os dados de trabalho durante actualizações e desinstalações.

## Modelo de funcionamento

```text
Pedido
  → perfil e fluxo de trabalho
  → competências e ferramentas necessárias
  → recomendação de modelo e plano de coordenação
  → execução pelo CLI, com aprovações aplicáveis
  → validação com evidência
  → registo local e aprendizagem revista por uma pessoa
```

O AgentForge separa conceitos para evitar duplicação: um **perfil** define a perspectiva de trabalho; um **agente** representa um especialista; uma **competência** descreve uma capacidade reutilizável; um **fluxo de trabalho** define os passos e validações; uma **ferramenta** depende do que o CLI disponibiliza; um **modelo** define a estrutura do resultado. Uma proposta do comando `plan` não significa que qualquer etapa tenha sido executada.

## Instalação

Requer Node.js 20 ou posterior. O repositório é privado, pelo que a conta Git da máquina tem de ter acesso.

```powershell
gh auth login
gh auth setup-git
npm install -g git+https://github.com/rjbsantos/AgentForge-Harness-Kit.git
agentforge install --project D:\caminho\do\projeto --cli all
agentforge status --project D:\caminho\do\projeto
```

`gh auth setup-git` configura o Git para utilizar a autenticação do GitHub CLI; é necessário porque o npm chama o Git directamente. Em alternativa, configure uma chave SSH e utilize `git+ssh://git@github.com/rjbsantos/AgentForge-Harness-Kit.git`.

Também é possível instalar o ficheiro `.tgz` disponível na secção Releases do GitHub, sem autenticação Git:

```powershell
npm install -g D:\transferencias\agentforge-harness-kit-0.8.0.tgz
```

O kit não está publicado no registo npm. O tarball de uma versão deve ser obtido na página oficial de [versões do projeto](https://github.com/rjbsantos/AgentForge-Harness-Kit/releases).

O parâmetro `--cli` aceita `opencode`, `codex`, `claude`, `antigravity` ou `all`. A instalação pode ser repetida para actualizar ficheiros geridos ou acrescentar outro CLI:

```powershell
agentforge install --project D:\caminho\do\projeto --cli claude --dry-run
agentforge install --project D:\caminho\do\projeto --cli claude
agentforge uninstall --project D:\caminho\do\projeto --cli claude
```

O `--dry-run` apresenta as alterações sem as aplicar. A desinstalação remove apenas ficheiros que o instalador ainda controla; os ficheiros alterados pelo utilizador e os dados de trabalho são preservados.

## Escolher um perfil e preparar um plano

O comando `plan` identifica um perfil e um fluxo de trabalho a partir do pedido, ou aceita uma escolha explícita:

```powershell
agentforge plan --project D:\caminho\do\projeto --cli codex --prompt "Analisa os riscos do projeto"
agentforge plan --project D:\caminho\do\projeto --cli claude --prompt "Avalia se devemos comprar ou desenvolver esta solução" --role it-project-manager --workflow solution-briefing
```

A saída inclui o perfil, o agente, o fluxo, as competências e ferramentas necessárias, os passos, os critérios de validação, a recomendação de modelo e a coordenação proposta. Ferramentas são assinaladas como não verificadas até o CLI confirmar que estão disponíveis. Um pedido ambíguo exige clarificação; uma preferência definida no perfil do operador pode desempatar perfis que correspondam ao pedido, sem adivinhar quando não há correspondência.

O perfil do operador é opcional e local ao projeto:

```powershell
agentforge operator set --project D:\caminho\do\projeto `
  --headline "Gestor de projetos de sistemas de informação com perfil técnico" `
  --roles it-project-manager,systems-analyst,ai-engineer,senior-developer `
  --language pt-PT --risk balanced `
  --interests "arquitetura de sistemas, engenharia de IA, automação"
agentforge operator show --project D:\caminho\do\projeto
```

A postura de risco `cautious` pode reforçar o encaminhamento para raciocínio; nenhuma preferência pessoal reduz as aprovações ou as validações exigidas.

## Modelos e encaminhamento

O comando `route` classifica uma tarefa e recomenda o perfil de modelo:

```powershell
agentforge route --project D:\caminho\do\projeto --cli opencode --prompt "Desenha a arquitetura de autenticação"
agentforge route --project D:\caminho\do\projeto --cli claude --prompt "Implementa a especificação aprovada" --planned --approved
```

Para mapear os nomes de modelos da própria conta, crie `.agentforge/work/model-profiles.json`:

```json
{
  "opencode": {
    "thinking": "fornecedor/modelo-de-raciocinio",
    "economy": "fornecedor/modelo-economico"
  },
  "claude": {
    "thinking": "opus",
    "economy": "haiku"
  }
}
```

`route` e `plan` apenas recomendam. Não contactam fornecedores, não mudam o modelo da sessão e não afirmam uma poupança sem medições reais.

## Contexto, memória e melhoria contínua

O estado e o resumo activo ficam em `.agentforge/work/`. Actualize o resumo no fim de uma fase relevante, em vez de acumular transcrições:

```powershell
agentforge context save --project D:\caminho\do\projeto --summary "Objetivo: ...; fase: ...; decisão aprovada: ...; evidência: docs\plano.md" --next "Executar os testes"
agentforge context --project D:\caminho\do\projeto --topic testes --budget-tokens 1200
```

O contexto inclui o estado, o resumo e até cinco lições aprovadas pertinentes, dentro do orçamento indicado. A estimativa corresponde aproximadamente a um token por quatro caracteres; não é a contagem exacta de um modelo. O comando informa quantas lições omitiu e recusa reduzir silenciosamente o estado ou o resumo se estes excederem o orçamento.

Uma lição exige evidência dentro do projeto e começa como pendente. Só passa a ser reutilizada após aprovação explícita:

```powershell
agentforge learn add --project D:\caminho\do\projeto --lesson "Validar os contratos entre o cliente e o servidor" --evidence "tests\contracts.test.ts:42"
agentforge learn list --project D:\caminho\do\projeto
agentforge learn approve --project D:\caminho\do\projeto --id <identificador>
agentforge learn retire --project D:\caminho\do\projeto --id <identificador>
agentforge insights --project D:\caminho\do\projeto
```

As lições podem ser específicas do projeto (`project`) ou reutilizáveis (`reusable`). As reutilizáveis exigem uma âncora de tecnologia e versão, por exemplo `--scope reusable --anchor "Node 20"`. `insights` resume apenas execuções registadas explicitamente; não recolhe conversas nem promove automaticamente padrões a lições ou instruções.

## Ficheiros instalados

O instalador cria instruções para o CLI escolhido, ficheiros nativos de agentes e competências, e o catálogo partilhado:

| Localização | Conteúdo |
| --- | --- |
| `.agentforge/HARNESS.md` | Regras de utilização e coordenação |
| `.agentforge/CAPABILITIES.md` | Catálogo de perfis, fluxos, competências e ferramentas |
| `.agentforge/workflows/` e `.agentforge/templates/` | Definições de fluxos e modelos de resultado |
| `.agentforge/roles/` | Instruções dos papéis especializados |
| `.agentforge/work/` | Estado, contexto, perfil local e registos de aprendizagem |
| `.agents/`, `.claude/`, `.codex/`, `.opencode/` | Integração nativa para o CLI seleccionado |

O estado de trabalho e o perfil do operador não são partilhados entre utilizadores pelo pacote. Não guarde credenciais ou dados pessoais sensíveis nestes ficheiros.

## Desenvolvimento e testes

```powershell
npm ci
npm test
npm run smoke
```

`npm test` compila e executa os testes unitários. `npm run smoke` cria um tarball, instala-o num projeto temporário e verifica os fluxos essenciais através do pacote distribuível. O CI executa ambos em Linux, Windows e macOS, com Node.js 20 e 22.

Consulte [Contribuir](CONTRIBUTING.md), a [arquitetura](docs/architecture/OVERVIEW.md), a [estratégia de testes](docs/testing/STRATEGY.md) e o [guia de operação](docs/operations/GUIDE.md). As funcionalidades planeadas mas não disponíveis estão identificadas no [backlog](docs/operations/BACKLOG.md).
