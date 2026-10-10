# Auditoria funcional e técnica

Este documento descreve a cobertura actual do AgentForge Harness Kit, os mecanismos reutilizados e os limites conhecidos. O catálogo executável encontra-se em `src/capabilities.ts`, `src/skills.ts`, `src/roles.ts` e `src/catalog.ts`; os ficheiros instalados são gerados a partir dessas fontes.

## Inventário funcional

| Componente | Localização | Função | Estado |
| --- | --- | --- | --- |
| Perfis e fluxos | `src/capabilities.ts` | Define os doze perfis, os fluxos, os requisitos de ferramentas, os passos, as validações e os modelos de saída | Activo |
| Competências, agentes e instruções | `src/skills.ts`, `src/roles.ts`, `src/docs.ts`, `src/generators.ts` (reunidos em `src/catalog.ts`) | Gera capacidades transversais e formatos nativos dos CLIs suportados | Activo |
| Encaminhamento | `src/routing.ts` | Classifica complexidade e risco e recomenda um perfil de modelo | Activo; não executa nem escolhe modelos sem configuração |
| Selecção de perfil e plano | `src/orchestrator.ts` | Associa pedidos a perfis e fluxos e gera uma proposta estruturada | Activo; não executa a proposta |
| Instalação e remoção | `src/installer.ts` | Controla propriedade, integridade, conflitos e desinstalação segura | Activo |
| Contexto e lições | `src/memory.ts` | Guarda estado, resumo e lições locais com evidência e aprovação humana | Activo |
| Operações e indicadores | `src/operations.ts` | Regista execuções declaradas e agrega resultados e erros recorrentes | Activo; sem recolha automática |
| Testes e integração contínua | `src/tests/`, `.github/workflows/` | Verifica contratos, instalação e pacote distribuível em vários sistemas operativos | Activo |

## Perfis e responsabilidades

| Perfil | Agente | Cobertura principal |
| --- | --- | --- |
| Gestor de projetos | `product-manager` | Estado, reuniões, riscos e requisitos |
| Gestor de projetos de Sistemas de Informação | `solution-advisor` | Decisões de solução, automação, exploração técnica e melhoria contínua |
| Engenheiro de IA | `ai-engineer` | Desenho e avaliação de soluções de IA |
| Programador Sénior | `lead-developer` | Investigação de defeitos, auditoria e implementação |
| Analista de Sistemas | `systems-analyst` | Análise de processos, requisitos e incidentes |

As competências comuns são reutilizadas entre perfis. A existência de um agente ou ferramenta no catálogo não cria permissões no CLI nem garante que o host execute uma delegação.

## Cobertura e lacunas

| Área | Cobertura actual | Limite |
| --- | --- | --- |
| Requisitos, arquitectura, desenvolvimento e testes | Competências partilhadas, fluxos e validação | A execução depende do CLI e da aprovação aplicável |
| Investigação, fontes e verificação de factos | Competências reutilizáveis nos perfis técnicos, editoriais e académicos | A pesquisa na Web só existe se o host disponibilizar uma ferramenta autorizada |
| Memória e aprendizagem | Estado por projeto, resumo activo, lições pendentes/aprovadas/retiradas e âmbito reutilizável | Sem observação automática das conversas ou aprovação automática |
| Observabilidade | Registo local explícito e agregação através de `agentforge insights` | Sem telemetria automática de tokens, custos ou utilização do host |
| Coordenação de subagentes | Propostas com dependências, papéis, competências e limites | O kit não inicia agentes; o CLI tem de suportar a delegação |
| Integrações externas | Requisitos declarados nos fluxos | Não são fornecidos conectores de correio electrónico, calendário, bases de dados, navegação ou APIs |
| Avaliação de modelos | Contratos e formatos verificáveis por testes | Não há avaliação da qualidade factual de respostas sem dados e fornecedores autorizados |

## Princípios de concepção

- **Reutilizar antes de criar:** compor competências partilhadas e criar uma nova apenas quando existe uma lacuna funcional.
- **Separar proposta de execução:** o plano descreve trabalho; só o CLI e o operador podem executá-lo.
- **Exigir evidência:** conclusões, resultados de testes e lições devem remeter para uma fonte verificável.
- **Preservar aprovação humana:** decisões de impacto, publicação, operações destrutivas e promoção de lições não são automáticas.
- **Limitar a coordenação:** só grupos independentes declarados podem ser paralelizados; cada tarefa tem um responsável por escrita e a delegação tem profundidade máxima de um nível.
- **Manter dados no projeto:** o contexto e os registos são locais; não são enviados para serviços externos pelo instalador.

## Arquitectura do sistema

```text
Pedido do utilizador
  → perfil do operador e classificação da intenção
  → perfil e fluxo de trabalho
  → competências, ferramentas e coordenação necessárias
  → recomendação de modelo e proposta de execução
  → execução e aprovação pelo CLI/utilizador
  → validação baseada em evidência
  → registo explícito da operação
  → indicadores e lições sujeitas a revisão humana
```

`agentforge context` preserva o estado e o resumo e selecciona lições aprovadas dentro de um orçamento estimado. `agentforge insights` agrega apenas os registos explícitos de `operations.jsonl`; nenhum indicador altera instruções ou aprova lições por si.

## Inspiração e reutilização de conceitos

O kit adapta padrões de engenharia de agentes e de desenvolvimento multi-agente, incluindo verificação independente, fundamentação em código existente, níveis de gravidade, separação entre memória específica do projeto e conhecimento reutilizável, e coordenação limitada. A comparação com outros projectos foi feita ao nível das práticas; não são distribuídos código, motores de execução ou dependências desses projectos.

## Limites e trabalho futuro

O kit instala artefactos e orientações estáticas para quatro CLIs; não oferece um motor de execução comum nem contratos uniformes para eventos e hooks. A instalação de observadores automáticos exigiria decisões adicionais sobre privacidade, permissões e suporte por plataforma. A pesquisa semântica, as integrações autenticadas, a medição exacta de custos e a avaliação de respostas estão descritas no [trabalho futuro](../operations/BACKLOG.md).
