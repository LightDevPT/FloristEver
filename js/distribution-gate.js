(function () {
  'use strict';

  const officialHost = 'floristever.netlify.app';
  const isOfficialWeb = window.location.hostname.toLowerCase() === officialHost;
  const isOfficialDesktop = Boolean(window.floristDesktop);
  const isOfficialAndroid = typeof window.Capacitor?.isNativePlatform === 'function'
    && window.Capacitor.isNativePlatform();

  if (isOfficialWeb || isOfficialDesktop || isOfficialAndroid) return;

  document.documentElement.innerHTML =
    '<title>FloristEver - Distribuição não autorizada</title>' +
    '<body style="margin:0;display:grid;place-items:center;min-height:100vh;' +
    'background:#A8D5A2;color:#2F5D4A;font:700 18px system-ui,' +
    'sans-serif"><main style="padding:24px;text-align:center">' +
    'Esta cópia não pode ser executada fora dos canais oficiais.<br>' +
    '<a href="https://floristever.netlify.app" style="color:#E0577D">' +
    'Abrir FloristEver oficial</a></main></body>';

  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    window.location.replace('https://floristever.netlify.app');
  }
})();
