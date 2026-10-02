# Agentes

Fonte: `src/catalog.ts:roles`; formatos por CLI em `generated()`. O orquestrador chama-se AgentForge onde o host oferece personalização. Os sete agentes existentes mantêm identidade, handoffs e gates. Novos especialistas: `ai-engineer`, `editor`, `academic-tutor` e `systems-analyst`. Os workflows podem partilhar um agente (ex. product-manager e lead-developer) sem copiar skills.

OpenCode e Claude Code instalam definições nativas; Codex instala TOML para os quatro novos especialistas e o orquestrador; Antigravity usa roles como instruções quando não há mecanismo nativo confirmado. A seleção de agente/skills do `plan` é uma proposta, não uma delegação automática nem garantia de isolamento.
