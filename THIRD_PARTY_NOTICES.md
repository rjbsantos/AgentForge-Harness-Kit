# Componentes de terceiros

## claude-automation-recommender (claude-code-setup)

- Origem: <https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-code-setup>
- Commit: `fc49e6815f5562bbfd692e65ab6a9b4d7edb0a5f`
- Autoria: Anthropic
- Licença: Apache License 2.0 (texto completo em `.claude/skills/claude-automation-recommender/LICENSE`, instalado com a competência)
- Alterações: nenhuma ao conteúdo dos ficheiros; são embebidos em `src/vendor.ts` e instalados por `agentforge install --cli claude`.
- Resumo SHA-256 do conjunto embebido (`JSON.stringify` das entradas de `recommenderFiles` ordenadas por nome): `bac2bba6ec1d833e900b247551f77c316c862fbeccaf483c569f3f579f537220`. Um teste compara-o com `src/vendor.ts`; uma actualização deliberada altera este valor e o commit indicado acima.
