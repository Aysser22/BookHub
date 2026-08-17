const STORAGE_KEY_USERS = 'bookhub-users';
const STORAGE_KEY_SESSION = 'bookhub-session';
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;
const API_URL_USERS = `${API_BASE}/api/users`;
const btnPhantom = document.getElementById('btnConnectPhantom');
const btnMetaMask = document.getElementById('btnConnectMetaMask');
const walletMessage = document.getElementById('walletMessage');

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

function mostrarMensagem(texto, tipo = 'info') {
    if (!walletMessage) return;
    walletMessage.textContent = texto;
    walletMessage.className = `wallet-message ${tipo}`;
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

function normalizarTag(tag) {
    return String(tag || '').trim().toLowerCase();
}

function usuarioTemTagAdmin(usuario) {
    if (!usuario || typeof usuario !== 'object') return false;

    const tags = Array.isArray(usuario.tags) ? usuario.tags : [];
    const valores = [
        usuario.isAdmin,
        usuario.role,
        usuario.perfil,
        usuario.tipo,
        usuario.nivel
    ].map((valor) => normalizarTag(valor));

    const tagsNormalizadas = tags.map((tag) => normalizarTag(tag));
    const valoresAdmin = ['admin', 'administrador', 'adm'];

    return (
        usuario.isAdmin === true ||
        valores.some((valor) => valoresAdmin.includes(valor)) ||
        tagsNormalizadas.some((tag) => valoresAdmin.includes(tag))
    );
}

function preservarPermissaoAdmin(usuario) {
    if (!usuario || typeof usuario !== 'object') return usuario;

    const ehAdmin = usuarioTemTagAdmin(usuario);
    const tags = Array.isArray(usuario.tags) ? usuario.tags : [];
    const tagsNormalizadas = [...new Set(tags.map((tag) => normalizarTag(tag)).filter(Boolean))];

    const tagsFinal = ehAdmin
        ? [...new Set([...tagsNormalizadas, 'admin'])]
        : tagsNormalizadas.filter((tag) => tag !== 'admin' && tag !== 'administrador' && tag !== 'adm');

    return {
        ...usuario,
        isAdmin: ehAdmin,
        tags: tagsFinal,
        perfil: ehAdmin ? 'Administrador' : usuario.perfil || 'Aluno'
    };
}

function salvarSessaoUsuario(usuario) {
    const usuarioPersistido = preservarPermissaoAdmin(usuario);
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(usuarioPersistido));
}

function isEthereumAddress(address) {
    return typeof address === 'string' && /^0x[0-9a-fA-F]{40}$/.test(address);
}

function isLikelySolanaAddress(address) {
    return typeof address === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

function enderecoEhAdmin(endereco) {
    if (typeof endereco !== 'string') return false;
    const valor = endereco.toLowerCase();
    return /^0x1ff8.*608f61$/i.test(valor) || /^0x[0-9a-f]{40}$/.test(valor) && valor.endsWith('608f61');
}

function criarContaWallet(walletType, address) {
    const usuarios = lerUsuarios();
    const existente = usuarios.find((usuario) => usuario.walletAddress === address || usuario.id === address);
    if (existente) {
        return preservarPermissaoAdmin(existente);
    }

    const nomeCurto = `${address.slice(0, 4)}...${address.slice(-4)}`;
    const novoUsuario = {
        id: address,
        walletAddress: address,
        authMethod: walletType,
        email: `${address}@wallet`,
        password: null,
        nome: walletType === 'phantom' ? `Phantom ${nomeCurto}` : `MetaMask ${nomeCurto}`,
        perfil: 'Aluno',
        isAdmin: false,
        tags: [],
        ano: '3º Ano',
        turma: 'A',
        matricula: `#${address.slice(-6)}`,
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

async function connectMetaMask() {
    if (!window.ethereum) {
        throw new Error('MetaMask não encontrado. Instale a extensão e tente novamente.');
    }
    if (!window.ethereum.isMetaMask) {
        throw new Error('MetaMask não está disponível no navegador atual.');
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!Array.isArray(accounts) || accounts.length === 0) {
        throw new Error('Nenhuma conta retornada pelo MetaMask. Verifique a conexão.');
    }
    const address = accounts[0];
    if (!isEthereumAddress(address)) {
        throw new Error('Endereço Ethereum inválido retornado pelo MetaMask.');
    }
    return address.toLowerCase();
}

async function connectPhantom() {
    if (!window.solana) {
        throw new Error('Phantom não encontrado. Instale a carteira Phantom e tente novamente.');
    }
    if (!window.solana.isPhantom) {
        throw new Error('A carteira Phantom não está disponível neste navegador.');
    }
    const response = await window.solana.connect();
    const address = response?.publicKey?.toString?.();
    if (!address || !isLikelySolanaAddress(address)) {
        throw new Error('Endereço Solana inválido retornado pelo Phantom.');
    }
    return address;
}

async function autenticarComWallet(tipo) {
    try {
        mostrarMensagem('Conectando carteira, aguarde...', 'info');
        let address = null;

        if (tipo === 'phantom') {
            address = await connectPhantom();
        } else if (tipo === 'metamask') {
            address = await connectMetaMask();
        } else {
            throw new Error('Tipo de carteira inválido.');
        }

        if (!address) {
            throw new Error('Falha ao obter o endereço da carteira.');
        }

        const usuario = criarContaWallet(tipo, address);
        salvarSessaoUsuario(usuario);
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next');
        if (next) {
            try {
                window.location.href = decodeURIComponent(next);
            } catch (e) {
                window.location.href = '../perfil/perfil.html';
            }
        } else {
            window.location.href = '../perfil/perfil.html';
        }
    } catch (error) {
        mostrarMensagem(error.message || 'Erro ao conectar a carteira.', 'error');
    }
}

btnMetaMask?.addEventListener('click', () => autenticarComWallet('metamask'));
btnPhantom?.addEventListener('click', () => autenticarComWallet('phantom'));
