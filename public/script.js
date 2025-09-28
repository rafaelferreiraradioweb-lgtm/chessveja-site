// Aguarda o carregamento do DOM para evitar erros
document.addEventListener('DOMContentLoaded', () => {

    // --- Variáveis Globais ---
    let board = null;
    const game = new Chess();
    const geminiResultDiv = document.getElementById('gemini-output');

    // --- Elementos do DOM ---
    const analyzeButton = document.getElementById('analyze-button');
    const pgnInput = document.getElementById('pgn-input');
    const statusEl = document.getElementById('status');
    const boardEl = document.getElementById('board');

    // --- Funções do Tabuleiro ---
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
    }

    // --- Configuração do Tabuleiro ---
    const config = {
        draggable: false, // Peças não podem ser arrastadas por enquanto
        position: 'start',
        pieceTheme: 'https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/img/chesspieces/wikipedia/{piece}.png'
    };
    board = Chessboard('board', config);

    // --- Event Listeners dos Botões de Navegação ---
    document.getElementById('btn-start').addEventListener('click', () => {
        game.reset();
        board.position(game.fen());
    });
    document.getElementById('btn-prev').addEventListener('click', () => {
        game.undo();
        board.position(game.fen());
        updateStatus();
    });
    document.getElementById('btn-next').addEventListener('click', () => {
        game.move(game.history()[game.history().length - 1] || ''); // Hack para avançar
        // A biblioteca chess.js não tem um "redo" nativo, então avançar requer mais lógica
        // Por enquanto, esta é uma simplificação.
        // A forma correta será implementada com a navegação da partida.
        // Temporariamente, vamos focar em carregar o PGN.
        // A funcionalidade completa de "next" será adicionada.
        // Esta é uma limitação conhecida que resolveremos.
        alert("Função 'Próximo' em desenvolvimento. Use as setas do teclado para navegar por enquanto após carregar o PGN.");
    });
    document.getElementById('btn-end').addEventListener('click', () => {
        while (game.history().length > 0) {
            game.move(game.history()[game.history().length-1]);
        }
        // Simulação, a lógica de "redo" é complexa.
        // Carregar o PGN é o foco principal.
    });


    // --- Função Principal de Análise ---
    analyzeButton.addEventListener('click', async () => {
        const pgn = pgnInput.value;
        if (!pgn.trim()) {
            alert("Por favor, cole um PGN válido.");
            return;
        }

        // Carrega o PGN no motor de xadrez chess.js
        const loaded = game.load_pgn(pgn);
        if (!loaded) {
            alert("PGN inválido. Por favor, verifique o formato.");
            return;
        }

        // Atualiza o tabuleiro para a posição final do PGN
        board.position(game.fen());
        updateStatus();

        // Limpa e prepara para a análise do Gemini
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
