// Aguarda o carregamento do DOM para evitar erros
document.addEventListener('DOMContentLoaded', () => {

    // --- Variáveis Globais ---
    let board = null;
    const game = new Chess();
    const geminiResultDiv = document.getElementById('gemini-output');
    
    // Configuração do Stockfish
    const stockfish = new Worker('stockfish.js');
    let stockfishReady = false;
    const stockfishOutputEl = document.getElementById('stockfish-output');

    stockfish.addEventListener('message', function (e) {
        const message = e.data;

        if (message === 'uciok') {
            stockfishReady = true;
            // Configura o Stockfish após ele estar pronto
            stockfish.postMessage('setoption name Threads value 4'); // Usa mais poder de processamento
            stockfish.postMessage('setoption name Hash value 128'); // Aloca mais memória
        }
        
        // Procura pela linha que contém a avaliação e o melhor lance
        if (message.startsWith('info depth') && message.includes('score cp')) {
             const parts = message.split(' ');
             const scoreIndex = parts.indexOf('score') + 2;
             const pvIndex = parts.indexOf('pv');
             
             const score = parts[scoreIndex] / 100.0;
             const bestMoves = parts.slice(pvIndex + 1).join(' ');
             
             stockfishOutputEl.innerHTML = `Avaliação: <strong>${score.toFixed(2)}</strong><br>Melhor Sequência: ${bestMoves}`;
        }
        
        if (message.startsWith('bestmove')) {
            // A informação mais útil já foi pega da linha "info depth", então podemos ignorar o bestmove simples
        }
    });

    stockfish.postMessage('uci');


    // --- Elementos do DOM ---
    const analyzeButton = document.getElementById('analyze-button');
    const pgnInput = document.getElementById('pgn-input');
    const statusEl = document.getElementById('status');

    // --- Funções do Tabuleiro ---
    function askStockfishToAnalyze() {
        if(stockfishReady){
            stockfish.postMessage(`position fen ${game.fen()}`);
            stockfish.postMessage('go depth 18');
        }
    }

    function updateStatus() {
        let status = '';
        const moveColor = game.turn() === 'b' ? 'Pretas' : 'Brancas';

        if (game.in_checkmate()) {
            status = `Fim de jogo, ${moveColor} estão em xeque-mate.`;
        } else if (game.in_draw()) {
            status = 'Fim de jogo, empate.';
        } else {
            status = `É a vez das ${moveColor}.`;
            if (game.in_check()) {
                status += `, ${moveColor} estão em xeque.`;
            }
        }
        statusEl.textContent = status;
        askStockfishToAnalyze(); // Pede análise a cada atualização de status
    }

    // --- Configuração do Tabuleiro ---
    const config = {
        draggable: true,
        position: 'start',
        pieceTheme: 'https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/img/chesspieces/wikipedia/{piece}.png',
        onDrop: function (source, target) {
            const move = game.move({
                from: source,
                to: target,
                promotion: 'q'
            });

            if (move === null) return 'snapback';
            updateStatus();
        },
        onSnapEnd: function() {
            board.position(game.fen());
        }
    };
    board = Chessboard('board', config);
    updateStatus();

    // --- Event Listeners dos Botões de Navegação ---
    let history = [];
    let currentMoveIndex = -1;

    function loadPgnIntoHistory(pgn) {
        const tempGame = new Chess();
        if (!tempGame.load_pgn(pgn)) return false;
        history = tempGame.history({ verbose: true });
        currentMoveIndex = history.length - 1;
        game.load_pgn(pgn);
        board.position(game.fen());
        updateStatus();
        return true;
    }

    document.getElementById('btn-start').addEventListener('click', () => {
        if (history.length === 0) return;
        game.reset();
        board.position(game.fen());
        currentMoveIndex = -1;
        updateStatus();
    });

    document.getElementById('btn-prev').addEventListener('click', () => {
        if (currentMoveIndex < 0) return;
        game.undo();
        board.position(game.fen());
        currentMoveIndex--;
        updateStatus();
    });

    document.getElementById('btn-next').addEventListener('click', () => {
        if (currentMoveIndex >= history.length - 1) return;
        currentMoveIndex++;
        game.move(history[currentMoveIndex]);
        board.position(game.fen());
        updateStatus();
    });

    document.getElementById('btn-end').addEventListener('click', () => {
        if (history.length === 0) return;
        game.load_pgn(pgnInput.value); // Recarrega o PGN para ir para o final
        board.position(game.fen());
        currentMoveIndex = history.length - 1;
        updateStatus();
    });


    // --- Função Principal de Análise do Gemini ---
    analyzeButton.addEventListener('click', async () => {
        const pgn = pgnInput.value;
        if (!pgn.trim()) {
            alert("Por favor, cole um PGN válido.");
            return;
        }

        if (!loadPgnIntoHistory(pgn)) {
            alert("PGN inválido. Por favor, verifique o formato.");
            return;
        }

        geminiResultDiv.innerHTML = '<p>Analisando com o GM Chessveja...</p>';
        analyzeButton.disabled = true;
        analyzeButton.textContent = 'Analisando...';
        
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pgn: pgn }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Houve um problema com a análise.');
            }

            const data = await response.json();
            const formattedResult = marked.parse(data.analysis);
            geminiResultDiv.innerHTML = formattedResult;

        } catch (error) {
            geminiResultDiv.innerHTML = `<p style="color: #ffdddd;">${error.message}</p>`;
        } finally {
            analyzeButton.disabled = false;
            analyzeButton.textContent = 'Carregar PGN e Analisar';
        }
    });
});
