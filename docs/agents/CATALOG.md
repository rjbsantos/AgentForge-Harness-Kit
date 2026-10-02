# Catálogo de agentes

Fonte de verdade: `roles` em `src/catalog.ts`; os formatos específicos de cada CLI são produzidos por `generated()`. O orquestrador apresenta-se como AgentForge quando a ferramenta anfitriã permite personalização.

Os papéis especializados partilham competências, em vez de manterem cópias próprias. Os fluxos de trabalho podem encaminhar tarefas para o mesmo agente — por exemplo, o gestor de produto ou o programador principal — quando as responsabilidades coincidem.

O OpenCode e o Claude Code recebem definições nativas de agentes; o OpenCode é configurado com `agentforge` como agente principal predefinido quando não existe uma configuração de projeto anterior. Recebe também o comando `/agentforge`, que apresenta uma escolha de tipo de trabalho na conversa, e um tema aplicado à TUI através de `tui.json`. O tema altera cores, incluindo os realces da barra lateral, mas não permite redesenhar a sua estrutura. Se `opencode.json` ou `tui.json` já existirem, são preservados e o instalador indica as opções a acrescentar. O Codex recebe ficheiros TOML para os agentes do catálogo e o orquestrador; o Antigravity recebe instruções e fluxos de trabalho. A selecção de agentes e competências em `plan` é uma proposta: não inicia delegações nem garante isolamento. A execução depende das capacidades do CLI. O nome da aplicação OpenCode não é alterado.
