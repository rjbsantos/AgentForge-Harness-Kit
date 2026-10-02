# Operação e observabilidade

`agentforge plan --project <dir> --cli codex --prompt "Faz uma pesquisa académica"` devolve role, workflow, agent, skills, tools requeridas (por verificar), passos, critérios, template, recomendação de modelo e `status: proposed`. Pedidos ambíguos falham e exigem `--role` e, se preciso, `--workflow`. `route` continua disponível para classificação genérica. Nunca afirmar execução apenas por haver uma proposta.

Depois da execução **real e validação**, registar manualmente:

```powershell
agentforge record --project D:\projeto --role university-student --workflow academic-research --result passed --validation passed --duration-ms 1200 --tools file-system,web-research --skills forge-research,forge-fact-check --tokens 300 --cost 0.01
```

O JSONL `.agentforge/work/operations.jsonl` regista timestamp, role, agent, workflow, `skillsPlanned` e `skillsUsed` só se declaradas como executadas, tools realmente declaradas, duração, resultado, validação, retries, tokens/custo apenas se fornecidos e código de erro opcional. Não guarda prompt, fontes, nomes pessoais ou segredos. `passed` exige `validation: passed`, mas a veracidade do registo continua responsabilidade do operador; não existe telemetria do host integrada. Falta de ferramentas ou aprovação => `blocked`/`not-run` e intervenção humana.

Consultar `agentforge context` e registar apenas lições aprovadas por humano; não sincronizar estado ativo concorrente entre máquinas. Instalador por projeto protege alterações manuais e inclui `--dry-run`/`uninstall`. Não executar ações críticas, deploy/push, apagamentos ou integração externa só por estarem listadas num workflow.
