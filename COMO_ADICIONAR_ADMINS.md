# Como Adicionar Novos Admins - BookHub

## 📋 Resumo
Agora você pode gerenciar admins diretamente do Painel Administrativo usando o número da carteira dos usuários.

## 🔐 Como Funciona o Sistema de Admins

### 1. **Verificação de Privilégios**
Quando um usuário acessa o painel admin (`admin.html`), o sistema verifica se ele é um administrador através de várias formas:
- Campo `isAdmin: true` no objeto do usuário
- Campo `role: 'admin'` ou `role: 'administrador'`
- Campo `perfil`, `tipo`, ou `nivel` com valor 'admin'
- Array `tags` contendo 'admin' ou 'administrador'

### 2. **Promover Usuário a Admin**

#### Passo a Passo:
1. **Acesse o Painel Admin** → Vá até `admin.html`
2. **Clique em "Gerenciar Admins"** - Abre o painel de gerenciamento
3. **Insira o Número da Carteira** - Digite o número da carteira do usuário que deseja promover
4. **Clique em "Promover a Admin"**
5. ✅ O usuário agora é um admin!

#### Exemplo:
```
Número da Carteira: 12345
↓
Clica em "Promover a Admin"
↓
Usuário com carteira 12345 é promovido a admin
```

### 3. **Dados Armazenados**
Os admins são armazenados no arquivo:
- **Local**: `trabalho-inicial/trabalho teste/parte-de-administrador/banco-de-dados/users.json`

Quando um usuário é promovido, seus dados são alterados para:
```json
{
  "nome": "João Silva",
  "numero_carteira": "12345",
  "email": "joao@email.com",
  "isAdmin": true,
  "role": "admin"
}
```

### 4. **Armazenamento Também no LocalStorage**
Além do arquivo `users.json`, os admins também são armazenados no **localStorage** do navegador:
- **Chave**: `bookhub-users`
- Isso garante que o sistema funcione mesmo se o servidor não estiver rodando

### 5. **Remover Privilégios de Admin**
Para remover os privilégios de admin:
1. Vá até a seção "Admins cadastrados"
2. Clique no botão "Remover Admin" ao lado do usuário
3. Confirme a ação
4. ✅ Privilégios removidos!

---

## 💾 Estrutura de Dados do Usuário

```javascript
{
  "id": "user-123",
  "nome": "João Silva",
  "numero_carteira": "12345",
  "email": "joao@email.com",
  "senha": "hashed_password", // Armazenada de forma segura
  "isAdmin": true,             // ← Indica se é admin
  "role": "admin",             // ← Tipo de usuário
  "criadoEm": "2024-01-15T10:30:00Z"
}
```

---

## 🔍 Como o Sistema Busca Usuários

A função `buscarUsuarioPorCarteira()` procura o usuário da seguinte forma:

```javascript
// Busca no array de usuários
const usuario = usuarios.find(user => 
    String(user.numero_carteira || '').trim() === String(carteira).trim()
);
```

Ele converte para string e remove espaços para garantir que funcionará mesmo se houver variações.

---

## 📱 Interface do Painel de Admins

### Campo de Entrada:
- **Label**: "Número da Carteira do Usuário"
- **Placeholder**: "Ex: 12345"
- **Tipo**: Texto

### Lista de Admins:
Mostra todos os admins cadastrados com:
- Nome do usuário
- Número da carteira
- Email
- Botão para remover privilégios

---

## 🔄 Fluxo de Dados

```
Painel Admin
    ↓
Digita número de carteira
    ↓
Clica "Promover a Admin"
    ↓
Sistema busca usuário no localStorage
    ↓
Se encontrado:
  - Define isAdmin = true
  - Define role = 'admin'
  - Salva no localStorage (bookhub-users)
  - Tenta sincronizar com servidor (users.json)
    ↓
Mostra mensagem de sucesso
    ↓
Atualiza lista de admins
```

---

## ⚙️ Funções JavaScript Importantes

### `buscarUsuarioPorCarteira(carteira)`
Busca um usuário pelo número de carteira
```javascript
const usuario = buscarUsuarioPorCarteira('12345');
// Retorna o objeto do usuário ou undefined
```

### `promoverAAdmin(usuario)`
Promove um usuário a admin
```javascript
promoverAAdmin(usuario);
// Define isAdmin = true e role = 'admin'
```

### `removerAdminPrivilegio(carteira)`
Remove privilégios de admin
```javascript
removerAdminPrivilegio('12345');
// Define isAdmin = false e role = 'usuario'
```

### `renderizarListaAdmins()`
Atualiza a lista de admins na tela
```javascript
await renderizarListaAdmins();
// Mostra todos os admins cadastrados
```

---

## 🚀 Exemplos de Uso

### Exemplo 1: Promover um aluno
1. Aluno se registra com carteira: **2024001**
2. Admin acessa painel
3. Clica em "Gerenciar Admins"
4. Digita: **2024001**
5. Clica "Promover a Admin"
6. ✅ Aluno agora é admin

### Exemplo 2: Remover privilégios
1. Admin vê a lista de admins
2. Encontra o usuário que quer remover
3. Clica "Remover Admin"
4. Confirma
5. ✅ Usuário não é mais admin

---

## ⚠️ Importante

- **Armazenamento Duplo**: Os dados são salvos tanto no `users.json` quanto no `localStorage`
- **Compatibilidade**: Funciona offline (usa localStorage)
- **Segurança**: Em produção, adicione validação no servidor
- **Validação**: O sistema verifica se o usuário já é admin antes de promover

---

## 🔗 Arquivos Modificados

- `admin.html` - Adicionado formulário de admins
- `admin.css` - Adicionado estilos para painel de admins
- `admin.js` - Adicionadas funções de gerenciamento de admins
- `users.json` - Onde os dados são persistidos

---

## 📞 Dúvidas Comuns

**P: E se o número de carteira não existir?**
R: O sistema mostrará uma mensagem de erro: "Usuário com essa carteira não encontrado."

**P: Posso promover um usuário que já é admin?**
R: Não, o sistema verifica e mostra: "Este usuário já é um admin."

**P: Os dados são salvos automaticamente?**
R: Sim, tanto no localStorage quanto no `users.json` (se o servidor estiver rodando).

**P: Como o sistema sabe que é um admin quando acessa?**
R: Verifica o objeto do usuário salvo no localStorage (`bookhub-session`) ao carregar a página.
