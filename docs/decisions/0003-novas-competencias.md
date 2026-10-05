# ADR-0003 — Critério para acrescentar competências e para usar projectos externos

**Contexto:** a análise de repositórios populares de competências e agentes (por exemplo superpowers, gstack, ponytail, humanizer, impeccable, claude-mem, ruflo) mostra ideias úteis, mas também pacotes grandes, com daemons, índices vectoriais ou números de poupança não medidos.

**Decisão:** uma competência nova só entra se (1) preencher uma lacuna transversal que pelo menos um fluxo existente usa, (2) ficar ligada a esse fluxo e coberta pelo teste de contratos, (3) for escrita de raiz em pt-PT, sem copiar código ou texto de terceiros, e (4) não exigir execução autónoma, credenciais nem serviços externos. Pacotes de domínio (design de interface, vídeo, recolha de dados, geração de imagens) ficam como opção externa documentada, não como parte do núcleo. Reduções de custo anunciadas por terceiros não são repetidas sem medição própria.

**Consequências:** o núcleo mantém-se pequeno e verificável. Exemplos aplicados: `forge-debug` (depuração pela causa-raiz), `forge-prose` (revisão de prosa) e a escada «reutilizar antes de escrever» em `forge-implementation`. Ficaram de fora a memória vectorial, o enxame de agentes e as competências de design.
