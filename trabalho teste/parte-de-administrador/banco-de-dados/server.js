const http = require('http');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'livros.json');
const projectRoot = path.resolve(__dirname, '..', '..');

function readBooks() {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function writeBooks(books) {
  fs.writeFileSync(dbPath, JSON.stringify(books, null, 2));
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (error, contents) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Arquivo não encontrado');
      return;
    }

    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(contents);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/livros') {
    if (req.method === 'GET') {
      const books = readBooks().sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''));
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(books));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const livro = JSON.parse(body);
          const books = readBooks();
          books.push({ ...livro, id: Date.now().toString() });
          writeBooks(books);
          res.writeHead(201, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          });
          res.end(JSON.stringify({ success: true, livro: books[books.length - 1] }));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: 'Dados inválidos' }));
        }
      });
      return;
    }

    if (req.method === 'PUT') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const livroAtualizado = JSON.parse(body);
          const books = readBooks();
          const index = books.findIndex(livro => livro.id === livroAtualizado.id);
          if (index === -1) {
            res.writeHead(404, {
              'Content-Type': 'application/json; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end(JSON.stringify({ success: false, error: 'Livro não encontrado' }));
            return;
          }
          books[index] = { ...books[index], ...livroAtualizado };
          writeBooks(books);
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          });
          res.end(JSON.stringify({ success: true, livro: books[index] }));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: 'Dados inválidos' }));
        }
      });
      return;
    }

    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: 'ID ausente' }));
        return;
      }

      const books = readBooks();
      const novaLista = books.filter(livro => livro.id !== id);
      if (novaLista.length === books.length) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: 'Livro não encontrado' }));
        return;
      }

      writeBooks(novaLista);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }
  }

  if (url.pathname === '/') {
    serveFile(res, path.join(projectRoot, 'pagina-inicial', 'inicial.html'));
    return;
  }

  const requestedPath = decodeURIComponent(url.pathname);
  const normalizedPath = path.normalize(requestedPath).replace(/^\.(?!\.)/, '');
  const filePath = path.join(projectRoot, normalizedPath);

  if (!filePath.startsWith(projectRoot)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Acesso negado');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    serveFile(res, path.join(filePath, 'index.html'));
    return;
  }

  serveFile(res, filePath);
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Banco de dados em ${dbPath}`);
});
