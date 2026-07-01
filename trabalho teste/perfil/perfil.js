const STORAGE_KEY_USERS = 'bookhub-users';
const STORAGE_KEY_SESSION = 'bookhub-session';

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

function lerUsuarios() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
    } catch (error) {
        return [];
    }
}

function carregarUsuarioLogado() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_SESSION) || 'null');
    } catch (error) {
        return null;
    }
}

function salvarUsuarioLogado(usuario) {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(usuario));
}

function salvarUsuarios(usuarios) {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usuarios));
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

function atualizarPerfil() {
    const usuario = carregarUsuarioLogado();
    if (!usuario) {
        window.location.href = '../login/login.html';
        return;
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

atualizarPerfil();