const STORAGE_KEY_USERS = 'bookhub-users';
const STORAGE_KEY_SESSION = 'bookhub-session';
const STORAGE_KEY_RESERVAS = 'bookhub-reservas';
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;
const API_URL_USERS = `${API_BASE}/api/users`;

function atualizarBotaoLogin() {
    const link = document.querySelector('.btn-login');
    if (!link) return;

    const possuiSessao = Boolean(localStorage.getItem(STORAGE_KEY_SESSION));
    const hrefLogin = window.location.pathname.includes('/login/') ? './login.html' : '../login/login.html';

    if (possuiSessao) {
        link.textContent = 'Sair da conta';
        link.href = '#';
        link.classList.add('is-logged');
        link.onclick = (event) => {
            event.preventDefault();
            localStorage.removeItem(STORAGE_KEY_SESSION);
            atualizarBotaoLogin();
            window.location.href = hrefLogin;
        };
    } else {
        link.textContent = 'Entrar';
        link.href = hrefLogin;
        link.classList.remove('is-logged');
        link.onclick = null;
    }
}

document.addEventListener('DOMContentLoaded', atualizarBotaoLogin);
window.addEventListener('pageshow', atualizarBotaoLogin);
window.addEventListener('storage', atualizarBotaoLogin);

// sync users from server when available
if (window.location.protocol !== 'file:') {
    (async () => {
        try {
            const res = await fetch(API_URL_USERS, { cache: 'no-store' });
            if (res.ok) {
                const users = await res.json();
                if (Array.isArray(users)) salvarUsuarios(users);
            }
        } catch (err) {
            // ignore
        }
    })();
}

function lerUsuarios() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
    } catch (error) {
        return [];
    }
}

function carregarUsuarioLogado() {
    try {
        const userData = localStorage.getItem(STORAGE_KEY_SESSION);
        if (!userData) return null;
        
        const usuario = typeof userData === 'string' ? JSON.parse(userData) : userData;
        
        // Validar que temos os dados necessários
        if (!usuario.id) {
            console.error('Usuário sem ID válido:', usuario);
            return null;
        }
        
        return usuario;
    } catch (error) {
        console.error('Erro ao carregar usuário logado:', error);
        return null;
    }
}

function salvarUsuarioLogado(usuario) {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(usuario));
}

function salvarUsuarios(usuarios) {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usuarios));
}

function lerReservas() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_RESERVAS) || '[]');
    } catch (error) {
        return [];
    }
}

function formatarDataReserva(data) {
    try {
        return new Date(data).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return data || 'N/A';
    }
}

function obterTextoStatus(status) {
    return {
        pendente: 'Em análise',
        aceita: 'Aceita',
        rejeitada: 'Recusada'
    }[status] || status;
}

function obterObservacaoStatus(status) {
    return {
        pendente: 'Sua solicitação ainda será avaliada.',
        aceita: 'Sua reserva foi aceita pelo administrador.',
        rejeitada: 'Sua reserva foi recusada pelo administrador.'
    }[status] || 'Status indefinido.';
}

function lerNotificacoes() {
    try {
        return JSON.parse(localStorage.getItem('bookhub-notificacoes') || '{}');
    } catch (error) {
        return {};
    }
}

function obterNotificacoesUsuario(usuario) {
    if (!usuario) return [];

    const notifs = lerNotificacoes();
    const nomes = [usuario.nome?.toLowerCase?.(), usuario.email?.toLowerCase?.()].filter(Boolean);
    const mensagens = [];

    nomes.forEach((chave) => {
        if (Array.isArray(notifs[chave])) {
            mensagens.push(...notifs[chave]);
        }
    });

    return mensagens.sort((a, b) => new Date(b.data) - new Date(a.data));
}

function obterReservasDoAluno(usuario) {
    if (!usuario || !usuario.id) {
        console.warn('Usuário inválido para buscar reservas:', usuario);
        return [];
    }

    const todasReservas = lerReservas();
    console.log('Todas as reservas no storage:', todasReservas);
    
    const idUsuario = usuario.id;
    const emailUsuario = usuario.email?.toLowerCase?.() || '';
    const nomeUsuario = usuario.nome?.toLowerCase?.() || '';

    const reservasDoAluno = todasReservas.filter((reserva) => {
        // Prioridade 1: ID do aluno (mais confiável)
        if (reserva.idAluno && reserva.idAluno === idUsuario) {
            console.log('Reserva encontrada por ID:', reserva);
            return true;
        }

        // Prioridade 2: Email registrado
        if (reserva.emailAlunoRegistro) {
            const emailReserva = reserva.emailAlunoRegistro.toLowerCase?.();
            if (emailReserva === emailUsuario) {
                console.log('Reserva encontrada por email registrado:', reserva);
                return true;
            }
        }

        // Prioridade 3: Email digitado no formulário
        if (reserva.emailAluno && emailUsuario) {
            const emailReserva = reserva.emailAluno.toLowerCase?.();
            if (emailReserva === emailUsuario) {
                console.log('Reserva encontrada por email do formulário:', reserva);
                return true;
            }
        }

        // Prioridade 4: Nome do aluno
        if (reserva.nomeAluno && nomeUsuario) {
            const nomeReserva = reserva.nomeAluno.toLowerCase?.();
            if (nomeReserva === nomeUsuario) {
                console.log('Reserva encontrada por nome:', reserva);
                return true;
            }
        }

        return false;
    });

    console.log(`Encontradas ${reservasDoAluno.length} reservas para o usuário ${usuario.nome}`);
    return reservasDoAluno;
}

function atualizarMinhasReservas(usuario) {
    const tabelaReservas = document.getElementById('minhasReservas');
    if (!tabelaReservas) return;

    const reservas = obterReservasDoAluno(usuario);
    
    console.log('Usuário logado:', usuario);
    console.log('Reservas encontradas:', reservas);
    console.log('Total de reservas no storage:', lerReservas().length);

    if (reservas.length === 0) {
        tabelaReservas.innerHTML = '<tr><td colspan="4">Nenhuma reserva realizada.</td></tr>';
        return;
    }

    tabelaReservas.innerHTML = reservas.map((reserva) => `
        <tr>
            <td>${reserva.nomelivro || 'Livro não informado'}</td>
            <td>${formatarDataReserva(reserva.dataReserva)}</td>
            <td><span class="status-tag status-${reserva.status || 'pendente'}">${obterTextoStatus(reserva.status)}</span></td>
            <td>${obterObservacaoStatus(reserva.status)}</td>
        </tr>
    `).join('');
}

function atualizarNotificacoes(usuario) {
    const tabelaNotificacoes = document.getElementById('notificacoesUsuario');
    if (!tabelaNotificacoes) return;

    const notificacoes = obterNotificacoesUsuario(usuario);
    if (notificacoes.length === 0) {
        tabelaNotificacoes.innerHTML = '<tr><td colspan="2">Nenhuma notificação de reserva.</td></tr>';
        return;
    }

    tabelaNotificacoes.innerHTML = notificacoes.map((item) => `
        <tr>
            <td>${formatarDataReserva(item.data)}</td>
            <td>${item.mensagem || obterObservacaoStatus(item.status)}</td>
        </tr>
    `).join('');
}

function cancelarReserva(tituloLivro) {
    const usuario = carregarUsuarioLogado();
    if (!usuario) return;

    const usuarios = lerUsuarios();
    const indice = usuarios.findIndex((item) => item.id === usuario.id);
    if (indice === -1) return;

    const usuarioAtualizado = { ...usuarios[indice] };
    const historicoAtual = usuarioAtualizado.historico || [];

    usuarioAtualizado.estatisticas = {
        lidos: usuarioAtualizado.estatisticas?.lidos || 0,
        emprestados: Math.max((usuarioAtualizado.estatisticas?.emprestados || 0) - 1, 0),
        atrasos: usuarioAtualizado.estatisticas?.atrasos || 0
    };

    usuarioAtualizado.historico = historicoAtual.filter((item) => !(item.titulo === tituloLivro && item.status === 'Emprestado'));

    usuarios[indice] = usuarioAtualizado;
    salvarUsuarios(usuarios);
    salvarUsuarioLogado(usuarioAtualizado);
    atualizarPerfil();
}

async function atualizarPerfil() {
    const usuario = carregarUsuarioLogado();
    if (!usuario) {
        window.location.href = '../login/login.html';
        return;
    }

    // Recarregar dados do servidor se disponível
    if (window.location.protocol !== 'file:') {
        try {
            const res = await fetch(`${API_BASE}/api/reservas`, { cache: 'no-store' });
            if (res.ok) {
                const reservas = await res.json();
                if (Array.isArray(reservas)) {
                    localStorage.setItem(STORAGE_KEY_RESERVAS, JSON.stringify(reservas));
                }
            }
        } catch (err) {
            // Usar dados locais se API não estiver disponível
        }
    }

    const usuarios = lerUsuarios();
    const usuarioAtual = usuarios.find((item) => item.id === usuario.id) || usuario;

    document.getElementById('nomeUsuario').textContent = usuarioAtual.nome || usuarioAtual.email;
    const anoEscolar = usuarioAtual.ano || '3º Ano';
    const turmaAluno = usuarioAtual.turma || 'A';
    document.getElementById('infoUsuario').textContent = `${usuarioAtual.perfil || 'Aluno'} | ${anoEscolar} - Turma ${turmaAluno}`;
    document.getElementById('matriculaUsuario').textContent = `Matrícula: ${usuarioAtual.matricula || '#000000'}`;
    document.getElementById('estatLidos').textContent = usuarioAtual.estatisticas?.lidos || 0;
    document.getElementById('estatEmprestados').textContent = usuarioAtual.estatisticas?.emprestados || 0;
    document.getElementById('estatAtrasos').textContent = usuarioAtual.estatisticas?.atrasos || 0;

    const historico = document.getElementById('historicoEmprestimos');
    if (historico) {
        if (!usuarioAtual.historico || usuarioAtual.historico.length === 0) {
            historico.innerHTML = '<tr><td colspan="4">Nenhum empréstimo registrado ainda.</td></tr>';
        } else {
            historico.innerHTML = usuarioAtual.historico.map((item) => `
                <tr>
                    <td>${item.titulo}</td>
                    <td>${item.data}</td>
                    <td>${item.status}</td>
                    <td>
                        ${item.status === 'Emprestado' ? `<button class="btn-action btn-cancelar-reserva" data-titulo="${item.titulo}">Cancelar reserva</button>` : '<span>—</span>'}
                    </td>
                </tr>
            `).join('');
        }
    }

    atualizarNotificacoes(usuarioAtual);
    atualizarMinhasReservas(usuarioAtual);

    salvarUsuarioLogado(usuarioAtual);
}

document.querySelectorAll('.filter-btn').forEach((button) => {
    button.addEventListener('click', function () {
        document.querySelector('.filter-btn.active')?.classList.remove('active');
        this.classList.add('active');
    });
});

document.getElementById('historicoEmprestimos')?.addEventListener('click', (event) => {
    const botao = event.target.closest('.btn-cancelar-reserva');
    if (!botao) return;

    const tituloLivro = botao.getAttribute('data-titulo');
    if (tituloLivro) {
        cancelarReserva(tituloLivro);
    }
});

// Recarregar perfil quando a página é exibida (voltando do histórico)
window.addEventListener('pageshow', () => {
    console.log('Página exibida, recarregando perfil...');
    atualizarPerfil();
});

// Recarregar quando há mudanças no localStorage
window.addEventListener('storage', () => {
    console.log('Storage alterado, atualizando perfil...');
    atualizarPerfil();
});

console.log('Script do perfil carregado, inicializando perfil...');
atualizarPerfil();