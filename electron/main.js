const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, Menu, ipcMain, session } = require('electron');
const { pathToFileURL } = require('url');

const APP_ROOT = path.resolve(__dirname, '..');
const DIST_INDEX = path.join(APP_ROOT, 'dist', 'index.html');
const DISPLAY_MODES = new Set(['fullscreen', 'borderless', 'windowed']);
const DISPLAY_PREFERENCES = path.join(app.getPath('userData'), 'display-preferences.json');
const DIST_INDEX_URL = pathToFileURL(DIST_INDEX).href;
let displayMode = 'fullscreen';
let windowedBounds = { x: 0, y: 0, width: 1280, height: 800 };
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' data: blob:",
  "manifest-src 'self'",
  "worker-src 'self'"
].join('; ');

function loadDisplayMode() {
  try {
    const preferences = JSON.parse(fs.readFileSync(DISPLAY_PREFERENCES, 'utf8'));
    if (DISPLAY_MODES.has(preferences.displayMode)) {
      displayMode = preferences.displayMode;
    } else {
      console.warn('A preferência de modo de ecrã é inválida; será usada Tela Cheia.');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Não foi possível ler as preferências de ecrã:', error);
    }
  }
}

function saveDisplayMode(mode) {
  fs.mkdirSync(path.dirname(DISPLAY_PREFERENCES), { recursive: true });
  fs.writeFileSync(DISPLAY_PREFERENCES, JSON.stringify({ displayMode: mode }), 'utf8');
}

function saveWindowedBounds(win) {
  if (!win.isDestroyed() && !win.isFullScreen() && !win.isMaximized()) {
    windowedBounds = win.getBounds();
  }
}

function applyDisplayMode(win, mode) {
  if (!DISPLAY_MODES.has(mode)) {
    throw new Error(`Modo de ecrã não suportado: ${mode}`);
  }

  if (mode === 'fullscreen') {
    win.setFullScreen(true);
    return;
  }

  if (win.isFullScreen()) win.setFullScreen(false);
  if (mode === 'borderless') {
    saveWindowedBounds(win);
    win.maximize();
    return;
  }

  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.setBounds(windowedBounds);
  }
}

function assertTrustedRenderer(event) {
  const frameUrl = event.senderFrame?.url?.split('#')[0];
  if (frameUrl !== DIST_INDEX_URL || !BrowserWindow.fromWebContents(event.sender)) {
    throw new Error('Pedido de modo de ecrã não autorizado.');
  }
}

ipcMain.handle('display-mode:get', (event) => {
  assertTrustedRenderer(event);
  return { mode: displayMode };
});

ipcMain.handle('display-mode:set', (event, requestedMode) => {
  assertTrustedRenderer(event);
  const win = BrowserWindow.fromWebContents(event.sender);
  if (typeof requestedMode !== 'string' || !DISPLAY_MODES.has(requestedMode)) {
    throw new Error('Modo de ecrã inválido.');
  }

  const previousMode = displayMode;
  applyDisplayMode(win, requestedMode);
  try {
    saveDisplayMode(requestedMode);
    displayMode = requestedMode;
  } catch (error) {
    applyDisplayMode(win, previousMode);
    throw error;
  }
  return { mode: displayMode };
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 620,
    backgroundColor: '#A8D5A2',
    show: false,
    fullscreen: displayMode === 'fullscreen',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });
  win.on('resize', () => {
    if (displayMode === 'windowed') saveWindowedBounds(win);
  });
  win.on('move', () => {
    if (displayMode === 'windowed') saveWindowedBounds(win);
  });
  win.once('ready-to-show', () => {
    if (displayMode === 'borderless') win.maximize();
    win.show();
  });
  win.loadFile(DIST_INDEX);
}

app.whenReady().then(() => {
  loadDisplayMode();
  Menu.setApplicationMenu(null);
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CSP],
        'Referrer-Policy': ['no-referrer'],
        'X-Content-Type-Options': ['nosniff']
      }
    });
  });
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
