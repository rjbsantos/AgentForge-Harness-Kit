const test = require('node:test');
const assert = require('node:assert');
const { procurar } = require('../src/db.js');

test('procurar chama a base de dados', () => {
  let recebido;
  procurar({ query: (texto, parametros) => { recebido = { texto, parametros }; return []; } }, 'ana');
  assert.ok(recebido.texto.length > 0);
});
