export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ analysis: 'Método não permitido.' });
  }

  const { pgn, level, tone, color, type } = req.body;

  if (!pgn) {
    return res.status(400).json({ analysis: 'Nenhum PGN fornecido.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ analysis: 'Erro no servidor: Chave da API ausente.' });
  }

  // RECURSO 4: Regra Global de Narrativa Humana
  const regraGlobal = "Escreva o texto em um formato de narrativa fluida, contínua e humana. É estritamente proibido usar marcadores estruturais gerados por IA (como 'Cena 1', 'Introdução', 'Conclusão' ou listas genéricas). O texto deve fluir naturalmente, parecendo uma conversa real e pessoal direta com o aluno.";

  // RECURSO 1 e 2: Definindo a Personalidade com base no "Tom" escolhido no site
  let personalidade = "Você é o Professor Rafael Ferreira, um mestre de xadrez experiente, com uma didática clara e objetiva.";
  
  if (tone === 'humorado') {
    personalidade = "Assuma a persona do Capigênio, uma capivara mestre de xadrez incrivelmente inteligente (que tem como característica visual nunca usar óculos escuros). Faça comentários irônicos, com muito carisma e sotaque amigável, educando o aluno sobre as 'capivaradas' e os acertos da partida.";
  } else if (tone === 'motivacional') {
    personalidade = "Você é um mestre de xadrez com uma profunda visão da filosofia estoica. Analise a partida traçando paralelos entre os desafios do tabuleiro e da vida: foque no controle emocional perante os erros, na resiliência de aceitar a derrota como um aprendizado inevitável, e na sabedoria de focar apenas no que está sob nosso controle.";
  }

  // RECURSO 3: Define a tarefa baseada no botão clicado (Resumo, Ameaça ou Conceitos)
  let systemPrompt = "";
  if (type === 'threat') {
    systemPrompt = `${personalidade} ${regraGlobal} Analise a posição final do PGN e responda de forma cirúrgica e narrativa: Qual é a ameaça imediata do adversário? O que ele quer fazer no próximo lance? Ajude o aluno a enxergar o perigo oculto.`;
  } else if (type === 'concepts') {
    systemPrompt = `${personalidade} ${regraGlobal} Extraia os principais conceitos táticos e estratégicos presentes nesta partida (ex: cravadas, desenvolvimento de peças, estrutura de peões). No final da sua explicação, passe um 'dever de casa' prático e convide o aluno a aplicar o que aprendeu nos encontros do projeto Xadrez na Praça, que acontecem de terça a quinta-feira na Praça Renasce Salgadinho.`;
  } else {
    // Padrão: Resumo crítico da partida
    systemPrompt = `${personalidade} ${regraGlobal} O nível do aluno é ${level}. Faça uma análise narrativa dos momentos cruciais da partida, focando em explicar o motivo do pior erro e elogiando a melhor ideia do jogador.`;
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
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise a partida do ponto de vista das ${color}. PGN: ${pgn}` }
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
