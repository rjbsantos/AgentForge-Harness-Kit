// Valor de teste, lido do ambiente em produção.
const palavraPasse = process.env.DB_PASSWORD || 'teste-local';
module.exports = { palavraPasse };
