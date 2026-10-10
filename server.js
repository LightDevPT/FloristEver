const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;
const ROOT_DIR = path.resolve(process.env.WEB_ROOT || __dirname);
const LOGIN_API_ORIGIN = process.env.LOGIN_API_ORIGIN || 'http://localhost:4000';
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${LOGIN_API_ORIGIN}`,
    "media-src 'self' data: blob:",
    "manifest-src 'self'",
    "worker-src 'self'"
  ].join('; '),
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Origin-Agent-Cluster': '?1',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Permissions-Policy': [
    'accelerometer=()',
    'ambient-light-sensor=()',
    'autoplay=(self)',
    'camera=()',
    'display-capture=()',
    'encrypted-media=()',
    'fullscreen=(self)',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'midi=()',
    'payment=()',
    'picture-in-picture=()',
    'usb=()'
  ].join(', ')
};

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, { ...SECURITY_HEADERS, ...headers });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    send(res, 405, '405 Method Not Allowed', { Allow: 'GET, HEAD' });
    return;
  }

  let reqPath = '/index.html';
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    reqPath = decodeURIComponent(url.pathname);
  } catch {
    send(res, 400, '400 Bad Request');
    return;
  }

  if (reqPath === '/') reqPath = '/index.html';
  if (reqPath.includes('\0') || reqPath.split('/').some((part) => part.startsWith('.'))) {
    send(res, 404, '404 Not Found');
    return;
  }

  const filePath = path.resolve(ROOT_DIR, `.${reqPath}`);
  if (filePath !== ROOT_DIR && !filePath.startsWith(`${ROOT_DIR}${path.sep}`)) {
    send(res, 403, '403 Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, '404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-store' : 'no-cache'
    };
    res.writeHead(200, { ...SECURITY_HEADERS, ...headers });
    if (req.method === 'HEAD') res.end();
    else res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`FloristEver server running at http://localhost:${PORT}`);
  console.log(`Serving: ${ROOT_DIR}`);
});
