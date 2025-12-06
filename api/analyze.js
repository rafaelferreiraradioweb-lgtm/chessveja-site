import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Configurações
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Conecta ao Banco
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const { pgn, level, tone, color, email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email não fornecido.' });
        }

        // --- 1. CONTROLE DE CRÉDITOS (SUPABASE) ---
        
        // Passo A: Verifica se o usuário já existe na tabela 'users_credits'
        let { data: user, error: fetchError } = await supabase
            .from('users_credits')
            .select('*')
            .eq('email', email)
            .single();

        // Se der erro (ex: não achou), e o erro não for de conexão, assumimos que é usuário novo
        if (!user) {
            // Passo B: Cria o usuário novo com 5 créditos GRÁTIS
            const { data: newUser, error: createError } = await supabase
                .from('users_credits')
                .insert([
                    { email: email, credits: 5, plan: 'free' }
                ])
                .select()
                .single();
            
            if (createError) {
                console.error("Erro ao criar usuário:", createError);
                return res.status(500).json({ error: 'Erro ao registrar usuário.' });
            }
            user = newUser;
        }

        // Passo C: Verifica se tem créditos
        if (user.credits <= 0) {
            return res.status(403).json({ error: 'Seus créditos acabaram. Faça o upgrade!' });
        }

        // Passo D: Desconta 1 crédito
        const { error: updateError } = await supabase
            .from('users_credits')
            .update({ credits: user.credits - 1 })
            .eq('email', email);

        if (updateError) {
            console.error("Erro ao descontar crédito:", updateError);
        }

        // --- 2. ANÁLISE DA IA (GEMINI) ---
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        Você é o GM Chessveja (Rafael Ferreira), um treinador de xadrez humano.
        Analise esta partida (Peças: ${color}, Nível: ${level}, Tom: ${tone}).
        Seja didático. Identifique o erro principal e dê 3 dicas.
        
        PGN:
        ${pgn}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Retorna a análise E o saldo atualizado
        return res.status(200).json({ 
            analysis: responseText, 
            credits: user.credits - 1 
        });

    } catch (error) {
        console.error("Erro geral na API:", error);
        return res.status(500).json({ error: 'Erro interno no servidor.' });
    }
}
