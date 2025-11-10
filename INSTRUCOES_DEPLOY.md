# Instruções para Deploy no Vercel

Siga estas instruções para fazer o deploy do seu projeto `chatbot-funcional` no Vercel:

1.  **Acesse o Vercel:** Faça login na sua conta do Vercel.

2.  **Importe o Projeto:**
    *   Clique em "Add New..." e selecione "Project".
    *   Conecte sua conta do GitHub e selecione o repositório `chatbot-funcional`.

3.  **Configure o Projeto:**
    *   **Framework Preset:** O Vercel deve detectar automaticamente que é um projeto Node.js. Se não, selecione "Other".
    *   **Build & Development Settings:**
        *   **Build Command:** Deixe em branco ou use `npm install`.
        *   **Output Directory:** Deixe em branco.
        *   **Install Command:** `npm install`
        *   **Development Command:** `node server.js`
    *   **Environment Variables:**
        *   Adicione a variável de ambiente `GEMINI_API_KEY` com a sua chave da API do Gemini.

4.  **Faça o Deploy:**
    *   Clique em "Deploy".

O Vercel irá construir e implantar seu projeto. Após a conclusão, você receberá uma URL para acessar seu chatbot.

## Código Corrigido

O arquivo `server.js` foi modificado para remover a dependência do MongoDB, permitindo que o projeto seja executado em um ambiente sem banco de dados como o Vercel. As rotas que dependiam do banco de dados foram comentadas.

Se você precisar usar um banco de dados no futuro, considere usar um serviço de banco de dados em nuvem como o MongoDB Atlas e configurar a variável de ambiente `MONGO_URI` no Vercel.
