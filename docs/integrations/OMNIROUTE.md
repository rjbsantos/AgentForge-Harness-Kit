# Integração opcional com o OmniRoute

[OmniRoute](https://github.com/diegosouzapw/OmniRoute) (MIT) é um gateway local de modelos: um único endpoint compatível com OpenAI (`http://localhost:20128/v1`) que encaminha pedidos para muitos fornecedores, com recurso automático quando uma quota acaba ou um fornecedor falha. O AgentForge não o embebe, não o instala e não o executa; o que o kit faz é **alinhar o encaminhamento por complexidade com os modelos que o gateway expõe**.

## O que a integração faz

`agentforge route` e `agentforge plan` recomendam um nível (`thinking` ou `economy`) e usam `.agentforge/work/model-profiles.json` para o traduzir num modelo. O comando abaixo preenche esse ficheiro com os modelos virtuais do OmniRoute:

| Nível | Modelo | Descrição na documentação do OmniRoute |
| --- | --- | --- |
| `thinking` | `auto/coding` | Pesos orientados para qualidade em geração de código |
| `economy` | `auto/cheap` | Fornecedor mais barato por token primeiro |

```powershell
agentforge gateway omniroute --project D:\projeto                  # pré-visualiza, não grava nada
agentforge gateway omniroute --project D:\projeto --cli claude --write
```

- Sem `--write` apenas mostra o mapeamento, os comandos de ligação e os avisos.
- Com `--write` acrescenta as entradas em falta e **mantém** qualquer modelo que já tenha definido (indicado em `skipped`).
- Os comandos de ligação por CLI (`omniroute run claude …`, `omniroute configure codex`, …) são apenas propostos. O kit não os executa nem guarda chaves.
- Os identificadores vêm da documentação do OmniRoute e não foram verificados contra uma instância em execução. Confirme com `omniroute models` e ajuste `model-profiles.json` se necessário.

## Riscos a ter em conta antes de usar

- **Privacidade:** cada pedido, com o código e o contexto incluídos, vai para o fornecedor que o gateway escolher, incluindo camadas gratuitas de terceiros. O OmniRoute declara que corre localmente e que a telemetria está desactivada por omissão, mas isso não limita o que os fornecedores a jusante recebem. Não o use com código ou dados que não possam sair da sua máquina.
- **Termos de serviço:** o próprio OmniRoute mantém um catálogo de risco dos termos de alguns fornecedores. Reveja-o antes de activar fornecedores.
- **Variabilidade:** o encaminhamento automático pode mudar de modelo entre pedidos. As aprovações, validações e a regra de evidência do AgentForge não dependem do modelo e continuam a aplicar-se, mas a qualidade das respostas pode variar.
- **Sem poupança garantida:** os valores de poupança de tokens e de quota gratuita são do OmniRoute; o AgentForge não os mede (ver o [backlog](../operations/BACKLOG.md)).

## Remover

Apague as entradas correspondentes em `.agentforge/work/model-profiles.json`; `route` e `plan` voltam a indicar `host-default`.
