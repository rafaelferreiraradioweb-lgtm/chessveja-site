/* ======================================================================== */
/* CÓDIGO DO ANALISADOR DE PARTIDAS (COMPLETO E CORRIGIDO)                 */
/* ======================================================================== */

// Variáveis Globais
var board = null;
var game = new Chess();
var pgnEl = $('#pgn-input');
var statusEl = $('#status');
var stockfish = new Worker('stockfish.js');
var currentPgn = null;
var currentMoves = [];
var currentMove = -1;

// --- Funções do Tabuleiro (Stockfish, Movimento, etc.) ---

function onDragStart(source, piece, position, orientation) {
    if (game.isGameOver()) return false;
    if (piece.search(/^b/) !== -1) return false;
}

function onDrop(source, target) {
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q'
    });
    if (move === null) return 'snapback';
    updateStatus();
    currentMoves = game.history({ verbose: true });
    currentMove = currentMoves.length - 1;
    triggerStockfish();
}

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

function triggerStockfish() {
    $('#stockfish-output').html('Pensando...');
    stockfish.postMessage('position fen ' + game.fen());
    stockfish.postMessage('go depth 15');
}

stockfish.onmessage = function(event) {
    var message = event.data;
    if (message.startsWith('bestmove')) {
        var bestMove = message.split(' ')[1];
        $('#stockfish-output').html('Melhor lance: ' + bestMove);
    }
};

// --- Botões de Navegação (Setas, Início, Fim) ---

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
        triggerStockfish();
    }
});

$('#btn-next').on('click', function() {
    if (currentMove < currentMoves.length - 1) {
        currentMove++;
        game.move(currentMoves[currentMove].san);
        board.position(game.fen());
        updateStatus();
        triggerStockfish();
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

$('#btn-flip').on('click', function() {
    board.flip();
});

// --- Botão Principal: ANALISAR (CÉREBRO DA IA) ---

$('#analyze-button').on('click', async function() {
    var pgn = pgnEl.val();
    
    // 1. Pega os valores das novas opções
    var cor = $('#analysis-color').val();
    var nivel = $('#analysis-level').val();
    var tom = $('#analysis-tone').val();
    
    if (!game.load_pgn(pgn)) {
        alert('PGN inválido. Por favor, cole um PGN completo.');
        return;
    }

    // Atualiza o tabuleiro e o Stockfish
    currentPgn = pgn;
    currentMoves = game.history({ verbose: true });
    currentMove = currentMoves.length - 1;
    board.position(game.fen());
    updateStatus();
    triggerStockfish(); 
    
    // 2. Mostra o status de "Carregando"
    const outputDiv = $('#gemini-output');
    const analyzeButton = $(this);
    outputDiv.html('Aguardando análise da IA (isso pode levar alguns segundos)...');
    analyzeButton.prop('disabled', true).text('Analisando...');

    try {
        // 3. (A PARTE QUE FALTAVA) Chama a nossa API
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pgn: pgn,
                cor: cor,
                nivel: nivel,
                tom: tom
            }),
        });

        if (!response.ok) {
            // Se a API der erro (ex: erro 500 ou 404)
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro desconhecido na API');
        }

        const data = await response.json();
        
        // 4. Converte a resposta (Markdown) para HTML e exibe
        // (Usamos a biblioteca 'marked' que já está no seu index.html)
        outputDiv.html(marked.parse(data.analysis)); 

    } catch (error) {
        console.error('Erro ao chamar a API:', error);
        outputDiv.html(`<p style="color: red;">Houve um erro ao buscar a análise: ${error.message}</p>`);
    } finally {
        // 5. Reativa o botão
        analyzeButton.prop('disabled', false).text('Carregar PGN e Analisar');
    }
});


// --- Configuração Inicial do Tabuleiro ---
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
