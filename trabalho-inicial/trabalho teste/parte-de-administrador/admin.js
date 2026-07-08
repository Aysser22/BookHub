const btnGerenciarLivros = document.getElementById('btnGerenciarLivros');
const livrosPanel = document.getElementById('livrosPanel');
const acessoAdmin = document.getElementById('acessoAdmin');
const conteudoAdmin = document.getElementById('conteudoAdmin');
const formAcessoAdmin = document.getElementById('formAcessoAdmin');
const senhaAdminInput = document.getElementById('senhaAdmin');
const mostrarSenhaAdmin = document.getElementById('mostrarSenhaAdmin');
const mensagemAcessoAdmin = document.getElementById('mensagemAcessoAdmin');
const formLivro = document.getElementById('formLivro');
const tituloInput = document.getElementById('titulo');
const autorInput = document.getElementById('autor');
const capaInput = document.getElementById('capa');
const sinopseInput = document.getElementById('sinopse');
const livroIdInput = document.getElementById('livroId');
const previewCover = document.getElementById('previewCover');
const previewTitulo = document.getElementById('previewTitulo');
const previewAutor = document.getElementById('previewAutor');
const previewSinopse = document.getElementById('previewSinopse');
const mensagemStatus = document.getElementById('mensagemStatus');
const listaLivrosAdmin = document.getElementById('listaLivrosAdmin');
const btnSalvarLivro = document.getElementById('btnSalvarLivro');

const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;
const API_URL = `${API_BASE}/api/livros`;
const STORAGE_KEY = 'bookhub-livros';
const STORAGE_KEY_SESSION = 'bookhub-session';
const STORAGE_KEY_ADMIN = 'bookhub-admin-autorizado';
const STORAGE_KEY_ADMIN_SESSION = 'bookhub-admin-session';
const STORAGE_KEY_ADMIN_USER = 'bookhub-admin-user';

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

document.addEventListener('DOMContentLoaded', () => {
    atualizarBotaoLogin();
    verificarAcessoAdmin();
});
window.addEventListener('pageshow', () => {
    atualizarBotaoLogin();
    verificarAcessoAdmin();
});
window.addEventListener('storage', () => {
    atualizarBotaoLogin();
    verificarAcessoAdmin();
});

const SENHA_ADMIN = 'bonde das malucas';

function abrirPainelAdmin() {
    acessoAdmin?.classList.add('hidden');
    conteudoAdmin?.classList.remove('hidden');
    sessionStorage.setItem(STORAGE_KEY_ADMIN_SESSION, 'true');
    sessionStorage.setItem(STORAGE_KEY_ADMIN_USER, localStorage.getItem(STORAGE_KEY_SESSION) || '');
}

function fecharPainelAdmin() {
    acessoAdmin?.classList.remove('hidden');
    conteudoAdmin?.classList.add('hidden');
    sessionStorage.removeItem(STORAGE_KEY_ADMIN_SESSION);
    sessionStorage.removeItem(STORAGE_KEY_ADMIN_USER);
}

function verificarAcessoAdmin() {
    const usuarioLogado = localStorage.getItem(STORAGE_KEY_SESSION) || '';
    const usuarioAutorizado = sessionStorage.getItem(STORAGE_KEY_ADMIN_USER) || '';
    const autorizado = sessionStorage.getItem(STORAGE_KEY_ADMIN_SESSION) === 'true' && usuarioLogado === usuarioAutorizado;

    if (autorizado) {
        abrirPainelAdmin();
    } else {
        fecharPainelAdmin();
    }
}

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

function normalizarLivros(livros) {
    return (Array.isArray(livros) ? livros : []).map((livro, index) => ({
        ...livro,
        id: livro.id || `livro-${Date.now()}-${index + 1}`
    }));
}

function lerLivrosLocais() {
    try {
        const livros = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return normalizarLivros(livros);
    } catch (error) {
        console.error(error);
        return [];
    }
}

function salvarLivrosLocais(livros) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizarLivros(livros)));
}

async function carregarLivros() {
    try {
        const response = await fetch(API_URL, { cache: 'no-store' });
        if (response.ok) {
            const dados = await response.json();
            if (Array.isArray(dados)) {
                salvarLivrosLocais(dados);
                return dados.sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''));
            }
        }
    } catch (error) {
        console.warn('API indisponível, usando armazenamento local.', error);
    }

    return lerLivrosLocais().sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''));
}

async function salvarLivroNoBanco(livro) {
    const livros = lerLivrosLocais();
    const livroSalvo = livro.id
        ? (() => {
            const index = livros.findIndex(item => item.id === livro.id);
            if (index >= 0) {
                livros[index] = { ...livros[index], ...livro };
                return livros[index];
            }
            return { ...livro, id: Date.now().toString() };
        })()
        : { ...livro, id: Date.now().toString() };

    if (livro.id) {
        const index = livros.findIndex(item => item.id === livro.id);
        if (index >= 0) {
            livros[index] = livroSalvo;
        } else {
            livros.push(livroSalvo);
        }
    } else {
        livros.push(livroSalvo);
    }

    salvarLivrosLocais(livros);

    try {
        const response = await fetch(API_URL, {
            method: livro.id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(livroSalvo)
        });

        if (!response.ok) {
            console.warn('Falha ao sincronizar com a API local, mas o livro foi salvo no navegador.');
        }
    } catch (error) {
        console.warn('API indisponível, mas o livro foi salvo no navegador.', error);
    }

    return { success: true, livro: livroSalvo };
}

async function removerLivroDoBanco(id, index, titulo, autor) {
    const livros = lerLivrosLocais();
    let removido = false;

    if (Number.isInteger(index) && index >= 0 && livros[index]) {
        livros.splice(index, 1);
        removido = true;
    } else {
        const alvo = livros.find(item => item.id === id) || livros.find(item => item.titulo === titulo && item.autor === autor);
        if (alvo) {
            const alvoIndex = livros.indexOf(alvo);
            if (alvoIndex >= 0) {
                livros.splice(alvoIndex, 1);
                removido = true;
            }
        }
    }

    if (!removido) {
        throw new Error('Livro não encontrado para remoção');
    }

    salvarLivrosLocais(livros);

    try {
        const response = await fetch(`${API_URL}?id=${id}`, { method: 'DELETE' });
        if (!response.ok) {
            console.warn('Falha ao remover via API local, mas o livro foi removido do navegador.');
        }
    } catch (error) {
        console.warn('API indisponível, mas o livro foi removido do navegador.', error);
    }

    return { success: true };
}

function atualizarPreview() {
    previewTitulo.textContent = tituloInput.value || 'Título do livro';
    previewAutor.textContent = autorInput.value || 'Autor';
    previewSinopse.textContent = sinopseInput.value || 'A sinopse aparecerá aqui.';

    if (capaInput.value) {
        previewCover.innerHTML = `<img src="${capaInput.value}" alt="Capa do livro">`;
    } else {
        previewCover.innerHTML = '<i class="fa-solid fa-book-bookmark"></i>';
    }
}

function resetarFormulario() {
    formLivro.reset();
    livroIdInput.value = '';
    btnSalvarLivro.textContent = 'Salvar livro';
    atualizarPreview();
}

async function renderizarListaAdmin() {
    if (!listaLivrosAdmin) return;

    const livros = await carregarLivros();
    listaLivrosAdmin.innerHTML = '';

    if (livros.length === 0) {
        listaLivrosAdmin.innerHTML = '<p>Nenhum livro cadastrado.</p>';
        return;
    }

    livros.forEach((livro, index) => {
        const item = document.createElement('div');
        item.className = 'item-livro';
        item.innerHTML = `
            <div>
                <strong>${livro.titulo}</strong>
                <span>${livro.autor}</span>
            </div>
            <div class="acoes">
                <button type="button" class="btn-editar" data-id="${livro.id}" data-index="${index}">Editar</button>
                <button type="button" class="btn-remover" data-id="${livro.id}" data-index="${index}" data-titulo="${livro.titulo}" data-autor="${livro.autor}">Remover</button>
            </div>
        `;
        listaLivrosAdmin.appendChild(item);
    });
}

async function renderizarCatalogo() {
    const catalogo = document.getElementById('booksGrid');
    if (!catalogo) return;

    const livros = await carregarLivros();
    catalogo.innerHTML = '';

    if (livros.length === 0) {
        catalogo.innerHTML = '<div class="empty-state">Nenhum livro cadastrado ainda. Use o painel admin para adicionar o primeiro.</div>';
        return;
    }

    livros.forEach((livro) => {
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
                <button class="btn-reserve">Reservar</button>
            </div>
        `;
        catalogo.appendChild(card);
    });
}

atualizarBotaoLogin();

if (mostrarSenhaAdmin && senhaAdminInput) {
    mostrarSenhaAdmin.addEventListener('change', () => {
        senhaAdminInput.type = mostrarSenhaAdmin.checked ? 'text' : 'password';
    });
}

if (formAcessoAdmin) {
    formAcessoAdmin.addEventListener('submit', (event) => {
        event.preventDefault();

        if (senhaAdminInput.value === SENHA_ADMIN) {
            abrirPainelAdmin();
            mensagemAcessoAdmin.textContent = '';
        } else {
            mensagemAcessoAdmin.textContent = 'Senha incorreta.';
        }

        formAcessoAdmin.reset();
    });
}

verificarAcessoAdmin();
window.addEventListener('pageshow', verificarAcessoAdmin);

if (btnGerenciarLivros) {
    btnGerenciarLivros.addEventListener('click', () => {
        livrosPanel.classList.toggle('hidden');
    });
}

[tituloInput, autorInput, capaInput, sinopseInput].forEach((input) => {
    input?.addEventListener('input', atualizarPreview);
});

if (formLivro) {
    formLivro.addEventListener('submit', async (event) => {
        event.preventDefault();

        const livro = {
            id: livroIdInput.value || undefined,
            titulo: tituloInput.value.trim(),
            autor: autorInput.value.trim(),
            capa: capaInput.value.trim(),
            sinopse: sinopseInput.value.trim()
        };

        try {
            await salvarLivroNoBanco(livro);
            resetarFormulario();
            await renderizarCatalogo();
            await renderizarListaAdmin();
            mostrarMensagem(livro.id ? 'Livro atualizado com sucesso!' : 'Livro adicionado com sucesso!');
        } catch (error) {
            console.error(error);
            mostrarMensagem('Não foi possível salvar o livro.', 'erro');
        }
    });
}

if (listaLivrosAdmin) {
    listaLivrosAdmin.addEventListener('click', async (event) => {
        const botao = event.target.closest('button');
        if (!botao) return;

        const id = botao.getAttribute('data-id');
        const index = Number(botao.getAttribute('data-index'));
        const titulo = botao.getAttribute('data-titulo') || '';
        const autor = botao.getAttribute('data-autor') || '';

        if (botao.classList.contains('btn-remover')) {
            try {
                await removerLivroDoBanco(id, index, titulo, autor);
                await renderizarCatalogo();
                await renderizarListaAdmin();
                mostrarMensagem('Livro removido com sucesso!');
            } catch (error) {
                console.error(error);
                mostrarMensagem('Não foi possível remover o livro.', 'erro');
            }
            return;
        }

        if (botao.classList.contains('btn-editar')) {
            const livros = await carregarLivros();
            const livro = livros.find(item => item.id === id);
            if (livro) {
                tituloInput.value = livro.titulo;
                autorInput.value = livro.autor;
                capaInput.value = livro.capa || '';
                sinopseInput.value = livro.sinopse;
                livroIdInput.value = livro.id;
                btnSalvarLivro.textContent = 'Atualizar livro';
                atualizarPreview();
                mostrarMensagem(`Editando: ${livro.titulo}`);
            }
        }
    });
}

resetarFormulario();
renderizarCatalogo();
renderizarListaAdmin();
