# Changelog

## 0.7.1

- `npm run smoke` (`scripts/smoke.mjs`): teste de empacotamento ponta-a-ponta que embala, instala o tarball num projeto limpo e exercita `install`, `operator`, `plan`, `status` e `uninstall` a partir do pacote publicável. `npm test` corre sobre o `dist/` local e, por isso, não deteta módulos ausentes do campo `files` nem artefactos obsoletos — exactamente os dois erros encontrados em 0.7.0.
- CI alargado: matriz Linux/Windows/macOS em Node 20 e 22, com `npm run smoke` a substituir `npm pack --dry-run`, que não instalava nada e dava falsos positivos.
- Workflow `Release`: corre testes e smoke numa tag `v*`, confirma que a tag corresponde à versão do `package.json` e anexa o tarball ao GitHub Release.
- Corrigida a execução de testes em Node 20 e em Windows: `node --test dist/tests/*.test.js` dependia de a shell expandir o glob (o que a PowerShell e o `cmd` não fazem) e o Node 20 e o 22+ interpretam um caminho de directório de forma diferente. `scripts/test.mjs` passa agora a lista explícita de ficheiros, igual em todas as versões e sistemas.
- Metadados `repository`, `bugs` e `homepage` no `package.json`; `*.tgz` e `dist-release/` ignorados pelo Git.
- Removidas as pastas vazias `config/` e `templates/`, resíduos da arquitetura anterior.

## 0.7.0

- Auditoria de adequação ao perfil do operador (`docs/architecture/AUDIT.md`): o harness era sólido mas genérico — tratava pedidos híbridos gestão+técnica como erro de ambiguidade e não tinha a ponte entre necessidade de negócio e solução.
- Novo **perfil do operador** (`src/operator.ts`, `agentforge operator show|set`, `.agentforge/work/operator.json`, `.agentforge/OPERATOR.md`): ordem de perfis preferida, postura de risco, idioma e interesses. A ordem desempata deterministicamente pedidos que cruzam vários perfis (`selectedBy: "operator"`), mantendo o erro quando a preferência não cobre os candidatos. O ficheiro é local, preservado em reinstalação/desinstalação e vazio no pacote publicado.
- A postura de risco é assimétrica por desenho: `cautious` escala para `thinking` com o motivo registado; `exploratory` **não** desliga gates, aprovações nem verificação.
- Novo perfil `it-project-manager` (Gestor de Projectos de SI) e papel `solution-advisor`, que produz opções com custo, risco e reversibilidade e regista a decisão — espaço que nem `product-manager`, nem `architect`, nem `systems-analyst` ocupavam. Não implementa: entrega após aprovação.
- Novos workflows `solution-briefing`, `automation-opportunity`, `tech-exploration` e `continuous-improvement`, reutilizando `forge-research`, `forge-verify`, `forge-requirements` e `forge-context`; novos templates `solution-brief`, `decision-record` (ADR), `automation-plan`, `tech-exploration` e `improvement-plan`.
- Novas skills transversais `forge-tradeoff` (critérios e pesos fixados antes de pontuar, linha de base "manter o estado actual", risco aceite e o que inverteria a decisão, proibição de inventar preços/benchmarks de fornecedores) e `forge-spike` (pergunta e critério antes da experiência, veredicto adoptar/testar/avaliar/descartar, `assess` quando o tempo acaba sem resposta).
- `plan` passa a devolver `selectedBy` e `operator`, tornando visível porque foi escolhido aquele perfil.
- `validateSkillReferences()` verifica no carregamento que todas as skills e agentes referidos pelos workflows e perfis existem, fechando a desincronização possível entre `src/capabilities.ts` e `src/catalog.ts`.
- Actualização de instruções a partir de 0.6 sem duplicar blocos nem perder texto do utilizador.

## 0.6.0

- Auditoria ao harness `D:\Workspace\Edge\.atomica` (Atomica Code): reutilizados conceitos de disciplina de verificação, severidade estruturada e grounding antes de compor; nenhum código/engine de terceiros importado (ver `docs/architecture/AUDIT.md`).
- `forge-verify` e o papel `qa` passam a exigir veredicto PASS/FAIL/PARTIAL por verificação, com comando e output reais, e nomeiam os modos de falha a evitar (ler código em vez de testar; parar nos primeiros 80% fáceis).
- `code-critic` ganhou níveis de severidade (Critical/Important/Minor) e checklist de cobertura de testes/i18n/breaking changes; `secops` ganhou checklist estruturada estilo OWASP.
- Novas skills transversais `forge-ground` (resolver tipos/APIs reais e ler um exemplar antes de compor código, nunca inventar nomes) e `forge-performance` (N+1, alocações, async bloqueante, caching), ligadas a `lead-developer`, `bug-investigation`, `repository-audit` e `forge-build`.
- `memory.ts`/`agentforge learn` distinguem lições `project` (âmbito deste código) de `reusable` (generalizam entre projetos; exigem `--anchor` com tecnologia/versão e estão limitadas a 5 activas) para impedir lições fora de contexto ou desactualizadas por versão.
- Documentado o limite de profundidade de delegação (um subagente nunca delega para outro) em `HARNESS.md`/`MODEL_ROUTING.md`.

## 0.5.0

- Auditoria do kit e referência AgentForge antes de ampliar seis perfis.
- Catálogo declarativo de roles, workflows, tools e templates, com skills partilhadas de pesquisa e fact-check e quatro especialistas necessários.
- `agentforge plan` propõe role/agent/skills/workflow e deteta pedidos ambíguos sem afirmar execução; `agentforge record` regista resultados declarados, validação e métricas opcionais.
- Testes de matriz, regressão de instalação/roteamento/contexto e documentação de arquitectura, operação e backlog.

## 0.4.0

- Identidade AgentForge por CLI, resumo ativo por projeto e lições com evidência sujeitas a aprovação.

## 0.3.0

- Encaminhamento conservador entre raciocínio e execução aprovada de baixo risco.
