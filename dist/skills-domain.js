export const domainSkills = {
    'forge-clarify': {
        description: 'Usar no início de qualquer pedido novo ou vago, e sempre que uma decisão dependa de informação que falta, para transformar o pedido num briefing claro e fazer só as perguntas que mudam o resultado.',
        body: `
Finalidade: não construir a coisa errada nem adivinhar. Entradas: o pedido tal como foi escrito. Resultado: briefing curto com objectivo, âmbito, restrições e critérios de sucesso.
1. Reescrever o pedido como um briefing: objectivo (o resultado, não a solução), quem usa, âmbito e o que fica de fora, restrições (prazo, tecnologia, dados, orçamento) e como se saberá que está feito.
2. Procurar primeiro a resposta no projecto (ficheiros de manifesto, estado, código, documentação). Só perguntar o que não se consegue descobrir lá.
3. Perguntar apenas o que muda o resultado, **nunca mais de quatro perguntas por mensagem, cada uma com uma só decisão (sem subperguntas nem alíneas escondidas)**: uma de cada vez quando as respostas dependem umas das outras, ou um grupo de até quatro quando são independentes. Se houver mais dúvidas, ficar com as quatro que mais mudam o resultado, assumir o predefinido nas restantes e listá-las como pressupostos para a pessoa confirmar. Para cada pergunta, propor uma opção recomendada e dizer o que acontece se a resposta for outra.
4. Não perguntar o que tem uma resposta convencional ou reversível: assumir o predefinido, escrevê-lo como pressuposto no briefing e seguir. Perguntar sempre antes de decisões caras de reverter (stack, modelo de dados, autenticação, publicação, custos).
5. Confirmar o briefing com a pessoa antes de avançar e guardá-lo no estado. Em respostas ambíguas, voltar a perguntar em vez de interpretar.
Validação: o briefing tem objectivo, âmbito, restrições e critério de sucesso; foram feitas no máximo quatro perguntas por mensagem, cada uma mudava o resultado e trazia uma recomendação; os pressupostos estão listados e a pessoa confirmou o briefing.
`
    },
    'forge-tdd': {
        description: 'Usar ao implementar ou corrigir comportamento em qualquer linguagem, para guiar o trabalho pelo ciclo teste que falha, código mínimo e refactorização.',
        body: `
Finalidade: o teste especifica o comportamento antes do código. Entradas: critério de aceitação ou defeito. Resultado: testes que falhavam e passam, e código mínimo.
1. RED: escrever um teste por comportamento, a partir do critério de aceitação; correr e confirmar que falha pela razão certa (não por erro de sintaxe ou de importação). Um teste que nunca falhou não prova nada.
2. GREEN: escrever o código mais simples que o faz passar, sem antecipar casos futuros.
3. REFACTOR: com tudo verde, remover duplicação e melhorar nomes; correr a suite após cada passo.
4. Testar comportamento observável, não detalhes internos. Cobrir caso normal, limites (vazio, nulo, máximo), erros e chamadas repetidas. Isolar com dobles apenas as fronteiras (rede, relógio, ficheiros, serviços externos); preferir dados reais e pequenos.
5. Testes rápidos, independentes e deterministas: sem ordem entre testes, sem dependência de hora ou de rede, sem estado partilhado.
6. Para defeitos, o teste de regressão vem primeiro e tem de reproduzir o defeito.
7. Fixar e documentar o comando exacto que corre a suite (no README ou na configuração do projecto) e correr sempre esse comando: os testes têm de passar com ele a partir de um estado limpo, não só com uma variante da linha de comandos ou a partir de uma pasta específica.
Validação: para cada comportamento existe um teste visto a falhar e depois a passar, com a saída real; a suite completa passa com o comando documentado; não há testes desactivados nem asserções vazias.
`
    },
    'forge-python': {
        description: 'Usar ao escrever, rever ou depurar código Python (.py, pyproject.toml, requirements), para aplicar boas práticas de estrutura, tipos, assincronia, erros e testes.',
        body: `
Finalidade: Python claro, tipado nas fronteiras e testável. Entradas: projecto Python e a alteração. Resultado: código que segue as convenções do projecto e passa as verificações.
1. Descobrir as convenções reais: versão do Python, gestor de dependências, ambiente virtual e as ferramentas configuradas (por exemplo pytest, ruff, mypy ou equivalentes); usar essas, não outras. Confirmar cada comando com a opção de versão antes de o usar.
2. Anotações de tipos nas fronteiras públicas (funções e classes de API, modelos de dados); validar entradas externas na fronteira (por exemplo com pydantic ou dataclasses, se o projecto os usa) e não espalhar validações pelo código interno.
3. Estrutura: módulos pequenos, sem importações circulares, sem efeitos ao importar; configuração por variáveis de ambiente ou ficheiro, nunca valores fixos nem segredos no código.
4. Erros: excepções específicas, nunca except nu nem engolir erros; mensagens com contexto; registo com logging, sem imprimir dados sensíveis.
5. Assincronia: sem chamadas bloqueantes dentro de código async; clientes e sessões de base de dados com ciclo de vida definido (por pedido ou por contexto), não partilhados globalmente de forma insegura.
6. Testes com pytest (ou o que o projecto usar) segundo forge-tdd; fixtures pequenas; sem rede nem relógio real.
Validação: os módulos compilam e a suite passa com a saída real; as ferramentas de qualidade configuradas no projecto passam; sem importações circulares, sem segredos e sem except nu.
`
    },
    'forge-dotnet': {
        description: 'Usar ao escrever, rever ou depurar código .NET (C#, .csproj, ASP.NET Core, EF Core), para aplicar boas práticas de estrutura, assincronia, injecção de dependências, dados e testes.',
        body: `
Finalidade: código .NET idiomático, seguro e testável. Entradas: solução .NET e a alteração. Resultado: código que compila sem avisos novos e passa os testes.
1. Descobrir a versão do SDK e o framework alvo nos ficheiros .csproj e global.json, o projecto de arranque e a framework de testes (por exemplo xUnit, NUnit ou MSTest); confirmar com dotnet --version e usar dotnet build e dotnet test.
2. Manter nullable reference types activos e tratar os avisos; preferir tipos imutáveis (record, init) para modelos de dados e validar nas fronteiras.
3. Injecção de dependências pelo contentor do host: registar com o tempo de vida certo (singleton, scoped, transient) e nunca capturar serviços scoped em singletons. Interfaces só onde existe mais de uma implementação ou fronteira a isolar.
4. Assincronia ponta a ponta com async e await, passando CancellationToken; nunca async void (excepto manipuladores de eventos) nem bloquear com Result ou Wait.
5. Entity Framework Core: projecções em vez de carregar entidades inteiras, evitar N+1 (Include ou projecção), AsNoTracking em leituras, migrações versionadas e revistas; parâmetros sempre, nunca SQL concatenado.
6. Configuração com opções tipadas e segredos fora do repositório (user-secrets ou gestor de segredos); registo com ILogger e modelos de mensagem, sem dados sensíveis.
7. Testes segundo forge-tdd: unitários sem rede nem base de dados real; integração com WebApplicationFactory ou contentor descartável, quando o projecto os usa.
Validação: dotnet build sem erros nem avisos novos e dotnet test a passar, com a saída real; sem async void, sem segredos no repositório e migrações revistas.
`
    },
    'forge-react': {
        description: 'Usar ao criar, rever ou depurar interfaces React e TypeScript (componentes, estado, formulários, Vite), para aplicar boas práticas de composição, estado, desempenho e testes.',
        body: `
Finalidade: interfaces previsíveis, acessíveis e testáveis. Entradas: projecto frontend e o ecrã ou componente. Resultado: componentes que cumprem o design system e passam os testes.
1. Descobrir as convenções reais: versão do React, TypeScript em modo estrito, ferramenta de construção (por exemplo Vite), biblioteca de estilos e de testes já instaladas; reutilizar componentes e hooks existentes antes de criar novos.
2. Componentes pequenos e compostos, com props tipadas; lógica reutilizável em hooks; sem estado derivado guardado em estado (calcular durante a renderização).
3. Estado: o mais local possível; estado do servidor numa biblioteca de dados (a que o projecto já usa) com cache e invalidação, não copiado para estado local; estado global só para o que várias zonas partilham de facto.
4. Efeitos só para sincronizar com sistemas externos; dependências completas; limpeza de subscrições e pedidos; chaves estáveis em listas.
5. Todo o ecrã assíncrono tem estados de carregamento, erro e vazio; formulários com validação, mensagens associadas aos campos e submissão desactivada durante o envio.
6. Estilos apenas através dos tokens do design system (forge-design-system); acessibilidade desde o início (forge-accessibility).
7. Testes por comportamento do utilizador (por exemplo com Testing Library, se instalada), segundo forge-tdd; sem testar detalhes de implementação.
Validação: a verificação de tipos, o linter configurado e os testes passam com a saída real; cada ecrã tem estados de carregamento, erro e vazio; não há cores nem espaçamentos fora dos tokens.
`
    },
    'forge-database': {
        description: 'Usar ao desenhar esquemas, escrever consultas, criar migrações ou otimizar desempenho em SQL, PostgreSQL ou MySQL, para decidir com plano de execução e medição reais.',
        body: `
Finalidade: dados correctos, consultas rápidas e alterações reversíveis. Entradas: motor e versão, esquema, consulta ou sintoma. Resultado: proposta com medição antes e depois.
1. Confirmar o motor, a versão e o ambiente; pedir o esquema real e dados representativos. Nunca otimizar sem uma medição de base (latência, linhas lidas, plano).
2. Capturar o plano de execução (EXPLAIN; EXPLAIN ANALYZE só em ambiente seguro, porque executa a consulta; no MySQL a versão tem de suportar EXPLAIN ANALYZE) e procurar: leituras completas de tabelas grandes, junções sem índice, filtros que impedem o uso de índices (funções sobre a coluna), N+1, over-fetching, transacções longas e bloqueios.
3. Desenho: tipos adequados, chaves e restrições (únicas, estrangeiras, not null) na base de dados, não só na aplicação; normalizar por omissão e desnormalizar só com medição.
4. Índices: criar para os filtros, junções e ordenações medidos; em índices compostos a ordem das colunas importa; considerar o custo de escrita e de espaço. No PostgreSQL, índices parciais, GIN para pesquisa em JSONB e texto, e CREATE INDEX CONCURRENTLY para não bloquear escritas; no MySQL (InnoDB), a chave primária é incluída em todos os índices secundários.
5. Migrações versionadas, pequenas e com reversão testada; separar alteração de esquema de migração de dados; em tabelas grandes, planear sem bloquear escritas.
6. Segurança: consultas sempre parametrizadas, privilégios mínimos, dados sensíveis cifrados ou mascarados, e amostras anonimizadas para testes. Nunca executar DDL nem EXPLAIN ANALYZE em produção sem aprovação.
7. Se a consulta tem de correr nos dois motores, testar a compatibilidade e assinalar as diferenças de sintaxe.
Validação: existe medição antes e depois, com o plano; a funcionalidade foi preservada pelos testes; a migração tem reversão testada; o custo de escrita do novo índice e a compatibilidade entre motores ficaram registados.
`
    },
    'forge-design-system': {
        description: 'Usar antes de criar ou alterar qualquer interface, para identificar o design system do projecto ou, se não existir, aplicar o design system predefinido do AgentForge, e para governar tokens e componentes.',
        body: `
Finalidade: uma interface coerente, sem valores visuais soltos. Entradas: projecto e o ecrã ou componente pretendido. Resultado: tokens e componentes únicos e documentados.
1. Identificar o design system existente por evidência: ficheiros de tokens ou tema (variáveis CSS, configuração de Tailwind, tema de uma biblioteca de componentes), pasta de componentes partilhados, guia de estilo. Se existir, é ele que manda: ler e seguir.
2. Se não existir (ou a pessoa pedir um novo), perguntar uma só vez se prefere o predefinido ou um existente noutro sítio; sem preferência, aplicar o predefinido do modelo \`.agentforge/templates/design-system-default.md\`: copiar os tokens para o projecto (por exemplo um ficheiro de variáveis CSS), registar a escolha no estado e adaptar só a cor primária à marca, se a pessoa a indicar.
3. Regras: todo o valor de cor, tipografia, espaçamento, raio, sombra e movimento vem de um token; nenhum valor fixo em componentes. Estados semânticos (sucesso, aviso, erro, informação) nunca dependem só da cor.
4. Componentes: reutilizar antes de criar; cada componente documenta variantes, estados (repouso, foco, activo, desactivado, carregamento, erro, vazio) e comportamento em ecrãs pequenos. Layout em grelha de múltiplos de 8, pontos de quebra definidos e modo claro e escuro.
5. Alterações a tokens ou a componentes partilhados são pedidos de mudança: avaliar o impacto nos ecrãs existentes e passar por forge-visual-validation.
Validação: o design system usado está identificado (existente ou predefinido) e registado; não há valores visuais fixos fora dos tokens; cada componente novo tem variantes e estados documentados.
`
    },
    'forge-accessibility': {
        description: 'Usar em qualquer alteração a interface (formulários, modais, tabelas, gráficos, navegação), para verificar acessibilidade WCAG 2.2 nível AA por teclado, semântica e contraste.',
        body: `
Finalidade: interfaces utilizáveis por todos. Entradas: ecrã ou componente alterado. Resultado: lista de problemas por gravidade e correcções.
1. Semântica: elementos HTML correctos (botão, ligação, lista, tabela, títulos por ordem), nomes acessíveis em todos os controlos, etiquetas associadas a campos; ARIA só quando o HTML nativo não chega.
2. Teclado: todo o fluxo utilizável sem rato, ordem de tabulação lógica, foco sempre visível, Escape fecha diálogos e o foco volta ao elemento de origem, sem armadilhas de foco.
3. Percepção: contraste mínimo de 4.5:1 no texto normal e 3:1 em texto grande e componentes; informação nunca só pela cor; texto alternativo em imagens e equivalente textual em gráficos; respeitar a preferência de movimento reduzido; utilizável com ampliação a 200%.
4. Erros e estados: mensagens de erro associadas ao campo e anunciadas; sucesso, carregamento e erros dinâmicos comunicados a leitores de ecrã.
5. Verificar com ferramenta automática, se existir no projecto, e confirmar à mão o teclado; as ferramentas automáticas não cobrem tudo, por isso dizer o que não foi verificado.
Validação: o fluxo completo foi percorrido só com teclado; não há problemas AA conhecidos em aberto ou estão listados com gravidade; o que não foi verificado (por exemplo leitor de ecrã real) está indicado.
`
    },
    'forge-visual-validation': {
        description: 'Usar após criar um ecrã ou alterar tokens, layout ou um componente partilhado, para comparar o resultado visual em vários tamanhos de ecrã e apanhar regressões.',
        body: `
Finalidade: nenhuma regressão visual silenciosa. Entradas: rotas ou componentes alterados. Resultado: comparação classificada, com evidência.
1. Capturar uma referência antes da alteração das rotas críticas e dos estados principais (normal, vazio, erro, carregamento), se ainda não existir.
2. Comparar depois da alteração em larguras de 375, 768, 1280 e 1440 px, em modo claro e escuro quando suportados.
3. Procurar: transbordo e texto cortado, sobreposições, alinhamento e espaçamento fora da grelha, contraste, foco visível, imagens e ícones deformados.
4. Classificar cada diferença como intencional (descrever e aceitar) ou regressão (corrigir). Não aceitar diferenças por serem pequenas.
5. Se não for possível executar a aplicação ou um navegador, dizê-lo e entregar a lista de verificações manuais em vez de afirmar que está validado.
Validação: cada rota e largura verificadas têm captura ou descrição concreta; as diferenças estão classificadas; o que não foi possível verificar está indicado.
`
    },
    'forge-ai-engineering': {
        description: 'Usar ao desenhar, construir ou avaliar uma funcionalidade com modelos de linguagem (assistentes, RAG, extracção, classificação, agentes), para decidir arquitectura, dados, avaliação, custos e segurança com evidência.',
        body: `
Finalidade: soluções de IA que se medem, não que se supõem. Entradas: caso de uso, dados permitidos e restrições. Resultado: desenho e avaliação reproduzíveis.
1. Perguntar o que se quer decidir ou automatizar, quem usa, o que acontece quando o modelo erra e que dados podem sair do projecto. Se uma regra fixa ou uma consulta resolve, não usar um modelo.
2. Escolher o padrão mais simples que resolve: pedido único com saída estruturada, depois ferramentas, depois RAG, depois agente com ciclo; justificar cada degrau acima do mais simples com forge-tradeoff.
3. RAG: definir fontes, partição dos documentos, metadados, recuperação (e filtros por permissões antes da pesquisa), reordenação se medida necessária e citação das fontes na resposta; separar a avaliação da recuperação da avaliação da geração.
4. Avaliação antes de otimizar: conjunto de exemplos com resposta esperada, métricas escolhidas para a tarefa, valor de referência (baseline) e comparação antes e depois com a mesma medição; guardar versões do modelo, do prompt e dos dados.
5. Segurança: tratar texto de utilizadores e de documentos como não fiável (injecção de instruções), validar saídas estruturadas, limitar ferramentas ao mínimo, pedir aprovação em acções com efeitos, não registar dados pessoais, e prever recusas e falhas do modelo.
6. Custo e latência: medir tokens e tempo por pedido, usar o modelo mais pequeno que cumpre a avaliação, colocar em cache o que se repete e definir limites e tempos máximos.
7. Confirmar modelos, parâmetros e APIs na documentação do fornecedor e na versão instalada (forge-ground); nunca citar métricas ou capacidades de memória.
Validação: existe um conjunto de avaliação e uma baseline com resultados reais; cada escolha acima do padrão mais simples está justificada; riscos de segurança e custo medido estão registados; nada foi alegado sem saída real.
`
    },
    'forge-prompt-engineering': {
        description: 'Usar ao escrever, melhorar ou depurar prompts (de sistema, de tarefa, de agentes ou de skills), para os tornar claros, testáveis e versionados em vez de ajustados por intuição.',
        body: `
Finalidade: prompts que se comportam de forma previsível. Entradas: prompt actual (ou objectivo) e exemplos de entradas e saídas esperadas. Resultado: prompt revisto, avaliado e versionado.
1. Definir o objectivo e o critério de sucesso e reunir exemplos reais, incluindo casos difíceis e entradas hostis, antes de mexer no texto.
2. Estrutura: papel e contexto, tarefa, entradas delimitadas (marcar claramente o que é dado e não instrução), restrições, formato de saída exacto (preferir saída estruturada validada) e o que fazer quando faltar informação ou houver dúvida.
3. Escrever instruções positivas e específicas, com a razão das regras importantes; evitar contradições e excesso de ênfase. Usar poucos exemplos bons e variados (incluindo um caso de recusa ou limite) em vez de muitas regras.
4. Para raciocínio complexo, pedir passos intermédios ou verificação apenas quando a avaliação mostra ganho; para extracção, mandar citar o excerto de origem.
5. Iterar com uma alteração de cada vez, correndo sempre o mesmo conjunto de exemplos, e comparar com a versão anterior; guardar cada versão com o resultado.
6. Defender contra injecção de instruções: não colocar segredos no prompt, não confiar em texto vindo de utilizadores ou documentos e validar a saída antes de agir.
7. Verificar como o prompt é preenchido no código (por exemplo str.format, f-strings ou outro motor de modelos): chavetas literais de exemplos em JSON colidem com os marcadores como {texto} e fazem o preenchimento falhar. Escapá-las ou usar outro marcador e testar o preenchimento com o código real e uma entrada de exemplo.
8. Em prompts de agentes e de skills, a descrição diz quando usar, o corpo é curto, os limites são explícitos e termina com como verificar o resultado.
9. Ao receber um pedido do utilizador mal formulado, perguntar o que falta (forge-clarify) e propor uma versão melhorada antes de executar.
Validação: o prompt foi corrido contra um conjunto fixo de exemplos com os resultados guardados; a versão nova é comparada com a anterior; o formato de saída é validado, o preenchimento dos marcadores foi testado com o código real e os casos hostis foram testados.
`
    },
    'forge-agent-engineering': {
        description: 'Usar ao construir agentes de IA, sistemas multiagente, skills e instruções de harness, para definir papéis, ferramentas, estado, memória, limites e avaliação antes de escrever código.',
        body: `
Finalidade: agentes com responsabilidade clara, controláveis e avaliáveis. Entradas: objectivo do agente e ambiente. Resultado: especificação do agente e implementação testada.
1. Começar pela necessidade: um fluxo fixo com um ou dois pedidos ao modelo resolve? Só usar um agente com ciclo de decisão quando os passos não são previsíveis. Mais agentes só quando há especializações diferentes, e nunca delegar sem limite de profundidade.
2. Especificar cada agente em quatro pontos: competências que usa, o que faz, o que nunca faz e o que entrega. Dar a cada agente as ferramentas mínimas; agentes que só analisam não têm escrita nem execução de comandos.
3. Ferramentas: esquema de entrada validado, descrição que diz quando usar, erros devolvidos de forma legível ao modelo, e aprovação humana nas que têm efeitos externos ou são irreversíveis.
4. Estado e memória: o estado do fluxo é explícito e tipado; memória curta e longa separadas, com escopo, retenção e apagamento definidos (forge-memory); o agente funciona sem memória longa.
5. Limites do ciclo: número máximo de passos, orçamento de tokens e de tempo, condição de paragem e escalada para uma pessoa quando falha repetidamente.
6. Skills: uma capacidade reutilizável por skill, descrição «Usar quando…», corpo curto e uma linha de validação; carregar só quando relevante.
7. Avaliar com cenários reais e casos de falha (ferramenta indisponível, entrada hostil, conflito de instruções) e registar traços de execução sem dados sensíveis. Consultar forge-langchain e forge-ms-agent-framework para a implementação.
Validação: cada agente tem competências, limites e entrega descritos; as ferramentas têm esquema e aprovação onde há efeitos; o ciclo tem limite e condição de paragem; existem cenários de avaliação com resultados reais.
`
    },
    'forge-langchain': {
        description: 'Usar ao construir ou rever aplicações com LangChain ou LangGraph (cadeias, ferramentas, recuperação, RAG, agentes e grafos de estado), para aplicar boas práticas e confirmar as APIs na versão instalada.',
        body: `
Finalidade: aplicações LangChain e LangGraph simples, observáveis e controláveis. Entradas: projecto Python ou TypeScript e o objectivo. Resultado: grafo ou cadeia testada e avaliada.
1. Confirmar primeiro os pacotes e as versões instaladas e ler a documentação dessa versão: estas bibliotecas mudam depressa e as importações e classes de versões antigas deixam de existir. Nunca escrever uma API de memória.
2. LangChain: preferir a composição declarativa de runnables com entradas e saídas tipadas; saída estruturada validada em vez de analisar texto; ferramentas com esquema claro; recuperação com filtros por permissão e citação das fontes; sem chamadas ao modelo onde lógica determinista basta.
3. LangGraph: o estado do grafo é o contrato (tipado, nós devolvem apenas as alterações); arestas condicionais com condição de saída provada e limite de iterações (limite de recursão) em qualquer ciclo agente-ferramenta; checkpointer para persistência, retoma e histórico; interrupções antes de nós com efeitos, para aprovação humana.
4. Nós determinísticos sempre que possível; um nó, uma responsabilidade; subgrafos para fluxos reutilizáveis.
5. Observabilidade: traços de execução (por exemplo com LangSmith, se a pessoa o usar) sem dados sensíveis; conjunto de avaliação com comparação antes e depois (forge-ai-engineering).
6. Testes: nós testados isoladamente com modelos substituídos por dobles; o grafo testado com respostas fixas; pelo menos um teste de caminho de falha e um de paragem por limite.
Validação: as versões instaladas foram confirmadas e as APIs usadas existem nelas; todo o ciclo tem limite ou condição de paragem; o estado está tipado; há testes dos nós e do grafo com a saída real.
`
    },
    'forge-ms-agent-framework': {
        description: 'Usar ao construir agentes e fluxos com o Microsoft Agent Framework (Python ou .NET), ou ao migrar de Semantic Kernel ou AutoGen, para desenhar e implementar com as APIs confirmadas na versão instalada.',
        body: `
Finalidade: agentes e fluxos multiagente no ecossistema Microsoft sem inventar APIs. Entradas: linguagem (Python ou .NET), objectivo e fornecedor de modelos. Resultado: agente ou fluxo testado e avaliado.
1. O framework evolui depressa e pode estar em pré-visualização: confirmar na documentação oficial e nos pacotes instalados o nome dos pacotes, as versões e o estado de maturidade antes de escrever código; não assumir classes nem métodos de memória nem de outras bibliotecas.
2. Escolher o padrão mais simples: um agente com ferramentas; depois um fluxo (workflow) com passos e ligações explícitas quando a sequência é conhecida; depois colaboração entre agentes só quando há especializações diferentes (forge-agent-engineering).
3. Ferramentas como funções com esquema claro e descrição; ligações a serviços externos por MCP quando existirem servidores adequados, com permissões mínimas; aprovação humana em acções com efeitos.
4. Estado e conversa: manter o estado do fluxo explícito, tratar memória e histórico com escopo e retenção (forge-memory) e não persistir segredos nem dados pessoais.
5. Fornecedor de modelos e credenciais por configuração e identidade gerida; nenhum segredo no código ou no repositório (forge-security); registar telemetria sem conteúdo sensível.
6. Em .NET seguir também forge-dotnet; em Python, forge-python. Em migração de Semantic Kernel ou AutoGen, mapear cada conceito antigo ao novo pela documentação de migração e testar o comportamento equivalente antes de remover o código antigo.
7. Testar com modelos substituídos por dobles, cenários de falha e um conjunto de avaliação (forge-ai-engineering).
Validação: pacotes, versões e APIs usados foram confirmados na documentação e na instalação; o ciclo ou fluxo tem limites; os testes passam com a saída real; não há segredos no repositório.
`
    },
    'forge-production-readiness': {
        description: 'Usar ao preparar uma aplicação para produção ou ao limpar e otimizar um projecto, para remover lixo e deixar configuração, registo, build, dependências e arranque adequados a produção, com medição antes e depois.',
        body: `
Finalidade: uma aplicação limpa, leve e segura para correr em produção. Entradas: projecto, stack e ambiente alvo. Resultado: alterações em lotes pequenos, medidas e reversíveis.
1. Linha de base primeiro: confirmar que a suite e o build passam e registar o que se vai comparar (tempo e tamanho de build, tamanho da imagem, tempo de arranque, tempo de resposta). Trabalhar num ramo próprio.
2. Lixo a limpar, só com evidência (forge-hygiene): código de depuração e impressões soltas (por exemplo console.log, print, breakpoints), código comentado, TODOs resolvidos, ficheiros temporários, cópias e artefactos de build versionados por engano, código e ficheiros mortos, dependências não usadas e pacotes de desenvolvimento nas dependências de produção. Verificar importações dinâmicas e registo por convenção antes de remover; remover em lotes pequenos, um commit por lote, com a suite a passar.
3. Configuração: valores por ambiente através de variáveis de ambiente ou gestor de segredos, sem segredos nem endereços fixos no repositório; ficheiro de exemplo sem valores reais; o modo de depuração desligado por omissão em produção; falhar no arranque, com mensagem clara, se faltar configuração obrigatória.
4. Robustez: registo estruturado com níveis adequados e sem dados sensíveis; erros ao cliente sem rasto de chamadas nem detalhes internos; tempos limite, repetições com limite e tamanho de pools definidos; verificação de saúde e de prontidão; paragem ordenada ao receber o sinal de terminação.
5. Desempenho (forge-performance): só o que a medição mostra; eliminar trabalho repetido e consultas N+1, usar cache onde o dado o permite, paginar listas, comprimir e minimizar recursos estáticos, dividir o código do frontend por rotas e remover o que não é usado. Em bases de dados, seguir forge-database.
6. Build e entrega: build reprodutível a partir de um estado limpo, dependências fixadas e auditadas (forge-security), imagem de contentor mínima, em várias fases, sem ferramentas de desenvolvimento, sem executar como administrador e com ficheiro de exclusão que deixe de fora segredos e lixo (forge-infra).
7. Migrações e reversão: migrações testadas com reversão e um plano de regressão para a versão anterior; nada de DDL ou publicação em produção sem aprovação.
8. Voltar a medir com os mesmos critérios e a correr a suite completa; recusar alterações que pioram a medição ou os testes.
Validação: existe medição antes e depois com os mesmos critérios; a suite e o build passam a partir de um estado limpo, com a saída real; cada remoção tem evidência de que não é usada; não há segredos, depuração activa nem dependências de desenvolvimento em produção.
`
    },
    'forge-threat-model': {
        description: 'Usar ao desenhar a arquitectura de um sistema com utilizadores, dados sensíveis, integrações ou modelos de linguagem, para identificar activos, fronteiras de confiança e ameaças antes de implementar.',
        body: `
Finalidade: decidir as defesas antes do código, em vez de as descobrir numa revisão final. Entradas: arquitectura ou descrição do sistema. Resultado: lista de ameaças priorizadas, cada uma com uma mitigação e um teste.
1. Listar os activos (dados, credenciais, funções críticas), os actores (utilizadores, administradores, serviços, atacantes) e as fronteiras de confiança (rede, processos, serviços externos, entrada do utilizador, texto lido por um modelo).
2. Em cada fronteira, percorrer as categorias STRIDE: falsificação de identidade, adulteração de dados, repúdio, divulgação de informação, negação de serviço e elevação de privilégios. Em sistemas com modelos de linguagem, acrescentar injecção de instruções (directa e através de documentos), fuga de dados, excesso de autonomia das ferramentas e saídas não validadas.
3. Priorizar por impacto e probabilidade, com a confiança de cada ameaça (\`EXTRACTED\`, \`INFERRED\`, \`AMBIGUOUS\`); o que for ambíguo vai para decisão humana.
4. Para cada ameaça relevante, registar a mitigação (no desenho) e o teste que a verifica (para forge-security-testing); aceitar um risco só com decisão escrita de uma pessoa.
5. Guardar em \`.agentforge/work/threat-model.md\` e rever quando a arquitectura, os dados ou as integrações mudarem.
Validação: existem activos, actores e fronteiras listados; cada ameaça priorizada tem mitigação e teste, ou um risco aceite por uma pessoa; as ambiguidades estão marcadas.
`
    },
    'forge-security-testing': {
        description: 'Usar depois de implementar e antes de concluir, para escrever e correr testes de segurança executáveis e ferramentas de análise contra a própria aplicação em ambiente local, em vez de depender só de revisão de código.',
        body: `
Finalidade: provar por execução que as defesas funcionam. Entradas: a aplicação, o modelo de ameaças (forge-threat-model) e o ambiente local. Resultado: testes de segurança que falham sem a defesa e passam com ela, e saídas reais das ferramentas.
1. Âmbito e autorização: testar apenas a aplicação do projecto, em ambiente local ou de teste, com dados sintéticos. Nunca testar sistemas de terceiros nem produção, nem fazer testes de carga destrutivos ou em massa, sem autorização escrita. Parar se o alvo não for claramente do projecto.
2. Descobrir as ferramentas do ecossistema que existem (por exemplo npm audit, pip-audit, dotnet list package --vulnerable, ferramentas de procura de segredos ou de análise estática já instaladas) confirmando cada uma com a opção de versão. Não instalar nada sem aprovação; as que faltam ficam declaradas como não executadas.
3. Escrever testes automatizados por ameaça: acesso sem credenciais e com credenciais inválidas (401 ou 403); acesso a recursos de outro utilizador; payloads de injecção (SQL, comandos, XSS) em cada entrada; validação de tipos, tamanhos e limites; mensagens de erro sem rasto de chamadas nem detalhes internos; cabeçalhos de segurança; segredos ausentes das respostas e dos registos. Em sistemas com modelos de linguagem: textos com instruções escondidas em dados, saídas fora do formato esperado e ferramentas chamadas sem aprovação.
4. Ver cada teste falhar sem a defesa (ou reconhecer que a defesa já existia e porquê), corrigir apenas com aprovação e repetir. Correr as ferramentas disponíveis e guardar a saída real.
5. Registar o que foi testado, o que não foi (incluindo ferramentas em falta) e os achados por gravidade, sem copiar valores de segredos para o relatório.
Validação: cada ameaça priorizada tem um teste executado com saída real; as ferramentas executadas e as não executadas estão listadas; o alvo e o ambiente estão indicados e eram do projecto; nenhum segredo foi copiado para o relatório.
`
    },
    'forge-memory': {
        description: 'Usar ao desenhar como o Harness ou um agente guarda e recupera contexto entre passos e sessões (memória de trabalho, curta e longa), para definir escopo, retenção, segurança e orçamento.',
        body: `
Finalidade: lembrar o que ajuda sem arrastar contexto inútil nem expor dados. Entradas: tipo de informação a guardar e quem a usa. Resultado: política de memória testada.
1. Três camadas: trabalho (o necessário neste passo; vive no contexto e é descartável), curta (decisões, estado e erros desta sessão ou fase; expira no fim ou por TTL) e longa (factos, preferências e lições reutilizáveis entre sessões; só entra o que for elegível).
2. Escrever na memória longa só factos atómicos, sem duplicados, com origem, confiança, escopo, data e retenção; as lições exigem evidência e aprovação humana antes de serem reutilizadas (ver forge-context). Contradições ficam assinaladas para resolução, não são sobrescritas.
3. Recuperar por relevância dentro de um orçamento de tokens: filtrar por projecto e permissões antes de pesquisar, aplicar o limite e dizer quando uma resposta depende de memória recuperada, distinguindo o confirmado da hipótese.
4. Resumir ao atingir o orçamento: manter decisões, restrições, estado e próximos passos; descartar saída longa de ferramentas (guardar o registo completo em ficheiro) e o que já foi resolvido.
5. Nunca guardar segredos, credenciais, dados de pagamento ou dados pessoais sem base e consentimento; a pessoa pode consultar, corrigir e apagar, incluindo índices e caches derivados.
6. O sistema funciona sem memória longa disponível: a recuperação melhora, nunca autoriza a inventar.
7. Testar isolamento entre projectos e sessões, expiração, apagamento, deduplicação e conflito.
Validação: cada camada tem escopo, retenção e limite de tamanho; não há segredos na memória nem nos registos; os testes de isolamento, expiração e apagamento passam; o sistema funciona com a memória longa desligada.
`
    }
};
//# sourceMappingURL=skills-domain.js.map