
6. **Documentação em inglês completa.** `README.en.md` cobre instalação, comandos e conceitos, mas os catálogos e as competências instaladas continuam em pt-PT por desenho: são o texto que os agentes lêem.
7. **Geração automática dos catálogos em Markdown** a partir de `src/`. Hoje um teste (`src/tests/docs.test.ts`) falha se faltar uma competência ou um agente; a geração completa dispensaria a edição manual.
