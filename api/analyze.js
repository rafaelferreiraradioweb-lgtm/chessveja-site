import OpenAI from 'openai';

// IMPORTANTE: Configure sua chave secreta no painel do Vercel
// O nome da variável de ambiente deve ser 'OPENAI_API_KEY'
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        // 1. Recebemos os novos dados do script.js
        const { pgn, cor, nivel, tom } = req.body;

        if (!pgn) {
            return res.status(400).json({ error: 'PGN não fornecido' });
        }

        // 2. Montamos o "Super-Prompt" baseado nas escolhas do usuário
        const prompt = construirPrompt(pgn, cor, nivel, tom);

        // 3. Chamamos a IA
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo", // O modelo mais recente
            messages: [
                {
                    role: "system",
                    content: "Você é um 'GM' (Grande Mestre) de xadrez chamado 'GM Chessveja'. Você é um técnico de xadrez especialista em analisar partidas de jogadores amadores."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
        });

        // 4. Enviamos a resposta de volta
        const analise = response.choices[0].message.content;
        res.status(200).json({ analysis: analise });

    } catch (error) {
        console.error('Erro ao chamar a API da OpenAI:', error);
        res.status(500).json({ error: 'Erro interno ao processar a análise.' });
    }
}

// Função auxiliar para criar o prompt
function construirPrompt(pgn, cor, nivel, tom) {
    
    // Mapeia os valores para texto legível
    const mapNivel = {
        'iniciante': 'Iniciante (rating ~1400)',
        'intermediario': 'Intermediário (rating ~1700)',
        'avancado': 'Avançado (rating ~2100)'
    };
    
    const mapTom = {
        'tecnico': 'focando nos conceitos técnicos e erros de cálculo.',
        'motivacional': 'focando em encorajar o jogador, mostrando o que ele fez de bom e o que pode melhorar.',
        'humorado': 'com um tom leve e engraçado, fazendo piadas sobre os erros, mas ainda ensinando.'
    };
    
    const mapCor = {
        'brancas': 'Brancas',
        'pretas': 'Pretas'
    };

    return `
        Por favor, analise a seguinte partida de xadrez em PGN:
        ${pgn}

        Siga estas 4 regras para a sua análise:

        1.  **Ponto de Vista:** A análise deve ser feita do ponto de vista do jogador de ${mapCor[cor]}.
        2.  **Nível do Jogador:** O jogador é ${mapNivel[nivel]}. Use uma linguagem apropriada para este nível (não seja excessivamente complexo se for iniciante).
        3.  **Tom da Análise:** Seu tom deve ser ${mapTom[tom]}.
        4.  **Formato da Resposta:** Responda usando Markdown. Comece com um título, depois identifique a abertura, e então faça uma análise geral da partida em parágrafos, destacando 3 a 5 lances-chave (erros graves, acertos ou oportunidades perdidas). Seja claro e direto.
    `;
}
