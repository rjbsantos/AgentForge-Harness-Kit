1. **Documentação em inglês completa.** `README.en.md` cobre instalação, comandos e conceitos, mas os catálogos e as competências instaladas continuam em pt-PT por desenho: são o texto que os agentes lêem.
2. **Geração automática dos catálogos em Markdown** a partir de `src/`. Hoje um teste (`src/tests/docs.test.ts`) falha se faltar uma competência ou um agente; a geração completa dispensaria a edição manual.
3. **Recusa de leitura de segredos fora do Claude Code.** `agentforge harden` só cobre o Claude Code, e só pelas ferramentas nativas (não `cat .env`). OpenCode e Codex precisam de regras próprias, depois de verificado o esquema de permissões de cada um.
4. **Papéis que executam comandos sem restrição de ferramentas** (`security-tester`): o formato nativo não os limita a um conjunto de comandos; depende de a sandbox do host.
5. **Verificar a regra de `--output` do git contra o OpenCode real.** A recusa de `*--output*` assenta na semântica «a última regra ganha», confirmada só pela documentação.
6. **Comando do hook por `PATH` e sintaxe POSIX.** O hook corre `agentforge` do `PATH` e usa `"$CLAUDE_PROJECT_DIR"`; o Windows não foi verificado. `doctor` só detecta a alteração do comando, não a substituição do binário.
7. **Contrato uniforme de eventos entre CLIs.** Só o Claude Code tem observabilidade (hook); os restantes não.
8. **Evidência obrigatória em `record`.** Hoje `passed` sem `--evidence` é aceite e aparece como `none`; tornar obrigatória exige migrar os registos e fluxos existentes.
9. **Indicadores sobre os arquivos de operações.** `insights` lê só o `operations.jsonl` actual; os arquivos datados não são agregados.
10. **Robustez do encaminhamento perante paráfrases.** O classificador é por sinais e foi medido só em pt-PT; falta um conjunto adversarial e outros idiomas.
11. **Avaliação de qualidade das respostas dos modelos.** Os testes verificam contratos, não o comportamento dos agentes.
