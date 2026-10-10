// Procura um utilizador pelo nome.
function procurar(db, nome) {
  // db.query(texto, parâmetros) devolve linhas.
  return db.query(
    'SELECT * FROM utilizadores WHERE nome = \'' + nome + '\'' ,
    []
  );
}

module.exports = { procurar };
