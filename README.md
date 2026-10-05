# AgentForge Harness Kit

[English summary](README.en.md)

O **AgentForge Harness Kit** é um instalador de instruções e capacidades de IA para projetos de software e trabalho técnico. Prepara o contexto do projeto para que o CLI de IA escolhido trabalhe com papéis, competências, fluxos de trabalho, critérios de validação e regras de segurança consistentes.

O kit suporta **OpenCode, Codex CLI, Claude Code e Google Antigravity**. Instala os ficheiros nativos de cada ferramenta e mantém uma configuração partilhada do AgentForge no projeto. Não é um modelo de IA, não substitui os CLIs e não executa autonomamente agentes, ferramentas, integrações ou operações externas.

## O que oferece

- **Sete perfis de trabalho:** gestor de projetos, gestor de projetos de sistemas de informação, engenheiro de IA, programador sénior, editor de revistas, estudante universitário e analista de sistemas.
- **Competências reutilizáveis:** análise de requisitos, investigação, verificação de factos, auditoria e higiene do código, implementação, testes, análise de desempenho, tomada de decisão, experimentação técnica, encaminhamento de modelos e gestão de contexto.
- **Higiene do projecto:** identifica código, ficheiros e dependências potencialmente mortos ou obsoletos, com evidência e verificação contra referências dinâmicas; não remove nada sem aprovação.
- **Fluxos de trabalho verificáveis:** análise de incidentes, auditoria de repositórios, desenho e avaliação de soluções de IA, análise de sistemas, exploração técnica, automação de processos, entre outros.
- **Encaminhamento por complexidade:** recomenda modelos de raciocínio para decisões incertas ou de risco elevado e modelos económicos para execução delimitada e aprovada. Só selecciona um modelo quando o CLI suporta essa opção e existe um modelo configurado.
- **Contexto e memória locais:** guarda o estado do projeto, um resumo activo e lições com evidência, âmbito e aprovação humana. O contexto pode ser limitado por um orçamento estimado.
- **Melhoria contínua auditável:** agrega execuções registadas e evidencia erros recorrentes sem alterar automaticamente instruções ou aprovar lições.
- **Coordenação de subagentes condicionada ao CLI:** identifica trabalho independente que pode ser delegado, com dependências, papel, competências e limites explícitos. Se o CLI não suportar subagentes, a execução é sequencial.
- **Instalação reversível e segura:** detecta conflitos, preserva alterações do utilizador e mantém os dados de trabalho durante actualizações e desinstalações.
- **Limite à raiz do projecto:** as instruções exigem que alterações e artefactos fiquem sob a pasta do projecto e mandam parar perante destinos externos ou ligações simbólicas para fora. O instalador valida caminhos e recusa traversal e symlinks; as operações dos agentes continuam sujeitas às capacidades e permissões do CLI anfitrião.

## Modelo de funcionamento

```text
Pedido
  → perfil e fluxo de trabalho
  → competências e ferramentas necessárias
  → recomendação de modelo e plano de coordenação
  → execução pelo CLI, com aprovações aplicáveis
  → validação com evidência
  → registo local e aprendizagem revista por uma pessoa
```

O AgentForge separa conceitos para evitar duplicação: um **perfil** define a perspectiva de trabalho; um **agente** representa um especialista; uma **competência** descreve uma capacidade reutilizável; um **fluxo de trabalho** define os passos e validações; uma **ferramenta** depende do que o CLI disponibiliza; um **modelo** define a estrutura do resultado. Uma proposta do comando `plan` não significa que qualquer etapa tenha sido executada.

## Instalação

Requer Node.js 20 ou posterior. O repositório é privado, pelo que a conta Git da máquina tem de ter acesso. Para instalar como utilizador final, descarregue o tarball de uma versão e instale-o com `npm install -g`. Evite `npm install -g git+https://...` com npm 10.9.8: o npm pode deixar o executável apontado para uma pasta temporária da cache.

**Windows (PowerShell):**
```powershell
gh auth login
npm uninstall -g agentforge-harness-kit
gh release download v0.9.2 --repo rjbsantos/AgentForge-Harness-Kit --pattern agentforge-harness-kit-0.9.2.tgz
npm install -g .\agentforge-harness-kit-0.9.2.tgz
Get-Command agentforge
agentforge install --project D:\caminho\do\projeto --cli all
agentforge status --project D:\caminho\do\projeto
```

**Linux e macOS:**
```bash
gh auth login
npm uninstall -g agentforge-harness-kit
gh release download v0.9.2 --repo rjbsantos/AgentForge-Harness-Kit --pattern agentforge-harness-kit-0.9.2.tgz
npm install -g ./agentforge-harness-kit-0.9.2.tgz
command -v agentforge
agentforge install --project ~/WorkSpace/Groot --cli opencode
```

O tarball da versão contém os ficheiros compilados e não exige ferramentas de desenvolvimento no computador cliente. Como o repositório é privado, `gh auth login` permite descarregar o activo da versão. Para actualizar, descarregue o tarball da versão pretendida e repita `npm install -g .\ficheiro.tgz` (PowerShell) ou `npm install -g ./ficheiro.tgz` (Linux/macOS). A instalação directa com URL Git continua disponível para desenvolvimento; nesse caso, clone o repositório e execute `npm link` a partir da pasta persistente.

Na instalação do OpenCode, o AgentForge é configurado como agente principal predefinido quando o projeto ainda não tem `opencode.json`. Se esse ficheiro já existir, o instalador preserva-o e indica a configuração a acrescentar: `"default_agent": "agentforge"`. O nome da aplicação continua a ser OpenCode — o AgentForge é o agente seleccionado dentro dela. Reinicie o OpenCode depois da instalação; a interface deve identificar o agente activo como `agentforge`. Para iniciar uma sessão com a escolha guiada do tipo de trabalho, escreva `/agentforge`.

O OpenCode recebe também o comando `/agentforge`, que apresenta na conversa uma escolha inicial entre gestão de projeto, IA e automação, desenvolvimento, escrita e pesquisa, estudo, análise de sistemas ou outra tarefa. Depois de escolher, o agente esclarece o objectivo e prepara o fluxo adequado; não é um menu gráfico nem inicia alterações sem as aprovações necessárias. O kit instala ainda um tema de cores AgentForge e configura-o na TUI através de `tui.json`. O tema pode colorir os elementos e realces da barra lateral, mas a estrutura e disposição dessa área continuam a ser controladas pelo OpenCode. Se já existir `tui.json`, o instalador preserva-o e indica a opção `"theme": "agentforge"` a acrescentar. Consulte [comandos personalizados](https://opencode.ai/docs/commands/), [temas](https://opencode.ai/docs/themes/) e [configuração da TUI](https://opencode.ai/docs/tui/) para os detalhes suportados pelo OpenCode.

O tarball também pode ser instalado a partir de qualquer localização local:

```powershell
npm install -g D:\transferencias\agentforge-harness-kit-0.9.2.tgz
```

O kit não está publicado no registo npm. O tarball de uma versão deve ser obtido na página oficial de [versões do projeto](https://github.com/rjbsantos/AgentForge-Harness-Kit/releases); como o repositório é privado, autentique-se no GitHub para o descarregar.
O repositório inclui a versão compilada necessária ao pacote distribuível, pelo que não é preciso instalar o TypeScript no computador de destino.

O parâmetro `--cli` aceita `opencode`, `codex`, `claude`, `antigravity` ou `all`. A instalação pode ser repetida para actualizar ficheiros geridos ou acrescentar outro CLI:

```powershell
agentforge install --project D:\caminho\do\projeto --cli claude --dry-run
agentforge install --project D:\caminho\do\projeto --cli claude
agentforge uninstall --project D:\caminho\do\projeto --cli claude
```

O `--dry-run` apresenta as alterações sem as aplicar. A desinstalação remove apenas ficheiros que o instalador ainda controla; os ficheiros alterados pelo utilizador e os dados de trabalho são preservados.

## Escolher um perfil e preparar um plano

O comando `plan` identifica um perfil e um fluxo de trabalho a partir do pedido, ou aceita uma escolha explícita:

```powershell
agentforge plan --project D:\caminho\do\projeto --cli codex --prompt "Analisa os riscos do projeto"
agentforge plan --project D:\caminho\do\projeto --cli claude --prompt "Avalia se devemos comprar ou desenvolver esta solução" --role it-project-manager --workflow solution-briefing
```

A saída inclui o perfil, o agente, o fluxo, as competências e ferramentas necessárias, os passos, os critérios de validação, a recomendação de modelo e a coordenação proposta. Ferramentas são assinaladas como não verificadas até o CLI confirmar que estão disponíveis. Um pedido ambíguo exige clarificação; uma preferência definida no perfil do operador pode desempatar perfis que correspondam ao pedido, sem adivinhar quando não há correspondência.

O perfil do operador é opcional e local ao projeto:

```powershell
agentforge operator set --project D:\caminho\do\projeto `
  --headline "Gestor de projetos de sistemas de informação com perfil técnico" `
  --roles it-project-manager,systems-analyst,ai-engineer,senior-developer `
  --language pt-PT --risk balanced `
  --interests "arquitetura de sistemas, engenharia de IA, automação"
agentforge operator show --project D:\caminho\do\projeto
```

A postura de risco `cautious` pode reforçar o encaminhamento para raciocínio; nenhuma preferência pessoal reduz as aprovações ou as validações exigidas.

## Modelos e encaminhamento

O comando `route` classifica uma tarefa e recomenda o perfil de modelo:

```powershell
agentforge route --project D:\caminho\do\projeto --cli opencode --prompt "Desenha a arquitetura de autenticação"
agentforge route --project D:\caminho\do\projeto --cli claude --prompt "Implementa a especificação aprovada" --planned --approved
```

Para mapear os nomes de modelos da própria conta, crie `.agentforge/work/model-profiles.json`:

```json
{
  "opencode": {
    "thinking": "fornecedor/modelo-de-raciocinio",
    "economy": "fornecedor/modelo-economico"
  },
  "claude": {
    "thinking": "opus",
    "economy": "haiku"
  }
}
```

`route` e `plan` apenas recomendam. Não contactam fornecedores, não mudam o modelo da sessão e não afirmam uma poupança sem medições reais.

## Contexto, memória e melhoria contínua

O estado e o resumo activo ficam em `.agentforge/work/`. Actualize o resumo no fim de uma fase relevante, em vez de acumular transcrições:

```powershell
agentforge context save --project D:\caminho\do\projeto --summary "Objetivo: ...; fase: ...; decisão aprovada: ...; evidência: docs\plano.md" --next "Executar os testes"
agentforge context --project D:\caminho\do\projeto --topic testes --budget-tokens 1200
```

O contexto inclui o estado, o resumo e até cinco lições aprovadas pertinentes, dentro do orçamento indicado. A estimativa corresponde aproximadamente a um token por quatro caracteres; não é a contagem exacta de um modelo. O comando informa quantas lições omitiu e recusa reduzir silenciosamente o estado ou o resumo se estes excederem o orçamento.

Uma lição exige evidência dentro do projeto e começa como pendente. Só passa a ser reutilizada após aprovação explícita:

```powershell
agentforge learn add --project D:\caminho\do\projeto --lesson "Validar os contratos entre o cliente e o servidor" --evidence "tests\contracts.test.ts:42"
agentforge learn list --project D:\caminho\do\projeto
agentforge learn approve --project D:\caminho\do\projeto --id <identificador>
agentforge learn retire --project D:\caminho\do\projeto --id <identificador>
agentforge insights --project D:\caminho\do\projeto
```

As lições podem ser específicas do projeto (`project`) ou reutilizáveis (`reusable`). As reutilizáveis exigem uma âncora de tecnologia e versão, por exemplo `--scope reusable --anchor "Node 20"`. `insights` resume apenas execuções registadas explicitamente; não recolhe conversas nem promove automaticamente padrões a lições ou instruções.

## Manutenção, integridade e integrações

```powershell
agentforge --version                                       # versão do CLI instalado
agentforge status --project D:\caminho\do\projeto            # inclui a versão do kit registada no projecto
agentforge doctor --project D:\caminho\do\projeto     # diagnóstico; termina com código 1 se houver problemas
agentforge upgrade --project D:\caminho\do\projeto --dry-run
agentforge learn reseal --project D:\caminho\do\projeto   # aceita lessons.json depois de revisão humana
agentforge hooks install --project D:\caminho\do\projeto  # opcional, Claude Code
agentforge mcp --project D:\caminho\do\projeto            # servidor MCP só de leitura
```

- `upgrade` reaplica a versão instalada aos CLIs já presentes no manifesto. `doctor` verifica ficheiros alterados, actualizações pendentes e a integridade das lições.
- `lessons.json` tem um selo (`lessons.seal`) escrito pelo CLI. Se o ficheiro for editado fora dele, as lições deixam de ser reutilizadas e novas lições são recusadas até `learn reseal`.
- `hooks install` acrescenta um hook `PostToolUse` a `.claude/settings.json`, preservando o resto da configuração. Regista apenas a hora e o nome da ferramenta em `.agentforge/work/events.jsonl` (nunca argumentos, resultados ou conversas) e requer o comando `agentforge` no PATH. `agentforge hooks remove` desfaz a alteração. O `insights` inclui a contagem por ferramenta.
- `agentforge mcp` expõe `agentforge_plan`, `agentforge_route`, `agentforge_context`, `agentforge_lessons` e `agentforge_insights`. Não aprova lições, não regista execuções e não altera ficheiros. Exemplo de configuração: `{ "mcpServers": { "agentforge": { "command": "agentforge", "args": ["mcp", "--project", "/caminho/do/projeto"] } } }`.

## Grafo de conhecimento e confiança (conceitos do graphify)

O kit adopta três ideias do [graphify](https://github.com/Graphify-Labs/graphify): consultar um grafo em vez de pesquisar ficheiros, explicar cada ligação com uma etiqueta de confiança, e manter tudo determinístico e local (sem índice vectorial).

- **Confiança em todas as conclusões:** as competências de auditoria e verificação e o `HARNESS.md` exigem `EXTRACTED` (visto directamente, com ficheiro:linha), `INFERRED` (deduzido; confirmar no código) ou `AMBIGUOUS` (decisão humana). Uma recomendação nunca assenta apenas em ligações `INFERRED`.
- **Competência `forge-graph`** (auditoria de repositório, investigação de defeitos e análise de sistemas): se existir `graphify-out/graph.json`, o agente consulta `GRAPH_REPORT.md` e `graphify query|path|explain` antes de ler ficheiros, verifica se o grafo está desactualizado e usa os nós isolados apenas como candidatos para a higiene do projecto. O kit não gera nem instala o graphify; para criar o grafo use `/graphify .` no seu assistente. O `agentforge doctor` indica, a título informativo, se o grafo existe.
- **`agentforge graph`:** o próprio catálogo (perfis, agentes, fluxos, competências, ferramentas, modelos e encaminhamento) é um grafo consultável:

```powershell
agentforge graph report
agentforge graph query --prompt "auditoria do repositório" --budget-tokens 400
agentforge graph path --from forge-hygiene --to senior-developer
agentforge graph explain --node skill:forge-verify
```

As arestas declaradas no catálogo são `EXTRACTED`; a co-utilização de competências em vários fluxos é `INFERRED`; `AMBIGUOUS` assinala nós sem referência. O relatório inclui os nós mais ligados, as competências transversais e os nós órfãos, e um teste falha se o catálogo ficar com um deles. A mesma consulta está disponível na ferramenta MCP `agentforge_graph`.

## Poupança de tokens

O kit mede e reduz o que põe em contexto, sem depender de código de terceiros:

```powershell
agentforge tokens --project D:\caminho\do\projeto           # arranque, instruções do utilizador e estado; código 1 se houver excessos
agentforge operator set --project D:\caminho\do\projeto --verbosity concise
```

- `tokens` mede o arranque (orçamento de 3000 tokens estimados, validado por teste), o texto do próprio utilizador em `CLAUDE.md`/`AGENTS.md` e o crescimento de `state.md` e `context.md`. A estimativa é caracteres ÷ 4.
- `--verbosity concise` instala no `HARNESS.md` regras de respostas directas: sem preâmbulos nem resumos repetidos, mantendo exactos o código, os comandos e os números, e completos os avisos de risco e as aprovações.
- O `HARNESS.md` inclui regras de higiene de contexto: filtrar a saída das ferramentas na origem e guardar registos longos em `.agentforge/work/logs/` em vez de os colar na conversa.
- [docs/integrations/TOKEN-TOOLS.md](docs/integrations/TOKEN-TOOLS.md) mapeia dez ferramentas populares (RTK, Context Mode, Caveman, Token Optimizer, Claude Context e outras) para o que o kit já faz e para o que fica como opção externa, com licenças e riscos. As percentagens de poupança são dos autores e não foram medidas aqui.

## Integração opcional: gateway OmniRoute

O [OmniRoute](https://github.com/diegosouzapw/OmniRoute) (MIT) é um gateway local de modelos com recurso automático entre fornecedores. O kit não o instala nem o executa; `agentforge gateway omniroute` propõe o mapeamento `thinking` → `auto/coding` e `economy` → `auto/cheap` para o `model-profiles.json` e os comandos para ligar cada CLI. Sem `--write` só pré-visualiza; com `--write` acrescenta as entradas em falta e preserva as que já definiu. Os pedidos seguem para o fornecedor escolhido pelo gateway, incluindo camadas gratuitas de terceiros, pelo que convém ler os riscos de privacidade em [docs/integrations/OMNIROUTE.md](docs/integrations/OMNIROUTE.md) antes de o usar.

## Componentes de terceiros

A instalação para o **Claude Code** inclui a competência `claude-automation-recommender`, do plugin oficial [claude-code-setup](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-code-setup) da Anthropic (Apache-2.0, distribuída sem alterações; ver [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)). Analisa o projecto e recomenda as automações mais úteis (hooks, subagentes, competências, servidores MCP e plugins) para melhorar o desempenho do Claude. Peça, por exemplo, «recomenda automações para este projecto». É só de leitura: não altera ficheiros. Fica em `.claude/skills/claude-automation-recommender/` e é gerida pelo manifesto, pelo que `upgrade` e `uninstall` a tratam como os restantes ficheiros do kit.

## Ficheiros instalados

O instalador cria instruções para o CLI escolhido, ficheiros nativos de agentes e competências, e o catálogo partilhado:

| Localização | Conteúdo |
| --- | --- |
| `.agentforge/HARNESS.md` | Regras de utilização e coordenação |
| `.agentforge/CAPABILITIES.md` | Catálogo de perfis, fluxos, competências e ferramentas |
| `.agentforge/workflows/` e `.agentforge/templates/` | Definições de fluxos e modelos de resultado |
| `.agentforge/roles/` | Instruções dos papéis especializados |
| `.agentforge/work/` | Estado, contexto, perfil local e registos de aprendizagem |
| `.agents/`, `.claude/`, `.codex/`, `.opencode/` | Integração nativa para o CLI seleccionado |

O estado de trabalho e o perfil do operador não são partilhados entre utilizadores pelo pacote. Não guarde credenciais ou dados pessoais sensíveis nestes ficheiros.

## Desenvolvimento e testes

```powershell
npm ci
npm test
npm run smoke
```

`npm test` compila e executa os testes unitários. `npm run smoke` cria um tarball, instala-o num projeto temporário e verifica os fluxos essenciais através do pacote distribuível. O CI executa ambos em Linux, Windows e macOS, com Node.js 20 e 22.

Consulte [Contribuir](CONTRIBUTING.md), a [arquitetura](docs/architecture/OVERVIEW.md), a [estratégia de testes](docs/testing/STRATEGY.md) e o [guia de operação](docs/operations/GUIDE.md). As funcionalidades planeadas mas não disponíveis estão identificadas no [backlog](docs/operations/BACKLOG.md).
