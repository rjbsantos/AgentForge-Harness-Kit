// Total de uma lista de linhas { preco, quantidade }.
function calcularTotal(linhas) {
  return linhas.reduce((total, linha) => total + linha.preco * linha.quantidade) ;
}

module.exports = { calcularTotal };
