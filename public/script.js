var board = null;
var game = new Chess();
var $status = $('#status');

// Configuração do Tabuleiro
function onDragStart (source, piece, position, orientation) {
  if (game.game_over()) return false;
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
}

function onDrop (source, target) {
  var move = game.move({ from: source, to: target, promotion: 'q' });
  if (move === null) return 'snapback';
  updateStatus();
}

function onSnapEnd () { board.position(game.fen()); }

function updateStatus () {
  var status = '';
  var moveColor = 'Brancas';
  if (game.turn() === 'b') { moveColor = 'Pretas'; }

  if (game.in_checkmate()) {
    status = 'Fim de jogo, ' + moveColor + ' sofreu xeque-mate.';
  } else if (game.in_draw()) {
    status = 'Fim de jogo, empate.';
  } else {
    status = moveColor + ' jogam.';
    if (game.in_check()) { status += ', ' + moveColor + ' está em xeque.'; }
  }
  $status.html(status);
}

var config = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
};
board = Chessboard('board', config);
updateStatus();

// --- BOTÕES DO TABULEIRO ---
$('#btn-start').on('click', function() { game.reset(); board.start(); updateStatus(); });
$('#btn-prev').on('click', function() { game.undo(); board.position(game.fen()); updateStatus(); });
$('#btn-flip').on('click', function() { board.flip(); });

// --- STOCKFISH LOCAL (NAVEGADOR) ---
var stockfish = new Worker('stockfish.js');
stockfish.onmessage = function(event) {
    var msg = event.data;
    if (msg.startsWith('info') && msg.includes('score')) {
        let scoreText = "Calculando...";
        if (msg.includes('mate')) {
            let mateValue = msg.split(' ')[msg.split(' ').indexOf('mate') + 1];
            scoreText = "Mate em " + mateValue;
        } else if (msg.includes('cp')) {
            let cpValue = parseInt(msg.split(' ')[msg.split(' ').indexOf('cp') + 1]);
            let eval = (cpValue / 100).toFixed(2);
            scoreText = "Avaliação: " + eval;
        }
        $('#stockfish-output').text(scoreText);
    }
};

// --- BOTÃO ANALISAR (LOGIN + OPENAI) ---
$('#analyze-button').on('click', async function() {
    
    // 1. TRAVA DE LOGIN BLINDADA
    if (typeof window.Clerk === 'undefined') {
        alert("O sistema está carregando. Por favor, aguarde alguns segundos e tente novamente.");
        return;
    }

    if (!window.Clerk.user) {
        alert("🔒 RECURSO EXCLUSIVO\n\nFaça Login para usar o Analisador Premium com a IA.");
        try {
            window.Clerk.openSignIn();
        } catch (e) {
            console.error("Erro ao abrir a tela de login:", e);
            alert("Erro ao carregar o login. Atualize a página e tente de novo.");
        }
        return;
    }

    // 2. VALIDAÇÃO DO PGN
    var pgn = $('#pgn-input').val();
    if (!pgn) { alert("Por favor, cole um PGN primeiro."); return; }

    var loadSuccess = game.load_pgn(pgn);
    if (!loadSuccess) { alert("PGN inválido."); return; }
    
    board.position(game.fen());
    updateStatus();

    // Roda o Stockfish
    stockfish.postMessage('position fen ' + game.fen());
    stockfish.postMessage('go depth 15');

    // Avisa que está pensando
    $('#ai-result').html('<em>A IA do Chessveja está analisando... aguarde...</em>');
    $('#analyze-button').prop('disabled', true);

    // 3. COMUNICAÇÃO COM O SERVIDOR (API)
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                pgn: pgn,
                level: $('#analysis-level').val(),
                tone: $('#analysis-tone').val(),
                color: $('#analysis-color').val()
            })
        });

        const data = await response.json();
        
        if (data.analysis) {
             if (typeof marked !== 'undefined') {
                 $('#ai-result').html(marked.parse(data.analysis));
             } else {
                 $('#ai-result').html(data.analysis);
             }
        } else {
             $('#ai-result').text("Erro na análise.");
        }

    } catch (error) {
        console.error("Erro na API de Análise:", error);
        $('#ai-result').text("Erro de conexão com o servidor. Tente novamente mais tarde.");
    } finally {
        $('#analyze-button').prop('disabled', false);
    }
});
