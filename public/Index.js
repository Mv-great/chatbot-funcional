// Configurações do bot
const NOME_DO_BOT = "Assistente Gemini IFPR";
const SLOGAN_DO_BOT = "Seu companheiro inteligente para dúvidas e aprendizado!";
const BACKEND_URL = 'http://localhost:3000';

// Elementos DOM
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const chatMessages = document.getElementById('chatMessages');
const carregarHistoricoBtn = document.getElementById('carregar-historico-btn');
const listaSessoes = document.getElementById('lista-sessoes');
const visualizacaoDetalhada = document.getElementById('visualizacao-conversa-detalhada');

// Variáveis de estado
let chatHistory = [];
let currentSessionId = null;
let currentUserId = null;
let historicoCarregado = false;

// Inicialização quando a página carrega
window.addEventListener('load', () => {
    // Preenche informações do bot dinamicamente
    document.getElementById('nome-bot-display').textContent = NOME_DO_BOT;
    document.getElementById('slogan-bot-display').textContent = SLOGAN_DO_BOT;
    document.getElementById('nome-bot-sidebar').textContent = NOME_DO_BOT;
    document.getElementById('slogan-bot-sidebar').textContent = SLOGAN_DO_BOT;
    
    // Recupera ou gera userId
    currentUserId = localStorage.getItem('chatbot-userId');
    if (!currentUserId) {
        currentUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('chatbot-userId', currentUserId);
    }
    
    // Gera novo sessionId para esta sessão
    currentSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Event listeners
    carregarHistoricoBtn.addEventListener('click', toggleHistorico);
    
    console.log('Chatbot inicializado com userId:', currentUserId);
});

// Função para adicionar mensagem ao chat
function appendMessage(message, sender, isError = false) {
    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add('message');

    if (isError) {
        messageWrapper.classList.add('error-message');
    } else {
        messageWrapper.classList.add(sender === 'user' ? 'user-message' : 'ai-message');
    }
    
    messageWrapper.textContent = message;
    chatMessages.appendChild(messageWrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Indicador de digitação
function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.classList.add('message', 'typing-indicator');
    indicator.textContent = 'Pensando...';
    indicator.id = 'typingIndicator';
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        chatMessages.removeChild(indicator);
    }
}

// Função principal para obter resposta da IA
async function getAIResponse() {
    const userPrompt = userInput.value.trim();
    if (!userPrompt) {
        return;
    }

    appendMessage(userPrompt, 'user');
    userInput.value = '';
    sendButton.disabled = true;

    showTypingIndicator();

    try {
        const response = await fetch(`${BACKEND_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                prompt: userPrompt, 
                historico: chatHistory,
                sessionId: currentSessionId,
                userId: currentUserId
            }),
        });

        removeTypingIndicator();

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        
        // Adiciona a resposta da IA na interface
        appendMessage(data.response, 'ai');

        // Atualiza o histórico local
        chatHistory = data.historico;
        
        // Atualiza IDs se necessário
        if (data.sessionId) currentSessionId = data.sessionId;
        if (data.userId) currentUserId = data.userId;

        // Salva o histórico automaticamente após algumas mensagens
        if (chatHistory.length >= 2 && chatHistory.length % 4 === 0) {
            await salvarHistoricoAutomatico();
        }

    } catch (error) {
        console.error("Erro:", error);
        removeTypingIndicator();
        appendMessage(error.message, 'ai', true);
    } finally {
        sendButton.disabled = false;
        userInput.focus();
    }
}

// Função para salvar histórico automaticamente
async function salvarHistoricoAutomatico() {
    if (!chatHistory.length || !currentSessionId || !currentUserId) return;

    try {
        const response = await fetch(`${BACKEND_URL}/api/chat/salvar-historico`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: currentSessionId,
                userId: currentUserId,
                messages: chatHistory
            }),
        });

        if (response.ok) {
            console.log('Histórico salvo automaticamente');
        }
    } catch (error) {
        console.error('Erro ao salvar histórico automaticamente:', error);
    }
}

// Função para alternar exibição do histórico
async function toggleHistorico() {
    if (!historicoCarregado) {
        await carregarHistoricoSessoes();
        historicoCarregado = true;
        carregarHistoricoBtn.textContent = 'Ocultar Histórico';
    } else {
        listaSessoes.style.display = 'none';
        visualizacaoDetalhada.style.display = 'none';
        historicoCarregado = false;
        carregarHistoricoBtn.textContent = 'Ver Histórico';
    }
}

// Função para carregar histórico de sessões
async function carregarHistoricoSessoes() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/chat/historicos?userId=${currentUserId}`);
        
        if (!response.ok) {
            throw new Error('Erro ao carregar histórico');
        }

        const sessoes = await response.json();
        
        // Limpa a lista
        listaSessoes.innerHTML = '';
        
        if (sessoes.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Nenhuma conversa salva ainda.';
            li.style.fontStyle = 'italic';
            li.style.color = '#666';
            listaSessoes.appendChild(li);
        } else {
            sessoes.forEach(sessao => {
                const li = document.createElement('li');
                li.dataset.id = sessao._id;
                
                const titulo = document.createElement('div');
                titulo.className = 'sessao-titulo';
                titulo.textContent = sessao.titulo;
                
                const info = document.createElement('div');
                info.className = 'sessao-info';
                info.textContent = `${new Date(sessao.startTime).toLocaleString('pt-BR')} - ${sessao.messages.length} mensagens`;
                info.style.fontSize = '0.8em';
                info.style.color = '#666';
                info.style.marginTop = '5px';
                
                const botoes = document.createElement('div');
                botoes.className = 'sessao-botoes';
                
                const btnVisualizar = document.createElement('button');
                btnVisualizar.className = 'btn-pequeno';
                btnVisualizar.textContent = '👁️ Ver';
                btnVisualizar.onclick = (e) => {
                    e.stopPropagation();
                    exibirConversaDetalhada(sessao.messages, sessao.titulo);
                };
                
                const btnTitulo = document.createElement('button');
                btnTitulo.className = 'btn-pequeno btn-titulo';
                btnTitulo.textContent = '✨ Título';
                btnTitulo.onclick = (e) => {
                    e.stopPropagation();
                    obterESalvarTitulo(sessao._id, li);
                };
                
                const btnExcluir = document.createElement('button');
                btnExcluir.className = 'btn-pequeno btn-excluir';
                btnExcluir.textContent = '🗑️ Excluir';
                btnExcluir.onclick = (e) => {
                    e.stopPropagation();
                    excluirSessao(sessao._id, li);
                };
                
                botoes.appendChild(btnVisualizar);
                botoes.appendChild(btnTitulo);
                botoes.appendChild(btnExcluir);
                
                li.appendChild(titulo);
                li.appendChild(info);
                li.appendChild(botoes);
                
                // Click no item para visualizar
                li.onclick = () => exibirConversaDetalhada(sessao.messages, sessao.titulo);
                
                listaSessoes.appendChild(li);
            });
        }
        
        listaSessoes.style.display = 'block';
        
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        alert('Erro ao carregar histórico de conversas.');
    }
}

// Função para exibir conversa detalhada
function exibirConversaDetalhada(mensagens, titulo) {
    visualizacaoDetalhada.innerHTML = '';
    
    const tituloDiv = document.createElement('div');
    tituloDiv.className = 'conversa-titulo';
    tituloDiv.textContent = titulo || 'Conversa';
    visualizacaoDetalhada.appendChild(tituloDiv);
    
    mensagens.forEach(msg => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `mensagem-historico ${msg.role === 'user' ? 'usuario' : 'bot'}`;
        msgDiv.textContent = msg.parts[0].text;
        visualizacaoDetalhada.appendChild(msgDiv);
    });
    
    visualizacaoDetalhada.style.display = 'block';
    visualizacaoDetalhada.scrollTop = 0;
}

// Função para excluir sessão
async function excluirSessao(sessionId, elementoLi) {
    if (!confirm('Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/chat/historicos/${sessionId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Erro ao excluir conversa');
        }
        
        // Remove o elemento da lista
        elementoLi.remove();
        
        // Oculta visualização detalhada se estava mostrando esta conversa
        visualizacaoDetalhada.style.display = 'none';
        
        alert('Conversa excluída com sucesso!');
        
    } catch (error) {
        console.error('Erro ao excluir sessão:', error);
        alert('Erro ao excluir conversa.');
    }
}

// Função para obter e salvar título inteligente
async function obterESalvarTitulo(sessionId, elementoLi) {
    const btnTitulo = elementoLi.querySelector('.btn-titulo');
    const textoOriginal = btnTitulo.textContent;
    
    try {
        // Mostra estado de carregamento
        btnTitulo.textContent = '⏳ Gerando...';
        btnTitulo.disabled = true;
        
        // Solicita título ao backend
        const response = await fetch(`${BACKEND_URL}/api/chat/historicos/${sessionId}/gerar-titulo`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Erro ao gerar título');
        }
        
        const data = await response.json();
        const tituloSugerido = data.titulo;
        
        // Mostra prompt para o usuário editar ou confirmar
        const tituloFinal = prompt(
            'Título sugerido pela IA:\n\nVocê pode editar ou confirmar:', 
            tituloSugerido
        );
        
        if (tituloFinal && tituloFinal.trim() !== '') {
            // Salva o título final
            const saveResponse = await fetch(`${BACKEND_URL}/api/chat/historicos/${sessionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ titulo: tituloFinal.trim() })
            });
            
            if (!saveResponse.ok) {
                throw new Error('Erro ao salvar título');
            }
            
            // Atualiza o elemento na tela
            const tituloElement = elementoLi.querySelector('.sessao-titulo');
            tituloElement.textContent = tituloFinal.trim();
            
            alert('Título atualizado com sucesso!');
        }
        
    } catch (error) {
        console.error('Erro ao gerar/salvar título:', error);
        alert('Erro ao gerar título inteligente.');
    } finally {
        // Restaura o botão
        btnTitulo.textContent = textoOriginal;
        btnTitulo.disabled = false;
    }
}

// Event listeners
sendButton.addEventListener('click', getAIResponse);
userInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        getAIResponse();
    }
});

// Salva histórico quando a página é fechada
window.addEventListener('beforeunload', () => {
    if (chatHistory.length > 0) {
        salvarHistoricoAutomatico();
    }
});
