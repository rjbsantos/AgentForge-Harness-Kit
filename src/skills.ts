import { domainSkills } from './skills-domain.js';

const skill = (name: string, description: string, body: string): string =>
  `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\n${body.trim()}\n`;

export const skills: Record<string, string> = {
  'forge-requirements': skill('forge-requirements', 'Usar antes de desenvolver uma funcionalidade ou projeto, para recolher e validar requisitos e critérios de aceitação.', `
1. Perguntar qual o problema, quem será afectado e que restrições existem; distinguir requisitos de pressupostos.
2. Atribuir identificadores REQ estáveis, prioridades MoSCoW, dependências e critérios de aceitação mensuráveis.
3. Guardar a especificação acordada em \`.agentforge/work/requirements.md\`.
4. Pedir aprovação explícita antes de definir a arquitectura ou iniciar a implementação. Nunca interpretar o silêncio como aprovação.
Validação: cada REQ tem prioridade e um critério de aceitação que alguém consegue verificar; os pressupostos e os pontos em aberto estão listados; a aprovação foi dada por uma pessoa.
`),
  'forge-implementation': skill('forge-implementation', 'Usar para implementar alterações já aprovadas, com testes primeiro, reutilização antes de código novo e passagem para revisão.', `
1. Ler \`.agentforge/work/state.md\` e os requisitos aprovados. Parar se faltarem dados necessários ou houver um bloqueio.
2. Confirmar a raiz do projecto: usar a pasta explicitamente indicada ou a raiz Git. Criar e alterar ficheiros do projecto apenas sob essa raiz; resolver e validar cada caminho antes de escrever, copiar ou eliminar. Se um destino sair da raiz ou atravessar uma ligação simbólica para fora, parar e pedir orientação. Não mover ficheiros externos nem criar cópias do projecto noutras pastas.
3. Antes de escrever código novo, subir esta escada e parar no primeiro degrau que resolve: não fazer (a necessidade é real?), reutilizar código existente do projecto, usar a biblioteca-padrão ou a funcionalidade nativa da plataforma, usar uma dependência já instalada; só depois escrever código novo, o mais curto que cumpre os critérios. Não acrescentar abstracções, opções ou dependências que nenhum requisito aprovado peça.
4. Antes de alterar código, criar um ramo de trabalho próprio com autorização (nunca implementar nem fazer commits directamente no ramo principal); se o repositório ainda não tem ramo principal, fazer primeiro o commit inicial e só depois criar o ramo. Preparar um plano breve com caminhos dos ficheiros, testes e dependências. Marcar como paralelas apenas tarefas de leitura realmente independentes; atribuir um único responsável de escrita por ficheiro. Pedir aprovação para decisões com impacto.
5. Escrever um teste que falhe para cada critério de aceitação, aplicar a correcção mínima e refactorizar mantendo os testes aprovados.
6. Passar o trabalho para revisão e controlo de qualidade; limitar os ciclos de correcção e nova verificação e registar evidência, não afirmações, no ficheiro de estado.
7. Nunca efectuar automaticamente uma submissão, integração ou distribuição paralela de alterações aos mesmos ficheiros.
Validação: o trabalho está num ramo próprio e não no principal; cada critério de aceitação tem um teste que falhava antes e passa agora, com a saída real; só foram tocados ficheiros dentro da raiz; nada foi publicado sem autorização.
`),
  'forge-audit': skill('forge-audit', 'Usar para auditar código existente com evidência (ficheiro, linha e confiança) e propor correcções para aprovação.', `
1. Mapear os pontos de entrada e o comportamento a partir do código real; identificar as áreas não inspeccionadas.
2. Apresentar problemas potenciais com ficheiro e linha, impacto, esforço e risco de regressão, e etiquetar cada um com a confiança: \`EXTRACTED\` (visto directamente no código, com ficheiro:linha), \`INFERRED\` (deduzido; indicar de onde) ou \`AMBIGUOUS\` (precisa de decisão humana). Nunca tratar um \`INFERRED\` como facto.
3. Perguntar quais os problemas a corrigir. Não alterar código apenas por ter sido auditado.
4. Para as correcções aprovadas, preservar os testes existentes e comparar os resultados antes e depois; rejeitar regressões.
Validação: cada achado tem ficheiro:linha, etiqueta de confiança e impacto; as áreas não inspeccionadas estão indicadas; nenhuma alteração foi feita sem aprovação.
`),
  'forge-hygiene': skill('forge-hygiene', 'Usar em auditorias e pedidos de limpeza para identificar código, ficheiros e dependências potencialmente mortos ou obsoletos, sem remover componentes válidos.', `
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
  'forge-verify': skill('forge-verify', 'Usar antes de declarar uma tarefa concluída, para verificar critérios de aceitação e testes com saída real (PASS, FAIL ou PARTIAL).', `
1. Associar cada requisito obrigatório ou desejável à implementação e a um teste aprovado.
2. Executar as verificações relevantes mais restritas; alargar a suite quando a alteração o justificar.
3. Comunicar explicitamente falhas e incógnitas. Nunca declarar um teste aprovado sem consultar a respectiva saída.
4. Registar o ponto de controlo em \`.agentforge/work/state.md\`; só marcar como concluído após a aprovação exigida.
5. Encerrar cada verificação com \`PASS\`, \`FAIL\` ou \`PARTIAL\`. Usar \`PARTIAL\` apenas perante um bloqueio ambiental (ferramenta ou dependência indisponível), nunca por parecer correcto ou por incerteza; se a verificação puder ser executada, decidir entre \`PASS\` e \`FAIL\`.
6. Evitar dois erros comuns: não substituir a execução de uma verificação independente por uma leitura superficial do código ou pela declaração de quem o escreveu; não parar numa compilação aprovada sem testar os casos relevantes. Quando a afirmação o justificar, incluir um ensaio adversarial, como valores nos limites, entrada vazia ou nula, ou chamadas repetidas.
7. Cada resultado \`PASS\` ou \`FAIL\` deve indicar o comando executado e a sua saída real. Um veredicto sem comando é uma verificação omitida.
8. Perante uma falha, registar o critério e a evidência, alterar a implementação ou a configuração de teste e repetir a verificação e os testes dependentes. Permitir no máximo dois ciclos de correcção; nunca repetir código ou entradas inalterados. Se a mesma causa persistir ou o limite for atingido, parar, comunicar o bloqueio e pedir nova delimitação.
Validação: cada critério tem um veredicto com o comando e a saída reais; as falhas e as incógnitas estão listadas; o ponto de controlo ficou registado em \`.agentforge/work/state.md\`.
`),
  'forge-ground': skill('forge-ground', 'Usar antes de escrever ou alterar código não trivial, para confirmar tipos, APIs e convenções existentes; não inventar nomes.', `
Finalidade: impedir que nomes de métodos, tipos ou convenções inventados cheguem às alterações. Entradas: ficheiros e módulos abrangidos. Resultado: factos confirmados — assinaturas e exemplos existentes — que fundamentam o código.
Utilizar antes de escrever ou alterar código não trivial; omitir apenas em alterações inequívocas de uma linha.
Passos: localizar e ler integralmente um ficheiro existente do mesmo tipo antes de criar outro; seguir uma ou duas etapas de importações para confirmar classes-base, interfaces e configuração de injecção de dependências; procurar um símbolo no repositório antes de o invocar se o nome e a assinatura ainda não tiverem sido confirmados; após duas tentativas sem resolução, parar e pedir esclarecimento em vez de adivinhar.
Validação: cada símbolo não trivial foi lido durante a tarefa ou confirmado num exemplo existente. Se um método ou tipo aparentemente plausível não existir no código, considerá-lo inventado e continuar a investigação ou pedir esclarecimento; não criar um adaptador para fingir que existe.
`),
  'forge-graph': skill('forge-graph', 'Usar quando existir graphify-out/, antes de ler ou pesquisar ficheiros, para consultar o grafo e distinguir factos de inferências.', `
Finalidade: encontrar estrutura e impacto pelo grafo em vez de ler o repositório inteiro, e manter o rasto de quão fiável é cada ligação. Inspirado no graphify: grafo determinístico, sem índice vectorial, com cada aresta explicada.
1. Se \`graphify-out/graph.json\` existir, ler \`graphify-out/GRAPH_REPORT.md\` e usar \`graphify query "<pergunta>"\`, \`graphify path "A" "B"\` e \`graphify explain "X"\` antes de abrir ficheiros ou pesquisar texto. Se não existir, não o gerar sem pedido: pode usar o modelo para documentos e imagens e escreve em \`graphify-out/\`; sugerir \`/graphify .\` ao utilizador.
2. Verificar se o grafo está desactualizado (data de \`graph.json\` face a \`git log\` e \`git status\`). Se estiver, avisar e tratar tudo o que dele vier como \`INFERRED\` até confirmar no código.
3. Etiquetar o que se retira do grafo: \`EXTRACTED\` (explícito na fonte; ainda assim citar ficheiro:linha), \`INFERRED\` (hipótese a confirmar a ler o código) e \`AMBIGUOUS\` (decisão humana). Uma conclusão nunca assenta apenas numa aresta \`INFERRED\`.
4. Usar a estrutura: os nós mais ligados mostram onde uma alteração tem mais impacto; \`path\` e \`explain\` delimitam o que uma alteração toca; nós isolados são apenas candidatos para \`forge-hygiene\`, nunca prova de código morto.
5. Limitar o custo: pedir subgrafos pequenos (\`--budget\`) e ler só os ficheiros que o grafo indicar.
6. Para o catálogo do próprio AgentForge (perfis, fluxos, competências, ferramentas), usar \`agentforge graph query|path|explain|report\` ou a ferramenta MCP \`agentforge_graph\`.
Validação: cada afirmação retirada do grafo indica a etiqueta de confiança e, para código, o ficheiro:linha confirmado; nenhuma recomendação depende só de arestas \`INFERRED\`.
`),
  'forge-performance': skill('forge-performance', 'Usar quando o fluxo pedir análise de desempenho, para identificar estrangulamentos com impacto mensurável, sem optimizações prematuras.', `
Finalidade: analisar o desempenho de forma dirigida, sem procurar micro-optimizações sem benefício demonstrado. Entradas: percursos de código identificados como críticos ou, quando solicitado, o repositório completo. Resultado: problemas ordenados por prioridade, com ficheiro, linha, impacto estimado e correcção concreta.
Utilizar quando o fluxo exigir análise de desempenho, como numa auditoria de repositório ou investigação de defeitos.
Verificar consultas repetidas ou N+1, recolha excessiva de dados, conjuntos de resultados sem limite, alocações em ciclos intensivos, operações assíncronas bloqueadas, paralelismo sem limite, cache inexistente ou obsoleta e enumeração repetida da mesma sequência.
Validação: cada observação identifica um sintoma concreto — número de consultas, local de alocação ou chamada bloqueante — e uma correcção. Não apresentar problemas sem ficheiro, linha e estimativa de impacto. Se não for possível estimar o impacto, classificar como oportunidade de melhoria, não como problema crítico.
`),
  'forge-tradeoff': skill('forge-tradeoff', 'Usar quando existirem várias opções viáveis ou uma escolha cara de reverter, para comparar com critérios definidos antes e registar a decisão.', `
Finalidade: transformar uma necessidade de negócio ou escolha técnica numa decisão fundamentada, não numa preferência narrativa. Entradas: decisão a tomar, responsável pela aprovação, restrições reais e opções possíveis. Resultado: comparação, recomendação e registo da decisão.
Utilizar quando existam várias opções viáveis ou quando seja dispendioso reverter a escolha. Não reabrir uma decisão aprovada sem evidência nova.
Passos: declarar o resultado pretendido, não apenas a solução já sugerida — a primeira opção mencionada por alguém é uma hipótese, não um requisito; enumerar as opções e incluir sempre a possibilidade de manter a situação actual; definir critérios e ponderações **antes** de pontuar; avaliar com base em evidência e identificar como estimativa qualquer valor sem fonte; registar custo, esforço, risco, reversibilidade e dependência do fornecedor de cada opção; recomendar uma opção, indicar o risco aceite e a evidência que poderia alterar a recomendação; documentar em \`.agentforge/templates/decision-record.md\`.
Validação: critérios definidos antes da pontuação; situação actual avaliada; todos os valores associados a fontes ou identificados como estimativas; risco aceite explicitado.
Se a evidência não permitir distinguir as opções, indicar os dados em falta e a forma menos dispendiosa de os obter. Não ordenar opções com confiança injustificada nem inventar preços, comparações ou capacidades de fornecedores.
`),
  'forge-spike': skill('forge-spike', 'Usar antes de adoptar uma tecnologia nova, para responder a uma pergunta técnica com uma experiência delimitada e uma conclusão.', `
Finalidade: decidir, com evidência produzida na experiência, se vale a pena adoptar uma tecnologia, biblioteca, modelo ou padrão. Entradas: pergunta, decisão que depende da resposta e limite de tempo. Resultado: evidência, conclusão e possível lição.
Utilizar antes de adoptar uma tecnologia nova. Não contornar o fluxo de desenvolvimento aprovado nem integrar código experimental em produção sem revisão.
Passos: escrever primeiro a pergunta e o critério de decisão, para evitar justificar a conclusão retrospectivamente; fixar o tempo e o que fica fora do âmbito; verificar o que já existe no projeto e consultar fontes actuais antes de começar; executar a experiência real mais pequena possível e registar versões, comandos e saídas, incluindo falhas; concluir com uma decisão — adoptar, experimentar, avaliar ou abandonar — e a respectiva justificação.
Validação: a conclusão cita uma experiência efectivamente executada e as versões utilizadas; resultados negativos são comunicados; o código descartável é identificado para remoção ou integração sujeita a revisão.
Se o tempo terminar sem resposta, usar a conclusão \`assess\` (avaliar), indicar o que foi aprendido e as incógnitas. Não prolongar o prazo sem aprovação, não inferir resultados apenas pela documentação e nunca apresentar um exemplo de tutorial como medição própria.
`),
  'forge-routing': skill('forge-routing', 'Usar no início de cada tarefa nova, para classificar a complexidade e o custo antes de recomendar modelos ou subagentes.', `
1. Ler \`.agentforge/MODEL_ROUTING.md\` antes de recomendar um modelo; classificar cada tarefa, não a conversa inteira.
2. Preferir um modelo de raciocínio avançado para decisões ambíguas, arquitecturais ou de risco elevado. Utilizar o perfil económico apenas em tarefas delimitadas, aprovadas e de baixo risco.
3. Consultar os identificadores de modelo configurados em \`.agentforge/work/model-profiles.json\`. Se não houver mapeamento, comunicar essa ausência e usar o modelo predefinido pelo host; nunca afirmar que foi escolhido um modelo mais económico.
4. Considerar como únicas etapas paralelas as declaradas em \`plan.coordination.parallelGroups\`; cada responsável associa um passo numerado a partir de 1 a um papel especializado e às respectivas competências. Delegar apenas trabalho independente e delimitado, e apenas se o CLI suportar subagentes. Caso contrário, executar sequencialmente.
5. Atribuir um único responsável por ficheiro, respeitar o limite \`maxConcurrentAgents\` e nunca permitir que um agente delegado volte a delegar. O orquestrador conserva as aprovações, integra resultados, verifica evidência e escala quando surgir complexidade inesperada.
Validação: a recomendação indica a classificação, o modelo configurado (ou a ausência de mapeamento) e se a delegação é possível neste CLI; nenhum modelo é dado como escolhido sem o ser.
`),
  'forge-context': skill('forge-context', 'Usar ao retomar ou encerrar uma fase de trabalho, para manter o contexto conciso e propor lições fundamentadas com âmbito definido.', `
1. Ler \`.agentforge/CONTEXT_LEARNING.md\`; começar pelo estado e pelo resumo activo, não por transcrições antigas.
2. Recuperar apenas lições aprovadas e relevantes para a tarefa. Utilizar \`agentforge context --topic "<tema>" --budget-tokens 1200\`; o limite predefinido é 1200 tokens estimados e o CLI comunica omissões em vez de truncar lições silenciosamente. A estimativa, baseada em caracteres divididos por quatro, não representa a facturação nem a contagem real de um tokenizador.
3. Depois de uma fase relevante, substituir o resumo activo por uma versão concisa que indique objectivo, decisões, evidência, bloqueios e próxima acção.
4. Após trabalho verificado, consultar \`agentforge insights\` para rever indicadores de execução e códigos de erro repetidos; propor apenas lições concretas e sustentadas por evidência e obter revisão humana antes de as reutilizar.
5. Classificar cada lição pelo âmbito: \`project\` para aspectos ligados a ficheiros, estrutura ou nomenclatura deste projeto (predefinição); \`reusable\` apenas se puder ajudar noutro projeto e identificar a tecnologia e versão aplicáveis através de \`--anchor\`. Uma lição que só faça sentido neste projeto não é reutilizável.
6. Uma proposta reutilizável tem de descrever um resultado que funcionou — não uma tentativa falhada nem um contorno —, aplicar-se para além deste espaço de trabalho, ser útil numa tarefa futura e caber em poucas frases. Lições sobre comportamentos de linguagens, bibliotecas ou ferramentas têm de indicar a versão principal no texto; sem essa versão, não devem ser propostas.
Validação: o contexto carregado coube no orçamento; cada lição proposta tem evidência, âmbito e, se for reutilizável, tecnologia e versão; nenhuma lição foi aprovada sem uma pessoa.
`),
  'forge-research': skill('forge-research', 'Usar quando faltarem evidências, para investigar código, documentos e fontes externas com referências verificáveis.', `
Finalidade: investigação fundamentada em fontes, reutilizável por todos os perfis. Entradas: pergunta e fontes acessíveis. Resultado: síntese de evidência e incertezas.
Utilizar quando faltarem evidências; não repetir apenas um plano já aprovado.
Ferramentas: ficheiros locais; pesquisa na Web apenas se o host a disponibilizar e autorizar. Confirmar a ferramenta antes de a utilizar; nunca inventar um conector.
Passos: identificar a pergunta; consultar fontes relevantes quando necessário; registar o caminho e a linha ou o endereço e a data; comparar fontes em conflito; identificar claramente inferências.
Validação: cada afirmação factual remete para uma fonte. Se uma fonte estiver inacessível ou não puder ser verificada, comunicá-lo em vez de adivinhar.
Exemplo: comparar opções de implementação através de alternativas citadas e respectivas limitações.
`),
  'forge-fact-check': skill('forge-fact-check', 'Usar em textos destinados a publicação ou entrega, para verificar afirmações e referências (editoriais, académicos, técnicos e de incidentes).', `
Finalidade: distinguir evidência, opinião e inferência. Entradas: texto a rever e fontes primárias acessíveis. Resultado: veredicto para cada afirmação.
Utilizar para afirmações destinadas a publicação; esta competência não substitui o acesso autorizado às fontes.
Ferramentas: ficheiros ou pesquisa na Web, quando disponibilizada pelo host; não presumir acesso a um navegador.
Passos: identificar afirmações; confirmar cada uma através do endereço, DOI ou caminho e linha da fonte; assinalar fontes desactualizadas ou contraditórias; identificar afirmações ainda não confirmadas.
Validação: cada afirmação verificada tem evidência consultável. Nunca inventar referências bibliográficas, citações ou resultados de testes.
Se uma afirmação não puder ser verificada, identificá-la como não confirmada, pedir uma fonte ou removê-la. Um DOI desconhecido não deve ser substituído por uma referência apenas plausível.
`),
  'forge-debug': skill('forge-debug', 'Usar perante um erro, falha de teste ou comportamento inesperado, para investigar a causa-raiz com uma hipótese de cada vez antes de corrigir.', `
Finalidade: impedir correcções por tentativa e erro. Entradas: sintoma, erro ou comportamento inesperado. Resultado: causa-raiz demonstrada e teste de regressão.
1. Reproduzir a falha de forma fiável **executando** um comando e registar o comando e a saída reais. Ler o código ou calcular à mão não é reproduzir: nesse caso escrever «não reproduzido», marcar a causa como \`INFERRED\` e executar a reprodução antes de propor a correcção. Sem forma de executar, dizê-lo e pedir os dados em falta em vez de adivinhar.
2. Ler a mensagem de erro e o rasto de chamadas completos; verificar o que mudou recentemente (\`git log\`, \`git diff\`, dependências, configuração).
3. Em sistemas com várias camadas, observar os dados em cada fronteira para localizar a camada onde o valor deixa de estar correcto.
4. Formular uma hipótese única e escrita («a causa é X porque Y»), alterar uma só variável para a testar e comparar com o resultado esperado. Rejeitar a hipótese se a evidência não a confirmar; não acumular alterações.
5. Corrigir a causa, não o sintoma: escrever primeiro o teste que falha, aplicar a correcção mínima e repetir a reprodução original.
6. Após três hipóteses refutadas, parar e questionar a arquitectura ou o pressuposto com o utilizador, em vez de tentar uma quarta correcção.
Validação: a falha foi reproduzida por execução (não por cálculo), a causa está classificada (\`EXTRACTED\`, \`INFERRED\` ou \`AMBIGUOUS\`), existe um teste de regressão que falhava antes e passa agora, e a reprodução original deixou de falhar com saída real.
`),
  'forge-prose': skill('forge-prose', 'Usar ao rever ou polir um texto em português europeu, para remover marcas de escrita genérica sem alterar factos, números nem citações.', `
Finalidade: texto claro e com voz própria, sem os vícios típicos de texto gerado. Entradas: texto e público. Resultado: versão revista e lista das alterações.
1. Procurar: abertura e fecho que só repetem o pedido; elogios e fórmulas de cortesia; vocabulário inflacionado («crucial», «paisagem», «fascinante»); listas de três por reflexo; paralelismos «não só… mas também»; negrito e travessões em excesso; conclusões que resumem o que acabou de ser dito; hesitações em série.
2. Preferir frases concretas, verbos directos, a voz da pessoa autora e o registo do público. Escrever em português europeu (pt-PT), não em português do Brasil.
3. Nunca alterar factos, números, nomes, citações ou referências. Se uma frase só soar bem por ser vaga, assinalar a falta de conteúdo em vez de a disfarçar.
4. Entregar o texto revisado e, à parte, as alterações de substância, para a pessoa autora decidir. Em trabalhos académicos, o texto continua a ser da pessoa autora: sugerir, não reescrever por inteiro.
Validação: factos, números e citações iguais aos do original; cada alteração de substância está indicada; nenhuma afirmação nova foi introduzida.
`),
  'forge-checkpoint': skill('forge-checkpoint', 'Usar no fim de uma fase com artefactos que uma pessoa tem de aprovar (requisitos, arquitectura, plano), para registar o ponto de validação humana e bloquear a passagem até haver aprovação.', `
Finalidade: nenhuma fase avança sem aprovação humana explícita. Entradas: fase concluída e artefactos produzidos. Resultado: registo do ponto de validação com o veredicto.
1. Distinguir dois níveis: N1 (passagem entre fases, aprovada por quem decide o produto e quem decide a técnica) e N2 (acção destrutiva ou difícil de reverter, como voltar atrás, saltar uma fase ou eliminar ficheiros, com justificação escrita).
2. Listar os artefactos a validar com o caminho exacto e os critérios de aprovação verificáveis (por exemplo: todos os requisitos obrigatórios têm critério de aceitação; cada requisito obrigatório tem componente).
3. Apresentar os artefactos e os critérios e pedir uma resposta explícita: APROVADO, REJEITADO ou APROVADO COM CONDIÇÕES. Silêncio, ou um «parece bem» sobre outro assunto, não é aprovação.
4. Guardar o registo em \`.agentforge/work/checkpoints/CP-NNN.md\` (fase, artefactos, critérios, aprovadores confirmados, veredicto, condições, data) e actualizar o estado. Em REJEITADO, devolver à fase com as razões; não avançar.
Validação: existe um registo CP-NNN com aprovadores identificados e veredicto dado por uma pessoa; a fase seguinte só começou depois de APROVADO.
`),
  'forge-plan': skill('forge-plan', 'Usar depois de a arquitectura estar aprovada e antes de implementar, para decompor o trabalho em tarefas pequenas, verificáveis e ordenadas por dependência.', `
Finalidade: um plano que outra pessoa ou agente consegue executar sem adivinhar. Entradas: requisitos e arquitectura aprovados. Resultado: \`.agentforge/work/plan.md\`.
1. Decompor em tarefas de poucos minutos, cada uma com: requisitos que cobre (REQ), ficheiros exactos a criar ou alterar, o teste que a verifica e o comando que o executa, e as dependências de outras tarefas.
2. Cada tarefa deve ser possível de verificar sozinha; dividir as que misturam várias responsabilidades. Aplicar a escada «reutilizar antes de escrever» de \`forge-implementation\` ao planear.
3. Garantir que cada requisito obrigatório aparece em pelo menos uma tarefa e que cada tarefa aponta para um requisito; sinalizar tarefas sem requisito como possível excesso de âmbito.
4. Apresentar o plano por blocos pequenos (cinco a sete tarefas) e passar por \`forge-checkpoint\` antes de implementar.
Validação: a tabela requisito → tarefa não tem lacunas nem tarefas órfãs; cada tarefa tem ficheiros, teste e comando; o plano foi aprovado por uma pessoa.
`),
  'forge-security': skill('forge-security', 'Usar antes de dar uma alteração por concluída e em qualquer mudança que toque autenticação, dados sensíveis, entradas externas ou dependências, para aplicar um controlo de segurança que bloqueia a passagem em caso de risco grave.', `
Finalidade: um controlo de segurança com critério de passagem claro. Entradas: alterações ou projecto e a lista de áreas de risco. Resultado: relatório por gravidade e decisão de passar ou bloquear.
1. Procurar segredos no código e no histórico acessível (indicar só ficheiro e linha, nunca o valor), configurações por omissão inseguras e validação em falta nas fronteiras de entrada.
2. Rever as áreas de risco aplicáveis: injecção (SQL, comandos), XSS, CSRF, autenticação e sessões, autorização, exposição de dados e registo de dados sensíveis.
3. Dependências: pedir ao orquestrador a saída real da ferramenta de auditoria do ecossistema (por exemplo \`npm audit\`) quando o papel não tem acesso a comandos, e registar as vulnerabilidades conhecidas com a versão afectada.
4. Classificar cada achado como Crítico, Elevado, Médio ou Baixo, com ficheiro:linha e confiança (\`EXTRACTED\`, \`INFERRED\`, \`AMBIGUOUS\`). Crítico e Elevado bloqueiam: o trabalho volta à implementação. Médio e Baixo ficam registados com dono e prazo.
Validação: cada achado tem gravidade, ficheiro:linha, confiança e medida correctiva; nenhum segredo foi copiado para o relatório; a decisão de passar ou bloquear está escrita e os achados Crítico e Elevado estão fechados ou bloqueiam.
`),
  'forge-docs': skill('forge-docs', 'Usar ao produzir ou actualizar documentação funcional ou técnica de um sistema existente, para que cada afirmação resulte do código lido e não de suposições.', `
Finalidade: documentação alinhada com o código real. Entradas: mapa do sistema (de \`forge-research\`, \`forge-graph\` ou do \`reverse-engineer\`) e o público. Resultado: documentos de negócio e técnicos com evidência.
1. Separar os dois públicos: a documentação funcional descreve o que o sistema faz para o negócio (processos, regras, perfis, fluxos); a técnica descreve como está construído (módulos, interfaces, dados, configuração, execução e testes).
2. Descrever só o que foi lido no código: citar o ficheiro (e a linha, quando útil) de cada regra ou comportamento. Distinguir comportamento observado (\`EXTRACTED\`) de intenção deduzida (\`INFERRED\`) e listar o que ficou por perceber (\`AMBIGUOUS\`) em vez de o preencher.
3. Não documentar o que o código não faz nem copiar para a documentação segredos ou valores de configuração reais.
4. Antes de dar por concluída, comparar uma amostra de afirmações com o código e pedir a validação de uma pessoa que conheça o domínio.
Validação: cada regra ou comportamento tem referência ao código; o que foi inferido ou ficou por perceber está assinalado; uma amostra foi comparada com o código e a documentação foi validada por uma pessoa.
`),
  'forge-infra': skill('forge-infra', 'Usar quando a alteração mexe em ambiente de execução, integração contínua, contentores ou scripts de arranque, para garantir um ambiente reprodutível e sem segredos no repositório.', `
Finalidade: construir e testar da mesma forma numa máquina limpa e na integração contínua. Entradas: projecto, comandos de teste e de construção. Resultado: configuração de CI e instruções de arranque verificadas.
1. Confirmar como o projecto se instala, constrói e testa (ficheiros de manifesto reais), e usar esses mesmos comandos na CI; não inventar scripts.
2. Fixar versões de ferramentas e dependências (ficheiro de bloqueio) e fazer a CI falhar se a suite falhar ou se a cobertura ficar abaixo do alvo acordado.
3. Manter segredos fora do repositório (variáveis de ambiente ou gestor de segredos) e fornecer um ficheiro de exemplo sem valores reais.
4. Alterar a infraestrutura só se a mudança a pedir; publicar, distribuir ou escrever em serviços externos exige aprovação.
Validação: o arranque, a construção e os testes foram executados a partir de um estado limpo com a saída real; a CI usa os mesmos comandos; não há segredos no repositório.
`),
  'forge-finish': skill('forge-finish', 'Usar ao terminar uma alteração num ramo (implementação, change request ou correcção), para verificar, registar o trabalho com commits de âmbito restrito e propor a integração sem fazer merge automático.', `
Finalidade: fechar o trabalho de forma rastreável e reversível. Entradas: ramo com a alteração e testes. Resultado: commits revistos, proposta de pull request e arquivo do pedido.
1. Confirmar que o trabalho corre num ramo próprio e nunca directamente no ramo principal; criar o ramo (por exemplo \`cr-NNN-titulo\` ou \`bug-NNN-titulo\`) antes de alterar código, com autorização.
2. Executar a suite completa e guardar a saída real; só avançar com tudo a passar.
3. Fazer commits com os ficheiros alterados indicados um a um, nunca \`git add -A\`; mensagens que dizem o que mudou e porquê.
4. Push e pull request apenas com autorização expressa. O merge é sempre da pessoa responsável; nunca fazer merge automático.
5. Arquivar o pedido processado (change request ou bug) num histórico numerado, com estado, data, commits, ramo e ligação do PR, e deixar o modelo vazio para o pedido seguinte.
Validação: a suite completa passou com saída real; os commits só contêm os ficheiros pretendidos; nada foi publicado nem integrado sem autorização; o pedido ficou arquivado com o número e o estado.
`),
  ...Object.fromEntries(Object.entries(domainSkills).map(([name, item]) => [name, skill(name, item.description, item.body)]))
};
