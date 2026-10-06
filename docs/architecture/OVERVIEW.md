# Arquitectura do AgentForge Harness Kit

O AgentForge Harness Kit instala orientações, agentes, competências e fluxos de trabalho num projeto. O CLI de IA escolhido interpreta e executa essas instruções, dentro das suas capacidades e das permissões do utilizador.

## Fluxo de funcionamento

```text
Pedido do utilizador
  → perfil do operador e classificação da intenção
  → perfil profissional e fluxo de trabalho
  → competências, ferramentas e coordenação necessárias
  → recomendação do modelo e proposta de execução
  → execução e aprovações pelo CLI e pelo utilizador
  → validação baseada em evidência
  → registo explícito da operação
  → indicadores e lições sujeitas a revisão humana
```

O perfil do operador, definido em `src/operator.ts`, ajuda a desempatar pedidos que correspondam a vários perfis e a aplicar uma postura de risco. A preferência não adivinha um perfil quando não existe correspondência. A escolha do fluxo é feita por pontuação de sinais em `src/intent.ts` (mede-se com pedidos reais em `src/tests/intent-data.ts`) e aplicada em `src/orchestrator.ts`; os perfis e respectivos fluxos são definidos em `src/capabilities.ts`. O encaminhamento por complexidade e modelo encontra-se em `src/routing.ts`.

## Conceitos

| Conceito | Responsabilidade |
| --- | --- |
| Perfil | Define a perspectiva profissional adequada ao pedido |
| Agente | Representa um especialista responsável por uma tarefa |
| Competência | Descreve uma capacidade reutilizável |
| Fluxo de trabalho | Define entradas, passos, dependências, validações e resultados |
| Ferramenta | Identifica uma capacidade do CLI que deve ser confirmada |
| Modelo de saída | Define a estrutura esperada do resultado |

Os treze perfis partilham competências através de `src/capabilities.ts`. O catálogo é gerado em `.agentforge/CAPABILITIES.md`, `.agentforge/workflows/`, `.agentforge/templates/` e nos formatos nativos suportados pelo CLI seleccionado. As instruções e definições dos agentes encontram-se em `src/skills.ts`, `src/roles.ts`, `src/docs.ts` e `src/generators.ts`, reunidos por `src/catalog.ts`.

## Limite entre proposta e execução

`agentforge plan` selecciona uma composição e devolve uma proposta com ferramentas ainda não verificadas. Não altera código, não executa comandos ou testes, não chama APIs nem inicia agentes delegados. O CLI anfitrião confirma capacidades, solicita aprovações quando necessário, executa as tarefas e verifica os resultados. `agentforge record` regista dados fornecidos explicitamente após a execução; não recolhe telemetria automática.

## Contexto e aprendizagem

O contexto mantém o estado e o resumo do projeto e selecciona até cinco lições aprovadas dentro de um orçamento estimado. O limite predefinido é 1200 tokens estimados, com uma aproximação de caracteres divididos por quatro. Se o estado e o resumo obrigatórios excederem o limite, o comando falha em vez de os truncar silenciosamente.

`agentforge insights` agrega exclusivamente os registos locais de `operations.jsonl`, incluindo erros recorrentes com linhas de origem. Os indicadores não criam nem aprovam lições. Todas as lições exigem evidência e aprovação humana antes de serem reutilizadas.

## Verificação e delegação

`forge-verify` exige evidência por verificação e limita as correcções a dois ciclos; não permite repetir uma tentativa sem alterar a implementação ou a configuração. Se a mesma causa persistir, o agente deve parar e pedir uma nova delimitação.

Os fluxos podem declarar grupos de tarefas paralelas, dependências, agentes e competências. A auditoria ao repositório pode delegar a análise de qualidade, segurança e desempenho depois do mapeamento inicial. A proposta inclui o limite de concorrência, exige um único responsável por escrita e limita a delegação a um nível. O paralelismo só ocorre se o CLI suportar subagentes; caso contrário, as tarefas são executadas sequencialmente.

## Segurança e evolução

O instalador em `src/installer.ts` utiliza um manifesto com resumos de integridade e propriedade dos ficheiros, recusa substituir alterações do utilizador e preserva o estado de trabalho. Decisões de impacto, operações destrutivas, publicação e integração externa requerem aprovação adequada.

O instalador resolve os caminhos geridos contra a raiz do projecto e recusa traversal e ligações simbólicas que escapem dessa raiz. As instruções do Harness aplicam o mesmo limite às alterações e artefactos produzidos pelos agentes. Esta política orienta os CLIs anfitriões, mas não substitui as permissões de sistema operativo nem uma sandbox; as leituras de ficheiros externos só devem ocorrer quando explicitamente solicitadas.

`forge-hygiene`, incluída em `repository-audit`, procura código, ficheiros e dependências potencialmente mortos ou obsoletos. Verifica pontos de entrada e referências dinâmicas, classifica a confiança e exige aprovação antes de remoções, seguida de testes relevantes.

Para acrescentar capacidades, estenda primeiro os catálogos existentes, valide as dependências e actualize os testes e a documentação. Consulte a [auditoria](AUDIT.md), os [catálogos](../roles/CATALOG.md) e o [trabalho futuro](../operations/BACKLOG.md).
