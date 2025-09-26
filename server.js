import 'dotenv/config'; // Carrega as variáveis de ambiente no início
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import SessaoChat from './models/SessaoChat.js';
import SystemInstruction from './models/SystemInstruction.js';

// Inicializa o Express
const app = express();
const port = process.env.PORT || 3000;

// Configurações de Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Validação das variáveis de ambiente
if (!process.env.GEMINI_API_KEY) {
  console.error("A variável de ambiente GEMINI_API_KEY não foi definida.");
  process.exit(1);
}

// Conexão com MongoDB
const MONGO_URI = process.env.MONGO_URI;
console.log('MONGO_URI lida do ambiente:', process.env.MONGO_URI);
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Conectado ao MongoDB com sucesso!');
  })
  .catch((error) => {
    console.error('❌ Erro ao conectar com MongoDB:', error);
    process.exit(1);
  });

// Inicializa o cliente da IA. A chave é pega automaticamente do process.env
const ai = new GoogleGenAI({});

// Função para gerar ID único de sessão
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Função para gerar ID único de usuário
function generateUserId() {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Rota para o chat, adaptada ao novo método
app.post('/generate', async (req, res) => {
  // Recebe o prompt, histórico, sessionId e userId
  const { prompt, historico, sessionId, userId } = req.body;
  const historicoRecebido = historico || [];

  if (!prompt) {
    return res.status(400).json({ error: 'O prompt é obrigatório.' });
  }

  try {
    // Busca a instrução de sistema atual
    let systemInstruction = await SystemInstruction.findOne({ 
      botId: 'assistente-gemini-ifpr', 
      isActive: true 
    });
    
    if (!systemInstruction) {
      // Cria uma instrução padrão se não existir
      systemInstruction = await SystemInstruction.create({
        botId: 'assistente-gemini-ifpr',
        instruction: 'Você é um assistente educacional inteligente do IFPR. Responda de forma clara, educativa e sempre incentive o aprendizado. Mantenha um tom amigável e profissional.'
      });
    }

    // Prepara o histórico com a system instruction
    const historicoComSystem = [
      { role: "user", parts: [{ text: systemInstruction.instruction }] },
      { role: "model", parts: [{ text: "Entendido! Estou pronto para ajudar como assistente educacional do IFPR." }] },
      ...historicoRecebido
    ];

    // USA O NOVO MÉTODO: ai.chats.create
    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      history: historicoComSystem,
    });

    // Envia a mensagem no novo formato
    const result = await chat.sendMessage({
      message: prompt,
    });

    // A resposta de texto agora vem direto no '.text'
    const textoResposta = result.text;

    // Cria o novo histórico (sem a system instruction para o frontend)
    const novoHistorico = [
      ...historicoRecebido,
      { role: "user", parts: [{ text: prompt }] },
      { role: "model", parts: [{ text: textoResposta }] },
    ];

    // Envia a resposta E o novo histórico atualizado
    res.json({ 
      response: textoResposta, 
      historico: novoHistorico,
      sessionId: sessionId || generateSessionId(),
      userId: userId || generateUserId()
    });

  } catch (error) {
    console.error("Erro ao chamar a API do Gemini:", error);
    res.status(500).json({ error: 'Ocorreu um erro ao processar sua solicitação.' });
  }
});

// Endpoint para salvar histórico de chat
app.post('/api/chat/salvar-historico', async (req, res) => {
  try {
    const { sessionId, userId, messages, titulo } = req.body;

    if (!sessionId || !userId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Dados obrigatórios: sessionId, userId e messages (array).' });
    }

    // Verifica se já existe uma sessão com este ID
    let sessaoExistente = await SessaoChat.findOne({ sessionId });

    if (sessaoExistente) {
      // Atualiza a sessão existente
      sessaoExistente.messages = messages;
      sessaoExistente.endTime = new Date();
      if (titulo) sessaoExistente.titulo = titulo;
      await sessaoExistente.save();
    } else {
      // Cria nova sessão
      const novaSessao = new SessaoChat({
        sessionId,
        userId,
        messages,
        titulo: titulo || 'Conversa Sem Título',
        startTime: new Date(),
        endTime: new Date()
      });
      await novaSessao.save();
    }

    res.json({ success: true, message: 'Histórico salvo com sucesso!' });

  } catch (error) {
    console.error('[Servidor] Erro ao salvar histórico:', error);
    res.status(500).json({ error: 'Erro interno ao salvar histórico de chat.' });
  }
});

// Endpoint para buscar históricos de chat
app.get('/api/chat/historicos', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório.' });
    }

    // Busca todas as sessões do usuário, ordena pelas mais recentes, limita a 20
    const historicos = await SessaoChat.find({ userId })
      .sort({ startTime: -1 })
      .limit(20);

    res.json(historicos);

  } catch (error) {
    console.error('[Servidor] Erro ao buscar históricos:', error);
    res.status(500).json({ error: 'Erro interno ao buscar históricos de chat.' });
  }
});

// Endpoint para excluir histórico
app.delete('/api/chat/historicos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sessaoRemovida = await SessaoChat.findByIdAndDelete(id);

    if (!sessaoRemovida) {
      return res.status(404).json({ error: 'Histórico não encontrado.' });
    }

    res.json({ success: true, message: 'Histórico excluído com sucesso!' });

  } catch (error) {
    console.error('[Servidor] Erro ao excluir histórico:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    res.status(500).json({ error: 'Erro interno ao excluir histórico.' });
  }
});

// Endpoint para gerar título inteligente
app.post('/api/chat/historicos/:id/gerar-titulo', async (req, res) => {
  try {
    const { id } = req.params;

    const sessao = await SessaoChat.findById(id);
    if (!sessao) {
      return res.status(404).json({ error: 'Histórico não encontrado.' });
    }

    // Formata o histórico para enviar ao Gemini
    const conversaFormatada = sessao.messages.map(msg => {
      const role = msg.role === 'user' ? 'Usuário' : 'Assistente';
      return `${role}: ${msg.parts[0].text}`;
    }).join('\n');

    // Cria uma nova instância para gerar o título
    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      history: []
    });

    const prompt = `Baseado nesta conversa, sugira um título curto e conciso de no máximo 5 palavras que resuma o tema principal:

${conversaFormatada}

Responda apenas com o título sugerido, sem explicações adicionais.`;

    const result = await chat.sendMessage({ message: prompt });
    const tituloSugerido = result.text.trim();

    res.json({ titulo: tituloSugerido });

  } catch (error) {
    console.error('[Servidor] Erro ao gerar título:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    res.status(500).json({ error: 'Erro interno ao gerar título.' });
  }
});

// Endpoint para atualizar título
app.put('/api/chat/historicos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo } = req.body;

    if (!titulo || titulo.trim() === '') {
      return res.status(400).json({ error: 'Título é obrigatório.' });
    }

    const sessaoAtualizada = await SessaoChat.findByIdAndUpdate(
      id,
      { titulo: titulo.trim() },
      { new: true }
    );

    if (!sessaoAtualizada) {
      return res.status(404).json({ error: 'Histórico não encontrado.' });
    }

    res.json(sessaoAtualizada);

  } catch (error) {
    console.error('[Servidor] Erro ao atualizar título:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    res.status(500).json({ error: 'Erro interno ao atualizar título.' });
  }
});

// Middleware para verificar senha de administrador
function verificarSenhaAdmin(req, res, next) {
  const senhaAdmin = process.env.ADMIN_PASSWORD;
  const senhaEnviada = req.headers['x-admin-password'] || req.body.adminPassword;

  if (!senhaEnviada || senhaEnviada !== senhaAdmin) {
    return res.status(403).json({ error: 'Acesso negado. Senha de administrador incorreta.' });
  }

  next();
}

// Endpoint para estatísticas do admin
app.get('/api/admin/stats', verificarSenhaAdmin, async (req, res) => {
  try {
    // Conta total de conversas
    const totalConversas = await SessaoChat.countDocuments();

    // Conta total de mensagens
    const sessoes = await SessaoChat.find({}, 'messages');
    const totalMensagens = sessoes.reduce((total, sessao) => {
      return total + (sessao.messages ? sessao.messages.length : 0);
    }, 0);

    // Busca as 5 conversas mais recentes
    const ultimasConversas = await SessaoChat.find({})
      .sort({ startTime: -1 })
      .limit(5)
      .select('titulo startTime sessionId userId');

    // Estatísticas por dia (últimos 7 dias)
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    const conversasPorDia = await SessaoChat.aggregate([
      {
        $match: {
          startTime: { $gte: seteDiasAtras }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$startTime" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      totalConversas,
      totalMensagens,
      ultimasConversas,
      conversasPorDia
    });

  } catch (error) {
    console.error('[Admin] Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno ao buscar estatísticas.' });
  }
});

// Endpoint para buscar instrução de sistema atual
app.get('/api/admin/system-instruction', verificarSenhaAdmin, async (req, res) => {
  try {
    let systemInstruction = await SystemInstruction.findOne({ 
      botId: 'assistente-gemini-ifpr', 
      isActive: true 
    });

    if (!systemInstruction) {
      // Cria uma instrução padrão se não existir
      systemInstruction = await SystemInstruction.create({
        botId: 'assistente-gemini-ifpr',
        instruction: 'Você é um assistente educacional inteligente do IFPR. Responda de forma clara, educativa e sempre incentive o aprendizado. Mantenha um tom amigável e profissional.'
      });
    }

    res.json({
      instruction: systemInstruction.instruction,
      updatedAt: systemInstruction.updatedAt,
      updatedBy: systemInstruction.updatedBy
    });

  } catch (error) {
    console.error('[Admin] Erro ao buscar instrução de sistema:', error);
    res.status(500).json({ error: 'Erro interno ao buscar instrução de sistema.' });
  }
});

// Endpoint para atualizar instrução de sistema
app.post('/api/admin/system-instruction', verificarSenhaAdmin, async (req, res) => {
  try {
    const { instruction } = req.body;

    if (!instruction || instruction.trim() === '') {
      return res.status(400).json({ error: 'Instrução é obrigatória.' });
    }

    // Desativa a instrução atual
    await SystemInstruction.updateMany(
      { botId: 'assistente-gemini-ifpr' },
      { isActive: false }
    );

    // Cria nova instrução ativa
    const novaInstrucao = await SystemInstruction.create({
      botId: 'assistente-gemini-ifpr',
      instruction: instruction.trim(),
      updatedBy: 'admin',
      isActive: true
    });

    res.json({
      success: true,
      message: 'Instrução de sistema atualizada com sucesso!',
      instruction: novaInstrucao.instruction,
      updatedAt: novaInstrucao.updatedAt
    });

  } catch (error) {
    console.error('[Admin] Erro ao atualizar instrução de sistema:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar instrução de sistema.' });
  }
});

// Endpoint para buscar todos os históricos (admin)
app.get('/api/admin/all-historicos', verificarSenhaAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const historicos = await SessaoChat.find({})
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('titulo startTime sessionId userId messages');

    const total = await SessaoChat.countDocuments();

    res.json({
      historicos,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: historicos.length,
        totalRecords: total
      }
    });

  } catch (error) {
    console.error('[Admin] Erro ao buscar todos os históricos:', error);
    res.status(500).json({ error: 'Erro interno ao buscar históricos.' });
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
