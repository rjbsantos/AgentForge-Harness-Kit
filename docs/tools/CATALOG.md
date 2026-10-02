# Catálogo de ferramentas

Fonte de verdade: `tools` em `src/capabilities.ts`. O kit declara dependências dos fluxos de trabalho, mas não instala conectores.

| Identificador | Requisito |
| --- | --- |
| `file-system` | Acesso a ficheiros autorizado pelo CLI e limitado às permissões concedidas |
| `git` | Git instalado; operações de publicação ou envio exigem aprovação |
| `terminal` | Terminal disponível e comandos adequados ao ambiente |
| `web-research` | Navegação ou pesquisa na Web disponível e autorizada |
| `model-api` | Fornecedor de modelos configurado, com autorização e credenciais válidas |

As propostas apresentam `toolStatus: "unverified"` até o agente confirmar as capacidades e permissões do ambiente. O kit não fornece conectores de navegação, geração aumentada por recuperação, calendário, correio electrónico ou APIs. Sem uma ferramenta necessária, o agente deve indicar o bloqueio. Escrita, publicação e efeitos externos exigem as aprovações aplicáveis.
