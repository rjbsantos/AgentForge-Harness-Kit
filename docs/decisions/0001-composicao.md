# ADR-0001 — Compor capacidades em vez de as duplicar

**Contexto:** o kit suporta vários perfis e já dispõe de competências para requisitos, desenvolvimento orientado por testes, auditoria, encaminhamento e gestão de contexto. Duplicar essas competências para cada perfil criaria divergências e aumentaria o custo de manutenção.

**Decisão:** manter `src/capabilities.ts` como catálogo de perfis e fluxos, e reutilizar as competências adequadas. Criar uma competência apenas quando existe uma lacuna transversal demonstrada. `src/catalog.ts` (com `skills`, `roles`, `docs` e `generators`) gera as instruções e os ficheiros nativos dos CLIs, sem executar fornecedores de modelos. `plan` produz uma proposta e `record` aceita apenas resultados operacionais registados explicitamente.

**Consequências:** menos duplicação e actualizações coerentes. A classificação de intenção é limitada; pedidos ambíguos exigem clarificação. O kit não altera regras por aprendizagem automática, não avalia modelos sem um fornecedor configurado e não simula integrações com ferramentas. Todas as extensões requerem uma fonte de verdade, testes e revisão.
