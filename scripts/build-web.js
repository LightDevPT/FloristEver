const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const FILES = ['index.html', 'style.css', 'manifest.json', 'sw.js'];
const ADDITIONAL_FILES = [
  {
    source: 'docs/FloristEver_Termos_e_Condicoes.md',
    destination: 'FloristEver_Termos_e_Condicoes.md'
  }
];
const DIRECTORIES = ['js', 'imagens', 'musicas'];
const LOGIN_API_ORIGIN = new URL(process.env.LOGIN_API_ORIGIN || 'https://floristever.netlify.app').origin;
const LOGIN_API_BASE = `${LOGIN_API_ORIGIN}/api/v1`;

const csp = [
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
].join('; ');

function copyFile(relativePath, destinationPath = relativePath) {
  const from = path.join(ROOT, relativePath);
  const to = path.join(DIST, destinationPath);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function configureLoginApi() {
  const indexPath = path.join(DIST, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  const apiMetaPattern = /<meta name="light-login-api-base" content="[^"]*">/;
  if (!apiMetaPattern.test(html)) {
    throw new Error('Missing light-login-api-base meta tag in index.html.');
  }
  const configuredApiHtml = html.replace(
    apiMetaPattern,
    `<meta name="light-login-api-base" content="${LOGIN_API_BASE}">`
  );
  const cspPattern = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"\s*>/;
  const configuredHtml = configuredApiHtml.replace(cspPattern, (_match, content) => {
    if (!/connect-src\s+[^;]+/.test(content)) {
      throw new Error('Content-Security-Policy meta tag is missing connect-src.');
    }
    const configuredCsp = content.replace(/connect-src\s+[^;]+/, `connect-src 'self' ${LOGIN_API_ORIGIN}`);
    return `<meta http-equiv="Content-Security-Policy" content="${configuredCsp}">`;
  });
  if (configuredHtml === configuredApiHtml) {
    throw new Error('Content-Security-Policy meta tag is missing from index.html.');
  }
  fs.writeFileSync(indexPath, configuredHtml, 'utf8');
}

function copyDirectory(relativePath) {
  const from = path.join(ROOT, relativePath);
  const to = path.join(DIST, relativePath);
  if (!fs.existsSync(from)) return;
  fs.cpSync(from, to, { recursive: true });
}

function listOfflineAssets(directory = DIST) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listOfflineAssets(absolutePath);
    const relativePath = path.relative(DIST, absolutePath).split(path.sep).join('/');
    if (['sw.js', '_headers', '.htaccess'].includes(relativePath)) return [];
    return [`./${relativePath}`];
  }).sort();
}

function configureOfflinePrecache() {
  const serviceWorkerPath = path.join(DIST, 'sw.js');
  const serviceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
  const assetsPattern = /const ASSETS_TO_CACHE = \[[\s\S]*?\];/;
  if (!assetsPattern.test(serviceWorker)) {
    throw new Error('Service worker is missing the ASSETS_TO_CACHE list.');
  }
  const assets = ['./', ...listOfflineAssets()];
  fs.writeFileSync(
    serviceWorkerPath,
    serviceWorker.replace(assetsPattern, `const ASSETS_TO_CACHE = ${JSON.stringify(assets, null, 2)};`),
    'utf8'
  );
}

function writeSecurityHeaderFiles() {
  const headers = [
    '/*',
    `  Content-Security-Policy: ${csp}`,
    '  Cross-Origin-Opener-Policy: same-origin',
    '  Cross-Origin-Resource-Policy: same-origin',
    '  Origin-Agent-Cluster: ?1',
    '  Referrer-Policy: no-referrer',
    '  X-Content-Type-Options: nosniff',
    '  X-Frame-Options: DENY',
    '  X-Permitted-Cross-Domain-Policies: none',
    '  Permissions-Policy: accelerometer=(), ambient-light-sensor=(), autoplay=(self), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), usb=()'
  ].join('\n');

  const htaccess = [
    '<IfModule mod_headers.c>',
    `  Header always set Content-Security-Policy "${csp}"`,
    '  Header always set Cross-Origin-Opener-Policy "same-origin"',
    '  Header always set Cross-Origin-Resource-Policy "same-origin"',
    '  Header always set Origin-Agent-Cluster "?1"',
    '  Header always set Referrer-Policy "no-referrer"',
    '  Header always set X-Content-Type-Options "nosniff"',
    '  Header always set X-Frame-Options "DENY"',
    '  Header always set X-Permitted-Cross-Domain-Policies "none"',
    '  Header always set Permissions-Policy "accelerometer=(), ambient-light-sensor=(), autoplay=(self), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), usb=()"',
    '</IfModule>'
  ].join('\n');

  fs.writeFileSync(path.join(DIST, '_headers'), `${headers}\n`, 'utf8');
  fs.writeFileSync(path.join(DIST, '.htaccess'), `${htaccess}\n`, 'utf8');
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
FILES.forEach((file) => copyFile(file));
ADDITIONAL_FILES.forEach(({ source, destination }) => copyFile(source, destination));
configureLoginApi();
DIRECTORIES.forEach(copyDirectory);
configureOfflinePrecache();
writeSecurityHeaderFiles();

console.log(`Web build ready: ${DIST}`);
