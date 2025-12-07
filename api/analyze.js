import { GoogleGenerativeAI } from "@google/generative-ai";

// Configuração da IA (Usa a chave que já está no Vercel)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    // Apenas aceita POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const { pgn, level, tone, color } = req.body;

        // --- ANÁLISE DA IA (GEMINI) ---
        // Usando o modelo Flash que é rápido e gratuito
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        Você é o GM Chessveja (Rafael Ferreira), um treinador de xadrez humano, didático e direto.
        Analise esta partida de xadrez (PGN abaixo) focando no jogador das peças: ${color}.
        
        Nível do aluno: ${level} (rating online).
        Tom da análise: ${tone}.

        PGN:
        ${pgn}

        Sua missão:
        1. Identifique o momento crítico onde o jogo virou.
        2. Explique O PORQUÊ do erro (o plano por trás).
        3. Dê 3 dicas práticas para esse jogador.
        4. Use negrito (**texto**) para destacar conceitos.
        5. Seja breve e impactante (máximo 4 parágrafos).
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Retorna a análise (sem lógica de créditos)
        return res.status(200).json({ analysis: responseText });

    } catch (error) {
        console.error("Erro na API:", error);
        return res.status(500).json({ error: 'Erro interno ao processar análise.' });
    }
}
