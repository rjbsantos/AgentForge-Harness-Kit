# Avaliação de eficácia

A suite de testes (`npm test`) prova que o kit gera os ficheiros certos e que os controlos funcionam. Não prova que o kit melhora o trabalho de um modelo. Este documento descreve como medir isso com as tuas próprias tarefas, sem depender de terceiros e sem que o kit gaste tokens por conta própria.

## Três fontes de evidência

| Fonte | O que responde | Custo | Comando |
| --- | --- | --- | --- |
| **Uso real** | Os fluxos fecham? Dispensam-se passos? A porta de entrada recusa? A guarda trava? | Nenhum (lê o registo local) | `agentforge insights` → `usage` |
| **Execuções declaradas** | Taxa de sucesso, repetições e erros por fluxo, com evidência verificável | Nenhum | `agentforge insights` |
| **A/B controlado** | Com o kit, o mesmo pedido dá melhor resultado do que sem ele? | Tokens do CLI que escolheres | `agentforge eval run` |

## Indicadores de uso (`insights.usage`)

- `flows.completionRate`: fluxos fechados sobre iniciados. Baixa quer dizer que se abandona a meio.
- `flows.skipRate`: passos dispensados sobre passos resolvidos. Alta quer dizer que os fluxos têm passos que ninguém usa, ou que se está a contornar o processo.
- `flows.evidenceRate`: passos concluídos com um ficheiro de evidência (e não só uma nota).
- `gate.rejectionRate`: pedidos recusados por falta de contexto. Muito alta quer dizer que as perguntas não chegam a quem pede; zero quer dizer que a porta não se está a usar.
- `guard.denied` e `guard.byRule`: o que a guarda travou.

Estes números dizem se o processo é seguido, não se o resultado é bom.

## A/B controlado

```bash
agentforge eval run --suite minha-suite.json --cli claude \
  --command 'claude -p "$AGENTFORGE_EVAL_PROMPT"' --repeat 3 --dry-run   # só conta as execuções
agentforge eval run --suite minha-suite.json --cli claude \
  --command 'claude -p "$AGENTFORGE_EVAL_PROMPT"' --repeat 3
```

Cada tarefa corre numa cópia descartável (a `fixture` indicada), em dois braços: `plain` (sem o kit) e `kit` (com o kit instalado para o `--cli` escolhido). O pedido chega ao comando pela variável `AGENTFORGE_EVAL_PROMPT`, nunca interpolado no shell. As verificações são determinísticas: texto na saída, ficheiros e comandos (por exemplo `npm test`). O relatório fica em `.agentforge/work/eval/` e inclui, por braço, a taxa de sucesso, a taxa de verificações cumpridas e a duração, mais a diferença `kit − plain`.

Salvaguardas:

- **Orçamento.** Cada execução gasta tokens no CLI. O comando recusa mais de 12 execuções (`--max-runs` para aumentar) e `--dry-run` mostra quantas seriam.
- **Ruído.** O relatório avisa quando há menos de 10 execuções por braço, menos de 3 repetições ou um só braço. Com poucas execuções, uma diferença pode ser acaso.
- **A suite é código.** As verificações `command` correm no shell. Corre apenas suites em que confias.
- **POSIX.** O comando usa `/bin/sh`; não corre no Windows.

Ver `golden-suite.example.json` para o formato. As verificações de exemplo dependem do comportamento do modelo e precisam de uma `fixture` tua.

## O que isto não resolve

- Verificações determinísticas medem o que é verificável por máquina. A qualidade de um texto, de um desenho ou de uma decisão continua a precisar de uma pessoa a pontuar (ver [EVALUATION.md](EVALUATION.md)).
- Um conjunto de tarefas escrito pelo mesmo autor do kit favorece o kit. Inclui tarefas em que o kit **não** deveria ajudar (um pedido simples e bem especificado) e vê se ele não piora.
- A comparação é entre o kit e a ausência dele, não entre versões do kit. Para comparar versões, corre a mesma suite com cada uma e guarda os relatórios.
