# ADR-0004 — Aprovação humana em terminal e selo com chave fora do projecto

**Estado:** aceite

**Contexto:** as lições aprovadas são reinjectadas em prompts, logo são uma superfície de injecção persistente. A versão 0.10 selava `lessons.json` com um SHA-256 sem chave guardado ao lado do ficheiro, e `learn approve` era um comando como outro qualquer: um agente com shell aprovava as próprias lições e recalculava o selo.

**Decisão:** (1) `learn approve` e `learn reseal` exigem stdin num TTY e confirmação explícita; (2) o selo é um HMAC-SHA-256 cuja chave vive em `AGENTFORGE_HOME` ou `~/.config/agentforge/seal.key`, fora do projecto; (3) cada alteração é registada em `audit.jsonl` com cadeia de hashes; (4) `approved` pedido por um modelo no MCP só vale com um checkpoint `APROVADO`.

**Alternativas rejeitadas:** uma flag `--yes` ou variável de ambiente (qualquer agente a define); uma palavra-passe (o agente não a conhece, mas o utilizador também a perderia e não há armazenamento seguro portátil sem dependências); assinar com chave assimétrica (mesma exposição da chave privada, mais complexidade).

**Consequências:** quem só escreve no repositório (PR, clone) não forja o selo; um clone noutra conta exige `learn reseal`. Não há protecção contra código que já corra com a conta do utilizador: lê a chave e pode simular um TTY. O limite está documentado em `SECURITY.md`; uma defesa real exige uma sandbox do CLI anfitrião.
