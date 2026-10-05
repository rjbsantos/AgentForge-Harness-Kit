# Catálogo de competências

Fonte de verdade: `skills` em `src/skills.ts`. As competências são capacidades reutilizáveis, carregadas apenas quando são relevantes para o pedido e para o fluxo de trabalho. A lista de dependências de cada fluxo encontra-se em `src/capabilities.ts`.

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
