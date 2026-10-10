# Catálogo de fluxos de trabalho

Fonte de verdade: `workflows` em `src/capabilities.ts`. Cada fluxo define o seu objectivo, gatilho, pré-condições, entradas, passos, competências, ferramentas necessárias, validações, tratamento de bloqueios, resultado esperado e modelo de saída.

Na instalação, cada fluxo é escrito em formato JSON em `.agentforge/workflows/`. O Antigravity recebe também uma versão Markdown em `.agents/workflows/`. `forge-build` combina análise de requisitos, implementação orientada por testes e verificação. Os processos de auditoria e documentação permanecem descritos no manual do AgentForge.

## Composição e validação

Os fluxos combinam competências existentes, sem as duplicar:

- Análise de sistemas: `forge-requirements`, `forge-research` e `forge-verify`.
- Auditoria de repositórios: `forge-audit`, `forge-research`, `forge-performance` e `forge-verify`.
- Decisão de solução: `forge-requirements`, `forge-research`, `forge-tradeoff` e `forge-verify`.
- Exploração técnica: `forge-research`, `forge-spike`, `forge-tradeoff` e `forge-verify`.

O fluxo `repository-audit` pode repartir a análise de qualidade, segurança e desempenho depois de mapear o repositório. Usa `forge-graph` para consultar um grafo graphify existente e etiqueta cada achado com `EXTRACTED`, `INFERRED` ou `AMBIGUOUS`. Inclui também `forge-hygiene` para identificar código, ficheiros e dependências potencialmente mortos ou obsoletos; estas são recomendações com evidência, não remoções automáticas. A proposta associa cada ramo a um especialista:

| Passo | Especialista | Competência |
| --- | --- | --- |
| 2 — qualidade e manutenção | `code-critic` | `forge-audit` |
| 3 — segurança | `secops` | `forge-audit` |
| 4 — desempenho | `reverse-engineer` | `forge-performance` |

`plan` inclui dependências, especialistas e limite de concorrência na proposta. A execução em paralelo só pode ocorrer quando o CLI suporta subagentes. Sem esse suporte, os passos são executados sequencialmente. O coordenador principal integra os resultados e é o único responsável por escrever nos ficheiros abrangidos; os agentes delegados não podem voltar a delegar.

## Processos A, B e C do AgentForge

| Processo | Fluxo | Fases |
| --- | --- | --- |
| A — Construção | `forge-build` | requisitos, arquitectura e plano (cada um com validação humana N1), implementação com testes primeiro e revisão por tarefa, revisão final, segurança, qualidade e infraestrutura (em paralelo, quando o CLI suporta subagentes), documentação e fecho do ramo |
| B — Auditoria e otimização | `repository-audit` | mapeamento, qualidade, higiene, segurança e desempenho; a pessoa selecciona os candidatos; só esses são implementados pelo fluxo A, com comparação antes e depois |
| C — Documentação | `technical-documentation` | mapeamento do sistema, documentação funcional e técnica (em paralelo), comparação com o código e validação humana |
| Manutenção | `change-request` e `bug-investigation` | pedido numerado, análise de impacto, aprovação do âmbito, ramo próprio, testes primeiro, pull request sem merge automático e arquivo |

Os pontos de validação humana usam `forge-checkpoint`: silêncio não é aprovação e cada passagem fica registada em `.agentforge/work/checkpoints/`. Segurança Crítica ou Elevada devolve o trabalho à implementação. `bug-investigation` mantém a regra de implementar só com autorização.

## Composição: fluxos que se completam

Um fluxo grande chama um menor em vez de o repetir. O campo `uses` de cada fluxo diz em que passo, quando e que artefacto passa de um para o outro; `agentforge plan` devolve-o em `composition` e um teste impede ciclos e referências inexistentes.

| Fluxo | Chama | No passo | Quando |
| --- | --- | --- | --- |
| `forge-build` | `requirements-analysis` | 2 | os requisitos ainda não estão aprovados |
| `forge-build` | `security-assessment` | 10 | sempre, antes de fechar o ramo |
| `change-request` | `security-assessment` | 5 | toca autenticação, dependências ou entradas externas |
| `bug-investigation` | `change-request` | 4 | a causa está no código e a correcção foi autorizada |
| `incident-analysis` | `bug-investigation` | 5 | a causa confirmada é um defeito de código |
| `system-analysis` | `requirements-analysis` | 2 | os requisitos ainda não estão numerados |
| `solution-briefing` | `tech-exploration` | 3 | a decisão depende de uma experiência |
| `project-status` | `risk-review` | 2 | não existe um registo de riscos actual |
| `ai-solution-design` | `guardrail-design` | 3 | sempre |
| `agent-build` | `guardrail-design`, `context-memory-setup`, `prompt-engineering`, `ai-evaluation`, `red-team` | 3 a 6 | conforme o agente (ferramentas, memória, prompts) |
| `red-team` | `guardrail-design` | 2 | não existem guardrails escritos |
| `production-cleanup` | `repository-audit`, `technical-documentation` | 2, 10 | sem auditoria sobre o mesmo commit; documentação desfasada |
| `release-closure` | `repository-audit`, `security-assessment`, `sast-remediation`, `technical-documentation`, `production-cleanup` | 3, 6, 6, 8, 10 | sem relatório sobre o mesmo commit; SAST por tratar; limpeza aprovada |

Cadeia habitual: `incident-analysis` → `bug-investigation` → `change-request`; e `repository-audit` → `production-cleanup` → `release-closure`.

## Fluxos de gestão de projecto

| Fluxo | Resultado | Complementa |
| --- | --- | --- |
| `project-plan` | Plano com pacotes, estimativas com intervalo e fonte, dependências, marcos verificáveis e linha de base | chama `requirements-analysis` e `risk-review` |
| `change-control` | Pedido CC-NNN com impacto em âmbito, prazo e custo, decisão de quem tem autoridade e linha de base actualizada | chama `project-plan`, `stakeholder-communication` e `change-request` (se a alteração for técnica) |
| `stakeholder-communication` | Plano de comunicação e textos a partir de factos, validados por quem assina; o kit não envia | usado por `project-status` e `meeting-followup` |
| `budget-tracking` | Orçamento aprovado vs custos reais com fonte, desvios e previsão com método | chama `change-control` quando a correcção exige reforço ou nova linha de base |
| `project-status`, `meeting-followup`, `risk-review`, `requirements-analysis` | Estado, acta, riscos e requisitos; agora com 4 passos, linha de base, factos separados de previsões e aprovação | chamam os anteriores conforme o caso |

Cadeia habitual: `requirements-analysis` → `project-plan` → `project-status` ↔ `risk-review` / `budget-tracking`; uma decisão que mexe na linha de base passa por `change-control`.

Os valores (datas, custos, estimativas) vêm sempre de uma fonte indicada; sem fonte ficam «em falta». Nenhum fluxo envia mensagens nem altera um orçamento.

## Fluxos de qualidade, segurança e compatibilidade

| Fluxo | Agentes | Resultado |
| --- | --- | --- |
| `sast-remediation` | `secops`, `lead-developer`, `qa` | Relatório do Checkmarx (ou outro SAST) triado com evidência, correcções com testes e comparação com o relatório novo |
| `edge-modernization` | `frontend-developer`, `devops`, `qa` | Aplicação sem dependência do modo IE, validada no Edge e optimizada, com plano de reversão |
| `guardrail-design` | `secops`, `ai-engineer` | Regras GR-NN testáveis por camada, com o que é imposto em código e o que é só instrução |
| `red-team` | `security-tester`, `lead-developer` | Corpus de ataque, veredicto por caso com três execuções e testes de regressão |

`guardrail-design` e `red-team` complementam-se: o primeiro escreve o contrato, o segundo ataca-o. Em `red-team` e `agent-build` o ataque só corre em ambiente local, com dados sintéticos, nunca em produção nem em sistemas de terceiros.

## Fluxos de desenvolvimento especializados

| Fluxo | Agentes | Resultado |
| --- | --- | --- |
| `forge-build` | `product-manager`, `architect`, `design-system-architect`, `lead-developer`, `backend-developer`, `frontend-developer`, `database-optimizer`, `code-critic`, `secops`, `qa`, `devops`, `tech-writer` | Projecto de ponta a ponta, do briefing (com perguntas pertinentes) à documentação |
| `frontend-build` | `design-system-architect`, `frontend-developer`, `accessibility-expert`, `ui-visual-validator` | Interface com design system (existente ou predefinido), acessível e validada visualmente |
| `database-optimization` | `database-optimizer` | Esquema, consulta ou migração otimizados em SQL, PostgreSQL ou MySQL, com medição antes e depois |
| `agent-build` | `agent-engineer`, `ai-engineer`, `secops` | Agente ou skill com LangChain, LangGraph ou Microsoft Agent Framework, testado e avaliado |
| `prompt-engineering` | `ai-engineer` | Prompt avaliado contra exemplos fixos e versionado |
| `security-assessment` | `secops`, `security-tester`, `lead-developer` | Modelo de ameaças, revisão de código e testes de segurança executáveis, com o que não foi executado declarado |
| `production-cleanup` | `reverse-engineer`, `code-critic`, `secops`, `lead-developer`, `devops`, `qa`, `tech-writer` | Código limpo (lixo, código e dependências mortos), otimizado e pronto para produção, com a documentação actualizada |
| `release-closure` | `product-manager`, `code-critic`, `database-optimizer`, `reverse-engineer`, `secops`, `ui-visual-validator`, `tech-writer`, `lead-developer`, `qa`, `devops` | Versão fechada com checklist de 14 áreas, relatório final e evidência; publicação só com autorização |
| `context-memory-setup` | `context-manager` | Política de contexto e memória (trabalho, curta, longa) testada |

`release-closure` fecha uma versão com a checklist `.agentforge/templates/release-closure.md` (14 áreas): requisitos e pendentes; em paralelo, limpeza, base de dados, desempenho, segurança, design system e documentação; consolidação com validação humana (N1); correcções em lotes pequenos; testes unitários, de integração e de regressão; testes E2E com Playwright; revisão de Git e ramos; versionamento por Semantic Versioning e changelog; critério de publicação com autorização expressa (N2) para commit, tag e publicação; verificação posterior e rollback; relatório final. Um item sem evidência fica declarado como não aplicável ou não testado, com a razão. Comando: `/af-release-closure`.

`production-cleanup` segue estas fases: linha de base e ramo próprio; mapeamento; candidatos a lixo, segurança para produção e desempenho (em paralelo, quando o CLI suporta subagentes); validação humana do que se remove; aplicação em lotes pequenos com testes e um commit por lote; preparação da entrega; medição antes e depois; actualização e limpeza da documentação. Nada é removido sem evidência e aprovação, e nada é publicado sem autorização.

## Arranque mínimo

O bloco de instruções manda ler só `HARNESS.md` e `state.md`; depois o agente apresenta as opções de `MENU.md` (gerado do catálogo). O guia detalhado (`GUIDE.md`), o encaminhamento, o contexto, o perfil do operador, as lições, os papéis e os fluxos carregam-se apenas quando a tarefa os exige. O orçamento de arranque é de 1500 tokens estimados, validado por teste e por `agentforge tokens`.

Todos os fluxos começam, quando falta informação, por `forge-clarify`: perguntas só quando mudam o resultado, cada uma com uma recomendação. O design system predefinido está em `.agentforge/templates/design-system-default.md` e só se aplica quando o projecto não tem um.

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
