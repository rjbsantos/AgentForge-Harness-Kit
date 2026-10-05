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
        workflows: ['ai-solution-design', 'ai-evaluation', 'requirements-analysis']
    },
    'senior-developer': {
        title: 'Programador Sénior',
        agent: 'lead-developer',
        workflows: ['bug-investigation', 'repository-audit', 'forge-build']
    },
    'magazine-editor': {
        title: 'Escritor / Editor de Revistas',
        agent: 'editor',
        workflows: ['magazine-article']
    },
    'university-student': {
        title: 'Estudante Universitário',
        agent: 'academic-tutor',
        workflows: ['academic-research', 'study-session']
    },
    'systems-analyst': {
        title: 'Analista de Sistemas',
        agent: 'systems-analyst',
        workflows: ['system-analysis', 'incident-analysis', 'requirements-analysis']
    }
};
const flow = (description, trigger, steps, skills, tools, output, template, validation, parallelGroups = []) => ({
    description, trigger,
    preconditions: ['Confirmar objetivo, limites, aprovações e ferramentas disponíveis'],
    inputs: ['Pedido do utilizador', 'Artefactos fornecidos e estado atual'],
    steps, skills, tools, output, template, validation,
    errorHandling: 'Parar, indicar informação ou ferramenta indisponível e pedir uma decisão; não inventar resultados',
    parallelGroups,
    postcondition: 'Entregar um resultado verificável e registar o próximo passo no contexto ativo'
});
export const workflows = {
    'project-status': flow('Relatório do progresso, riscos e próximos marcos', 'Pedido de estado do projecto', ['Recolher marcos, trabalho concluído e evidência', 'Analisar desvios, riscos e dependências', 'Validar responsáveis e preparar relatório'], ['forge-research', 'forge-verify'], ['file-system'], 'Relatório de estado', 'project-status', ['Cada progresso tem evidência e data; incerteza e decisões pendentes identificadas']),
    'meeting-followup': flow('Acta e acções rastreáveis', 'Pedido de acta ou follow-up', ['Identificar decisões registadas', 'Atribuir acções, responsáveis e prazos confirmados', 'Rever o resumo com participantes'], ['forge-verify'], ['file-system'], 'Acta e plano de acções', 'meeting-minutes', ['Não inventar participantes, acordos ou responsáveis']),
    'risk-review': flow('Identificar, priorizar e monitorizar riscos', 'Pedido de riscos do projecto', ['Identificar riscos com fonte', 'Avaliar probabilidade e impacto com critérios explícitos', 'Propor mitigação e responsáveis para aprovação'], ['forge-research', 'forge-verify'], ['file-system'], 'Registo de riscos', 'risk-register', ['Riscos verificáveis; aprovação para custos e mudanças']),
    'requirements-analysis': flow('Requisitos testáveis e plano', 'Novo pedido de requisitos', ['Clarificar actores e limites', 'Priorizar requisitos e dependências', 'Definir critérios de aceitação e pedir aprovação'], ['forge-requirements', 'forge-verify'], ['file-system'], 'Requisitos rastreáveis', 'requirements', ['Todos os Must têm ID e aceitação testável']),
    'solution-briefing': flow('Necessidade de negócio traduzida em opções comparáveis e decisão registada', 'Pedido de caso de negócio, análise de opções ou build vs buy', ['Separar o resultado de negócio pretendido da solução já sugerida e identificar quem decide',
        'Levantar restrições reais: orçamento, prazo, sistemas existentes, dados, conformidade e competências',
        'Construir opções que incluam construir, comprar, integrar e manter o estado actual',
        'Comparar com critérios fixados antes da pontuação: custo, risco, esforço, reversibilidade e dependência de fornecedor',
        'Recomendar uma opção, nomear o risco aceite e registar a decisão'], ['forge-requirements', 'forge-research', 'forge-tradeoff', 'forge-verify'], ['file-system', 'web-research'], 'Briefing de solução e registo de decisão', 'solution-brief', ['Opção de não mudar avaliada; cada valor tem fonte ou está marcado como estimativa; recomendação indica o que a inverteria']),
    'automation-opportunity': flow('Avaliação de uma oportunidade de automação, do processo ao retorno', 'Pedido de automação de um processo ou tarefa repetitiva', ['Descrever o processo actual com passos, responsáveis, sistemas e excepções conhecidas',
        'Medir frequência, duração e taxa de erro com dados; marcar o que é estimativa',
        'Avaliar viabilidade: acesso a dados, APIs, permissões, ambientes e tratamento de excepções',
        'Desenhar a automação e delimitar explicitamente o que permanece decisão humana',
        'Estimar retorno, custo de manutenção, modo de falha e plano de adopção'], ['forge-research', 'forge-tradeoff', 'forge-verify'], ['file-system', 'terminal'], 'Plano de automação', 'automation-plan', ['Esforço actual medido ou declarado como estimativa; excepções e recurso humano definidos; retorno nunca afirmado sem base']),
    'tech-exploration': flow('Exploração delimitada de uma tecnologia com experiência real e veredicto', 'Pedido de spike, prova de conceito ou avaliação de nova tecnologia', ['Escrever a pergunta e o critério de decisão antes de experimentar',
        'Fixar o tempo, o âmbito e o que fica de fora',
        'Rever o que já existe no projecto e o estado da arte antes de construir',
        'Executar a experiência mínima e registar versões, comandos e o que falhou',
        'Concluir com veredicto adoptar, testar, avaliar ou descartar e capturar a lição com âmbito e âncora'], ['forge-research', 'forge-spike', 'forge-tradeoff', 'forge-verify'], ['file-system', 'terminal', 'web-research', 'model-api'], 'Relatório de exploração com veredicto', 'tech-exploration', ['Veredicto suportado por experiência executada com versões registadas; limitações, custo e código descartável identificados']),
    'continuous-improvement': flow('Retrospectiva orientada a evidência que gera melhorias e lições', 'Pedido de retrospectiva, lições aprendidas ou melhoria contínua', ['Delimitar o período, o trabalho e as fontes de evidência em análise',
        'Executar `agentforge insights` para agregar execuções verificadas; analisar incidentes, desvios e retrabalho a partir de evidência, não de memória',
        'Separar causas sistémicas de ocorrências isoladas',
        'Priorizar melhorias por impacto e esforço, com responsável e critério de verificação',
        'Converter apenas o que generaliza em lição com âmbito e âncora para aprovação'], ['forge-research', 'forge-context', 'forge-verify'], ['file-system', 'git'], 'Plano de melhoria', 'improvement-plan', ['Cada melhoria tem evidência, impacto e responsável; lições respeitam a fasquia de generalização e não são promovidas automaticamente']),
    'ai-solution-design': flow('Arquitectura de IA com validação e guardrails', 'Pedido de desenho de solução IA', ['Definir casos de uso e dados permitidos', 'Comparar modelos, RAG, embeddings e ferramentas com evidência', 'Definir avaliação, segurança, custos e deploy', 'Rever arquitectura com o utilizador'], ['forge-requirements', 'forge-research', 'forge-routing', 'forge-verify'], ['file-system', 'model-api'], 'Desenho de solução IA', 'ai-design', ['Critérios mensuráveis; modelo e APIs confirmados; dados e permissões documentados']),
    'ai-evaluation': flow('Avaliação reproduzível de sistema IA', 'Pedido de avaliação de modelo ou RAG', ['Definir dataset e baseline', 'Executar só com acesso autorizado', 'Medir métricas e erros', 'Propor melhorias e repetir comparação'], ['forge-research', 'forge-verify'], ['file-system', 'model-api'], 'Relatório de avaliação', 'ai-evaluation', ['Dataset, versão, métricas e limites registados; sem alegar execução sem output']),
    'bug-investigation': flow('Diagnóstico e correcção de defeito', 'Pedido de análise de erro', ['Reproduzir a falha', 'Isolar causa raiz com logs e código', 'Planear teste de regressão', 'Implementar só se autorizado; executar suite e rever'], ['forge-research', 'forge-graph', 'forge-ground', 'forge-implementation', 'forge-verify'], ['file-system', 'terminal', 'git'], 'Relatório e correcção validada', 'bug-report', ['Reprodução e teste de regressão documentados']),
    'repository-audit': flow('Auditoria técnica com recomendações', 'Pedido de auditoria ao repositório', ['Mapear arquitectura, limites e testes',
        'Inspeccionar qualidade, manutenibilidade e regressões com evidência',
        'Identificar código, ficheiros e dependências potencialmente mortos ou obsoletos, verificando referências dinâmicas e pontos de entrada',
        'Inspeccionar segurança com evidência',
        'Inspeccionar desempenho com evidência',
        'Consolidar candidatos com caminhos dentro da raiz do projecto, evidência, confiança e risco de falsos positivos',
        'Pedir aprovação antes de alterar código'], ['forge-audit', 'forge-hygiene', 'forge-graph', 'forge-research', 'forge-performance', 'forge-verify'], ['file-system', 'git', 'terminal'], 'Relatório de auditoria', 'repository-audit', ['Todos os achados têm caminho dentro do projecto, evidência, impacto e confiança; código dinâmico e pontos de entrada foram considerados; nenhuma remoção é feita sem aprovação'], [{
            after: [1],
            workers: [
                { step: 2, role: 'code-critic', skills: ['forge-audit'] },
                { step: 3, role: 'secops', skills: ['forge-audit'] },
                { step: 4, role: 'reverse-engineer', skills: ['forge-performance'] }
            ]
        }]),
    'forge-build': flow('Construção aprovada com testes e revisão', 'Pedido de implementação', ['Aprovar requisitos e arquitectura', 'Planeamento e TDD', 'Revisão e QA independentes', 'Verificar gates e aprovação para publicação'], ['forge-requirements', 'forge-ground', 'forge-implementation', 'forge-verify'], ['file-system', 'terminal', 'git'], 'Implementação verificada', 'requirements', ['Testes reais e rastreabilidade; não fazer push ou PR sem autorização']),
    'magazine-article': flow('Artigo editorial com fontes e fact-check', 'Pedido de artigo para revista', ['Definir público, pauta e tom', 'Pesquisar e registar fontes', 'Separar factos, opinião e inferência', 'Escrever, rever e validar citações', 'Pedir aprovação editorial'], ['forge-research', 'forge-fact-check', 'forge-verify'], ['file-system', 'web-research'], 'Artigo revisto', 'magazine-article', ['Factos rastreáveis a fontes; afirmações não confirmadas marcadas']),
    'academic-research': flow('Pesquisa académica com referências verificadas', 'Pedido de investigação universitária', ['Formular pergunta e método', 'Procurar e validar fontes', 'Analisar literatura', 'Sintetizar com referências verificadas e limitações'], ['forge-research', 'forge-fact-check', 'forge-verify'], ['file-system', 'web-research'], 'Síntese académica', 'academic-research', ['Referências existem e foram verificadas; integridade académica respeitada']),
    'study-session': flow('Sessão de estudo e autoavaliação', 'Pedido de estudo ou preparação para exame', ['Definir objectivos e material autorizado', 'Explicar conceitos', 'Criar perguntas e exercícios', 'Corrigir com explicação e identificar lacunas'], ['forge-research', 'forge-verify'], ['file-system'], 'Guia de estudo', 'study-guide', ['Separar explicação de factos não confirmados; feedback justificado']),
    'system-analysis': flow('Análise AS-IS/TO-BE e impacto', 'Pedido de análise de sistemas', ['Mapear AS-IS com evidência', 'Identificar problemas e requisitos', 'Modelar TO-BE e interfaces', 'Analisar gaps, dados, integrações e impacto', 'Validar especificação com interessados'], ['forge-requirements', 'forge-research', 'forge-graph', 'forge-verify'], ['file-system', 'git'], 'Especificação técnica', 'system-analysis', ['Cada afirmação AS-IS tem fonte; impactos e critérios de aceitação rastreáveis']),
    'incident-analysis': flow('Investigação de incidente técnico', 'Pedido de análise de incidente', ['Preservar evidência', 'Construir cronologia', 'Identificar causa provável versus confirmada', 'Quantificar impacto', 'Propor acções correctivas e preventivas'], ['forge-research', 'forge-fact-check', 'forge-verify'], ['file-system', 'git'], 'Relatório de incidente', 'incident-report', ['Linha temporal sustentada por evidência; não modificar produção sem aprovação'])
};
export const tools = {
    'file-system': 'Leitura/escrita local, se permitida pelo host; confirmar caminho e permissões',
    git: 'Status/diff/histórico local, quando disponível; push requer aprovação',
    terminal: 'Comandos e testes locais, após confirmar ferramentas e ambiente',
    'web-research': 'Pesquisa externa apenas quando o host a oferecer; verificar fontes e datas',
    'model-api': 'Avaliação/chamada a modelos apenas com provider e credenciais autorizados'
};
export const templates = {
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
    'magazine-article': '# Artigo\n\nPauta, público e tom:\nTítulo e subtítulo:\nTexto:\nFactos (fonte verificável):\nOpiniões/inferências:\nPor confirmar:\nRevisão editorial:\n',
    'academic-research': '# Pesquisa académica\n\nQuestão e método:\nFontes verificadas (autor, título, URL/DOI, data):\nSíntese crítica:\nLimitações:\nReferências:\n',
    'study-guide': '# Guia de estudo\n\nObjectivos:\nConceitos e fontes:\nExplicação:\nFlashcards:\nExercícios e soluções explicadas:\nPontos a rever:\n',
    'system-analysis': '# Análise de sistemas\n\nAS-IS (evidência):\nProblemas:\nRequisitos:\nTO-BE:\nGaps:\nIntegrações/APIs e dados:\nImpacto e riscos:\nEspecificação e validação:\n',
    'incident-report': '# Incidente\n\nÂmbito e evidência preservada:\nCronologia:\nCausa (confirmada/inferida):\nImpacto:\nAcção correctiva (aprovação):\nPrevenção e verificação:\n'
};
export function validateCatalog() {
    for (const [id, profile] of Object.entries(profiles)) {
        if (!profile.workflows.length || !profile.workflows.every(name => name in workflows))
            throw new Error(`Perfil inválido: ${id}`);
    }
    for (const [name, workflow] of Object.entries(workflows)) {
        if (!workflow.steps.length || !workflow.validation.length || !workflow.skills.length ||
            !workflow.tools.every(tool => tool in tools) || !(workflow.template in templates)) {
            throw new Error(`Workflow inválido: ${name}`);
        }
        const parallelSteps = new Set();
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
            for (const step of workerSteps)
                parallelSteps.add(step);
        }
    }
}
//# sourceMappingURL=capabilities.js.map