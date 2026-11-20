document.addEventListener('DOMContentLoaded', () => {
    const chess = new Chess();
    let moveHistory = [];
    let currentMoveIndex = -1;
    let stockfish = null;

    // Inicializa o tabuleiro visual com tema de peças confiável
    const board = Chessboard('board', {
        position: 'start',
        draggable: false,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    });

    window.addEventListener('resize', () => board.resize());

    // Elementos da interface
    const statusEl = document.getElementById('status');
    const pgnInput = document.getElementById('pgn-input');
    const analyzeBtn = document.getElementById('analyze-button');
    const stockfishOutput = document.getElementById('stockfish-output');
    const aiResult = document.getElementById('ai-result');

    // Inicializa Stockfish de forma protegida (nunca trava o resto da página)
    try {
        stockfish = new Worker('stockfish.js');
        stockfish.onmessage = (event) => {
            const line = typeof event.data === 'string' ? event.data : '';
            if (line.startsWith('info depth') && line.includes(' pv ')) {
                const depthMatch = line.match(/depth (\d+)/);
                const cpMatch = line.match(/score cp (-?\d+)/);
                const mateMatch = line.match(/score mate (-?\d+)/);
                const pvMatch = line.match(/ pv (.+)/);

                const depth = depthMatch ? depthMatch[1] : '?';
                const bestMoves = pvMatch ? pvMatch[1].split(' ').slice(0, 5).join(' ') : '';
                let evalText = '';

                if (mateMatch) {
                    const mateIn = parseInt(mateMatch[1], 10);
                    evalText = mateIn > 0 ? `Mate em ${mateIn}` : `Mate sofrido em ${Math.abs(mateIn)}`;
                } else if (cpMatch) {
                    const turn = chess.turn();
                    let score = parseInt(cpMatch[1], 10) / 100;
                    if (turn === 'b') score = -score;
                    evalText = (score >= 0 ? `+${score.toFixed(2)}` : score.toFixed(2));
                }

                if (evalText && stockfishOutput) {
                    stockfishOutput.innerHTML = `<strong>Avaliação (Profundidade ${depth}):</strong> ${evalText}<br><small>Sequência sugerida: ${bestMoves}</small>`;
                }
            }
        };
        stockfish.postMessage('uci');
    } catch (e) {
        console.warn('Stockfish indisponível neste navegador:', e);
        if (stockfishOutput) {
            stockfishOutput.innerText = 'Engine local indisponível. A análise da IA funcionará normalmente.';
        }
    }

    function avaliarPosicaoStockfish(fen) {
        if (!stockfish) return;
        try {
            stockfish.postMessage('stop');
            stockfish.postMessage(`position fen ${fen}`);
            stockfish.postMessage('go depth 14');
        } catch (e) {
            console.warn('Erro ao enviar posição para Stockfish:', e);
        }
    }

    // Remove tags de relógio {[%clk ...]}, timestamps e formatações que travam o chess.js
    function limparPGN(rawPgn) {
        const linhas = rawPgn.replace(/\r\n/g, '\n').split('\n');
        const headers = [];
        const corpoLances = [];

        for (const linha of linhas) {
            const trimmed = linha.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                headers.push(trimmed);
            } else if (trimmed !== '') {
                corpoLances.push(trimmed);
            }
        }

        let moves = corpoLances.join(' ');
        // Remove comentários e relógios entre chaves {[%clk ...][%timestamp ...]}
        moves = moves.replace(/\{[^}]*\}/g, ' ');
        // Remove variantes entre parênteses
        while (/\([^()]*\)/.test(moves)) {
            moves = moves.replace(/\([^()]*\)/g, ' ');
        }
        // Remove numeração de lance das pretas tipo "28..."
        moves = moves.replace(/\b\d+\.\.\.\s*/g, ' ');
        // Remove anotações numéricas tipo $1, $2
        moves = moves.replace(/\$\d+/g, ' ');
        // Limpa espaços duplicados
        moves = moves.replace(/\s+/g, ' ').trim();

        return headers.length > 0 ? `${headers.join('\n')}\n\n${moves}` : moves;
    }

    // Atualiza o tabuleiro para um índice específico do histórico
    function irParaLance(index) {
        const tempChess = new Chess();
        const header = chess.header();
        if (header && header.FEN) {
            tempChess.load(header.FEN);
        }

        for (let i = 0; i <= index; i++) {
            tempChess.move(moveHistory[i]);
        }

        currentMoveIndex = index;
        board.position(tempChess.fen());

        if (index === -1) {
            statusEl.innerText = `Posição inicial (${moveHistory.length} lances carregados).`;
        } else {
            const numeroLance = Math.floor(index / 2) + 1;
            const lado = index % 2 === 0 ? '.' : '...';
            statusEl.innerText = `Lance ${numeroLance}${lado} ${moveHistory[index].san} (${index + 1}/${moveHistory.length})`;
        }

        avaliarPosicaoStockfish(tempChess.fen());
    }

    // Controles do tabuleiro
    document.getElementById('btn-start')?.addEventListener('click', () => {
        if (moveHistory.length > 0) irParaLance(-1);
    });

    document.getElementById('btn-prev')?.addEventListener('click', () => {
        if (moveHistory.length > 0 && currentMoveIndex >= 0) {
            irParaLance(currentMoveIndex - 1);
        }
    });

    document.getElementById('btn-next')?.addEventListener('click', () => {
        if (moveHistory.length > 0 && currentMoveIndex < moveHistory.length - 1) {
            irParaLance(currentMoveIndex + 1);
        }
    });

    document.getElementById('btn-end')?.addEventListener('click', () => {
        if (moveHistory.length > 0) irParaLance(moveHistory.length - 1);
    });

    document.getElementById('btn-flip')?.addEventListener('click', () => {
        board.flip();
    });

    // Botão principal: Carregar PGN e Analisar
    analyzeBtn?.addEventListener('click', async () => {
        const rawPgn = pgnInput.value.trim();

        if (!rawPgn) {
            statusEl.innerText = 'Por favor, cole o PGN de uma partida antes de clicar.';
            return;
        }

        const pgnLimpo = limparPGN(rawPgn);
        chess.reset();
        const carregou = chess.load_pgn(pgnLimpo, { sloppy: true });

        if (!carregou) {
            statusEl.innerText = 'PGN inválido. Verifique se copiou todos os lances da partida.';
            return;
        }

        // Carrega os lances no tabuleiro imediatamente
        moveHistory = chess.history({ verbose: true });
        if (moveHistory.length === 0) {
            statusEl.innerText = 'Nenhum lance encontrado no PGN.';
            return;
        }

        // Vai para o lance final para visualização imediata
        irParaLance(moveHistory.length - 1);

        // Dispara a análise com Google Gemini
        const color = document.getElementById('analysis-color')?.value || 'brancas';
        const level = document.getElementById('analysis-level')?.value || 'iniciante';
        const tone = document.getElementById('analysis-tone')?.value || 'tecnico';

        analyzeBtn.disabled = true;
        analyzeBtn.innerText = 'Analisando partida com IA... ⏳';
        aiResult.innerHTML = '<em>A Inteligência Artificial do Chessveja está estudando os lances...</em>';

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pgn: pgnLimpo,
                    color,
                    level,
                    tone
                })
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || 'Falha ao obter resposta da IA.');
            }

            if (typeof marked !== 'undefined' && marked.parse) {
                aiResult.innerHTML = marked.parse(data.analysis);
            } else {
                aiResult.innerHTML = data.analysis.replace(/\n/g, '<br>');
            }

        } catch (error) {
            aiResult.innerHTML = `<span style="color: #e74c3c; font-weight: bold;">Erro: ${error.message}</span>`;
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerText = 'Carregar PGN e Analisar';
        }
    });
});
