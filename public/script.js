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
  
  // Atualiza o output do Stockfish com a avaliação se disponível
  // (Lógica simples para limpar se necessário)
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
    // Nota: Para implementar 'Next' real, precisaríamos salvar o histórico de movimentos.
    // O chess.js perde o histórico ao usar undo(). 
    // Por simplicidade, este botão está apenas decorativo ou precisaria de lógica extra.
    alert("Para avançar, carregue um PGN completo.");
});

$('#btn-end').on('click', function() {
    // Mesma lógica do Next, precisaria carregar o PGN inteiro.
});

$('#btn-flip').on('click', function() {
    board.flip();
});


// --- LÓGICA DE ANÁLISE ---

// Variável global para o Worker do Stockfish
var stockfish = new Worker('stockfish.js');

stockfish.onmessage = function(event) {
    // Simples parse da mensagem do Stockfish para pegar o CP (Centipawns) ou Mate
    // Exemplo de msg: "info depth 10 seldepth 15 multipv 1 score cp 25 ..."
    var msg = event.data;
    if (msg.startsWith('info') && msg.includes('score')) {
        let scoreText = "Calculando...";
        
        if (msg.includes('mate')) {
            let mateIndex = msg.indexOf('mate') + 5;
            let mateValue = msg.split(' ')[msg.split(' ').indexOf('mate') + 1];
            scoreText = "Mate em " + mateValue;
        } else if (msg.includes('cp')) {
            let cpIndex = msg.indexOf('cp') + 3;
            let cpValue = parseInt(msg.split(' ')[msg.split(' ').indexOf('cp') + 1]);
            // Ajusta para o ponto de vista (Stockfish sempre dá score para as brancas relativo ou lado a jogar)
            let eval = (cpValue / 100).toFixed(2);
            scoreText = "Avaliação: " + eval;
        }
        
        $('#stockfish-output').text(scoreText);
    }
};

$('#analyze-button').on('click', async function() {
    
    // --- [NOVO] TRAVA DE SEGURANÇA (LOGIN) ---
    if (!window.Clerk || !window.Clerk.user) {
        // Se não tiver usuário logado:
        alert("🔒 Acesso Restrito!\n\nVocê precisa criar uma conta gratuita (ou fazer login) para usar o Analisador.");
        
        // Abre a janela de login automaticamente
        window.Clerk.openSignIn();
        
        // Para a execução do código aqui. Não analisa nada.
        return; 
    }
    // ------------------------------------------

    var pgn = $('#pgn-input').val();
    if (!pgn) {
        alert("Por favor, cole um PGN primeiro.");
        return;
    }

    // Carrega o PGN no tabuleiro
    var loadSuccess = game.load_pgn(pgn);
    if (!loadSuccess) {
        alert("PGN inválido. Verifique se copiou corretamente.");
        return;
    }
    board.position(game.fen());
    updateStatus();

    // 1. Análise Técnica (Stockfish Local)
    // Envia a posição atual para o Stockfish
    stockfish.postMessage('position fen ' + game.fen());
    stockfish.postMessage('go depth 15'); // Profundidade 15 para ser rápido

    // 2. Análise Explicativa (Gemini IA via API)
    $('#gemini-output').html('<em>O GM Chessveja está analisando sua partida... isso pode levar alguns segundos.</em>');
    $('#analyze-button').prop('disabled', true); // Evita duplo clique

    // Captura as opções selecionadas
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
            })
        });

        const data = await response.json();

        if (data.analysis) {
            // Converte Markdown para HTML (usando biblioteca marked se disponível, ou texto puro)
            if (typeof marked !== 'undefined') {
                $('#gemini-output').html(marked.parse(data.analysis));
            } else {
                $('#gemini-output').text(data.analysis);
            }
        } else {
            $('#gemini-output').text("Erro ao obter análise. Tente novamente.");
        }

    } catch (error) {
        console.error("Erro na API:", error);
        $('#gemini-output').text("Erro de conexão com o servidor.");
    } finally {
        $('#analyze-button').prop('disabled', false); // Libera o botão
    }
});
