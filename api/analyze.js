module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const { pgn, color, level, tone } = req.body || {};

        if (!pgn || pgn.trim() === '') {
            return res.status(400).json({ error: 'Cole um PGN válido antes de analisar.' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Chave GEMINI_API_KEY não configurada na Vercel.' });
        }

        const mapaNivel = {
            iniciante: 'Iniciante (até 1500 de rating) — explique conceitos fundamentais com clareza, evitando jargões excessivos',
            intermediario: 'Intermediário (1501 a 2000) — foque em planos estratégicos, estrutura de peões e padrões táticos',
            avancado: 'Avançado (acima de 2000) — aprofunde em variantes concretas, profilaxia e nuances posicionais'
        };

        const mapaTom = {
            tecnico: 'Técnico, objetivo e didático',
            motivacional: 'Motivacional, encorajador e construtivo',
            humorado: 'Leve, bem-humorado e envolvente, sem perder a precisão enxadrística'
        };

        const prompt = `Você é um Mestre e Treinador de Xadrez da plataforma Chessveja.
Analise a partida abaixo sob a perspectiva das peças **${color === 'pretas' ? 'Pretas' : 'Brancas'}**.

Perfil do aluno: ${mapaNivel[level] || mapaNivel.iniciante}
Tom da análise: ${mapaTom[tone] || mapaTom.tecnico}

Organize a resposta em Português do Brasil nas seguintes seções:
1. **Resumo da Partida e Abertura** (identifique a abertura e como foi a saída)
2. **Momentos Críticos e Erros** (aponte os lances exatos onde a vantagem mudou e qual era o melhor lance)
3. **Pontos Positivos** (bons lances ou ideias acertadas)
4. **Dica Prática de Treino** (uma recomendação direta para evolução)

Partida (PGN):
${pgn.slice(0, 20000)}`;

        const textoGerado = await chamarGemini(prompt, apiKey);
        return res.status(200).json({ analysis: textoGerado });

    } catch (error) {
        console.error('Erro no /api/analyze:', error);
        return res.status(500).json({ error: 'Erro na IA Gemini: ' + error.message });
    }
};

async function chamarGemini(prompt, apiKey) {
    const modelos = ['gemini-3.8-flash', 'gemini-2.5-flash'];
    let ultimoErro = '';

    for (const modelo of modelos) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2500
                }
            })
        });

        const data = await response.json();

        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text.trim();
        }

        ultimoErro = data.error?.message || `Falha no modelo ${modelo} (HTTP ${response.status})`;
    }

    throw new Error(ultimoErro);
}
