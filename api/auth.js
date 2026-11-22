module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }

    try {
        const { senha } = req.body || {};
        const senhaDigitada = typeof senha === 'string' ? senha.trim() : '';

        const senhasAceitas = [
            'rafaelpro',
            process.env.SENHA_VIP,
            process.env.VIP_PASSWORD
        ].filter(Boolean);

        if (senhaDigitada && senhasAceitas.includes(senhaDigitada)) {
            return res.status(200).json({ success: true });
        }

        return res.status(401).json({ success: false, error: 'Senha incorreta' });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Erro interno na autenticação' });
    }
};
