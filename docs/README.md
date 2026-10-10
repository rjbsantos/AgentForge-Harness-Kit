# Índice da documentação

| Quero… | Ler |
| --- | --- |
| Instalar e começar | [README](../README.md) (arranque rápido) · [English](../README.en.md) |
| Ver todos os comandos | [operations/COMMANDS.md](operations/COMMANDS.md) |
| Usar `plan`, `record` e `insights` | [operations/GUIDE.md](operations/GUIDE.md) |
| Perceber a arquitectura | [architecture/OVERVIEW.md](architecture/OVERVIEW.md) · [AUDIT.md](architecture/AUDIT.md) · [REQUIREMENTS.md](architecture/REQUIREMENTS.md) |
| Consultar perfis, agentes, competências, fluxos e ferramentas | [roles](roles/CATALOG.md) · [agents](agents/CATALOG.md) · [skills](skills/CATALOG.md) · [workflows](workflows/CATALOG.md) · [tools](tools/CATALOG.md) |
| Saber porque foi decidido assim | [decisions/](decisions/) (ADR-0001 a 0003) |
| Reduzir tokens ou usar um gateway | [integrations/TOKEN-TOOLS.md](integrations/TOKEN-TOOLS.md) · [integrations/OMNIROUTE.md](integrations/OMNIROUTE.md) |
| Testar e avaliar | [testing/STRATEGY.md](testing/STRATEGY.md) · [testing/EVALUATION.md](testing/EVALUATION.md) |
| Ver o que falta | [operations/BACKLOG.md](operations/BACKLOG.md) |
| Contribuir | [CONTRIBUTING](../CONTRIBUTING.md) |

Os catálogos de competências e agentes são verificados por testes contra `src/`; se acrescentar uma competência ou um agente e esquecer a documentação, `npm test` falha.
