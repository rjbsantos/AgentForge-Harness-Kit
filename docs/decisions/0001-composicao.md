# ADR-0001 — Composição em vez de duplicação

**Contexto:** seis perfis novos, mas o kit já contém skills de requisitos, TDD, auditoria, routing e contexto; o original tem agentes e templates de software. Copiar seis árvores paralelas de skills acrescentaria deriva.

**Decisão:** fonte única de composição em `src/capabilities.ts`, reutilizando papéis e skills adequados; novas skills somente para pesquisa e fact-check transversais. `src/catalog.ts` gera instruções dos CLIs, sem executar providers; `plan` produz proposta e `record` aceita evidência operacional explícita.

**Consequências:** baixa duplicação e upgrades coerentes; regex de intenção é limitada, por isso pedidos ambíguos requerem clarificação. Não há aprendizagem automática que mude regras, avaliação de LLM sem provider ou integração mágica com ferramentas. Extensões futuras exigem fonte, testes e revisão.
