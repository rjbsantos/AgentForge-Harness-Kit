const skill = (name: string, description: string, body: string): string =>
  `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\n${body.trim()}\n`;

export const skills: Record<string, string> = {
  'forge-requirements': skill('forge-requirements', 'Recolher e validar requisitos antes de desenvolver uma funcionalidade ou projeto.', `
1. Perguntar qual o problema, quem será afectado e que restrições existem; distinguir requisitos de pressupostos.
2. Atribuir identificadores REQ estáveis, prioridades MoSCoW, dependências e critérios de aceitação mensuráveis.
3. Guardar a especificação acordada em \`.agentforge/work/requirements.md\`.
4. Pedir aprovação explícita antes de definir a arquitectura ou iniciar a implementação. Nunca interpretar o silêncio como aprovação.
`),
  'forge-implementation': skill('forge-implementation', 'Planear e implementar alterações aprovadas com testes e passagem de trabalho entre agentes.', `
1. Ler \`.agentforge/work/state.md\` e os requisitos aprovados. Parar se faltarem dados necessários ou houver um bloqueio.
2. Confirmar a raiz do projecto: usar a pasta explicitamente indicada ou a raiz Git. Criar e alterar ficheiros do projecto apenas sob essa raiz; resolver e validar cada caminho antes de escrever, copiar ou eliminar. Se um destino sair da raiz ou atravessar uma ligação simbólica para fora, parar e pedir orientação. Não mover ficheiros externos nem criar cópias do projecto noutras pastas.
3. Preparar um plano breve com caminhos dos ficheiros, testes e dependências. Marcar como paralelas apenas tarefas de leitura realmente independentes; atribuir um único responsável de escrita por ficheiro. Pedir aprovação para decisões com impacto.
4. Escrever um teste que falhe para cada critério de aceitação, aplicar a correcção mínima e refactorizar mantendo os testes aprovados.
5. Passar o trabalho para revisão e controlo de qualidade; limitar os ciclos de correcção e nova verificação e registar evidência, não afirmações, no ficheiro de estado.
6. Nunca efectuar automaticamente uma submissão, integração ou distribuição paralela de alterações aos mesmos ficheiros.
`),
  'forge-audit': skill('forge-audit', 'Auditar código existente com evidência e correcções aprovadas pelo utilizador.', `
1. Mapear os pontos de entrada e o comportamento a partir do código real; identificar as áreas não inspeccionadas.
2. Apresentar problemas potenciais com ficheiro e linha, impacto, esforço e risco de regressão, e etiquetar cada um com a confiança: \`EXTRACTED\` (visto directamente no código, com ficheiro:linha), \`INFERRED\` (deduzido; indicar de onde) ou \`AMBIGUOUS\` (precisa de decisão humana). Nunca tratar um \`INFERRED\` como facto.
3. Perguntar quais os problemas a corrigir. Não alterar código apenas por ter sido auditado.
4. Para as correcções aprovadas, preservar os testes existentes e comparar os resultados antes e depois; rejeitar regressões.
`),
  'forge-hygiene': skill('forge-hygiene', 'Identificar código, ficheiros e dependências potencialmente mortos ou obsoletos sem remover componentes válidos.', `
Finalidade: manter o projecto simples, actualizado e organizado, com recomendações sustentadas por evidência e baixo risco de falsos positivos. Entradas: raiz do projecto, tecnologias e âmbito da revisão. Resultado: inventário priorizado de candidatos a manter, consolidar, actualizar ou remover.
Utilizar em auditorias de repositório, revisões de dívida técnica e pedidos de limpeza. Limitar a análise à raiz do projecto e aos artefactos que lhe pertencem; só ler material externo quando o utilizador o indicar expressamente e nunca o tratar como destino para alterações do projecto.
1. Confirmar a raiz do projecto (pasta explicitamente indicada ou raiz Git) e registar o âmbito. Antes de qualquer escrita, cópia ou eliminação, resolver o caminho e confirmar que permanece dentro da raiz; rejeitar caminhos absolutos externos, traversal e ligações simbólicas que escapem da raiz. Guardar relatórios e artefactos da auditoria dentro do projecto.
2. Inventariar pontos de entrada, módulos, ficheiros-fonte, testes, configurações, scripts, geração de código, manifestos e ficheiros de lock. Respeitar as exclusões já configuradas (por exemplo, builds e dependências instaladas) e não varrer pastas de sistema ou outros projectos.
3. Procurar código sem referências a partir dos pontos de entrada e ficheiros aparentemente órfãos, mas verificar imports dinâmicos, reflexão, registo por convenção, plugins, comandos, APIs públicas, migrações, configuração de deploy e geração de código. A ausência de correspondências textuais não prova que o código esteja morto.
4. Avaliar dependências com o gestor de pacotes e as ferramentas próprias do ecossistema: distinguir dependências directas, transitivas, opcionais, peer, de desenvolvimento e ferramentas de build; confirmar uso em código, scripts e configuração. Separar pacotes não usados, desactualizados, vulneráveis e apenas desnecessários — são conclusões diferentes. Nunca propor actualizações incompatíveis sem analisar impacto e versão suportada.
5. Para cada candidato, apresentar caminho/linha ou pacote e versão, evidência reproduzível, motivo, impacto, confiança, risco de falsos positivos e forma segura de confirmação. Classificar como confirmado (\`EXTRACTED\`), provável (\`INFERRED\`) ou inconclusivo (\`AMBIGUOUS\`); não apresentar inferências como factos.
6. Não remover ficheiros, código ou dependências durante a auditoria. Pedir aprovação para alterações; depois, remover um candidato de cada vez, actualizar o lockfile apenas com o gestor de pacotes correcto e executar testes, build e verificações de referências relevantes. Rejeitar a alteração se surgir regressão.
Validação: cada candidato tem evidência positiva para a sua classificação e foi verificado contra os pontos de entrada e mecanismos dinâmicos relevantes; a raiz foi confirmada; todos os caminhos de saída e alteração estão dentro do projecto; as recomendações distinguem observação de inferência. Se a ferramenta de análise não estiver disponível, indicar a limitação em vez de declarar que a verificação passou.
`),
  'forge-verify': skill('forge-verify', 'Verificar critérios de aceitação, resultados de testes e prontidão antes de declarar a tarefa concluída.', `
1. Associar cada requisito obrigatório ou desejável à implementação e a um teste aprovado.
2. Executar as verificações relevantes mais restritas; alargar a suite quando a alteração o justificar.
3. Comunicar explicitamente falhas e incógnitas. Nunca declarar um teste aprovado sem consultar a respectiva saída.
4. Registar o ponto de controlo em \`.agentforge/work/state.md\`; só marcar como concluído após a aprovação exigida.
5. Encerrar cada verificação com \`PASS\`, \`FAIL\` ou \`PARTIAL\`. Usar \`PARTIAL\` apenas perante um bloqueio ambiental (ferramenta ou dependência indisponível), nunca por parecer correcto ou por incerteza; se a verificação puder ser executada, decidir entre \`PASS\` e \`FAIL\`.
6. Evitar dois erros comuns: não substituir a execução de uma verificação independente por uma leitura superficial do código ou pela declaração de quem o escreveu; não parar numa compilação aprovada sem testar os casos relevantes. Quando a afirmação o justificar, incluir um ensaio adversarial, como valores nos limites, entrada vazia ou nula, ou chamadas repetidas.
7. Cada resultado \`PASS\` ou \`FAIL\` deve indicar o comando executado e a sua saída real. Um veredicto sem comando é uma verificação omitida.
8. Perante uma falha, registar o critério e a evidência, alterar a implementação ou a configuração de teste e repetir a verificação e os testes dependentes. Permitir no máximo dois ciclos de correcção; nunca repetir código ou entradas inalterados. Se a mesma causa persistir ou o limite for atingido, parar, comunicar o bloqueio e pedir nova delimitação.
`),
  'forge-ground': skill('forge-ground', 'Confirmar tipos, APIs e convenções existentes antes de escrever código; não inventar nomes.', `
Finalidade: impedir que nomes de métodos, tipos ou convenções inventados cheguem às alterações. Entradas: ficheiros e módulos abrangidos. Resultado: factos confirmados — assinaturas e exemplos existentes — que fundamentam o código.
Utilizar antes de escrever ou alterar código não trivial; omitir apenas em alterações inequívocas de uma linha.
Passos: localizar e ler integralmente um ficheiro existente do mesmo tipo antes de criar outro; seguir uma ou duas etapas de importações para confirmar classes-base, interfaces e configuração de injecção de dependências; procurar um símbolo no repositório antes de o invocar se o nome e a assinatura ainda não tiverem sido confirmados; após duas tentativas sem resolução, parar e pedir esclarecimento em vez de adivinhar.
Validação: cada símbolo não trivial foi lido durante a tarefa ou confirmado num exemplo existente. Se um método ou tipo aparentemente plausível não existir no código, considerá-lo inventado e continuar a investigação ou pedir esclarecimento; não criar um adaptador para fingir que existe.
`),
  'forge-graph': skill('forge-graph', 'Consultar um grafo de conhecimento existente antes de ler ou pesquisar ficheiros, distinguindo factos de inferências.', `
Finalidade: encontrar estrutura e impacto pelo grafo em vez de ler o repositório inteiro, e manter o rasto de quão fiável é cada ligação. Inspirado no graphify: grafo determinístico, sem índice vectorial, com cada aresta explicada.
1. Se \`graphify-out/graph.json\` existir, ler \`graphify-out/GRAPH_REPORT.md\` e usar \`graphify query "<pergunta>"\`, \`graphify path "A" "B"\` e \`graphify explain "X"\` antes de abrir ficheiros ou pesquisar texto. Se não existir, não o gerar sem pedido: pode usar o modelo para documentos e imagens e escreve em \`graphify-out/\`; sugerir \`/graphify .\` ao utilizador.
2. Verificar se o grafo está desactualizado (data de \`graph.json\` face a \`git log\` e \`git status\`). Se estiver, avisar e tratar tudo o que dele vier como \`INFERRED\` até confirmar no código.
3. Etiquetar o que se retira do grafo: \`EXTRACTED\` (explícito na fonte; ainda assim citar ficheiro:linha), \`INFERRED\` (hipótese a confirmar a ler o código) e \`AMBIGUOUS\` (decisão humana). Uma conclusão nunca assenta apenas numa aresta \`INFERRED\`.
4. Usar a estrutura: os nós mais ligados mostram onde uma alteração tem mais impacto; \`path\` e \`explain\` delimitam o que uma alteração toca; nós isolados são apenas candidatos para \`forge-hygiene\`, nunca prova de código morto.
5. Limitar o custo: pedir subgrafos pequenos (\`--budget\`) e ler só os ficheiros que o grafo indicar.
6. Para o catálogo do próprio AgentForge (perfis, fluxos, competências, ferramentas), usar \`agentforge graph query|path|explain|report\` ou a ferramenta MCP \`agentforge_graph\`.
Validação: cada afirmação retirada do grafo indica a etiqueta de confiança e, para código, o ficheiro:linha confirmado; nenhuma recomendação depende só de arestas \`INFERRED\`.
`),
  'forge-performance': skill('forge-performance', 'Identificar estrangulamentos com impacto mensurável, sem optimizações prematuras.', `
Finalidade: analisar o desempenho de forma dirigida, sem procurar micro-optimizações sem benefício demonstrado. Entradas: percursos de código identificados como críticos ou, quando solicitado, o repositório completo. Resultado: problemas ordenados por prioridade, com ficheiro, linha, impacto estimado e correcção concreta.
Utilizar quando o fluxo exigir análise de desempenho, como numa auditoria de repositório ou investigação de defeitos.
Verificar consultas repetidas ou N+1, recolha excessiva de dados, conjuntos de resultados sem limite, alocações em ciclos intensivos, operações assíncronas bloqueadas, paralelismo sem limite, cache inexistente ou obsoleta e enumeração repetida da mesma sequência.
Validação: cada observação identifica um sintoma concreto — número de consultas, local de alocação ou chamada bloqueante — e uma correcção. Não apresentar problemas sem ficheiro, linha e estimativa de impacto. Se não for possível estimar o impacto, classificar como oportunidade de melhoria, não como problema crítico.
`),
  'forge-tradeoff': skill('forge-tradeoff', 'Comparar opções com critérios definidos previamente e registar a decisão e o risco aceite.', `
Finalidade: transformar uma necessidade de negócio ou escolha técnica numa decisão fundamentada, não numa preferência narrativa. Entradas: decisão a tomar, responsável pela aprovação, restrições reais e opções possíveis. Resultado: comparação, recomendação e registo da decisão.
Utilizar quando existam várias opções viáveis ou quando seja dispendioso reverter a escolha. Não reabrir uma decisão aprovada sem evidência nova.
Passos: declarar o resultado pretendido, não apenas a solução já sugerida — a primeira opção mencionada por alguém é uma hipótese, não um requisito; enumerar as opções e incluir sempre a possibilidade de manter a situação actual; definir critérios e ponderações **antes** de pontuar; avaliar com base em evidência e identificar como estimativa qualquer valor sem fonte; registar custo, esforço, risco, reversibilidade e dependência do fornecedor de cada opção; recomendar uma opção, indicar o risco aceite e a evidência que poderia alterar a recomendação; documentar em \`.agentforge/templates/decision-record.md\`.
Validação: critérios definidos antes da pontuação; situação actual avaliada; todos os valores associados a fontes ou identificados como estimativas; risco aceite explicitado.
Se a evidência não permitir distinguir as opções, indicar os dados em falta e a forma menos dispendiosa de os obter. Não ordenar opções com confiança injustificada nem inventar preços, comparações ou capacidades de fornecedores.
`),
  'forge-spike': skill('forge-spike', 'Responder a uma pergunta técnica com uma experiência delimitada e uma conclusão, não uma opinião.', `
Finalidade: decidir, com evidência produzida na experiência, se vale a pena adoptar uma tecnologia, biblioteca, modelo ou padrão. Entradas: pergunta, decisão que depende da resposta e limite de tempo. Resultado: evidência, conclusão e possível lição.
Utilizar antes de adoptar uma tecnologia nova. Não contornar o fluxo de desenvolvimento aprovado nem integrar código experimental em produção sem revisão.
Passos: escrever primeiro a pergunta e o critério de decisão, para evitar justificar a conclusão retrospectivamente; fixar o tempo e o que fica fora do âmbito; verificar o que já existe no projeto e consultar fontes actuais antes de começar; executar a experiência real mais pequena possível e registar versões, comandos e saídas, incluindo falhas; concluir com uma decisão — adoptar, experimentar, avaliar ou abandonar — e a respectiva justificação.
Validação: a conclusão cita uma experiência efectivamente executada e as versões utilizadas; resultados negativos são comunicados; o código descartável é identificado para remoção ou integração sujeita a revisão.
Se o tempo terminar sem resposta, usar a conclusão \`assess\` (avaliar), indicar o que foi aprendido e as incógnitas. Não prolongar o prazo sem aprovação, não inferir resultados apenas pela documentação e nunca apresentar um exemplo de tutorial como medição própria.
`),
  'forge-routing': skill('forge-routing', 'Classificar pedidos por complexidade e custo antes de recomendar modelos ou subagentes.', `
1. Ler \`.agentforge/MODEL_ROUTING.md\` antes de recomendar um modelo; classificar cada tarefa, não a conversa inteira.
2. Preferir um modelo de raciocínio avançado para decisões ambíguas, arquitecturais ou de risco elevado. Utilizar o perfil económico apenas em tarefas delimitadas, aprovadas e de baixo risco.
3. Consultar os identificadores de modelo configurados em \`.agentforge/work/model-profiles.json\`. Se não houver mapeamento, comunicar essa ausência e usar o modelo predefinido pelo host; nunca afirmar que foi escolhido um modelo mais económico.
4. Considerar como únicas etapas paralelas as declaradas em \`plan.coordination.parallelGroups\`; cada responsável associa um passo numerado a partir de 1 a um papel especializado e às respectivas competências. Delegar apenas trabalho independente e delimitado, e apenas se o CLI suportar subagentes. Caso contrário, executar sequencialmente.
5. Atribuir um único responsável por ficheiro, respeitar o limite \`maxConcurrentAgents\` e nunca permitir que um agente delegado volte a delegar. O orquestrador conserva as aprovações, integra resultados, verifica evidência e escala quando surgir complexidade inesperada.
`),
  'forge-context': skill('forge-context', 'Manter o contexto do projeto conciso entre sessões e propor lições fundamentadas, com âmbito definido.', `
1. Ler \`.agentforge/CONTEXT_LEARNING.md\`; começar pelo estado e pelo resumo activo, não por transcrições antigas.
2. Recuperar apenas lições aprovadas e relevantes para a tarefa. Utilizar \`agentforge context --topic "<tema>" --budget-tokens 1200\`; o limite predefinido é 1200 tokens estimados e o CLI comunica omissões em vez de truncar lições silenciosamente. A estimativa, baseada em caracteres divididos por quatro, não representa a facturação nem a contagem real de um tokenizador.
3. Depois de uma fase relevante, substituir o resumo activo por uma versão concisa que indique objectivo, decisões, evidência, bloqueios e próxima acção.
4. Após trabalho verificado, consultar \`agentforge insights\` para rever indicadores de execução e códigos de erro repetidos; propor apenas lições concretas e sustentadas por evidência e obter revisão humana antes de as reutilizar.
5. Classificar cada lição pelo âmbito: \`project\` para aspectos ligados a ficheiros, estrutura ou nomenclatura deste projeto (predefinição); \`reusable\` apenas se puder ajudar noutro projeto e identificar a tecnologia e versão aplicáveis através de \`--anchor\`. Uma lição que só faça sentido neste projeto não é reutilizável.
6. Uma proposta reutilizável tem de descrever um resultado que funcionou — não uma tentativa falhada nem um contorno —, aplicar-se para além deste espaço de trabalho, ser útil numa tarefa futura e caber em poucas frases. Lições sobre comportamentos de linguagens, bibliotecas ou ferramentas têm de indicar a versão principal no texto; sem essa versão, não devem ser propostas.
`),
  'forge-research': skill('forge-research', 'Investigar código, documentos e fontes externas com referências verificáveis.', `
Finalidade: investigação fundamentada em fontes, reutilizável por todos os perfis. Entradas: pergunta e fontes acessíveis. Resultado: síntese de evidência e incertezas.
Utilizar quando faltarem evidências; não repetir apenas um plano já aprovado.
Ferramentas: ficheiros locais; pesquisa na Web apenas se o host a disponibilizar e autorizar. Confirmar a ferramenta antes de a utilizar; nunca inventar um conector.
Passos: identificar a pergunta; consultar fontes relevantes quando necessário; registar o caminho e a linha ou o endereço e a data; comparar fontes em conflito; identificar claramente inferências.
Validação: cada afirmação factual remete para uma fonte. Se uma fonte estiver inacessível ou não puder ser verificada, comunicá-lo em vez de adivinhar.
Exemplo: comparar opções de implementação através de alternativas citadas e respectivas limitações.
`),
  'forge-fact-check': skill('forge-fact-check', 'Verificar afirmações e referências em textos editoriais, académicos, técnicos e relatórios de incidentes.', `
Finalidade: distinguir evidência, opinião e inferência. Entradas: texto a rever e fontes primárias acessíveis. Resultado: veredicto para cada afirmação.
Utilizar para afirmações destinadas a publicação; esta competência não substitui o acesso autorizado às fontes.
Ferramentas: ficheiros ou pesquisa na Web, quando disponibilizada pelo host; não presumir acesso a um navegador.
Passos: identificar afirmações; confirmar cada uma através do endereço, DOI ou caminho e linha da fonte; assinalar fontes desactualizadas ou contraditórias; identificar afirmações ainda não confirmadas.
Validação: cada afirmação verificada tem evidência consultável. Nunca inventar referências bibliográficas, citações ou resultados de testes.
Se uma afirmação não puder ser verificada, identificá-la como não confirmada, pedir uma fonte ou removê-la. Um DOI desconhecido não deve ser substituído por uma referência apenas plausível.
`)
};
