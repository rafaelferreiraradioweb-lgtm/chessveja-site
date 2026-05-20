export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ analysis: 'Método não permitido.' });
  }

  const { pgns, nick } = req.body;

  if (!pgns) {
    return res.status(400).json({ analysis: 'Nenhum PGN fornecido.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ analysis: 'Erro no servidor: Chave da API ausente.' });
  }

  const systemPrompt = `Você é o Professor Rafael Ferreira, mestre e treinador de xadrez com 20 anos de experiência.
Sua missão é dar um "Laudo Técnico Profissional" baseado neste lote de partidas rápidas do jogador ${nick}.
Aja de forma clínica, direta e analítica. Ignore erros aleatórios e foque nos PADRÕES de comportamento.

Formate o texto em HTML elegante (usando <h2>, <h3>, <p>, <ul>, <li> e <strong>) para que fique lindo num PDF. NÃO use fundos escuros.

Estrutura OBRIGATÓRIA do Laudo:
1. Resumo do Perfil (Ex: Jogador tático excessivamente agressivo, mas que peca em finais).
2. Os 3 Maiores Pontos Fortes (com justificativa tática).
3. Os 3 Principais Pontos Fracos (os padrões de erro, ex: "Nas partidas 2 e 7, você entregou vantagem por falta de desenvolvimento").
4. Plano de Intervenção: Sugira o que ele deve treinar imediatamente e cite obrigatoriamente a aplicação de pelo menos duas das 22 Dicas de Mestre do seu método.
Termine o laudo com uma assinatura profissional: "Prof. Rafael Ferreira - Chessveja".`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise este lote de partidas do jogador ${nick}:\n\n${pgns}` }
        ]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ analysis: `Erro na OpenAI: ${data.error.message}` });
    res.status(200).json({ analysis: data.choices[0].message.content });

  } catch (error) {
    res.status(500).json({ analysis: 'Falha de comunicação com a Inteligência Artificial.' });
  }
}
