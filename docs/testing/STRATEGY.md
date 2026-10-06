# Estratégia de testes e avaliação

O objectivo dos testes é confirmar os contratos do instalador, do catálogo, do encaminhamento e do armazenamento local. Os testes não afirmam a qualidade nem a veracidade dos textos produzidos por modelos.

## Camadas de teste

- **Testes unitários (`npm test`):** verificam as referências entre perfis, fluxos, competências, ferramentas e modelos; a classificação de intenções; a validação dos registos; a recuperação de contexto; e os limites de coordenação.
- **Testes de integração:** instalam o kit nos quatro CLIs, comparam as propostas com os ficheiros gerados, rejeitam combinações inválidas e verificam actualizações, remoção, preservação do estado e conflitos.
- **Testes de regressão:** executam os testes de encaminhamento, memória, instalação, actualização e operações no mesmo comando `npm test`.
- **Teste de empacotamento (`npm run smoke`):** cria um arquivo distribuível, instala-o num projeto temporário e testa `install`, perfil do operador, `plan`, contexto, `insights`, estado e `uninstall`. Confirma que não faltam módulos no pacote e que não são incluídos testes nem mapas de origem.
- **Avaliação de respostas de modelos:** exige conjuntos de dados autorizados, critérios explícitos e métricas reproduzíveis. Não é executada pela suite actual.

## Matriz de cobertura

| Perfil | Competência partilhada | Fluxo | Cenário | Resultado esperado |
| --- | --- | --- | --- | --- |
| Gestor de projetos | `forge-verify` | `project-status` | Estado do projeto | Relatório com progresso sustentado por evidência |
| Engenheiro de IA | `forge-research` | `ai-solution-design` | Solução de IA com recuperação aumentada | Requisitos e ferramentas não presumidos |
| Programador sénior | `forge-audit` | `repository-audit` | Auditoria de repositório | Recomendações antes de qualquer alteração |
| Editor | `forge-fact-check` | `magazine-article` | Artigo para revista | Factos e opiniões identificados separadamente |
| Estudante | `forge-fact-check` | `academic-research` | Investigação académica | Referências verificáveis |
| Analista de sistemas | `forge-requirements` | `system-analysis` | Análise do estado actual e futuro | Lacunas e impactos identificados |
| Gestor de projetos de SI | `forge-tradeoff` | `solution-briefing` | Comprar ou desenvolver | Opções, situação actual e registo de decisão |
| Gestor de projetos de SI | `forge-spike` | `tech-exploration` | Prova de conceito | Conclusão apoiada por experiência executada |
| Gestor de projetos de SI | `forge-context` | `continuous-improvement` | Retrospectiva | Melhorias com evidência e lições pendentes |

Os testes do perfil do operador verificam validação e persistência, preservação de actualizações parciais, desempate determinístico de pedidos híbridos e manutenção do erro quando a preferência não corresponde aos perfis candidatos. Verificam também que uma postura cautelosa reforça o raciocínio e que uma postura exploratória não reduz os controlos.

Os testes de operações verificam a agregação de execuções registadas, a identificação de erros repetidos com números de linha e a rejeição de registos malformados. Os testes de contexto confirmam que o orçamento estimado é respeitado e que as lições omitidas são comunicadas.

## Execução

```bash
npm test
npm run smoke
```

Não declarar como aprovado um teste de conteúdo gerado por modelo sem executar uma avaliação externa adequada. Os identificadores `PASS`, `FAIL` e `PARTIAL` são resultados de verificações concretas; cada resultado deve indicar o comando executado e a saída observada.
