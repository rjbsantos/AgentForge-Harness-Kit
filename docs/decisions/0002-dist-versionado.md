# ADR-0002 — Versionar `dist/` no repositório

**Estado:** aceite

**Contexto:** o kit pode ser instalado a partir do Git (`npm install` de um URL) em máquinas sem compilador TypeScript. As tentativas de compilar durante `prepare` (versões 0.8.1 e 0.8.2) falharam em alguns ambientes npm.

**Decisão:** manter os artefactos compilados em `dist/` no repositório e fazer o CI falhar se estiverem desfasados de `src/`. A distribuição preferida continua a ser o tarball de cada versão.

**Consequências:** a instalação não depende de ferramentas de compilação, ao custo de diffs maiores e da obrigação de executar `npm run build` antes de cada commit. `npm test` usa `dist/` local e não detecta erros de empacotamento; por isso `npm run smoke` é obrigatório antes de integrar.
