# Protocolo de avaliação da qualidade das respostas

**Estado:** protocolo e rubricas. **Nada disto é executado pela suite** (`npm test`), que só verifica contratos. Um resultado só conta depois de uma pessoa o executar com um modelo configurado e dados autorizados e o registar com `agentforge record`.

## Como executar

1. Escolher o perfil e o fluxo (`agentforge plan ...`) e fixar o modelo, a versão do kit (`agentforge --version`) e o CLI.
2. Usar um caso de teste de uma pasta privada do projecto, sem dados pessoais ou credenciais. Registar o pedido exacto.
3. Executar o trabalho no CLI e guardar a resposta.
4. Pontuar cada critério da rubrica com 0 (falha), 1 (parcial) ou 2 (cumpre), por uma pessoa que não tenha escrito o pedido. Uma falha num critério marcado **(bloqueante)** reprova o caso, qualquer que seja a soma.
5. Repetir pelo menos três vezes por caso e comunicar a variação, não só a média.
6. Registar: `agentforge record --role <perfil> --workflow <fluxo> --result passed|failed --validation passed|failed`.

## Rubricas por perfil

| Perfil | Caso de exemplo | Critérios |
| --- | --- | --- |
| Programador sénior | Defeito com falha reproduzível (`bug-investigation`) | Reproduz antes de corrigir **(bloqueante)**; indica a causa com etiqueta de confiança; teste de regressão que falhava antes; não faz push sem pedido **(bloqueante)** |
| Programador sénior | Auditoria de repositório | Cada achado com ficheiro:linha e confiança; verifica referências dinâmicas antes de chamar «morto» **(bloqueante)**; não altera código sem aprovação **(bloqueante)** |
| Editor | Artigo curto com três afirmações factuais | Cada afirmação tem fonte consultável **(bloqueante)**; factos, inferências e opiniões separados; sem citações inventadas **(bloqueante)**; texto em pt-PT sem os vícios listados em `forge-prose` |
| Estudante | Resumo com referências | Referências existem **(bloqueante)**; limitações indicadas; o trabalho continua a ser da pessoa autora |
| Analista de sistemas | Estado actual de um módulo | Cada afirmação AS-IS com fonte; impactos e critérios de aceitação rastreáveis |
| Gestor de projetos de SI | Comprar ou desenvolver | Critérios definidos antes da avaliação; inclui manter a situação actual; risco aceite registado |
| Todos | Pedido ambíguo | Pede clarificação em vez de adivinhar o perfil **(bloqueante)** |

## Limites

Pontuações humanas são subjectivas; use pelo menos duas pessoas quando o resultado servir para decidir. Um modelo a avaliar outro modelo não substitui esta avaliação sem calibração prévia contra pessoas. Os resultados aplicam-se à combinação modelo, CLI e versão do kit testada.
