# Changelog

## Por publicar

- Agentes reescritos com estrutura comum (Competências, Faz, Limites, Entrega) e descrições do tipo «Usar quando…». Os agentes antes mais curtos (`product-manager`, `architect`, `reverse-engineer`, `ai-engineer`, `editor`, `academic-tutor`, `systems-analyst`) passam a ter limites e formato de entrega; `lead-developer` usa `forge-debug`; `editor` usa `forge-prose`; `architect`, `ai-engineer` e `systems-analyst` usam `forge-tradeoff`, `forge-routing` e `forge-graph` quando aplicável; `code-critic` e `secops` passam a etiquetar a confiança (`EXTRACTED`, `INFERRED`, `AMBIGUOUS`); `secops` nunca copia segredos para o relatório; `academic-tutor` orienta sem redigir a entrega.
- `code-critic`, `reverse-engineer` e `secops` ficam realmente só de leitura: `tools: Read, Grep, Glob` no Claude Code (testado: `disallowedTools` e `permissionMode: plan` eram contornados com Bash), `permission: edit: deny` no OpenCode (confirmado com `opencode agent list`) e `sandbox_mode = "read-only"` no Codex.
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
