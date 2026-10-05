# Guia de operação e observabilidade

## Preparar um plano

`agentforge plan --project <pasta> --cli codex --prompt "Faz uma pesquisa académica"` devolve uma proposta com perfil, fluxo, agente, competências, ferramentas necessárias, passos, critérios de validação, modelo de saída, recomendação de modelo e coordenação prevista.

Se o pedido for ambíguo, indique `--role` e, quando necessário, `--workflow`. O comando `route` permanece disponível para classificar tarefas sem seleccionar um fluxo. Uma proposta não prova que o trabalho foi executado.

## Registar uma execução

Após executar o trabalho e validar o resultado, registe manualmente a execução:

```bash
agentforge record --project <projeto> --role university-student --workflow academic-research --result passed --validation passed --duration-ms 1200 --tools file-system,web-research --skills forge-research,forge-fact-check --tokens 300 --cost 0.01
```

O ficheiro local `.agentforge/work/operations.jsonl` regista a data e hora, o perfil, o agente, o fluxo, as competências previstas e executadas, as ferramentas declaradas, a duração, o resultado, a validação, as repetições e, se fornecidos, tokens, custo e código de erro. Não guarda o pedido, fontes, nomes pessoais ou segredos. Um resultado `passed` exige `validation: passed`, mas a exactidão do registo continua a depender de quem o introduz. Não existe recolha automática de dados do CLI.

Se faltar uma ferramenta ou aprovação, registe a execução como `blocked` e a validação como `not-run`. Não declare aprovação sem executar as verificações.

## Consultar indicadores e contexto

```bash
agentforge insights --project <projeto>
agentforge context --project <projeto> --topic "timeout" --budget-tokens 1000
```

`insights` resume o número de execuções por resultado e fluxo, as validações, a duração média, os tokens e custos declarados, as repetições e os códigos de erro registados mais de uma vez. Cada erro recorrente inclui as linhas de origem em `operations.jsonl`. Se o ficheiro estiver malformado, o comando indica a linha inválida e interrompe a análise. Se o ficheiro não existir, o relatório apresenta zero execuções registadas; isso não prova que não tenham ocorrido outras.

Os indicadores reflectem apenas os registos introduzidos explicitamente. Não são telemetria automática nem uma medição da qualidade do modelo. `context --budget-tokens` utiliza uma estimativa por caracteres divididos por quatro. O estado e o resumo activo são preservados; se não couberem no orçamento, compacte o resumo ou aumente o limite.

Para uma retrospectiva, consulte os indicadores, verifique os registos de origem e distinga ocorrências isoladas de causas recorrentes. Só depois proponha uma lição com `agentforge learn add`. A lição permanece pendente até ser aprovada por uma pessoa; não são promovidas automaticamente regras, competências ou instruções.

## Delegação e trabalho em paralelo

Uma proposta de `repository-audit` declara que, após o primeiro passo — o mapeamento do repositório —, os seguintes podem ser delegados:

| Passo | Agente | Competência |
| --- | --- | --- |
| 2 — qualidade e manutenção | `code-critic` | `forge-audit` |
| 3 — segurança | `secops` | `forge-audit` |
| 4 — desempenho | `reverse-engineer` | `forge-performance` |

Estes ramos podem ser executados em paralelo apenas se o CLI oferecer subagentes. A proposta limita a concorrência ao número de tarefas declaradas, exige um único responsável por escrita e proíbe delegação encadeada. O agente coordenador integra os resultados. Sem suporte do CLI, execute os passos sequencialmente. O kit não instala mecanismos de execução automática nem inicia subagentes.

O instalador trabalha por projeto, protege alterações manuais e disponibiliza `--dry-run` e `uninstall`. Não execute operações críticas, publicação, envio de alterações, eliminações ou integrações externas apenas porque estão mencionadas num fluxo de trabalho.
