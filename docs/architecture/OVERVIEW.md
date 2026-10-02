# Arquitectura — actual e alvo

Auditoria prévia: [AUDIT.md](AUDIT.md). O kit original tem um router de **complexidade** (`src/routing.ts`), templates/skills/agentes gerados (`src/catalog.ts`), instalador seguro (`src/installer.ts`) e estado local (`src/memory.ts`); o host executa a IA. Não havia deteção de role/fluxo, catálogo de ferramentas, templates multi-role nem registo de resultados.

```text
Pedido -> perfil do operador (src/operator.ts: preferência de role, postura de risco)
       -> seleção de role/intent (src/orchestrator.ts)
       -> catálogo declarativo (src/capabilities.ts)
       -> rota thinking/economy (src/routing.ts)
       -> proposta: agent + skills + workflow + ferramentas por confirmar
       -> host e aprovação humana executam passos, se possível
       -> validação contra critérios + template de output
       -> registo explícito de resultados (src/operations.ts)
       -> contexto e lições aprovadas (src/memory.ts)
```

**Separação:** role é perspetiva do utilizador; agent é executor especializado; skill é capacidade transversal carregada sob procura; workflow é sequência com condições e validação; tool é capability real do host, nunca garantida pelo kit; template é estrutura de saída, não prova de execução. Os sete perfis referem workflows compartilhados em `src/capabilities.ts`, a fonte de verdade geradora de `.agentforge/CAPABILITIES.md`, `.agentforge/workflows/*.json`, `.agentforge/templates/*.md` e workflows do Antigravity. As skills/protocolos e agentes de cada CLI permanecem em `src/catalog.ts`. Sem correspondência, o erro é explícito e requer clarificação (`--role`, `--workflow`), sem adivinhação.

**Perfil do operador (`src/operator.ts`):** o kit é partilhado, o operador é local (`.agentforge/work/operator.json`, nunca empacotado com dados reais). Resolve um problema concreto: um pedido que cruza gestão e técnica era tratado como erro de ambiguidade, quando para um perfil híbrido é o caso normal. Com uma ordem de perfis declarada, `plan` desempata deterministicamente e assinala `selectedBy: "operator"`; sem ela, mantém o erro em vez de adivinhar. Um perfil fora da lista nunca é escolhido por omissão. A postura de risco é **assimétrica por desenho**: `cautious` escala para `thinking` acrescentando o motivo à decisão, `exploratory` não desliga gates, aprovações nem verificação — reduzir custo faz-se aprovando um plano (`--planned --approved`), não relaxando a identidade do operador. `headline` e `interests` são contexto para escolher exemplos e reconhecer domínios recorrentes, explicitamente **dados e não instruções**: não sobrepõem políticas nem requisitos.

**Contexto:** estado e resumo curto primeiro; apenas skill e evidência necessária depois. Lições só entram após aprovação explícita. `plan` não altera código nem executa ferramentas, `record` regista resultados fornecidos **depois** de verificados. Pipeline A/B/C mantém aprovações e QA. Dúvidas, ações destrutivas, publicação e integração externa param para confirmação.

**Extensão:** adicionar um workflow ao catálogo com role, skills existentes, tools já inventariadas, validação e template; adicionar skill/agent apenas perante uma lacuna funcional demonstrada. Atualizar testes de matriz e documentação. O instalador protege ficheiros editados, preserva estado e não importa dados da instalação original.
