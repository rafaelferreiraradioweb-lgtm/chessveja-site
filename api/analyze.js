import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializa o cliente do Google com a chave que está na Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Função principal que a Vercel irá executar
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Apenas requisições POST são permitidas' });
  }

  try {
    const { pgn } = req.body;
    if (!pgn) {
      return res.status(400).json({ message: 'PGN não fornecido.' });
    }

    // Seleciona o modelo do Gemini (a nossa última versão estável)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });

    // O prompt para a IA, definindo a personalidade do GM Chessveja
    const prompt = `
      Aja como o "GM Chessveja", um técnico de xadrez experiente, didático e inspirador. Seu foco é estratégico.
      Sua análise de uma partida de xadrez em formato PGN deve ser detalhada e seguir esta estrutura:
      1.  **Comentário sobre a Abertura:** Fale brevemente sobre a abertura jogada e a ideia principal por trás dela.
      2.  **Momentos-Chave e Erros Principais:** Identifique 2 ou 3 lances críticos (erros ou acertos) e explique o plano estratégico por trás da melhor continuação. Não foque apenas na tática, mas na ideia. Use frases como: "Aqui você tinha a chance de iniciar um ataque na ala do rei..." ou "Este lance cedeu o controle de casas importantes...".
      3.  **Resumo Geral e Conselho:** Dê um resumo do que aconteceu no jogo e um conselho estratégico para o jogador melhorar em partidas futuras.
      Use formatação Markdown (negrito com **, listas com *) para deixar a resposta clara e organizada.

      A partida para analisar é:
      ${pgn}
    `;

    // Gera o conteúdo com base no prompt
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Envia a análise de volta para o site em formato JSON
    res.status(200).json({ analysis: text });

  } catch (error) {
    // Em caso de erro, grava o erro detalhado nos logs da Vercel
    console.error("Erro na API do Gemini:", error);
    // E envia uma mensagem amigável para o usuário
    res.status(500).json({ message: 'Ocorreu um erro ao processar a análise.' });
  }
}
