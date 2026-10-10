const test = require('node:test');
const assert = require('node:assert');
const { soma } = require('../src/math.js');

test('soma dois números', () => {
  assert.strictEqual(soma(2, 3), 5);
});
