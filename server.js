const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DIST = path.join(__dirname, 'dist');

const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript',
  '.mjs':   'application/javascript',
  '.css':   'text/css',
  '.json':  'application/json',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.gif':   'image/gif',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.txt':   'text/plain',
};

http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.resolve(DIST, '.' + urlPath);

  // Prevent path traversal outside dist
  if (!filePath.startsWith(DIST + path.sep) && filePath !== DIST) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Directory → index.html inside it
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch (_) {
    // file doesn't exist — fall through to SPA fallback
  }

  // SPA fallback: serve dist/index.html for any missing file
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    res.writeHead(500);
    res.end('Internal Server Error');
  });
  stream.pipe(res);
}).listen(PORT, () => {
  console.log(`Serving ${DIST} on port ${PORT}`);
});
