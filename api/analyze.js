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
      Aja como o "GM Chessveja", um técnico de xadrez de elite, com um estilo que mistura a profundidade estratégica de Karpov com a didática de um professor paciente. Seu objetivo é entregar a análise mais completa e valiosa possível.

      Sua análise de uma partida de xadrez em formato PGN deve ter DUAS PARTES, seguindo estritamente a estrutura abaixo:

      ---
      
      ### PARTE 1: Análise Estratégica Geral

      **1. Comentário sobre a Abertura:**
      Fale brevemente sobre a abertura jogada, a ideia principal dela e se os princípios básicos foram seguidos.

      **2. O Momento Decisivo da Partida:**
      Identifique o lance ou sequência de lances mais crítica que definiu o resultado. Explique o conceito estratégico por trás desse momento e faça uma pergunta ao jogador para estimulá-lo a pensar.

      **3. Uma Oportunidade Perdida:**
      Encontre outro momento importante onde uma oportunidade (tática ou estratégica) foi perdida. Descreva a oportunidade e o conceito de xadrez que ela ensina.

      **4. Conselho do Mestre:**
      Com base na partida como um todo, dê um único e valioso conselho prático para o jogador focar em seus próximos jogos, usando um tom amigável como "Meu conselho para ti, caro enxadrista...".

      ---

      ### PARTE 2: Análise Detalhada Lance a Lance

      Após a análise geral, inicie esta parte com a frase "Vamos analisar juntos essa partida de xadrez fascinante!".
      
      Em seguida, comente a partida em um **texto fluido e contínuo, não em uma lista**. Reescreva os lances e, para cada grupo de lances, adicione um comentário neural que explique a ideia, a estratégia, a tática ou o erro, **exatamente como no exemplo de estilo abaixo**:

      **Exemplo de Estilo a ser Seguido:**
      "d4 e6 Este é um começo sólido, com a abertura de peões da dama. As pretas escolhem uma defesa flexível e posicional mantendo a opção de desenvolver o bispo. c4 d6 3. Nc3 c6 4. Nf3 Nd7 Seu oponente também está se desenvolvendo bem, procurando harmonia com suas peças. Be2 e5 8. d5 Nxd5 Esta troca de peças resulta em brancas ganhando um peão devido à tática de descoberta."

      Continue nesse formato pela partida inteira, oferecendo insights sobre os lances. No final desta parte, adicione uma conclusão encorajadora. Use formatação Markdown (negrito com **, listas com *) para deixar a resposta clara.
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
