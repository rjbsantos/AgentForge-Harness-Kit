# Changelog

## Por publicar

- **Composição de fluxos:** cada fluxo declara os sub-fluxos que chama (`uses`: passo, condição e artefacto que passa de um para o outro). `release-closure` passa a orquestrar `repository-audit`, `security-assessment`, `sast-remediation`, `technical-documentation` e `production-cleanup`; `bug-investigation` entrega a `change-request`; `incident-analysis` a `bug-investigation`; `agent-build` chama `guardrail-design`, `prompt-engineering`, `context-memory-setup`, `ai-evaluation` e `red-team`. `plan` devolve `composition`; um teste impede ciclos e referências inexistentes.
- **Porta de entrada (`agentforge gate`, `agentforge_gate` no MCP, campo `gate` em `plan`):** um pedido vago é recusado com no máximo quatro perguntas e uma recomendação cada, antes de gastar um fluxo. Determinístico, sem modelo. `plan` devolve `status: needs-context`.
- **Execução de fluxos (`agentforge flow`):** `start`, `status`, `done`, `skip`, `close`, `abandon`. Passos por ordem (os paralelos por qualquer ordem), com evidência (SHA-256) ou nota; passos de decisão humana só com confirmação em terminal; `close` recusa passos pendentes; tudo em `audit.jsonl`.
- **Fluxos novos:** `sast-remediation` (relatório do Checkmarx: triagem com evidência, correcção com testes, comparação com o scan novo), `edge-modernization` (deixar o modo de compatibilidade do IE, validar e optimizar para o Edge), `guardrail-design` e `red-team`; competências `forge-sast-remediation`, `forge-edge-compat`, `forge-guardrails` e `forge-red-team`.
- **Removidos** os perfis `magazine-editor` e `university-student`, os fluxos `magazine-article`, `academic-research` e `study-session` e os agentes `editor` e `academic-tutor`. O `upgrade` remove os ficheiros correspondentes se não foram alterados e limpa o manifesto (`src/retired.ts`); um ficheiro alterado pelo utilizador fica onde está e deixa de ser gerido.
- **Gestão de projecto:** novos fluxos `project-plan` (pacotes, estimativas com intervalo e fonte, caminho crítico, marcos, linha de base), `change-control` (pedido CC-NNN, impacto, decisão, linha de base), `stakeholder-communication` e `budget-tracking`, com as competências `forge-project-planning`, `forge-change-control`, `forge-communication` e `forge-budget`. `project-status`, `meeting-followup`, `risk-review` e `requirements-analysis` passam a ter 4 passos e a compor-se com os novos. Os valores têm sempre fonte; o kit não envia comunicações nem altera orçamentos.
- **Guarda (`agentforge guard`, opcional, Claude Code):** hook `PreToolUse` que bloqueia `git commit` em main, push forçado ou para main, tags, `gh release create`, `gh pr merge` e `npm publish` sem autorização humana. As autorizações (`permit-main`, `permit-publish`) exigem terminal, têm prazo e âmbito e ficam em `audit.jsonl`. `doctor` detecta o hook alterado.
- **Eficácia:** `agentforge eval run` corre as tuas tarefas com e sem o kit no CLI indicado, com verificações determinísticas, limite de execuções, `--dry-run` e avisos de ruído; `agentforge insights` passa a incluir `usage` (fluxos fechados, passos dispensados, evidência, recusas da porta de entrada, travões da guarda). Ver `docs/testing/EFFICACY.md`.
- **Verificação de versão:** o `agentforge` avisa no stderr quando há uma versão mais recente (consulta `gh api`, só com terminal, no máximo uma vez por dia, com cache, recuo e limite de 2 s; nunca nos hooks, na guarda nem no MCP); `doctor` mostra a linha de versão; desactivável com `AGENTFORGE_NO_UPDATE_CHECK=1`.
- **Modelos de decisão (JEV, Laya):** a porta de entrada devolve decisões tipadas (`decisions`: sim/não, pontuação, escolha com candidatos) e aceita `--decider COMANDO`, um contrato genérico para ligar um modelo de decisão local ou alojado que só a torna mais exigente. Ver `docs/integrations/DECISION-MODELS.md`.
- **Suite de avaliação:** `evals/` com seis tarefas e fixtures (vago, simples, defeito, publicação, relatório Checkmarx, Edge), baseline validada por teste.
- **Local primeiro:** hook `pre-push` (`npm run hooks:install`) que corre `npm run ci -- --skip-install`; a CI remota passa a correr só em pull request, em tag de release ou à mão; CodeQL em pull request, semanal ou à mão.

## 0.11.0

Primeira versão da revisão de segurança e rastreabilidade. **Alterações com impacto:** `learn approve` e `learn reseal` exigem um terminal interactivo; os selos antigos de `lessons.json` passam a «sem selo» até `learn reseal`; `record --result passed` exige `--evidence` ou `--no-evidence`; pedidos destrutivos aprovados passam a escalar.

- Toolchain: TypeScript 7.0.2 (`tsconfig.json` declara `types: ["node"]`; o `dist/` versionado fica idêntico) e acções actualizadas e fixadas por SHA (`checkout` 7.0.1, `codeql-action` 4.38.2, `attest-build-provenance` 4.2.2, `action-gh-release` 3.0.3). Dependabot passa a ignorar majors de `@types/node`.
- Novo fluxo `release-closure` (`/af-release-closure`) para o fecho de uma versão, com a checklist de 14 áreas em `.agentforge/templates/release-closure.md`: requisitos e pendentes, limpeza, base de dados, aplicação, segurança, design system e UX, documentação, testes unitários e de integração, E2E com Playwright, Git e ramos, versionamento, commit/tag/publicação e relatório final. As áreas independentes correm em paralelo; correcções e publicação exigem validação humana (N1 e N2). Novas competências `forge-release` (SemVer, changelog, critério de publicação, tag, rollback) e `forge-e2e` (Playwright).
- Fecho do backlog técnico:
  - OpenCode: o `opencode.json` gerado passa a recusar a leitura de `.env`, chaves e credenciais (`permission.read`; resolução verificada com `opencode debug agent` no OpenCode 1.18.35, que também confirmou a ordem das recusas de `--output` e `--ext-diff`). `agentforge harden` aplica as mesmas regras a um `opencode.json` do utilizador e remove só as que acrescentou.
  - `record --result passed` exige `--evidence CAMINHO` ou, explicitamente, `--no-evidence` (só no CLI; a API mantém-na opcional). `insights` agrega os arquivos `operations.<data>.jsonl` com o ficheiro actual.
  - `doctor` falha se `agentforge` resolver para dentro do projecto (executaria código do repositório a cada ferramenta usada) ou se não estiver no PATH com o hook instalado. Novo contrato de eventos em `docs/integrations/EVENTS.md`; o evento aceita `tool` como sinónimo de `tool_name`.
  - Encaminhamento: termos de risco em espanhol e francês e comandos destrutivos (`DROP TABLE`, `rm -rf`, `--force`, `chmod`, `truncate`, palavras-passe, chaves de API, `push`, `release`…) escalam mesmo com plano aprovado. Antes, estes pedidos aprovados caíam em «economy».
- Robustez e confiança: o `doctor` detecta um hook do AgentForge alterado (só o comando exacto conta; `hooks install` recusa reinstalar sobre ele); `hook-event` limita o stdin a 64 KB e roda `events.jsonl` ao exceder 1 MiB; `operations.jsonl` é arquivado ao exceder 5 MiB; o servidor MCP processa uma mensagem de cada vez, recusa linhas acima de 1 MiB e limita `budgetTokens` a 32000; `approved` pedido pelo MCP só vale com um checkpoint `CP-NNN.md` cujo veredicto é APROVADO. ADRs com estado e novo ADR-0004; `BACKLOG.md` renumerado e actualizado com as lacunas conhecidas.
- Rastreabilidade e validação: `agentforge trace` valida requisitos Must (critério, aprovação, plano, teste); `agentforge record --evidence` guarda o SHA-256 da evidência e `insights.passedEvidence` distingue `passed` verificado, alterado, em falta e sem evidência; `--retries` e `--tokens` deixam de aceitar decimais no CLI. Novo `docs/architecture/REQUIREMENTS.md` com a matriz requisito → teste do kit, validada por `src/tests/requirements.test.ts`.
- Cadeia de fornecimento: `SECURITY.md`, Dependabot (npm e Actions), CODEOWNERS e CodeQL; acções fixadas por SHA e `permissions` mínimas; `npm audit` passa a falhar em `moderate`; a release publica `SHA256SUMS` e atestação de proveniência; teste do resumo SHA-256 do componente de terceiros embebido.
- Segurança (primeiros itens da análise de gaps):
  - `learn approve` e `learn reseal` exigem confirmação num terminal interactivo; com stdin redireccionado (um agente) são recusados. O selo de `lessons.json` passa a ser um HMAC-SHA-256 com chave fora do projecto (`AGENTFORGE_HOME` ou `~/.config/agentforge/seal.key`, modo 0600), por isso quem só escreve no repositório não o forja. Os selos antigos (SHA-256 sem chave) ficam como «sem selo» até serem revistos e refeitos com `learn reseal`; um repositório clonado noutra conta também exige `learn reseal`.
  - Novo `.agentforge/work/audit.jsonl` (cadeia de hashes) com `lesson.add`, `lesson.approve`, `lesson.retire` e `lessons.reseal`; nunca guarda o texto das lições.
  - Novo `agentforge harden apply|remove` (opcional, Claude Code): `permissions.deny` para `.env`, chaves, `secrets/`, `~/.ssh` e `~/.aws`, preservando as regras do utilizador. `doctor` sugere-o. Não cobre leituras por Bash.
  - Papéis só de leitura do OpenCode passam a recusar `--output` e `--ext-diff` (o git escrevia ficheiros ou executava programas apesar de `edit: deny`).
  - `model-profiles.json` passa a respeitar a política de symlinks (`safe()`), como o resto do kit.
  - Escrita atómica com temporário único no instalador: um `manifest.json.tmp` deixado por uma falha deixa de bloquear `install`/`upgrade`.
- `npm run ci`: repete localmente os passos da CI (instalação limpa, testes, auditoria, `dist/` sincronizado, smoke e Node 20 e 22) para quando a CI remota não está disponível; processo de release manual documentado em `CONTRIBUTING.md`.

## 0.10.0

- Segurança: novas competências `forge-threat-model` (modelo de ameaças com STRIDE e ameaças de modelos de linguagem) e `forge-security-testing` (testes de segurança executáveis e ferramentas de análise, só contra a própria aplicação em ambiente local, nunca produção nem sistemas de terceiros), novo agente `security-tester`, novo fluxo `security-assessment` e perfil `engenheiro de segurança`. `forge-build` inclui o modelo de ameaças e um passo de testes de segurança em paralelo com a revisão do `secops`; `change-request` também. No próprio kit: `npm audit --audit-level=high` na CI e `src/tests/security.test.ts` (nenhum ficheiro gerado contém segredos, limites dos agentes de segurança, presença nos fluxos).
- Terceira avaliação real (`database-optimization`, `technical-documentation`, `change-request`, `prompt-engineering`, `context-memory-setup`, `security-assessment`; resultados em `docs/testing/EVALUATION.md`): todos passaram. `forge-prompt-engineering` passa a exigir testar o preenchimento dos marcadores (chavetas JSON literais colidem com `{texto}`). `agentforge tokens` passa a medir as listagens nativas do Claude Code (~3400 tokens por sessão), que o orçamento de arranque não contava. Medição de uso: nenhuma skill invocada nem subagente delegado em 12 corridas, sem cortes por falta de dados suficientes.
- Segunda avaliação real (`frontend-build`, `agent-build`; resultados em `docs/testing/EVALUATION.md`): o `frontend-build` apanhou e corrigiu uma regressão visual real e o `agent-build` fixou as versões instaladas e declarou a avaliação bloqueada por falta de chave. Três correcções: perguntas com uma só decisão e sem subperguntas em todos os fluxos, ramo próprio explícito em `frontend-build` e `agent-build`, e comando de testes documentado em `forge-tdd`. Versão 0.10.0, README e arquitectura actualizados (13 perfis, 22 agentes, 39 competências).
- Primeira avaliação real com o CLI do Claude Code (`production-cleanup`, `bug-investigation`, `forge-build`; resultados em `docs/testing/EVALUATION.md`). Três falhas corrigidas: `forge-debug` só aceita «reproduzido» se o comando foi executado (cálculo à mão fica `INFERRED`), o limite de quatro perguntas passa para o `HARNESS.md`, o passo 1 de `forge-build` e o `product-manager` (a competência sozinha não era carregada), e a implementação passa a exigir um ramo próprio em vez do principal. Teste de contrato para as três.

- Encaminhamento por pontuação de sinais (`src/intent.ts`) em vez de uma expressão regular por fluxo: cada fluxo soma pesos de sinais (palavras e combinações como «criar» + «app») sobre o texto sem acentos, exige uma pontuação mínima, trata como ambíguo quando outro perfil fica a um ponto do melhor e recusa em vez de adivinhar. Um perfil indicado passa a aceitar todos os fluxos que lhe pertencem. Medido com pedidos reais em pt-PT (`src/tests/intent-data.ts`): de 41% e 38% de acerto (afinação e reservado) para 100% e 100%; num conjunto novo, escrito depois de afinar e corrido a frio, 84% (16 de 19), com as três falhas corrigidas a seguir. Novo teste de encaminhamento com os três conjuntos e as recusas.

- Comandos `/af-…`: `/af-menu`, `/af-estado`, `/af-retomar`, `/af-plano`, `/af-contexto` e um por fluxo (`/af-build`, `/af-production-cleanup`, …), gerados de `src/commands.ts`. Nativos no Claude Code (`.claude/commands/`) e no OpenCode (`.opencode/commands/`); o `MENU.md` lista-os com a explicação e o agente apresenta-os ao arrancar em qualquer CLI (no Codex como texto, sem comandos nativos). Os agentes principais passam a seguir o arranque mínimo.

- Arranque mínimo: o bloco de instruções manda ler só `HARNESS.md` e `state.md` e apresentar as opções depois, a partir de `MENU.md` (gerado do catálogo). O que antes se lia sempre (`MODEL_ROUTING.md`, `context.md`, `operator.json`) e o detalhe dos fluxos (`GUIDE.md`, novo) carregam-se a pedido. Orçamento de arranque de 3000 para 1500 tokens estimados. O bloco anterior é reconhecido e actualizado por `install` e `upgrade`.
- Novo fluxo `production-cleanup` (limpeza e otimização de código e actualização da documentação para produção): linha de base, lixo e código morto com evidência, segurança, desempenho, validação humana, aplicação em lotes pequenos, entrega (configuração, registo, saúde, build, imagem), medição antes e depois e documentação. Nova competência `forge-production-readiness`.

- Desenvolvimento de ponta a ponta: `forge-build` começa por clarificar o pedido e passa a envolver os especialistas da stack. Novos fluxos `frontend-build`, `database-optimization`, `agent-build`, `prompt-engineering` e `context-memory-setup`, com encaminhamento por intenção e modelos de saída.
- 15 competências novas: `forge-clarify` (briefing e perguntas pertinentes com recomendação), `forge-tdd`, `forge-python`, `forge-dotnet`, `forge-react`, `forge-database` (SQL, PostgreSQL, MySQL), `forge-design-system`, `forge-accessibility`, `forge-visual-validation`, `forge-ai-engineering`, `forge-prompt-engineering`, `forge-agent-engineering`, `forge-langchain` (LangChain e LangGraph), `forge-ms-agent-framework` e `forge-memory`. As de IA mandam confirmar pacotes e APIs na versão instalada.
- 8 agentes novos: `frontend-developer`, `backend-developer`, `design-system-architect`, `accessibility-expert`, `ui-visual-validator`, `database-optimizer`, `agent-engineer`, `context-manager`; seis perfis novos.
- Design system predefinido (`.agentforge/templates/design-system-default.md`), aplicado só quando o projecto não tem um. O `HARNESS.md` ganha a secção «Perguntas e melhoria do pedido» e deixa de listar todas as competências (remete para `CAPABILITIES.md`) para caber no orçamento de arranque.
- ADR-0003 revisto: o âmbito inclui as competências de domínio por decisão do utilizador.

- Revisão do harness face ao AgentForge: processos A, B, C e manutenção passam a ser fluxos completos. `forge-build` (A) tem requisitos, arquitectura e plano com validação humana, implementação com revisão por tarefa, segurança, qualidade e infraestrutura em paralelo, documentação e fecho; `repository-audit` (B) passa a ter selecção de candidatos, implementação só do seleccionado e comparação antes e depois; novos `technical-documentation` (C) e `change-request` (manutenção, ramo próprio, pull request sem merge automático, arquivo).
- Novas competências `forge-checkpoint`, `forge-plan`, `forge-security`, `forge-docs`, `forge-infra` e `forge-finish` e novos agentes `tech-writer` e `devops`, escritas de raiz em pt-PT. Encaminhamento por intenção para os dois fluxos novos. Agentes e competências de domínio do AgentForge ficam de fora (ADR-0003).

- Agentes reescritos com estrutura comum (Competências, Faz, Limites, Entrega) e descrições do tipo «Usar quando…». Os agentes antes mais curtos (`product-manager`, `architect`, `reverse-engineer`, `ai-engineer`, `editor`, `academic-tutor`, `systems-analyst`) passam a ter limites e formato de entrega; `lead-developer` usa `forge-debug`; `editor` usa `forge-prose`; `architect`, `ai-engineer` e `systems-analyst` usam `forge-tradeoff`, `forge-routing` e `forge-graph` quando aplicável; `code-critic` e `secops` passam a etiquetar a confiança (`EXTRACTED`, `INFERRED`, `AMBIGUOUS`); `secops` nunca copia segredos para o relatório; `academic-tutor` orienta sem redigir a entrega.
- `code-critic`, `reverse-engineer` e `secops` ficam realmente só de leitura: `tools: Read, Grep, Glob` no Claude Code (testado: `disallowedTools` e `permissionMode: plan` eram contornados com Bash), `permission` no OpenCode (`edit: deny` e `bash` negado, com só comandos `git` e `graphify` de leitura permitidos; testado: só `edit: deny` era contornado com `printf` no Bash) e `sandbox_mode = "read-only"` no Codex.
- Competências: descrições orientadas ao gatilho («Usar quando…», melhor para a escolha automática pelo CLI) e uma linha `Validação:` em todas (faltava em `forge-requirements`, `forge-implementation`, `forge-audit`, `forge-verify`, `forge-routing` e `forge-context`). Novo teste de contrato para a estrutura de papéis e competências e para o bloqueio de escrita.

- Documentação: referências a `src/` corrigidas após a divisão do `catalog.ts`; novo índice `docs/README.md`; README com arranque rápido e índice, com a referência de contexto, manutenção, grafo e tokens movida para `docs/operations/COMMANDS.md`; exemplos com `<projeto>` e `bash` em vez de caminhos Windows; `README.en.md` alargado (arranque rápido, funcionamento, competências, ficheiros instalados, limites); catálogos de agentes e ferramentas completados; ADR-0002 (`dist/` versionado) e ADR-0003 (critério para novas competências); protocolo de avaliação em `docs/testing/EVALUATION.md` (rubricas, não executadas pela suite).
- A lista de competências no `HARNESS.md` é gerada a partir de `src/skills.ts`. Novo `src/tests/docs.test.ts`: falha se faltar uma competência ou um agente nos catálogos, se a versão do README, do README em inglês ou do CHANGELOG divergir de `package.json`, ou se existirem ligações ou caminhos de `src/` quebrados na documentação.

- Novas competências inspiradas na análise de repositórios populares (superpowers, humanizer): `forge-debug` (causa-raiz com uma hipótese de cada vez, paragem após três refutadas; ligada a `bug-investigation`) e `forge-prose` (revisão de prosa em pt-PT sem alterar factos nem citações; ligada a `magazine-article`). Sem código de terceiros.
- `forge-implementation` passa a ter uma escada «reutilizar antes de escrever» (não fazer, código existente, biblioteca-padrão, dependência já instalada) inspirada no ponytail; as reduções de código e custo anunciadas pelo projecto não foram medidas aqui.

## 0.9.2

- Corrigido: `upgrade` e `install` recusavam projectos instalados pelas versões 0.8.2 e 0.8.3 com «Bloco de instruções alterado», porque o bloco dessas versões (sem a frase sobre o limite da raiz do projecto) não era reconhecido. O bloco passa a ser migrado, e um teste usa os blocos reais gerados pela 0.8.3. Verificada a migração a partir das versões 0.8.2, 0.8.3 e 0.9.0 até `doctor` saudável.

## 0.9.1

- Versão do kit verificável: `agentforge --version` (ou `-v`); `install` e `upgrade` registam a versão em `.agentforge/manifest.json` (`kit`); `status` mostra a versão instalada e a do CLI; `doctor` falha e indica `agentforge upgrade` se forem diferentes ou se o manifesto for anterior ao registo (0.9.1). O servidor MCP passa a anunciar a versão do kit.

## 0.9.0

- Poupança de tokens: novo `agentforge tokens` (mede arranque, texto do utilizador em `CLAUDE.md`/`AGENTS.md` e crescimento do estado; código 1 se houver excessos); `operator set --verbosity normal|concise` (exposto no `plan`); secção «Estilo de resposta e higiene de contexto» no `HARNESS.md` (respostas directas sem comprimir avisos de risco nem aprovações; filtrar a saída das ferramentas e guardar registos longos em `.agentforge/work/logs/`); `docs/integrations/TOKEN-TOOLS.md` com o mapeamento de dez ferramentas externas, licenças e riscos. Sem código de terceiros embebido.
- Encaminhamento: pedidos só de leitura (explicar, listar, mostrar…) sem verbos que alterem estado deixam de escalar para `secops` por palavras como `auth` ou `database`. Segredos, credenciais e pagamentos escalam sempre, tal como qualquer pedido que altere estado ou use `--high-risk`.
- Corrigido: `secrets`, `credentials` e `payments` (plural) não eram reconhecidos como área de risco; só o singular.
- Arranque mais leve: o bloco de instruções e o `HARNESS.md` deixam de mandar ler `OPERATOR.md` em cada sessão (só `operator.json`; o formato é consultado a pedido). O bloco anterior é reconhecido e actualizado automaticamente. Um teste limita as instruções de arranque a 3000 tokens estimados.
- `load()` do instalador deixa de reconstruir os ficheiros de cada CLI por cada entrada do manifesto; `tsconfig` passa a ter `noUnusedLocals` e `noUnusedParameters` e foram removidas as importações não usadas.
- Integração opcional com o gateway OmniRoute: `agentforge gateway omniroute [--cli NOME] [--write]` propõe (ou grava, preservando modelos já definidos) o mapeamento `thinking`/`economy` em `model-profiles.json` e os comandos de ligação por CLI. Não instala nem executa o gateway; riscos de privacidade e de termos de serviço documentados em `docs/integrations/OMNIROUTE.md`.
- A instalação para o Claude Code inclui a competência de terceiros `claude-automation-recommender` (plugin oficial `claude-code-setup` da Anthropic, Apache-2.0, sem alterações), que recomenda hooks, subagentes, competências, servidores MCP e plugins para o projecto. Atribuição em `THIRD_PARTY_NOTICES.md`; os ficheiros, incluindo a licença, ficam em `.claude/skills/claude-automation-recommender/`.
- Conceitos do graphify: nova competência `forge-graph` (auditoria de repositório, investigação de defeitos e análise de sistemas) que consulta `graphify-out/` quando existe; etiquetas de confiança `EXTRACTED`/`INFERRED`/`AMBIGUOUS` exigidas em `forge-audit`, `forge-hygiene`, no modelo de auditoria e no `HARNESS.md`; `agentforge graph query|path|explain|report` e a ferramenta MCP `agentforge_graph` sobre o catálogo do kit; `agentforge doctor` indica, sem o tratar como problema, se existe grafo do graphify.
- `routing.ts` exporta `routingTable`, e um teste garante que `classify` só devolve agentes aí declarados.
- Novos comandos: `upgrade` (reaplica o kit aos CLIs instalados), `doctor` (diagnóstico com código de saída), `mcp` (servidor MCP só de leitura com `plan`, `route`, `context`, `lessons` e `insights`) e `hooks install|remove` (hook opcional do Claude Code que regista apenas hora e nome da ferramenta; `insights` passa a incluir `hookEvents`).
- `lessons.json` passa a ter um selo de integridade: edições fora do CLI fazem omitir as lições e recusar novas até `agentforge learn reseal`. `context` devolve `warnings`.
- `catalog.ts` dividido em `skills`, `roles`, `docs`, `generators` e `target`; os blocos de instruções de versões anteriores ficam isolados em `blocks.ts`.
- Testes de contrato dos ficheiros nativos gerados (agentes, skills, TOML do Codex, OpenCode e Antigravity).
- Resumo da documentação em inglês (`README.en.md`).
- `install` e `uninstall` passam a ser transaccionais: se uma escrita falhar a meio, os ficheiros tocados e o manifesto são repostos, evitando um estado intermédio que bloqueava a nova tentativa.
- O CLI usa `util.parseArgs` em vez de um analisador artesanal e passa a ter testes de ponta a ponta (`src/tests/cli.test.ts`). O comportamento e as mensagens de utilização mantêm-se.
- O CI falha se `dist/` não estiver sincronizado com `src/`. Novo `npm run coverage` e corpus rotulado de pedidos para proteger o classificador de encaminhamento contra regressões.
- O OpenCode recebe um comando `/agentforge` com escolha guiada do tipo de trabalho, um tema AgentForge e configuração da TUI para o aplicar por omissão. A personalização altera cores, não o layout da barra lateral; as configurações `opencode.json` e `tui.json` existentes continuam a ser preservadas.
- As instruções globais passam a exigir que alterações e artefactos do projecto permaneçam na raiz indicada, com validação de caminhos e bloqueio de traversal ou ligações simbólicas externas. Nova competência `forge-hygiene`, integrada na auditoria do repositório, identifica código, ficheiros e dependências potencialmente mortos ou obsoletos sem remoção automática.

## 0.8.3

- A instalação do OpenCode passa a definir `agentforge` como agente principal predefinido, para que as sessões novas usem as instruções do harness. Se já existir `opencode.json`, o instalador preserva a configuração e indica a chave que o utilizador pode acrescentar.
- Clarificado que o nome do produto na interface continua a ser OpenCode; AgentForge é o agente principal seleccionado dentro do CLI.
- Testado o contrato da configuração no OpenCode através do comando de diagnóstico de agentes.

## 0.8.2

- A instalação directa a partir do Git deixa de compilar durante `prepare`, evitando depender da disponibilidade de `tsc` no ambiente npm do utilizador. A solução anterior da versão 0.8.1 não resolveu o problema em todos os ambientes npm. Os artefactos compilados de `dist/` passam a ser versionados e instalados directamente; a compilação continua a ser verificada no CI.

## 0.8.1

- Corrigida a instalação directa a partir do GitHub: as dependências de compilação usadas pelo ciclo `prepare` passam a estar em `dependencies`, para que `tsc` esteja disponível em ambientes npm que não expõem dependências de desenvolvimento durante a preparação de dependências Git.

## 0.8.0

- Auditoria funcional ao ECC (`docs/architecture/AUDIT.md`): mantidos os mecanismos já existentes de contexto, memória, routing e verificação; adoptadas melhorias sem importar código nem hooks específicos de fornecedor.
- `agentforge context --budget-tokens N [--topic TEXTO]`: recuperação limitada por orçamento, no máximo cinco lições aprovadas, prioridade a lições recentes e contagem de omissões. Estimativa explícita caracteres/4; falha se estado e resumo obrigatórios excederem o limite, sem truncagem silenciosa.
- `agentforge insights`: agrega registos explícitos de `operations.jsonl` por resultado e fluxo, tokens, custo, duração e repetições; identifica códigos de erro recorrentes e as linhas de origem. Um registo malformado provoca um erro com o número da linha; nenhuma lição é criada ou aprovada automaticamente.
- `forge-verify`: ciclo de recuperação documentado com máximo de duas correcções, alteração efectiva obrigatória e escalonamento ao repetir a mesma causa.
- Os fluxos podem declarar grupos paralelos com dependências, papéis e competências por responsável. `repository-audit` atribui qualidade a `code-critic`, segurança a `secops` e desempenho a `reverse-engineer` após o passo 1; `plan` devolve o modo de coordenação, a concorrência máxima, a profundidade de delegação 1 e a regra de escrita única. Todos os papéis passam a ter agentes Codex nativos. A execução depende do suporte do CLI e é sequencial quando não há delegação; não foram instalados mecanismos universais nem simulada a execução de subagentes.
- Novos testes para orçamento de contexto, parsing/agrupamento de execuções, erros recorrentes e contrato de coordenação paralela.

## 0.7.1

- `npm run smoke` (`scripts/smoke.mjs`): teste de empacotamento completo que cria e instala o arquivo comprimido num projeto limpo e executa `install`, `operator`, `plan`, `status` e `uninstall` a partir do pacote distribuível. `npm test` utiliza a pasta `dist/` local e não detecta módulos ausentes de `files` nem ficheiros obsoletos — os dois problemas encontrados na versão 0.7.0.
- A integração contínua passou a testar Linux, Windows e macOS com Node.js 20 e 22. `npm run smoke` substituiu `npm pack --dry-run`, que não instalava o pacote nem detectava erros de instalação.
- O fluxo de publicação `Release` executa os testes e o teste de empacotamento quando recebe uma etiqueta `v*`, confirma que corresponde à versão de `package.json` e anexa o arquivo comprimido à versão do GitHub.
- Corrigida a execução de testes em Node.js 20 e Windows: `node --test dist/tests/*.test.js` dependia da expansão de padrões pela shell, que a PowerShell e o `cmd` não fazem; além disso, o Node.js 20 e as versões posteriores tratavam os caminhos de diretórios de forma diferente. `scripts/test.mjs` passa agora a lista explícita de ficheiros em todos os sistemas.
- Acrescentados os metadados `repository`, `bugs` e `homepage` a `package.json`; `*.tgz` e `dist-release/` são ignorados pelo Git.
- Removidas as pastas vazias `config/` e `templates/`, que já não faziam parte da estrutura do projeto.

## 0.7.0

- Auditoria de adequação ao perfil do operador (`docs/architecture/AUDIT.md`): o harness era sólido mas genérico — tratava pedidos híbridos gestão+técnica como erro de ambiguidade e não tinha a ponte entre necessidade de negócio e solução.
- Novo **perfil do operador** (`src/operator.ts`, `agentforge operator show|set`, `.agentforge/work/operator.json`, `.agentforge/OPERATOR.md`): ordem de perfis preferida, postura de risco, idioma e interesses. A ordem desempata deterministicamente pedidos que cruzam vários perfis (`selectedBy: "operator"`), mantendo o erro quando a preferência não cobre os candidatos. O ficheiro é local, preservado em reinstalação/desinstalação e vazio no pacote publicado.
- A postura de risco é assimétrica por desenho: `cautious` escala para `thinking` com o motivo registado; `exploratory` **não** desliga gates, aprovações nem verificação.
- Novo perfil `it-project-manager` (Gestor de Projetos de Sistemas de Informação) e agente `solution-advisor`, que compara opções segundo custo, risco e reversibilidade e regista a decisão. Não implementa: encaminha o trabalho após aprovação.
- Novos fluxos `solution-briefing`, `automation-opportunity`, `tech-exploration` e `continuous-improvement`, que reutilizam `forge-research`, `forge-verify`, `forge-requirements` e `forge-context`; novos modelos `solution-brief`, `decision-record` (registo de decisão de arquitectura), `automation-plan`, `tech-exploration` e `improvement-plan`.
- Novas competências transversais `forge-tradeoff` (define previamente critérios e ponderações, inclui a opção de manter a situação actual, identifica riscos e proíbe inventar preços ou comparações de fornecedores) e `forge-spike` (define a pergunta e o critério antes da experiência; conclui por adoptar, experimentar, avaliar ou abandonar; utiliza `assess` quando não há resposta no prazo previsto).
- `plan` devolve `selectedBy` e `operator`, tornando explícita a razão da selecção do perfil.
- `validateSkillReferences()` confirma durante o carregamento que os fluxos e perfis referenciam competências e agentes existentes, evitando divergências entre `src/capabilities.ts` e `src/catalog.ts`.
- As instruções existentes podem ser actualizadas sem duplicar blocos nem perder texto do utilizador.

## 0.6.0

- Auditoria ao harness `D:\Workspace\Edge\.atomica` (Atomica Code): foram aproveitados princípios de verificação disciplinada, gravidade estruturada e fundamentação em código existente. Não foi importado código nem motor de execução de terceiros; ver `docs/architecture/AUDIT.md`.
- `forge-verify` e o papel `qa` passaram a exigir um veredicto `PASS`, `FAIL` ou `PARTIAL` por verificação, com comando e saída reais, e a prevenir erros como ler código em vez de o executar ou ignorar casos relevantes.
- `code-critic` recebeu níveis de gravidade — crítico, importante e menor — e uma lista de verificação de cobertura de testes, tradução e compatibilidade. `secops` recebeu uma lista estruturada baseada nas áreas de risco OWASP.
- Novas competências transversais `forge-ground` (confirma tipos e APIs reais e consulta um exemplo antes de escrever código) e `forge-performance` (analisa consultas repetidas, alocações, operações assíncronas bloqueantes e cache), associadas a `lead-developer`, `bug-investigation`, `repository-audit` e `forge-build`.
- `memory.ts` e `agentforge learn` distinguem lições `project` (específicas do código actual) de lições `reusable` (aplicáveis a outros projetos; exigem `--anchor` com tecnologia e versão e estão limitadas a cinco activas).
- Documentado o limite de profundidade da delegação: um subagente não pode delegar para outro. A regra consta de `HARNESS.md` e `MODEL_ROUTING.md`.

## 0.5.0

- Auditoria do kit e referência AgentForge antes de ampliar seis perfis.
- Catálogo declarativo de perfis, fluxos, ferramentas e modelos, com competências partilhadas de investigação e verificação de factos e quatro agentes especializados.
- `agentforge plan` propõe perfil, agente, competências e fluxo de trabalho, e identifica pedidos ambíguos sem afirmar que os executou; `agentforge record` regista resultados declarados, validação e métricas opcionais.
- Testes dos perfis, fluxos e regressões de instalação, encaminhamento e contexto; documentação de arquitectura, operação e funcionalidades futuras.

## 0.4.0

- Identidade AgentForge por CLI, resumo ativo por projeto e lições com evidência sujeitas a aprovação.

## 0.3.0

- Encaminhamento conservador entre raciocínio e execução aprovada de baixo risco.
