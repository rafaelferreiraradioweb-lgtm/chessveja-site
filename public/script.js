console.log("Meu script.js está funcionando!");
// Aguarda o carregamento completo da página para começar a "ouvir" os eventos
document.addEventListener('DOMContentLoaded', () => {

    // Pega os elementos do HTML com os quais vamos interagir
    const analyzeButton = document.getElementById('analyze-button');
        const pgnInput = document.getElementById('pgn-input');
    // ...
    const pgnInput = document.getElementById('pgn-input');
    const analysisResultDiv = document.getElementById('analysis-result');

    // Adiciona um "ouvinte" ao botão. Ele vai disparar uma função quando o botão for clicado.
    analyzeButton.addEventListener('click', async () => {
        
        const pgn = pgnInput.value;

        // 1. Validação Simples: Verifica se o campo de PGN não está vazio
        if (!pgn.trim()) {
            analysisResultDiv.innerHTML = '<p style="color: #ffdddd;">Por favor, cole um PGN válido para análise.</p>';
            return;
        }

        // 2. Feedback ao Usuário: Mostra uma mensagem de "carregando"
        analyzeButton.disabled = true;
        analyzeButton.textContent = 'Analisando, por favor aguarde...';
        analysisResultDiv.innerHTML = '<p>O GM Chessveja está aquecendo as peças...</p>';

        try {
            // 3. Envio para o "Mensageiro" (Backend - que criaremos no próximo passo)
            // A mágica acontece aqui: estamos enviando o PGN para a nossa API.
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pgn: pgn }),
            });

            if (!response.ok) {
                throw new Error('Houve um problema com a análise. Tente novamente.');
            }

            const data = await response.json();
            
            // 4. Exibição do Resultado:
            // Usamos a biblioteca 'marked' para formatar o texto que a IA retorna (com negrito, listas, etc.)
            const formattedResult = marked.parse(data.analysis);
            analysisResultDiv.innerHTML = formattedResult;

        } catch (error) {
            analysisResultDiv.innerHTML = `<p style="color: #ffdddd;">${error.message}</p>`;
        } finally {
            // 5. Finalização: Reabilita o botão para uma nova análise
            analyzeButton.disabled = false;
            analyzeButton.textContent = 'Analisar com GM Chessveja';
        }
    });
});




