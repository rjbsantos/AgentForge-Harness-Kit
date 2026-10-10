# Referência de comandos

Detalhe dos comandos de contexto, manutenção, grafo e poupança de tokens. O arranque rápido e a instalação estão no [README](../../README.md).

## Comandos de utilizador (`/af-…`)

Ao arrancar, o agente apresenta a tabela de comandos com a explicação de cada um (de `.agentforge/MENU.md`, gerado do catálogo). Fonte: `src/commands.ts`.

| CLI | Como aparecem |
| --- | --- |
| Claude Code | Comandos nativos em `.claude/commands/` (escrever `/` lista-os) |
| OpenCode | Comandos nativos em `.opencode/commands/`, executados pelo agente `agentforge`; o `/agentforge` continua a oferecer o menu de tipos de trabalho |
| Antigravity | Fluxos em `.agents/workflows/` (um por fluxo) e a tabela do `MENU.md` |
| Codex | Sem comandos nativos: não instalo ficheiros fora da raiz do projecto e não confirmei um mecanismo por projecto; o agente reconhece o texto `/af-…` e mostra o menu ao arrancar |

Comandos: `/af-menu` (lista tudo), `/af-estado`, `/af-retomar`, `/af-plano` (propõe sem executar), `/af-contexto`, e um por fluxo (`/af-build`, `/af-production-cleanup`, `/af-frontend-build`, `/af-agent-build`, …). Todos aceitam o pedido a seguir ao nome.

## Contexto, memória e melhoria contínua

O estado e o resumo activo ficam em `.agentforge/work/`. Actualize o resumo no fim de uma fase relevante, em vez de acumular transcrições:

```bash
agentforge context save --project <projeto> --summary "Objetivo: ...; fase: ...; decisão aprovada: ...; evidência: docs\plano.md" --next "Executar os testes"
agentforge context --project <projeto> --topic testes --budget-tokens 1200
```

O contexto inclui o estado, o resumo e até cinco lições aprovadas pertinentes, dentro do orçamento indicado. A estimativa corresponde aproximadamente a um token por quatro caracteres; não é a contagem exacta de um modelo. O comando informa quantas lições omitiu e recusa reduzir silenciosamente o estado ou o resumo se estes excederem o orçamento.

Uma lição exige evidência dentro do projeto e começa como pendente. Só passa a ser reutilizada após aprovação explícita:

```bash
agentforge learn add --project <projeto> --lesson "Validar os contratos entre o cliente e o servidor" --evidence "tests\contracts.test.ts:42"
agentforge learn list --project <projeto>
agentforge learn approve --project <projeto> --id <identificador>   # exige terminal interactivo
agentforge learn retire --project <projeto> --id <identificador>
agentforge insights --project <projeto>
```

As lições podem ser específicas do projeto (`project`) ou reutilizáveis (`reusable`). As reutilizáveis exigem uma âncora de tecnologia e versão, por exemplo `--scope reusable --anchor "Node 20"`. `insights` resume apenas execuções registadas explicitamente; não recolhe conversas nem promove automaticamente padrões a lições ou instruções.

## Manutenção, integridade e integrações

```bash
agentforge --version                                       # versão do CLI instalado
agentforge status --project <projeto>            # inclui a versão do kit registada no projecto
agentforge doctor --project <projeto>     # diagnóstico; termina com código 1 se houver problemas
agentforge upgrade --project <projeto> --dry-run
agentforge learn reseal --project <projeto>   # aceita lessons.json depois de revisão humana
agentforge hooks install --project <projeto>  # opcional, Claude Code
agentforge mcp --project <projeto>            # servidor MCP só de leitura
```

- `upgrade` reaplica a versão instalada aos CLIs já presentes no manifesto. `doctor` verifica ficheiros alterados, actualizações pendentes e a integridade das lições.
- `lessons.json` tem um selo (`lessons.seal`), um HMAC com uma chave guardada fora do projecto (`AGENTFORGE_HOME` ou `~/.config/agentforge/seal.key`). Se o ficheiro for editado fora do CLI, ou vier de outra conta (por exemplo, um clone), as lições deixam de ser reutilizadas e novas lições são recusadas até `learn reseal`.
- `learn approve` e `learn reseal` pedem confirmação num terminal interactivo e recusam stdin redireccionado, para que um agente não aprove as próprias lições. Não impede quem simule um pseudo-terminal nem quem já corra código com a sua conta e leia a chave: é uma barreira contra uso inadvertido e contra ficheiros adulterados no repositório, não uma sandbox.
- `.agentforge/work/audit.jsonl` regista, com cadeia de hashes, quem adicionou, aprovou ou retirou lições e quem refez o selo.
- `agentforge harden apply|remove` (opcional) acrescenta a `.claude/settings.json` regras `permissions.deny` para `.env`, chaves, `secrets/`, `~/.ssh` e `~/.aws`, e remove só as que acrescentou. No OpenCode, o `opencode.json` gerado pelo kit já traz as regras `permission.read` equivalentes; `harden` aplica-as a um `opencode.json` do utilizador. Não impede leituras por Bash; para isso é preciso uma sandbox. O Codex não tem regras equivalentes verificadas.
- `hooks install` acrescenta um hook `PostToolUse` a `.claude/settings.json`, preservando o resto da configuração. Regista apenas a hora e o nome da ferramenta em `.agentforge/work/events.jsonl` (nunca argumentos, resultados ou conversas) e requer o comando `agentforge` no PATH. `agentforge hooks remove` desfaz a alteração. O `insights` inclui a contagem por ferramenta. Só o comando exacto escrito pelo kit é reconhecido: se for alterado, `doctor` falha e `hooks install` recusa reinstalar até o rever. O stdin do hook é limitado a 64 KB e `events.jsonl` roda para `events.1.jsonl` acima de 1 MiB; `operations.jsonl` é arquivado em `operations.<data>.jsonl` acima de 5 MiB (os indicadores contam só o ficheiro actual).
- `agentforge mcp` expõe `agentforge_plan`, `agentforge_route`, `agentforge_context`, `agentforge_lessons` e `agentforge_insights`. Não aprova lições, não regista execuções e não altera ficheiros. Processa uma mensagem de cada vez, recusa mensagens acima de 1 MiB e limita `budgetTokens` a 32000; um `approved: true` só tem efeito se o último checkpoint em `.agentforge/work/checkpoints/` tiver `veredicto: APROVADO`. Exemplo de configuração: `{ "mcpServers": { "agentforge": { "command": "agentforge", "args": ["mcp", "--project", "/caminho/do/projeto"] } } }`.

## Porta de entrada, execução de fluxos e composição

```bash
agentforge gate --prompt "Corrige isto"                       # ready:false + perguntas; termina com 3
agentforge flow start --workflow release-closure
agentforge flow done --step 1 --evidence .agentforge/work/baseline.txt
agentforge flow done --step 2 --note "trace sem lacunas"
agentforge flow skip --step 7 --reason "sem interface neste projecto"
agentforge flow status
agentforge flow close                                         # recusa se houver passos pendentes
```

- `gate --decider COMANDO` liga um modelo de decisão opcional (ver [integrations/DECISION-MODELS.md](../integrations/DECISION-MODELS.md)); só torna a porta mais exigente. A saída inclui `decisions` (sim/não, pontuação e escolha), no formato de um modelo de decisão; as da heurística não estão calibradas.
- `gate` mede se o pedido é específico (objectivo, alvo concreto e os dados que o fluxo exige) e devolve no máximo quatro perguntas com uma recomendação cada. É determinístico e não usa modelo. `plan` inclui o mesmo resultado em `gate`: um pedido vago fica com `status: needs-context`. Também existe como ferramenta MCP (`agentforge_gate`).
- `flow` guarda o estado em `.agentforge/work/flow.json` e arquiva em `.agentforge/work/flows/` ao fechar. Um passo só avança depois dos anteriores (os paralelos podem ir por qualquer ordem), exige `--evidence` (ficheiro do projecto, guardado com SHA-256) ou `--note`, e os passos de decisão humana (validação N1/N2, autorização, aprovação) só avançam com confirmação num terminal, como `learn approve`. Dispensar um passo exige `--reason`. Tudo fica em `audit.jsonl`.
- `composition` (em `plan`) lista os sub-fluxos que complementam o fluxo escolhido, o passo, a condição e o artefacto que passa de um para o outro.

## Guarda, avaliação de eficácia e indicadores de uso

```bash
agentforge guard install                  # opcional, Claude Code: hook PreToolUse em Bash
agentforge guard status
agentforge guard permit-main --minutes 15 # uma pessoa, num terminal: libera commit/push em main
agentforge guard permit-publish           # uma pessoa, num terminal: libera tags, releases, PR merge, npm publish
agentforge guard revoke
agentforge eval run --suite suite.json --cli claude --command 'claude -p "$AGENTFORGE_EVAL_PROMPT"' --repeat 3 --dry-run
agentforge insights                       # inclui «usage» (fluxos, porta de entrada, guarda)
```

- `guard` trava, antes de cada comando Bash: `git commit`, `merge`, `rebase`, `cherry-pick` e `revert` no ramo `main` ou `master`; `git push` para `main`, forçado ou a apagar ramos; publicação de tags, `git tag <nome>`, `gh release create`, `gh pr merge` e `npm publish`. Bloqueia com código 2 e explica como prosseguir. As autorizações (`permit-*`) exigem terminal interactivo, têm prazo (1 a 240 minutos) e âmbito (`main` ou `publish`), e ficam em `audit.jsonl`. Não é uma sandbox: comandos construídos de forma indirecta escapam à análise.
- `eval run` compara as tuas tarefas com e sem o kit no CLI indicado, com verificações determinísticas. O comando indicado gasta tokens: recusa mais de 12 execuções sem `--max-runs`. Ver [testing/EFFICACY.md](../testing/EFFICACY.md).

## Verificação de versão

Quando corre um comando que uma pessoa usa, o `agentforge` avisa no **stderr** se há uma versão mais recente (`agentforge 0.12.0 disponível (instalada: 0.11.0)…`, com os comandos para actualizar). A saída JSON não é tocada.

- Consulta o GitHub com `gh api` (o repositório é privado, por isso usa a tua autenticação), **só quando há um terminal**, no máximo uma vez por dia e com limite de 2 segundos. A resposta fica em `~/.config/agentforge/update-check.json`. Se falhar, recua 6 horas e não volta a perguntar de imediato; nunca atrasa nem falha um comando.
- Não corre nos hooks, no `guard`, no `mcp`, no `gate` nem no `eval`; sem terminal (agente, CI) só mostra o aviso a partir da cache.
- `agentforge doctor` mostra a linha `✓ versão` ou `ℹ versão`.
- Desactivar: `AGENTFORGE_NO_UPDATE_CHECK=1` (ou `CI` definido). Outra fonte: `AGENTFORGE_UPDATE_COMMAND` (um comando que imprime a última versão).
- O pedido ao GitHub só revela o teu IP e a tua conta; não envia dados do projecto.

## Rastreabilidade e evidência

```bash
agentforge trace --project <projeto> [--requirements CAMINHO] [--plan CAMINHO]
agentforge record ... --result passed --validation passed --evidence <ficheiro-com-a-saida-real>
```

- `trace` lê `.agentforge/work/requirements.md` (a tabela do modelo `requirements`), `.agentforge/work/plan.md` e os ficheiros de testes do projecto. Cada requisito Must (`REQ-…`) tem de ter critério de aceitação, aprovação, aparecer no plano e ser citado por um teste. Termina com 1 se houver lacunas. Verifica identificadores, não se o teste exercita o requisito.
- `--evidence` aponta para um ficheiro do projecto com a saída real da verificação. O CLI guarda o SHA-256; `insights.passedEvidence` separa os `passed` com evidência que ainda coincide (`verified`), alterada (`changed`), em falta (`missing`) e sem evidência (`none`). Um `passed` com evidência vazia é recusado, e o CLI exige `--evidence` ou, explicitamente, `--no-evidence` num `passed`. Os arquivos `operations.<data>.jsonl` entram na agregação, com as linhas numeradas em sequência.
- Os requisitos do próprio kit e os testes que os verificam estão em [architecture/REQUIREMENTS.md](../architecture/REQUIREMENTS.md).

## Grafo de conhecimento e confiança (conceitos do graphify)

O kit adopta três ideias do [graphify](https://github.com/Graphify-Labs/graphify): consultar um grafo em vez de pesquisar ficheiros, explicar cada ligação com uma etiqueta de confiança, e manter tudo determinístico e local (sem índice vectorial).

- **Confiança em todas as conclusões:** as competências de auditoria e verificação e o `HARNESS.md` exigem `EXTRACTED` (visto directamente, com ficheiro:linha), `INFERRED` (deduzido; confirmar no código) ou `AMBIGUOUS` (decisão humana). Uma recomendação nunca assenta apenas em ligações `INFERRED`.
- **Competência `forge-graph`** (auditoria de repositório, investigação de defeitos e análise de sistemas): se existir `graphify-out/graph.json`, o agente consulta `GRAPH_REPORT.md` e `graphify query|path|explain` antes de ler ficheiros, verifica se o grafo está desactualizado e usa os nós isolados apenas como candidatos para a higiene do projecto. O kit não gera nem instala o graphify; para criar o grafo use `/graphify .` no seu assistente. O `agentforge doctor` indica, a título informativo, se o grafo existe.
- **`agentforge graph`:** o próprio catálogo (perfis, agentes, fluxos, competências, ferramentas, modelos e encaminhamento) é um grafo consultável:

```bash
agentforge graph report
agentforge graph query --prompt "auditoria do repositório" --budget-tokens 400
agentforge graph path --from forge-hygiene --to senior-developer
agentforge graph explain --node skill:forge-verify
```

As arestas declaradas no catálogo são `EXTRACTED`; a co-utilização de competências em vários fluxos é `INFERRED`; `AMBIGUOUS` assinala nós sem referência. O relatório inclui os nós mais ligados, as competências transversais e os nós órfãos, e um teste falha se o catálogo ficar com um deles. A mesma consulta está disponível na ferramenta MCP `agentforge_graph`.

## Poupança de tokens

O kit mede e reduz o que põe em contexto, sem depender de código de terceiros:

```bash
agentforge tokens --project <projeto>           # arranque, instruções do utilizador e estado; código 1 se houver excessos
agentforge operator set --project <projeto> --verbosity concise
```

- `tokens` mede também as listagens nativas do Claude Code (`nativeListings`: nome e descrição de cada skill, agente e comando, cerca de 3300 tokens por sessão com o kit completo), que não entram no orçamento de 1500 mas costumam pesar mais do que ele.
- `tokens` mede o arranque (orçamento de 1500 tokens estimados: só `HARNESS.md` e `state.md`, validado por teste), o texto do próprio utilizador em `CLAUDE.md`/`AGENTS.md` e o crescimento de `state.md` e `context.md`. A estimativa é caracteres ÷ 4.
- `--verbosity concise` instala no `HARNESS.md` regras de respostas directas: sem preâmbulos nem resumos repetidos, mantendo exactos o código, os comandos e os números, e completos os avisos de risco e as aprovações.
- O `HARNESS.md` inclui regras de higiene de contexto: filtrar a saída das ferramentas na origem e guardar registos longos em `.agentforge/work/logs/` em vez de os colar na conversa.
- [docs/integrations/TOKEN-TOOLS.md](../integrations/TOKEN-TOOLS.md) mapeia dez ferramentas populares (RTK, Context Mode, Caveman, Token Optimizer, Claude Context e outras) para o que o kit já faz e para o que fica como opção externa, com licenças e riscos. As percentagens de poupança são dos autores e não foram medidas aqui.

