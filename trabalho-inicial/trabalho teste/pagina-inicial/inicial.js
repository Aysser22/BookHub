const STORAGE_KEY = 'bookhub-livros';
const STORAGE_KEY_USERS = 'bookhub-users';
const STORAGE_KEY_SESSION = 'bookhub-session';
const STORAGE_KEY_RESERVAS = 'bookhub-reservas';
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;
const API_URL = `${API_BASE}/api/livros`;
const API_URL_RESERVAS = `${API_BASE}/api/reservas`;
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

function lerLivrosLocais() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (error) {
        console.error(error);
        return [];
    }
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

function mostrarNotificacao(texto, tipo = 'sucesso') {
    let container = document.getElementById('bookhub-toast-container');

    if (!container) {
        container = document.createElement('div');
        container.id = 'bookhub-toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `
        <i class="fa-solid ${tipo === 'erro' ? 'fa-circle-xmark' : tipo === 'info' ? 'fa-circle-info' : 'fa-circle-check'}"></i>
        <span>${texto}</span>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 250);
    }, 2800);
}

function atualizarPerfilDoUsuario(livroTitulo, acao = 'reservar') {
    const usuario = carregarUsuarioLogado();
    if (!usuario) return;

    const usuarios = lerUsuarios();
    const indice = usuarios.findIndex((item) => item.id === usuario.id);
    if (indice === -1) return;

    const usuarioAtualizado = { ...usuarios[indice] };
    const historicoAtual = usuarioAtualizado.historico || [];

    if (acao === 'reservar') {
        usuarioAtualizado.estatisticas = {
            lidos: usuarioAtualizado.estatisticas?.lidos || 0,
            emprestados: (usuarioAtualizado.estatisticas?.emprestados || 0) + 1,
            atrasos: usuarioAtualizado.estatisticas?.atrasos || 0
        };

        usuarioAtualizado.historico = [
            {
                titulo: livroTitulo,
                status: 'Emprestado',
                data: new Date().toLocaleDateString('pt-BR')
            },
            ...historicoAtual
        ];
    } else if (acao === 'retirar') {
        usuarioAtualizado.estatisticas = {
            lidos: usuarioAtualizado.estatisticas?.lidos || 0,
            emprestados: Math.max((usuarioAtualizado.estatisticas?.emprestados || 0) - 1, 0),
            atrasos: usuarioAtualizado.estatisticas?.atrasos || 0
        };

        usuarioAtualizado.historico = historicoAtual.filter((item) => item.titulo !== livroTitulo);
    }

    usuarios[indice] = usuarioAtualizado;
    salvarUsuarios(usuarios);
    salvarUsuarioLogado(usuarioAtualizado);
}

async function carregarLivrosDoCatalogo() {
    try {
        const response = await fetch(API_URL, { cache: 'no-store' });
        if (response.ok) {
            const dados = await response.json();
            if (Array.isArray(dados)) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
                return dados;
            }
        }
    } catch (error) {
        console.warn('API indisponível, usando armazenamento local.', error);
    }

    return lerLivrosLocais();
}

async function renderizarCatalogo() {
    const catalogo = document.getElementById('booksGrid');
    if (!catalogo) return;

    const livros = await carregarLivrosDoCatalogo();
    catalogo.innerHTML = '';

    if (livros.length === 0) {
        catalogo.innerHTML = '<div class="empty-state">Nenhum livro cadastrado ainda. Use o painel admin para adicionar o primeiro.</div>';
        return;
    }

    const usuario = carregarUsuarioLogado();
    const historicoUsuario = usuario?.historico || [];

    livros.forEach((livro) => {
        const jaReservado = historicoUsuario.some((item) => item.titulo === livro.titulo && item.status === 'Emprestado');
        const card = document.createElement('article');
        card.className = 'book-card';
        card.innerHTML = `
            <div class="book-cover">
                ${livro.capa ? `<img src="${livro.capa}" alt="Capa de ${livro.titulo}">` : '<i class="fa-solid fa-book-bookmark"></i>'}
            </div>
            <div class="book-info">
                <h3>${livro.titulo}</h3>
                <p class="author">${livro.autor}</p>
                <p class="book-synopsis">${livro.sinopse}</p>
                <span class="badge disponivel">Disponível</span>
                <button class="btn-reserve ${jaReservado ? 'btn-cancelar' : ''}" data-titulo="${livro.titulo}" data-estado="${jaReservado ? 'reservado' : 'disponivel'}">
                    ${jaReservado ? 'Retirar reserva' : 'Reservar'}
                </button>
            </div>
        `;
        catalogo.appendChild(card);
    });
}

function removerAcentos(texto) {
    return texto.normalize('NFD').replace(/[^\w\s]/g, '').toLowerCase();
}

function calcularSimilaridade(a, b) {
    const textoA = removerAcentos(a);
    const textoB = removerAcentos(b);

    if (!textoA || !textoB) return 0;
    if (textoA.includes(textoB) || textoB.includes(textoA)) return 1;

    const palavrasA = textoA.split(/\s+/).filter(Boolean);
    const palavrasB = textoB.split(/\s+/).filter(Boolean);
    const palavrasComuns = palavrasA.filter((palavra) => palavrasB.includes(palavra));

    return palavrasComuns.length / Math.max(palavrasA.length, palavrasB.length);
}

function buscarLivro() {
    const input = document.getElementById('searchInput').value.trim();
    const cards = document.getElementsByClassName('book-card');
    const termo = removerAcentos(input);

    for (let i = 0; i < cards.length; i++) {
        const title = cards[i].querySelector('.book-info h3').innerText;
        const author = cards[i].querySelector('.book-info .author').innerText;
        const sinopse = cards[i].querySelector('.book-info .book-synopsis')?.innerText || '';

        const scoreTitulo = calcularSimilaridade(title, input);
        const scoreAutor = calcularSimilaridade(author, input);
        const scoreSinopse = calcularSimilaridade(sinopse, input);
        const scoreTotal = Math.max(scoreTitulo, scoreAutor, scoreSinopse);

        if (!termo) {
            cards[i].style.display = 'flex';
        } else if (scoreTotal >= 0.3 || removerAcentos(title).includes(termo) || removerAcentos(author).includes(termo)) {
            cards[i].style.display = 'flex';
        } else {
            cards[i].style.display = 'none';
        }
    }
}

// ===== Gerenciamento de Modal de Reserva =====
let livroEmReserva = null;

function abrirModalReserva(nomelivro, idlivro) {
    livroEmReserva = { nomelivro, idlivro };
    document.getElementById('livroNome').textContent = nomelivro;
    document.getElementById('modalReserva').classList.remove('hidden');
    
    const usuario = carregarUsuarioLogado();
    if (usuario && usuario.nome) {
        document.getElementById('nomeAluno').value = usuario.nome;
    }
}

function fecharModalReserva() {
    document.getElementById('modalReserva').classList.add('hidden');
    document.getElementById('formReserva').reset();
    document.getElementById('mensagemReserva').textContent = '';
    document.getElementById('mensagemReserva').className = 'mensagem-reserva';
}

function mostrarMensagemReserva(texto, tipo = 'sucesso') {
    const mensagemDiv = document.getElementById('mensagemReserva');
    mensagemDiv.textContent = texto;
    mensagemDiv.className = `mensagem-reserva ${tipo}`;
}

async function enviarReserva(event) {
    event.preventDefault();
    
    if (!livroEmReserva) {
        mostrarMensagemReserva('Erro: Livro não definido', 'erro');
        return;
    }

    const usuario = carregarUsuarioLogado();
    if (!usuario) {
        mostrarMensagemReserva('Você precisa estar logado para fazer uma reserva', 'erro');
        return;
    }

    const nomeAluno = document.getElementById('nomeAluno').value.trim();
    if (!nomeAluno) {
        mostrarMensagemReserva('Por favor, preencha seu nome', 'erro');
        return;
    }

    const reserva = {
        id: Date.now().toString(),
        nomelivro: livroEmReserva.nomelivro,
        idlivro: livroEmReserva.idlivro,
        nomeAluno: nomeAluno,
        emailAluno: document.getElementById('emailAluno').value.trim(),
        turmaAluno: document.getElementById('turmaAluno').value.trim(),
        status: 'pendente',
        dataReserva: new Date().toISOString(),
        idAluno: usuario.id,
        emailAlunoRegistro: usuario.email
    };

    try {
        const response = await fetch(API_URL_RESERVAS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reserva)
        });

        if (response.ok) {
            mostrarNotificacao(`Sua reserva será analisada. Aguarde a confirmação do administrador.`, 'sucesso');
            fecharModalReserva();
            setTimeout(() => renderizarCatalogo(), 500);
            return;
        }
    } catch (error) {
        console.warn('Erro ao enviar reserva para o servidor:', error);
    }

    try {
        const reservas = JSON.parse(localStorage.getItem(STORAGE_KEY_RESERVAS) || '[]');
        reservas.push(reserva);
        localStorage.setItem(STORAGE_KEY_RESERVAS, JSON.stringify(reservas));
        mostrarNotificacao(`Sua reserva será analisada. Aguarde a confirmação do administrador.`, 'sucesso');
        fecharModalReserva();
        setTimeout(() => renderizarCatalogo(), 500);
    } catch (error) {
        mostrarMensagemReserva('Erro ao processar a reserva', 'erro');
    }
}

document.getElementById('formReserva')?.addEventListener('submit', enviarReserva);

document.getElementById('searchInput')?.addEventListener('input', buscarLivro);
document.getElementById('searchInput')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        buscarLivro();
    }
});

document.addEventListener('click', (event) => {
    const botao = event.target.closest('.btn-reserve');
    if (!botao) return;

    const usuario = carregarUsuarioLogado();
    if (!usuario) {
        window.location.href = '../login/login.html';
        return;
    }

    const tituloLivro = botao.getAttribute('data-titulo');
    const idlivro = botao.getAttribute('data-id') || '';
    abrirModalReserva(tituloLivro, idlivro);
});

// sync users from server when available
(async () => {
    if (window.location.protocol !== 'file:') {
        try {
            const res = await fetch(API_URL_USERS, { cache: 'no-store' });
            if (res.ok) {
                const users = await res.json();
                if (Array.isArray(users)) localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
            }
        } catch (err) {
            // ignore
        }
    }
    renderizarCatalogo();
})();