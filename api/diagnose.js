module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const { pgns, nick, plataforma, instructions, senhaAutenticacao } = req.body || {};

        if (!senhaAutenticacao) {
            return res.status(401).json({ error: 'Acesso não autorizado. Inicia sessão novamente.' });
        }

        if (!pgns || pgns.trim() === '') {
            return res.status(400).json({ error: 'Nenhuma partida (PGN) enviada para análise.' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Chave GEMINI_API_KEY não encontrada na Vercel.' });
        }

        const pgnsCompactos = compactarPGNs(pgns).slice(0, 35000);

        const prompt = `Você é um Mestre e Treinador de Xadrez da escola Chessveja (Prof. Rafael Ferreira).
Analise as partidas em PGN abaixo com rigor técnico e linguagem didática em Português do Brasil.
${nick ? `Jogador alvo da análise: ${nick}` : ''}
${plataforma ? `Origem das partidas: ${plataforma}` : ''}

Instruções obrigatórias de estrutura:
${instructions || 'Estruture o laudo em 3 seções com tags HTML <h3>: 1. Pontos Fortes, 2. Principais Fraquezas e 3. Plano de Ação.'}

Regras de formatação:
- Responda APENAS em HTML limpo (use tags <h3>, <p>, <ul>, <li>, <strong>).
- Não use blocos de código markdown (\`\`\`html).
- Cite lances e partidas reais encontradas no PGN fornecido.

Partidas (PGN):
${pgnsCompactos}`;

        const textoGerado = await chamarGemini(prompt, apiKey);
        return res.status(200).json({ analysis: textoGerado });

    } catch (error) {
        console.error('Erro no /api/diagnose:', error);
        return res.status(500).json({ error: error.message || 'Falha interna ao processar o laudo.' });
    }
};

function compactarPGNs(rawPgns) {
    let limpo = rawPgns.replace(/\{[^}]*\}/g, ' ');
    limpo = limpo
        .split('\n')
        .filter((linha) => {
            const t = linha.trim();
            if (!t.startsWith('[')) return true;
            return /^\[(White|Black|Result|Opening|ECO|Date|WhiteElo|BlackElo)\s/i.test(t);
        })
        .join('\n');
    return limpo.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

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
                    maxOutputTokens: 3500
                }
            })
        });

        const data = await response.json();

        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text
                .replace(/^```html\s*/i, '')
                .replace(/```$/i, '')
                .trim();
        }

        ultimoErro = data.error?.message || `Falha no modelo ${modelo} (HTTP ${response.status})`;
    }

    throw new Error(ultimoErro);
}
