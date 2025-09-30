import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializa o cliente do Google com a chave que está na Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Função principal que a Vercel irá executar
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Apenas requisições POST são permitidas' });
  }

  try {
    const { pgn } = req.body;
    if (!pgn) {
      return res.status(400).json({ message: 'PGN não fornecido
