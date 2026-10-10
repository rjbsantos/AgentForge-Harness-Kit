var botao = document.getElementById('abrir');
if (botao.attachEvent) {
  botao.attachEvent('onclick', function () { alert('olá'); });
} else {
  botao.addEventListener('click', function () { alert('olá'); });
}
