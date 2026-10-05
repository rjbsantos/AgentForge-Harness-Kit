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

## Como tratar cada ferramenta

| Identificador | Se não estiver disponível | Aprovação necessária |
| --- | --- | --- |
| `file-system` | Parar e indicar o ficheiro ou a permissão em falta; não inventar o conteúdo | Escrita fora de `.agentforge/work/` e eliminações |
| `git` | Trabalhar apenas sobre ficheiros e indicar que o histórico não foi consultado | Commit, push, criação de PR e reescrita de histórico |
| `terminal` | Marcar a verificação como `PARTIAL` (bloqueio ambiental), nunca como `PASS` | Comandos com efeitos externos ou destrutivos |
| `web-research` | Indicar que as fontes externas não foram consultadas; afirmações ficam por confirmar | Envio de texto do projecto a serviços externos |
| `model-api` | Não avaliar nem comparar modelos; descrever apenas o desenho | Uso de credenciais e custos |

Para acrescentar uma ferramenta: declarar o identificador e o requisito em `tools` (`src/capabilities.ts`), referenciá-la num fluxo e actualizar esta tabela. O teste de contratos falha se um fluxo referir uma ferramenta inexistente.
