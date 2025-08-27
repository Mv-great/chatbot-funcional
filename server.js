import 'dotenv/config'; // Carrega as variáveis de ambiente no início
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

// Inicializa o Express
const app = express();
const port = process.env.PORT || 3000;

// Configurações de Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Validação da API Key
if (!process.env.GEMINI_API_KEY) {
  console.error("A variável de ambiente GEMINI_API_KEY não foi definida.");
  process.exit(1);
}

// Inicializa o cliente da IA. A chave é pega automaticamente do process.env
const ai = new GoogleGenAI({});

// Rota para o chat, adaptada ao novo método
app.post('/generate', async (req, res) => {
  // Recebe o prompt E o histórico
  const { prompt, historico } = req.body;
  const historicoRecebido = historico || [];

  if (!prompt) {
    return res.status(400).json({ error: 'O prompt é obrigatório.' });
  }

  try {
    // USA O NOVO MÉTODO: ai.chats.create
    // O modelo 'gemini-1.5-flash' é uma ótima opção, rápido e moderno.
    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      history: historicoRecebido,
    });

    // Envia a mensagem no novo formato
    const result = await chat.sendMessage({
      message: prompt,
    });

    // A resposta de texto agora vem direto no '.text'
    const textoResposta = result.text;

    // Cria o novo histórico (lógica permanece a mesma)
    const novoHistorico = [
      ...historicoRecebido,
      { role: "user", parts: [{ text: prompt }] },
      { role: "model", parts: [{ text: textoResposta }] },
    ];

    // Envia a resposta E o novo histórico atualizado
    res.json({ response: textoResposta, historico: novoHistorico });

  } catch (error) {
    console.error("Erro ao chamar a API do Gemini:", error);
    res.status(500).json({ error: 'Ocorreu um erro ao processar sua solicitação.' });
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});