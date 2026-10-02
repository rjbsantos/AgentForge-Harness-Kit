# Catálogo de fluxos de trabalho

Fonte de verdade: `workflows` em `src/capabilities.ts`. Cada fluxo define o seu objectivo, gatilho, pré-condições, entradas, passos, competências, ferramentas necessárias, validações, tratamento de bloqueios, resultado esperado e modelo de saída.

Na instalação, cada fluxo é escrito em formato JSON em `.agentforge/workflows/`. O Antigravity recebe também uma versão Markdown em `.agents/workflows/`. `forge-build` combina análise de requisitos, implementação orientada por testes e verificação. Os processos de auditoria e documentação permanecem descritos no manual do AgentForge.

## Composição e validação

Os fluxos combinam competências existentes, sem as duplicar:

- Artigos e investigação académica: `forge-research`, `forge-fact-check` e `forge-verify`.
- Análise de sistemas: `forge-requirements`, `forge-research` e `forge-verify`.
- Auditoria de repositórios: `forge-audit`, `forge-research`, `forge-performance` e `forge-verify`.
- Decisão de solução: `forge-requirements`, `forge-research`, `forge-tradeoff` e `forge-verify`.
- Exploração técnica: `forge-research`, `forge-spike`, `forge-tradeoff` e `forge-verify`.

O fluxo `repository-audit` pode repartir a análise de qualidade, segurança e desempenho depois de mapear o repositório. Inclui também `forge-hygiene` para identificar código, ficheiros e dependências potencialmente mortos ou obsoletos; estas são recomendações com evidência, não remoções automáticas. A proposta associa cada ramo a um especialista:

| Passo | Especialista | Competência |
| --- | --- | --- |
| 2 — qualidade e manutenção | `code-critic` | `forge-audit` |
| 3 — segurança | `secops` | `forge-audit` |
| 4 — desempenho | `reverse-engineer` | `forge-performance` |

`plan` inclui dependências, especialistas e limite de concorrência na proposta. A execução em paralelo só pode ocorrer quando o CLI suporta subagentes. Sem esse suporte, os passos são executados sequencialmente. O coordenador principal integra os resultados e é o único responsável por escrever nos ficheiros abrangidos; os agentes delegados não podem voltar a delegar.

## Fluxos do gestor de projetos de sistemas de informação

| Fluxo | Entradas principais | Resultado |
| --- | --- | --- |
| `solution-briefing` | Necessidade de negócio e restrições | Opções comparadas, recomendação e registo da decisão |
| `automation-opportunity` | Processo actual e volume de trabalho | Plano de automação com excepções e intervenção humana |
| `tech-exploration` | Pergunta técnica e limite de tempo | Experiência registada e decisão fundamentada |
| `continuous-improvement` | Período de análise e registos de execução | Melhorias priorizadas e propostas de lições |

`continuous-improvement` utiliza os registos de `.agentforge/work/operations.jsonl`. O comando `agentforge insights` agrega os dados disponíveis e destaca erros recorrentes; uma pessoa verifica os registos antes de propor uma lição. A aprovação continua manual. `solution-briefing` utiliza `solution-brief.md` e `decision-record.md` para documentar a análise e a decisão.

## Fronteira de execução

Um plano descreve trabalho a realizar; não confirma que tenha sido executado. O CLI escolhido tem de confirmar as ferramentas disponíveis, obter as aprovações aplicáveis e executar os passos. Se faltar informação, capacidade ou autorização, o fluxo deve parar e registar o motivo, em vez de avançar com pressupostos.
