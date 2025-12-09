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

    // --- PROMPT "SUPER ANALISTA" ---
    const prompt = `
      Você é o GM Chessveja (Rafael Ferreira), um treinador de xadrez de elite.
      Analise a partida abaixo focando no jogador das peças: ${color}.
      Nível do aluno: ${level}. Tom: ${tone}.

      PGN:
      ${pgn}

      Gere um relatório DETALHADO seguindo rigorosamente esta estrutura:

      ### 1. Abertura e Teoria
      - Identifique a abertura e variante.
      - Comente se os lances iniciais seguiram a teoria ou se houve desvio.

      ### 2. Análise Lance a Lance (Profunda)
      - Analise o máximo de momentos críticos possível (tente encontrar entre 8 a 12 momentos chave).
      - Para cada lance comentado, CLASSIFIQUE usando estes termos:
        - 🔵 **Bom / Único** (!)
        - 🟢 **Brilhante / Excelente** (!!)
        - 🟡 **Impreciso** (?!)
        - 🟠 **Erro** (?)
        - 🔴 **Gaffe / Pendurada** (??)
      
      - **IMPORTANTE:** Sempre que apontar um Erro ou Imprecisão, você DEVE:
        1. Explicar POR QUE o lance foi ruim (perde material? cede o centro? expõe o rei?).
        2. Mostrar qual seria o **Melhor Lance** naquela posição.
        3. Explicar a vantagem estratégica do lance correto.

      ### 3. Planos Estratégicos
      - Explique qual deveria ser o plano das Brancas e o das Pretas no meio-jogo.
      - Quem executou melhor o plano?

      ### 4. Conclusão
      - Resumo final e 3 dicas de treino personalizadas para este aluno.

      Use formatação Markdown (negrito, itálico) para facilitar a leitura. Seja didático, mas profundo.
    `;
    // -----------------------------------------------------------

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.7, // Criatividade equilibrada
    });

    return res.status(200).json({ analysis: completion.choices[0].message.content });

  } catch (error) {
    console.error("Erro OpenAI:", error);
    return res.status(500).json({ error: 'Erro ao processar análise.' });
  }
}
