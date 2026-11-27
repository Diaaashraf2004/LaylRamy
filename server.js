const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '127.0.0.1';
const PORT = 8080;
const ROOT_DIR = path.resolve(__dirname);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const BLOCKED_FILES = new Set(['server.js', 'firestore.rules', 'run-local-server.bat']);

function sendPlainError(res, statusCode, message) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer'
  });
  res.end(message);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendPlainError(res, 405, 'Method Not Allowed');
  }

  let pathname;
  try {
    const parsedUrl = new URL(req.url || '/', `http://${HOST}:${PORT}`);
    pathname = decodeURIComponent(parsedUrl.pathname);
  } catch {
    return sendPlainError(res, 400, 'Bad Request');
  }

  if (pathname.includes('\0') || pathname.includes('\\')) {
    return sendPlainError(res, 400, 'Bad Request');
  }

  const relativePath = pathname === '/' ? 'finance.html' : pathname.replace(/^\/+/, '');
  const segments = relativePath.split('/').filter(Boolean);
  if (segments.some(seg => seg.startsWith('.') || seg === '..' || seg.toLowerCase() === 'node_modules')) {
    return sendPlainError(res, 403, 'Forbidden');
  }

  const resolvedPath = path.resolve(ROOT_DIR, relativePath);
  if (resolvedPath !== ROOT_DIR && !resolvedPath.startsWith(ROOT_DIR + path.sep)) {
    return sendPlainError(res, 403, 'Forbidden');
  }

  const normalizedRel = path.relative(ROOT_DIR, resolvedPath);
  const resolvedSegments = normalizedRel.split(path.sep).filter(Boolean);
  if (
    resolvedSegments.length === 0 ||
    resolvedSegments.some(seg => seg.startsWith('.') || seg === '..' || seg.toLowerCase() === 'node_modules') ||
    (resolvedSegments.length === 1 && BLOCKED_FILES.has(resolvedSegments[0].toLowerCase()))
  ) {
    return sendPlainError(res, 403, 'Forbidden');
  }

  const extname = String(path.extname(resolvedPath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.stat(resolvedPath, (statErr, stats) => {
    if (statErr || !stats || !stats.isFile()) {
      return sendPlainError(res, 404, 'Not Found');
    }

    fs.readFile(resolvedPath, (error, content) => {
      if (error) {
        return sendPlainError(res, 500, 'Internal Server Error');
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer'
      });
      if (req.method === 'HEAD') {
        res.end();
      } else {
        res.end(content);
      }
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running securely at http://${HOST}:${PORT}/`);
  console.log('Press Ctrl+C to stop.');
});
