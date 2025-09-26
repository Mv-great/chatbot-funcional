// Configurações
const BACKEND_URL = 'http://localhost:3000';
let adminPassword = '';
let refreshInterval = null;

// Elementos DOM
const loginArea = document.getElementById('login-area');
const adminPanel = document.getElementById('admin-panel');
const passwordInput = document.getElementById('admin-password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const refreshBtn = document.getElementById('refresh-btn');
const lastUpdateSpan = document.getElementById('last-update');

// Métricas
const totalConversasEl = document.getElementById('total-conversas');
const totalMensagensEl = document.getElementById('total-mensagens');
const usuariosAtivosEl = document.getElementById('usuarios-ativos');
const mediaMensagensEl = document.getElementById('media-mensagens');
const ultimasConversasEl = document.getElementById('ultimas-conversas');

// Controle da IA
const systemInstructionTextarea = document.getElementById('system-instruction');
const loadInstructionBtn = document.getElementById('load-instruction-btn');
const saveInstructionBtn = document.getElementById('save-instruction-btn');
const instructionUpdatedEl = document.getElementById('instruction-updated');

// Logs
const systemLogsEl = document.getElementById('system-logs');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    addSystemLog('Sistema de administração iniciado', 'info');
});

// Event Listeners
function setupEventListeners() {
    loginBtn.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    logoutBtn.addEventListener('click', handleLogout);
    refreshBtn.addEventListener('click', refreshDashboard);
    
    loadInstructionBtn.addEventListener('click', loadCurrentInstruction);
    saveInstructionBtn.addEventListener('click', saveNewInstruction);
}

// Função de login
async function handleLogin() {
    const password = passwordInput.value.trim();
    
    if (!password) {
        showLoginError('Por favor, digite a senha.');
        return;
    }
    
    loginBtn.textContent = 'Verificando...';
    loginBtn.disabled = true;
    
    try {
        // Testa a senha fazendo uma requisição para o endpoint de stats
        const response = await fetch(`${BACKEND_URL}/api/admin/stats`, {
            headers: {
                'x-admin-password': password
            }
        });
        
        if (response.ok) {
            adminPassword = password;
            showAdminPanel();
            addSystemLog('Login administrativo realizado com sucesso', 'info');
            await refreshDashboard();
            startAutoRefresh();
        } else {
            const error = await response.json();
            showLoginError(error.error || 'Senha incorreta.');
            addSystemLog('Tentativa de login falhada', 'warning');
        }
        
    } catch (error) {
        console.error('Erro no login:', error);
        showLoginError('Erro de conexão com o servidor.');
        addSystemLog('Erro de conexão durante login', 'error');
    } finally {
        loginBtn.textContent = 'Entrar';
        loginBtn.disabled = false;
    }
}

// Função de logout
function handleLogout() {
    adminPassword = '';
    stopAutoRefresh();
    hideAdminPanel();
    passwordInput.value = '';
    addSystemLog('Logout administrativo realizado', 'info');
}

// Mostrar/ocultar painéis
function showAdminPanel() {
    loginArea.style.display = 'none';
    adminPanel.style.display = 'block';
}

function hideAdminPanel() {
    loginArea.style.display = 'flex';
    adminPanel.style.display = 'none';
    hideLoginError();
}

// Gerenciar mensagens de erro de login
function showLoginError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
}

function hideLoginError() {
    loginError.style.display = 'none';
}

// Função principal para atualizar dashboard
async function refreshDashboard() {
    if (!adminPassword) return;
    
    refreshBtn.textContent = '🔄 Atualizando...';
    refreshBtn.disabled = true;
    
    try {
        await Promise.all([
            loadStatistics(),
            loadCurrentInstruction()
        ]);
        
        updateLastUpdateTime();
        addSystemLog('Dashboard atualizado com sucesso', 'info');
        
    } catch (error) {
        console.error('Erro ao atualizar dashboard:', error);
        addSystemLog('Erro ao atualizar dashboard: ' + error.message, 'error');
    } finally {
        refreshBtn.textContent = '🔄 Atualizar';
        refreshBtn.disabled = false;
    }
}

// Carregar estatísticas
async function loadStatistics() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/stats`, {
            headers: {
                'x-admin-password': adminPassword
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar estatísticas');
        }
        
        const stats = await response.json();
        
        // Atualiza métricas principais
        totalConversasEl.textContent = stats.totalConversas || '0';
        totalMensagensEl.textContent = stats.totalMensagens || '0';
        
        // Calcula usuários únicos (aproximação baseada em conversas)
        const usuariosUnicos = Math.ceil(stats.totalConversas * 0.7); // Estimativa
        usuariosAtivosEl.textContent = usuariosUnicos;
        
        // Calcula média de mensagens por conversa
        const mediaMsgs = stats.totalConversas > 0 ? 
            Math.round(stats.totalMensagens / stats.totalConversas * 10) / 10 : 0;
        mediaMensagensEl.textContent = mediaMsgs;
        
        // Atualiza lista de últimas conversas
        updateRecentConversations(stats.ultimasConversas || []);
        
        // Atualiza gráfico de atividade
        updateActivityChart(stats.conversasPorDia || []);
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        throw error;
    }
}

// Atualizar lista de conversas recentes
function updateRecentConversations(conversas) {
    ultimasConversasEl.innerHTML = '';
    
    if (conversas.length === 0) {
        ultimasConversasEl.innerHTML = '<p style="color: #666; font-style: italic;">Nenhuma conversa encontrada.</p>';
        return;
    }
    
    conversas.forEach(conversa => {
        const item = document.createElement('div');
        item.className = 'conversation-item';
        
        const title = document.createElement('div');
        title.className = 'conversation-title';
        title.textContent = conversa.titulo || 'Conversa Sem Título';
        
        const meta = document.createElement('div');
        meta.className = 'conversation-meta';
        
        const date = new Date(conversa.startTime).toLocaleString('pt-BR');
        meta.innerHTML = `
            <span>📅 ${date}</span>
            <span>👤 ${conversa.userId.substring(0, 12)}...</span>
            <span>🆔 ${conversa.sessionId.substring(0, 12)}...</span>
        `;
        
        item.appendChild(title);
        item.appendChild(meta);
        ultimasConversasEl.appendChild(item);
    });
}

// Atualizar gráfico de atividade (versão simples com texto)
function updateActivityChart(dadosPorDia) {
    const canvas = document.getElementById('activity-chart');
    const ctx = canvas.getContext('2d');
    
    // Limpa o canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (dadosPorDia.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Nenhum dado disponível', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Desenha um gráfico de barras simples
    const maxValue = Math.max(...dadosPorDia.map(d => d.count));
    const barWidth = canvas.width / dadosPorDia.length;
    
    dadosPorDia.forEach((dia, index) => {
        const barHeight = (dia.count / maxValue) * (canvas.height - 40);
        const x = index * barWidth;
        const y = canvas.height - barHeight - 20;
        
        // Desenha a barra
        ctx.fillStyle = '#667eea';
        ctx.fillRect(x + 5, y, barWidth - 10, barHeight);
        
        // Desenha o valor
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(dia.count, x + barWidth / 2, y - 5);
        
        // Desenha a data
        ctx.fillText(dia._id.substring(5), x + barWidth / 2, canvas.height - 5);
    });
}

// Carregar instrução de sistema atual
async function loadCurrentInstruction() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/system-instruction`, {
            headers: {
                'x-admin-password': adminPassword
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar instrução de sistema');
        }
        
        const data = await response.json();
        systemInstructionTextarea.value = data.instruction;
        
        const updateDate = new Date(data.updatedAt).toLocaleString('pt-BR');
        instructionUpdatedEl.textContent = `Última atualização: ${updateDate} por ${data.updatedBy}`;
        
    } catch (error) {
        console.error('Erro ao carregar instrução:', error);
        addSystemLog('Erro ao carregar instrução de sistema', 'error');
    }
}

// Salvar nova instrução de sistema
async function saveNewInstruction() {
    const newInstruction = systemInstructionTextarea.value.trim();
    
    if (!newInstruction) {
        alert('Por favor, digite uma instrução válida.');
        return;
    }
    
    if (!confirm('Tem certeza que deseja atualizar a instrução de sistema? Isso afetará todas as novas conversas.')) {
        return;
    }
    
    saveInstructionBtn.textContent = '💾 Salvando...';
    saveInstructionBtn.disabled = true;
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/system-instruction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-password': adminPassword
            },
            body: JSON.stringify({
                instruction: newInstruction
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao salvar instrução');
        }
        
        const result = await response.json();
        
        // Atualiza a informação de última atualização
        const updateDate = new Date(result.updatedAt).toLocaleString('pt-BR');
        instructionUpdatedEl.textContent = `Última atualização: ${updateDate} por admin`;
        
        // Mostra mensagem de sucesso
        showSuccessMessage('Instrução de sistema atualizada com sucesso!');
        addSystemLog('Instrução de sistema atualizada', 'info');
        
    } catch (error) {
        console.error('Erro ao salvar instrução:', error);
        alert('Erro ao salvar instrução: ' + error.message);
        addSystemLog('Erro ao salvar instrução: ' + error.message, 'error');
    } finally {
        saveInstructionBtn.textContent = '💾 Salvar Nova Instrução';
        saveInstructionBtn.disabled = false;
    }
}

// Mostrar mensagem de sucesso
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    // Adiciona após o textarea
    systemInstructionTextarea.parentNode.insertBefore(successDiv, systemInstructionTextarea.nextSibling);
    
    // Remove após 3 segundos
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}

// Atualizar timestamp da última atualização
function updateLastUpdateTime() {
    const now = new Date().toLocaleString('pt-BR');
    lastUpdateSpan.textContent = `Última atualização: ${now}`;
}

// Auto-refresh
function startAutoRefresh() {
    // Atualiza a cada 30 segundos
    refreshInterval = setInterval(refreshDashboard, 30000);
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Sistema de logs
function addSystemLog(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    logEntry.innerHTML = `
        <span class="log-timestamp">[${timestamp}]</span>
        <span class="log-level-${level}">[${level.toUpperCase()}]</span>
        ${message}
    `;
    
    systemLogsEl.appendChild(logEntry);
    
    // Mantém apenas os últimos 50 logs
    while (systemLogsEl.children.length > 50) {
        systemLogsEl.removeChild(systemLogsEl.firstChild);
    }
    
    // Scroll para o final
    systemLogsEl.scrollTop = systemLogsEl.scrollHeight;
}

// Cleanup quando a página é fechada
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});
