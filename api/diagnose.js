async function handler(req, res) {
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
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const { pgns, nick, plataforma, instructions, senhaAutenticacao } = body;

        if (!senhaAutenticacao) {
            return res.status(401).json({ error: 'Acesso não autorizado. Faça login novamente.' });
        }

        if (!pgns || pgns.trim() === '') {
            return res.status(400).json({ error: 'Nenhuma partida (PGN) enviada para análise.' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Chave GEMINI_API_KEY não encontrada na Vercel.' });
        }

        const pgnsCompactos = compactarPGNs(pgns).slice(0, 26000);

        const prompt = `Você é um Mestre e Treinador de Xadrez da escola Chessveja (Prof. Rafael Ferreira).
Analise as partidas em PGN abaixo com rigor técnico e linguagem didática em Português do Brasil.
${nick ? `Jogador alvo exclusivo da análise: ${nick}` : ''}
${plataforma ? `Origem das partidas: ${plataforma}` : ''}

Instruções adicionais do painel:
${instructions || ''}

ESTRUTURA OBRIGATÓRIA (você DEVE concluir todas as 4 seções abaixo do início ao fim, sem interromper o texto):
<h3>1. Pontos Fortes</h3>
- Liste de 3 a 4 tópicos objetivos em <ul><li> destacando acertos reais do jogador alvo nas partidas (abertura, tática, cálculo ou finais), citando exemplos concretos.

<h3>2. Principais Fraquezas</h3>
- Liste de 3 a 4 tópicos objetivos em <ul><li> apontando os padrões de erro recorrentes do jogador alvo (ex: peças penduradas, atraso no desenvolvimento, enfraquecimento do roque, gestão de tempo), citando lances reais do PGN.

<h3>3. Plano de Ação</h3>
- Liste de 3 a 4 recomendações práticas e diretas em <ul><li> com exercícios táticos, temas estratégicos ou ajustes de repertório específicos para corrigir as fraquezas encontradas.

<h3>4. Partida Destaque Comentada</h3>
- Escolha a melhor vitória ou partida de maior precisão do jogador alvo no PGN.
- Informe quem jogou de Brancas e Pretas e o resultado.
- Apresente a sequência dos lances da partida comentando os momentos-chave (abertura, virada tática/estratégica e arremate) de forma clara e completa até o lance final.

Regras rigorosas de formatação:
- Responda APENAS em HTML limpo (use tags <h3>, <p>, <ul>, <li>, <strong>).
- Não use blocos de código markdown (\`\`\`html).
- Seja objetivo em cada tópico para garantir que a 4ª seção seja totalmente concluída.

Partidas (PGN):
${pgnsCompactos}`;

        const textoGerado = await chamarGemini(prompt, apiKey);
        return res.status(200).json({ analysis: textoGerado });

    } catch (error) {
        console.error('Erro no /api/diagnose:', error);
        return res.status(500).json({ error: error.message || 'Falha interna ao processar o laudo.' });
    }
}

function compactarPGNs(rawPgns) {
    // Remove comentários, relógios {[%clk ...]} e anotações numéricas para acelerar a leitura
    let limpo = rawPgns
        .replace(/\{[^}]*\}/g, ' ')
        .replace(/\$\d+/g, ' ');

    // Mantém apenas os cabeçalhos essenciais para o diagnóstico técnico
    limpo = limpo
        .split('\n')
        .filter((linha) => {
            const t = linha.trim();
            if (!t.startsWith('[')) return true;
            return /^\[(White|Black|Result|Opening|ECO|WhiteElo|BlackElo)\s/i.test(t);
        })
        .join('\n');

    return limpo
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

async function chamarGemini(prompt, apiKey) {
    const tentativas = [
        {
            modelo: 'gemini-3.8-flash',
            generationConfig: {
                temperature: 0.6,
                maxOutputTokens: 8192,
                thinkingConfig: { thinkingBudget: 0 }
            }
        },
        {
            modelo: 'gemini-3.8-flash',
            generationConfig: {
                temperature: 0.6,
                maxOutputTokens: 8192
            }
        },
        {
            modelo: 'gemini-2.5-flash',
            generationConfig: {
                temperature: 0.6,
                maxOutputTokens: 8192,
                thinkingConfig: { thinkingBudget: 0 }
            }
        }
    ];

    let ultimoErro = '';

    for (const item of tentativas) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${item.modelo}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: item.generationConfig
            })
        });

        const data = await response.json();
        const candidato = data.candidates?.[0];
        const texto = candidato?.content?.parts?.[0]?.text;

        if (response.ok && texto) {
            const htmlLimpo = texto
                .replace(/^```html\s*/i, '')
                .replace(/```$/i, '')
                .trim();

            // Garante que as 4 seções foram geradas antes de aceitar a resposta
            if (htmlLimpo.includes('4.') || item === tentativas[tentativas.length - 1]) {
                return htmlLimpo;
            }
        }

        ultimoErro = data.error?.message || `Falha ou resposta incompleta no modelo ${item.modelo} (HTTP ${response.status})`;
    }

    throw new Error(ultimoErro);
}

handler.config = { maxDuration: 60 };
module.exports = handler;
