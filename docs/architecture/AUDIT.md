# Auditoria prévia — AgentForge Harness Kit

Escopo: kit instalável em `D:\Workspace\Groot_Cli`, comparado com o AgentForge local em `D:\Workspace\AgentForge`. Inventário verificado antes das alterações multi-role. Não foram executados hooks nem importado estado da máquina original.

| Componente | Localização | Tipo/função | Estado/uso | Sobreposição | Ação |
| --- | --- | --- | --- | --- | --- |
| Catálogo `skills` | `src/catalog.ts` | Cinco skills instaladas em `.agents/skills` ou `.claude/skills` | Ativo | `forge-requirements`/`forge-implementation` já cobrem requisitos e TDD | KEEP; compor, não clonar |
| Papéis `roles` | `src/catalog.ts` | Sete especialistas técnicos e handoff | Ativo | product-manager/architect/reverse-engineer cobrem parte da análise de sistemas | OPTIMIZE papéis ausentes |
| Pipeline A/B/C | `src/catalog.ts` (`guide`, `generated`) | Construção, auditoria e documentação; Antigravity tem três workflows | Ativo | A/B reaproveitam implementação e QA | MERGE em workflows declarativos reutilizáveis |
| Seleção de complexidade | `src/routing.ts` | Classifica pensamento/economia e agente técnico | Ativo | Não detecta domínio, perfil ou workflow | REFACTOR via seletor multi-role |
| Contexto/lessons | `src/memory.ts` | Estado, resumo curto, lições aprovadas | Ativo | Referência tem memória Python de três níveis, mas não faz parte do pacote | KEEP, não importar runtime alheio |
| Instalação/guardrails | `src/installer.ts`, `src/catalog.ts` | Manifesto, hashes, conflitos, symlinks, gates humanos | Ativo | Identidade distribuída por quatro CLIs; sem inventário unificado | OPTIMIZE templates gerados |
| Operação/logging | `src/cli/index.ts` | Install/status/route/context/learn; sem log estruturado de ações de agentes | Parcial | AgentForge original tem `context_manager/logger.py`, não incluído | NEW registo explícito, local e honesto |
| Testes/CI | `src/tests/*.test.ts`, `.github/workflows/ci.yml` | Contratos de instalação, rota e memória; 3 OS | Ativo | Falta matriz de perfis/workflows | OPTIMIZE |
| Referência original | `D:\Workspace\AgentForge\HARNESS.md`, `AGENTS.md`, `agentes/`, `skills/`, `docs/harness/` | 18 agentes, 37 skills, três pipelines e ferramentas Python | Referência, não instalado | AGENTS/HARNESS repetem catálogo e podem divergir | REUSE conceitos; não copiar estado/hook |
| Templates originais | `D:\Workspace\AgentForge\templates/` | Requisitos, decisão, auditoria, testes e documentação | Referência | Úteis transversalmente | REUSE estruturas; NEW só editorial/estudo/estado |

## Duplicações e riscos

- `AGENTS.md`, `HARNESS.md` e docs do original repetem regras/agentes; o kit mantém um único catálogo gerador em TypeScript e referências por caminho.
- `src/catalog.ts` continha texto de workflows e papéis técnicos separados da escolha em `src/routing.ts`; a composição deve referir o mesmo catálogo.
- A referência tem Product Manager, Tech Writer, Lead Developer, LangChain Optimizer e Reverse Engineer, mas não fornece perfis completos de gestão operacional, engenharia IA genérica, edição de revistas, estudante ou analista AS-IS/TO-BE. Não equivale a executar pesquisa, browser, email, RAG ou APIs neste kit.
- Lições aprovadas são dados, não código de instruções; alterações às políticas exigem revisão. Um `plan`/`route` não prova execução do workflow ou custo real.

## Auditoria 2025 — `D:\Workspace\Edge\.atomica` (Atomica Code)

Analisado como segunda fonte de inspiração: um harness multi-agente ("Atomica Code") com 12 agentes (composer, coordinator, explorer, general, performance, reviewer, security, system.dream, system.finder, system.recall, tester, verifier) e 9 skills (`add-capability`, `create-agent`, `create-script`, `create-skill`, `git`, `submit-feedback`, `test-cases-generate`, `wi-decompose`, `work-item-enhance`). Ferramenta de terceiros (engine `atoml`, tools `ILanguageServer`/`IBash`/`IGit`/`workitem`); não importado código nem engine — só conceitos reaplicáveis aos ficheiros deste kit (Markdown/TOML estático, sem engine própria).

| Componente Atomica | Conceito | Sobreposição no kit | Ação |
| --- | --- | --- | --- |
| `agents/verifier` | Veredicto PASS/FAIL/PARTIAL; nomeia "verification avoidance" e "seduzido pelos 80% fáceis" como modos de falha a evitar | `forge-verify`/`qa` já pediam evidência, mas sem veredicto obrigatório por check | OPTIMIZE: `forge-verify` e `qa` passaram a exigir PASS/FAIL/PARTIAL com comando+output por verificação |
| `agents/reviewer` | Severidade Critical/Important/Minor + checklist SDLC (testes, strings i18n, breaking changes) | `code-critic` já existia, sem níveis nem checklist | OPTIMIZE: `code-critic` ganhou severidade e checklist |
| `agents/security` | Checklist estilo OWASP com severidade Critical/High/Medium/Low | `secops` já existia, genérico | OPTIMIZE: `secops` ganhou a checklist OWASP |
| `agents/performance` | Especialista dedicado (N+1, alocações, async, caching, LINQ) | Nenhuma skill equivalente | NEW: skill `forge-performance`, ligada a `repository-audit` |
| `agents/composer` | "Ground before compose": resolver tipos/APIs reais e ler um exemplar antes de escrever; nunca inventar nomes | Nenhuma skill equivalente explícita | NEW: skill `forge-ground`, ligada a `lead-developer`, `bug-investigation` e `forge-build` |
| `agents/system.dream` + `system.finder` + `system.recall` | Separa lições reutilizáveis entre projetos (`dream`, com âncora de versão obrigatória e tecto de 3/sessão) de factos específicos do workspace (`finding`), e um passo de seleção que colapsa duplicados | `memory.ts` tinha um único conceito de "lição" sem distinção de âmbito nem exigência de versão | OPTIMIZE: `Lesson.scope` (`project`/`reusable`), `anchor` obrigatório e limite de 5 lições `reusable` activas em `src/memory.ts` |
| `agents/coordinator` | Proibição explícita de um subagente delegar para outro subagente (profundidade 2, imposta pelo motor) | Orquestração do kit já evita paralelismo em ficheiros, mas não documentava o limite de profundidade | OPTIMIZE: `HARNESS.md`/`MODEL_ROUTING.md` passaram a declarar o limite de um nível de delegação |
| `agents/explorer` | Níveis de minúcia (quick/medium/thorough) no formato de resposta | `reverse-engineer`/`forge-audit` já pedem file:line, sem níveis | Backlog — não implementado nesta fase (ver `docs/operations/BACKLOG.md`) |
| `skills/add-capability` | Assistente que distingue skill (procedimento) vs agente (worker independente) vs script (parte determinística) antes de criar algo | Fora de âmbito: o kit não tem um engine de execução que corra scripts; a distinção role/agent/skill/workflow/tool já está documentada em `docs/architecture/OVERVIEW.md` | Não aplicável — mantido como referência conceptual, sem novo componente |
| `skills/git`, `create-agent`, `create-skill`, `submit-feedback`, `wi-decompose` | Específicos do engine Atomica (Azure DevOps, `atoml`, `(choose)`) | Não transferível sem a engine; o kit gera ficheiros estáticos, não executa chamadas a ferramentas | REMOVE do âmbito desta auditoria |

Conclusão: reutilizados os princípios de disciplina de verificação, severidade estruturada, grounding antes de compor, e separação lição reutilizável/achado de projeto; não foi importado nenhum código, engine ou dependência do Atomica Code. Nenhum agente, skill ou workflow existente foi duplicado — todas as alterações foram feitas por enriquecimento de componentes já existentes (`forge-verify`, `qa`, `code-critic`, `secops`, `memory.ts`) mais duas skills genuinamente novas (`forge-ground`, `forge-performance`).

## Matriz de alterações aprovada pela auditoria

| Componente | Estado anterior | Classificação | Justificação |
| --- | --- | --- | --- |
| Requisitos, TDD, auditoria, validação, contexto | Implementados como skills e papéis | KEEP | Reutilizados nos perfis sem duplicação |
| Selecção `route` | Só modelo/complexidade | REFACTOR | Separar classificação de modelo da escolha role/workflow |
| Handoffs A/B/C | Texto e três workflows Antigravity | MERGE | Declarar composições com inputs e validação sem perder os pipelines |
| Pesquisa e fact-check | Ausentes do kit | NEW | Usados em IA, editorial, ensino e sistemas |
| AI engineer, editor, academic tutor, systems analyst | Não existem como especialistas completos no kit | NEW | Não substituir Product Manager/Lead Developer existentes |
| Templates e catálogo de tools por role | Faltam | NEW | Resultado verificável; tools sujeitas a disponibilidade real |
| Observabilidade de execução | Sem resultados estruturados | NEW | Registo explícito e local, sem falsificar telemetria do host |
| Conectores email/browser/RAG e publicação automática | Não existem | DEPRECATE como alegação, não como código | Ficam fora de âmbito até existir integração real e autorização |

Sem ficheiros equivalentes a eliminar no kit actual; `REMOVE`/`REPLACE` não são acções justificadas pela evidência. Os adaptadores HTTP fictícios foram retirados numa iteração anterior e **não** fazem parte deste inventário base.

## Arquitetura existente

`Pedido -> CLI route (complexidade) -> agente técnico sugerido -> skill por instrução do host -> workflow A/B/C textual -> ferramentas do host, se disponíveis -> humano/QA -> estado/contexto/lessons`. O CLI instala ficheiros, não invoca modelos; skills e ferramentas são escolhidas pelo host. Erros do CLI propagam com exit code 1; instalador impede sobrescrever conteúdos alterados. Não existe ainda log estruturado de uma execução real nem teste de qualidade de geração.

## Decisão

Prioridade **reutilizar -> otimizar -> consolidar -> corrigir -> expandir**: preservar skills e guardrails existentes; separar role (perspetiva) de agent (executor), compor skills transversais em workflows declarativos, adicionar só competências em falta. Introduzir recomendação verificável, templates e rastreio de eventos explícitos, sem fingir conectores ou alterar a aplicação anfitriã. A referência original não deve ser editada: contém trabalho de outros utilizadores/estados locais.

---

# Auditoria 2026 — adequação ao perfil do operador

Gatilho: o harness era tecnicamente sólido mas **genérico**. A auditoria partiu de um perfil real (Gestor de Projectos de SI com forte componente técnica, orientado a resolução de problemas, melhoria contínua, arquitectura, IA e automação) e perguntou o que falhava na prática, não o que faltava no papel.

## Inventário e lacunas encontradas

| Necessidade do perfil | Já existia? | Diagnóstico | Acção |
| --- | --- | --- | --- |
| Gestão clássica (estado, actas, riscos, requisitos) | Sim — `project-manager` | Cobertura completa, sem duplicação | KEEP |
| Pedidos híbridos gestão + técnica | Não | `choose()` devolvia *Pedido ambíguo* quando um pedido cruzava dois perfis — para um perfil híbrido isso é o caso **normal**, não um erro do utilizador | OPTIMIZE |
| Harness saber com quem trabalha | Não | Nenhum conceito de operador; todas as sessões começavam do zero e em modo neutro | NEW (`src/operator.ts`) |
| Necessidade de negócio → solução concreta | Parcial | `requirements-analysis` produz requisitos e `architect` produz componentes; ninguém comparava opções nem registava a decisão | NEW (`solution-briefing`, `solution-advisor`, `forge-tradeoff`) |
| Registo de decisões (ADR) | Não (só `docs/decisions/` do próprio repo) | Os utilizadores do kit não tinham template de ADR | NEW (`decision-record.md`) |
| Automação de processos | Não | Interesse central do perfil, sem qualquer suporte | NEW (`automation-opportunity`) |
| Exploração de tecnologia (spike, agentes, AI Eng) | Parcial | `academic-research` é bibliográfico; `ai-solution-design` assume o caso de uso decidido. Faltava a experiência delimitada com veredicto | NEW (`tech-exploration`, `forge-spike`) |
| Melhoria contínua | Parcial | Existia o ledger de lições, mas nada o alimentava a partir das execuções registadas | NEW (`continuous-improvement`), reutilizando `forge-context` e `operations.jsonl` |
| Coerência entre os dois catálogos | Fragilidade conhecida | `validateCatalog()` não verificava se as skills referidas por um workflow existem, por estarem em módulos distintos | REFACTOR (`validateSkillReferences()`, executada no carregamento de `src/catalog.ts`) |

## Reutilização antes de construção

As quatro workflows novas **não** trouxeram skills próprias para o que já existia: reutilizam `forge-research`, `forge-verify`, `forge-requirements` e `forge-context`. Só foram criadas duas skills, ambas por lacuna funcional demonstrada — decidir entre opções (`forge-tradeoff`) e descobrir com experiência delimitada (`forge-spike`) — e são partilhadas por várias workflows, em vez de uma cópia por perfil. Foi criado um único papel (`solution-advisor`), porque nenhum dos existentes produzia uma decisão com custo, risco e reversibilidade. Nenhum componente foi duplicado, substituído ou removido.

## Decisões de desenho que merecem registo

**A postura de risco só escala.** `cautious` força `thinking`; `exploratory` **não** desactiva gates, aprovações nem verificação. A alternativa — deixar o perfil pessoal baixar o rigor — transformaria uma preferência de conforto num risco de segurança silencioso. Para reduzir custo existe o caminho correcto e auditável: aprovar o plano e usar `--planned --approved`.

**A preferência de perfis desempata, não adivinha.** Se nenhum dos perfis candidatos constar da lista do operador, o erro de ambiguidade mantém-se. Um perfil nunca é escolhido por ser o primeiro da lista se o pedido não lhe corresponder.

**O perfil do operador é dados, não instruções.** `headline` e `interests` orientam exemplos e reconhecimento de domínio; não sobrepõem políticas, aprovações nem requisitos — a mesma regra já aplicada às lições. O ficheiro é local e mutável (preservado em `install`/`uninstall`), e o kit publicado leva-o vazio: nenhum dado pessoal é empacotado.

## Fora de âmbito (backlog)

Métricas agregadas a partir de `operations.jsonl` (o fluxo `continuous-improvement` já o consome, mas a agregação é manual); importação de backlog real de Jira/Azure DevOps; perfis de operador partilhados por equipa. Nenhum destes é necessário para o perfil auditado e todos exigiriam integrações que o kit não pode garantir.
