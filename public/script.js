var board = null
var game = new Chess()

// Configuração simples do tabuleiro
var config = { draggable: true, position: 'start', onDrop: handleMove }
board = Chessboard('board', config)

function handleMove(source, target) {
    var move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback'; 
}

// LÓGICA DO BOTÃO
$('#analyze-button').on('click', async function() {
    
    // --- [TRAVA] VERIFICA SE ESTÁ LOGADO ---
    if (!window.Clerk || !window.Clerk.user) {
        alert("🔒 RECURSO EXCLUSIVO\n\nVocê precisa fazer Login Grátis para usar o Analisador Premium.");
        window.Clerk.openSignIn(); // Abre a janela de login
        return; // Para tudo aqui
    }
    // ---------------------------------------

    var pgn = $('#pgn-input').val();
    if (!pgn) { alert("Cole o PGN da partida!"); return; }

    game.load_pgn(pgn);
    board.position(game.fen());

    $('#gemini-output').html('<em>Enviando para o ChatGPT... aguarde...</em>');
    $('#analyze-button').prop('disabled', true);

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
             // Formata o texto bonito (Markdown)
             if (typeof marked !== 'undefined') {
                 $('#gemini-output').html(marked.parse(data.analysis));
             } else {
                 $('#gemini-output').html(data.analysis);
             }
        } else {
             $('#gemini-output').text("Erro ao receber análise.");
        }

    } catch (error) {
        console.error(error);
        $('#gemini-output').text("Erro de conexão com o servidor.");
    } finally {
        $('#analyze-button').prop('disabled', false);
    }
});
