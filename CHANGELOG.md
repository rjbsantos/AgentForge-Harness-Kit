# Changelog

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
