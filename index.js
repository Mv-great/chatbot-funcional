const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const chatMessages = document.getElementById('chatMessages');

// Variável para armazenar o histórico da conversa no frontend
let chatHistory = [];

function appendMessage(message, sender, isError = false) {
    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add('message');

    if (isError) {
        messageWrapper.classList.add('error-message'); // Adiciona uma classe específica para erros
    } else {
        messageWrapper.classList.add(sender === 'user' ? 'user-message' : 'ai-message');
    }
    
    messageWrapper.textContent = message;
    chatMessages.appendChild(messageWrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

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

async function getAIResponse() {
    const userPrompt = userInput.value.trim();
    if (!userPrompt) {
        return;
    }

    appendMessage(userPrompt, 'user');
    userInput.value = '';
    sendButton.disabled = true; // Desabilita o botão

    // Mostra o indicador "Pensando..."
    showTypingIndicator();

    try {
        // Faz a chamada para o backend, enviando o prompt ATUAL E o histórico da conversa
        const response = await fetch("/generate", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: userPrompt, historico: chatHistory }),
        });

        // Remove o indicador "Pensando..." assim que a resposta chegar
        removeTypingIndicator();

        if (!response.ok) {
            // Se a resposta do servidor não for OK, tenta ler o erro do JSON
            const errorData = await response.json();
            throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log("DADOS RECEBIDOS DO BACKEND:", data); // <-- ADICIONE ESTA LINHA
        // Adiciona a resposta da IA na interface
        appendMessage(data.response, 'ai');

        // ATUALIZA o histórico local com a versão mais recente vinda do backend!
        chatHistory = data.historico;

    } catch (error) {
        console.error("Erro:", error);
        removeTypingIndicator(); // Garante que o indicador seja removido também em caso de erro
        // Mostra a mensagem de erro na interface
        appendMessage(error.message, 'ai', true);
    } finally {
        sendButton.disabled = false; // Reabilita o botão
        userInput.focus(); // Foca de volta no campo de entrada
    }
}

sendButton.addEventListener('click', getAIResponse);
userInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        getAIResponse();
    }
    
});
