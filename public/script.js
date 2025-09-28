// Aguarda o carregamento do DOM para evitar erros
document.addEventListener('DOMContentLoaded', () => {

    console.log("DOM carregado. Iniciando script principal...");

    // --- Variáveis Globais ---
    let board = null;
    const game = new Chess();
    const geminiResultDiv = document.getElementById('gemini-output');
    
    // --- Configuração de Depuração do Stockfish ---
    console.log("Tentando criar o Worker do Stockfish a partir de 'stockfish.js'...");
    const stockfish = new Worker('stockfish.js');
    console.log("Objeto Worker do Stockfish criado:", stockfish);

    let stockfishReady = false;
    const stockfishOutputEl = document.getElementById('stockfish-output');

    stockfish.addEventListener('message', function (e) {
        // Mostra TUDO que o Stockfish nos diz
        console.log("Mensagem recebida do Stockfish:", e.data); 

        const message = e.data;

        if (message === 'uciok') {
            console.log("UCI OK recebido! Stockfish está pronto.");
            stockfishReady = true;
            stockfish.postMessage('setoption name Threads value 4');
            stockfish.postMessage('setoption name Hash value 128');
            updateStatus(); // Chama a primeira análise assim que estiver pronto
        }
        
        if (message.startsWith('info depth') && message.includes('score cp') && message.includes('pv')) {
             const parts = message.split(' ');
             const scoreIndex = parts.indexOf('score') + 2;
             const pvIndex = parts.indexOf('pv');
             
             const score = parts[scoreIndex] / 100.0;
             const uciSequence = parts.slice(pvIndex + 1).join(' ');
             const sanSequence = convertUciSequenceToSan(game.fen(), uciSequence);
             
             stockfishOutputEl.innerHTML = `Avaliação: <strong>${score.toFixed(2)}</strong><br>Melhor Sequência: ${sanSequence}`;
        }
    });
    
    // Adiciona um listener para erros do Worker
    stockfish.addEventListener('error', function(e) {
        console.error("Ocorreu um erro DENTRO do Worker do Stockfish:", e);
    });

    console.log("Enviando comando 'uci' para o Stockfish...");
    stockfish.postMessage('uci');

    // --- FUNÇÃO DE TRADUÇÃO ---
    function convertUciSequenceToSan(fen, uciSequence) {
        const tempGame = new Chess(fen);
        const uciMoves = uciSequence.split(' ');
        const sanMoves = [];
        for (const uciMove of uciMoves) {
            let movePrefix = "";
            if (tempGame.turn() === 'w') {
                movePrefix = tempGame.move_number() + ". ";
            } else if (sanMoves.length === 0) {
                movePrefix = tempGame.move_number() + "... ";
            }
            const move = tempGame.move(uciMove, { sloppy: true });
            if (move) {
                sanMoves.push(movePrefix + move.san);
            } else { break; }
        }
        return sanMoves.join(' ');
    }

    // --- Elementos do DOM ---
    const analyzeButton = document.getElementById('analyze-button');
    const pgnInput = document.getElementById('pgn-input');
    const statusEl = document.getElementById('status');

    // --- Funções do Tabuleiro ---
    function askStockfishToAnalyze() {
        if(stockfishReady){
            console.log("Enviando posição para análise do Stockfish:", game.fen());
            stockfish.postMessage(`position fen ${game.fen()}`);
            stockfish.postMessage('go depth 18');
        } else {
            console.warn("Stockfish não está pronto, análise adiada.");
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
        askStockfishToAnalyze();
    }

    // --- Configuração do Tabuleiro ---
    const config = {
        draggable: true,
        position: 'start',
        pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
        onDrop: function (source, target) {
            const move = game.move({ from: source, to: target, promotion: 'q' });
            if (move === null) return 'snapback';
            updateStatus();
        },
        onSnapEnd: function() {
            board.position(game.fen());
        }
    };
    board = Chessboard('board', config);
    // Não chama updateStatus aqui, espera o 'uciok'
    
    // ... resto do código (botões e função do Gemini) ...
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
        game.load_pgn(pgnInput.value);
        board.position(game.fen());
        currentMoveIndex = history.length - 1;
        updateStatus();
    });

    analyzeButton.addEventListener('click', async () => {
        const pgn = pgnInput.value;
        if (!pgn.trim()) { alert("Por favor, cole um PGN válido."); return; }
        if (!loadPgnIntoHistory(pgn)) { alert("PGN inválido. Por favor, verifique o formato."); return; }
        geminiResultDiv.innerHTML = '<p>Analisando com o GM Chessveja...</p>';
        analyzeButton.disabled = true;
        analyzeButton.textContent = 'Analisando...';
        try {
            const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pgn: pgn }), });
            if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || 'Houve um problema com a análise.'); }
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
