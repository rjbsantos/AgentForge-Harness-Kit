# Contribuir

Requer Node.js 20+. `npm ci`, `npm test`, `npm run smoke`. Os templates portáteis vivem em `src/catalog.ts`; o instalador em `src/installer.ts`. Adicione testes para qualquer novo destino ou alteração de ownership, conflitos e desinstalação. Não inclua estado real, tokens, chaves ou caminhos privados nos templates.

`npm test` corre sobre o `dist/` local e **não** deteta erros de empacotamento: um módulo ausente do campo `files` do `package.json` só falha depois de publicado. Corra `npm run smoke` antes de abrir PR — embala, instala o tarball num projeto limpo e valida a instalação nas quatro superfícies. O CI corre ambos em Linux, Windows e macOS, em Node 20 e 22.

Alterar o texto de `instruction()` em `src/catalog.ts` obriga a acrescentar o texto anterior exacto a `superseded()` em `src/installer.ts`; caso contrário as instalações existentes passam a falhar com `Bloco de instruções alterado`.
