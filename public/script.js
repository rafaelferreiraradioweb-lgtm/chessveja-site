/* ======================================================================== */
/* CÓDIGO DO ANALISADOR DE PARTIDAS                                       */
/* ======================================================================== */

var board = null;
var game = new Chess();
var pgnEl = $('#pgn-input');
var statusEl = $('#status');
var stockfish = new Worker('stockfish.js');
var currentPgn = null;
var currentMoves = [];
var currentMove = -1;

function onDragStart(source, piece, position, orientation) {
    // só permite mover as peças brancas
    if (game.isGameOver()) return false;
    if (piece.search(/^b/) !== -1) return false;
}

function onDrop(source, target) {
    // tenta fazer o movimento
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // promove para dama automaticamente
    });

    // se for um movimento ilegal, volta a peça
    if (move === null) return 'snapback';

    // atualiza o status do jogo
    updateStatus();
    currentMoves = game.history({ verbose: true });
    currentMove = currentMoves.length - 1;
    // chama o stockfish para analisar
    triggerStockfish();
}

// atualiza o tabuleiro depois que a peça é solta
function onSnapEnd() {
    board.position(game.fen());
}

function updateStatus() {
    var status = '';
    var moveColor = 'Brancas';
    if (game.turn() === 'b') {
        moveColor = 'Pretas';
    }

    if (game.in_checkmate()) {
        status = 'Xeque-mate! ' + (moveColor === 'Brancas' ? 'Pretas' : 'Brancas') + ' vencem.';
    } else if (game.in_draw()) {
        status = 'Empate!';
    } else {
        status = 'Vez das ' + moveColor;
        if (game.in_check()) {
            status += ', ' + moveColor + ' estão em xeque.';
        }
    }
    statusEl.html(status);
}

// Função para chamar o Stockfish
function triggerStockfish() {
    $('#stockfish-output').html('Pensando...');
    stockfish.postMessage('position fen ' + game.fen());
    stockfish.postMessage('go depth 15'); // Aumentei a profundidade para uma análise melhor
}

// Recebe a resposta do Stockfish
stockfish.onmessage = function(event) {
    var message = event.data;
    if (message.startsWith('bestmove')) {
        var bestMove = message.split(' ')[1];
        $('#stockfish-output').html('Melhor lance: ' + bestMove);
    }
    
    // Você pode adicionar mais lógica aqui para exibir a avaliação (score)
    if (message.startsWith('info') && message.includes('score')) {
         // Código para extrair e mostrar a pontuação (opcional)
    }
};

// Botão Carregar PGN
$('#analyze-button').on('click', function() {
    var pgn = pgnEl.val();
    
    // *** AQUI VAMOS ADICIONAR A LÓGICA DAS NOVAS OPÇÕES (no próximo passo) ***
    var cor = $('#analysis-color').val();
    var nivel = $('#analysis-level').val();
    var tom = $('#analysis-tone').val();
    
    console.log("Opções selecionadas:", cor, nivel, tom); // Apenas para teste por enquanto
    
    if (game.load_pgn(pgn)) {
        currentPgn = pgn; // Salva o PGN
        currentMoves = game.history({ verbose: true });
        currentMove = currentMoves.length - 1;
        board.position(game.fen());
        updateStatus();
        triggerStockfish(); // Analisa a posição final
        
        // Limpa a análise antiga da IA
        $('#gemini-output').html('Aguardando análise...');
        
    } else {
        alert('PGN inválido.');
    }
});

// Botões de Navegação
$('#btn-start').on('click', function() {
    game.reset();
    currentMove = -1;
    board.position(game.fen());
    updateStatus();
    $('#stockfish-output').html('Aguardando posição...');
});

$('#btn-prev').on('click', function() {
    if (currentMove >= 0) {
        currentMove--;
        game.undo();
        board.position(game.fen());
        updateStatus();
        triggerStockfish(); // Re-analisa a posição anterior
    }
});

$('#btn-next').on('click', function() {
    if (currentMove < currentMoves.length - 1) {
        currentMove++;
        game.move(currentMoves[currentMove].san);
        board.position(game.fen());
        updateStatus();
        triggerStockfish(); // Analisa a próxima posição
    }
});

$('#btn-end').on('click', function() {
    if (currentPgn) {
        game.load_pgn(currentPgn);
        currentMove = currentMoves.length - 1;
        board.position(game.fen());
        updateStatus();
        triggerStockfish();
    }
});

// **** NOVO BOTÃO INVERTER (como você pediu) ****
$('#btn-flip').on('click', function() {
    board.flip();
});


// Configuração inicial do Chessboard
// Adicionado um 'DOMContentLoaded' para garantir que o HTML carregou
document.addEventListener('DOMContentLoaded', function() {
    var config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
    };
    board = Chessboard('board', config);
    updateStatus();
});
