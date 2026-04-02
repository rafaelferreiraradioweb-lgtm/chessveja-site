var board = null;
var game = new Chess();
var $status = $('#status');

// Configuração do Tabuleiro
function updateStatus () {
  var status = '';
  var moveColor = game.turn() === 'b' ? 'Pretas' : 'Brancas';
  if (game.in_checkmate()) status = 'Fim de jogo, ' + moveColor + ' sofreu xeque-mate.';
  else if (game.in_draw()) status = 'Fim de jogo, empate.';
  else {
    status = moveColor + ' jogam.';
    if (game.in_check()) status += ', ' + moveColor + ' está em xeque.';
  }
  $status.html(status);
}

var config = {
  draggable: true,
  position: 'start',
  onDragStart: (s, p) => { if (game.game_over() || (game.turn()==='w' && p.search(/^b/)!==-1) || (game.turn()==='b' && p.search(/^w/)!==-1)) return false },
  onDrop: (s, t) => { 
      var move = game.move({ from: s, to: t, promotion: 'q' });
      if (move === null) return 'snapback';
      updateStatus();
  },
  onSnapEnd: () => { board.position(game.fen()) }
};
board = Chessboard('board', config);
updateStatus();

// Botões
$('#btn-start').on('click', () => { game.reset(); board.start(); updateStatus(); });
$('#btn-prev').on('click', () => { game.undo(); board.position(game.fen()); updateStatus(); });
$('#btn-flip').on('click', () => { board.flip(); });

// Stockfish
var stockfish = new Worker('stockfish.js');
stockfish.onmessage = (e) => {
    if (e.data.startsWith('info') && e.data.includes('score')) {
        let out = e.data.includes('mate') ? "Mate detectado" : "Calculando...";
        if (e.data.includes('cp')) {
            let v = parseInt(e.data.split(' ')[e.data.split(' ').indexOf('cp') + 1]);
            out = "Avaliação: " + (v / 100).toFixed(2);
        }
        $('#stockfish-output').text(out);
    }
};

// BOTÃO ANALISAR (LIVRE)
$('#analyze-button').on('click', async function() {
    var pgn = $('#pgn-input').val();
    if (!pgn) { alert("Cole um PGN primeiro."); return; }
    if (!game.load_pgn(pgn)) { alert("PGN inválido."); return; }
    
    board.position(game.fen());
    updateStatus();
    stockfish.postMessage('position fen ' + game.fen());
    stockfish.postMessage('go depth 15');

    $('#ai-result').html('<em>A IA do Chessveja está analisando... aguarde...</em>');
    $('#analyze-button').prop('disabled', true);

    try {
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pgn, level: $('#analysis-level').val(), tone: $('#analysis-tone').val(), color: $('#analysis-color').val() })
        });
        const data = await res.json();
        $('#ai-result').html(typeof marked !== 'undefined' ? marked.parse(data.analysis || "Erro.") : (data.analysis || "Erro."));
    } catch (error) {
        $('#ai-result').text("Erro de conexão.");
    } finally {
        $('#analyze-button').prop('disabled', false);
    }
});
