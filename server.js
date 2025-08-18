// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const cors = require('cors');

// Inicializa o Express
const app = express();
const port = process.env.PORT || 3000;

// Configurações de Middleware
app.use(cors()); // Permite requisições de outras origens (seu frontend)
app.use(express.json()); // Permite que o servidor entenda JSON no corpo das requisições
app.use(express.static('public')); // Serve os arquivos estáticos da pasta 'public' (seu frontend)

// Validação da API Key e inicialização do GoogleGenAI
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("A variável de ambiente GEMINI_API_KEY não foi definida.");
  process.exit(1); // Encerra o processo se a chave não existir
}
const ai = new GoogleGenAI(apiKey);

// Rota para receber o prompt e retornar a resposta da IA
app.post('/generate', async (req, res) => {
  // Pega o 'prompt' do corpo da requisição
  const { prompt } = req.body;

  // Validação simples para ver se o prompt existe
  if (!prompt) {
    return res.status(400).json({ error: 'O prompt é obrigatório.' });
  }

  try {
    // Chama a API do Gemini
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    // Envia a resposta de volta para o frontend
    res.json({ response: response.text });
  } catch (error) {
    console.error("Erro ao chamar a API do Gemini:", error);
    res.status(500).json({ error: 'Ocorreu um erro ao processar sua solicitação.' });
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});