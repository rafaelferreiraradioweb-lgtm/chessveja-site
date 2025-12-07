var board = null
var game = new Chess()
var $status = $('#status')
var $fen = $('#fen')
var $pgn = $('#pgn')

function onDragStart (source, piece, position, orientation) {
  if (game.game_over()) return false
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false
  }
}

function onDrop (source, target) {
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q' 
  })

  if (move === null) return 'snapback'

  updateStatus()
}

function onSnapEnd () {
  board.position(game.fen())
}

function updateStatus () {
  var status = ''
  var moveColor = 'Brancas'
  if (game.turn() === 'b') {
    moveColor = 'Pretas'
  }

  if (game.in_checkmate()) {
    status = 'Fim de jogo, ' + moveColor + ' sofreu xeque-mate.'
  } else if (game.in_draw()) {
    status = 'Fim de jogo, empate.'
  } else {
    status = moveColor + ' jogam.'
    if (game.in_check()) {
      status += ', ' + moveColor + ' está em xeque.'
    }
  }

  $status.html(status)
}

var config = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
}
board = Chessboard('board', config)

updateStatus()

// --- CONTROLES DO TABULEIRO ---
$('#btn-start').on('click', function() {
    game.reset();
    board.start();
    updateStatus();
    $('#stockfish-output').text('Aguardando posição...');
    $('#gemini-output').text('Aguardando análise...');
});

$('#btn-prev').on('click', function() {
    game.undo();
    board.position(game.fen());
    updateStatus();
});

$('#btn-next').on('click', function() {
    alert("Para avançar, carregue um PGN completo.");
});

$('#btn-end').on('click', function() {
    // Fim
});

$('#btn-flip').on('click', function() {
    board.flip();
});


// --- LÓGICA DE ANÁLISE ---
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

$('#analyze-button').on('click', async function() {
    
    // 1. TRAVA DE SEGURANÇA (LOGIN)
    // Se não tiver usuário logado, barra e pede login.
    if (!window.Clerk || !window.Clerk.user) {
        alert("🔒 Acesso Restrito!\n\nVocê precisa fazer login (grátis) para analisar suas partidas.");
        window.Clerk.openSignIn();
        return; 
    }

    var pgn = $('#pgn-input').val();
    if (!pgn) {
        alert("Por favor, cole um PGN primeiro.");
        return;
    }

    var loadSuccess = game.load_pgn(pgn);
    if (!loadSuccess) {
        alert("PGN inválido. Verifique se copiou corretamente.");
        return;
    }
    board.position(game.fen());
    updateStatus();

    // Inicia Stockfish
    stockfish.postMessage('position fen ' + game.fen());
    stockfish.postMessage('go depth 15');

    // UI de Carregamento
    $('#gemini-output').html('<em>O GM Chessveja está analisando sua partida... aguarde...</em>');
    $('#analyze-button').prop('disabled', true);

    const level = $('#analysis-level').val();
    const tone = $('#analysis-tone').val();
    const color = $('#analysis-color').val();

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                pgn: pgn,
                level: level,
                tone: tone,
                color: color
                // Email removido: acesso ilimitado para logados
            })
        });

        const data = await response.json();

        if (data.analysis) {
            // Sucesso! Mostra a análise
            if (typeof marked !== 'undefined') {
                $('#gemini-output').html(marked.parse(data.analysis));
            } else {
                $('#gemini-output').html(data.analysis);
            }
        } else {
            $('#gemini-output').text("Erro ao analisar. Tente novamente.");
        }

    } catch (error) {
        console.error("Erro na API:", error);
        $('#gemini-output').text("Erro de conexão com o servidor.");
    } finally {
        $('#analyze-button').prop('disabled', false);
    }
});
