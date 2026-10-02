# Estratégia de testes e avaliação

- **Unitários:** catálogo fecha todas as referências role -> workflow -> skill/tool/template, classificação de intenções e ambiguidade; validação do registo de eventos.
- **Workflow/integração:** instalar nas quatro superfícies, comparar proposta com artefactos gerados, rejeitar workflow fora do role, remover preservando estado, lições e ownership.
- **Regressão:** os testes existentes de routing, memória, instalação e upgrade continuam no mesmo `npm test`.
- **Empacotamento (`npm run smoke`):** embala com `npm pack`, instala o tarball num projeto limpo e exercita `install`, `operator set/show`, `plan`, `status` e `uninstall` a partir do pacote publicável. Cobre o que `npm test` não pode cobrir: módulos ausentes do campo `files`, artefactos obsoletos em `dist/` e source maps publicados por engano — todos detetados desta forma na versão 0.7.0. Inclui a asserção de que um pedido híbrido resolve pelo perfil do operador **e** que, sem perfil, o erro de ambiguidade se mantém.
- **Prompt/avaliação real:** asserções testam forma, rotas e guardrails dos prompts gerados, **não** a qualidade de respostas de modelos nem veracidade de pesquisas externas. Avaliação de IA requer dataset, modelo, credenciais, aprovação e métricas reproduzíveis — backlog.

| Role | Skill reutilizada | Workflow | Input | Esperado no teste |
| --- | --- | --- | --- | --- |
| Gestor de Projectos | forge-verify | project-status | estado do projecto | template e validação com evidência |
| AI Engineer | forge-research | ai-solution-design | solução IA/RAG | requisitos e tools não assumidas |
| Senior Developer | forge-audit | repository-audit | auditoria repo | recomendações antes de mudanças |
| Editor | forge-fact-check | magazine-article | artigo revista | fontes/factos separados |
| Estudante | forge-fact-check | academic-research | pesquisa académica | fontes verificáveis |
| Analista | forge-requirements | system-analysis | AS-IS/TO-BE | gaps e impacto |
| Gestor de Projectos de SI | forge-tradeoff | solution-briefing | comprar ou construir | opções, linha de base "não mudar", ADR |
| Gestor de Projectos de SI | forge-spike | tech-exploration | prova de conceito | veredicto suportado por experiência |
| Gestor de Projectos de SI | forge-context | continuous-improvement | retrospectiva | melhorias com evidência e lições candidatas |

Testes do perfil de operador (`src/tests/operator.test.ts`): validação e persistência do perfil, rejeição de perfil/postura/idioma inválidos, preservação parcial do perfil numa alteração, desempate determinístico de pedidos híbridos (e manutenção do erro quando a preferência não cobre os candidatos), e a invariante de segurança de que **a postura só escala** — `cautious` força `thinking` numa tarefa aprovada e delimitada, `exploratory` não baixa o nível de um pedido de risco.

Executar `npm test` e `npm pack --dry-run`. Não marcar testes de conteúdo gerado por LLM como PASS sem executar avaliação externa.
