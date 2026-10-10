# Catálogo de competências

Fonte de verdade: `skills` em `src/skills.ts`. As competências são capacidades reutilizáveis, carregadas apenas quando são relevantes para o pedido e para o fluxo de trabalho. A lista de dependências de cada fluxo encontra-se em `src/capabilities.ts`.

## Convenções

A descrição de cada competência começa por «Usar…» e diz quando deve ser carregada. O corpo termina com uma linha `Validação:` que diz como se sabe que a competência foi bem aplicada (evidência, não afirmação). Ambos os pontos são verificados por `src/tests/contracts.test.ts`.

## Competências disponíveis

| Identificador | Finalidade |
| --- | --- |
| `forge-requirements` | Recolher, priorizar e validar requisitos e critérios de aceitação |
| `forge-implementation` | Implementar alterações aprovadas com testes e revisão |
| `forge-audit` | Inspeccionar um projeto e propor correcções fundamentadas |
| `forge-hygiene` | Identificar código, ficheiros e dependências mortos ou obsoletos com evidência e controlo de falsos positivos |
| `forge-verify` | Verificar critérios de aceitação com evidência independente |
| `forge-ground` | Confirmar APIs, tipos e convenções existentes antes de escrever código |
| `forge-graph` | Consultar um grafo de conhecimento (graphify) antes de ler ficheiros, com etiquetas de confiança `EXTRACTED`, `INFERRED` e `AMBIGUOUS` |
| `forge-performance` | Identificar problemas de desempenho com impacto fundamentado |
| `forge-tradeoff` | Comparar opções com critérios definidos previamente e registar decisões |
| `forge-spike` | Responder a uma pergunta técnica através de uma experiência delimitada |
| `forge-routing` | Classificar tarefas e recomendar modelos e agentes |
| `forge-context` | Gerir contexto conciso e propor lições fundamentadas |
| `forge-research` | Investigar código, documentos e fontes externas autorizadas |
| `forge-fact-check` | Validar afirmações e referências com fontes verificáveis |
| `forge-debug` | Investigar defeitos pela causa-raiz, uma hipótese de cada vez, com teste de regressão |
| `forge-prose` | Rever textos em pt-PT sem marcas de escrita genérica, sem alterar factos nem citações |
| `forge-checkpoint` | Registar a validação humana (N1 entre fases, N2 em acções difíceis de reverter) e bloquear até haver aprovação explícita |
| `forge-plan` | Decompor o trabalho aprovado em tarefas pequenas com ficheiros, testes e dependências |
| `forge-security` | Controlo de segurança com gravidade, confiança e bloqueio em Crítico e Elevado |
| `forge-docs` | Documentação funcional e técnica de um sistema existente, com referência ao código |
| `forge-infra` | Ambiente reprodutível e integração contínua sem segredos no repositório |
| `forge-clarify` | Transformar o pedido num briefing e fazer só as perguntas que mudam o resultado, com recomendação |
| `forge-tdd` | Ciclo teste que falha, código mínimo e refactorização, em qualquer linguagem |
| `forge-python` | Boas práticas Python: tipos nas fronteiras, estrutura, erros, assincronia e testes |
| `forge-dotnet` | Boas práticas .NET: nullable, injecção de dependências, async, EF Core e testes |
| `forge-react` | Boas práticas React e TypeScript: composição, estado, efeitos, estados de ecrã e testes |
| `forge-database` | SQL, PostgreSQL e MySQL: esquema, índices, migrações e otimização com plano e medição |
| `forge-design-system` | Identificar o design system do projecto ou aplicar o predefinido; governar tokens e componentes |
| `forge-accessibility` | Verificação WCAG 2.2 AA por teclado, semântica e contraste |
| `forge-visual-validation` | Comparação visual em vários tamanhos de ecrã e classificação de diferenças |
| `forge-ai-engineering` | Desenho e avaliação de soluções com modelos de linguagem, RAG, custo e segurança |
| `forge-prompt-engineering` | Prompts claros, avaliados contra exemplos fixos e versionados |
| `forge-agent-engineering` | Agentes, sistemas multiagente e skills: papéis, ferramentas, estado, limites e avaliação |
| `forge-langchain` | LangChain e LangGraph com APIs confirmadas na versão instalada, ciclos limitados e checkpoints |
| `forge-ms-agent-framework` | Microsoft Agent Framework (Python e .NET) e migração de Semantic Kernel ou AutoGen |
| `forge-threat-model` | Modelo de ameaças (STRIDE e ameaças de modelos de linguagem) na fase de arquitectura, com mitigação e teste por ameaça |
| `forge-security-testing` | Testes de segurança executáveis e ferramentas de análise contra a própria aplicação, só em ambiente local e com saída real |
| `forge-release` | Fechar uma versão: tipo por SemVer, versão e changelog, critério de publicação, commit e tag só com autorização, verificação posterior e rollback |
| `forge-e2e` | Testes ponta a ponta com Playwright: fluxos, cenários positivos e negativos, erros e estados, instabilidade e relatório, declarando o que não foi testado |
| `forge-production-readiness` | Limpar lixo e preparar para produção: configuração, registo, saúde, build, imagem e dependências, com medição antes e depois |
| `forge-memory` | Memória de trabalho, curta e longa do Harness e dos agentes, com escopo, retenção e orçamento |
| `forge-finish` | Fechar um ramo: suite completa, commits de âmbito restrito, pull request sem merge automático e arquivo |

As competências transversais são partilhadas entre perfis. Por exemplo, investigação e verificação de factos servem os perfis académico, editorial e técnico; requisitos e validação servem gestão de projetos, engenharia de IA e análise de sistemas. Não se cria uma cópia por perfil.

`forge-hygiene` é utilizada pela auditoria de repositório. Confirma pontos de entrada e referências dinâmicas antes de classificar código como morto, distingue dependências não usadas de vulneráveis ou desactualizadas e não elimina componentes durante a auditoria. Cada candidato é apresentado com caminho, evidência, confiança e risco de falsos positivos; qualquer remoção posterior exige aprovação e testes.

Todas as competências que lêem ou produzem artefactos de projecto respeitam a raiz indicada ou a raiz Git. Antes de alterar ficheiros validam os caminhos, recusam destinos externos e ligações simbólicas para fora da raiz e não movem ficheiros de outras pastas do computador. Entradas externas só são lidas quando explicitamente fornecidas pelo utilizador.

## Regras de validação e aprendizagem

`forge-verify` exige um veredicto `PASS`, `FAIL` ou `PARTIAL` para cada verificação, acompanhado do comando executado e da saída real. A validação deve ser independente quando possível. Em caso de falha, são permitidos no máximo dois ciclos de correcção: cada repetição exige uma alteração efectiva e a execução dos testes dependentes. Se a mesma causa persistir, interromper o ciclo e pedir uma nova delimitação.

`forge-context` começa pelo estado e pelo resumo activo, e só depois carrega as competências e evidências necessárias. O comando `agentforge context` permite um orçamento estimado — por omissão, 1200 tokens — e indica as lições omitidas. A estimativa é feita por caracteres divididos por quatro; não corresponde à contagem exacta de um modelo.

As lições têm um de dois âmbitos:

- `project`: aplica-se ao projeto actual e não requer âncora.
- `reusable`: pode ser útil noutros projetos; exige uma âncora de tecnologia e versão, por exemplo `--anchor "Node 20"`.

As lições têm de apresentar evidência, começam como pendentes e só são reutilizadas após aprovação humana. Podem ser retiradas quando ficam obsoletas.

## Decisão e exploração técnica

`forge-tradeoff` fixa os critérios e respectivos pesos antes de avaliar opções, inclui sempre a possibilidade de manter a situação actual, distingue factos de estimativas e identifica o risco aceite e a evidência que poderia alterar a decisão. Não inventa preços, medições ou capacidades de fornecedores.

`forge-spike` define a pergunta, o critério de decisão, o âmbito e o tempo antes da experiência. O resultado regista versões, comandos e resultados reais, incluindo falhas. Se a experiência não produzir uma resposta, o veredicto é «avaliar»; não se prolonga o prazo sem aprovação.

## Limites

Não utilize uma competência se o fluxo não a exigir ou se a ferramenta necessária não estiver disponível. As referências externas têm de ser verificadas; fontes inacessíveis ou afirmações incertas devem ser identificadas como tal. Um ficheiro de competência não instala navegação na Web, bases de dados, APIs, correio electrónico ou calendários.
