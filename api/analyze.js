import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // Só aceita método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { pgn, level, tone, color } = req.body;

    // --- PROMPT DETALHADO (ESTILO OUTUBRO) ---
    const prompt = `
      Você é o GM Chessveja (Rafael Ferreira), um treinador de xadrez didático e perspicaz.
      Analise a seguinte partida de xadrez focando no jogador das peças: ${color}.
      Nível do aluno: ${level}.
      Tom da análise: ${tone} (mas sempre profissional e instrutivo).

      PGN da Partida:
      ${pgn}

      SAÍDA ESPERADA (Formate usando HTML simples com <b>negrito</b> e quebras de linha <br>):
      
      1. <b>Resumo da Abertura</b>: Diga o nome da abertura, se o aluno jogou a teoria correta e quem saiu melhor.
      
      2. <b>Momentos Críticos (Lance a Lance)</b>: 
         - Cite os lances onde o jogo mudou (Erros Graves ou Lances Brilhantes).
         - Explique o PORQUÊ do erro e qual seria o lance correto.
         - <i>Exemplo: "No lance 12... <b>Bispo f4</b> foi impreciso porque permite Cavalo g5. O melhor seria..."</i>

      3. <b>Planos Estratégicos</b>:
         - Quais eram os planos para as Brancas e para as Pretas nessa posição?
         - O aluno seguiu o plano correto ou jogou sem objetivo?

      4. <b>Conclusão</b>:
         - Dê 3 dicas práticas de treino para este jogador não cometer os mesmos erros.

      Seja detalhista na estratégia e nos planos, não fique apenas falando lances do computador.
    `;
    // -----------------------------------------------------------

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
    });

    return res.status(200).json({ analysis: completion.choices[0].message.content });

  } catch (error) {
    console.error("Erro OpenAI:", error);
    return res.status(500).json({ error: 'Erro ao processar análise.' });
  }
}
