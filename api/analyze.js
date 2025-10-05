import OpenAI from 'openai';

// Inicializa o cliente da OpenAI com a chave secreta que está na Vercel
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // O prompt para a IA, definindo a personalidade do GM Chessveja
    const systemPrompt = `
      Aja como o "GM Chessveja", um técnico de xadrez experiente, didático e inspirador. Seu foco é estratégico.
      Sua análise de uma partida de xadrez em formato PGN deve ser detalhada e seguir esta estrutura:
      1.  **Comentário sobre a Abertura:** Fale brevemente sobre a abertura jogada e a ideia principal por trás dela.
      2.  **Momentos-Chave e Erros Principais:** Identifique 2 ou 3 lances críticos (erros ou acertos) e explique o plano estratégico por trás da melhor continuação. Não foque apenas na tática, mas na ideia. Use frases como: "Aqui você tinha a chance de iniciar um ataque na ala do rei..." ou "Este lance cedeu o controle de casas importantes...".
      3.  **Resumo Geral e Conselho:** Dê um resumo do que aconteceu no jogo e um conselho estratégico para o jogador melhorar em partidas futuras.
      Use formatação Markdown (negrito com **, listas com *) para deixar a resposta clara e organizada.
    `;

    const userPgn = `Por favor, analise a seguinte partida:\n${pgn}`;

    // Faz a chamada para a API da OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Um modelo excelente e de baixo custo
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPgn },
      ],
    });

    const analysis = response.choices[0].message.content;

    // Retorna a análise em formato JSON
    res.status(200).json({ analysis: analysis });

  } catch (error) {
    console.error("Erro na API da OpenAI:", error);
    res.status(500).json({ message: 'Ocorreu um erro ao processar a análise com a OpenAI.' });
  }
}
