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
    const systemPrompt = `Aja como o "GM Chessveja", um técnico de xadrez experiente, didático e inspirador. Seu foco é estratégico... (etc.)`; // O prompt completo
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
