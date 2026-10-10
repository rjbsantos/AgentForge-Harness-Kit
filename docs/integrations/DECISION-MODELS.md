# Modelos de decisão (JEV, Laya) e a porta de entrada

## O conceito

JEV e Laya são **modelos de decisão de «sistema 1»**: em vez de gerarem texto, respondem a perguntas delimitadas com uma decisão tipada (uma escolha entre rótulos, uma pontuação ou um sim/não com probabilidade), numa só passagem e a baixo custo. Servem de camada de decisão **antes** de gastar um modelo de linguagem grande: encaminhar um pedido, decidir se tem contexto suficiente, aprovar ou recusar uma acção.

| | JEV | Laya |
| --- | --- | --- |
| Modelo de utilização | Serviço alojado | Pesos abertos (Apache 2.0), inferência local, ajustável |
| Implicação | O pedido sai da máquina | Corre local; é preciso alojá-lo e, se quiseres, ajustá-lo |

A comparação que li ([artigo de Pankaj Pandey](https://medium.com/@pankaj_pandey/jev-vs-laya-two-ways-to-build-the-decision-layer-for-ai-agents-6f266ba2557d)) enquadra-a como a escolha de que parte do plano de controlo do agente se quer possuir. **Não consegui abrir o artigo completo** (o Medium recusou o acesso automático); o que aqui está vem do resumo da pesquisa e de outras fontes: [Michał Chromiak](https://mchromiak.github.io/articles/2026/Sep/17/Typed-Decision-Models-Jev-and-Laya-in-Agentic-AI/), [Runware](https://runware.ai/blog/jev-laya-and-the-emerging-role-of-decision-models), [Cisco](https://blogs.cisco.com/ai/jev-decision-models-on-trial), [repositório do Laya](https://github.com/NandhaKishorM/laya) e o [artigo no arXiv](https://arxiv.org/html/2609.28940v1). Os números de exactidão publicados usam testes diferentes e não são comparáveis entre si; várias fontes recomendam testar na tua própria tarefa.

## O que o kit faz com isto

A porta de entrada (`agentforge gate`) é essa camada de decisão, **sem modelo**:

- devolve **decisões tipadas** em `decisions`: `ready` (sim/não), `specificity` (pontuação 0–1) e `workflow` (escolha com candidatos), no mesmo formato que um modelo de decisão devolveria;
- recusa um pedido vago **antes** de se gastar um fluxo, com no máximo quatro perguntas e uma recomendação cada;
- as confianças da heurística **não estão calibradas** (`calibrated: false`): indicam margem, não probabilidade.

## Ligar um modelo de decisão (opcional)

```bash
agentforge gate --prompt "Trata da entrega do projecto Alfa" --decider './meu-decisor.sh'
```

O kit não inclui nem conhece a API de nenhum modelo de decisão. Executa o comando que indicares, com este contrato:

```text
stdin  {"task":"readiness"|"route","text":"…","question":"…","labels":["…"]}
stdout {"label":"…","probabilities":{"<rótulo>":0.0-1.0,…}}
```

Regras:

- **Só torna a porta mais exigente.** Se a heurística recusa, o decisor não a liberta. Se a heurística aceita e o decisor dá menos de 50% de «sim», o pedido passa a precisar de contexto e ganha uma pergunta.
- **Escolhe o fluxo** só quando a heurística não identificou nenhum e a probabilidade é pelo menos 60%; um rótulo que não seja um fluxo conhecido é ignorado.
- **Falha em silêncio para a heurística:** tempo limite (5 s), código de saída diferente de zero ou resposta inválida não bloqueiam nem relaxam.
- **Privacidade:** o texto do pedido é enviado ao comando. Com um serviço alojado, o pedido sai da máquina; com um modelo local, não.

O contrato é genérico: um pequeno guião que chame o teu modelo local (por exemplo, um Laya) ou o teu serviço (um JEV) e imprima o JSON acima. **Não escrevi nem testei esse guião contra nenhum dos dois**; os testes do kit usam decisores simulados.

## Quando compensa

Um modelo de decisão só poupa tokens se for mais barato do que o erro que evita. A heurística local já apanha os pedidos mais vagos; o modelo de decisão compensa em pedidos que parecem específicos mas deixam decisões em aberto. Mede antes de adoptar: `agentforge insights` mostra a taxa de recusa da porta e `agentforge eval run` compara resultados com e sem o kit.
