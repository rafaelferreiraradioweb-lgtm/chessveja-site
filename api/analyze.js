import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { pgn, level, tone, color } = req.body;

    // --- PROMPT "ESTILO OUTUBRO" (COMPLETO E DETALHADO) ---
    const prompt = `
      Você é o GM Chessveja (Rafael Ferreira), um treinador de xadrez especialista.
      O usuário jogou de: ${color}.
      Nível do usuário: ${level}.
      Tom da análise: ${tone}.

      PGN da Partida:
      ${pgn}

      Por favor, analise a partida profundamente e gere um relatório estruturado EXATAMENTE nestes 4 tópicos:

      ### 1. Abertura
      - Identifique o nome exato da abertura e da variante.
      - Explique se os movimentos iniciais seguiram a teoria ou se houve novidade/erro cedo.

      ### 2. Planos Estratégicos
      - **Plano das Brancas:** O que as brancas deveriam tentar fazer nessa posição? (Ex: Atacar na ala do rei, dominar o centro, trocar peças...)
      - **Plano das Pretas:** O que as pretas deveriam buscar?
      - Quem executou melhor o plano?

      ### 3. Análise Lance a Lance (Momentos Críticos)
      - Não liste todos os lances. Liste apenas os momentos chave onde o jogo mudou.
      - Use o formato: "Lance X (Peça): Comentário".
      - Identifique o ERRO CRÍTICO que definiu a partida.
      - Sugira o MELHOR LANCE que deveria ter sido feito no lugar do erro.

      ### 4. Conclusão e Dicas
      - Resuma o desempenho do jogador.
      - Dê 2 dicas práticas para ele treinar e não errar isso de novo.

      Use formatação Markdown (negrito, itálico) para facilitar a leitura.
    `;
    // -----------------------------------------------------------

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo", // O modelo clássico e rápido que usávamos
      temperature: 0.7,
    });

    return res.status(200).json({ analysis: completion.choices[0].message.content });

  } catch (error) {
    console.error("Erro OpenAI:", error);
    return res.status(500).json({ error: 'Erro ao processar análise.' });
  }
}
