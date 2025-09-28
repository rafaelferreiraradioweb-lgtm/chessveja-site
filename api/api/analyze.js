// Importa o SDK do Google Generative AI
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Função principal que a Vercel irá executar
export default async function handler(req, res) {
  // Garante que a requisição seja do tipo POST (envio de dados)
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Apenas requisições POST são permitidas' });
  }

  try {
    // Pega o PGN enviado pelo site (frontend)
    const { pgn } = req.body;
    if (!pgn) {
      return res.status(400).json({ message: 'PGN não fornecido.' });
    }

    // Inicializa o cliente da IA com a chave secreta que configuramos na Vercel
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // O prompt detalhado para a IA, definindo sua personalidade
    const prompt = `
      Aja como o "GM Chessveja", um técnico de xadrez experiente e inspirador. Seu foco é estratégico.
      Analise a seguinte partida de xadrez em formato PGN.
      Sua análise deve ser detalhada e seguir esta estrutura:
      1.  **Comentário sobre a Abertura:** Fale brevemente sobre a abertura jogada e a ideia principal por trás dela.
      2.  **Momentos-Chave e Erros Principais:** Identifique 2 ou 3 lances críticos (erros ou acertos) e explique o plano estratégico por trás da melhor continuação. Não foque apenas na tática, mas na ideia. Use frases como: "Aqui você tinha a chance de iniciar um ataque na ala do rei..." ou "Este lance cedeu o controle de casas importantes...".
      3.  **Resumo Geral e Conselho:** Dê um resumo do que aconteceu no jogo e um conselho estratégico para o jogador melhorar em partidas futuras.

      Use formatação Markdown (negrito com **, listas com *) para deixar a resposta clara.
      A partida é:
      ${pgn}
    `;

    // Gera o conteúdo com base no prompt
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Envia a análise de volta para o site
    res.status(200).json({ analysis: text });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ocorreu um erro ao processar a análise.' });
  }
}
