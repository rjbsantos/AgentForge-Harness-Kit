# Contrato de eventos de ferramentas

O kit só observa ferramentas através de um hook, e só no Claude Code (`agentforge hooks install`). Este documento fixa o contrato mínimo que qualquer anfitrião pode cumprir para alimentar `.agentforge/work/events.jsonl` sem mudar o kit.

## Entrada

`agentforge hook-event --project <raiz>` lê **um** objecto JSON do stdin (máximo 64 KB; o excedente é ignorado):

```json
{ "tool_name": "Bash" }
```

`tool` é aceite como sinónimo de `tool_name`. Qualquer outro campo (argumentos, resultados, caminhos, texto de conversas) é **ignorado e nunca gravado**. O nome tem de corresponder a `^[\w.:-]{1,80}$`; caso contrário regista-se `unknown`.

## Saída

Uma linha por evento em `.agentforge/work/events.jsonl`: `{"timestamp":"<ISO 8601>","tool":"<nome>"}`. O ficheiro roda para `events.1.jsonl` acima de 1 MiB. `agentforge insights` agrega a contagem por ferramenta.

## Estado por anfitrião

| Anfitrião | Emite o evento | Como |
| --- | --- | --- |
| Claude Code | Sim | Hook `PostToolUse` em `.claude/settings.json` (`agentforge hooks install`) |
| Codex | Não verificado | Nenhum hook equivalente confirmado; o contrato acima serve se o anfitrião o suportar |
| OpenCode | Não verificado | Um plugin do OpenCode poderia chamar o comando; não foi escrito nem testado |
| Antigravity | Não | Sem hooks configuráveis conhecidos |

Sem observabilidade, os indicadores dependem de `agentforge record`, que é declarativo (ver `--evidence`).
