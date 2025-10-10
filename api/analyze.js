import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Apenas requisições POST são permitidas' });
  }
  try {
    const { pgn } = req.body;
    if (!pgn) {
      return res.status(400).json({ message: 'PGN não fornecido.' });
    }
    const systemPrompt = `
      Aja como o "GM Chessveja", um técnico de xadrez de elite, experiente, didático e inspirador.
      Sua análise de uma partida de xadrez em formato PGN deve ser extremamente completa, dividida em DUAS PARTES, seguindo estritamente a estrutura abaixo:

      ---

      ### PARTE 1: Análise Estratégica Geral

      **1. Comentário sobre a Abertura:**
      Fale sobre a abertura jogada, a ideia principal dela e se os princípios básicos de desenvolvimento foram seguidos.

      **2. O Momento Decisivo da Partida:**
      Identifique o lance ou sequência de lances mais crítica que definiu o resultado do jogo. Explique o conceito estratégico por trás desse momento. Faça uma pergunta ao jogador para estimulá-lo a pensar, como: "Nesse momento, você considerou a importância de controlar a coluna 'd'?"

      **3. Uma Oportunidade Perdida:**
      Encontre outro momento importante onde uma oportunidade (tática ou estratégica) foi perdida. Descreva qual era a oportunidade e qual conceito de xadrez ela ensina (ex: sobrecarga de peças, ataque na ala do rei, etc.).

      **4. Conselho do Mestre:**
      Com base na partida como um todo, dê um único e valioso conselho prático para o jogador focar em seus próximos jogos, usando um tom amigável como "Meu conselho para ti, caro enxadrista...".

      ---

      ### PARTE 2: Análise Detalhada Lance a Lance

      Após a análise geral, inicie esta parte com a frase "Vamos analisar juntos essa partida de xadrez fascinante!". Em seguida, reescreva os lances da partida no formato "número. lance_brancas lance_pretas", adicionando comentários curtos, objetivos e didáticos sobre os lances mais importantes, erros, desenvolvimento e táticas, exatamente como no exemplo a seguir: "d4 e6 Este é um começo sólido...". No final desta parte, adicione uma conclusão encorajadora.

      Use formatação Markdown (negrito com **, listas com *) para deixar a resposta clara e organizada.
    `; // O prompt completo
    const userPgn = `Por favor, analise a seguinte partida:\n${pgn}`;
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPgn },
      ],
    });
    const analysis = response.choices[0].message.content;
    res.status(200).json({ analysis: analysis });
  } catch (error) {
    console.error("Erro na API da OpenAI:", error);
    res.status(500).json({ message: `Ocorreu um erro de comunicação com a IA. Detalhe técnico: ${error.message}` });
  }
}
