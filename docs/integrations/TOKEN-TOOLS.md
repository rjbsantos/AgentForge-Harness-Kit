# Optimizações de tokens: o que o harness faz e o que é opcional

Esta página mapeia uma lista de ferramentas de poupança de tokens para o que o AgentForge **já implementa de raiz**, sem copiar código de terceiros, e para o que fica como **opção externa** que cada pessoa decide instalar.

> **Sobre os números.** Reduções como «75%», «98%» ou «49×» são declarações dos autores de cada projecto, medidas nos seus cenários. O AgentForge não as mediu e não as promete (ver o [backlog](../operations/BACKLOG.md)). O que o kit mede é o que ele próprio põe em contexto: `agentforge tokens`.
>
> **Sobre as ligações.** A lista original usava ligações encurtadas (`lnkd.in`) que não foi possível resolver. Os repositórios abaixo foram identificados pelo nome e pela descrição e **devem ser confirmados por quem os instalar**.

## Implementado no harness

| Ideia | Origem da ideia | Como está no AgentForge |
| --- | --- | --- |
| Respostas concisas sem perder precisão | Claude Token Efficient, Caveman | `agentforge operator set --verbosity concise`. O `HARNESS.md` manda começar pelo resultado, sem preâmbulos nem resumos repetidos. Código, comandos, caminhos, números e erros ficam exactos; **avisos de risco, aprovações e limitações nunca são comprimidos**. Não adopta o estilo telegráfico do Caveman: a precisão e a legibilidade têm prioridade |
| Filtrar a saída das ferramentas e não despejar registos em contexto | RTK, Context Mode | Regra de higiene de contexto no `HARNESS.md`: filtrar na origem (`--quiet`, `--stat`, `tail`, `grep`, intervalos de linhas) e, se a saída longa for útil, gravá-la em `.agentforge/work/logs/` (sem segredos) e citar o caminho. É uma regra para o agente; não intercepta comandos |
| Encontrar os «tokens fantasma» | Token Optimizer | `agentforge tokens` mede o arranque (instruções, estado, contexto, perfil), o texto do próprio utilizador em `CLAUDE.md`/`AGENTS.md` e o crescimento do estado; termina com código 1 se houver excessos. Há um orçamento de 3000 tokens estimados para o arranque, validado por teste |
| Ler só o que importa através de um grafo | Code Review Graph, Token Savior, Claude Context | Competência `forge-graph` e `agentforge graph`, sobre o [graphify](https://github.com/Graphify-Labs/graphify) (determinístico, sem índice vectorial). Ver o README |
| Orçamento de contexto e memória compacta | Token Optimizer, Claude Token Optimizer | `agentforge context --budget-tokens` e lições aprovadas com âmbito |
| Arranque pequeno | Claude Token Optimizer | O bloco em `CLAUDE.md` tem cerca de 200 tokens; os papéis e as competências só são lidos quando o fluxo os pede |

## Opcional e externo (não instalado pelo kit)

Estas ferramentas **ficam no caminho** dos comandos, das ferramentas MCP ou do índice do código. O kit não as instala nem altera a configuração do CLI por si. Avalie cada uma antes de a usar.

| Ferramenta | O que faz (segundo o projecto) | Repositório identificado | Licença | Notas |
| --- | --- | --- | --- | --- |
| RTK | Proxy de linha de comandos que filtra a saída de comandos de desenvolvimento | [rtk-ai/rtk](https://github.com/rtk-ai/rtk) | Apache-2.0 | Altera o que o agente vê dos comandos: confirme que não esconde erros relevantes |
| Context Mode | Isola saídas brutas num sandbox (SQLite) e mantém memória de sessão | [mksglu/context-mode](https://github.com/mksglu/context-mode) | `NOASSERTION` (verificar) | Licença não declarada de forma padrão: leia-a antes de usar |
| Token Optimizer | Deteta «tokens fantasma» e protege o contexto na compactação | [alexgreensh/token-optimizer](https://github.com/alexgreensh/token-optimizer) | `NOASSERTION` (verificar) | Complementa `agentforge tokens`, que mede apenas o harness |
| Token Optimizer MCP | Cache e compressão das ferramentas MCP | [ooples/token-optimizer-mcp](https://github.com/ooples/token-optimizer-mcp) | MIT | Um servidor MCP vê o que passa por ele: não o use com dados sensíveis sem rever o código |
| Claude Context | Pesquisa híbrida vectorial da Zilliz via MCP | [zilliztech/claude-context](https://github.com/zilliztech/claude-context) | MIT | Requer um índice vectorial (e normalmente um fornecedor de embeddings): o código sai da máquina se o fornecedor for remoto |
| Code Review Graph | Grafo Tree-sitter local para MCP e CLI | [tirth8205/code-review-graph](https://github.com/tirth8205/code-review-graph) | MIT | Alternativa ao graphify; o kit integra o graphify |
| Token Savior | Navegação por símbolos via MCP e memória persistente | [Mibayy/token-savior](https://github.com/Mibayy/token-savior) | MIT | Idem |
| Caveman | Skill e proxy que comprimem as respostas | [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) | Apache-2.0 | Troca legibilidade por tokens; para a maioria dos casos `--verbosity concise` chega |
| Claude Token Efficient | Um `CLAUDE.md` que impõe concisão | [drona23/claude-token-efficient](https://github.com/drona23/claude-token-efficient) | MIT | Coberto por `--verbosity concise` |
| Claude Token Optimizer | Prompts de configuração para reduzir a documentação carregada | [nadimtuhin/claude-token-optimizer](https://github.com/nadimtuhin/claude-token-optimizer) | MIT | Identificação menos certa; confirme que é o projecto pretendido |

## Como escolher

1. Meça primeiro: `agentforge tokens`. Se o arranque está dentro do orçamento e os ficheiros do utilizador são pequenos, há pouco a ganhar com o harness.
2. Ative `--verbosity concise` se as respostas forem longas. É a medida com melhor relação entre ganho e risco.
3. Para repositórios grandes, use o grafo (`forge-graph`) antes de recorrer a índices vectoriais.
4. Só adicione proxies e servidores MCP externos depois de rever o código e a licença, e prefira os que correm localmente.
