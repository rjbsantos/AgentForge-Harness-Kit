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
| `tech-writer` | Produz documentação funcional e técnica a partir do código lido, sem inventar comportamento. |
| `frontend-developer` | Implementa interfaces React e TypeScript com o design system do projecto, testes primeiro e estados completos. |
| `backend-developer` | Implementa serviços e APIs em Python ou .NET com testes primeiro, dados seguros e configuração fora do código. |
| `design-system-architect` | Identifica ou cria o design system (aplica o predefinido quando não existe) e governa tokens e componentes. |
| `accessibility-expert` | Verifica WCAG 2.2 AA: semântica, teclado, foco, contraste e leitores de ecrã. |
| `ui-visual-validator` | Valida visualmente em vários tamanhos de ecrã e apanha regressões. |
| `database-optimizer` | Desenha esquemas e otimiza consultas e migrações em SQL, PostgreSQL e MySQL com medição. |
| `agent-engineer` | Constrói agentes e skills com LangChain, LangGraph ou Microsoft Agent Framework, incluindo memória e ferramentas. |
| `context-manager` | Desenha e testa a gestão de contexto e memória do Harness ou de um agente. |
| `security-tester` | Escreve e executa testes de segurança contra a própria aplicação em ambiente local; nunca produção nem sistemas de terceiros. |
| `devops` | Configura integração contínua e ambientes reprodutíveis a partir dos comandos reais do projecto. |

## Estrutura de um agente

O corpo de cada agente tem quatro linhas: **Competências** (o que carrega e quando), **Faz** (o trabalho), **Limites** (o que nunca faz) e **Entrega** (o formato e o destino do resultado). A descrição começa por «Usar…» para que o CLI saiba quando o invocar. Um teste de contratos falha se faltar uma secção, se a descrição não disser quando usar o agente ou se o corpo referir uma competência inexistente.

## Agentes só de leitura

`code-critic`, `reverse-engineer` e `secops` só leem e relatam. Além de o dizerem no texto, o instalador restringe-os no formato nativo: `tools: Read, Grep, Glob` no Claude Code (sem Bash), `permission` no OpenCode (`edit: deny` e `bash` negado por omissão, com só `git status|diff|log|show` e `graphify query|path|explain` permitidos) e `sandbox_mode = "read-only"` no Codex. No Claude Code, `disallowedTools: Write, Edit` não chegou: o agente contornou-o com `printf` no Bash, e `permissionMode: plan` também não o impediu; só a lista `tools` sem Bash o bloqueou (testado numa sessão real). Consequência: `code-critic` não corre `git diff`, por isso o `lead-developer` entrega o diff. No OpenCode, `edit: deny` sozinho não chegou: o agente criou o ficheiro com `printf` no Bash. Com a lista de comandos de `bash`, o agente ficou sem a ferramenta de escrita, um comando composto (`git status; echo`) foi recusado pela regra e o comando permitido correu; o ficheiro não foi criado. Nesse teste o modelo nunca tentou o redireccionamento (recusou por si ou limitou-se aos comandos permitidos), por isso a recusa do `printf > ficheiro` em si não foi observada. No Codex a chave `sandbox_mode` não foi confirmada: a tentativa de teste falhou com `401 Unauthorized` (credencial da conta inválida) antes de lançar qualquer agente. Os agentes que correm comandos (`qa`) não são marcados, porque precisam de executar testes.

Um teste (`src/tests/docs.test.ts`) falha se um agente de `src/roles.ts` não constar desta tabela.

## Formatos por CLI

Fonte de verdade: `roles` em `src/roles.ts`; os formatos específicos de cada CLI são produzidos por `generated()` em `src/generators.ts`. O orquestrador apresenta-se como AgentForge quando a ferramenta anfitriã permite personalização.

Os papéis especializados partilham competências, em vez de manterem cópias próprias. Os fluxos de trabalho podem encaminhar tarefas para o mesmo agente — por exemplo, o gestor de produto ou o programador principal — quando as responsabilidades coincidem.

O OpenCode e o Claude Code recebem definições nativas de agentes; o OpenCode é configurado com `agentforge` como agente principal predefinido quando não existe uma configuração de projeto anterior. Recebe também o comando `/agentforge`, que apresenta uma escolha de tipo de trabalho na conversa, e um tema aplicado à TUI através de `tui.json`. O tema altera cores, incluindo os realces da barra lateral, mas não permite redesenhar a sua estrutura. Se `opencode.json` ou `tui.json` já existirem, são preservados e o instalador indica as opções a acrescentar. O Codex recebe ficheiros TOML para os agentes do catálogo e o orquestrador; o Antigravity recebe instruções e fluxos de trabalho. A selecção de agentes e competências em `plan` é uma proposta: não inicia delegações nem garante isolamento. A execução depende das capacidades do CLI. O nome da aplicação OpenCode não é alterado.
