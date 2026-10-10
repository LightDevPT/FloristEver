// FloristEver Service Worker
const CACHE_NAME = 'floristever-v77';
const ASSETS_TO_CACHE = [
  './',
  './docs/FloristEver_Termos_e_Condicoes.md',
  './imagens/icons/app-icon.ico',
  './imagens/icons/favicon.png',
  './imagens/icons/icon-1024.png',
  './imagens/icons/icon-128.png',
  './imagens/icons/icon-144.png',
  './imagens/icons/icon-152.png',
  './imagens/icons/icon-16.png',
  './imagens/icons/icon-167.png',
  './imagens/icons/icon-180.png',
  './imagens/icons/icon-192.png',
  './imagens/icons/icon-256.png',
  './imagens/icons/icon-32.png',
  './imagens/icons/icon-384.png',
  './imagens/icons/icon-48.png',
  './imagens/icons/icon-512.png',
  './imagens/icons/icon-64.png',
  './imagens/icons/icon-72.png',
  './imagens/icons/icon-96.png',
  './imagens/logo.jpeg',
  './imagens/logo.svg',
  './imagens/logo.wbmp',
  './index.html',
  './js/assets.js',
  './js/audio.js',
  './js/config/bouquets.js',
  './js/config/customers.js',
  './js/config/flowers.js',
  './js/config/terms.js',
  './js/config/upgrades.js',
  './js/entities/customer.js',
  './js/entities/field.js',
  './js/entities/player.js',
  './js/entities/worker.js',
  './js/entities/bouquet-worker.js',
  './js/icons.js',
  './js/garden-paths.js',
  './js/light-login-client.js',
  './js/main.js',
  './js/save-migrations.mjs',
  './js/state.js',
  './js/theme-manager.js',
  './js/day-night.js',
  './js/themes/hearts-garden.js',
  './js/themes/halloween.js',
  './js/themes/luminous-garden.js',
  './js/ui/account.js',
  './js/ui/bouquet.js',
  './js/ui/developer-tools.js',
  './js/ui/game-tutorial.js',
  './js/ui/hud.js',
  './js/ui/optional-store.js',
  './js/ui/shop.js',
  './js/ui/tutorial.js',
  './js/utils.js',
  './manifest.json',
  './musicas/TrilhaSonara-defundo.ogg',
  './style.css'
];
const PRECACHED_ASSET_PATHS = new Set(
  ASSETS_TO_CACHE.map((asset) => new URL(asset, self.location.href).pathname)
);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .catch((err) => {
        console.error('Não foi possível pré-carregar os ficheiros da app:', err);
        throw err;
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key.startsWith('floristever-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  // Ignora chamadas não GET ou esquemas não suportados (ex: chrome-extension://)
  const requestUrl = new URL(event.request.url);
  if (
    event.request.method !== 'GET'
    || !['http:', 'https:'].includes(requestUrl.protocol)
    || requestUrl.origin !== self.location.origin
  ) {
    return;
  }
  const isNavigation = event.request.mode === 'navigate';
  if (!isNavigation && !PRECACHED_ASSET_PATHS.has(requestUrl.pathname)) return;

  // Network-first para evitar servir versões obsoletas durante o jogo
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          event.waitUntil(
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseToCache))
              .catch((err) => console.warn('Não foi possível atualizar o cache da app:', err))
          );
        }
        return networkResponse;
      })
      .catch(async (networkError) => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request, { ignoreSearch: true });
        if (cached) return cached;
        if (isNavigation) {
          const appShell = await cache.match('./index.html');
          if (appShell) return appShell;
        }
        throw networkError;
      })
  );
});
