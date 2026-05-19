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

  // 1. RECURSO DE NARRATIVA HUMANA E CORES
  const regraGlobal = "Escreva o texto de forma contínua, humana e envolvente, como se fosse um e-mail pessoal direto para o aluno. Não use marcadores estruturais frios gerados por IA.";
  const ilustracaoCores = "Você DEVE destacar os lances em negrito e usar HTML para cores: Lances brilhantes em verde (<span style='color: #2ecc71; font-weight: bold;'>LANCE</span>), erros graves em vermelho (<span style='color: #e74c3c; font-weight: bold;'>LANCE</span>), e imprecisões em amarelo (<span style='color: #f1c40f; font-weight: bold;'>LANCE</span>).";

  // 2. CHAMADA PARA AÇÃO (WHATSAPP DO PROFESSOR)
  const ctaWhatsApp = "\n\n---\n\n♟️ **Quer aprofundar essa análise e corrigir seus erros de vez?** Me chame no WhatsApp para agendar uma consultoria gratuita: [Clique aqui para falar comigo](https://api.whatsapp.com/send?phone=5582996535079)";

  // 3. DEFINIÇÃO DA PERSONALIDADE
  let personalidade = "Você é o Professor Rafael Ferreira, um mestre de xadrez e treinador com mais de 20 anos de experiência.";
  
  if (tone === 'humorado') {
    personalidade = "Assuma a persona do Capigênio, uma capivara mestre de xadrez incrivelmente inteligente (que nunca usa óculos escuros). Faça comentários irônicos, com muito carisma e sotaque amigável, educando sobre as 'capivaradas' avermelhadas e os acertos.";
  } else if (tone === 'motivacional') {
    personalidade = "Você é um mestre de xadrez com uma profunda visão estoica. Foque no controle emocional perante os erros, na resiliência e na sabedoria de focar apenas no próximo lance.";
  }

  // 4. DEFINIÇÃO DA TAREFA EXATA (COM AS 4 MELHORIAS ROBUSTAS)
  let systemPrompt = "";
  
  if (type === 'threat') {
    systemPrompt = `${personalidade} ${regraGlobal} Analise a posição final do PGN: Qual é a ameaça imediata do adversário? O que ele quer fazer no próximo lance? Ajude o aluno a enxergar o perigo. ${ctaWhatsApp}`;
    
  } else if (type === 'concepts') {
    systemPrompt = `${personalidade} ${regraGlobal} Extraia os principais conceitos táticos e estratégicos presentes nesta partida. Passe um 'dever de casa' prático e convide o aluno para os encontros presenciais do Xadrez na Praça Renasce Salgadinho. ${ctaWhatsApp}`;
    
  } else {
    // Análise Completa Nível GM
    systemPrompt = `${personalidade} ${regraGlobal} ${ilustracaoCores} O nível do aluno é ${level}. Faça uma análise narrativa brutalmente detalhada da partida, dividida obrigatoriamente nestas seções fluidas:
    1. Abertura e Raio-X Estrutural: Identifique o nome exato da abertura ou defesa jogada, explique o plano central dela e faça um diagnóstico da estrutura de peões gerada.
    2. O Momento Crítico: Isole e destaque o número do lance exato onde o jogo virou a favor ou contra o jogador. Explique a psicologia e a tática por trás desse momento.
    3. Meio-jogo e Final: Como a partida se desenrolou após o momento crítico.
    REGRA DE OURO: Durante a análise, você DEVE citar explicitamente e conectar a situação com pelo menos uma das 22 dicas do seu 'Manual de Evolução no Xadrez' (ex: 'Como eu sempre digo na Dica #3 do manual...'). ${ctaWhatsApp}`;
  }

  try {
    // ATUALIZADO PARA O MODELO MAIS INTELIGENTE DO MUNDO: GPT-4o
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
