export default async function handler(req, res) {
  // Apenas aceita requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ analysis: 'Método não permitido.' });
  }

  const { pgn, level, tone, color } = req.body;

  // Verifica se o PGN foi enviado
  if (!pgn) {
    return res.status(400).json({ analysis: 'Nenhum PGN fornecido.' });
  }

  // Verifica se a chave da API da OpenAI está configurada na Vercel
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ analysis: 'Erro no servidor: Chave da API ausente.' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { 
            role: "system", 
            content: `Você é um Grande Mestre de xadrez analisando uma partida. Nível do aluno: ${level}. Tom da resposta: ${tone}. Seja direto e foque nos erros críticos e táticas perdidas.` 
          },
          { 
            role: "user", 
            content: `Analise a partida do ponto de vista das ${color}. PGN: ${pgn}` 
          }
        ]
      })
    });

    const data = await response.json();

    // Tratamento de erros vindo direto da OpenAI (ex: saldo insuficiente)
    if (data.error) {
      return res.status(500).json({ analysis: `Erro na OpenAI: ${data.error.message}` });
    }

    // Retorna a análise com sucesso
    res.status(200).json({ analysis: data.choices[0].message.content });

  } catch (error) {
    res.status(500).json({ analysis: 'Falha de comunicação com a Inteligência Artificial.' });
  }
}
