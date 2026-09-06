export default function handler(req, res) {
    if (req.method === 'POST') {
        const { senha } = req.body;
        
        if (senha === process.env.SENHA_VIP) {
            res.status(200).json({ success: true });
        } else {
            res.status(401).json({ success: false });
        }
    } else {
        res.status(405).json({ message: 'Método não permitido' });
    }
}
