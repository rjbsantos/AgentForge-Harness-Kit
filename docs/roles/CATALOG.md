# Catálogo de roles

Fonte de verdade: `src/capabilities.ts:profiles`; o catálogo gerado por instalação está em `.agentforge/CAPABILITIES.md`. Os roles não duplicam agentes:

| Role | Agente principal | Composições de workflow |
| --- | --- | --- |
| Gestor de Projectos | product-manager existente | estado, reunião, riscos, requisitos |
| Gestor de Projectos de SI | solution-advisor (lacuna preenchida) | briefing de solução, automação, exploração técnica, melhoria contínua, requisitos, análise de sistemas, estado |
| AI Engineer | ai-engineer (lacuna preenchida) | desenho IA, avaliação, requisitos |
| Senior Developer | lead-developer existente | debug, auditoria, construção |
| Escritor/Editor de Revistas | editor (lacuna preenchida) | artigo com fact-check |
| Estudante Universitário | academic-tutor (lacuna preenchida) | pesquisa e estudo |
| Analista de Sistemas | systems-analyst (lacuna preenchida) | AS-IS/TO-BE, incidente, requisitos |

Um role não define ferramentas ou poderes novos: use `agentforge plan` para ver os requisitos do workflow e confirmar disponibilidade/consentimento.

## Reforços (2025, pós-auditoria ao `.atomica`)

`code-critic` passou a usar níveis de severidade explícitos (Critical/Important/Minor) e a verificar cobertura de testes, strings não localizáveis e mudanças de contrato/API quando aplicável. `secops` ganhou uma checklist estruturada no estilo OWASP (injeção, autenticação/sessão, autorização/IDOR, exposição de dados, configuração insegura, dependências vulneráveis, segredos, CSRF/SSRF). `qa` exige agora veredicto PASS/FAIL/PARTIAL por verificação, com comando e output reais — nunca apenas "os testes do implementador passaram". `lead-developer` lê também `forge-ground`: resolver tipos/APIs e ler um exemplar real antes de compor, nunca inventar um método que "parece certo".

## `solution-advisor` — porque é um papel novo e não uma variante

A lacuna não era "mais um gestor": `product-manager` produz requisitos, `architect` produz componentes e `systems-analyst` produz AS-IS/TO-BE. Nenhum produzia a **decisão** — opções comparáveis com custo, risco, reversibilidade e dependência de fornecedor, e um registo do que foi decidido e porquê. `solution-advisor` ocupa esse espaço e **não implementa**: depois da aprovação entrega a `architect` ou a `systems-analyst`, mantendo os mesmos gates. As suas duas regras duras são a linha de base "manter o estado actual" em todas as comparações e a proibição de inventar preços, benchmarks ou capacidades de fornecedores — os dois modos de falha mais caros deste tipo de análise.
