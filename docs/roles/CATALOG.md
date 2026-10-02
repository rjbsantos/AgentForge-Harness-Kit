# Catálogo de perfis

Fonte de verdade: `profiles` em `src/capabilities.ts`; o catálogo instalado no projeto encontra-se em `.agentforge/CAPABILITIES.md`. Cada perfil escolhe um agente e compõe fluxos de trabalho existentes:

| Perfil | Agente principal | Fluxos de trabalho |
| --- | --- | --- |
| Gestor de Projetos | `product-manager` | estado, reuniões, riscos e requisitos |
| Gestor de Projetos de Sistemas de Informação | `solution-advisor` | decisão de solução, automação, exploração técnica, melhoria contínua, requisitos, análise de sistemas e estado |
| Engenheiro de IA | `ai-engineer` | concepção e avaliação de soluções de IA, requisitos |
| Programador Sénior | `lead-developer` | investigação de defeitos, auditoria de repositórios e implementação |
| Escritor e Editor de Revistas | `editor` | artigos com verificação de factos |
| Estudante Universitário | `academic-tutor` | investigação académica e estudo |
| Analista de Sistemas | `systems-analyst` | análise actual e futura, incidentes e requisitos |

Um perfil não concede ferramentas nem permissões. Utilize `agentforge plan` para consultar os requisitos do fluxo e confirme a disponibilidade e as autorizações antes da execução.

## Competências de revisão, segurança e fundamentação

`code-critic` classifica os problemas por gravidade e verifica a cobertura de testes, a localizabilidade do texto e as alterações de contratos ou APIs, quando aplicável. `secops` utiliza uma lista de verificação estruturada que abrange, entre outros, injeção, autenticação, autorização, exposição de dados, configuração insegura, dependências vulneráveis, segredos e falsificação de pedidos. `qa` exige um veredicto `PASS`, `FAIL` ou `PARTIAL` para cada verificação, com o comando e a saída reais; não basta afirmar que os testes do implementador passaram. `lead-developer` utiliza também `forge-ground`: confirma tipos e APIs e consulta um exemplo real antes de escrever código.

## Função do agente `solution-advisor`

O `product-manager` define requisitos, o `architect` desenha componentes e o `systems-analyst` descreve os processos e sistemas actuais e futuros. O `solution-advisor` compara opções com base em custo, risco, reversibilidade e dependência de fornecedores, e regista a decisão e a sua fundamentação. Não implementa: após aprovação, encaminha o trabalho para arquitectura ou análise de sistemas. As comparações incluem sempre a opção de manter a situação actual; preços, medições e capacidades de fornecedores nunca são inventados.
