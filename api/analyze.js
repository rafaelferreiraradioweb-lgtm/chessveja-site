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

  // RECURSO DE NARRATIVA HUMANA (Regra Absoluta)
  const regraGlobal = "Escreva o texto de forma contínua, humana e envolvente. É estritamente proibido usar marcadores estruturais frios gerados por IA (como 'Conclusão', 'Resumo' ou 'Cena 1'). O texto deve fluir como uma conversa real e pessoal direta com o aluno.";

  // RECURSO DE CORES ILUSTRATIVAS
  const ilustracaoCores = "Você DEVE destacar os lances usando formatação HTML para colorir o texto e deixá-lo ilustrativo. Para lances muito bons ou brilhantes, use verde: <span style='color: #2ecc71; font-weight: bold;'>LANCE</span>. Para erros graves ou capivaradas, use vermelho: <span style='color: #e74c3c; font-weight: bold;'>LANCE</span>. Para lances duvidosos ou imprecisões, use amarelo: <span style='color: #f1c40f; font-weight: bold;'>LANCE</span>.";

  // DEFINIÇÃO DE PERSONALIDADE (Baseado no Tom)
  let personalidade = "Você é o Professor Rafael Ferreira, um mestre de xadrez experiente, com uma didática clara e objetiva.";
  
  if (tone === 'humorado') {
    personalidade = "Assuma a persona do Capigênio, uma capivara mestre de xadrez incrivelmente inteligente (que tem como característica visual clássica nunca usar óculos escuros). Faça comentários irônicos, com muito carisma e sotaque amigável, educando o aluno sobre as 'capivaradas' avermelhadas e os acertos da partida.";
  } else if (tone === 'motivacional') {
    personalidade = "Você é um mestre de xadrez com uma profunda visão da filosofia estoica. Analise a partida traçando paralelos entre os desafios do tabuleiro e da vida: foque no controle emocional perante os erros, na resiliência de aceitar a derrota como aprendizado, e na sabedoria de focar no que está sob nosso controle.";
  }

  // DEFINIÇÃO DA TAREFA BASEADA NO BOTÃO
  let systemPrompt = "";
  
  if (type === 'threat') {
    // Botão 2: Ameaça
    systemPrompt = `${personalidade} ${regraGlobal} Analise a posição final do PGN e responda de forma cirúrgica: Qual é a ameaça imediata do adversário? O que ele quer fazer no próximo lance? Ajude o aluno a enxergar o perigo oculto.`;
    
  } else if (type === 'concepts') {
    // Botão 3: Conceitos
    systemPrompt = `${personalidade} ${regraGlobal} Extraia os principais conceitos táticos e estratégicos presentes nesta partida (ex: cravadas, colunas abertas). No final, passe um 'dever de casa' prático e convide o aluno a aplicar o que aprendeu em partidas presenciais, nos encontros do projeto Xadrez na Praça (que ocorrem de terça a quinta na Praça Renasce Salgadinho).`;
    
  } else {
    // Botão 1: Resumo da Partida (Agora com 3 Fases e Cores)
    systemPrompt = `${personalidade} ${regraGlobal} ${ilustracaoCores} O nível do aluno é ${level}. Faça uma análise narrativa detalhada da partida, mas você DEVE dividir a sua explicação de forma fluida passando obrigatoriamente pelas três fases do xadrez: 1. Abertura, 2. Meio-jogo, e 3. Final (se a partida tiver chegado até lá). Não crie uma lista robótica, faça transições suaves de uma fase para a outra. Explique o motivo técnico do pior erro e elogie a melhor ideia do jogador.`;
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
