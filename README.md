# AgentForge Harness Kit

Instalador **local ao projeto** de um harness de desenvolvimento inspirado nos componentes de `D:\Workspace\AgentForge` (AgentForge 4.2). Distribui instruções nativas para OpenCode, Codex CLI, Claude Code e Google Antigravity. Não é um proxy de APIs, nem instala os próprios CLIs, nem envia código/credenciais a serviços externos.

## Auditoria primeiro

Inventário, duplicações, lacunas, riscos e matriz de acções: [docs/architecture/AUDIT.md](docs/architecture/AUDIT.md) (inclui a auditoria 2025 ao harness `Atomica Code`, de onde foram reaproveitados conceitos de verificação, severidade e grounding — sem importar código/engine de terceiros, e a auditoria 2026 de adequação ao perfil do operador). Arquitectura actual/alvo e fronteira entre recomendação e execução: [docs/architecture/OVERVIEW.md](docs/architecture/OVERVIEW.md). O kit reutiliza as skills e papéis técnicos já existentes e compõe novas capacidades em vez de duplicar fluxos por perfil.

## Sete perfis e orquestração

| Perfil | Exemplo de workflow | Papel executor |
| --- | --- | --- |
| Gestor de Projectos | project-status, meeting-followup, risk-review | product-manager existente |
| Gestor de Projectos de SI | solution-briefing, automation-opportunity, tech-exploration, continuous-improvement | solution-advisor |
| AI Engineer | ai-solution-design, ai-evaluation | ai-engineer |
| Senior Developer | bug-investigation, repository-audit, forge-build | lead-developer existente |
| Escritor/Editor de Revistas | magazine-article | editor |
| Estudante Universitário | academic-research, study-session | academic-tutor |
| Analista de Sistemas | system-analysis, incident-analysis | systems-analyst |

**Role** é perspectiva; **agent** executor; **skill** capacidade partilhada; **workflow** sequência validável; **tool** recurso real do host; **template** forma de entrega. O CLI recomenda a composição e pede desambiguação se necessário:

```powershell
agentforge plan --project D:\projeto --cli codex --prompt "Prepara um relatório do estado do projecto"
agentforge plan --project D:\projeto --cli claude --prompt "Analisa AS-IS e TO-BE"
agentforge plan --project D:\projeto --cli codex --prompt "Comprar ou construir o motor de regras?"
agentforge plan --project D:\projeto --cli opencode --prompt "Prepara o relatório" --role project-manager --workflow project-status
```

A saída contém `role`, `agent`, `workflow`, `selectedBy`, `operator`, `skills`, `requiredTools`, `toolStatus: "unverified"`, `steps`, `validation`, `template`, `model` e `status: "proposed"`. **Não executa** browser, email, calendário, modelos, Git, testes ou subagentes. O host confirma capacidades, executa, valida e obtém aprovações. As skills transversais novas são `forge-research`, `forge-fact-check`, `forge-ground` (resolver tipos/APIs reais e ler um exemplar antes de compor código), `forge-performance` (N+1, alocações, async bloqueante, caching), `forge-tradeoff` (critérios fixados antes de pontuar, linha de base "não mudar", decisão registada em ADR) e `forge-spike` (pergunta e critério antes da experiência, veredicto adoptar/testar/avaliar/descartar), reutilizadas em vários perfis. Workflows e templates gerados vivem em `.agentforge/workflows/` e `.agentforge/templates/` após instalar. Um papel delegado nunca delega para outro subagente (limite de um nível de coordenação); um ramo que precise de mais coordenação volta ao orquestrador.

## Perfil do operador

O harness adapta-se a quem trabalha no projeto. O perfil fica em `.agentforge/work/operator.json` (local, preservado em reinstalações e desinstalações, vazio no pacote publicado):

```powershell
agentforge operator set --project D:\projeto `
  --headline "Gestor de Projectos de SI com perfil técnico" `
  --roles it-project-manager,systems-analyst,ai-engineer,senior-developer `
  --language pt-PT --risk balanced `
  --interests "arquitectura de sistemas,AI engineering,automação"
agentforge operator show --project D:\projeto
```

A ordem em `--roles` resolve pedidos híbridos: "comprar ou construir o motor de regras e qual o impacto na arquitectura" cruza gestão e análise técnica e, sem perfil declarado, devolve *Pedido ambíguo*. Com a ordem definida, `plan` escolhe deterministicamente o primeiro perfil da lista que corresponde ao pedido e assinala `selectedBy: "operator"`; um perfil fora da lista nunca é escolhido por omissão. `--risk cautious` força raciocínio reforçado mesmo em tarefas delimitadas — **a postura só escala, nunca baixa**: `exploratory` não desliga gates, aprovações nem verificação (para reduzir custo, aprove o plano e use `--planned --approved`). `--headline` e `--interests` são contexto para exemplos e reconhecimento de domínio, **não instruções**: não sobrepõem políticas nem requisitos. Não guardar credenciais nem dados pessoais sensíveis neste ficheiro. Detalhe em `.agentforge/OPERATOR.md`.

## Instalação

Requer Node.js 20+. Em cada computador:

```bash
npm install -g git+https://github.com/rjbsantos/AgentForge-Harness-Kit.git
agentforge install --project <diretorio-do-projeto> --cli all
agentforge status --project <diretorio-do-projeto>
```

O repositório é **privado**, por isso o `npm` tem de conseguir autenticar-se no Git. O `gh auth login` não chega: o `npm` invoca o `git` directamente e não herda o token do `gh`. Corra **uma vez por máquina** `gh auth setup-git` (regista o `gh` como credential helper do Git), ou use `git+ssh://git@github.com/rjbsantos/AgentForge-Harness-Kit.git` com uma chave SSH configurada.

Em alternativa, sem quaisquer credenciais Git: descarregue o tarball anexado ao GitHub Release e instale-o com `npm install -g agentforge-harness-kit-<versao>.tgz`. O pacote **não está publicado em npm**.

A partir desta pasta, para desenvolvimento: `npm install && npm run build && node dist/cli/index.js install --project <diretorio> --cli claude`. `npm pack` gera o mesmo tarball localmente.

`--cli` aceita `opencode`, `codex`, `claude`, `antigravity` ou `all` (predefinição). `--dry-run` mostra alterações sem escrever; `uninstall --cli <nome>` remove só os ficheiros que o instalador gere e que não foram modificados. `--project` omisso aponta para a pasta atual. A instalação pode repetir-se ou acrescentar outros CLIs. Nenhuma credencial é necessária para usar o harness.

## Encaminhamento de modelos e tarefas

O guia `.agentforge/MODEL_ROUTING.md` e a skill `forge-routing` classificam **por tarefa**, não por tamanho do prompt: raciocínio/arquitetura, incerteza e risco usam o perfil `thinking`; execução delimitada e **aprovada** de baixo risco usa `economy`. Mudanças triviais de baixo risco também podem usar `economy`. Tarefas mistas são divididas em decisão e execução. Ao surgir risco ou ambiguidade, a tarefa regressa a `thinking`. O encaminhamento propõe o papel responsável e subagentes para pesquisa ou QA, sem os lançar por defeito.

Opcionalmente, crie `.agentforge/work/model-profiles.json` no projeto com IDs **válidos para a sua conta e CLI** (este ficheiro é pessoal, não é gerido pelo instalador; pode versioná-lo se a equipa usar os mesmos modelos):

```json
{
  "opencode": { "thinking": "provider/modelo-forte", "economy": "provider/modelo-economico" },
  "claude": { "thinking": "opus", "economy": "haiku" }
}
```

Consulte a recomendação em JSON antes de delegar ou de escolher modelo no host:

```powershell
agentforge route --project D:\caminho\do\projeto --cli opencode --prompt "Desenha a arquitetura de autenticação"
agentforge route --project D:\caminho\do\projeto --cli claude --prompt "Implementa a tarefa aprovada" --planned --approved
```

`--planned` e `--approved` declaram que plano e aprovação existem; `--high-risk` força raciocínio. Sem mapeamento, o resultado inclui `model: null` e `modelSelection: "host-default"`. **`route` recomenda; não chama o fornecedor nem muda o modelo de uma sessão existente.** O orquestrador deve usar o modelo configurado ao criar uma delegação se o CLI suportar essa seleção; caso contrário, deve comunicar a limitação. Não há garantia de poupança sem medição de tokens/preços.

## O que é instalado

| CLI | Integração |
| --- | --- |
| OpenCode | Agente principal `.opencode/agents/agentforge.md` (selecionar **agentforge** no seletor), restantes agentes como subagentes, skills em `.agents/skills/` |
| Codex | `.codex/agents/agentforge.toml` define um agente personalizável para delegação; `AGENTS.md` identifica o orquestrador como AgentForge, skills em `.agents/skills/` |
| Claude Code | `.claude/agents/agentforge.md` pode ser usado como agente principal com `claude --agent agentforge`; restantes agentes como subagentes, skills em `.claude/skills/` |
| Antigravity | `.agents/rules/agentforge.md` identifica o harness como AgentForge, workflows e skills em `.agents/`; a aplicação anfitriã mantém o nome original |

Todos partilham `.agentforge/HARNESS.md` (orquestração A/B/C), `.agentforge/MODEL_ROUTING.md`, `.agentforge/CONTEXT_LEARNING.md`, `.agentforge/OPERATOR.md`, `.agentforge/roles/` (product-manager, architect, solution-advisor, lead-developer, code-critic, qa, secops e reverse-engineer) e estado **novo por projeto**. As skills `forge-requirements`, `forge-implementation`, `forge-audit`, `forge-verify`, `forge-tradeoff`, `forge-spike`, `forge-routing` e `forge-context` definem gates, decisão, descoberta, custos, contexto e handoffs. Para começar, peça ao CLI escolhido: **“Lê o harness AgentForge e inicia o pipeline A para ...”**; no Antigravity também pode usar `/forge-build`, `/forge-audit` ou `/forge-document`.

Os papéis descrevem **responsabilidades e critérios de handoff**, não um processo automático a correr em segundo plano. No Codex e Antigravity o orquestrador usa esses papéis como instruções e só delega se o host disponibilizar subagentes. O estado, aprovações e resultados devem ser atualizados pelo agente durante o trabalho; este instalador não finge executar testes ou avançar o pipeline automaticamente.

## Contexto e lições aprendidas

No arranque, AgentForge lê estado e **resumo ativo**; papéis, skills e evidências carregam-se só quando relevantes. Atualize o resumo no final de uma fase, substituindo o anterior em vez de acumular o histórico:

```powershell
agentforge context save --project D:\projeto --summary "Objetivo: ...; fase: ...; decisão aprovada: ...; evidência: docs\plano.md" --next "Executar testes"
agentforge context --project D:\projeto
```

Depois de verificar uma alteração, registe uma lição com uma fonte **dentro do projeto**; apenas um humano deve aprovar a sua reutilização. Use `--scope reusable --anchor "tecnologia vX"` só quando a lição generaliza para outros projetos (sem nomes/caminhos deste workspace) e nomeia a versão da tecnologia a que se aplica; o `--scope` por omissão é `project` e não precisa de âncora:

```powershell
agentforge learn add --project D:\projeto --lesson "Verificar contratos entre frontend e backend" --evidence "tests\contracts.test.ts:42"
agentforge learn add --project D:\projeto --lesson "Node 20 ESM exige extensão .js em imports relativos" --evidence "src\index.ts:1" --scope reusable --anchor "Node 20"
agentforge learn list --project D:\projeto
agentforge learn approve --project D:\projeto --id <id>
agentforge context --project D:\projeto --topic contratos
agentforge learn retire --project D:\projeto --id <id>
```

Lições `reusable` sem âncora são recusadas; no máximo 5 podem estar activas em simultâneo (aprovadas ou pendentes) para evitar acumular paráfrases da mesma lição — retire uma antes de propor outra.

`context` devolve no máximo **cinco lições aprovadas**, filtráveis por tema; lições pendentes ou retiradas não entram no resumo. Os dados persistem em `.agentforge/work/context.md` e `.agentforge/work/lessons.json`, sobrevivem à reinstalação/desinstalação e não alteram automaticamente skills ou regras. Não inclua segredos ou dados pessoais; reveja as lições antes de aprovar. Para melhorar o kit partilhado, proponha uma alteração ao código e aos testes para revisão por PR. Isto não é uma gravação automática de conversas nem uma alteração automática do modelo/CLI.

Resultados de execução podem ser **registados explicitamente** via `agentforge record` depois de validação (ver [docs/operations/GUIDE.md](docs/operations/GUIDE.md)); `plan` não escreve logs de execução. Não registar um PASS sem executar as verificações. O ficheiro `.agentforge/work/operations.jsonl` fica no projeto e não é gerido pelo instalador.

## Proteção do projeto

- `AGENTS.md`/`CLAUDE.md` existentes são preservados; só são adicionados blocos delimitados por CLI.
- Ficheiros de agentes/skills preexistentes não são substituídos. Alterações a ficheiros geridos impedem atualização/remoção; resolva o conflito manualmente antes de repetir.
- `.agentforge/manifest.json` guarda hashes e ownership para desinstalação segura; **versione** o manifesto e os conteúdos instalados se a equipa partilhar o mesmo repositório.
- `.agentforge/work/state.md`, `context.md` e `lessons.json` permanecem após desinstalação para preservar trabalho. Não guardar segredos nem sincronizar um pipeline ativo simultaneamente em várias máquinas.
- Instalar Claude juntamente com OpenCode pode fazer o OpenCode descobrir skills iguais em `.agents/skills` e `.claude/skills`; selecione só os CLIs usados pelo projeto se não quiser duplicação de descoberta.

## Origem e compatibilidade

Conceitos derivados do AgentForge local: `HARNESS.md`, `AGENTS.md`, `docs/harness/03_modelo-agente.md`, pipelines `06_pipeline-a.md`–`08_pipeline-c.md`, `agentes/` e `skills/`. O kit **reinterpreta** esses contratos em templates portáteis, não transfere o estado da máquina nem executa os hooks Python/Bash do projeto original. Antes de distribuir a outras pessoas, confirme a licença/permissões de publicação do repositório original.

Formato dos CLIs: [OpenCode agents](https://opencode.ai/docs/agents/) e [skills](https://opencode.ai/docs/skills/), [Codex skills](https://developers.openai.com/codex/skills), [Claude subagents](https://code.claude.com/docs/en/sub-agents), [Antigravity skills](https://antigravity.google/docs/skills) e [workflows](https://antigravity.google/docs/ide/workflows).

Documentação de referência: [roles](docs/roles/CATALOG.md), [skills](docs/skills/CATALOG.md), [workflows](docs/workflows/CATALOG.md), [agents](docs/agents/CATALOG.md), [tools](docs/tools/CATALOG.md), [testes](docs/testing/STRATEGY.md), [operações](docs/operations/GUIDE.md) e [ADR](docs/decisions/0001-composicao.md).

Funcionalidades ainda não implementadas, para evitar integração simulada e expansão prematura: [backlog](docs/operations/BACKLOG.md). Histórico: [CHANGELOG.md](CHANGELOG.md).
