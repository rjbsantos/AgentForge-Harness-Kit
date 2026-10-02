# Workflows

Fonte: `src/capabilities.ts:workflows` (gatilho, pré-condições, inputs, passos, skills, tools, validação, erro, output, pós-condição e template). Cada instalação gera JSON portável em `.agentforge/workflows/`; no Antigravity também gera Markdown invocável em `.agents/workflows/`. `forge-build` compõe requisitos, TDD e verificação existentes; auditoria e documentação continuam disponíveis como pipelines B/C do harness.

Composições: `forge-research + forge-fact-check + forge-verify -> magazine-article/academic-research`; `forge-requirements + forge-research + forge-verify -> system-analysis`; `forge-audit + forge-research + forge-verify -> repository-audit`; `forge-requirements + forge-research + forge-tradeoff + forge-verify -> solution-briefing`; `forge-research + forge-spike + forge-tradeoff + forge-verify -> tech-exploration`. Execução é responsabilidade do host e do utilizador; o comando `plan` **não** afirma que percorreu os passos. Uma fase bloqueada deve produzir o motivo, não avançar automaticamente.

## Workflows do perfil Gestor de Projectos de SI

Quatro fluxos cobrem o ciclo "necessidade → decisão → melhoria" sem duplicar os existentes:

| Workflow | Entra | Sai | Porque não é um existente |
| --- | --- | --- | --- |
| `solution-briefing` | necessidade de negócio, restrições | opções comparadas, recomendação, ADR | `requirements-analysis` produz requisitos testáveis, não escolhe entre alternativas |
| `automation-opportunity` | processo manual, volumetria | plano de automação com retorno e fallback humano | `system-analysis` descreve AS-IS/TO-BE; aqui mede esforço e decide se compensa |
| `tech-exploration` | pergunta técnica, tempo fixado | experiência executada e veredicto adoptar/testar/avaliar/descartar | `academic-research` é bibliográfico; `ai-solution-design` assume o caso de uso já decidido |
| `continuous-improvement` | período, registos de execução | melhorias priorizadas e lições candidatas | `repository-audit` é técnico e `incident-analysis` é pontual; este é de processo |

`continuous-improvement` é o consumidor natural de `.agentforge/work/operations.jsonl` e o produtor do ledger de lições: fecha o ciclo entre o que o harness registou e o que aprende. `solution-briefing` usa dois templates — `solution-brief.md` para a análise e `decision-record.md` (ADR) para o registo que sobrevive ao projecto.
