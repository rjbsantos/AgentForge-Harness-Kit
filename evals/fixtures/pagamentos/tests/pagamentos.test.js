const test = require('node:test');
const assert = require('node:assert');
const { calcularTotal } = require('../src/pagamentos.js');

test('uma linha', () => {
  assert.strictEqual(calcularTotal([{ preco: 2, quantidade: 3 }]), 6);
});
