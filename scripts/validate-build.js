const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const requiredFiles = [
  'index.html',
  'style.css',
  'manifest.json',
  'sw.js',
  'musicas/TrilhaSonara-defundo.ogg',
  'FloristEver_Termos_e_Condicoes.md',
  '_headers',
  'js/main.js',
  'js/day-night.js',
  'js/theme-manager.js',
  'js/themes/halloween.js',
  'js/themes/luminous-garden.js',
  'js/light-login-client.js',
  'js/save-migrations.mjs',
  'js/themes/hearts-garden.js',
  'js/ui/account.js',
  'js/ui/game-tutorial.js',
  'js/ui/developer-tools.js'
];

const errors = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(DIST, file))) {
    errors.push(`Missing dist/${file}`);
  }
}

if (errors.length === 0) {
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (!csp?.getAttribute('content')?.includes("object-src 'none'")) {
    errors.push('Missing or weak Content-Security-Policy meta tag.');
  }
  const loginApiBase = document.querySelector('meta[name="light-login-api-base"]')?.content;
  if (!loginApiBase || !/^https?:\/\/[^/]+\/api\/v1$/.test(loginApiBase)) {
    errors.push('Missing or invalid Light Group Login API base URL.');
  }
  const loginApiOrigin = loginApiBase ? new URL(loginApiBase).origin : null;
  if (loginApiOrigin && !csp?.getAttribute('content')?.includes(`connect-src 'self' ${loginApiOrigin}`)) {
    errors.push('Content-Security-Policy does not allow the configured Light Group Login API origin.');
  }
  const onboarding = document.getElementById('onboarding-terms-accepted');
  if (!onboarding || onboarding.checked) {
    errors.push('Onboarding must require an unchecked Terms acceptance box.');
  }
  if (!document.getElementById('modal-terms') || !document.getElementById('terms-document')) {
    errors.push('Terms viewer is missing from the onboarding screen.');
  }
  const gameTutorial = document.getElementById('game-tutorial');
  const serviceWorker = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8');
  const audioController = fs.readFileSync(path.join(DIST, 'js/audio.js'), 'utf8');
  const developerTools = fs.readFileSync(path.join(DIST, 'js/ui/developer-tools.js'), 'utf8');
  const gameMain = fs.readFileSync(path.join(DIST, 'js/main.js'), 'utf8');
  const termsConfig = fs.readFileSync(path.join(DIST, 'js/config/terms.js'), 'utf8');
  const gameState = fs.readFileSync(path.join(DIST, 'js/state.js'), 'utf8');
  const sourceServiceWorker = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const shopUpgrade = fs.readFileSync(path.join(DIST, 'js/config/upgrades.js'), 'utf8');
  const bouquetUi = fs.readFileSync(path.join(DIST, 'js/ui/bouquet.js'), 'utf8');
  const worker = fs.readFileSync(path.join(DIST, 'js/entities/worker.js'), 'utf8');
  const offlineStatus = document.getElementById('connection-status');
  const appearancePanel = document.getElementById('settings-panel-appearance');
  const precacheMatch = /const ASSETS_TO_CACHE = (\[[\s\S]*?\]);/.exec(serviceWorker);
  const sourceCacheVersion = /const CACHE_NAME = '([^']+)'/.exec(sourceServiceWorker)?.[1];
  const buildCacheVersion = /const CACHE_NAME = '([^']+)'/.exec(serviceWorker)?.[1];
  let precachedAssets = [];
  try {
    if (!precacheMatch) throw new Error('ASSETS_TO_CACHE was not found.');
    precachedAssets = JSON.parse(precacheMatch[1]);
  } catch (error) {
    errors.push(`Invalid offline precache manifest: ${error.message}`);
  }
  if (
    !gameTutorial
    || gameTutorial.getAttribute('role') !== 'dialog'
    || !document.getElementById('game-tutorial-topics')
    || !document.getElementById('game-tutorial-content')
    || !document.getElementById('btn-tutorial-skip')
    || !document.getElementById('btn-tutorial-next')
    || !document.getElementById('btn-replay-tutorial')
  ) {
    errors.push('Interactive game tutorial or its onboarding/settings controls are missing.');
  }
  if (!precachedAssets.includes('./js/ui/game-tutorial.js')) {
    errors.push('Service worker does not precache the interactive game tutorial module.');
  }
  if (!precachedAssets.includes('./js/save-migrations.mjs')) {
    errors.push('Service worker does not precache the save migration module.');
  }
  if (!precachedAssets.includes('./js/day-night.js')) {
    errors.push('Service worker does not precache the day-night lighting module.');
  }
  if (
    !appearancePanel
    || !document.querySelector('[data-settings-tab="appearance"][role="tab"]')
    || !document.getElementById('btn-toggle-decoration-mode')
    || !document.getElementById('theme-event-pill')
    || !document.querySelector('input[name="theme-preference"][value="auto"]')
    || !document.querySelector('input[name="theme-preference"][value="halloween"]')
    || !document.querySelector('input[name="theme-preference"][value="luminous"]')
    || !document.querySelector('input[name="theme-preference"][value="classic"]')
    || !document.querySelector('input[name="theme-preference"][value="jardim_coracoes"]')
    || !precachedAssets.includes('./js/theme-manager.js')
    || !precachedAssets.includes('./js/themes/hearts-garden.js')
    || !precachedAssets.includes('./js/themes/halloween.js')
    || !precachedAssets.includes('./js/themes/luminous-garden.js')
  ) {
    errors.push('Appearance settings, theme picker, or its offline modules are missing from the web build.');
  }
  if (
    !document.getElementById('modal-compost')
    || !document.getElementById('compost-flower-rows')
    || !document.getElementById('btn-confirm-compost')
    || !precachedAssets.includes('./js/main.js')
    || !precachedAssets.includes('./js/state.js')
  ) {
    errors.push('Compost disposal interaction is missing from the web build.');
  }
  if (
    !document.getElementById('mobile-control-layout')
    || !document.getElementById('mobile-move-control-size')
    || !document.getElementById('mobile-action-control-size')
    || !document.getElementById('mobile-control-save-error')
    || !gameMain.includes('applyMobileControlSettings')
    || !gameState.includes('mobileControlLayout')
  ) {
    errors.push('Mobile control position and size settings are missing from the web build.');
  }
  if (
    !document.getElementById('developer-tools-panel')
    || !developerTools.includes("user.roles.includes('developer')")
    || !precachedAssets.includes('./js/ui/developer-tools.js')
  ) {
    errors.push('Developer tools must require an authenticated developer role and be precached.');
  }
  if (
    !audioController.includes("'./musicas/TrilhaSonara-defundo.ogg'")
    || !precachedAssets.includes('./musicas/TrilhaSonara-defundo.ogg')
    || !audioController.includes('setPageVisible(isVisible)')
    || !gameMain.includes('setupAudioVisibility')
  ) {
    errors.push('Background music is not configured, precached, or paused when the app is in the background.');
  }
  if (
    !offlineStatus
    || !sourceCacheVersion
    || buildCacheVersion !== sourceCacheVersion
    || !serviceWorker.includes("event.request.mode === 'navigate'")
    || !serviceWorker.includes('if (!isNavigation && !PRECACHED_ASSET_PATHS.has(requestUrl.pathname)) return;')
  ) {
    errors.push('Offline connection status, current cache version, or navigation fallback is missing.');
  }
  if (
    !gameState.includes('getFlowerStockCapacity(flowerId)')
    || !gameState.includes('return 20 + (this.upgrades.shopExpansion || 0) * 20;')
    || !gameState.includes('this.getAvailableShopStockSpace(flowerId) > 0')
    || !shopUpgrade.includes('limite individual de stock de cada flor')
    || !bouquetUi.includes('${availableQty}/${this.state.getFlowerStockCapacity(fId)}')
    || !worker.includes('state.getAvailableShopStockSpace(flowerId)')
  ) {
    errors.push('Per-flower stock limits, 20-unit default, expansion behavior, or stock UI are missing.');
  }
  if (
    !termsConfig.includes("ONBOARDING_COMPLETED_KEY = 'floristever_onboarding_completed_v1'")
    || !gameMain.includes('localStorage.setItem(ONBOARDING_COMPLETED_KEY, \'true\')')
    || !gameMain.includes('onboardingCompleted || this.hasLoadedProgress')
    || !gameMain.includes('startOverlay.classList.add(\'hidden\')')
  ) {
    errors.push('Completed onboarding is not persisted and restored for returning players.');
  }
  if (precacheMatch) {
    const precachedSet = new Set(precachedAssets);
    const expectedAssets = [];
    const collectAssets = (directory) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          collectAssets(absolutePath);
          continue;
        }
        const relativePath = path.relative(DIST, absolutePath).split(path.sep).join('/');
        if (!['sw.js', '_headers', '.htaccess'].includes(relativePath)) {
          expectedAssets.push(`./${relativePath}`);
        }
      }
    };
    collectAssets(DIST);
    const missingAssets = expectedAssets.filter((asset) => !precachedSet.has(asset));
    const missingFiles = [...precachedSet]
      .filter((asset) => asset !== './')
      .filter((asset) => !fs.existsSync(path.join(DIST, asset.slice(2))));
    if (missingAssets.length > 0) {
      errors.push(`Offline precache is missing files: ${missingAssets.join(', ')}`);
    }
    if (missingFiles.length > 0) {
      errors.push(`Offline precache references missing files: ${missingFiles.join(', ')}`);
    }
    if (!precachedSet.has('./')) errors.push('Offline precache is missing the app root route.');
  }

  const externalUrls = [...document.querySelectorAll('[src], [href]')]
    .map((element) => element.getAttribute('src') || element.getAttribute('href'))
    .filter(Boolean)
    .filter((value) => /^https?:\/\//i.test(value));
  if (externalUrls.length > 0) {
    errors.push(`External network references found: ${externalUrls.join(', ')}`);
  }
  const missingReferences = [...document.querySelectorAll('[src], [href]')]
    .map((element) => element.getAttribute('src') || element.getAttribute('href'))
    .filter((value) => value && !/^(?:#|data:|blob:|mailto:|tel:|javascript:)/i.test(value))
    .filter((value) => {
      const url = new URL(value, 'http://localhost/');
      if (url.origin !== 'http://localhost') return false;
      const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const filePath = path.join(DIST, relativePath || 'index.html');
      return !fs.existsSync(filePath);
    });
  if (missingReferences.length > 0) {
    errors.push(`Local HTML references are missing from the web build: ${missingReferences.join(', ')}`);
  }

  const inlineScripts = [...document.querySelectorAll('script')]
    .filter((script) => !script.src && script.textContent.trim().length > 0);
  if (inlineScripts.length > 0) {
    errors.push('Inline scripts found in dist/index.html.');
  }
}

try {
  const manifest = JSON.parse(fs.readFileSync(path.join(DIST, 'manifest.json'), 'utf8'));
  if (manifest.display !== 'standalone') errors.push('manifest.json display should be standalone.');
  if (!manifest.start_url) errors.push('manifest.json missing start_url.');
} catch (error) {
  errors.push(`Invalid manifest.json: ${error.message}`);
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log('Build validation passed.');
