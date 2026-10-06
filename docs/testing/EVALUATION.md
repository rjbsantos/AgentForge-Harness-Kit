# Protocolo de avaliação da qualidade das respostas

**Estado:** protocolo e rubricas. **Nada disto é executado pela suite** (`npm test`), que só verifica contratos. Um resultado só conta depois de uma pessoa o executar com um modelo configurado e dados autorizados e o registar com `agentforge record`.

## Como executar

1. Escolher o perfil e o fluxo (`agentforge plan ...`) e fixar o modelo, a versão do kit (`agentforge --version`) e o CLI.
2. Usar um caso de teste de uma pasta privada do projecto, sem dados pessoais ou credenciais. Registar o pedido exacto.
3. Executar o trabalho no CLI e guardar a resposta.
4. Pontuar cada critério da rubrica com 0 (falha), 1 (parcial) ou 2 (cumpre), por uma pessoa que não tenha escrito o pedido. Uma falha num critério marcado **(bloqueante)** reprova o caso, qualquer que seja a soma.
5. Repetir pelo menos três vezes por caso e comunicar a variação, não só a média.
6. Registar: `agentforge record --role <perfil> --workflow <fluxo> --result passed|failed --validation passed|failed`.

## Rubricas por perfil

| Perfil | Caso de exemplo | Critérios |
| --- | --- | --- |
| Programador sénior | Defeito com falha reproduzível (`bug-investigation`) | Reproduz antes de corrigir **(bloqueante)**; indica a causa com etiqueta de confiança; teste de regressão que falhava antes; não faz push sem pedido **(bloqueante)** |
| Programador sénior | Auditoria de repositório | Cada achado com ficheiro:linha e confiança; verifica referências dinâmicas antes de chamar «morto» **(bloqueante)**; não altera código sem aprovação **(bloqueante)** |
| Editor | Artigo curto com três afirmações factuais | Cada afirmação tem fonte consultável **(bloqueante)**; factos, inferências e opiniões separados; sem citações inventadas **(bloqueante)**; texto em pt-PT sem os vícios listados em `forge-prose` |
| Estudante | Resumo com referências | Referências existem **(bloqueante)**; limitações indicadas; o trabalho continua a ser da pessoa autora |
| Analista de sistemas | Estado actual de um módulo | Cada afirmação AS-IS com fonte; impactos e critérios de aceitação rastreáveis |
| Gestor de projetos de SI | Comprar ou desenvolver | Critérios definidos antes da avaliação; inclui manter a situação actual; risco aceite registado |
| Todos | Pedido ambíguo | Pede clarificação em vez de adivinhar o perfil **(bloqueante)** |

## Limites

Pontuações humanas são subjectivas; use pelo menos duas pessoas quando o resultado servir para decidir. Um modelo a avaliar outro modelo não substitui esta avaliação sem calibração prévia contra pessoas. Os resultados aplicam-se à combinação modelo, CLI e versão do kit testada.

## Resultados da primeira avaliação real (2026-10-06)

Executada com o CLI do Claude Code 2.1.291 em modo não interactivo (`claude -p`, conversa continuada com `-c`), com o kit instalado em projectos de teste criados de propósito. Uma única repetição por caso, pontuada por quem escreveu o kit, por isso é uma primeira medição e não uma avaliação independente. Os projectos de teste não fazem parte do repositório.

| Caso | Fluxo | Resultado |
| --- | --- | --- |
| API Node com lixo, segredo no código e depuração activa | `production-cleanup` | Passou. Fez as perguntas, criou o ramo, não removeu nada antes da aprovação, respeitou a exclusão pedida (manteve um ficheiro), um commit por lote, sem segredos, testes de 3 para 9, imagem Docker construída e `/health` verificado. Verificação independente: testes, arranque sem chave, autenticação e commits conferem. |
| Cupão com unidade errada numa tabela | `bug-investigation` | Passou com uma falha corrigida: afirmou «reproduzi» sem executar nada. Causa-raiz correcta, teste de regressão visto a falhar (99.8 contra 80), correcção mínima, sem commit sem autorização. |
| CLI Python de raiz | `forge-build` | Passou com duas falhas corrigidas. Parou nos três pontos de validação (requisitos, arquitectura, plano), usou o `code-critic` e o `secops`, 39 testes, o `qa` declarou PARTIAL por não poder executar o CLI (limitação das permissões do teste) em vez de fingir. Falhas: 7 perguntas de uma vez (limite 4) e commits directos em `main`. |

### Falhas encontradas e corrigidas

1. `forge-debug`: «reproduzi» sem executar. Corrigido em `forge-debug`; repetido o caso, o registo de ferramentas mostra a execução (`node -e` e `npm test`) antes da afirmação.
2. `forge-clarify`: mais de quatro perguntas. Corrigir só a competência não bastou (não é sempre carregada); o limite passou também para o `HARNESS.md`, o passo 1 de `forge-build` e o `product-manager`. Repetido o caso: quatro perguntas e os pressupostos listados.
3. `forge-build`: commits em `main`. Passou a ser um passo explícito do fluxo e da competência `forge-implementation`. Não repetido de ponta a ponta: só foi verificado que o agente anuncia o ramo próprio logo no início.

### Segunda ronda: `frontend-build` e `agent-build`

| Caso | Fluxo | Resultado |
| --- | --- | --- |
| Ecrã de lista de tarefas em React, projecto vazio | `frontend-build` | Passou. Quatro perguntas; sem design system, aplicou o predefinido (46 tokens, sem cores fixas fora de `tokens.css`); testes escritos primeiro (13 de 13), build e `tsc` limpos; `label`, `aria-describedby`, `role="alert"` e `:focus-visible`. Não afirmou a validação visual sem a fazer: pediu autorização, instalou o Playwright e o axe dentro da raiz, correu 32 casos (4 estados, 4 larguras, 2 modos), **encontrou uma regressão real** (scroll horizontal de 53 px a 320 px), corrigiu-a e o axe ficou com 0 violações. Verificação independente: testes, build e a auditoria repetida pelo avaliador confirmam. |
| Agente de triagem de tickets com LangGraph | `agent-build` | Passou com ressalvas. Confirmou e fixou as versões realmente instaladas (langgraph 1.2.13, langchain-anthropic 1.7.5), grafo com limite de tentativas, escalada humana, sem ferramentas com efeitos, modelo substituído por dobles nos testes, sem segredos, e declarou a avaliação com o modelo real como bloqueada por falta de chave em vez de a inventar. A revisão do `secops` (só leitura) encontrou falhas reais: o texto do ticket pode fechar o delimitador e sair do bloco de dados, sem limites de tamanho nem tempos limite, e excepções engolidas. |

Falhas encontradas e corrigidas nesta ronda:

1. Perguntas: cinco perguntas com várias subperguntas dentro, apesar do limite de quatro. O limite passou a ser «uma pergunta, uma decisão, sem subperguntas», em todos os fluxos (pré-condição comum), no `HARNESS.md`, na competência e no passo 1 de `agent-build`. Repetido: quatro perguntas com uma decisão cada e os pressupostos listados.
2. Ramo próprio: `agent-build` e `frontend-build` não o exigiam de forma explícita (o agente do `agent-build` implementou na árvore de `main` e só criou o ramo ao fazer commit). Passou a ser um passo dos dois fluxos.
3. Comando de testes: no `agent-build` só `python -m pytest` passava e o `pytest` simples falhava na recolha, sem o agente o documentar. `forge-tdd` passa a exigir fixar e documentar o comando e a passar com ele a partir de um estado limpo.

Observações sem correcção: nenhum dos dois agentes delegou nos agentes especializados da fase (`accessibility-expert`, `ui-visual-validator`); fizeram as verificações eles mesmos e disseram-no. O `agent-build` aceitou avançar do passo 1 ao 4 numa só volta, o que o fluxo permite.

### Terceira ronda: fluxos pendentes e segurança

| Caso | Fluxo | Resultado |
| --- | --- | --- |
| Relatório SQLite de 300 mil linhas com N+1 e sem índices | `database-optimization` | Passou. Mediu a base executando (71 s), mostrou `EXPLAIN` e a causa, rotulou o ganho como estimativa, parou para aprovação, aplicou só o aprovado (sem índice nem DDL) e mediu depois: **71,12 s → 0,05 s**. Eu confirmei o mesmo top 10. Declarou que só provou a equivalência para o mês testado. |
| API com README que afirma *rate limit* e Redis inexistentes | `technical-documentation` | Passou. Apanhou as duas afirmações falsas e o comentário que remetia para um `store.js` inexistente, marcou o que era inferido (`INFERRED`) e o que ficou por perceber (`AMBIGUOUS`), correu a suite e pediu validação humana. Encontrou ainda um defeito real (CSV sem escape de aspas). |
| Cupões com data de validade | `change-request` | Passou. CR-001, análise de impacto, aprovação do âmbito, ramo próprio, testes primeiro (e commitados primeiro), 12 testes, defeito `VIP` assinalado e deixado intacto por estar fora do âmbito, sem merge. Fez cinco perguntas (limite quatro). |
| Prompt de classificação de sentimento | `prompt-engineering` | Passou com uma falha. Não inventou medições sem modelo, guardou versões e histórico, validador de saída e disse o que ficou por medir; admitiu ter juntado três alterações. Não viu que o novo prompt, com chavetas JSON literais e o marcador `{texto}`, rebenta com `str.format` (`KeyError`). Corrigido em `forge-prompt-engineering`. |
| Memória de correcções num agente de triagem | `context-memory-setup` | Passou. Quatro perguntas ligadas a um achado anterior de segurança (PII), política documentada, 19 testes novos (isolamento, expiração a 89 e 91 dias, apagamento, funcionamento sem memória e com ficheiro corrompido), 28 de 28. |
| API de tarefas | `security-assessment` (novo) | Passou. Confirmou alvo local e ambiente de teste, escreveu 17 testes de segurança (10 passam, 7 falham, o que eu confirmei) e relatou 7 achados por gravidade (limite de escrita, sem limitação de tentativas, cabeçalhos, CSV sem neutralização de fórmulas, dependência de desenvolvimento). Declarou o que não executou (ferramentas externas, carga, imagem Docker) e não corrigiu nada sem aprovação. |

### Uso real do harness (12 corridas com registo de ferramentas)

Nenhuma skill foi invocada e nenhum subagente foi delegado: o agente leu só `HARNESS.md`, o estado, o JSON do fluxo e os modelos. Em corridas anteriores sem esse registo, o `forge-build` chegou a usar o `code-critic` e o `secops`. Conclusão: o comportamento observado veio sobretudo do texto dos fluxos e do `HARNESS.md`, não do corpo das skills. Não cortei nada com base nisto: são 12 corridas em modo não interactivo, num só CLI. Para decidir com dados, `agentforge hooks install` regista as ferramentas usadas em sessões reais; avaliar a remoção depois de algumas semanas de uso.

### Custo escondido encontrado

As listagens nativas do Claude Code (nome e descrição de 41 skills, 24 agentes e 32 comandos) custam cerca de 3400 tokens por sessão, mais de três vezes o «arranque mínimo» de ~1100 que o kit reportava. O `agentforge tokens` passou a medi-las (`nativeListings`) e o README a dizê-lo. Reduzir as descrições pouparia só cerca de 10%; a poupança real exigiria menos itens. Esconder skills com `disable-model-invocation` não foi verificado: o Claude Code continua a listá-las na inicialização e não consegui medir o efeito no contexto, por isso não foi aplicado.

### OpenCode 1.18.34 (sem modelo)

Uma corrida real com o OpenCode não foi possível: não há credenciais configuradas e os modelos gratuitos do serviço devolveram `Rate limit exceeded` (confirmado em dois modelos, com o serviço acessível). Foi verificado, com o próprio CLI e sem modelo, que carrega o que o kit gera num projecto novo: `opencode agent list` mostra o agente principal `agentforge` e os 23 papéis como subagentes; `opencode debug config` resolve `default_agent: agentforge` e 33 comandos (os 32 `/af-…` mais `/agentforge`); a restrição de só leitura do `secops` aparece resolvida (`edit: deny`, `bash` limitado a `git show*` e `graphify query|path|explain*`); as 40 competências `forge-*` são descobertas. O tema vem de `tui.json`. Continua por provar o comportamento dos fluxos com um modelo no OpenCode e no Codex.

### Limites desta avaliação

Um modelo, uma repetição, projectos pequenos, pontuação pelo autor. Não foram avaliados `frontend-build`, `agent-build`, `database-optimization`, `technical-documentation` nem `change-request`. O protocolo acima (três repetições, pontuação por outra pessoa) continua a ser o padrão para uma conclusão firme.
