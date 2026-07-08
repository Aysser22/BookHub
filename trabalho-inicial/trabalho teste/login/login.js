const STORAGE_KEY_USERS = 'bookhub-users';
const STORAGE_KEY_SESSION = 'bookhub-session';
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;
const API_URL_USERS = `${API_BASE}/api/users`;
const form = document.querySelector('.auth-form');

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

document.addEventListener('DOMContentLoaded', async () => {
    atualizarBotaoLogin();
    if (window.location.protocol !== 'file:') {
        try {
            const res = await fetch(API_URL_USERS, { cache: 'no-store' });
            if (res.ok) {
                const users = await res.json();
                if (Array.isArray(users)) {
                    salvarUsuarios(users);
                }
            }
        } catch (err) {
            // fallback: use localStorage
        }
    }
});
window.addEventListener('pageshow', atualizarBotaoLogin);
window.addEventListener('storage', atualizarBotaoLogin);
const titulo = document.querySelector('.auth-card h1');
const subtitulo = document.querySelector('.auth-card p');
const button = form?.querySelector('button');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const anoInput = document.getElementById('anoEscolar');
const turmaInput = document.getElementById('turma');
const nomeSocialInput = document.getElementById('nomeSocial');
const camposCadastro = document.getElementById('camposCadastro');

function lerUsuarios() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
    } catch (error) {
        return [];
    }
}

function salvarUsuarios(usuarios) {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usuarios));
}

function criarConta(email, password, nomeSocial, anoEscolar, turma) {
    const usuarios = lerUsuarios();
    const jaExiste = usuarios.some((usuario) => usuario.email.toLowerCase() === email.toLowerCase());
    if (jaExiste) {
        throw new Error('Este e-mail já está cadastrado.');
    }

    const novoUsuario = {
        id: Date.now().toString(),
        email,
        password,
        nome: nomeSocial || email.split('@')[0],
        perfil: 'Aluno',
        ano: anoEscolar || '3º Ano',
        turma: turma || 'A',
        matricula: `#${Date.now().toString().slice(-6)}`,
        estatisticas: {
            lidos: 0,
            emprestados: 0,
            atrasos: 0
        },
        historico: []
    };

    usuarios.push(novoUsuario);
    salvarUsuarios(usuarios);
    return novoUsuario;
}

function fazerLogin(email, password) {
    const usuarios = lerUsuarios();
    const usuario = usuarios.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password);
    if (!usuario) {
        throw new Error('E-mail ou senha incorretos.');
    }
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(usuario));
    return usuario;
}

function alternarModoCadastro() {
    const modoCadastro = button?.dataset.modo === 'cadastro';
    if (!form) return;

    if (modoCadastro) {
        titulo.textContent = 'Entrar no BookHub';
        subtitulo.textContent = 'Use sua conta para acessar o acervo, seu perfil e a área administrativa.';
        button.textContent = 'Entrar';
        button.dataset.modo = 'login';
        camposCadastro?.classList.add('hidden');
        nomeSocialInput.required = false;
        anoInput.required = false;
        turmaInput.required = false;
    } else {
        titulo.textContent = 'Criar conta no BookHub';
        subtitulo.textContent = 'Cadastre-se para salvar suas estatísticas e histórico de leitura.';
        button.textContent = 'Criar conta';
        button.dataset.modo = 'cadastro';
        camposCadastro?.classList.remove('hidden');
        nomeSocialInput.required = true;
        anoInput.required = true;
        turmaInput.required = true;
    }
}

form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const nomeSocial = nomeSocialInput?.value.trim();
    const anoEscolar = anoInput?.value.trim();
    const turma = turmaInput?.value.trim();
    const modoCadastro = button?.dataset.modo === 'cadastro';

    try {
        let usuario = null;

        if (modoCadastro && window.location.protocol !== 'file:') {
            // try create via API
            try {
                const novo = {
                    email,
                    password,
                    nome: nomeSocial || email.split('@')[0],
                    perfil: 'Aluno',
                    ano: anoEscolar || '3º Ano',
                    turma: turma || 'A',
                    matricula: `#${Date.now().toString().slice(-6)}`,
                    estatisticas: { lidos: 0, emprestados: 0, atrasos: 0 },
                    historico: []
                };

                const res = await fetch(API_URL_USERS, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novo)
                });

                if (res.ok) {
                    const body = await res.json();
                    usuario = body.user;
                    const usuariosLocais = lerUsuarios();
                    usuariosLocais.push(usuario);
                    salvarUsuarios(usuariosLocais);
                } else {
                    // fallback to local creation
                    usuario = criarConta(email, password, nomeSocial, anoEscolar, turma);
                }
            } catch (err) {
                usuario = criarConta(email, password, nomeSocial, anoEscolar, turma);
            }
        } else if (modoCadastro) {
            usuario = criarConta(email, password, nomeSocial, anoEscolar, turma);
        } else {
            usuario = fazerLogin(email, password);
        }

        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(usuario));
        window.location.href = '../perfil/perfil.html';
    } catch (error) {
        alert(error.message);
    }
});

const linkAlternar = document.createElement('p');
linkAlternar.className = 'toggle-auth';
linkAlternar.innerHTML = '<a href="#">Ainda não tenho conta</a>';
form?.appendChild(linkAlternar);

linkAlternar.querySelector('a')?.addEventListener('click', (event) => {
    event.preventDefault();
    alternarModoCadastro();
});

button.dataset.modo = 'login';
camposCadastro?.classList.add('hidden');
nomeSocialInput.required = false;
anoInput.required = false;
turmaInput.required = false;
atualizarBotaoLogin();
