const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const responseElement = document.getElementById('response');

async function getAIResponse() {
  const userPrompt = userInput.value;
  if (!userPrompt) {
    responseElement.textContent = "Por favor, digite uma pergunta.";
    return;
  }

  responseElement.textContent = "Pensando...";
  sendButton.disabled = true; // Desabilita o botão enquanto aguarda

  try {
    // Faz a chamada para o NOSSO backend na rota /generate
    const response = await fetch('http://localhost:3000/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Envia o prompt do usuário no corpo da requisição
      body: JSON.stringify({ prompt: userPrompt }),
    });

    if (!response.ok) {
        // Se a resposta do servidor não for OK, lança um erro
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro no servidor');
    }

    const data = await response.json();
    responseElement.textContent = data.response;

  } catch (error) {
    console.error("Erro:", error);
    responseElement.textContent = `Ocorreu um erro: ${error.message}`;
  } finally {
    sendButton.disabled = false; // Reabilita o botão
  }
}

sendButton.addEventListener('click', getAIResponse);
userInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        getAIResponse();
    }
});