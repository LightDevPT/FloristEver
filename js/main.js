// ========================================================
// FloristEver - Ciclo Principal do Jogo (main.js)
// Arquitetura Modular ES: Loop com Delta-Time, Câmara Suave,
// Iluminação Dinâmica Acolhedora e Controlo Unificado
// ========================================================

import { state } from './state.js';
import { LUMINOUS_GARDEN_UNLOCK_LEVEL, themeManager, THEME_PREFERENCES } from './theme-manager.js';
import {
  getDayNightLighting,
  MAX_NIGHT_OVERLAY_ALPHA
} from './day-night.js';
import { soundManager } from './audio.js';
import { assetManager } from './assets.js';
import { ParticleSystem, PALETTE, distance, clamp, lerp, getCanvasPixelRatio } from './utils.js';
import { Player } from './entities/player.js';
import { FieldManager } from './entities/field.js';
import { WorkerManager } from './entities/worker.js';
import { BouquetWorkerManager } from './entities/bouquet-worker.js';
import { CustomerManager } from './entities/customer.js';
import { HudManager } from './ui/hud.js';
import { ShopUi } from './ui/shop.js';
import { OptionalStoreUi } from './ui/optional-store.js';
import { BouquetUi } from './ui/bouquet.js';
import { TutorialManager } from './ui/tutorial.js';
import { GameTutorial } from './ui/game-tutorial.js';
import { AccountUi } from './ui/account.js';
import {
  applyLocalFullTestProfile,
  DeveloperToolsPanel,
  isLocalFullTestMode
} from './ui/developer-tools.js';
import { HudCustomizer } from './ui/hud-customizer.js';
import {
  ONBOARDING_COMPLETED_KEY,
  TERMS_ACCEPTANCE_KEY,
  TERMS_VERSION
} from './config/terms.js';
import { getIcon } from './icons.js';
import { FLOWERS_CONFIG, FLOWER_ORDER } from './config/flowers.js';
import { getShopExpansionVisualSize } from './config/upgrades.js';
import { getGardenPathSegments } from './garden-paths.js';

const MOBILE_CONTROL_LAYOUTS = new Set(['left', 'right']);
const MOBILE_CONTROL_SIZES = new Set(['small', 'standard', 'large']);
const MOBILE_CONTROL_SIZE_SCALE = { small: 0.8, standard: 1, large: 1.2 };
const GREENHOUSE_UNDER_CONSTRUCTION = true;

function appendTermsInlineContent(parent, text) {
  const markdownPattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;

  for (const match of text.matchAll(markdownPattern)) {
    if (match.index > lastIndex) {
      parent.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    const token = match[0];
    const tagName = token.startsWith('**') ? 'strong' : token.startsWith('`') ? 'code' : 'em';
    const content = token.startsWith('**') ? token.slice(2, -2) : token.slice(1, -1);
    const element = document.createElement(tagName);
    element.textContent = content;
    parent.appendChild(element);
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parent.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

function renderTermsDocument(markdown, container) {
  container.replaceChildren();

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^-{3,}$/.test(line)) continue;

    const heading = /^(#{1,2})\s+(.+)$/.exec(line);
    if (heading) {
      const isMainTitle = heading[1].length === 1;
      const element = document.createElement(isMainTitle ? 'h1' : 'h2');
      element.className = isMainTitle ? 'terms-document-title' : 'terms-section-title';
      appendTermsInlineContent(element, heading[2]);
      container.appendChild(element);
      continue;
    }

    const listItem = /^([a-z])\)\s+(.+)$/i.exec(line);
    if (listItem) {
      const element = document.createElement('p');
      element.className = 'terms-list-item';
      const marker = document.createElement('span');
      marker.className = 'terms-list-marker';
      marker.textContent = `${listItem[1]})`;
      element.append(marker, document.createTextNode(' '));
      appendTermsInlineContent(element, listItem[2]);
      container.appendChild(element);
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      const element = document.createElement('blockquote');
      appendTermsInlineContent(element, quote[1]);
      container.appendChild(element);
      continue;
    }

    const paragraph = document.createElement('p');
    const clause = /^(\d+(?:\.\d+)*\.)\s+(.+)$/.exec(line);
    if (clause) {
      const number = document.createElement('span');
      number.className = 'terms-clause-number';
      number.textContent = clause[1];
      paragraph.append(number, document.createTextNode(' '));
      appendTermsInlineContent(paragraph, clause[2]);
    } else {
      appendTermsInlineContent(paragraph, line);
    }

    if (/^\*\*Versão\b/.test(line)) paragraph.className = 'terms-document-meta';
    if (/^©\s/.test(line)) paragraph.className = 'terms-document-copyright';
    container.appendChild(paragraph);
  }
}

class Game {
  constructor() {
    this.sessionTestMode = isLocalFullTestMode(window.location);
    state.sessionOnlyMode = this.sessionTestMode;
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Inicialização dos subsistemas
    this.state = state;
    this.particles = new ParticleSystem();
    this.player = new Player(350, 340);
    this.fieldManager = new FieldManager(state, soundManager, this.particles);
    this.workerManager = new WorkerManager(state, soundManager, this.particles);
    this.bouquetWorkerManager = new BouquetWorkerManager(state);
    this.customerManager = new CustomerManager(state, soundManager, this.particles);

    // Gestão de UI e Modais
    this.hud = new HudManager(state, soundManager);
    this.shopUi = new ShopUi(state, soundManager, this.hud);
    this.shopUi.onTravelToZone = (zoneId) => this.travelToZone(zoneId);
    this.optionalStoreUi = new OptionalStoreUi(state, soundManager, this.hud);
    this.bouquetUi = new BouquetUi(state, soundManager, this.hud, this.particles);
    this.hud.onOpenFavoriteObjective = (objective) => {
      if (objective.type === 'collection') {
        this.bouquetUi.bookPageIndex = 1;
        this.bouquetUi.openBookModal();
        return;
      }
      this.shopUi.openChallenges();
    };
    this.developerTools = new DeveloperToolsPanel(state, this.hud, () => this.accountUi?.client.user);
    this.accountUi = new AccountUi(state, this.hud, {
      disableSync: this.sessionTestMode,
      onAccountChange: () => this.developerTools.refreshAccess()
    });
    this.onboardingAccountUi = new AccountUi(state, this.hud, {
      hostId: 'onboarding-account-panel',
      enableAutosync: false,
      disableSync: this.sessionTestMode,
      onBeforeAuthenticate: () => this.acceptOnboardingTerms(),
      onAuthenticated: () => this.finishOnboarding()
    });
    this.tutorial = null;

    // Câmara suave
    this.camera = {
      x: 350,
      y: 280,
      targetX: 350,
      targetY: 280,
      zoom: 1.0
    };
    this.visibleWorldBounds = null;
    this.cachedPathPlots = null;
    this.cachedPathPlotCount = -1;
    this.cachedPathSegments = null;

    // Dimensões do mapa do jogo
    this.mapBounds = {
      minX: 40,
      maxX: 2800,
      minY: 40,
      maxY: 1200
    };

    // Coordenadas da Loja e Balcão
    this.shopBuilding = { x: 80, y: 70, width: 200, height: 130 };
    this.counter = { x: 100, y: 170, width: 140, height: 36 };

    // Elementos vivos de ambientação (borboletas e abelhas)
    this.ambientCreatures = [
      { type: 'butterfly', x: 420, y: 200, baseX: 420, baseY: 200, phase: 0, color: PALETTE.peonyPink },
      { type: 'butterfly', x: 620, y: 350, baseX: 620, baseY: 350, phase: 2, color: PALETTE.lavender },
      { type: 'butterfly', x: 850, y: 220, baseX: 850, baseY: 220, phase: 4, color: PALETTE.sunYellow },
      { type: 'bee', x: 480, y: 230, baseX: 480, baseY: 230, phase: 1 },
      { type: 'bee', x: 700, y: 380, baseX: 700, baseY: 380, phase: 3 }
    ];

    // Árvores decorativas à volta da quinta
    this.trees = [
      { x: 50, y: 320 },
      { x: 50, y: 480 },
      { x: 60, y: 640 },
      { x: 330, y: 60 },
      { x: 660, y: 60 },
      { x: 980, y: 80 },
      { x: 1130, y: 90 },
      { x: 1060, y: 520 },
      { x: 1040, y: 740 },
      { x: 450, y: 800 },
      { x: 750, y: 810 }
    ];

    this.mapDecor = [
      { type: 'flowerBed', x: 210, y: 360, flowers: ['daisy', 'tulip', 'daisy'] },
      { type: 'flowerBed', x: 210, y: 465, flowers: ['sunflower', 'daisy', 'tulip'] },
      { type: 'flowerBed', x: 210, y: 570, flowers: ['tulip', 'daisy', 'daisy'] },
      { type: 'flowerBed', x: 62, y: 735, flowers: ['lavender', 'verbena', 'lavender'] },
      { type: 'bench', x: 130, y: 405 },
      { type: 'bench', x: 205, y: 660 },
      { type: 'sign', x: 210, y: 285, label: 'Jardim' },
      { type: 'sign', x: 145, y: 285, label: 'Estufa', direction: 'left' },
      { type: 'compost', x: 300, y: 300, label: 'Compostor' },
      { type: 'birdbath', x: 145, y: 735 },
      { type: 'stones', x: 70, y: 850, count: 5, spacing: 22 },
      { type: 'stones', x: 70, y: 920, count: 4, spacing: 24 },
      { type: 'stones', x: 70, y: 875, count: 5, spacing: 24 },
      { type: 'stones', x: 82, y: 685, count: 4, spacing: 22 },
      { type: 'stones', x: 70, y: 990, count: 6, spacing: 24 },
      { type: 'bench', x: 130, y: 525 },
      { type: 'bench', x: 140, y: 940 }
    ];
    this.mapDecor.forEach((decor, index) => {
      const position = this.state.gardenDecorations[index];
      if (position) {
        decor.x = position.x;
        decor.y = position.y;
      }
    });
    this.decorationMode = false;
    this.decorationDrag = null;
    this.collisionObstacles = null;
    this.collisionPlots = null;
    this.collisionPlotCount = -1;
    this.collisionShopExpansion = -1;
    this.collisionDecorSignature = '';

    // Tempo e ciclo dia/noite muito suave
    this.gameTime = 0;
    this.challengeRefreshTimer = 0;
    this.lastFrameTime = performance.now();
    this.audioUnlocked = false;
    this.stockCapacityNoticeShown = false;

    // Controlos Touch e Teclado
    this.activeKeys = new Set();
    this.touchJoystick = {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    };
    this.mobileMoveControlScale = 1;

    this.init();
  }

  init() {
    window.__game = this;
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
    window.visualViewport?.addEventListener('resize', () => this.handleResize());

    // Carregar progresso guardado
    const loadResult = state.load();
    this.hasLoadedProgress = loadResult !== null;
    if (this.sessionTestMode) {
      applyLocalFullTestProfile(state);
      this.hud.showToast(
        'Modo de teste completo ativo: terrenos, flores, melhorias e zonas desbloqueados. O progresso de teste não será guardado.',
        'check'
      );
    }
    if (state.saveBlocked) {
      this.hud.showToast(
        'O progresso não pôde ser carregado. As gravações e a sincronização foram bloqueadas para proteger o save.',
        'error'
      );
    }
    if (loadResult && loadResult.offlineGain > 0) {
      this.showOfflineModal(loadResult.offlineGain);
    }
    if (loadResult?.wagesPaid > 0) {
      this.hud.showToast(`Salários pagos durante a ausência: ${loadResult.wagesPaid} moedas`, 'coin');
    }

    this.hudCustomizer = new HudCustomizer(state);
    this.tutorial = new TutorialManager(state);
    this.gameTutorial = new GameTutorial(this.hud);
    this.setupInputs();
    this.setupCompostModal();
    this.setupAudioVisibility();
    this.setupSettingsModal();
    this.setupThemesModal();
    this.setupStartMenu();
    this.setupConnectionStatus();
    this.setupServiceWorkerUpdatePrompt();
    this.setupAutosave();
    // Iniciar loop de jogo
    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }

  handleResize() {
    const width = document.documentElement.clientWidth || window.innerWidth;
    const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const pixelRatio = getCanvasPixelRatio(width, height, window.devicePixelRatio);
    const pixelWidth = Math.round(width * pixelRatio);
    const pixelHeight = Math.round(height * pixelRatio);
    this.canvas.width = pixelWidth;
    this.canvas.height = pixelHeight;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    this.camera.zoom = Math.max(0.68, Math.min(1, width / 768, height / 640));
    this.applyMobileControlSettings();
  }

  applyMobileControlSettings() {
    const controls = document.getElementById('mobile-controls');
    const joystick = document.getElementById('virtual-joystick');
    const joystickKnob = document.getElementById('joystick-knob');
    const actionButton = document.getElementById('btn-mobile-action');
    if (!controls || !joystick || !joystickKnob || !actionButton) return;

    const settings = state.settings;
    const layout = MOBILE_CONTROL_LAYOUTS.has(settings.mobileControlLayout)
      ? settings.mobileControlLayout
      : 'left';
    const moveSize = MOBILE_CONTROL_SIZES.has(settings.mobileMoveControlSize)
      ? settings.mobileMoveControlSize
      : 'standard';
    const actionSize = MOBILE_CONTROL_SIZES.has(settings.mobileActionControlSize)
      ? settings.mobileActionControlSize
      : 'standard';
    settings.mobileControlLayout = layout;
    settings.mobileMoveControlSize = moveSize;
    settings.mobileActionControlSize = actionSize;
    controls.dataset.layout = layout;
    this.mobileMoveControlScale = MOBILE_CONTROL_SIZE_SCALE[moveSize];

    const applySize = (elements, scale) => {
      for (const element of elements) {
        element.style.removeProperty('width');
        element.style.removeProperty('height');
      }
      if (scale === 1 || getComputedStyle(controls).display === 'none') return;
      const [element, ...relatedElements] = elements;
      const baseWidth = Number.parseFloat(getComputedStyle(element).width);
      const baseHeight = Number.parseFloat(getComputedStyle(element).height);
      if (!Number.isFinite(baseWidth) || !Number.isFinite(baseHeight)) return;
      element.style.width = `${Math.max(44, baseWidth * scale)}px`;
      element.style.height = `${Math.max(44, baseHeight * scale)}px`;
      for (const relatedElement of relatedElements) {
        const width = Number.parseFloat(getComputedStyle(relatedElement).width);
        const height = Number.parseFloat(getComputedStyle(relatedElement).height);
        if (Number.isFinite(width) && Number.isFinite(height)) {
          relatedElement.style.width = `${Math.max(1, width * scale)}px`;
          relatedElement.style.height = `${Math.max(1, height * scale)}px`;
        }
      }
    };

    applySize([joystick, joystickKnob], MOBILE_CONTROL_SIZE_SCALE[moveSize]);
    applySize([actionButton], MOBILE_CONTROL_SIZE_SCALE[actionSize]);
  }

  unlockAudio() {
    if (!this.audioUnlocked) {
      this.audioUnlocked = true;
      soundManager.init();
      soundManager.setMusicVolume(state.settings.musicVolume);
      soundManager.setSfxVolume(state.settings.sfxVolume);
      if (!state.settings.musicMuted) {
        soundManager.startMusic();
      }
    }
  }

  setupAudioVisibility() {
    const updateVisibility = () => {
      soundManager.setPageVisible(
        document.visibilityState !== 'hidden' && document.hasFocus()
      );
    };

    document.addEventListener('visibilitychange', updateVisibility);
    window.addEventListener('blur', () => soundManager.setPageVisible(false));
    window.addEventListener('focus', updateVisibility);
    window.addEventListener('pagehide', () => soundManager.setPageVisible(false));
    window.addEventListener('pageshow', updateVisibility);
    updateVisibility();
  }

  setupInputs() {
    // Teclado (Desktop)
    window.addEventListener('keydown', (e) => {
      this.unlockAudio();
      if (this.hudCustomizer?.draft) return;
      if (this.gameTutorial?.isOpen()) return;
      if (e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (this.compostModal && !this.compostModal.classList.contains('hidden')) return;
      if (this.bouquetUi.modalBook && !this.bouquetUi.modalBook.classList.contains('hidden')) return;
      this.activeKeys.add(e.code);

      if (e.code === 'KeyE' || e.code === 'Space') {
        this.handleActionInteraction();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.activeKeys.delete(e.code);
    });

    const hudMenuToggle = document.getElementById('btn-toggle-hud-menu');
    const hudMenuItems = document.getElementById('hud-menu-items');
    const setHudMenuOpen = (isOpen) => {
      if (!hudMenuToggle || !hudMenuItems) return;
      hudMenuItems.classList.toggle('is-open', isOpen);
      hudMenuToggle.setAttribute('aria-expanded', String(isOpen));
      hudMenuToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    };
    hudMenuToggle?.addEventListener('click', () => {
      this.unlockAudio();
      setHudMenuOpen(hudMenuToggle.getAttribute('aria-expanded') !== 'true');
    });
    hudMenuItems?.addEventListener('click', (event) => {
      if (event.target.closest('button')) setHudMenuOpen(false);
    });
    const decorationToggle = document.getElementById('btn-toggle-decoration-mode');
    decorationToggle?.addEventListener('click', () => {
      this.decorationMode = !this.decorationMode;
      decorationToggle.setAttribute('aria-pressed', String(this.decorationMode));
      decorationToggle.setAttribute(
        'aria-label',
        this.decorationMode ? 'Desativar modo de decoração' : 'Ativar modo de decoração'
      );
      document.body.classList.toggle('garden-decoration-mode', this.decorationMode);
      if (this.decorationMode) {
        document.getElementById('modal-settings')?.classList.add('hidden');
        document.getElementById('btn-open-settings')?.focus();
      }
      this.hud.showToast(
        this.decorationMode
          ? 'Modo de decoração ativo. Arrasta os canteiros, bancos, placas e elementos decorativos para os organizar.'
          : 'Modo de decoração desativado.',
        'sprout'
      );
      soundManager.playClick();
    });
    document.addEventListener('pointerdown', (event) => {
      if (!(event.target instanceof Element) || !event.target.closest('.hud-actions')) {
        setHudMenuOpen(false);
      }
    });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setHudMenuOpen(false);
    });

    // Clique com Rato no Canvas (Click-to-move e compra de parcelas)
    this.canvas.addEventListener('pointerdown', (e) => {
      this.unlockAudio();
      // Não move o jogador se clicar num botão de UI
      if (e.target !== this.canvas) return;

      const rect = this.canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      // Converte coordenadas de ecrã para o mundo
      const worldPos = this.screenToWorld(screenX, screenY);

      if (this.decorationMode) {
        const movableIndices = [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13];
        const nearest = movableIndices
          .map((index) => ({ index, decor: this.mapDecor[index] }))
          .map((entry) => ({
            ...entry,
            distance: distance(worldPos.x, worldPos.y, entry.decor.x, entry.decor.y)
          }))
          .filter((entry) => entry.distance < 85)
          .sort((first, second) => first.distance - second.distance)[0];
        if (nearest) {
          this.decorationDrag = {
            index: nearest.index,
            original: { x: nearest.decor.x, y: nearest.decor.y },
            pointerId: e.pointerId
          };
          this.canvas.setPointerCapture(e.pointerId);
        } else {
          this.hud.showToast('Arrasta um elemento decorativo para o reposicionar.', 'sprout');
        }
        return;
      }

      // Verifica se clicou numa parcela bloqueada para comprar
      const handled = this.fieldManager.handleClick(worldPos.x, worldPos.y);
      // Em ecrãs tácteis, tocar no terreno não deve iniciar movimento.
      // A compra de parcelas continua disponível através de handleClick.
      if (!handled && e.pointerType !== 'touch') {
        this.player.setTarget(worldPos.x, worldPos.y);
        this.particles.emitStepDust(worldPos.x, worldPos.y);
      }
    });
    this.canvas.addEventListener('pointermove', (event) => {
      if (!this.decorationDrag || event.pointerId !== this.decorationDrag.pointerId) return;
      const rect = this.canvas.getBoundingClientRect();
      const worldPos = this.screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
      const decor = this.mapDecor[this.decorationDrag.index];
      decor.x = clamp(worldPos.x, 40, 2260);
      decor.y = clamp(worldPos.y, 40, 1160);
    });
    const finishDecorationDrag = (event) => {
      if (!this.decorationDrag || event.pointerId !== this.decorationDrag.pointerId) return;
      const drag = this.decorationDrag;
      this.decorationDrag = null;
      const decor = this.mapDecor[drag.index];
      if (event.type === 'pointercancel') {
        decor.x = drag.original.x;
        decor.y = drag.original.y;
        return;
      }
      if (!this.state.setGardenDecorationPosition(drag.index, decor.x, decor.y)) {
        decor.x = drag.original.x;
        decor.y = drag.original.y;
        this.hud.showToast('Não foi possível guardar a nova posição. A decoração foi reposta.', 'error');
      }
    };
    this.canvas.addEventListener('pointerup', finishDecorationDrag);
    this.canvas.addEventListener('pointercancel', finishDecorationDrag);

    const mapToggle = document.getElementById('btn-toggle-map');
    const mapClose = document.getElementById('btn-close-map');
    const mapPanel = document.getElementById('map-panel');
    const minimap = document.getElementById('minimap-canvas');
    const setMapOpen = (isOpen) => {
      if (!mapPanel || !mapToggle) return;
      mapPanel.classList.toggle('hidden', !isOpen);
      document.body.classList.toggle('map-open', isOpen);
      mapToggle.setAttribute('aria-expanded', String(isOpen));
      mapToggle.setAttribute('aria-label', isOpen ? 'Fechar mapa' : 'Abrir mapa');
      if (isOpen) {
        this.drawMinimap();
        this.renderMapZoneDestinations();
      }
    };

    mapToggle?.addEventListener('click', () => setMapOpen(mapPanel?.classList.contains('hidden') === true));
    mapClose?.addEventListener('click', () => setMapOpen(false));
    state.subscribe((event) => {
      if (
        !mapPanel?.classList.contains('hidden')
        && ['level_up', 'flower_harvested', 'customer_served', 'order_cycle_completed', 'bouquet_crafted', 'state_loaded'].includes(event)
      ) {
        this.renderMapZoneDestinations();
      }
    });
    minimap?.addEventListener('pointerdown', (e) => {
      const rect = minimap.getBoundingClientRect();
      const xRatio = clamp((e.clientX - rect.left - 7) / (rect.width - 14), 0, 1);
      const yRatio = clamp((e.clientY - rect.top - 7) / (rect.height - 14), 0, 1);
      this.player.setTarget(
        clamp(
          this.mapBounds.minX + xRatio * (this.mapBounds.maxX - this.mapBounds.minX),
          this.mapBounds.minX,
          this.mapBounds.maxX
        ),
        clamp(yRatio * this.mapBounds.maxY, this.mapBounds.minY, this.mapBounds.maxY)
      );
      this.unlockAudio();
    });

    // Joystick Virtual Touch (Mobile)
    const joyZone = document.getElementById('virtual-joystick');
    const joyKnob = document.getElementById('joystick-knob');
    const actionBtn = document.getElementById('btn-mobile-action');

    if (joyZone && joyKnob) {
      const resetJoystick = () => {
        this.touchJoystick.active = false;
        joyKnob.style.transform = `translate(0px, 0px)`;
        this.player.setInput(0, 0);
      };

      joyZone.addEventListener('touchstart', (e) => {
        this.unlockAudio();
        e.preventDefault();
        const touch = e.touches[0];
        const rect = joyZone.getBoundingClientRect();
        this.touchJoystick.active = true;
        this.touchJoystick.startX = rect.left + rect.width / 2;
        this.touchJoystick.startY = rect.top + rect.height / 2;
      }, { passive: false });

      joyZone.addEventListener('touchmove', (e) => {
        if (!this.touchJoystick.active) return;
        e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - this.touchJoystick.startX;
        const dy = touch.clientY - this.touchJoystick.startY;
        const dist = Math.hypot(dx, dy);
        const maxDist = 38 * this.mobileMoveControlScale;

        const clampedDist = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);
        const knobX = Math.cos(angle) * clampedDist;
        const knobY = Math.sin(angle) * clampedDist;

        joyKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
        this.player.setInput(knobX / maxDist, knobY / maxDist);
      }, { passive: false });

      joyZone.addEventListener('touchend', resetJoystick);
      joyZone.addEventListener('touchcancel', resetJoystick);
    }

    if (actionBtn) {
      actionBtn.addEventListener('pointerdown', (e) => {
        this.unlockAudio();
        e.preventDefault();
        this.handleActionInteraction();
      });
    }
  }

  screenToWorld(screenX, screenY) {
    const dpr = window.devicePixelRatio || 1;
    const viewW = document.documentElement.clientWidth || window.innerWidth;
    const viewH = window.visualViewport ? window.visualViewport.height : window.innerHeight;

    const cx = viewW / 2;
    const cy = viewH / 2;

    const wx = (screenX - cx) / this.camera.zoom + this.camera.x;
    const wy = (screenY - cy) / this.camera.zoom + this.camera.y;

    return { x: wx, y: wy };
  }

  handleActionInteraction() {
    if (this.player.isSeated) {
      this.player.standUp();
      soundManager.playClick();
      this.hud.showToast('Levantaste-te do banco', 'sprout');
      return;
    }

    const nearbyFinding = this.getNearbyZoneFinding();
    if (nearbyFinding) {
      if (this.state.discoverZoneFinding(nearbyFinding.zoneId, nearbyFinding.finding.id)) {
        this.hud.showToast(
          `Descoberta: ${nearbyFinding.finding.name}. ${nearbyFinding.progressText}`,
          'book'
        );
      } else {
        this.hud.showToast('Não foi possível guardar esta descoberta. Tenta novamente.', 'error');
      }
      return;
    }

    const nearbyCompost = this.getNearbyCompost();
    if (nearbyCompost && state.basket.length > 0) {
      this.openCompostModal();
      return;
    }

    const nearbyBench = this.getNearbyBench();
    if (nearbyBench) {
      this.player.sitAt(nearbyBench.x, nearbyBench.y + 8, nearbyBench.x < this.player.x ? -1 : 1);
      soundManager.playClick();
      this.hud.showToast('Fizeste uma pausa no jardim', 'flower');
      return;
    }

    // 1. Tenta atender cliente no balcão se estiver próximo
    const counterCenter = {
      x: this.counter.x + this.counter.width / 2,
      y: this.counter.y + this.counter.height / 2
    };
    const distToCounter = distance(this.player.x, this.player.y, counterCenter.x, counterCenter.y);

    if (distToCounter < 95) {
      const served = this.customerManager.serveWaitingCustomer();
      if (served) return;
    }
  }

  travelToZone(zoneId) {
    if (zoneId !== 'greenhouse') return false;
    this.hud.showToast('A estufa está em construção. Em breve disponível!', 'lock');
    return false;
  }

  getNearbyBench() {
    return this.mapDecor
      .filter((decor) => decor.type === 'bench')
      .find((bench) => distance(this.player.x, this.player.y, bench.x, bench.y + 8) < 58) || null;
  }

  getNearbyZoneFinding() {
    for (const zone of this.state.getZoneActivities()) {
      if (zone.id !== 'greenhouse') continue;
      if (GREENHOUSE_UNDER_CONSTRUCTION) continue;
      const project = this.state.getLongTermProjects().find((entry) => entry.zone.id === zone.id);
      if (!project?.unlocked) continue;
      const finding = zone.findings.find((entry) => !entry.found
        && distance(this.player.x, this.player.y, entry.x, entry.y) < 58);
      if (finding) {
        return {
          zoneId: zone.id,
          finding,
          progressText: `${zone.findings.filter((entry) => entry.found).length + 1}/${zone.findings.length} recordações nesta zona.`
        };
      }
    }
    return null;
  }

  getNearbyCompost() {
    return this.mapDecor
      .filter((decor) => decor.type === 'compost')
      .find((compost) => distance(this.player.x, this.player.y, compost.x, compost.y + 4) < 58) || null;
  }

  setupCompostModal() {
    const modal = document.getElementById('modal-compost');
    const rows = document.getElementById('compost-flower-rows');
    const totalLabel = document.getElementById('compost-selected-count');
    const discardButton = document.getElementById('btn-confirm-compost');
    const selectionError = document.getElementById('compost-selection-error');
    const error = document.getElementById('compost-save-error');
    if (!modal || !rows || !totalLabel || !discardButton || !selectionError || !error) return;

    this.compostModal = modal;
    this.compostFlowerRows = rows;
    this.compostSelectedCount = totalLabel;
    this.compostDiscardButton = discardButton;
    this.compostSelectionError = selectionError;
    this.compostSaveError = error;

    modal.addEventListener('click', (event) => {
      if (event.target === modal || event.target.closest('[data-close="modal-compost"]')) {
        this.closeCompostModal();
      }
    });
    rows.addEventListener('input', () => this.updateCompostSelection());
    discardButton.addEventListener('click', () => this.discardSelectedFlowers());
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.classList.contains('hidden')) this.closeCompostModal();
    });
  }

  openCompostModal() {
    if (!this.compostModal || !this.compostFlowerRows || state.basket.length === 0) return;

    const basketCounts = state.basket.reduce((counts, flowerId) => {
      counts[flowerId] = (counts[flowerId] || 0) + 1;
      return counts;
    }, {});
    this.compostFlowerRows.replaceChildren();

    for (const flowerId of FLOWER_ORDER) {
      const available = basketCounts[flowerId] || 0;
      if (available === 0) continue;
      const flower = FLOWERS_CONFIG[flowerId];
      const row = document.createElement('label');
      row.className = 'compost-flower-row';

      const name = document.createElement('span');
      name.className = 'compost-flower-name';
      name.textContent = flower.name;

      const availableLabel = document.createElement('span');
      availableLabel.className = 'compost-flower-available';
      availableLabel.textContent = `${available} na mochila`;

      const input = document.createElement('input');
      input.className = 'compost-flower-quantity';
      input.type = 'number';
      input.min = '0';
      input.max = String(available);
      input.step = '1';
      input.value = '0';
      input.dataset.flowerId = flowerId;
      input.setAttribute('aria-label', `Quantidade de ${flower.name} a descartar; ${available} disponíveis`);

      row.append(name, availableLabel, input);
      this.compostFlowerRows.append(row);
    }

    this.compostSaveError.classList.add('hidden');
    this.compostSelectionError.classList.add('hidden');
    this.updateCompostSelection();
    this.activeKeys.clear();
    this.touchJoystick.active = false;
    this.compostReturnFocus = document.activeElement;
    this.compostModal.classList.remove('hidden');
    this.compostFlowerRows.querySelector('input')?.focus();
  }

  updateCompostSelection() {
    if (!this.compostFlowerRows || !this.compostSelectedCount || !this.compostDiscardButton) return;
    let selected = 0;
    for (const input of this.compostFlowerRows.querySelectorAll('.compost-flower-quantity')) {
      const quantity = Number(input.value);
      const validQuantity = Number.isInteger(quantity)
        && quantity >= 0
        && quantity <= Number(input.max);
      input.setAttribute('aria-invalid', String(!validQuantity));
      if (validQuantity) selected += quantity;
    }
    this.compostSelectedCount.textContent = String(selected);
    this.compostDiscardButton.disabled = selected === 0
      || [...this.compostFlowerRows.querySelectorAll('.compost-flower-quantity')]
        .some((input) => input.getAttribute('aria-invalid') === 'true');
  }

  discardSelectedFlowers() {
    if (!this.compostFlowerRows || !this.compostSaveError || !this.compostSelectionError) return;
    const compost = this.mapDecor.find((decor) => decor.type === 'compost');
    if (!compost) {
      this.compostSelectionError.classList.remove('hidden');
      return;
    }
    const discardCounts = {};
    for (const input of this.compostFlowerRows.querySelectorAll('.compost-flower-quantity')) {
      discardCounts[input.dataset.flowerId] = Number(input.value);
    }

    const discarded = state.discardBasketFlowers(discardCounts);
    if (discarded === null) {
      this.compostSaveError.classList.remove('hidden');
      return;
    }
    if (discarded === 0) {
      this.compostSelectionError.classList.remove('hidden');
      return;
    }
    soundManager.playDeposit();
    soundManager.playDeposit();
    this.particles.emitFloatingText(
      compost.x,
      compost.y - 28,
      `${discarded} ${discarded === 1 ? 'flor descartada' : 'flores descartadas'}`,
      PALETTE.leafGreen
    );
    this.hud.showToast(
      `${discarded} ${discarded === 1 ? 'flor foi entregue' : 'flores foram entregues'} ao compostor`,
      'sprout'
    );
    this.closeCompostModal();
  }

  closeCompostModal() {
    if (!this.compostModal) return;
    this.compostModal.classList.add('hidden');
    if (this.compostReturnFocus instanceof HTMLElement && this.compostReturnFocus.isConnected) {
      this.compostReturnFocus.focus();
    }
  }

  setupSettingsModal() {
    const modalSettings = document.getElementById('modal-settings');
    const openBtn = document.getElementById('btn-open-settings');
    const musicSlider = document.getElementById('music-volume');
    const sfxSlider = document.getElementById('sfx-volume');
    const btnToggleMusic = document.getElementById('btn-toggle-music');
    const btnToggleSfx = document.getElementById('btn-toggle-sfx');
    const checkDayNight = document.getElementById('toggle-daynight');
    const mobileControlLayout = document.getElementById('mobile-control-layout');
    const mobileMoveControlSize = document.getElementById('mobile-move-control-size');
    const mobileActionControlSize = document.getElementById('mobile-action-control-size');
    const mobileControlSaveError = document.getElementById('mobile-control-save-error');
    const nativeDisplaySetting = document.getElementById('native-display-setting');
    const nativeDisplayModeSelect = document.getElementById('native-display-mode');
    const btnReset = document.getElementById('btn-reset-game');
    const storeNameInput = document.getElementById('store-name-input');
    const saveStoreNameBtn = document.getElementById('btn-save-store-name');
    const replayTutorialBtn = document.getElementById('btn-replay-tutorial');
    const customizeHudButton = document.getElementById('btn-customize-hud');
    const settingsTabs = [...document.querySelectorAll('[data-settings-tab]')];
    const settingsPanels = [...document.querySelectorAll('[data-settings-panel]')];
    const settingsTabList = document.querySelector('.settings-tabs');

    const activateSettingsTab = (tabId, focusTab = false) => {
      const selectedTab = settingsTabs.find((tab) => tab.dataset.settingsTab === tabId)
        || settingsTabs[0];
      if (!selectedTab) return;
      settingsTabs.forEach((tab) => {
        const selected = tab === selectedTab;
        tab.classList.toggle('is-active', selected);
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      settingsPanels.forEach((panel) => {
        const selected = panel.dataset.settingsPanel === selectedTab.dataset.settingsTab;
        panel.hidden = !selected;
        panel.classList.toggle('is-active', selected);
      });
      if (selectedTab.dataset.settingsTab === 'appearance') this.refreshThemeSettings?.();
      if (focusTab) selectedTab.focus();
    };

    settingsTabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        soundManager.playClick();
        activateSettingsTab(tab.dataset.settingsTab);
      });
      tab.addEventListener('keydown', (event) => {
        const isVertical = settingsTabList?.getAttribute('aria-orientation') === 'vertical';
        const previousKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
        const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
        let nextIndex = index;
        if (event.key === previousKey) nextIndex = (index - 1 + settingsTabs.length) % settingsTabs.length;
        else if (event.key === nextKey) nextIndex = (index + 1) % settingsTabs.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = settingsTabs.length - 1;
        else return;
        event.preventDefault();
        const nextTab = settingsTabs[nextIndex];
        activateSettingsTab(nextTab.dataset.settingsTab, true);
      });
    });

    const updateSettingsTabOrientation = () => {
      const compact = window.matchMedia('(max-width: 760px), (pointer: coarse), (max-height: 520px)').matches;
      settingsTabList?.setAttribute('aria-orientation', compact ? 'horizontal' : 'vertical');
    };
    updateSettingsTabOrientation();
    window.matchMedia('(max-width: 760px), (pointer: coarse), (max-height: 520px)')
      .addEventListener?.('change', updateSettingsTabOrientation);
    window.addEventListener('resize', updateSettingsTabOrientation);
    this.openSettingsPanel = (tabId = 'general') => {
      if (!modalSettings) return;
      activateSettingsTab(tabId);
      modalSettings.classList.remove('hidden');
    };

    if (storeNameInput) storeNameInput.value = state.storeName || 'FloristEver';
    state.subscribe((event) => {
      if (event === 'store_name_changed' && storeNameInput) {
        storeNameInput.value = state.storeName;
      }
    });

    const saveStoreName = () => {
      const name = storeNameInput?.value.trim();
      if (!name) {
        this.hud.showToast('Escreve um nome antes de guardar', 'book');
        storeNameInput?.focus();
        return;
      }
      state.setStoreName(name);
      storeNameInput.value = state.storeName;
      this.hud.showToast('Nome atualizado na placa da loja', 'check');
    };

    saveStoreNameBtn?.addEventListener('click', saveStoreName);
    storeNameInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveStoreName();
      }
    });

    if (openBtn && modalSettings) {
      openBtn.addEventListener('click', () => {
        soundManager.playClick();
        this.developerTools.refreshAccess();
        this.openSettingsPanel('general');
      });

      modalSettings.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]') || e.target === modalSettings) {
          soundManager.playClick();
          modalSettings.classList.add('hidden');
          openBtn.focus();
        }
      });
    }
    replayTutorialBtn?.addEventListener('click', () => {
      soundManager.playClick();
      modalSettings?.classList.add('hidden');
      this.gameTutorial.open();
    });
    customizeHudButton?.addEventListener('click', () => {
      soundManager.playClick();
      modalSettings?.classList.add('hidden');
      this.activeKeys.clear();
      this.player.setInput(0, 0);
      this.player.hasTarget = false;
      this.hudCustomizer.start();
    });

    if (musicSlider) {
      musicSlider.value = state.settings.musicVolume;
      musicSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        state.settings.musicVolume = val;
        soundManager.setMusicVolume(val);
      });
    }

    if (sfxSlider) {
      sfxSlider.value = state.settings.sfxVolume;
      sfxSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        state.settings.sfxVolume = val;
        soundManager.setSfxVolume(val);
      });
    }

    if (btnToggleMusic) {
      const renderMusicIcon = (muted) => {
        btnToggleMusic.innerHTML = getIcon(muted ? 'soundOff' : 'soundOn');
        btnToggleMusic.setAttribute('aria-label', muted ? 'Ativar música' : 'Silenciar música');
        btnToggleMusic.setAttribute('aria-pressed', String(muted));
      };
      renderMusicIcon(state.settings.musicMuted);
      btnToggleMusic.addEventListener('click', () => {
        const muted = soundManager.toggleMusicMute();
        state.settings.musicMuted = muted;
        renderMusicIcon(muted);
      });
    }

    if (btnToggleSfx) {
      const renderSfxIcon = (muted) => {
        btnToggleSfx.innerHTML = getIcon(muted ? 'soundOff' : 'bell');
        btnToggleSfx.setAttribute('aria-label', muted ? 'Ativar efeitos sonoros' : 'Silenciar efeitos sonoros');
        btnToggleSfx.setAttribute('aria-pressed', String(muted));
      };
      renderSfxIcon(state.settings.sfxMuted);
      btnToggleSfx.addEventListener('click', () => {
        const muted = soundManager.toggleSfxMute();
        state.settings.sfxMuted = muted;
        renderSfxIcon(muted);
      });
    }

    if (checkDayNight) {
      checkDayNight.checked = state.settings.dayNightCycle;
      checkDayNight.addEventListener('change', (e) => {
        state.settings.dayNightCycle = e.target.checked;
      });
    }

    if (mobileControlLayout && mobileMoveControlSize && mobileActionControlSize && mobileControlSaveError) {
      this.applyMobileControlSettings();
      mobileControlLayout.value = state.settings.mobileControlLayout;
      mobileMoveControlSize.value = state.settings.mobileMoveControlSize;
      mobileActionControlSize.value = state.settings.mobileActionControlSize;

      const updateMobileControlSetting = (input, settingName) => {
        const previousValue = state.settings[settingName];
        state.settings[settingName] = input.value;
        this.applyMobileControlSettings();
        if (!state.save()) {
          state.settings[settingName] = previousValue;
          input.value = previousValue;
          this.applyMobileControlSettings();
          mobileControlSaveError.classList.remove('hidden');
          return;
        }
        mobileControlSaveError.classList.add('hidden');
      };

      mobileControlLayout.addEventListener('change', () => {
        updateMobileControlSetting(mobileControlLayout, 'mobileControlLayout');
      });
      mobileMoveControlSize.addEventListener('change', () => {
        updateMobileControlSetting(mobileMoveControlSize, 'mobileMoveControlSize');
      });
      mobileActionControlSize.addEventListener('change', () => {
        updateMobileControlSetting(mobileActionControlSize, 'mobileActionControlSize');
      });
    }

    const nativeDisplayMode = this.getNativeDisplayModeBridge();
    if (nativeDisplayMode && nativeDisplaySetting && nativeDisplayModeSelect) {
      nativeDisplaySetting.classList.remove('hidden');
      this.setupNativeDisplayMode(nativeDisplayMode, nativeDisplayModeSelect);
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('Tens a certeza de que desejas apagar o progresso e começar de novo?')) {
          state.clearProgress();
          location.reload();
        }
      });
    }
  }

  setupThemesModal() {
    const eventPill = document.getElementById('theme-event-pill');
    const reducedEffects = document.getElementById('theme-reduced-effects');
    const saveError = document.getElementById('theme-save-error');
    const luminousInput = document.querySelector('input[name="theme-preference"][value="luminous"]');
    const luminousHelp = document.getElementById('theme-luminous-help');
    const performanceNotice = document.getElementById('theme-performance-notice');
    const preferenceInputs = [...document.querySelectorAll('input[name="theme-preference"]')];
    if (!reducedEffects || !saveError) return;

    this.refreshThemeSettings = () => {
      const preference = themeManager.preference;
      preferenceInputs.forEach((input) => {
        input.checked = input.value === preference;
        input.closest('.theme-option')?.classList.toggle('is-selected', input.checked);
      });
      reducedEffects.checked = state.settings.themeReducedEffects === true;
      if (luminousInput) {
        const unlocked = state.level >= LUMINOUS_GARDEN_UNLOCK_LEVEL;
        luminousInput.disabled = !unlocked;
        luminousInput.closest('.theme-option')?.classList.toggle('is-locked', !unlocked);
        if (luminousHelp) {
          luminousHelp.textContent = unlocked
            ? 'Noite azul-petróleo, flores luminosas e ambiente sereno.'
            : `Desbloqueia ao atingir o nível ${LUMINOUS_GARDEN_UNLOCK_LEVEL}.`;
        }
      }
      performanceNotice?.classList.toggle('hidden', !themeManager.performanceFallback);
      saveError.classList.add('hidden');
    };

    eventPill?.addEventListener('click', () => {
      const menuItems = document.getElementById('hud-menu-items');
      const menuToggle = document.getElementById('btn-toggle-hud-menu');
      menuItems?.classList.remove('is-open');
      menuToggle?.setAttribute('aria-expanded', 'false');
      this.openSettingsPanel?.('appearance');
      document.getElementById('settings-tab-appearance')?.focus();
    });
    this.refreshThemeSettings();

    preferenceInputs.forEach((input) => {
      input.addEventListener('change', () => {
        if (!THEME_PREFERENCES.includes(input.value)) return;
        const saved = themeManager.setPreference(input.value);
        saveError.classList.toggle('hidden', saved);
        if (!saved) {
          preferenceInputs.forEach((option) => {
            option.checked = option.value === themeManager.preference;
            option.closest('.theme-option')?.classList.toggle('is-selected', option.checked);
          });
        } else {
          preferenceInputs.forEach((option) => {
            option.closest('.theme-option')?.classList.toggle('is-selected', option.checked);
          });
        }
      });
    });

    reducedEffects.addEventListener('change', () => {
      const saved = themeManager.setReducedEffects(reducedEffects.checked);
      saveError.classList.toggle('hidden', saved);
      if (!saved) reducedEffects.checked = state.settings.themeReducedEffects === true;
    });
  }

  getNativeDisplayModeBridge() {
    if (window.floristDesktop?.displayMode) {
      return window.floristDesktop.displayMode;
    }

    const capacitor = window.Capacitor;
    if (capacitor?.isNativePlatform?.() && capacitor.registerPlugin) {
      return capacitor.registerPlugin('DisplayMode');
    }

    return null;
  }

  async setupNativeDisplayMode(displayMode, select) {
    const validModes = new Set(['fullscreen', 'borderless', 'windowed']);
    const labelForMode = {
      fullscreen: 'Tela Cheia',
      borderless: 'Janela Cheia',
      windowed: 'Janela'
    };

    try {
      const { mode } = await displayMode.getMode();
      if (!validModes.has(mode)) {
        throw new Error(`O modo de ecrã nativo devolveu um valor inválido: ${mode}`);
      }
      select.value = mode;
      document.body.dataset.nativeDisplayMode = mode;
    } catch (error) {
      console.error('Não foi possível carregar o modo de ecrã nativo:', error);
      this.hud.showToast('Não foi possível carregar o modo de ecrã', 'book');
      return;
    }

    select.addEventListener('change', async () => {
      const requestedMode = select.value;
      if (!validModes.has(requestedMode)) {
        console.error(`Modo de ecrã nativo inválido: ${requestedMode}`);
        return;
      }

      select.disabled = true;
      try {
        const result = await displayMode.setMode({ mode: requestedMode });
        if (!validModes.has(result.mode)) {
          throw new Error(`O modo de ecrã nativo devolveu um valor inválido: ${result.mode}`);
        }
        select.value = result.mode;
        document.body.dataset.nativeDisplayMode = result.mode;
        this.hud.showToast(`Modo aplicado: ${labelForMode[result.mode]}`, 'check');
      } catch (error) {
        console.error('Não foi possível alterar o modo de ecrã nativo:', error);
        this.hud.showToast('Não foi possível alterar o modo de ecrã', 'book');
        try {
          const { mode } = await displayMode.getMode();
          if (validModes.has(mode)) {
            select.value = mode;
            document.body.dataset.nativeDisplayMode = mode;
          }
        } catch (restoreError) {
          console.error('Não foi possível restaurar a seleção do modo de ecrã:', restoreError);
        }
      } finally {
        select.disabled = false;
      }
    });
  }

  setupStartMenu() {
    const startOverlay = document.getElementById('start-overlay');
    const loadingScreen = document.getElementById('loading-screen');
    const loadingLogo = document.getElementById('loading-brand-logo');
    const loadingLogoFallback = document.getElementById('loading-brand-fallback');
    const storeNameInput = document.getElementById('onboarding-store-name');
    const termsCheckbox = document.getElementById('onboarding-terms-accepted');
    const status = document.getElementById('onboarding-status');
    const options = document.getElementById('onboarding-entry-options');
    const accountSection = document.getElementById('onboarding-account-section');
    const accountButton = document.getElementById('btn-onboarding-account');
    const guestButton = document.getElementById('btn-play-guest');
    const accountBackButton = document.getElementById('btn-onboarding-account-back');
    const termsModal = document.getElementById('modal-terms');
    const termsDocument = document.getElementById('terms-document');

    if (loadingLogo && loadingLogoFallback) {
      const showLogoFallback = () => {
        loadingLogo.classList.add('hidden');
        loadingLogoFallback.classList.remove('hidden');
      };
      loadingLogo.addEventListener('error', showLogoFallback, { once: true });
      if (loadingLogo.complete && loadingLogo.naturalWidth === 0) showLogoFallback();
    }

    if (loadingScreen) {
      window.setTimeout(() => {
        loadingScreen.classList.add('hidden');
        loadingScreen.setAttribute('aria-busy', 'false');
      }, 500);
    }

    if (startOverlay) {
      let started = false;
      const startGame = () => {
        if (started) return;
        const name = selectedStoreName();
        if (!name) return;
        state.setStoreName(name);
        try {
          localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
        } catch (error) {
          console.error('Não foi possível guardar a conclusão da integração:', error);
          this.hud.showToast('Não foi possível guardar a conclusão da integração neste dispositivo.', 'error');
        }
        started = true;
        this.unlockAudio();
        soundManager.playClick();
        startOverlay.classList.add('hidden');
        this.gameTutorial.startIfNeeded();
      };
      const hasAcceptedCurrentTerms = () => {
        try {
          const acceptance = JSON.parse(localStorage.getItem(TERMS_ACCEPTANCE_KEY) || 'null');
          return acceptance?.version === TERMS_VERSION;
        } catch (error) {
          console.warn('Não foi possível validar a aceitação dos Termos guardada:', error);
          return false;
        }
      };
      const showStatus = (message, type = 'error') => {
        if (!status) return;
        status.textContent = message;
        status.dataset.type = type;
      };
      const selectedStoreName = () => {
        const name = storeNameInput?.value.trim().replace(/\s+/g, ' ');
        if (!name || name.length > 28 || /[\u0000-\u001F\u007F]/.test(name)) {
          showStatus('Escreve um nome de loja válido, com até 28 caracteres.');
          storeNameInput?.focus();
          return null;
        }
        return name;
      };
      const acceptTerms = () => {
        if (!termsCheckbox?.checked) {
          showStatus('Tens de aceitar os Termos e Condições e a Política de Privacidade para continuar.');
          termsCheckbox?.focus();
          return false;
        }
        const name = selectedStoreName();
        if (!name) return false;
        try {
          localStorage.setItem(TERMS_ACCEPTANCE_KEY, JSON.stringify({
            version: TERMS_VERSION,
            acceptedAt: new Date().toISOString()
          }));
        } catch (error) {
          console.error('Não foi possível guardar a aceitação dos Termos:', error);
          showStatus('Não foi possível registar a aceitação dos Termos neste dispositivo. Verifica o armazenamento e tenta novamente.');
          return false;
        }
        state.setStoreName(name);
        this.onboardingAccountUi.client.syncEnabled = true;
        return true;
      };
      this.acceptOnboardingTerms = acceptTerms;
      this.finishOnboarding = startGame;

      if (storeNameInput) storeNameInput.value = state.storeName || '';
      if (hasAcceptedCurrentTerms()) {
        try {
          const onboardingCompleted = localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
          if (onboardingCompleted || this.hasLoadedProgress) {
            if (!onboardingCompleted) {
              localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
            }
            startOverlay.classList.add('hidden');
            this.gameTutorial.startIfNeeded();
          }
        } catch (error) {
          console.error('Não foi possível restaurar a conclusão da integração:', error);
        }
      }

      guestButton?.addEventListener('click', () => {
        if (!acceptTerms()) return;
        this.onboardingAccountUi.client.syncEnabled = false;
        this.onboardingAccountUi.client.user = null;
        startGame();
      });

      accountButton?.addEventListener('click', async () => {
        if (!acceptTerms()) return;
        options?.classList.add('hidden');
        accountSection?.classList.remove('hidden');
        showStatus('');
        if (this.onboardingAccountUi.client.accessToken) {
          await this.onboardingAccountUi.bootstrap();
        } else {
          this.onboardingAccountUi.formEl?.querySelector('input')?.focus();
        }
      });

      accountBackButton?.addEventListener('click', () => {
        accountSection?.classList.add('hidden');
        options?.classList.remove('hidden');
        showStatus('');
      });

      document.getElementById('btn-view-terms')?.addEventListener('click', async () => {
        if (!termsModal || !termsDocument) return;
        termsModal.classList.remove('hidden');
        termsDocument.focus();
        if (termsDocument.dataset.loaded === 'true') return;
        termsDocument.textContent = 'A carregar os Termos e Condições...';
        try {
          const response = await fetch('./FloristEver_Termos_e_Condicoes.md', { cache: 'no-cache' });
          if (!response.ok) throw new Error(`Pedido dos Termos falhou (${response.status}).`);
          renderTermsDocument(await response.text(), termsDocument);
          termsDocument.dataset.loaded = 'true';
        } catch (error) {
          console.error('Não foi possível carregar os Termos e Condições:', error);
          termsDocument.textContent = 'Não foi possível carregar os Termos e Condições. Verifica a ligação ou tenta novamente.';
        }
      });

      const closeTerms = () => termsModal?.classList.add('hidden');
      document.getElementById('btn-close-terms')?.addEventListener('click', closeTerms);
      termsModal?.addEventListener('click', (event) => {
        if (event.target === termsModal) closeTerms();
      });
      termsModal?.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeTerms();
      });

    }
  }

  setupServiceWorkerUpdatePrompt() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;

    const banner = document.getElementById('update-app-banner');
    const updateBtn = document.getElementById('btn-update-app');
    let reloadWhenControllerChanges = false;

    const showBanner = () => {
      if (banner) banner.classList.remove('hidden');
      document.body.classList.add('has-app-update');
    };

    const hideBanner = () => {
      if (banner) banner.classList.add('hidden');
      document.body.classList.remove('has-app-update');
    };

    const activateWaitingWorker = (registration) => {
      if (!registration.waiting) return false;
      state.save();
      if (updateBtn) {
        updateBtn.disabled = true;
        updateBtn.textContent = 'A atualizar...';
      }
      reloadWhenControllerChanges = true;
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return true;
    };

    const refreshApp = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration('./sw.js');
        if (!registration) {
          console.warn('Não foi encontrado um registo do service worker para atualizar.');
          return;
        }
        if (activateWaitingWorker(registration)) return;

        if (updateBtn) {
          updateBtn.disabled = true;
          updateBtn.textContent = 'A verificar...';
        }
        await registration.update();
        if (!activateWaitingWorker(registration) && updateBtn) {
          updateBtn.disabled = false;
          updateBtn.textContent = 'Verificar novamente';
        }
      } catch (err) {
        console.error('Não foi possível verificar a atualização da app:', err);
        if (updateBtn) {
          updateBtn.disabled = false;
          updateBtn.textContent = 'Tentar novamente';
        }
      }
    };

    if (updateBtn) {
      updateBtn.addEventListener('click', refreshApp);
    }

    window.addEventListener('focus', async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration('./sw.js');
        if (registration) await registration.update();
      } catch (err) {
        console.warn('Não foi possível verificar atualizações ao regressar à app:', err);
      }
    });

    navigator.serviceWorker.register('./sw.js').then((registration) => {
      registration.update().catch((err) => {
        console.warn('Não foi possível verificar atualizações do service worker:', err);
      });

      if (registration.waiting) {
        showBanner();
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showBanner();
            if (updateBtn) {
              updateBtn.disabled = false;
              updateBtn.textContent = 'Atualizar app';
            }
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        hideBanner();
        if (reloadWhenControllerChanges) window.location.reload();
      });
    }).catch((err) => {
      console.error('Não foi possível registar o service worker:', err);
    });
  }

  setupConnectionStatus() {
    const status = document.getElementById('connection-status');
    if (!status) return;

    let hideOnlineStatusTimer;
    const showStatus = (message, stateName) => {
      status.textContent = message;
      status.dataset.state = stateName;
      status.classList.remove('hidden');
    };
    const handleOffline = () => {
      window.clearTimeout(hideOnlineStatusTimer);
      showStatus(
        'Sem ligação à internet. O progresso fica guardado neste dispositivo; conta e sincronização ficam indisponíveis.',
        'offline'
      );
    };
    const handleOnline = () => {
      showStatus('Ligação restabelecida. A verificar a sincronização do progresso...', 'online');
      if (this.accountUi.client.accessToken) {
        const sync = this.accountUi.client.user
          ? this.accountUi.syncNow({ silent: true })
          : this.accountUi.bootstrap();
        sync.catch((error) => console.warn('Não foi possível retomar a sincronização:', error));
      }
      window.clearTimeout(hideOnlineStatusTimer);
      hideOnlineStatusTimer = window.setTimeout(() => {
        if (navigator.onLine) status.classList.add('hidden');
      }, 5000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    if (!navigator.onLine) handleOffline();
  }

  showOfflineModal(coinsGained) {
    const modal = document.getElementById('modal-welcome');
    const amountEl = document.getElementById('offline-earned-amount');
    const amountValueEl = document.getElementById('offline-earned-value');
    const acceptBtn = document.getElementById('btn-welcome-accept');

    if (modal && amountEl && amountValueEl) {
      amountValueEl.textContent = `+${coinsGained}`;
      modal.classList.remove('hidden');

      if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
          soundManager.playCoin();
          modal.classList.add('hidden');
        }, { once: true });
      }
    }
  }

  setupAutosave() {
    // Autosave periódico a cada 10 segundos
    setInterval(() => {
      state.save();
    }, 10000);

    const saveProgress = () => {
      state.save();
    };

    window.addEventListener('pagehide', saveProgress);
    window.addEventListener('beforeunload', saveProgress);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveProgress();
    });
  }

  // Loop Principal com Delta Time
  gameLoop(timestamp) {
    let dt = (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;

    // Clamp para evitar saltos enormes quando o utilizador muda de separador
    if (dt > 0.1) dt = 0.1;

    if (!this.gameTutorial?.isOpen() && !this.hudCustomizer?.draft) this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt) {
    this.gameTime += dt;
    this.challengeRefreshTimer += dt;
    if (this.challengeRefreshTimer >= 5) {
      this.challengeRefreshTimer %= 5;
      this.state.getChallenges();
    }
    state.processPayroll();
    const fieldBounds = this.fieldManager.getMapAreaBounds();
    const greenhouse = this.state.getLongTermProjects()
      .find((project) => project.zone.id === 'greenhouse')?.zone;
    this.mapBounds.minX = greenhouse ? Math.min(40, greenhouse.x - 340) : 40;
    this.mapBounds.maxX = Math.max(2800, fieldBounds.right + 80);
    this.mapBounds.maxY = Math.max(1200, fieldBounds.bottom + 80);

    // Atualização de teclado para movimento do jogador
    const compostModalOpen = this.compostModal && !this.compostModal.classList.contains('hidden');
    if (this.hudCustomizer?.draft || compostModalOpen) {
      this.player.setInput(0, 0);
    } else if (!this.touchJoystick.active) {
      let dx = 0;
      let dy = 0;
      if (this.activeKeys.has('KeyW') || this.activeKeys.has('ArrowUp')) dy -= 1;
      if (this.activeKeys.has('KeyS') || this.activeKeys.has('ArrowDown')) dy += 1;
      if (this.activeKeys.has('KeyA') || this.activeKeys.has('ArrowLeft')) dx -= 1;
      if (this.activeKeys.has('KeyD') || this.activeKeys.has('ArrowRight')) dx += 1;
      this.player.setInput(dx, dy);
    }

    const didMoveBefore = this.player.isWalking;

    // Atualiza jogador
    const speedMult = state.getPlayerSpeedMultiplier();
    const collisionObstacles = this.getPlayerCollisionObstacles();
    this.player.update(
      dt,
      speedMult,
      this.mapBounds,
      (x, y) => this.canPlayerOccupy(x, y, collisionObstacles)
    );

    if (this.player.isWalking && !didMoveBefore) {
      this.tutorial.markPlayerMoved();
    }

    // Colheita automática de flores sob o jogador
    this.fieldManager.checkPlayerHarvest(this.player.x, this.player.y);

    // Descarregamento de flores no balcão da loja quando próximo
    const counterCenter = {
      x: this.counter.x + this.counter.width / 2,
      y: this.counter.y + this.counter.height / 2
    };
    const distToCounter = distance(this.player.x, this.player.y, counterCenter.x, counterCenter.y);

    if (distToCounter < 75 && state.basket.length > 0) {
      const unloaded = state.unloadBasketToStock();
      if (unloaded > 0) {
        soundManager.playDeposit();
        this.particles.emitFloatingText(this.counter.x + 40, this.counter.y - 10, `+${unloaded} Flores no Stock`, PALETTE.leafGreen);
      }
      if (state.basket.length > 0 && !this.stockCapacityNoticeShown) {
        this.hud.showToast('A loja está cheia. As flores restantes ficam no cesto até haver espaço.', 'basket');
        this.stockCapacityNoticeShown = true;
      }
    } else {
      this.stockCapacityNoticeShown = false;
    }

    // Atualiza indicador de atendimento manual
    const nearbyCompost = this.getNearbyCompost();
    const nearbyBench = this.getNearbyBench();
    const canServeManually = !state.isEmployeeActive('cashier')
      && distToCounter < 85
      && this.customerManager.hasWaitingCustomer();
    this.hud.setInteractionPrompt(
      this.player.isSeated || (nearbyCompost && state.basket.length > 0) || nearbyBench || canServeManually,
      this.player.isSeated
        ? 'Levantar-se'
        : nearbyCompost && state.basket.length > 0
          ? 'Escolher flores para o compostor'
          : nearbyBench
            ? 'Sentar no banco'
            : 'Atender Cliente'
    );

    // Atualiza entidades
    this.fieldManager.update(dt);
    this.workerManager.update(dt, this.fieldManager);
    this.bouquetWorkerManager.update(dt);
    this.customerManager.update(dt);
    const readyFlowers = state.plots.reduce((total, plot) => {
      if (!plot.unlocked) return total;
      return total + plot.flowers.filter((flower) => flower?.progress >= 1).length;
    }, 0);
    const waitingCustomers = this.customerManager.customers.filter((customer) => customer.state === 'waiting');
    const missingStockOrders = waitingCustomers.filter((customer) => {
      const requestedCounts = customer.requestedFlowers.reduce((counts, flowerId) => {
        counts[flowerId] = (counts[flowerId] || 0) + 1;
        return counts;
      }, {});
      return Object.entries(requestedCounts).some(([flowerId, amount]) => {
        return (state.stock[flowerId] || 0) < amount;
      });
    });
    this.hud.updateWorldIndicators(readyFlowers, waitingCustomers.length, missingStockOrders.length);
    this.particles.update(dt);

    // Atualiza borboletas e abelhas de ambientação
    this.updateAmbientCreatures(dt);

    // Atualiza câmara suave centrada no jogador
    this.camera.targetX = this.player.x;
    this.camera.targetY = this.player.y;
    this.camera.x = lerp(this.camera.x, this.camera.targetX, 5.0 * dt);
    this.camera.y = lerp(this.camera.y, this.camera.targetY, 5.0 * dt);
  }

  updateAmbientCreatures(dt) {
    for (const c of this.ambientCreatures) {
      if (themeManager.activeTheme && themeManager.effectsReduced) {
        c.x = c.baseX;
        c.y = c.baseY;
        continue;
      }
      c.phase += dt * 3;
      if (c.type === 'butterfly') {
        c.x = c.baseX + Math.sin(c.phase * 0.7) * 45;
        c.y = c.baseY + Math.cos(c.phase * 0.5) * 35;
      } else {
        c.x = c.baseX + Math.sin(c.phase * 1.2) * 25;
        c.y = c.baseY + Math.cos(c.phase * 0.9) * 20;
      }
    }
  }

  render() {
    const viewW = document.documentElement.clientWidth || window.innerWidth;
    const viewH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    themeManager.beginFrame();

    this.ctx.clearRect(0, 0, viewW, viewH);

    this.ctx.save();
    // Centra a câmara na tela com zoom
    this.ctx.translate(viewW / 2, viewH / 2);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);
    const zoom = Math.max(this.camera.zoom, 0.1);
    this.visibleWorldBounds = {
      left: this.camera.x - viewW / (2 * zoom),
      right: this.camera.x + viewW / (2 * zoom),
      top: this.camera.y - viewH / (2 * zoom),
      bottom: this.camera.y + viewH / (2 * zoom)
    };

    // 1. Fundo do Terreno e Relva Acolhedora
    this.renderTerrain();
    themeManager.drawLayer(
      this.ctx,
      'drawGardenLayer',
      this.mapBounds,
      themeManager.effectsReduced,
      this.gameTime
    );

    // 2. Caminhos de Terra Batida
    this.renderPaths();
    this.renderGreenhouseVegetation();
    this.renderFieldFence();
    const visibleDecorations = this.getVisibleMapDecorations();
    this.renderMapDecor(visibleDecorations);
    this.renderExpansionZones();
    this.renderZoneFindings();
    themeManager.drawLayer(this.ctx, 'drawGardenDecor', visibleDecorations);

    // 3. Edifício da Loja e Balcão
    const shopBounds = this.getShopBuildingBounds();
    if (this.isWorldRectVisible(
      shopBounds.x - 220,
      shopBounds.y - 20,
      shopBounds.x + shopBounds.width + 220,
      shopBounds.y + shopBounds.height + 320
    )) {
      const decorLevel = state.upgrades.shopDecor || 0;
      assetManager.drawShopBuilding(
        this.ctx,
        shopBounds.x,
        shopBounds.y,
        shopBounds.width,
        shopBounds.height,
        decorLevel,
        state.storeName,
        state.upgrades.shopExpansion || 0
      );
      themeManager.drawLayer(this.ctx, 'drawShopDecor', shopBounds.x, shopBounds.y, shopBounds.width, shopBounds.height);
      this.renderShopStockSign();
      this.renderHerbariumExhibitions();
    }

    const hasCashier = state.isEmployeeActive('cashier');
    if (this.isWorldRectVisible(
      this.counter.x,
      this.counter.y - 12,
      this.counter.x + this.counter.width,
      this.counter.y + this.counter.height + 15
    )) {
      assetManager.drawCounter(
        this.ctx,
        this.counter.x,
        this.counter.y,
        this.counter.width,
        this.counter.height,
        hasCashier
      );
    }

    // 4. Parcelas e Flores
    this.fieldManager.draw(this.ctx, this.visibleWorldBounds);

    // 5. Clientes
    this.customerManager.draw(this.ctx, this.visibleWorldBounds);

    // 6. Ajudantes Colhedores
    this.workerManager.draw(this.ctx, this.visibleWorldBounds);
    this.bouquetWorkerManager.draw(this.ctx, this.visibleWorldBounds);

    // 7. Jogador
    const cap = state.getBasketCapacity();
    this.player.draw(this.ctx, state.basket.length, cap);

    // 8. Árvores e Elementos de Ambientação
    for (const tree of this.trees) {
      if (!this.isWorldRectVisible(tree.x - 52, tree.y - 52, tree.x + 52, tree.y + 52)) continue;
      const coversPlot = this.state.plots.some((plot) => {
        const position = this.fieldManager.getPlotWorldPos(plot.gridX, plot.gridY);
        return tree.x + 48 >= position.x && tree.x - 48 <= position.x + this.fieldManager.plotWidth
          && tree.y + 48 >= position.y && tree.y - 48 <= position.y + this.fieldManager.plotHeight;
      });
      if (coversPlot) continue;
      assetManager.drawTree(this.ctx, tree.x, tree.y, this.gameTime, themeManager.getTreePalette(tree.x, tree.y));
    }

    for (const c of this.ambientCreatures) {
      if (!this.isWorldRectVisible(c.x - 50, c.y - 45, c.x + 50, c.y + 45)) continue;
      if (themeManager.activeTheme) {
        themeManager.drawLayer(this.ctx, 'drawAmbient', c.type, c.x, c.y, c.phase, c.color, themeManager.effectsReduced);
      } else if (c.type === 'butterfly') {
        assetManager.drawButterfly(this.ctx, c.x, c.y, c.phase, c.color);
      } else {
        assetManager.drawBee(this.ctx, c.x, c.y, c.phase);
      }
    }

    // 9. Partículas (Pétalas, Moedas, Corações)
    this.particles.draw(this.ctx, this.visibleWorldBounds);

    this.ctx.restore();

    const dayNightLighting = state.settings.dayNightCycle
      ? getDayNightLighting(this.gameTime)
      : null;
    themeManager.drawLayer(this.ctx, 'drawAtmosphere', viewW, viewH, dayNightLighting);

    // 10. Ciclo completo de dia, pôr do sol, noite e alvorada em todos os temas.
    if (dayNightLighting) this.renderDayNightOverlay(viewW, viewH, dayNightLighting);
    this.drawMinimap();
  }

  drawMinimap() {
    const canvas = document.getElementById('minimap-canvas');
    const panel = document.getElementById('map-panel');
    if (!canvas || !panel || panel.classList.contains('hidden')) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width <= 0 || height <= 0) return;
    const pixelRatio = getCanvasPixelRatio(width, height, window.devicePixelRatio);
    const pixelWidth = Math.round(width * pixelRatio);
    const pixelHeight = Math.round(height * pixelRatio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    ctx.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const palette = themeManager.palette;
    const inset = 7;
    const worldWidth = this.mapBounds.maxX - this.mapBounds.minX;
    const worldHeight = this.mapBounds.maxY;
    const mapX = (x) => inset + (x - this.mapBounds.minX) / worldWidth * (width - inset * 2);
    const mapY = (y) => inset + y / worldHeight * (height - inset * 2);
    const mapWidth = (value) => value / worldWidth * (width - inset * 2);
    const mapHeight = (value) => value / worldHeight * (height - inset * 2);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.minimapGrass || palette.grassLight;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = palette.pathSurface || '#E8C96F';
    ctx.beginPath();
    ctx.roundRect(mapX(0), mapY(185), mapWidth(440), mapHeight(62), 5);
    ctx.fill();
    const fieldBounds = this.fieldManager.getMapAreaBounds();
    ctx.beginPath();
    ctx.roundRect(
      mapX(fieldBounds.left),
      mapY(fieldBounds.top),
      mapWidth(fieldBounds.right - fieldBounds.left),
      mapHeight(fieldBounds.bottom - fieldBounds.top),
      5
    );
    ctx.fill();
    const { maxGridX, maxGridY } = this.fieldManager.getGridBounds();
    const plotStepX = this.fieldManager.plotWidth + this.fieldManager.gapX;
    const plotStepY = this.fieldManager.plotHeight + this.fieldManager.gapY;
    const fieldRight = this.fieldManager.originX + maxGridX * plotStepX + this.fieldManager.plotWidth;
    const fieldBottom = this.fieldManager.originY + maxGridY * plotStepY + this.fieldManager.plotHeight;
    const roadLeftX = this.fieldManager.originX - 50;
    const roadRightX = fieldRight + 24;
    const roadBottomY = fieldBottom + 24;
    const mapPath = new Path2D();
    mapPath.moveTo(mapX(0), mapY(218));
    mapPath.lineTo(mapX(roadLeftX), mapY(218));
    mapPath.lineTo(mapX(roadLeftX), mapY(roadBottomY));
    mapPath.lineTo(mapX(roadRightX), mapY(roadBottomY));
    mapPath.lineTo(mapX(roadRightX), mapY(444));
    mapPath.quadraticCurveTo(mapX(roadRightX), mapY(420), mapX(roadRightX + 24), mapY(420));
    const greenhouse = this.state.getLongTermProjects()
      .find((project) => project.zone.id === 'greenhouse')?.zone;
    if (greenhouse) {
      mapPath.moveTo(mapX(roadLeftX), mapY(218));
      mapPath.bezierCurveTo(
        mapX(150), mapY(235),
        mapX(0), mapY(300),
        mapX(-180), mapY(320)
      );
      mapPath.bezierCurveTo(
        mapX(-420), mapY(345),
        mapX(-540), mapY(280),
        mapX(-690), mapY(365)
      );
      mapPath.bezierCurveTo(
        mapX(-650), mapY(410),
        mapX(-650), mapY(480),
        mapX(-690), mapY(520)
      );
      mapPath.bezierCurveTo(
        mapX(-690), mapY(590),
        mapX(-780), mapY(650),
        mapX(-900), mapY(650)
      );
      mapPath.bezierCurveTo(
        mapX(-900), mapY(640),
        mapX(-900), mapY(600),
        mapX(greenhouse.x), mapY(greenhouse.y + 125)
      );
    }

    const pathSegments = getGardenPathSegments(this.state.plots, {
      originX: this.fieldManager.originX,
      originY: this.fieldManager.originY,
      plotWidth: this.fieldManager.plotWidth,
      plotHeight: this.fieldManager.plotHeight,
      gapX: this.fieldManager.gapX,
      gapY: this.fieldManager.gapY,
      leftExtent: roadLeftX,
      rightExtent: fieldRight
    });
    const gardenPath = new Path2D();
    for (const path of [...pathSegments.vertical, ...pathSegments.horizontal]) {
      const centerX = path.x + path.width / 2;
      const centerY = path.y + path.height / 2;
      if (path.width < path.height) {
        gardenPath.moveTo(mapX(centerX), mapY(path.y));
        gardenPath.lineTo(mapX(centerX), mapY(path.y + path.height));
      } else {
        gardenPath.moveTo(mapX(path.x), mapY(centerY));
        gardenPath.lineTo(mapX(path.x + path.width), mapY(centerY));
      }
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 1;
    ctx.strokeStyle = palette.pathEarth || '#986947';
    ctx.lineWidth = Math.max(2, mapWidth(58));
    ctx.stroke(mapPath);
    ctx.lineWidth = Math.max(2, mapWidth(36));
    ctx.stroke(gardenPath);
    ctx.strokeStyle = palette.pathSoil || '#BF9462';
    ctx.lineWidth = Math.max(2, mapWidth(50));
    ctx.stroke(mapPath);
    ctx.lineWidth = Math.max(2, mapWidth(34));
    ctx.stroke(gardenPath);
    ctx.strokeStyle = palette.pathSurface || '#D7BF8B';
    ctx.lineWidth = Math.max(1, mapWidth(42));
    ctx.stroke(mapPath);
    ctx.lineWidth = Math.max(1, mapWidth(32));
    ctx.stroke(gardenPath);
    ctx.restore();

    ctx.fillStyle = palette.minimapShop || palette.earthBrown;
    const shopBounds = this.getShopBuildingBounds();
    ctx.fillRect(mapX(shopBounds.x), mapY(shopBounds.y), mapWidth(shopBounds.width), mapHeight(shopBounds.height));
    ctx.fillStyle = palette.minimapCounter || palette.sunYellow;
    ctx.fillRect(mapX(this.counter.x), mapY(this.counter.y), Math.max(3, mapWidth(this.counter.width)), Math.max(2, mapHeight(this.counter.height)));

    for (const plot of this.state.plots) {
      const position = this.fieldManager.getPlotWorldPos(plot.gridX, plot.gridY);
      ctx.fillStyle = plot.unlocked ? (palette.minimapPlot || palette.leafGreen) : '#F7C948';
      ctx.fillRect(mapX(position.x), mapY(position.y), mapWidth(this.fieldManager.plotWidth), mapHeight(this.fieldManager.plotHeight));
      ctx.strokeStyle = plot.unlocked ? (palette.minimapPlotBorder || palette.deepGreen) : '#A36A13';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(mapX(position.x), mapY(position.y), mapWidth(this.fieldManager.plotWidth), mapHeight(this.fieldManager.plotHeight));
    }

    for (const project of this.state.getLongTermProjects()) {
      if (project.zone.id !== 'greenhouse') continue;
      const zone = project.zone;
      ctx.fillStyle = GREENHOUSE_UNDER_CONSTRUCTION ? '#9A8C74' : (project.unlocked ? '#5FA36B' : '#9A8C74');
      ctx.beginPath();
      ctx.arc(mapX(zone.x), mapY(zone.y), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFDF8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    const viewW = document.documentElement.clientWidth || window.innerWidth;
    const viewH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const visibleWorldWidth = viewW / this.camera.zoom;
    const visibleWorldHeight = viewH / this.camera.zoom;
    ctx.strokeStyle = palette.minimapView || 'rgba(47, 93, 74, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      mapX(this.camera.x - visibleWorldWidth / 2),
      mapY(this.camera.y - visibleWorldHeight / 2),
      mapWidth(visibleWorldWidth),
      mapHeight(visibleWorldHeight)
    );

    ctx.beginPath();
    ctx.arc(mapX(this.player.x), mapY(this.player.y), 4, 0, Math.PI * 2);
    ctx.fillStyle = palette.minimapPlayer || palette.raspberryPink;
    ctx.fill();
    ctx.strokeStyle = '#FFFDF8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  renderMapZoneDestinations() {
    const container = document.getElementById('map-zone-destinations');
    if (!container) return;
    container.replaceChildren();

    for (const project of this.state.getLongTermProjects()) {
      if (project.zone.id !== 'greenhouse') continue;
      const destination = document.createElement('div');
      const available = project.unlocked && !GREENHOUSE_UNDER_CONSTRUCTION;
      destination.className = `map-zone-destination${available ? ' is-unlocked' : ''}`;
      const title = document.createElement('strong');
      title.textContent = project.zone.name;
      const status = document.createElement('span');
      status.textContent = GREENHOUSE_UNDER_CONSTRUCTION
        ? 'Em Breve disponível'
        : project.unlocked
        ? 'Zona pronta para explorar'
        : `Projeto: ${project.progress.filter((item) => item.current >= item.target).length}/${project.progress.length} metas`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn-secondary';
      button.textContent = GREENHOUSE_UNDER_CONSTRUCTION ? 'Em breve' : (project.unlocked ? 'Viajar' : 'Bloqueada');
      button.disabled = !available;
      button.addEventListener('click', () => {
        if (this.travelToZone(project.zone.id)) {
          document.getElementById('map-panel')?.classList.add('hidden');
          document.body.classList.remove('map-open');
          document.getElementById('btn-toggle-map')?.setAttribute('aria-expanded', 'false');
        }
      });
      destination.append(title, status, button);
      container.appendChild(destination);
    }
  }

  renderTerrain() {
    const palette = themeManager.palette;
    const visible = this.visibleWorldBounds;

    // Draw only the camera viewport; canvas clipping handles the screen edges.
    this.ctx.fillStyle = palette.grassLight;
    this.ctx.fillRect(
      visible.left - 2,
      visible.top - 2,
      visible.right - visible.left + 4,
      visible.bottom - visible.top + 4
    );

    const fieldBounds = this.fieldManager.getMapAreaBounds();
    const maxX = Math.max(this.mapBounds.maxX, fieldBounds.right);
    const maxY = Math.max(this.mapBounds.maxY, fieldBounds.bottom);

    // Variações de relva subtis para quebrar o fundo sem competir com os canteiros.
    const firstPatchX = 130 + Math.max(0, Math.ceil((visible.left - 125 - 130) / 245)) * 245;
    const firstPatchY = 125 + Math.max(0, Math.ceil((visible.top - 125 - 125) / 215)) * 215;
    const lastPatchX = Math.min(maxX, visible.right + 125);
    const lastPatchY = Math.min(maxY, visible.bottom + 125);
    for (let x = firstPatchX; x < lastPatchX; x += 245) {
      for (let y = firstPatchY; y < lastPatchY; y += 215) {
        const offsetX = (x * 7 + y * 3) % 72;
        const offsetY = (y * 5 + x * 2) % 58;
        this.ctx.beginPath();
        this.ctx.ellipse(x + offsetX, y + offsetY, 48, 28, (x % 3) * 0.12, 0, Math.PI * 2);
        this.ctx.fillStyle = (x + y) % 2 === 0
          ? (palette.terrainPatchLight || 'rgba(255, 246, 229, 0.12)')
          : (palette.terrainPatchDark || 'rgba(95, 163, 107, 0.09)');
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.ellipse(x + offsetX + 35, y + offsetY + 20, 22, 12, 0.2, 0, Math.PI * 2);
        this.ctx.fillStyle = palette.terrainPatchAccent || 'rgba(247, 201, 72, 0.07)';
        this.ctx.fill();
      }
    }

    // Pequenas tufas de relva distribuídas também pelas expansões.
    this.ctx.fillStyle = palette.terrainTuft || 'rgba(47, 93, 74, 0.32)';
    const firstTuftX = 120 + Math.max(0, Math.ceil((visible.left - 60 - 120) / 140)) * 140;
    const firstTuftY = 100 + Math.max(0, Math.ceil((visible.top - 60 - 100) / 120)) * 120;
    const lastTuftX = Math.min(maxX, visible.right + 60);
    const lastTuftY = Math.min(maxY, visible.bottom + 60);
    for (let x = firstTuftX; x < lastTuftX; x += 140) {
      for (let y = firstTuftY; y < lastTuftY; y += 120) {
        const ox = (x * 7) % 50;
        const oy = (y * 5) % 40;
        this.ctx.beginPath();
        this.ctx.arc(x + ox, y + oy, 3, 0, Math.PI * 2);
        this.ctx.arc(x + ox + 5, y + oy - 3, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  renderPaths() {
    const ctx = this.ctx;
    const { maxGridX, maxGridY } = this.fieldManager.getGridBounds();
    const stepX = this.fieldManager.plotWidth + this.fieldManager.gapX;
    const stepY = this.fieldManager.plotHeight + this.fieldManager.gapY;
    const fieldRight = this.fieldManager.originX + maxGridX * stepX + this.fieldManager.plotWidth;
    const fieldBottom = this.fieldManager.originY + maxGridY * stepY + this.fieldManager.plotHeight;
    const roadLeftX = this.fieldManager.originX - 50;
    const roadRightX = fieldRight + 24;
    const roadBottomY = fieldBottom + 24;
    const visible = this.visibleWorldBounds;
    const greenhouse = this.state.getLongTermProjects()
      .find((project) => project.zone.id === 'greenhouse')?.zone;

    const mainPath = new Path2D();
    mainPath.moveTo(0, 218);
    mainPath.lineTo(roadLeftX, 218);
    mainPath.lineTo(roadLeftX, roadBottomY);
    mainPath.lineTo(roadRightX, roadBottomY);
    mainPath.lineTo(roadRightX, 444);
    mainPath.quadraticCurveTo(roadRightX, 420, roadRightX + 24, 420);
    if (greenhouse) {
      mainPath.moveTo(roadLeftX, 218);
      mainPath.bezierCurveTo(150, 235, 0, 300, -180, 320);
      mainPath.bezierCurveTo(-420, 345, -540, 280, -690, 365);
      mainPath.bezierCurveTo(-650, 410, -650, 480, -690, 520);
      mainPath.bezierCurveTo(-690, 590, -780, 650, -900, 650);
      mainPath.bezierCurveTo(-900, 640, -900, 600, greenhouse.x, greenhouse.y + 125);
    }

    if (this.cachedPathPlots !== this.state.plots || this.cachedPathPlotCount !== this.state.plots.length) {
      this.cachedPathSegments = getGardenPathSegments(this.state.plots, {
        originX: this.fieldManager.originX,
        originY: this.fieldManager.originY,
        plotWidth: this.fieldManager.plotWidth,
        plotHeight: this.fieldManager.plotHeight,
        gapX: this.fieldManager.gapX,
        gapY: this.fieldManager.gapY,
        leftExtent: roadLeftX,
        rightExtent: fieldRight
      });
      this.cachedPathPlots = this.state.plots;
      this.cachedPathPlotCount = this.state.plots.length;
    }
    const gardenPath = new Path2D();
    for (const paths of [this.cachedPathSegments.vertical, this.cachedPathSegments.horizontal]) {
      for (const path of paths) {
        if (
          path.x + path.width < visible.left - stepX
          || path.x > visible.right + stepX
          || path.y + path.height < visible.top - this.fieldManager.plotHeight
          || path.y > visible.bottom + this.fieldManager.plotHeight
        ) continue;
        if (path.width < path.height) {
          gardenPath.moveTo(path.x + path.width / 2, path.y);
          gardenPath.lineTo(path.x + path.width / 2, path.y + path.height);
        } else {
          gardenPath.moveTo(path.x, path.y + path.height / 2);
          gardenPath.lineTo(path.x + path.width, path.y + path.height / 2);
        }
      }
    }

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const palette = themeManager.palette;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = palette.pathEarth || '#986947';
    ctx.lineWidth = 58;
    ctx.stroke(mainPath);
    ctx.lineWidth = 36;
    ctx.stroke(gardenPath);
    ctx.strokeStyle = palette.pathSoil || '#BF9462';
    ctx.lineWidth = 50;
    ctx.stroke(mainPath);
    ctx.lineWidth = 34;
    ctx.stroke(gardenPath);
    ctx.strokeStyle = palette.pathSurface || '#D7BF8B';
    ctx.lineWidth = 42;
    ctx.stroke(mainPath);
    ctx.lineWidth = 32;
    ctx.stroke(gardenPath);

    ctx.restore();
  }

  renderGreenhouseVegetation() {
    const greenhouse = this.state.getLongTermProjects()
      .find((project) => project.zone.id === 'greenhouse')?.zone;
    if (!greenhouse || !this.visibleWorldBounds) return;
    const { x, y } = greenhouse;
    const palette = themeManager.palette;
    const leafColor = palette.leafGreen || '#5FA36B';
    const flowerColors = [
      palette.peonyPink || '#F4A6B8',
      palette.sunYellow || '#F7C948',
      palette.lavender || '#B7A3E3'
    ];
    const clusters = [
      [-120, 315, -1], [-510, 325, 1], [-690, 515, -1], [-880, 635, 1],
      [x - 194, y - 50, -1], [x - 190, y + 75, -1],
      [x + 192, y - 48, 1], [x + 190, y + 75, 1],
      [x - 138, y + 120, -1], [x + 138, y + 120, 1]
    ];

    for (const [clusterX, clusterY, direction] of clusters) {
      if (
        clusterX < this.visibleWorldBounds.left - 40
        || clusterX > this.visibleWorldBounds.right + 40
        || clusterY < this.visibleWorldBounds.top - 40
        || clusterY > this.visibleWorldBounds.bottom + 40
      ) continue;

      this.ctx.save();
      this.ctx.strokeStyle = palette.deepGreen || '#2F5D4A';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(clusterX, clusterY + 12);
      this.ctx.quadraticCurveTo(
        clusterX + direction * 2,
        clusterY + 3,
        clusterX + direction * 8,
        clusterY - 8
      );
      this.ctx.moveTo(clusterX + 5, clusterY + 12);
      this.ctx.quadraticCurveTo(
        clusterX + direction * 4,
        clusterY + 7,
        clusterX - direction * 4,
        clusterY - 3
      );
      this.ctx.stroke();
      this.ctx.fillStyle = leafColor;
      for (const [leafX, leafY, rotation] of [
        [direction * -2, 7, -0.7],
        [direction * 4, 2, 0.7],
        [direction * 7, -5, -0.6]
      ]) {
        this.ctx.beginPath();
        this.ctx.ellipse(
          clusterX + leafX,
          clusterY + leafY,
          7,
          3.5,
          rotation,
          0,
          Math.PI * 2
        );
        this.ctx.fill();
      }
      for (let petal = 0; petal < 5; petal++) {
        const angle = petal * Math.PI * 2 / 5;
        this.ctx.beginPath();
        this.ctx.arc(
          clusterX + direction * 8 + Math.cos(angle) * 4,
          clusterY - 8 + Math.sin(angle) * 4,
          2.8,
          0,
          Math.PI * 2
        );
        this.ctx.fillStyle = flowerColors[
          (Math.round(clusterX + clusterY) + petal) % flowerColors.length
        ];
        this.ctx.fill();
      }
      this.ctx.beginPath();
      this.ctx.arc(clusterX + direction * 8, clusterY - 8, 2.2, 0, Math.PI * 2);
      this.ctx.fillStyle = palette.cream || '#FFF6E5';
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  renderFieldFence() {
    const ctx = this.ctx;
    const theme = themeManager.activeTheme;
    const plots = this.state.plots;
    if (plots.length === 0) return;

    const stepY = this.fieldManager.plotHeight + this.fieldManager.gapY;
    const { maxGridX, maxGridY } = this.fieldManager.getGridBounds();
    const visible = this.visibleWorldBounds;
    const right = this.fieldManager.originX
      + maxGridX * (this.fieldManager.plotWidth + this.fieldManager.gapX)
      + this.fieldManager.plotWidth + 16;
    const left = this.fieldManager.originX - 16;
    const top = this.fieldManager.originY - 26;
    const bottom = this.fieldManager.originY + maxGridY * stepY + this.fieldManager.plotHeight + 42;

    const drawHorizontal = (x1, x2, y) => {
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
      for (let x = x1; x <= x2; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, y - 7);
        ctx.lineTo(x, y + 7);
        ctx.stroke();
      }
    };

    const drawVertical = (x, y1, y2, gates) => {
      const intervals = [];
      let start = y1;
      for (const gate of gates.sort((a, b) => a[0] - b[0])) {
        if (gate[0] > start) intervals.push([start, gate[0]]);
        start = Math.max(start, gate[1]);
      }
      if (start < y2) intervals.push([start, y2]);

      for (const [from, to] of intervals) {
        ctx.beginPath();
        ctx.moveTo(x, from);
        ctx.lineTo(x, to);
        ctx.stroke();
        for (let y = from; y <= to; y += 28) {
          ctx.beginPath();
          ctx.moveTo(x - 7, y);
          ctx.lineTo(x + 7, y);
          ctx.stroke();
        }
      }
    };

    const gates = [];
    if (visible.top <= 238 && visible.bottom >= 198) gates.push([198, 238]);
    const fieldBottom = this.fieldManager.originY
      + maxGridY * stepY
      + this.fieldManager.plotHeight;
    const perimeterRoadCenterY = fieldBottom + 24;
    gates.push([perimeterRoadCenterY - 25, perimeterRoadCenterY + 25]);
    const gateOffset = this.fieldManager.originY + this.fieldManager.plotHeight + this.fieldManager.gapY / 2;
    const firstVisibleRow = Math.max(0, Math.floor((visible.top - gateOffset) / stepY) - 1);
    const lastVisibleRow = Math.min(maxGridY, Math.ceil((visible.bottom - gateOffset) / stepY) + 1);
    for (let row = firstVisibleRow; row <= lastVisibleRow; row++) {
      const y = this.fieldManager.originY + row * stepY + this.fieldManager.plotHeight + this.fieldManager.gapY / 2;
      gates.push([y - 18, y + 18]);
    }

    ctx.save();
    ctx.strokeStyle = theme?.fenceColor || 'rgba(139, 94, 60, 0.68)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([]);
    if (visible.top <= top + 8 && visible.bottom >= top - 8) drawHorizontal(left, right, top);
    const verticalTop = Math.max(top, visible.top - 8);
    const verticalBottom = Math.min(bottom, visible.bottom + 8);
    if (verticalBottom > verticalTop) {
      drawVertical(left, verticalTop, verticalBottom, gates);
      drawVertical(right, verticalTop, verticalBottom, gates);
    }
    ctx.restore();
  }

  getShopBuildingBounds() {
    const expansionLevel = this.state.upgrades.shopExpansion || 0;
    const { width, height } = getShopExpansionVisualSize(
      expansionLevel,
      this.shopBuilding.width,
      this.shopBuilding.height
    );
    return {
      x: this.shopBuilding.x + (this.shopBuilding.width - width) / 2,
      y: this.shopBuilding.y + this.shopBuilding.height - height,
      width,
      height
    };
  }

  getPlayerCollisionObstacles() {
    const plots = this.state.plots;
    const shopExpansion = this.state.upgrades.shopExpansion || 0;
    const decorSignature = this.mapDecor.map(({ type, x, y, count, spacing }) => (
      `${type}:${x}:${y}:${count || 0}:${spacing || 0}`
    )).join('|');
    const plotAccessSignature = plots
      .map((plot) => `${plot.gridX},${plot.gridY}:${plot.unlocked ? 'open' : 'locked'}`)
      .join('|');
    if (
      this.collisionObstacles
      && this.collisionPlots === plots
      && this.collisionPlotCount === plots.length
      && this.collisionPlotAccessSignature === plotAccessSignature
      && this.collisionShopExpansion === shopExpansion
      && this.collisionDecorSignature === decorSignature
    ) {
      return this.collisionObstacles;
    }

    const obstacles = [];
    const shop = this.getShopBuildingBounds();
    obstacles.push({
      type: 'rect',
      x: shop.x - 10,
      y: shop.y - 12,
      width: shop.width + 20,
      height: Math.max(0, this.counter.y - shop.y + 4)
    });

    const greenhouse = this.state.getLongTermProjects()
      .find((project) => project.zone.id === 'greenhouse')?.zone;
    if (greenhouse) {
      obstacles.push(
        { type: 'rect', x: greenhouse.x - 178, y: greenhouse.y - 91, width: 356, height: 22 },
        { type: 'rect', x: greenhouse.x - 178, y: greenhouse.y - 69, width: 22, height: 168 },
        { type: 'rect', x: greenhouse.x + 156, y: greenhouse.y - 69, width: 22, height: 168 },
        { type: 'rect', x: greenhouse.x - 178, y: greenhouse.y + 77, width: 126, height: 22 },
        { type: 'rect', x: greenhouse.x + 52, y: greenhouse.y + 77, width: 126, height: 22 },
        { type: 'rect', x: greenhouse.x - 52, y: greenhouse.y + 28, width: 104, height: 74 }
      );
    }

    for (const tree of this.trees) {
      obstacles.push({ type: 'circle', x: tree.x, y: tree.y + 4, radius: 28 });
    }

    for (const decor of this.mapDecor) {
      if (decor.type === 'flowerBed') {
        obstacles.push({ type: 'rect', x: decor.x - 24, y: decor.y - 13, width: 100, height: 38 });
      } else if (decor.type === 'bench') {
        obstacles.push({ type: 'rect', x: decor.x - 50, y: decor.y - 17, width: 100, height: 42 });
      } else if (decor.type === 'sign') {
        const signLeft = decor.x + (decor.direction === 'left' ? -48 : -22);
        obstacles.push({ type: 'rect', x: signLeft, y: decor.y - 48, width: 70, height: 62 });
      } else if (decor.type === 'compost') {
        obstacles.push({ type: 'rect', x: decor.x - 23, y: decor.y - 28, width: 46, height: 44 });
      } else if (decor.type === 'stones') {
        for (let index = 0; index < decor.count; index++) {
          obstacles.push({
            type: 'circle',
            x: decor.x + index * decor.spacing,
            y: decor.y + (index % 2 === 0 ? 0 : 7),
            radius: 9
          });
        }
      } else if (decor.type === 'birdbath') {
        obstacles.push({ type: 'circle', x: decor.x, y: decor.y + 4, radius: 22 });
      }
    }

    const plotsByGrid = new Map();
    const unlockedPlotBounds = plots
      .filter((plot) => plot.unlocked)
      .map((plot) => ({
        ...this.fieldManager.getPlotWorldPos(plot.gridX, plot.gridY),
        width: this.fieldManager.plotWidth,
        height: this.fieldManager.plotHeight
      }));
    const collidableObjects = obstacles.filter((obstacle) => {
      const bounds = obstacle.type === 'circle'
        ? {
            left: obstacle.x - obstacle.radius,
            right: obstacle.x + obstacle.radius,
            top: obstacle.y - obstacle.radius,
            bottom: obstacle.y + obstacle.radius
          }
        : {
            left: obstacle.x,
            right: obstacle.x + obstacle.width,
            top: obstacle.y,
            bottom: obstacle.y + obstacle.height
          };
      return !unlockedPlotBounds.some((plot) => (
        bounds.right > plot.x
        && bounds.left < plot.x + plot.width
        && bounds.bottom > plot.y
        && bounds.top < plot.y + plot.height
      ));
    });

    for (const plot of plots) {
      if (!plot.unlocked) plotsByGrid.set(`${plot.gridX},${plot.gridY}`, plot);
    }

    this.collisionObstacles = { objects: collidableObjects, plotsByGrid };
    this.collisionPlots = plots;
    this.collisionPlotCount = plots.length;
    this.collisionPlotAccessSignature = plotAccessSignature;
    this.collisionShopExpansion = shopExpansion;
    this.collisionDecorSignature = decorSignature;
    return this.collisionObstacles;
  }

  canPlayerOccupy(x, y, collisionObstacles) {
    const radius = this.player.radius;
    for (const obstacle of collisionObstacles.objects) {
      if (obstacle.type === 'circle') {
        const dx = x - obstacle.x;
        const dy = y - obstacle.y;
        const combinedRadius = radius + obstacle.radius;
        if (dx * dx + dy * dy < combinedRadius * combinedRadius) return false;
        continue;
      }

      const closestX = clamp(x, obstacle.x, obstacle.x + obstacle.width);
      const closestY = clamp(y, obstacle.y, obstacle.y + obstacle.height);
      const dx = x - closestX;
      const dy = y - closestY;
      if (dx * dx + dy * dy < radius * radius) return false;
    }

    const stepX = this.fieldManager.plotWidth + this.fieldManager.gapX;
    const stepY = this.fieldManager.plotHeight + this.fieldManager.gapY;
    const column = Math.floor((x - this.fieldManager.originX) / stepX);
    const row = Math.floor((y - this.fieldManager.originY) / stepY);
    for (let gridY = Math.max(0, row - 1); gridY <= row + 1; gridY++) {
      for (let gridX = Math.max(0, column - 1); gridX <= column + 1; gridX++) {
        if (!collisionObstacles.plotsByGrid.has(`${gridX},${gridY}`)) continue;
        const plot = this.fieldManager.getPlotWorldPos(gridX, gridY);
        const closestX = clamp(x, plot.x, plot.x + this.fieldManager.plotWidth);
        const closestY = clamp(y, plot.y, plot.y + this.fieldManager.plotHeight);
        const dx = x - closestX;
        const dy = y - closestY;
        if (dx * dx + dy * dy < radius * radius) return false;
      }
    }

    return true;
  }

  renderShopStockSign() {
    const ctx = this.ctx;
    const palette = themeManager.palette;
    const boardFlowers = state.getShopStockBoardFlowerIds();
    const columns = 3;
    const width = 174;
    const shopBounds = this.getShopBuildingBounds();
    const x = shopBounds.x - width - 18;
    const y = shopBounds.y + 60;
    const rowHeight = 18;
    const rowCount = Math.ceil(boardFlowers.length / columns);
    const boardHeight = 39 + rowCount * rowHeight;
    const totalStock = state.getTotalShopStock();
    const stockCapacity = state.getShopStockCapacity();

    ctx.save();
    ctx.fillStyle = 'rgba(47, 93, 74, 0.2)';
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + boardHeight + 13, width * 0.44, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#76583E';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y + boardHeight - 1);
    ctx.lineTo(x + width / 2, y + boardHeight + 15);
    ctx.stroke();

    ctx.fillStyle = palette.signWood || palette.wood;
    ctx.strokeStyle = palette.deepGreen;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, width, boardHeight, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = palette.signPaper || '#FBF1D8';
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 5, width - 10, boardHeight - 10, 5);
    ctx.fill();

    ctx.fillStyle = palette.deepGreen;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 10px "Quicksand", sans-serif';
    ctx.fillText('STOCK', x + width / 2, y + 11);
    ctx.font = '700 8px "Quicksand", sans-serif';
    ctx.fillText(`${totalStock}/${stockCapacity} no total`, x + width / 2, y + 25);

    boardFlowers.forEach((flowerId, index) => {
      const flower = FLOWERS_CONFIG[flowerId];
      const column = index % columns;
      const row = Math.floor(index / columns);
      const cellX = x + 8 + column * 52;
      const rowY = y + 39 + row * rowHeight;
      const isUnlocked = state.unlockedFlowers[flowerId];
      const quantity = Number(state.stock[flowerId]) || 0;
      const isVisible = isUnlocked || quantity > 0;

      assetManager.drawFlowerSymbol(ctx, cellX + 7, rowY, flower, !isVisible);
      ctx.fillStyle = isVisible ? palette.deepGreen : '#81796D';
      ctx.textAlign = 'right';
      ctx.font = '800 8px "Quicksand", sans-serif';
      ctx.fillText(isVisible ? String(quantity) : '—', cellX + 47, rowY);
    });

    ctx.restore();
    themeManager.drawLayer(ctx, 'drawStockSignDecor', x, y, width, boardHeight);
  }

  renderHerbariumExhibitions() {
    const exhibitions = this.state.getHerbariumExhibitions().filter((entry) => entry.installed);
    if (exhibitions.length === 0) return;
    const ctx = this.ctx;
    const x = this.shopBuilding.x + this.shopBuilding.width + 12;
    const y = this.shopBuilding.y + 58;

    exhibitions.forEach((exhibition, index) => {
      const cardY = y + index * 65;
      ctx.save();
      ctx.fillStyle = 'rgba(47, 93, 74, 0.18)';
      ctx.beginPath();
      ctx.ellipse(x + 56, cardY + 57, 52, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9A6844';
      ctx.strokeStyle = PALETTE.deepGreen;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, cardY, 112, 49, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFF8E8';
      ctx.beginPath();
      ctx.roundRect(x + 5, cardY + 5, 102, 39, 4);
      ctx.fill();
      ctx.fillStyle = PALETTE.deepGreen;
      ctx.font = '800 7px "Quicksand", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(exhibition.title.replace('Exposição: ', '').toUpperCase(), x + 56, cardY + 11);
      const flowerIds = [...new Set(exhibition.flowers)];
      flowerIds.forEach((flowerId, flowerIndex) => {
        const flower = FLOWERS_CONFIG[flowerId];
        if (!flower) throw new Error(`A exposição "${exhibition.id}" contém uma flor inválida.`);
        assetManager.drawFlowerSymbol(ctx, x + 38 + flowerIndex * 36, cardY + 31, flower, false);
      });
      ctx.restore();
    });
  }

  isWorldRectVisible(left, top, right, bottom, padding = 0) {
    const visible = this.visibleWorldBounds;
    return !visible || (
      right + padding >= visible.left
      && left - padding <= visible.right
      && bottom + padding >= visible.top
      && top - padding <= visible.bottom
    );
  }

  getVisibleMapDecorations() {
    return this.mapDecor.filter((decor) => {
      if (decor.type === 'flowerBed') {
        return this.isWorldRectVisible(decor.x - 30, decor.y - 24, decor.x + 82, decor.y + 28);
      }
      if (decor.type === 'bench') {
        return this.isWorldRectVisible(decor.x - 52, decor.y - 22, decor.x + 50, decor.y + 36);
      }
      if (decor.type === 'sign') {
        const leftFacing = decor.direction === 'left';
        return this.isWorldRectVisible(
          decor.x + (leftFacing ? -50 : -20),
          decor.y - 50,
          decor.x + (leftFacing ? 22 : 50),
          decor.y + 16
        );
      }
      if (decor.type === 'stones') {
        return this.isWorldRectVisible(
          decor.x - 10,
          decor.y - 8,
          decor.x + (decor.count - 1) * decor.spacing + 10,
          decor.y + 16
        );
      }
      if (decor.type === 'birdbath') {
        return this.isWorldRectVisible(decor.x - 28, decor.y - 15, decor.x + 28, decor.y + 26);
      }
      return this.isWorldRectVisible(decor.x - 28, decor.y - 30, decor.x + 28, decor.y + 18);
    });
  }

  renderMapDecor(decorations = this.mapDecor) {
    const ctx = this.ctx;
    const stoneColors = ['#D8C3A2', '#E9D8BA', '#C9B18F'];

    for (const decor of decorations) {
      if (decor.type === 'flowerBed') {
        ctx.save();
        ctx.fillStyle = 'rgba(139, 94, 60, 0.22)';
        ctx.beginPath();
        ctx.ellipse(decor.x + 25, decor.y + 7, 42, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#9A6844';
        ctx.strokeStyle = PALETTE.deepGreen;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(decor.x - 20, decor.y - 8, 90, 28, 10);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = PALETTE.wood;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(decor.x - 14, decor.y - 3, 78, 18, 7);
        ctx.stroke();

        decor.flowers.forEach((flowerId, index) => {
          assetManager.drawFlower(
            ctx,
            decor.x + index * 25,
            decor.y + 4,
            FLOWERS_CONFIG[flowerId],
            1,
            index
          );
        });
        ctx.restore();
      } else if (decor.type === 'compost') {
        ctx.save();
        ctx.fillStyle = 'rgba(47, 93, 74, 0.18)';
        ctx.beginPath();
        ctx.ellipse(decor.x, decor.y + 7, 25, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8B5E3C';
        ctx.strokeStyle = PALETTE.deepGreen;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(decor.x - 18, decor.y - 21, 36, 28, [4, 4, 7, 7]);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#5FA36B';
        ctx.beginPath();
        ctx.roundRect(decor.x - 21, decor.y - 25, 42, 7, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = PALETTE.cream;
        ctx.font = '800 7px "Quicksand", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('COMPOSTO', decor.x, decor.y - 10);
        ctx.strokeStyle = '#D7B58A';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(decor.x - 12, decor.y - 2);
        ctx.lineTo(decor.x + 12, decor.y - 2);
        ctx.moveTo(decor.x - 12, decor.y + 2);
        ctx.lineTo(decor.x + 12, decor.y + 2);
        ctx.stroke();
        ctx.restore();
      } else if (decor.type === 'bench') {
        ctx.save();
        ctx.fillStyle = 'rgba(47, 93, 74, 0.16)';
        ctx.beginPath();
        ctx.ellipse(decor.x, decor.y + 13, 42, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#D8C8AA';
        ctx.strokeStyle = '#B59A72';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(decor.x, decor.y + 11, 39, 17, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = PALETTE.wood;
        ctx.strokeStyle = PALETTE.deepGreen;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(decor.x - 28, decor.y - 9, 56, 12, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#8B5E3C';
        ctx.fillRect(decor.x - 22, decor.y + 3, 5, 13);
        ctx.fillRect(decor.x + 17, decor.y + 3, 5, 13);

        // Pequeno vaso e candeeiro dão identidade à área de descanso.
        ctx.fillStyle = '#A96F4D';
        ctx.strokeStyle = PALETTE.deepGreen;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(decor.x - 47, decor.y + 1, 13, 12, 3);
        ctx.fill();
        ctx.stroke();
        assetManager.drawFlower(ctx, decor.x - 40, decor.y, FLOWERS_CONFIG.daisy, 1, decor.y);
        ctx.strokeStyle = '#76583E';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(decor.x + 42, decor.y + 12);
        ctx.lineTo(decor.x + 42, decor.y - 8);
        ctx.stroke();
        ctx.fillStyle = '#F7C948';
        ctx.beginPath();
        ctx.arc(decor.x + 42, decor.y - 9, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (decor.type === 'sign') {
        const direction = decor.direction === 'left' ? -1 : 1;
        ctx.save();
        ctx.fillStyle = 'rgba(47, 93, 74, 0.15)';
        ctx.beginPath();
        ctx.ellipse(decor.x + direction * 12, decor.y + 3, 19, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#76583E';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(decor.x + direction * 10, decor.y + 4);
        ctx.lineTo(decor.x + direction * 10, decor.y - 27);
        ctx.stroke();
        ctx.fillStyle = '#C99A6B';
        ctx.strokeStyle = PALETTE.deepGreen;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(decor.x - 17 - (direction < 0 ? 24 : 0), decor.y - 43, 58, 20, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = PALETTE.cream;
        ctx.font = '800 10px "Quicksand", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(decor.label, decor.x + direction * 12, decor.y - 33, 48);
        ctx.fillStyle = PALETTE.deepGreen;
        ctx.beginPath();
        ctx.moveTo(decor.x + direction * 34, decor.y - 19);
        ctx.lineTo(decor.x + direction * 43, decor.y - 13);
        ctx.lineTo(decor.x + direction * 34, decor.y - 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (decor.type === 'stones') {
        for (let index = 0; index < decor.count; index++) {
          const stagger = index % 2 === 0 ? 0 : 7;
          const x = decor.x + index * decor.spacing;
          const y = decor.y + stagger;
          ctx.save();
          ctx.fillStyle = 'rgba(47, 93, 74, 0.12)';
          ctx.beginPath();
          ctx.ellipse(x + 2, y + 4, 8, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = stoneColors[index % stoneColors.length];
          ctx.strokeStyle = '#9D896B';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(x, y, 8, 5, (index % 3 - 1) * 0.12, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      } else if (decor.type === 'birdbath') {
        const palette = themeManager.palette;
        ctx.save();
        ctx.fillStyle = 'rgba(47, 93, 74, 0.16)';
        ctx.beginPath();
        ctx.ellipse(decor.x, decor.y + 15, 26, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = palette.stone || '#D8C3A2';
        ctx.strokeStyle = palette.deepGreen || PALETTE.deepGreen;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(decor.x, decor.y - 1, 22, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = palette.softBlue || '#A9DDE8';
        ctx.beginPath();
        ctx.ellipse(decor.x, decor.y - 2, 16, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = palette.stone || '#D8C3A2';
        ctx.beginPath();
        ctx.moveTo(decor.x - 6, decor.y + 2);
        ctx.lineTo(decor.x - 9, decor.y + 13);
        ctx.quadraticCurveTo(decor.x, decor.y + 17, decor.x + 9, decor.y + 13);
        ctx.lineTo(decor.x + 6, decor.y + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFFDF8';
        ctx.beginPath();
        ctx.arc(decor.x - 7, decor.y - 3, 1.2, 0, Math.PI * 2);
        ctx.arc(decor.x + 5, decor.y - 1, 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  renderExpansionZones() {
    const ctx = this.ctx;
    const zones = this.state.getLongTermProjects();
    const greenhouse = zones.find((project) => project.zone.id === 'greenhouse');

    if (greenhouse) {
      const { x, y } = greenhouse.zone;
      const palette = themeManager.palette;
      const frameColor = palette.deepGreen || '#2F5D4A';
      const woodColor = palette.wood || '#C99A6B';
      ctx.save();
      ctx.fillStyle = 'rgba(47, 93, 74, 0.18)';
      ctx.beginPath();
      ctx.ellipse(x, y + 120, 205, 34, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = woodColor;
      ctx.beginPath();
      ctx.roundRect(x - 187, y + 72, 374, 34, 12);
      ctx.fill();
      ctx.strokeStyle = frameColor;
      ctx.lineWidth = 4;
      ctx.stroke();

      const glass = ctx.createLinearGradient(x - 170, y - 92, x + 170, y + 105);
      glass.addColorStop(0, GREENHOUSE_UNDER_CONSTRUCTION ? '#AEB8B1' : (greenhouse.unlocked ? (palette.softBlue || '#BFE3F2') : '#AAA99C'));
      glass.addColorStop(0.52, GREENHOUSE_UNDER_CONSTRUCTION ? '#D4D4C9' : (greenhouse.unlocked ? (palette.cream || '#FFF6E5') : '#D5D0C1'));
      glass.addColorStop(1, GREENHOUSE_UNDER_CONSTRUCTION ? '#929D94' : (greenhouse.unlocked ? (palette.leafGreen || '#5FA36B') : '#AAA99C'));
      ctx.fillStyle = glass;
      ctx.strokeStyle = frameColor;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(x - 178, y - 91, 356, 190, 34);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x - 164, y - 77, 328, 158, 26);
      ctx.clip();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
      ctx.beginPath();
      ctx.moveTo(x - 150, y - 64);
      ctx.lineTo(x - 46, y - 64);
      ctx.lineTo(x - 128, y + 73);
      ctx.lineTo(x - 158, y + 73);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = frameColor;
      ctx.globalAlpha = 0.62;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 108, y - 72);
      ctx.quadraticCurveTo(x - 124, y + 8, x - 108, y + 70);
      ctx.moveTo(x + 108, y - 72);
      ctx.quadraticCurveTo(x + 124, y + 8, x + 108, y + 70);
      ctx.moveTo(x - 157, y - 18);
      ctx.lineTo(x + 157, y - 18);
      ctx.moveTo(x - 157, y + 40);
      ctx.lineTo(x + 157, y + 40);
      ctx.moveTo(x, y - 75);
      ctx.lineTo(x, y + 72);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.fillStyle = woodColor;
      ctx.beginPath();
      ctx.roundRect(x - 43, y + 28, 86, 74, 10);
      ctx.fill();
      ctx.strokeStyle = frameColor;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = GREENHOUSE_UNDER_CONSTRUCTION ? '#8C958E' : (greenhouse.unlocked ? (palette.leafGreen || '#5FA36B') : '#898777');
      ctx.beginPath();
      ctx.roundRect(x - 34, y + 36, 68, 64, 7);
      ctx.fill();
      ctx.strokeStyle = palette.cream || '#FFF6E5';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y + 39);
      ctx.lineTo(x, y + 98);
      ctx.moveTo(x - 30, y + 66);
      ctx.lineTo(x + 30, y + 66);
      ctx.stroke();
      ctx.fillStyle = palette.sunYellow || '#F7C948';
      ctx.beginPath();
      ctx.arc(x + 25, y + 70, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = frameColor;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.roundRect(x - 190, y - 98, 380, 16, 7);
      ctx.fill();
      ctx.globalAlpha = 1;

      for (const [offset, flowerId] of [[-132, 'tulip'], [-78, 'daisy'], [78, 'lavender'], [132, 'rose']]) {
        ctx.fillStyle = woodColor;
        ctx.beginPath();
        ctx.roundRect(x + offset - 18, y + 48, 36, 18, 5);
        ctx.fill();
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        const flower = FLOWERS_CONFIG[flowerId];
        if (flower) assetManager.drawFlower(ctx, x + offset, y + 39, flower, 0.8, x + offset);
      }

      if (GREENHOUSE_UNDER_CONSTRUCTION) {
        ctx.save();
        ctx.strokeStyle = '#9B6744';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(x - 40, y + 36);
        ctx.lineTo(x + 40, y + 94);
        ctx.moveTo(x + 40, y + 36);
        ctx.lineTo(x - 40, y + 94);
        ctx.stroke();
        ctx.fillStyle = '#F4D88E';
        ctx.strokeStyle = '#76533B';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(x - 100, y + 39, 200, 42, 7);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#594333';
        ctx.font = '800 13px "Quicksand", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Em Breve disponível', x, y + 60, 188);
        ctx.restore();
      }

      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = palette.cream || '#FFF6E5';
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(x - 20 + i * 20, y + 118 + (i % 2) * 3, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = frameColor;
      ctx.font = '800 19px "Quicksand", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(greenhouse.zone.name, x, y - 128);
      if (GREENHOUSE_UNDER_CONSTRUCTION) {
        ctx.fillStyle = 'rgba(47, 54, 44, 0.68)';
        ctx.beginPath();
        ctx.roundRect(x - 72, y - 18, 144, 46, 10);
        ctx.fill();
        ctx.fillStyle = '#FFFDF8';
        ctx.font = '700 13px "Quicksand", sans-serif';
        ctx.fillText('Em construção', x, y + 5);
      } else if (!greenhouse.unlocked) {
        ctx.fillStyle = 'rgba(47, 54, 44, 0.58)';
        ctx.beginPath();
        ctx.roundRect(x - 64, y - 18, 128, 46, 10);
        ctx.fill();
        ctx.fillStyle = '#FFFDF8';
        ctx.font = '700 13px "Quicksand", sans-serif';
        ctx.fillText('Em restauração', x, y + 5);
      }
      ctx.restore();
    }

  }

  renderZoneFindings() {
    const ctx = this.ctx;
    for (const zone of this.state.getZoneActivities()) {
      if (zone.id !== 'greenhouse') continue;
      if (GREENHOUSE_UNDER_CONSTRUCTION) continue;
      const project = this.state.getLongTermProjects().find((entry) => entry.zone.id === zone.id);
      if (!project?.unlocked) continue;
      for (const finding of zone.findings) {
        ctx.save();
        ctx.globalAlpha = finding.found ? 0.45 : 1;
        ctx.fillStyle = zone.id === 'greenhouse'
          ? 'rgba(226, 250, 223, 0.85)'
          : 'rgba(231, 232, 255, 0.88)';
        ctx.strokeStyle = zone.id === 'greenhouse' ? '#5B9B6B' : '#8F9BD1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(finding.x, finding.y, 23, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = zone.id === 'greenhouse' ? '#39764D' : '#58689F';
        ctx.font = '800 18px "Quicksand", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(finding.found ? '✓' : '✦', finding.x, finding.y);
        if (!finding.found) {
          ctx.fillStyle = zone.id === 'greenhouse' ? '#2F5D4A' : '#3E496F';
          ctx.font = '700 10px "Quicksand", sans-serif';
          ctx.fillText('E / Ação', finding.x, finding.y + 34);
        }
        ctx.restore();
      }
    }
  }

  renderDayNightOverlay(w, h, lighting) {
    this.ctx.save();
    const overlays = [
      ['rgba(255, 159, 79, 0.13)', lighting.sunset],
      ['rgba(117, 151, 207, 0.09)', lighting.twilight],
      [`rgba(48, 69, 119, ${MAX_NIGHT_OVERLAY_ALPHA})`, lighting.night],
      ['rgba(255, 198, 132, 0.12)', lighting.dawn]
    ];
    for (const [color, intensity] of overlays) {
      if (intensity <= 0) continue;
      this.ctx.fillStyle = color;
      this.ctx.globalAlpha = intensity;
      this.ctx.fillRect(0, 0, w, h);
    }
    this.ctx.restore();
  }
}

// Inicia o jogo imediatamente (scripts type="module" são deferred por defeito)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.floristGame = new Game();
  });
} else {
  window.floristGame = new Game();
}
