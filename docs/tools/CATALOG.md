# Ferramentas

Fonte: `src/capabilities.ts:tools`; o kit apenas declara dependências, não instala conectores. `file-system`, `git` e `terminal` podem existir no host; `web-research` e `model-api` exigem configuração/autorização. Todas as propostas indicam `toolStatus: "unverified"` até o agente verificar capacidade e permissões. Não existem adaptadores falsos de browser, RAG, calendário, email ou API. Operações de escrita, publicação e efeitos externos requerem aprovação apropriada; sem ferramenta, reportar bloqueio.
