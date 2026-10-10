const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const variant = (process.argv[2] || 'debug').toLowerCase();
const releaseDir = path.join(ROOT, 'release', 'android');

const candidates = {
  debug: [
    path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
  ],
  release: [
    path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'),
    path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk')
  ]
};

if (!candidates[variant]) {
  console.error(`Unknown Android variant: ${variant}. Use "debug" or "release".`);
  process.exit(1);
}

const sourceApk = candidates[variant].find((candidate) => fs.existsSync(candidate));
if (!sourceApk) {
  console.error([
    `No ${variant} APK was found.`,
    '',
    'Build it first with:',
    variant === 'debug'
      ? '  npm.cmd run android:apk:debug'
      : '  npm.cmd run android:apk:release',
    '',
    'If Gradle reports a Java error, install/configure JDK 17+ and run the command again.'
  ].join('\n'));
  process.exit(1);
}

fs.mkdirSync(releaseDir, { recursive: true });

const apkName = `FloristEver-Android-${variant}.apk`;
const targetApk = path.join(releaseDir, apkName);
fs.copyFileSync(sourceApk, targetApk);
const downloadApkName = 'FloristEver-Android.apk';
const downloadApk = path.join(releaseDir, downloadApkName);
fs.copyFileSync(targetApk, downloadApk);

const apkBytes = fs.readFileSync(targetApk);
const sha256 = crypto.createHash('sha256').update(apkBytes).digest('hex');
const apkSizeMb = (apkBytes.length / 1024 / 1024).toFixed(1);
const builtAt = new Date().toISOString();

const iconSource = path.join(ROOT, 'imagens', 'icons', 'icon-192.png');
if (fs.existsSync(iconSource)) {
  fs.copyFileSync(iconSource, path.join(releaseDir, 'icon-192.png'));
}

const readme = [
  'FloristEver Android',
  '===================',
  '',
  `APK: ${downloadApkName}`,
  `Variant filename: ${apkName}`,
  `Variant: ${variant}`,
  `Size: ${apkSizeMb} MB`,
  `SHA-256: ${sha256}`,
  `Generated: ${builtAt}`,
  '',
  'Como enviar:',
  '1. Envia este APK diretamente, ou publica esta pasta num hosting HTTPS.',
  '2. No telemovel Android, abre o APK ou a pagina download.html.',
  '3. Se o Android bloquear, permite "instalar apps desconhecidas" apenas para a app usada no download.',
  '4. Depois de instalar, podes voltar a desativar essa permissao.',
  '',
  'Nota: para distribuicao publica, prefere uma release assinada ou Google Play/Internal Testing.'
].join('\n');

const html = `<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>Download FloristEver Android</title>
  <style>
    :root {
      color-scheme: light;
      --mint: #A8D5A2;
      --deep: #2F5D4A;
      --cream: #FFF6E5;
      --pink: #E0577D;
      --text: #3A2E39;
    }
    * { box-sizing: border-box; }
    body {
      min-height: 100vh;
      margin: 0;
      display: grid;
      place-items: center;
      background: var(--mint);
      color: var(--text);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      padding: 24px;
    }
    main {
      width: min(520px, 100%);
      background: var(--cream);
      border: 3px solid var(--deep);
      border-radius: 18px;
      box-shadow: 0 8px 0 var(--deep);
      padding: 24px;
      text-align: center;
    }
    img {
      width: 96px;
      height: 96px;
      border-radius: 22px;
      object-fit: cover;
      border: 2px solid var(--deep);
      background: var(--mint);
    }
    h1 { margin: 16px 0 8px; font-size: 28px; }
    p { line-height: 1.5; }
    a.download {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      min-height: 52px;
      margin: 14px 0;
      padding: 0 22px;
      border-radius: 14px;
      background: var(--pink);
      color: white;
      font-weight: 800;
      text-decoration: none;
      border: 2px solid var(--deep);
      box-shadow: 0 4px 0 var(--deep);
    }
    code {
      display: block;
      overflow-wrap: anywhere;
      background: white;
      border: 1px solid rgba(47, 93, 74, 0.25);
      border-radius: 10px;
      padding: 10px;
      text-align: left;
      font-size: 12px;
    }
    .note {
      font-size: 14px;
      text-align: left;
      background: rgba(168, 213, 162, 0.35);
      border-radius: 12px;
      padding: 12px;
    }
  </style>
</head>
<body>
  <main>
    <img src="icon-192.png" alt="FloristEver">
    <h1>FloristEver Android</h1>
    <p>Descarrega o APK e instala no teu telemovel Android.</p>
    <a class="download" href="${downloadApkName}" download>Download APK (${apkSizeMb} MB)</a>
    <p class="note">
      Se o Android pedir permissao, ativa temporariamente "instalar apps desconhecidas" para o navegador ou gestor de ficheiros usado no download.
    </p>
    <p><strong>SHA-256</strong></p>
    <code>${sha256}</code>
  </main>
</body>
</html>
`;

fs.writeFileSync(path.join(releaseDir, 'README.txt'), `${readme}\n`, 'utf8');
fs.writeFileSync(
  path.join(releaseDir, 'CHECKSUMS.txt'),
  `${sha256}  ${downloadApkName}\n${sha256}  ${apkName}\n`,
  'utf8'
);
fs.writeFileSync(path.join(releaseDir, 'download.html'), html, 'utf8');

console.log(`Android share package ready: ${releaseDir}`);
console.log(`APK: ${downloadApk}`);
console.log(`Variant APK: ${targetApk}`);
console.log(`SHA-256: ${sha256}`);
