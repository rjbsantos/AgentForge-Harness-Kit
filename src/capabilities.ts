export const profiles = {
  'project-manager': {
    title: 'Gestor de Projetos',
    agent: 'product-manager',
    workflows: ['project-status', 'meeting-followup', 'risk-review', 'requirements-analysis']
  },
  'it-project-manager': {
    title: 'Gestor de Projetos de SI',
    agent: 'solution-advisor',
    workflows: ['solution-briefing', 'automation-opportunity', 'tech-exploration', 'continuous-improvement',
      'requirements-analysis', 'system-analysis', 'project-status']
  },
  'ai-engineer': {
    title: 'Engenheiro de IA',
    agent: 'ai-engineer',
    workflows: ['ai-solution-design', 'ai-evaluation', 'agent-build', 'prompt-engineering', 'context-memory-setup', 'requirements-analysis', 'guardrail-design', 'red-team']
  },
  'frontend-developer': {
    title: 'Programador Frontend',
    agent: 'frontend-developer',
    workflows: ['frontend-build', 'bug-investigation', 'edge-modernization', 'sast-remediation']
  },
  'backend-developer': {
    title: 'Programador Backend',
    agent: 'backend-developer',
    workflows: ['forge-build', 'production-cleanup', 'release-closure', 'bug-investigation', 'database-optimization', 'sast-remediation']
  },
  'design-system-architect': {
    title: 'Arquitecto de Design System',
    agent: 'design-system-architect',
    workflows: ['frontend-build']
  },
  'agent-engineer': {
    title: 'Engenheiro de Agentes',
    agent: 'agent-engineer',
    workflows: ['agent-build', 'prompt-engineering', 'context-memory-setup', 'guardrail-design']
  },
  'context-manager': {
    title: 'Gestor de Contexto',
    agent: 'context-manager',
    workflows: ['context-memory-setup']
  },
  'security-engineer': {
    title: 'Engenheiro de Segurança',
    agent: 'security-tester',
    workflows: ['security-assessment', 'sast-remediation', 'red-team', 'guardrail-design']
  },
  'database-engineer': {
    title: 'Engenheiro de Bases de Dados',
    agent: 'database-optimizer',
    workflows: ['database-optimization']
  },
  'senior-developer': {
    title: 'Programador Sénior',
    agent: 'lead-developer',
    workflows: ['bug-investigation', 'repository-audit', 'production-cleanup', 'release-closure', 'forge-build', 'technical-documentation', 'change-request',
      'sast-remediation', 'edge-modernization']
  },
  'systems-analyst': {
    title: 'Analista de Sistemas',
    agent: 'systems-analyst',
    workflows: ['system-analysis', 'incident-analysis', 'requirements-analysis']
  }
} as const;

export type Profile = keyof typeof profiles;

export interface Workflow {
  description: string;
  trigger: string;
  preconditions: string[];
  inputs: string[];
  steps: string[];
  skills: string[];
  tools: string[];
  validation: string[];
  errorHandling: string;
  output: string;
  postcondition: string;
  template: string;
  parallelGroups: {
    after: number[];
    workers: { step: number; role: string; skills: string[] }[];
  }[];
  /** Sub-fluxos que complementam este: o outro fluxo corre nesse passo e o artefacto passa de um para o outro. */
  uses: { workflow: string; step: number; when: string; handoff: string }[];
}

const flow = (description: string, trigger: string, steps: string[], skills: string[],
  tools: string[], output: string, template: string, validation: string[],
  parallelGroups: {
    after: number[];
    workers: { step: number; role: string; skills: string[] }[];
  }[] = []): Workflow => ({
  description, trigger,
  preconditions: ['Confirmar objetivo, limites, aprovações e ferramentas disponíveis', 'Fazer as perguntas pertinentes (forge-clarify) quando faltar informação que muda o resultado: no máximo quatro por mensagem, cada uma com uma só decisão e uma recomendação, sem subperguntas'],
  inputs: ['Pedido do utilizador', 'Artefactos fornecidos e estado atual'],
  steps, skills, tools, output, template, validation,
  errorHandling: 'Parar, indicar informação ou ferramenta indisponível e pedir uma decisão; não inventar resultados',
  parallelGroups,
  uses: [],
  postcondition: 'Entregar um resultado verificável e registar o próximo passo no contexto ativo'
});

export const workflows: Record<string, Workflow> = {
  'project-status': flow('Relatório do progresso, riscos e próximos marcos', 'Pedido de estado do projecto',
    ['Recolher marcos, trabalho concluído e evidência', 'Analisar desvios, riscos e dependências', 'Validar responsáveis e preparar relatório'],
    ['forge-research', 'forge-verify'], ['file-system'], 'Relatório de estado', 'project-status',
    ['Cada progresso tem evidência e data; incerteza e decisões pendentes identificadas']),
  'meeting-followup': flow('Acta e acções rastreáveis', 'Pedido de acta ou follow-up',
    ['Identificar decisões registadas', 'Atribuir acções, responsáveis e prazos confirmados', 'Rever o resumo com participantes'],
    ['forge-verify'], ['file-system'], 'Acta e plano de acções', 'meeting-minutes',
    ['Não inventar participantes, acordos ou responsáveis']),
  'risk-review': flow('Identificar, priorizar e monitorizar riscos', 'Pedido de riscos do projecto',
    ['Identificar riscos com fonte', 'Avaliar probabilidade e impacto com critérios explícitos', 'Propor mitigação e responsáveis para aprovação'],
    ['forge-research', 'forge-verify'], ['file-system'], 'Registo de riscos', 'risk-register',
    ['Riscos verificáveis; aprovação para custos e mudanças']),
  'requirements-analysis': flow('Requisitos testáveis e plano', 'Novo pedido de requisitos',
    ['Clarificar actores e limites', 'Priorizar requisitos e dependências', 'Definir critérios de aceitação e pedir aprovação'],
    ['forge-requirements', 'forge-verify'], ['file-system'], 'Requisitos rastreáveis', 'requirements',
    ['Todos os Must têm ID e aceitação testável']),
  'solution-briefing': flow('Necessidade de negócio traduzida em opções comparáveis e decisão registada',
    'Pedido de caso de negócio, análise de opções ou build vs buy',
    ['Separar o resultado de negócio pretendido da solução já sugerida e identificar quem decide',
      'Levantar restrições reais: orçamento, prazo, sistemas existentes, dados, conformidade e competências',
      'Construir opções que incluam construir, comprar, integrar e manter o estado actual',
      'Comparar com critérios fixados antes da pontuação: custo, risco, esforço, reversibilidade e dependência de fornecedor',
      'Recomendar uma opção, nomear o risco aceite e registar a decisão'],
    ['forge-requirements', 'forge-research', 'forge-tradeoff', 'forge-verify'], ['file-system', 'web-research'],
    'Briefing de solução e registo de decisão', 'solution-brief',
    ['Opção de não mudar avaliada; cada valor tem fonte ou está marcado como estimativa; recomendação indica o que a inverteria']),
  'automation-opportunity': flow('Avaliação de uma oportunidade de automação, do processo ao retorno',
    'Pedido de automação de um processo ou tarefa repetitiva',
    ['Descrever o processo actual com passos, responsáveis, sistemas e excepções conhecidas',
      'Medir frequência, duração e taxa de erro com dados; marcar o que é estimativa',
      'Avaliar viabilidade: acesso a dados, APIs, permissões, ambientes e tratamento de excepções',
      'Desenhar a automação e delimitar explicitamente o que permanece decisão humana',
      'Estimar retorno, custo de manutenção, modo de falha e plano de adopção'],
    ['forge-research', 'forge-tradeoff', 'forge-verify'], ['file-system', 'terminal'],
    'Plano de automação', 'automation-plan',
    ['Esforço actual medido ou declarado como estimativa; excepções e recurso humano definidos; retorno nunca afirmado sem base']),
  'tech-exploration': flow('Exploração delimitada de uma tecnologia com experiência real e veredicto',
    'Pedido de spike, prova de conceito ou avaliação de nova tecnologia',
    ['Escrever a pergunta e o critério de decisão antes de experimentar',
      'Fixar o tempo, o âmbito e o que fica de fora',
      'Rever o que já existe no projecto e o estado da arte antes de construir',
      'Executar a experiência mínima e registar versões, comandos e o que falhou',
      'Concluir com veredicto adoptar, testar, avaliar ou descartar e capturar a lição com âmbito e âncora'],
    ['forge-research', 'forge-spike', 'forge-tradeoff', 'forge-verify'],
    ['file-system', 'terminal', 'web-research', 'model-api'],
    'Relatório de exploração com veredicto', 'tech-exploration',
    ['Veredicto suportado por experiência executada com versões registadas; limitações, custo e código descartável identificados']),
  'continuous-improvement': flow('Retrospectiva orientada a evidência que gera melhorias e lições',
    'Pedido de retrospectiva, lições aprendidas ou melhoria contínua',
    ['Delimitar o período, o trabalho e as fontes de evidência em análise',
      'Executar `agentforge insights` para agregar execuções verificadas; analisar incidentes, desvios e retrabalho a partir de evidência, não de memória',
      'Separar causas sistémicas de ocorrências isoladas',
      'Priorizar melhorias por impacto e esforço, com responsável e critério de verificação',
      'Converter apenas o que generaliza em lição com âmbito e âncora para aprovação'],
    ['forge-research', 'forge-context', 'forge-verify'], ['file-system', 'git'],
    'Plano de melhoria', 'improvement-plan',
    ['Cada melhoria tem evidência, impacto e responsável; lições respeitam a fasquia de generalização e não são promovidas automaticamente']),
  'ai-solution-design': flow('Arquitectura de IA com validação e guardrails', 'Pedido de desenho de solução IA',
    ['Definir casos de uso e dados permitidos', 'Comparar modelos, RAG, embeddings e ferramentas com evidência', 'Definir avaliação, segurança, custos e deploy', 'Rever arquitectura com o utilizador'],
    ['forge-requirements', 'forge-research', 'forge-routing', 'forge-verify'],
    ['file-system', 'model-api'], 'Desenho de solução IA', 'ai-design',
    ['Critérios mensuráveis; modelo e APIs confirmados; dados e permissões documentados']),
  'ai-evaluation': flow('Avaliação reproduzível de sistema IA', 'Pedido de avaliação de modelo ou RAG',
    ['Definir dataset e baseline', 'Executar só com acesso autorizado', 'Medir métricas e erros', 'Propor melhorias e repetir comparação'],
    ['forge-research', 'forge-verify'], ['file-system', 'model-api'],
    'Relatório de avaliação', 'ai-evaluation',
    ['Dataset, versão, métricas e limites registados; sem alegar execução sem output']),
  'bug-investigation': flow('Diagnóstico e correcção de defeito', 'Pedido de análise de erro',
    ['Reproduzir a falha', 'Isolar causa raiz com logs e código', 'Planear teste de regressão', 'Implementar só se autorizado; executar suite e rever'],
    ['forge-debug', 'forge-research', 'forge-graph', 'forge-ground', 'forge-implementation', 'forge-verify'],
    ['file-system', 'terminal', 'git'], 'Relatório e correcção validada', 'bug-report',
    ['Reprodução e teste de regressão documentados']),
  'repository-audit': flow('Auditoria técnica com recomendações', 'Pedido de auditoria ao repositório',
    ['Mapear arquitectura, limites e testes',
      'Inspeccionar qualidade, manutenibilidade e regressões com evidência',
      'Identificar código, ficheiros e dependências potencialmente mortos ou obsoletos, verificando referências dinâmicas e pontos de entrada',
      'Inspeccionar segurança com evidência',
      'Inspeccionar desempenho com evidência',
      'Consolidar candidatos com caminhos dentro da raiz do projecto, evidência, confiança e risco de falsos positivos',
      'Pedir à pessoa que seleccione os candidatos a tratar; sem selecção, termina no relatório',
      'Implementar só os candidatos seleccionados pelo fluxo forge-build (testes primeiro, revisão, segurança e qa)',
      'Comparar o antes e o depois com a mesma medição e rejeitar regressões'],
    ['forge-audit', 'forge-hygiene', 'forge-graph', 'forge-research', 'forge-performance', 'forge-implementation', 'forge-verify'], ['file-system', 'git', 'terminal'],
    'Relatório de auditoria', 'repository-audit',
    ['Todos os achados têm caminho dentro do projecto, evidência, impacto e confiança; código dinâmico e pontos de entrada foram considerados; nenhuma remoção é feita sem aprovação'],
    [{
      after: [1],
      workers: [
        { step: 2, role: 'code-critic', skills: ['forge-audit'] },
        { step: 3, role: 'secops', skills: ['forge-audit'] },
        { step: 4, role: 'reverse-engineer', skills: ['forge-performance'] }
      ]
    }]),
  'production-cleanup': flow('Limpeza e otimização de código e actualização da documentação para correr em produção', 'Pedido de limpeza, otimização ou preparação para produção',
    ['Clarificar o ambiente alvo, a stack, o que é intocável e o que significa «pronto»; criar ramo próprio e registar a linha de base (suite, build, tamanho, tempo)',
      'Mapear o projecto a partir do código: pontos de entrada, módulos, configuração e dependências (reverse-engineer)',
      'Identificar lixo e código, ficheiros e dependências mortos ou obsoletos, com evidência e confiança (code-critic)',
      'Rever segurança para produção: segredos, depuração activa, configuração insegura e dependências vulneráveis (secops)',
      'Identificar desperdício de desempenho com medição (reverse-engineer)',
      'Consolidar os candidatos e pedir validação humana do que se remove e do que se otimiza (validação N1)',
      'Aplicar só o aprovado em lotes pequenos, com testes antes e depois e um commit por lote (lead-developer)',
      'Preparar a entrega: configuração por ambiente, registo, saúde, build otimizado, imagem mínima e dependências fixadas (devops)',
      'Medir antes e depois e correr a suite completa; recusar regressões (qa)',
      'Actualizar a documentação ao código real: instalação, configuração, execução, operação e histórico de alterações, e remover a documentação obsoleta (tech-writer)',
      'Fechar o ramo e pedir autorização antes de publicar'],
    ['forge-clarify', 'forge-checkpoint', 'forge-graph', 'forge-hygiene', 'forge-security', 'forge-performance', 'forge-production-readiness',
      'forge-implementation', 'forge-tdd', 'forge-infra', 'forge-verify', 'forge-docs', 'forge-finish'],
    ['file-system', 'terminal', 'git'], 'Projecto limpo, otimizado e documentado', 'production-cleanup',
    ['Medição antes e depois com os mesmos critérios; cada remoção tem evidência e aprovação; suite e build verdes a partir de um estado limpo; sem segredos nem depuração activa; documentação alinhada com o código; nada publicado sem autorização'],
    [{
      after: [2],
      workers: [
        { step: 3, role: 'code-critic', skills: ['forge-hygiene'] },
        { step: 4, role: 'secops', skills: ['forge-security'] },
        { step: 5, role: 'reverse-engineer', skills: ['forge-performance'] }
      ]
    }]),
  'release-closure': flow('Fecho de uma versão: revisão técnica, testes, segurança, documentação, versionamento, publicação com autorização e relatório final', 'Pedido de fechar, preparar ou publicar uma versão (release)',
    ['Clarificar a versão pretendida, o ambiente e o que significa «pronta»; criar ramo próprio e registar a linha de base (suite, build, tamanho)',
      'Requisitos e pendentes: verificar requisitos funcionais e não funcionais, correr `agentforge trace`, listar funcionalidades incompletas, bugs conhecidos e débitos (product-manager)',
      'Limpeza: código morto, duplicado, ficheiros e dependências não usadas, avisos do compilador e do linter (code-critic)',
      'Base de dados, se existir: estrutura, consultas lentas, índices, migrações, integridade, backups e recuperação (database-optimizer)',
      'Aplicação: estrangulamentos de desempenho, chamadas à API, caching e tamanho do bundle, com medição (reverse-engineer)',
      'Segurança: autenticação, autorização, validação de entradas, segredos, dependências vulneráveis, cabeçalhos, logs e análises automatizadas (secops)',
      'Design system, UX e UI, se houver interface: consistência, estados, formulários, acessibilidade, teclado, contraste e dispositivos (ui-visual-validator)',
      'Documentação: remover a obsoleta, arquivar a histórica, validar README, instalação, exemplos, variáveis e APIs contra o código (tech-writer)',
      'Consolidar os achados por gravidade e pedir validação humana do que se corrige antes da release e do que fica como pendente (validação N1)',
      'Aplicar só o aprovado em lotes pequenos, testes primeiro e um commit por lote (lead-developer)',
      'Testes unitários, de integração e de regressão, casos-limite, permissões e integrações, com saída real e cobertura (qa)',
      'Testes ponta a ponta com Playwright: cobertura, cenários positivos e negativos, erros, estados e instabilidade, com relatório (qa)',
      'Git: estado do repositório, ramos activos, abandonados e integrados, integração no ramo principal e suite verde na versão final (devops)',
      'Versionamento: tipo de versão por Semantic Versioning, número da versão em todos os locais, changelog e notas da release (devops)',
      'Critério de publicação: verificar cada item da checklist e pedir autorização expressa para commit final, tag e publicação (validação N2)',
      'Com autorização: commit, tag e publicação a partir do ramo principal; verificar o deploy e a versão em execução; confirmar o procedimento de rollback (devops)',
      'Relatório final: alterações, bugs, pendentes, resultados e cobertura dos testes, segurança, desempenho, versão, commit, tag, riscos e acções futuras (product-manager)'],
    ['forge-clarify', 'forge-requirements', 'forge-checkpoint', 'forge-hygiene', 'forge-database', 'forge-performance', 'forge-security',
      'forge-visual-validation', 'forge-accessibility', 'forge-docs', 'forge-implementation', 'forge-tdd', 'forge-verify', 'forge-e2e',
      'forge-finish', 'forge-release'],
    ['file-system', 'terminal', 'git'], 'Versão fechada com checklist, relatório e evidência', 'release-closure',
    ['Cada área da checklist tem evidência ou está declarada como não aplicável ou não testada com a razão; sem bugs críticos nem vulnerabilidades críticas conhecidos; testes obrigatórios verdes com saída real; alterações integradas; documentação e versão coerentes; commit, tag e publicação só com autorização expressa; rollback definido'],
    [{
      after: [2],
      workers: [
        { step: 3, role: 'code-critic', skills: ['forge-hygiene'] },
        { step: 4, role: 'database-optimizer', skills: ['forge-database'] },
        { step: 5, role: 'reverse-engineer', skills: ['forge-performance'] },
        { step: 6, role: 'secops', skills: ['forge-security'] },
        { step: 7, role: 'ui-visual-validator', skills: ['forge-visual-validation', 'forge-accessibility'] },
        { step: 8, role: 'tech-writer', skills: ['forge-docs'] }
      ]
    }]),
  'sast-remediation': flow('Tratamento de um relatório de análise estática de segurança (por exemplo do Checkmarx): triagem com evidência, correcção com testes e reanálise', 'Pedido de corrigir os achados de um relatório SAST ou Checkmarx',
    ['Receber o relatório (formato, versão do código analisada e data), confirmar que corresponde ao ramo actual e criar ramo próprio (nunca corrigir em main)',
      'Normalizar os achados numa tabela: identificador, regra, gravidade, CWE, ficheiro e linha de origem e de destino, estado anterior (secops)',
      'Triar cada achado no código: confirmado, falso positivo com justificação ou por esclarecer, com a confiança de cada conclusão (secops)',
      'Agrupar por causa-raiz, priorizar por gravidade, exploração e exposição, e pedir validação humana do que se corrige, do que é falso positivo e do que se adia (validação N1)',
      'Corrigir só o aprovado em lotes pequenos, com o teste que demonstra a vulnerabilidade primeiro, sem desactivar regras nem suprimir achados (lead-developer)',
      'Rever as correcções e correr a suite completa, com saída real (qa)',
      'Preparar a reanálise: lista de achados tratados com commit e, depois de a pessoa voltar a correr o scan, comparar com o relatório novo (resolvidos, persistentes, novos)'],
    ['forge-clarify', 'forge-sast-remediation', 'forge-security', 'forge-security-testing', 'forge-implementation', 'forge-tdd', 'forge-checkpoint', 'forge-verify', 'forge-finish'],
    ['file-system', 'terminal', 'git'], 'Achados triados, corrigidos e prontos para reanálise', 'sast-remediation',
    ['Cada achado tem estado, evidência (ficheiro:linha, teste, commit) e justificação; nenhum suprimido sem aprovação; cada correcção tem um teste que falhava antes; o relatório novo foi comparado com o anterior; o scan não foi executado nem o código enviado para fora sem autorização']),
  'edge-modernization': flow('Modernização de uma aplicação web para o Microsoft Edge: deixar de depender do modo de compatibilidade do Internet Explorer', 'Pedido de compatibilidade com o Edge, de remover o modo IE ou de optimizar para o Edge a partir do código',
    ['Clarificar a aplicação, os navegadores suportados, o que depende hoje do modo IE e quem gere a configuração do Edge; criar ramo próprio e registar a linha de base (suite, comportamento, medição)',
      'Inventariar as construções legadas no código com ficheiro e linha: forçar modo de documento, DOCTYPE em falta, comentários condicionais, ActiveX, `attachEvent`, `document.all`, prefixos e filtros do IE, detecção por `userAgent`, polyfills e alvos de compilação (frontend-developer)',
      'Inventariar a configuração fora do código (lista do modo Enterprise ou modo IE, cabeçalhos do servidor, políticas) e entregá-la por escrito a quem a gere (devops)',
      'Classificar cada achado (remover, substituir por API padrão, reescrever ou bloqueado), estimar esforço e risco e pedir validação humana (validação N1)',
      'Corrigir por categoria em lotes pequenos, com teste por lote, usando detecção de funcionalidades e nunca de navegador (frontend-developer)',
      'Validar no Edge: suite, testes ponta a ponta e acessibilidade; confirmar que as páginas abrem em modo padrão (qa)',
      'Optimizar para o Edge a partir do código (recursos bloqueantes, CSS e APIs modernas no lugar de hacks), medindo antes e depois',
      'Só depois de validado, desligar a compatibilidade e retirar o site da lista, com plano de reversão e autorização expressa (validação N2)'],
    ['forge-clarify', 'forge-edge-compat', 'forge-implementation', 'forge-tdd', 'forge-e2e', 'forge-accessibility', 'forge-performance', 'forge-checkpoint', 'forge-verify', 'forge-finish'],
    ['file-system', 'terminal', 'git'], 'Aplicação sem dependência do modo IE e validada no Edge', 'edge-modernization',
    ['Inventário com ficheiro e linha e contagem antes e depois; nenhuma construção legada sem justificação; suite e testes ponta a ponta verdes no Edge; páginas em modo padrão; configuração externa entregue por escrito; nada desligado sem plano de reversão e autorização'],
    [{
      after: [1],
      workers: [
        { step: 2, role: 'frontend-developer', skills: ['forge-edge-compat'] },
        { step: 3, role: 'devops', skills: ['forge-edge-compat'] }
      ]
    }]),
  'guardrail-design': flow('Definição de guardrails de um agente, prompt ou aplicação com IA como regras testáveis', 'Pedido de guardrails, limites de segurança ou política de um agente ou sistema de IA',
    ['Clarificar o caso de uso, os dados permitidos e o que nunca pode acontecer, com no máximo quatro perguntas (as que mais mudam o resultado)',
      'Identificar activos, fronteiras de confiança e riscos de IA: injecção de instruções, fuga de dados, excesso de agência e saída insegura (secops)',
      'Escrever os guardrails como regras GR-NN por camada (entrada, contexto, ferramentas, saída, dados e escalada humana), cada uma com a verificação e a acção ao falhar (ai-engineer)',
      'Implementar em código o que é verificável e marcar como «só instrução» o que depende do modelo',
      'Testar cada regra imposta com casos que a violam e guardar a saída real',
      'Pedir validação humana das regras e do risco aceite (validação N1)'],
    ['forge-clarify', 'forge-guardrails', 'forge-threat-model', 'forge-tdd', 'forge-checkpoint', 'forge-verify'],
    ['file-system', 'terminal', 'git'], 'Guardrails testáveis e risco aceite registado', 'guardrails',
    ['Cada regra tem identificador, verificação e acção ao falhar; as que dependem só do modelo estão marcadas como não impostas; cada regra imposta tem um teste que falha quando violada; o risco aceite tem aprovação humana']),
  'red-team': flow('Ataque controlado a um prompt, agente ou aplicação com IA para provar se os guardrails resistem, em ambiente local', 'Pedido de red team, de testar a resistência a injecção de instruções ou de validar guardrails',
    ['Confirmar a autorização escrita, que o alvo é do projecto e que o ambiente é local ou de teste com dados sintéticos, sem produção nem sistemas de terceiros',
      'Reunir os guardrails e o modelo de ameaças; se não existirem, escrevê-los primeiro (secops)',
      'Construir o corpus de ataque por categoria: injecção directa e indirecta, extracção do prompt, fuga de dados, abuso de ferramentas, desvio de objectivo e ofuscação (security-tester)',
      'Executar cada caso três vezes, por causa do não determinismo, registando entrada, esperado, observado, veredicto e gravidade com saída real (security-tester)',
      'Consolidar os achados por gravidade, declarar o que não foi testado e pedir aprovação antes de corrigir (validação N1)',
      'Corrigir só o aprovado com teste primeiro e transformar cada falha num teste de regressão (lead-developer)',
      'Voltar a correr o corpus completo e comparar com a primeira execução'],
    ['forge-clarify', 'forge-red-team', 'forge-guardrails', 'forge-security-testing', 'forge-threat-model', 'forge-tdd', 'forge-checkpoint', 'forge-verify'],
    ['file-system', 'terminal', 'git'], 'Relatório de red team com corpus de regressão', 'red-team',
    ['Autorização, alvo e ambiente indicados; cada caso com esperado, observado e veredicto reais e três repetições; sem exfiltração real nem conteúdo nocivo além do mínimo para provar; o que não foi testado está declarado; cada falha corrigida tem um teste de regressão']),
  'security-assessment': flow('Avaliação de segurança da aplicação: modelo de ameaças, revisão e testes executáveis em ambiente local', 'Pedido de testes de segurança, modelo de ameaças ou avaliação de segurança',
    ['Clarificar o âmbito e confirmar que o alvo é do projecto e o ambiente é local ou de teste, sem produção nem sistemas de terceiros',
      'Modelo de ameaças: activos, actores, fronteiras de confiança e ameaças priorizadas (secops)',
      'Rever o código com evidência nas áreas de maior risco (secops)',
      'Escrever e correr testes de segurança e as ferramentas de análise disponíveis, com saída real (security-tester)',
      'Consolidar os achados por gravidade, com o que não foi executado, e pedir aprovação antes de corrigir',
      'Corrigir só o aprovado com teste primeiro e voltar a correr os testes de segurança (lead-developer)'],
    ['forge-clarify', 'forge-threat-model', 'forge-security', 'forge-security-testing', 'forge-tdd', 'forge-verify'],
    ['file-system', 'terminal', 'git'], 'Relatório de segurança verificado', 'security-assessment',
    ['Alvo e ambiente indicados e do projecto; cada ameaça priorizada tem teste executado com saída real; ferramentas executadas e não executadas listadas; sem segredos no relatório; nenhuma correcção sem aprovação'],
    [{
      after: [2],
      workers: [
        { step: 3, role: 'secops', skills: ['forge-security'] },
        { step: 4, role: 'security-tester', skills: ['forge-security-testing'] }
      ]
    }]),
  'technical-documentation': flow('Documentação funcional e técnica alinhada com o código real (processo C)', 'Pedido de documentação de um sistema existente',
    ['Mapear o sistema a partir do código: pontos de entrada, módulos, dados e testes (reverse-engineer)',
      'Escrever a documentação funcional: processos, regras, perfis e fluxos de negócio (tech-writer)',
      'Escrever a documentação técnica: módulos, interfaces, dados, configuração, execução e testes (tech-writer)',
      'Comparar uma amostra de afirmações com o código e listar o que ficou por validar',
      'Pedir validação humana por quem conhece o domínio antes de dar por concluído'],
    ['forge-research', 'forge-graph', 'forge-docs', 'forge-prose', 'forge-checkpoint', 'forge-verify'],
    ['file-system', 'git'], 'Documentação validada', 'technical-documentation',
    ['Cada regra ou comportamento tem referência ao código; o inferido e o que ficou por perceber estão assinalados; sem segredos nem valores de configuração reais; validação humana registada'],
    [{
      after: [1],
      workers: [
        { step: 2, role: 'tech-writer', skills: ['forge-docs'] },
        { step: 3, role: 'tech-writer', skills: ['forge-docs'] }
      ]
    }]),
  'change-request': flow('Pedido de alteração a um projecto já concluído, sem repetir o processo completo', 'Pedido de alteração ou nova funcionalidade num projecto existente',
    ['Registar o pedido com número sequencial (CR-NNN) e o resultado pretendido',
      'Analisar o impacto lendo o código e a documentação reais: o que já existe e o que muda',
      'Actualizar requisitos e critérios de aceitação e pedir aprovação do âmbito (validação N1)',
      'Criar um ramo próprio (com autorização) e implementar com testes primeiro, proporcional ao âmbito',
      'Revisão e segurança sempre que o pedido toque autenticação, dependências novas ou entradas externas, com testes de segurança executáveis (forge-security-testing); correr a suite completa',
      'Fazer commits de âmbito restrito, propor o pull request sem fazer merge e arquivar o pedido'],
    ['forge-requirements', 'forge-checkpoint', 'forge-research', 'forge-ground', 'forge-implementation', 'forge-security', 'forge-security-testing', 'forge-verify', 'forge-finish'],
    ['file-system', 'terminal', 'git'], 'Alteração verificada e arquivada', 'change-request',
    ['Cada critério novo tem teste real; suite completa verde; trabalho num ramo próprio; sem merge automático nem push sem autorização; se o pedido exigir reescrever partes largas do sistema, encaminhar para auditoria e documentação em vez deste fluxo']),
  'forge-build': flow('Projecto de ponta a ponta: da ideia ao software testado, seguro e documentado (processo A)', 'Pedido de novo projecto, funcionalidade ou implementação',
    ['Clarificar o pedido: briefing com objectivo, âmbito, restrições e critério de sucesso, com no máximo quatro perguntas (as que mais mudam o resultado, cada uma com recomendação); as restantes ficam como pressupostos a confirmar (product-manager)',
      'Requisitos com critérios de aceitação e validação humana N1 (product-manager)',
      'Arquitectura, stack, modelo de dados, modelo de ameaças e, se houver interface, design system existente ou predefinido, com validação humana N1 (architect, secops e design-system-architect)',
      'Plano de tarefas pequenas com ficheiros, testes e dependências e validação humana N1 (lead-developer)',
      'Criar o ramo de trabalho (nunca implementar em main) e implementar com testes primeiro, uma tarefa de cada vez, pelo especialista da stack (backend-developer, frontend-developer ou database-optimizer) com revisão após cada tarefa (code-critic)',
      'Revisão final do código (code-critic)',
      'Controlo de segurança: Crítico e Elevado devolvem ao passo 5 e repetem os passos 7 a 10 afectados (secops)',
      'Verificação independente dos critérios, da cobertura e, se houver interface, de acessibilidade e validação visual (qa)',
      'Integração contínua e ambiente reprodutível, se a alteração os tocar (devops)',
      'Testes de segurança executáveis e ferramentas de análise contra a aplicação em ambiente local (security-tester)',
      'Documentação actualizada (tech-writer)',
      'Verificar gates, fechar o ramo e pedir autorização antes de publicar'],
    ['forge-clarify', 'forge-requirements', 'forge-checkpoint', 'forge-design-system', 'forge-threat-model', 'forge-plan', 'forge-tdd', 'forge-ground', 'forge-implementation',
      'forge-python', 'forge-dotnet', 'forge-react', 'forge-database', 'forge-audit', 'forge-security', 'forge-security-testing', 'forge-accessibility', 'forge-visual-validation',
      'forge-verify', 'forge-infra', 'forge-docs', 'forge-finish'],
    ['file-system', 'terminal', 'git'], 'Implementação verificada', 'requirements',
    ['Testes reais e rastreabilidade requisito → componente → tarefa → teste; cada passagem de fase tem um registo de validação humana; sem segurança Crítica ou Elevada em aberto; interface sem valores fora dos tokens; não fazer push ou PR sem autorização'],
    [{
      after: [5, 6],
      workers: [
        { step: 7, role: 'secops', skills: ['forge-security'] },
        { step: 8, role: 'qa', skills: ['forge-verify'] },
        { step: 9, role: 'devops', skills: ['forge-infra'] },
        { step: 10, role: 'security-tester', skills: ['forge-security-testing'] }
      ]
    }]),
  'frontend-build': flow('Interface web com design system, acessibilidade e validação visual', 'Pedido de ecrã, componente ou interface web',
    ['Clarificar o pedido e identificar o design system do projecto ou aplicar o predefinido (design-system-architect)',
      'Criar o ramo de trabalho (nunca implementar em main) e implementar componentes e ecrãs com testes primeiro, com estados de carregamento, erro e vazio (frontend-developer)',
      'Verificar acessibilidade WCAG 2.2 AA (accessibility-expert)',
      'Validar o resultado visual nos vários tamanhos de ecrã (ui-visual-validator)',
      'Rever as correcções e confirmar os critérios de aceitação'],
    ['forge-clarify', 'forge-design-system', 'forge-react', 'forge-tdd', 'forge-accessibility', 'forge-visual-validation', 'forge-verify'],
    ['file-system', 'terminal', 'git'], 'Interface verificada', 'frontend-build',
    ['Design system identificado e registado; sem valores visuais fora dos tokens; fluxo percorrido por teclado; diferenças visuais classificadas; o que não foi verificado está indicado'],
    [{
      after: [2],
      workers: [
        { step: 3, role: 'accessibility-expert', skills: ['forge-accessibility'] },
        { step: 4, role: 'ui-visual-validator', skills: ['forge-visual-validation'] }
      ]
    }]),
  'database-optimization': flow('Desenho e otimização de bases de dados SQL, PostgreSQL e MySQL com medição', 'Pedido de consulta lenta, esquema, índices ou migração',
    ['Confirmar motor, versão, ambiente e medição de base (database-optimizer)',
      'Capturar planos de execução e identificar causas com evidência',
      'Propor alterações reversíveis; para esquema ou índices, migração versionada com reversão',
      'Aplicar só o aprovado e comparar antes e depois, com testes de regressão',
      'Registar custo de escrita, concorrência e compatibilidade entre motores'],
    ['forge-clarify', 'forge-database', 'forge-performance', 'forge-tdd', 'forge-verify'],
    ['file-system', 'terminal', 'git'], 'Otimização validada', 'database-optimization',
    ['Medição antes e depois com plano de execução; migração com reversão testada; sem DDL nem EXPLAIN ANALYZE em produção sem aprovação']),
  'agent-build': flow('Construção de agentes de IA e skills com LangChain, LangGraph ou Microsoft Agent Framework', 'Pedido de agente, fluxo multiagente ou skill',
    ['Clarificar com no máximo quatro perguntas, cada uma com uma só decisão e recomendação: objectivo, ambiente, dados permitidos e o que acontece quando o agente falha (as restantes dúvidas ficam como pressupostos)',
      'Escolher o padrão e o framework (fluxo fixo, agente com ferramentas, grafo, multiagente) com forge-tradeoff e confirmar pacotes e versões instalados',
      'Especificar cada agente: competências, faz, limites, entrega, ferramentas com esquema, estado, memória e limites do ciclo',
      'Criar o ramo de trabalho (nunca implementar em main) e implementar com testes primeiro, modelos substituídos por dobles e caminhos de falha (agent-engineer)',
      'Avaliar com cenários reais e comparar com a referência (ai-engineer)',
      'Rever segurança: injecção de instruções, permissões das ferramentas e segredos (secops)',
      'Documentar e pedir aprovação antes de ligar a sistemas reais'],
    ['forge-clarify', 'forge-agent-engineering', 'forge-langchain', 'forge-ms-agent-framework', 'forge-memory', 'forge-prompt-engineering',
      'forge-tradeoff', 'forge-ground', 'forge-tdd', 'forge-ai-engineering', 'forge-security', 'forge-verify'],
    ['file-system', 'terminal', 'git'], 'Agente especificado e testado', 'agent-build',
    ['APIs confirmadas na versão instalada; ciclo com limite e condição de paragem; ferramentas com esquema e aprovação onde há efeitos; avaliação com resultados reais; sem segredos'],
    [{
      after: [4],
      workers: [
        { step: 5, role: 'ai-engineer', skills: ['forge-ai-engineering'] },
        { step: 6, role: 'secops', skills: ['forge-security'] }
      ]
    }]),
  'prompt-engineering': flow('Escrita e melhoria de prompts com avaliação e versões', 'Pedido para criar, melhorar ou depurar um prompt',
    ['Clarificar objectivo, público, formato de saída e exemplos reais, incluindo casos difíceis',
      'Medir o prompt actual contra o conjunto de exemplos (referência)',
      'Alterar uma coisa de cada vez e voltar a medir com os mesmos exemplos',
      'Testar entradas hostis e injecção de instruções',
      'Guardar a versão final com o resultado e o histórico das versões'],
    ['forge-clarify', 'forge-prompt-engineering', 'forge-ai-engineering', 'forge-verify'],
    ['file-system'], 'Prompt avaliado e versionado', 'prompt-engineering',
    ['Prompt corrido contra um conjunto fixo com resultados guardados; comparação com a versão anterior; formato de saída validado']),
  'context-memory-setup': flow('Gestão de contexto e memória do Harness ou de um agente', 'Pedido de gestão de contexto, memória ou continuidade entre sessões',
    ['Medir o uso de contexto actual e o que é carregado em cada sessão (context-manager)',
      'Definir as camadas de memória (trabalho, curta, longa), escopo, retenção e orçamento',
      'Definir regras de resumo, de recuperação por relevância e de aprovação de lições',
      'Testar isolamento, expiração, apagamento e funcionamento sem memória longa',
      'Registar a política e o orçamento medido'],
    ['forge-context', 'forge-memory', 'forge-prompt-engineering', 'forge-verify'],
    ['file-system'], 'Política de contexto e memória', 'context-memory-setup',
    ['Cada camada com escopo, retenção e limite; sem segredos na memória nem nos registos; testes de isolamento, expiração e apagamento com saída real']),
  'system-analysis': flow('Análise AS-IS/TO-BE e impacto', 'Pedido de análise de sistemas',
    ['Mapear AS-IS com evidência', 'Identificar problemas e requisitos', 'Modelar TO-BE e interfaces', 'Analisar gaps, dados, integrações e impacto', 'Validar especificação com interessados'],
    ['forge-requirements', 'forge-research', 'forge-graph', 'forge-verify'],
    ['file-system', 'git'], 'Especificação técnica', 'system-analysis',
    ['Cada afirmação AS-IS tem fonte; impactos e critérios de aceitação rastreáveis']),
  'incident-analysis': flow('Investigação de incidente técnico', 'Pedido de análise de incidente',
    ['Preservar evidência', 'Construir cronologia', 'Identificar causa provável versus confirmada', 'Quantificar impacto', 'Propor acções correctivas e preventivas'],
    ['forge-research', 'forge-fact-check', 'forge-verify'], ['file-system', 'git'],
    'Relatório de incidente', 'incident-report',
    ['Linha temporal sustentada por evidência; não modificar produção sem aprovação'])
};

// Composição: o fluxo grande chama o menor em vez de o repetir. `uses` descreve em que passo, quando
// e que artefacto passa de um para o outro; `validateCatalog` impede ciclos e referências inexistentes.
const composition: Record<string, Workflow['uses']> = {
  'forge-build': [
    { workflow: 'requirements-analysis', step: 2, when: 'os requisitos ainda não estão escritos e aprovados', handoff: 'requirements.md aprovado, com critérios de aceitação' },
    { workflow: 'security-assessment', step: 10, when: 'sempre antes de fechar o ramo', handoff: 'relatório de segurança verificado, sem Crítico nem Elevado em aberto' }
  ],
  'change-request': [
    { workflow: 'security-assessment', step: 5, when: 'o pedido toca autenticação, dependências novas ou entradas externas', handoff: 'relatório de segurança verificado' }
  ],
  'bug-investigation': [
    { workflow: 'change-request', step: 4, when: 'a causa raiz está no código do projecto e a correcção foi autorizada', handoff: 'defeito com causa raiz e teste de regressão planeado: a correcção segue o ramo, os commits e o arquivo do change request' }
  ],
  'incident-analysis': [
    { workflow: 'bug-investigation', step: 5, when: 'a causa confirmada é um defeito de código', handoff: 'relatório de incidente com cronologia, causa e evidência' }
  ],
  'system-analysis': [
    { workflow: 'requirements-analysis', step: 2, when: 'os requisitos ainda não estão numerados', handoff: 'requisitos numerados com critérios de aceitação' }
  ],
  'solution-briefing': [
    { workflow: 'tech-exploration', step: 3, when: 'a decisão depende de uma experiência que ainda não existe', handoff: 'veredicto da experiência com versões e resultados' }
  ],
  'project-status': [
    { workflow: 'risk-review', step: 2, when: 'não existe um registo de riscos actual', handoff: 'registo de riscos com probabilidade, impacto e responsável' }
  ],
  'ai-solution-design': [
    { workflow: 'guardrail-design', step: 3, when: 'sempre', handoff: 'guardrails GR-NN testáveis' }
  ],
  'agent-build': [
    { workflow: 'guardrail-design', step: 3, when: 'o agente usa ferramentas ou dados sensíveis', handoff: 'guardrails GR-NN testáveis' },
    { workflow: 'context-memory-setup', step: 3, when: 'o agente tem memória', handoff: 'política de memória medida' },
    { workflow: 'prompt-engineering', step: 4, when: 'os prompts do agente ainda não foram medidos', handoff: 'prompt versionado com resultados' },
    { workflow: 'ai-evaluation', step: 5, when: 'sempre', handoff: 'resultados reais contra a referência' },
    { workflow: 'red-team', step: 6, when: 'antes de ligar a sistemas reais', handoff: 'corpus de regressão e relatório de red team' }
  ],
  'red-team': [
    { workflow: 'guardrail-design', step: 2, when: 'não existem guardrails escritos', handoff: 'guardrails GR-NN testáveis' }
  ],
  'production-cleanup': [
    { workflow: 'repository-audit', step: 2, when: 'não há relatório de auditoria sobre o mesmo commit', handoff: 'relatório de auditoria com candidatos, evidência e confiança' },
    { workflow: 'technical-documentation', step: 10, when: 'a documentação não corresponde ao código', handoff: 'documentação validada contra o código' }
  ],
  'release-closure': [
    { workflow: 'repository-audit', step: 3, when: 'não há relatório de auditoria sobre o mesmo commit', handoff: 'relatório de auditoria com candidatos aprovados' },
    { workflow: 'security-assessment', step: 6, when: 'não há avaliação de segurança sobre o mesmo commit', handoff: 'relatório de segurança verificado' },
    { workflow: 'sast-remediation', step: 6, when: 'existe um relatório de análise estática por tratar', handoff: 'achados tratados e relatório novo comparado' },
    { workflow: 'technical-documentation', step: 8, when: 'a documentação não corresponde ao código', handoff: 'documentação validada contra o código' },
    { workflow: 'production-cleanup', step: 10, when: 'há candidatos de limpeza aprovados', handoff: 'candidatos aplicados em lotes, com medição' }
  ]
};
for (const [name, uses] of Object.entries(composition)) workflows[name].uses = uses;

export const tools = {
  'file-system': 'Leitura/escrita local, se permitida pelo host; confirmar caminho e permissões',
  git: 'Status/diff/histórico local, quando disponível; push requer aprovação',
  terminal: 'Comandos e testes locais, após confirmar ferramentas e ambiente',
  'web-research': 'Pesquisa externa apenas quando o host a oferecer; verificar fontes e datas',
  'model-api': 'Avaliação/chamada a modelos apenas com provider e credenciais autorizados'
} as const;

const DESIGN_SYSTEM_DEFAULT = `# Design system predefinido

Usar apenas quando o projecto não tem design system próprio (ver forge-design-system). Copiar os tokens para o projecto, por exemplo para um ficheiro de variáveis CSS, e referir sempre os tokens, nunca valores fixos. Adaptar só a cor primária à marca, se for indicada.

## Princípios
- Clareza antes de decoração; hierarquia forte e densidade moderada.
- A cor primária indica acção e foco, nunca sucesso ou erro.
- Todo o ecrã assíncrono tem carregamento, erro e vazio.
- Acessibilidade e teclado fazem parte do componente: contraste mínimo 4.5:1, foco visível, estado nunca só pela cor.

## Tokens (modo claro; o modo escuro redefine os mesmos nomes)
:root {
  --color-bg: #f6f7f9;  --color-surface: #ffffff;  --color-border: #d9dee5;
  --color-text: #1b2430;  --color-text-muted: #556070;
  --color-primary: #2557d6;  --color-primary-hover: #1d46ad;  --color-on-primary: #ffffff;
  --color-success: #17794a;  --color-warning: #8a5a00;  --color-danger: #b42318;  --color-info: #0b6a8f;
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --text-xs: 12px;  --text-sm: 14px;  --text-md: 16px;  --text-lg: 20px;  --text-xl: 28px;
  --space-1: 4px;  --space-2: 8px;  --space-3: 16px;  --space-4: 24px;  --space-5: 32px;  --space-6: 48px;
  --radius-sm: 6px;  --radius-md: 8px;  --radius-lg: 12px;  --radius-pill: 9999px;
  --shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.08);  --shadow-lg: 0 8px 24px rgba(16, 24, 40, 0.16);
  --focus-ring: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-primary);
  --duration-fast: 120ms;  --duration-base: 200ms;
}
Modo escuro sugerido: fundo #0f141b, superfície #171e27, texto #e7ecf2, primária #7da2ff; manter contraste 4.5:1 e validar.
Respeitar prefers-reduced-motion: sem animações não essenciais.

## Layout
Grelha de múltiplos de 8. Pontos de quebra: 640, 768, 1024, 1280 e 1440 px. Largura máxima do conteúdo 1200 px. Em ecrãs pequenos a navegação passa a faixa ou menu e o conteúdo usa margens de 16 px. Hierarquia de página: título, descrição, acções, conteúdo.

## Componentes base
Botão (primário, secundário, perigo, desactivado, a carregar), campo de texto e área de texto (com etiqueta, ajuda e erro), selecção, caixa e opção, interruptor, cartão, tabela (cabeçalhos, ordenação, vazio), separadores, diálogo (foco preso e Escape), aviso e notificação, etiqueta de estado, navegação lateral e superior, indicador de carregamento e esqueleto.
Cada componente documenta variantes e estados: repouso, foco, activo, desactivado, carregamento, erro e vazio.

## Estados semânticos
Sucesso, aviso, erro e informação usam sempre texto e ícone além da cor.
`;

export const templates: Record<string, string> = {
  'project-status': '# Estado do projecto\n\nData e âmbito:\nMarcos concluídos (evidência):\nDesvios e dependências:\nRiscos (impacto, dono):\nDecisões pendentes:\nPróximos passos (responsável, prazo confirmado):\n',
  'meeting-minutes': '# Acta\n\nData, participantes confirmados:\nAgenda:\nDecisões e fonte:\nAcções (responsável, prazo confirmado):\nPontos pendentes:\n',
  'risk-register': '# Riscos\n\n| ID | Evidência | Probabilidade | Impacto | Mitigação | Responsável confirmado | Revisão |\n| --- | --- | --- | --- | --- | --- | --- |\n',
  requirements: '# Requisitos\n\n| ID | Actor | Descrição | Prioridade | Dependências | Critério de aceitação | Aprovação |\n| --- | --- | --- | --- | --- | --- | --- |\n',
  'solution-brief': '# Briefing de solução\n\nResultado de negócio pretendido (não a solução):\nQuem decide e até quando:\nRestrições confirmadas (orçamento, prazo, sistemas, dados, conformidade):\nCritérios e pesos (fixados antes de pontuar):\n\n| Opção | Como responde à necessidade | Custo (fonte/estimativa) | Esforço | Risco | Reversibilidade | Dependência de fornecedor |\n| --- | --- | --- | --- | --- | --- | --- |\n| Manter o estado actual | | | | | | |\n\nRecomendação e fundamentação:\nRisco aceite com esta recomendação:\nO que inverteria esta decisão:\nPróximo passo e aprovação pendente:\nDecisão registada em (usar `decision-record.md`):\n',
  'decision-record': '# ADR NNNN — <título da decisão>\n\nData:\nEstado: proposta | aceite | substituída por ADR NNNN\nDecisores confirmados:\n\n## Contexto\nNecessidade, restrições e evidência (caminho/fonte):\n\n## Opções consideradas\n1. Manter o estado actual —\n2. —\n3. —\n\n## Decisão\nOpção escolhida e porquê:\n\n## Consequências\nPositivas:\nNegativas e risco aceite:\nO que passa a ser verificado:\n\n## Revisão\nQuando e com que critério reavaliar:\n',
  'automation-plan': '# Plano de automação\n\nProcesso actual (passos, responsáveis, sistemas):\nVolumetria (frequência, duração, erros — medido ou estimativa):\nExcepções conhecidas:\n\nViabilidade:\n| Requisito | Disponível? | Evidência | Bloqueio |\n| --- | --- | --- | --- |\n| Acesso aos dados | | | |\n| API/integração | | | |\n| Permissões | | | |\n| Ambiente de teste | | | |\n\nDesenho da automação:\nO que permanece decisão humana:\nModo de falha e recurso manual:\nCusto de construção e de manutenção:\nRetorno estimado e pressupostos:\nPlano de adopção e aprovação pendente:\n',
  'tech-exploration': '# Exploração técnica\n\nPergunta a responder:\nDecisão que isto desbloqueia:\nCritério de decisão (definido antes):\nTempo fixado e fora de âmbito:\nO que já existe aqui / estado da arte (fontes):\n\nExperiência executada:\n| Passo | Comando | Versões | Resultado real |\n| --- | --- | --- | --- |\n\nO que falhou ou ficou por responder:\nCusto e limitações observadas:\nVeredicto: adoptar | testar | avaliar | descartar — porquê:\nCódigo descartável a remover ou promover:\nLição a propor (`--scope`, `--anchor`):\n',
  'improvement-plan': '# Plano de melhoria contínua\n\nPeríodo e âmbito:\nFontes de evidência (registos, incidentes, operações):\n\nObservações:\n| ID | Observação | Evidência | Sistémica ou isolada |\n| --- | --- | --- | --- |\n\nMelhorias priorizadas:\n| ID | Melhoria | Impacto | Esforço | Responsável | Como se verifica |\n| --- | --- | --- | --- | --- | --- |\n\nLições a propor (âmbito e âncora):\nO que foi decidido não fazer e porquê:\n',
  'ai-design': '# Solução IA\n\nCaso de uso e dados permitidos:\nAlternativas de modelos (fonte, custo conhecido):\nArquitectura, tools, RAG:\nDataset e avaliação:\nGuardrails, privacidade e observabilidade:\nDeployment e riscos:\nDecisões a aprovar:\n',
  'ai-evaluation': '# Avaliação IA\n\nDataset e origem:\nModelo/versão e parâmetros:\nBaseline:\nMétricas e resultados reais:\nErros/limitações:\nComparação antes/depois:\n',
  'bug-report': '# Investigação de bug\n\nReprodução:\nEvidência (ficheiro:linha/log):\nCausa raiz (confirmada/inferida):\nTeste de regressão:\nCorrecção (se aprovada):\nValidação real:\n',
  'repository-audit': '# Auditoria do repositório\n\nÂmbito e áreas não inspecionadas:\n| ID | Categoria | Ficheiro:linha | Impacto | Confiança (EXTRACTED/INFERRED/AMBIGUOUS) | Recomendação |\n| --- | --- | --- | --- | --- | --- |\nAprovações para mudanças:\n',
  'frontend-build': '# Interface\n\nDesign system usado (existente | predefinido) e onde está:\nEcrãs e componentes:\nEstados (carregamento, erro, vazio):\nAcessibilidade (verificado / por verificar):\nValidação visual (larguras, modos, diferenças):\n',
  'database-optimization': '# Base de dados\n\nMotor e versão:\nMedição de base (consulta, latência, linhas):\nPlano de execução e causa:\nProposta (reversível) e migração com reversão:\nMedição depois:\nCusto de escrita, concorrência e compatibilidade:\n',
  'agent-build': '# Agente\n\nObjectivo e ambiente:\nPadrão e framework escolhidos (versões confirmadas):\nAgentes (competências, faz, limites, entrega):\nFerramentas (esquema, aprovação):\nEstado e memória:\nLimites do ciclo:\nAvaliação (cenários e resultados reais):\nSegurança:\n',
  'prompt-engineering': '# Prompt\n\nObjectivo e critério de sucesso:\nConjunto de exemplos (incluindo hostis):\nVersões (texto, resultado, alteração):\nFormato de saída e validação:\nVersão final:\n',
  'context-memory-setup': '# Contexto e memória\n\nUso de contexto medido:\nCamadas (trabalho, curta, longa): escopo, retenção, limite:\nResumo e recuperação (regras e orçamento):\nLições (aprovação):\nTestes (isolamento, expiração, apagamento):\n',
  'design-system-default': DESIGN_SYSTEM_DEFAULT,
  'release-closure': '# Fecho da versão — checklist\n\nVersão actual → proposta (tipo SemVer e justificação):\nRamo e linha de base:\n\nEstado de cada área: OK / pendente / não aplicável / não testado (com a razão e a evidência).\n\n| # | Área | Estado | Evidência (comando e saída, ficheiro ou ligação) |\n| --- | --- | --- | --- |\n| 1 | Requisitos e pendentes (funcionais, não funcionais, bugs, débitos, coerência com o código) | | |\n| 2 | Limpeza do código e das dependências (morto, duplicado, avisos do compilador e do linter) | | |\n| 3 | Base de dados (estrutura, consultas, índices, migrações, backups e recuperação) | | |\n| 4 | Otimização da aplicação (desempenho, API, caching, bundle, regressões) | | |\n| 5 | Documentação (obsoleta, histórica, README, instalação, exemplos, APIs) | | |\n| 6 | Segurança (acessos, entradas, dependências, segredos, cabeçalhos, logs, análises) | | |\n| 7 | Design system, UX e UI (consistência, estados, formulários, acessibilidade, dispositivos) | | |\n| 8 | Testes unitários, de integração e de regressão (casos-limite, permissões, integrações) | | |\n| 9 | Testes E2E com Playwright (fluxos, erros, estados, instabilidade, relatório) | | |\n| 10 | Git e ramos (integrado no ramo principal, ramos limpos, suite verde na versão final) | | |\n| 11 | Versionamento e changelog (SemVer, versão em todos os locais, notas) | | |\n| 12 | Commit, tag e publicação (só com autorização expressa) | | |\n| 13 | Validação pós-release e rollback (deploy, fumo, versão em execução, reversão) | | |\n| 14 | Relatório final de pendentes e riscos | | |\n\nCritério de publicação: sem bugs críticos nem vulnerabilidades críticas conhecidos; testes obrigatórios a passar; alterações integradas; documentação actualizada; versão identificada. Excepções (descrição, aprovador, data):\n\nAutorização para commit, tag e publicação (quem, quando):\n\nRelatório final:\n- Alterações e bugs (estado):\n- Pendentes (requisitos e tarefas):\n- Testes (unitários, integração, E2E) e cobertura; falhas não resolvidas:\n- Segurança e desempenho:\n- Versão, commit e tag:\n- Riscos conhecidos, limitações e acções futuras:\n',
  'sast-remediation': '# Tratamento do relatório SAST\n\nFerramenta, formato e data do relatório:\nCódigo analisado (ramo e commit) e correspondência com o actual:\n\n| ID | Regra | Gravidade | CWE | Origem → destino (ficheiro:linha) | Estado (corrigido, falso positivo aprovado, por esclarecer, adiado) | Evidência (teste, commit, justificação) | Confiança |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n\nAgrupamento por causa-raiz:\nFalsos positivos e quem os aprovou:\nAdiados (razão e prazo):\n\nReanálise: relatório novo, resolvidos, persistentes, novos:\n',
  'edge-modernization': '# Modernização para o Edge\n\nAplicação, navegadores suportados e linha de base:\n\n| # | Construção legada | Ficheiro:linha | Acção (remover, substituir, reescrever, bloqueado) | Estado | Teste |\n| --- | --- | --- | --- | --- | --- |\n\nContagem antes → depois:\nConfiguração fora do código (lista do modo IE, cabeçalhos, políticas; entregue a quem):\nValidação no Edge (suite, ponta a ponta, acessibilidade, modo padrão):\nOptimização (medição antes → depois):\nPlano de reversão e autorização para desligar a compatibilidade:\n',
  'guardrails': '# Guardrails\n\nCaso de uso, dados permitidos e o que nunca pode acontecer:\n\n| ID | Camada (entrada, contexto, ferramentas, saída, dados, escalada) | Regra | Verificação (teste ou automática) | Acção ao falhar | Imposta em código ou só instrução |\n| --- | --- | --- | --- | --- | --- |\n| GR-01 | | | | | |\n\nRisco aceite (quem aprovou, quando):\n',
  'red-team': '# Red team\n\nAutorização, alvo e ambiente:\nGuardrails e modelo de ameaças usados:\n\n| Caso | Categoria | Entrada | Esperado | Observado (3 execuções) | Veredicto (resistiu, falhou, inconclusivo) | Gravidade |\n| --- | --- | --- | --- | --- | --- | --- |\n\nAchados aprovados para correcção:\nTestes de regressão criados:\nNova execução (resultado comparado):\nO que não foi testado e porquê:\n',
  'production-cleanup': '# Limpeza e produção\n\nAmbiente alvo e o que é intocável:\nLinha de base (suite, build, tamanho, tempo):\nCandidatos (caminho, evidência, confiança, risco, decisão):\nSegurança para produção:\nOtimizações (medição antes e depois):\nEntrega (configuração, registo, saúde, build, imagem):\nDocumentação actualizada e removida:\nLotes e commits:\n',
  'security-assessment': '# Avaliação de segurança\n\nAlvo e ambiente (do projecto, local ou de teste):\nModelo de ameaças (activos, fronteiras, ameaças priorizadas, mitigação, teste):\nRevisão de código (achado, gravidade, ficheiro:linha, confiança):\nTestes executados (comando e saída real):\nFerramentas não executadas e porquê:\nRiscos aceites (quem decidiu):\nCorrecções aprovadas e verificação:\n',
  'technical-documentation': '# Documentação\n\nÂmbito e público:\n\n## Funcional\nProcessos, regras e perfis (ficheiro de cada regra):\n\n## Técnica\nMódulos, interfaces, dados, configuração, execução e testes (ficheiro de cada afirmação):\n\nInferido (INFERRED) e por perceber (AMBIGUOUS):\nAmostra comparada com o código:\nValidação humana (quem, quando):\n',
  'change-request': '# Pedido de alteração CR-NNN\n\nResultado pretendido:\nImpacto (o que já existe, o que muda, evidência):\nRequisitos e critérios de aceitação novos:\nAprovação do âmbito (quem, quando):\nRamo e testes:\nCommits, pull request e estado (pendente | implementado):\n',
  'system-analysis': '# Análise de sistemas\n\nAS-IS (evidência):\nProblemas:\nRequisitos:\nTO-BE:\nGaps:\nIntegrações/APIs e dados:\nImpacto e riscos:\nEspecificação e validação:\n',
  'incident-report': '# Incidente\n\nÂmbito e evidência preservada:\nCronologia:\nCausa (confirmada/inferida):\nImpacto:\nAcção correctiva (aprovação):\nPrevenção e verificação:\n'
};

export function validateCatalog(): void {
  for (const [id, profile] of Object.entries(profiles)) {
    if (!profile.workflows.length || !profile.workflows.every(name => name in workflows)) throw new Error(`Perfil inválido: ${id}`);
  }
  for (const [name, workflow] of Object.entries(workflows)) {
    if (!workflow.steps.length || !workflow.validation.length || !workflow.skills.length ||
      !workflow.tools.every(tool => tool in tools) || !(workflow.template in templates)) {
      throw new Error(`Workflow inválido: ${name}`);
    }
    const parallelSteps = new Set<number>();
    for (const group of workflow.parallelGroups) {
      const workerSteps = group.workers.map(worker => worker.step);
      if (group.workers.length < 2 ||
        workerSteps.some(step => !Number.isInteger(step) || step < 1 ||
          step > workflow.steps.length || parallelSteps.has(step)) ||
        group.after.length === 0 ||
        group.after.some(step => !Number.isInteger(step) || step < 1 ||
          step >= Math.min(...workerSteps)) ||
        new Set(group.after).size !== group.after.length) {
        throw new Error(`Grupo paralelo inválido: ${name}`);
      }
      for (const step of workerSteps) parallelSteps.add(step);
    }
    for (const use of workflow.uses) {
      if (!(use.workflow in workflows) || use.workflow === name || !Number.isInteger(use.step) ||
        use.step < 1 || use.step > workflow.steps.length || !use.when.trim() || !use.handoff.trim()) {
        throw new Error(`Composição inválida: ${name} → ${use.workflow}`);
      }
    }
  }
  // Os sub-fluxos não podem formar ciclos.
  const visiting = new Set<string>();
  const done = new Set<string>();
  const visit = (name: string): void => {
    if (done.has(name)) return;
    if (visiting.has(name)) throw new Error(`Composição circular em ${name}`);
    visiting.add(name);
    for (const use of workflows[name].uses) visit(use.workflow);
    visiting.delete(name);
    done.add(name);
  };
  for (const name of Object.keys(workflows)) visit(name);
}
