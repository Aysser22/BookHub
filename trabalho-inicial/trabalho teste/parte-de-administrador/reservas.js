const conteudoAdmin = document.getElementById('conteudoAdmin');
const listaReservas = document.getElementById('listaReservas');
const filtroStatus = document.getElementById('filtroStatus');
const mensagemStatus = document.getElementById('mensagemStatus');
const totalPendentes = document.getElementById('totalPendentes');
const totalAceitas = document.getElementById('totalAceitas');
const totalRejeitadas = document.getElementById('totalRejeitadas');

const STORAGE_KEY_SESSION = 'bookhub-session';
const STORAGE_KEY_RESERVAS = 'bookhub-reservas';
const STORAGE_KEY_ADMIN_SESSION = 'bookhub-admin-session';
const STORAGE_KEY_ADMIN_USER = 'bookhub-admin-user';
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;
const API_URL_RESERVAS = `${API_BASE}/api/reservas`;

let todasAsReservas = [];

// ===== Carregamento automático de reservas =====
function iniciarCarregamento() {
    carregarReservas();
}

function atualizarBotaoLogin() {
    const link = document.querySelector('.btn-login');
    if (!link) return;

    const possuiSessao = Boolean(localStorage.getItem(STORAGE_KEY_SESSION));

    if (possuiSessao) {
        link.textContent = 'Sair da conta';
        link.href = '#';
        link.classList.add('is-logged');
        link.onclick = (event) => {
            event.preventDefault();
            localStorage.removeItem(STORAGE_KEY_SESSION);
            sessionStorage.removeItem(STORAGE_KEY_ADMIN_SESSION);
            atualizarBotaoLogin();
            window.location.href = '../login/login.html';
        };
    } else {
        link.textContent = 'Entrar';
        link.href = '../login/login.html';
        link.classList.remove('is-logged');
        link.onclick = null;
    }
}

// ===== Funções de Mensagem =====
function mostrarMensagem(texto, tipo = 'sucesso') {
    if (!mensagemStatus) return;

    const icone = tipo === 'erro' ? 'fa-circle-xmark' : 'fa-circle-check';
    mensagemStatus.innerHTML = `
        <div class="toast-content">
            <i class="fa-solid ${icone}"></i>
            <span>${texto}</span>
        </div>
    `;
    mensagemStatus.className = `mensagem-status ${tipo} show`;

    clearTimeout(mostrarMensagem.timeoutId);
    mostrarMensagem.timeoutId = setTimeout(() => {
        mensagemStatus.className = 'mensagem-status';
        mensagemStatus.innerHTML = '';
    }, 2800);
}

// ===== Gerenciamento de Reservas =====
function lerReservasLocais() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_RESERVAS) || '[]');
    } catch (error) {
        console.error('Erro ao ler reservas:', error);
        return [];
    }
}

function salvarReservasLocais(reservas) {
    localStorage.setItem(STORAGE_KEY_RESERVAS, JSON.stringify(reservas));
}

async function carregarReservas() {
    try {
        listaReservas.innerHTML = '<p class="carregando">Carregando reservas...</p>';
        
        try {
            const response = await fetch(API_URL_RESERVAS, { cache: 'no-store' });
            if (response.ok) {
                const dados = await response.json();
                todasAsReservas = Array.isArray(dados) ? dados : [];
                salvarReservasLocais(todasAsReservas);
            }
        } catch (error) {
            console.warn('API indisponível, usando armazenamento local.', error);
            todasAsReservas = lerReservasLocais();
        }

        if (todasAsReservas.length === 0) {
            listaReservas.innerHTML = `
                <div class="vazio">
                    <i class="fa-solid fa-inbox"></i>
                    <p>Nenhuma reserva encontrada</p>
                </div>
            `;
        } else {
            exibirReservas(todasAsReservas);
        }
        
        atualizarEstatisticas();
    } catch (error) {
        console.error('Erro ao carregar reservas:', error);
        listaReservas.innerHTML = '<p class="carregando">Erro ao carregar reservas</p>';
    }
}

function exibirReservas(reservas) {
    const filtro = filtroStatus.value;
    
    let reservasFiltradas = reservas;
    if (filtro) {
        reservasFiltradas = reservas.filter(r => r.status === filtro);
    }

    if (reservasFiltradas.length === 0) {
        listaReservas.innerHTML = `
            <div class="vazio">
                <i class="fa-solid fa-inbox"></i>
                <p>Nenhuma reserva com esse status</p>
            </div>
        `;
        return;
    }

    listaReservas.innerHTML = reservasFiltradas.map(reserva => criarCardReserva(reserva)).join('');
    adicionarEventosReservas();
}

function criarCardReserva(reserva) {
    const dataFormatada = new Date(reserva.dataReserva).toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    const statusClass = `status-${reserva.status}`;
    const statusTexto = {
        'pendente': 'Pendente',
        'aceita': 'Aceita',
        'rejeitada': 'Rejeitada'
    }[reserva.status] || reserva.status;

    const botoesAcao = reserva.status === 'pendente' ? `
        <button class="btn-acao btn-aceitar" data-id="${reserva.id}" data-acao="aceitar">
            <i class="fa-solid fa-check"></i> Aceitar
        </button>
        <button class="btn-acao btn-rejeitar" data-id="${reserva.id}" data-acao="rejeitar">
            <i class="fa-solid fa-times"></i> Rejeitar
        </button>
    ` : '';

    return `
        <div class="reserva-card" data-id="${reserva.id}">
            <div class="reserva-header">
                <div class="reserva-info">
                    <h3><i class="fa-solid fa-book"></i> ${reserva.nomelivro || 'Livro não identificado'}</h3>
                    <span class="reserva-status ${statusClass}">${statusTexto}</span>
                </div>
            </div>

            <div class="aluno-info">
                <label><i class="fa-solid fa-user"></i> Nome do Aluno:</label>
                <span>${reserva.nomeAluno || 'Não informado'}</span>
            </div>

            <div class="livro-info">
                <label><i class="fa-solid fa-book-bookmark"></i> Detalhes do Livro:</label>
                <span>ID do Livro: ${reserva.idlivro || 'N/A'}</span>
            </div>

            <div class="data-info">
                <i class="fa-solid fa-calendar"></i> Solicitado em: ${dataFormatada}
            </div>

            <div class="reserva-actions">
                ${botoesAcao}
            </div>
        </div>
    `;
}

function adicionarEventosReservas() {
    const botoes = document.querySelectorAll('.btn-acao');
    botoes.forEach(botao => {
        botao.addEventListener('click', async (e) => {
            e.preventDefault();
            const id = botao.dataset.id;
            const acao = botao.dataset.acao;
            await processarReserva(id, acao);
        });
    });
}

async function processarReserva(id, acao) {
    try {
        const reserva = todasAsReservas.find(r => r.id === id);
        if (!reserva) {
            mostrarMensagem('Reserva não encontrada', 'erro');
            return;
        }

        const novoStatus = acao === 'aceitar' ? 'aceita' : 'rejeitada';
        reserva.status = novoStatus;
        reserva.dataProcessamento = new Date().toISOString();

        // Tentar atualizar via API
        try {
            const response = await fetch(`${API_URL_RESERVAS}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reserva)
            });

            if (!response.ok) {
                throw new Error('Erro na API');
            }
        } catch (error) {
            console.warn('API indisponível, atualizando localmente.', error);
        }

        salvarReservasLocais(todasAsReservas);

        // Exibir mensagem de sucesso
        const mensagem = acao === 'aceitar' 
            ? `Reserva aceita! ${reserva.nomeAluno} foi notificado.`
            : `Reserva rejeitada! ${reserva.nomeAluno} foi notificado.`;
        
        mostrarMensagem(mensagem, 'sucesso');

        // Notificar o aluno (simulado no localStorage)
        notificarAluno(reserva, novoStatus);

        // Atualizar a exibição
        setTimeout(() => {
            carregarReservas();
        }, 300);

    } catch (error) {
        console.error('Erro ao processar reserva:', error);
        mostrarMensagem('Erro ao processar a reserva', 'erro');
    }
}

function notificarAluno(reserva, status) {
    try {
        const notificacoes = JSON.parse(localStorage.getItem('bookhub-notificacoes') || '{}');
        
        if (!notificacoes[reserva.nomeAluno]) {
            notificacoes[reserva.nomeAluno] = [];
        }

        const mensagem = status === 'aceita'
            ? `Sua reserva do livro "${reserva.nomelivro}" foi ACEITA! Você já pode ir buscar o livro.`
            : `Sua reserva do livro "${reserva.nomelivro}" foi REJEITADA.`;

        notificacoes[reserva.nomeAluno].push({
            tipo: 'reserva',
            status: status,
            livro: reserva.nomelivro,
            mensagem: mensagem,
            data: new Date().toISOString()
        });

        localStorage.setItem('bookhub-notificacoes', JSON.stringify(notificacoes));
    } catch (error) {
        console.error('Erro ao notificar aluno:', error);
    }
}

function atualizarEstatisticas() {
    const pendentes = todasAsReservas.filter(r => r.status === 'pendente').length;
    const aceitas = todasAsReservas.filter(r => r.status === 'aceita').length;
    const rejeitadas = todasAsReservas.filter(r => r.status === 'rejeitada').length;

    if (totalPendentes) totalPendentes.textContent = pendentes;
    if (totalAceitas) totalAceitas.textContent = aceitas;
    if (totalRejeitadas) totalRejeitadas.textContent = rejeitadas;
}

// ===== Evento de Filtro =====
filtroStatus?.addEventListener('change', () => {
    exibirReservas(todasAsReservas);
});

// ===== Inicialização =====
document.addEventListener('DOMContentLoaded', () => {
    atualizarBotaoLogin();
    iniciarCarregamento();
});

window.addEventListener('pageshow', () => {
    atualizarBotaoLogin();
});

window.addEventListener('storage', () => {
    atualizarBotaoLogin();
});
