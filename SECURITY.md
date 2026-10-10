# Política de segurança

## Comunicar uma vulnerabilidade

Não abra um issue público. Use o **relatório privado de vulnerabilidades** do GitHub (separador *Security* › *Report a vulnerability*) deste repositório. Inclua a versão (`agentforge --version`), os passos para reproduzir e o impacto observado. Respondemos em 7 dias.

## Âmbito

Estão em âmbito o instalador (`src/installer.ts`), a memória e o selo das lições (`src/memory.ts`), o registo de auditoria, o servidor MCP, os hooks, o endurecimento (`agentforge harden`) e os ficheiros que o kit gera nos projectos.

Fora de âmbito: o comportamento dos CLIs anfitriões (Claude Code, Codex, OpenCode, Antigravity) e dos modelos; o kit instala instruções, não uma sandbox.

## Limites conhecidos

- A confirmação em terminal (`learn approve`, `learn reseal`) e o selo HMAC não protegem contra código que já corra com a sua conta: esse código lê a chave e pode simular um terminal.
- `agentforge harden` e o `opencode.json` gerado recusam leituras pelas ferramentas nativas do Claude Code e do OpenCode; não impedem `cat .env` por Bash e o Codex não tem regras equivalentes.
- O classificador de risco é por palavras-chave: pedidos ofuscados ou em idiomas não cobertos podem não escalar.
- O kit não verifica as permissões efectivas dos CLIs anfitriões.

## Versões suportadas

Apenas a última versão publicada recebe correcções de segurança.

## Cadeia de fornecimento

As acções do GitHub estão fixadas por SHA e actualizadas pelo Dependabot. As releases publicam `SHA256SUMS` e uma atestação de proveniência (`gh attestation verify <tarball> --repo rjbsantos/AgentForge-Harness-Kit`). O pacote não tem dependências de execução.
