# Catálogo de agentes

## Agentes do catálogo

| Agente | Responsabilidade |
| --- | --- |
| `product-manager` | Clarifica requisitos e critérios de aceitação; não implementa código. |
| `architect` | Desenha componentes e interfaces com base nos requisitos aprovados. |
| `solution-advisor` | Traduz necessidades de negócio em opções comparáveis, com custos, riscos e decisão registada; não implementa. |
| `lead-developer` | Implementa trabalho aprovado, começando pelos testes, e encaminha-o para revisão. |
| `code-critic` | Revê alterações quanto à correcção, manutenção e regressões, sem editar ficheiros. |
| `qa` | Verifica de forma independente a cobertura de testes e os critérios de aceitação. |
| `reverse-engineer` | Descreve um sistema existente com base em evidências, para auditoria e documentação. |
| `secops` | Avalia alterações de risco elevado e decisões de segurança antes da implementação. |
| `ai-engineer` | Desenha e avalia sistemas de inteligência artificial, incluindo dados, modelos, recuperação aumentada e segurança. |
| `editor` | Produz artigos para revistas com investigação baseada em fontes e revisão editorial. |
| `academic-tutor` | Apoia o estudo e a investigação universitária com referências verificáveis. |
| `systems-analyst` | Analisa processos actuais e futuros, limites de integração e impacto das alterações. |

Um teste (`src/tests/docs.test.ts`) falha se um agente de `src/roles.ts` não constar desta tabela.

## Formatos por CLI

Fonte de verdade: `roles` em `src/roles.ts`; os formatos específicos de cada CLI são produzidos por `generated()` em `src/generators.ts`. O orquestrador apresenta-se como AgentForge quando a ferramenta anfitriã permite personalização.

Os papéis especializados partilham competências, em vez de manterem cópias próprias. Os fluxos de trabalho podem encaminhar tarefas para o mesmo agente — por exemplo, o gestor de produto ou o programador principal — quando as responsabilidades coincidem.

O OpenCode e o Claude Code recebem definições nativas de agentes; o OpenCode é configurado com `agentforge` como agente principal predefinido quando não existe uma configuração de projeto anterior. Recebe também o comando `/agentforge`, que apresenta uma escolha de tipo de trabalho na conversa, e um tema aplicado à TUI através de `tui.json`. O tema altera cores, incluindo os realces da barra lateral, mas não permite redesenhar a sua estrutura. Se `opencode.json` ou `tui.json` já existirem, são preservados e o instalador indica as opções a acrescentar. O Codex recebe ficheiros TOML para os agentes do catálogo e o orquestrador; o Antigravity recebe instruções e fluxos de trabalho. A selecção de agentes e competências em `plan` é uma proposta: não inicia delegações nem garante isolamento. A execução depende das capacidades do CLI. O nome da aplicação OpenCode não é alterado.
