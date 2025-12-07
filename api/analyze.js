import OpenAI from 'openai';

// Conecta com a OpenAI usando a chave que está no Vercel
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

    // O Pedido para o ChatGPT
    const prompt = `
      Você é o GM Chessveja (Rafael Ferreira).
      Analise esta partida de xadrez (PGN abaixo).
      Foco nas peças: ${color}. Nível do aluno: ${level}. Tom: ${tone}.
      
      PGN:
      ${pgn}

      Sua missão:
      1. Identifique o erro principal ou momento chave.
      2. Explique o conceito estratégico por trás.
      3. Dê 3 dicas práticas para melhorar.
    `;

    // Envia para o ChatGPT (GPT-3.5 Turbo é rápido e barato)
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
    });

    // Pega a resposta
    const analysis = completion.choices[0].message.content;

    return res.status(200).json({ analysis: analysis });

  } catch (error) {
    console.error("Erro na OpenAI:", error);
    return res.status(500).json({ error: 'Erro ao processar análise.' });
  }
}
