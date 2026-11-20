import { FLOWERS_CONFIG, FLOWER_ORDER } from '../config/flowers.js';
import { UPGRADES_CONFIG } from '../config/upgrades.js';
import { BOUQUET_CATEGORIES } from '../config/bouquets.js';

const MAX_DEBUG_VALUE = 1000000;

export function isLocalFullTestMode(location) {
  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  return localHosts.has(location?.hostname)
    && new URLSearchParams(location.search || '').get('testMode') === 'full';
}

export function applyLocalFullTestProfile(state) {
  state.level = Math.max(
    1,
    ...FLOWER_ORDER.map((flowerId) => FLOWERS_CONFIG[flowerId].requiredLevel || 1),
    ...Object.values(UPGRADES_CONFIG).map((upgrade) => upgrade.requiredLevel || 1),
    ...BOUQUET_CATEGORIES.map((category) => category.requiredLevel)
  );
  state.reputation = 0;
  state.coins = MAX_DEBUG_VALUE;

  for (const flowerId of FLOWER_ORDER) {
    state.unlockedFlowers[flowerId] = true;
    let ownedCount = state.getOwnedPlotCount(flowerId);
    const lockedPlot = state.plots.find((plot) => !plot.unlocked && plot.flowerId === flowerId);
    if (lockedPlot && ownedCount < 2) {
      lockedPlot.unlocked = true;
      ownedCount++;
    }
    while (ownedCount < 2) {
      const position = state.getNextPlotPosition();
      state.plots.push({
        id: Math.max(-1, ...state.plots.map((plot) => plot.id)) + 1,
        flowerId,
        unlocked: true,
        optional: true,
        cost: 0,
        ...position,
        flowers: Array.from({ length: 6 }, () => ({ progress: 1, timer: 0 }))
      });
      ownedCount++;
    }
  }

  state.ensureNextPlot();
  for (const plot of state.plots) {
    plot.unlocked = true;
    plot.flowers = Array.from({ length: 6 }, () => ({ progress: 1, timer: 0 }));
  }
  for (const [upgradeId, upgrade] of Object.entries(UPGRADES_CONFIG)) {
    state.upgrades[upgradeId] = upgrade.maxLevel;
  }
  state.employment.active = {
    cashier: false,
    harvester: false,
    bouquetAssistant: false
  };
  state.employment.nextPayrollAt = null;
  state.bouquetSpecializations = Object.fromEntries(
    BOUQUET_CATEGORIES.map(({ id }) => [id, true])
  );
  state.stock = Object.fromEntries(
    FLOWER_ORDER.map((flowerId) => [flowerId, state.getFlowerStockCapacity(flowerId)])
  );
  state.basket = Array.from(
    { length: state.getBasketCapacity() },
    (_, index) => FLOWER_ORDER[index % FLOWER_ORDER.length]
  );

  state.stats.totalHarvested = Math.max(state.stats.totalHarvested, 100);
  state.stats.customersServed = Math.max(state.stats.customersServed, 15);
  state.stats.totalCoinsEarned = Math.max(state.stats.totalCoinsEarned, 1000);
  state.stats.bouquetsCrafted = Math.max(state.stats.bouquetsCrafted, 8);
  state.orderCycle = Math.max(state.orderCycle, 4);
  state.collection.harvestedFlowers = Object.fromEntries(
    FLOWER_ORDER.map((flowerId) => [flowerId, true])
  );
  state.collection.flowerRecords = Object.fromEntries(
    FLOWER_ORDER.map((flowerId) => [
      flowerId,
      {
        harvested: Math.max(1, state.collection.flowerRecords[flowerId]?.harvested || 0),
        sold: state.collection.flowerRecords[flowerId]?.sold || 0,
        usedInBouquets: state.collection.flowerRecords[flowerId]?.usedInBouquets || 0
      }
    ])
  );
  state.notify('state_loaded');
}

export class DeveloperToolsPanel {
  constructor(state, hud, getUser, game = null) {
    this.state = state;
    this.hud = hud;
    this.getUser = getUser;
    this.game = game || (typeof window !== 'undefined' ? window.floristGame : null);
    this.panel = typeof document !== 'undefined' ? document.getElementById('developer-tools-panel') : null;
    this.quickDevBtn = typeof document !== 'undefined' ? document.getElementById('btn-open-dev-tools') : null;
    this.performanceHud = null;
    this.performanceHudEnabled = false;
    this.performanceFrames = [];
    this.lastPerformanceHudUpdate = 0;
    this.lastPageMemoryMeasureAt = 0;
    this.pageMemoryMeasurePending = false;
    this.pageMemoryBytes = null;
    this.pageMemoryStatus = 'A medir…';
    this.performanceHudMoved = false;
    this.render();
    this.refreshAccess();
  }

  isAuthorized() {
    if (typeof window !== 'undefined') {
      const hostname = window.location?.hostname;
      const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
      const protocol = window.location?.protocol;
      const isNativeApp = Boolean(window.Capacitor?.isNativePlatform?.() || protocol === 'capacitor:');
      const isElectronApp = protocol === 'file:';
      const isDevBuild = window.floristEverBuildInfo?.devMode === true;
      const hasDevFlag = isDevBuild && (
        window.location?.search?.includes('dev') || isLocalFullTestMode(window.location)
      );
      if (isNativeApp || isElectronApp) {
        if (isDevBuild) return true;
      } else if (isLocalHost || hasDevFlag || isDevBuild) {
        return true;
      }
    }
    const user = this.getUser?.();
    return Array.isArray(user?.roles) && user.roles.includes('developer');
  }

  refreshAccess() {
    const authorized = this.isAuthorized();
    if (this.panel) {
      this.panel.classList.toggle('hidden', !authorized);
    }
    if (this.quickDevBtn) {
      this.quickDevBtn.classList.toggle('hidden', !authorized);
    }
    if (!authorized && this.performanceHudEnabled) this.setPerformanceHudEnabled(false);
  }

  render() {
    if (!this.panel) return;
    this.panel.innerHTML = `
      <header class="developer-tools-header">
        <div>
          <span class="developer-tools-eyebrow">ACESSO DE DESENVOLVIMENTO</span>
          <h3 id="developer-tools-title">Painel de desenvolvimento</h3>
        </div>
        <span class="developer-tools-badge">Modo Dev Ativo</span>
      </header>
      <p class="setting-help">Controlos de teste para o progresso desta conta e do update Subsolo (v2.0.0). As alterações ficam guardadas no dispositivo.</p>
      
      <details class="developer-tools-section">
        <summary>Desempenho</summary>
        <p class="setting-help">Mostra métricas de renderização em tempo real. A recolha só começa quando o monitor está ativo.</p>
        <button type="button" class="btn-secondary developer-tools-apply" data-dev-performance-toggle aria-pressed="false">Mostrar métricas no ecrã</button>
      </details>

      <details class="developer-tools-section" open>
        <summary>🌿 Subsolo (Update v2.0.0)</summary>
        <p class="setting-help">Atalhos rápidos para desbloquear e testar todas as funcionalidades subterrâneas.</p>
        <div class="developer-tools-quick-actions" style="display:flex; flex-wrap:wrap; gap:8px; margin: 10px 0;">
          <button type="button" class="btn-primary" data-dev-action="unlock-subsolo">🔓 Ativar e Desbloquear Subsolo</button>
          <button type="button" class="btn-secondary" data-dev-action="enter-subsolo">🚪 Descer ao Subsolo Agora</button>
          <button type="button" class="btn-secondary" data-dev-action="exit-subsolo">🪜 Subir à Superfície</button>
          <button type="button" class="btn-secondary" data-dev-action="fill-subsolo">⚡ Abastecer Recursos e Sementes</button>
          <button type="button" class="btn-secondary" data-dev-action="spawn-secret-customer">👤 Chamar Cliente Secreto</button>
          <button type="button" class="btn-secondary" data-dev-action="trigger-fiscal">🚨 Simular Fiscal / Ocultar Cofre</button>
        </div>
      </details>

      <details class="developer-tools-section" open>
        <summary>Moedas e progressão</summary>
        <div class="developer-tools-grid">
          <label>Moedas<input type="number" min="0" max="${MAX_DEBUG_VALUE}" step="1" data-dev-value="coins"></label>
          <label>Adicionar moedas<input type="number" min="1" max="${MAX_DEBUG_VALUE}" step="1" value="100" data-dev-value="coinGrant"></label>
          <label>Nível<input type="number" min="1" max="9999" step="1" data-dev-value="level"></label>
          <label>Reputação atual<input type="number" min="0" max="${MAX_DEBUG_VALUE}" step="1" data-dev-value="reputation"></label>
          <label>Flores colhidas<input type="number" min="0" max="${MAX_DEBUG_VALUE}" step="1" data-dev-stat="totalHarvested"></label>
          <label>Vendas concluídas<input type="number" min="0" max="${MAX_DEBUG_VALUE}" step="1" data-dev-stat="customersServed"></label>
          <label>Ramos criados<input type="number" min="0" max="${MAX_DEBUG_VALUE}" step="1" data-dev-stat="bouquetsCrafted"></label>
        </div>
        <button type="button" class="btn-primary developer-tools-apply" data-dev-action="progress">Aplicar progresso</button>
        <button type="button" class="btn-secondary developer-tools-apply" data-dev-action="add-coins">Adicionar moedas</button>
      </details>
      <details class="developer-tools-section">
        <summary>Stock, cesto e flores desbloqueadas</summary>
        <div class="developer-tools-grid" data-dev-fields="flowers"></div>
        <div class="developer-tools-grid developer-tools-checkboxes">
          ${FLOWER_ORDER.map((flowerId) => `
            <label class="developer-tools-check">
              <input type="checkbox" data-dev-unlock-flower="${flowerId}">
              <span>Desbloquear ${FLOWERS_CONFIG[flowerId].name}</span>
            </label>
          `).join('')}
        </div>
        <button type="button" class="btn-primary developer-tools-apply" data-dev-action="inventory">Aplicar stock e flores</button>
      </details>
      <details class="developer-tools-section">
        <summary>Melhorias e contratos</summary>
        <div class="developer-tools-grid" data-dev-fields="upgrades"></div>
        <div class="developer-tools-grid developer-tools-checkboxes">
          <label class="developer-tools-check"><input type="checkbox" data-dev-employee="cashier"><span>Contrato do Caixa Automático ativo</span></label>
          <label class="developer-tools-check"><input type="checkbox" data-dev-employee="harvester"><span>Contrato dos Floristas Ajudantes ativo</span></label>
        </div>
        <button type="button" class="btn-primary developer-tools-apply" data-dev-action="upgrades">Aplicar melhorias</button>
      </details>
      <details class="developer-tools-section">
        <summary>Jardim e encomendas</summary>
        <div class="developer-tools-grid developer-tools-checkboxes" data-dev-fields="plots"></div>
        <div class="developer-tools-grid developer-tools-checkboxes" data-dev-fields="orders"></div>
        <div class="developer-tools-quick-actions">
          <button type="button" class="btn-secondary" data-dev-action="unlock-all">Desbloquear todas as flores e terrenos</button>
          <button type="button" class="btn-secondary" data-dev-action="complete-orders">Concluir encomendas</button>
        </div>
        <button type="button" class="btn-primary developer-tools-apply" data-dev-action="garden">Aplicar estado do jardim</button>
      </details>
      <p class="developer-tools-status" role="status" aria-live="polite"></p>
    `;

    const flowerFields = this.panel.querySelector('[data-dev-fields="flowers"]');
    for (const flowerId of FLOWER_ORDER) {
      const flower = FLOWERS_CONFIG[flowerId];
      flowerFields?.append(
        this.createNumberField(`Stock de ${flower.name}`, 'data-dev-stock', flowerId),
        this.createNumberField(`No cesto · ${flower.name}`, 'data-dev-basket', flowerId, this.state.getBasketCapacity())
      );
    }

    const upgradeFields = this.panel.querySelector('[data-dev-fields="upgrades"]');
    for (const [upgradeId, upgrade] of Object.entries(UPGRADES_CONFIG)) {
      upgradeFields?.append(
        this.createNumberField(upgrade.name, 'data-dev-upgrade', upgradeId, upgrade.maxLevel)
      );
    }

    this.panel.addEventListener('click', (event) => {
      const performanceToggle = event.target.closest('[data-dev-performance-toggle]');
      if (performanceToggle) {
        this.setPerformanceHudEnabled(!this.performanceHudEnabled);
        return;
      }
      const button = event.target.closest('[data-dev-action]');
      if (!button) return;
      this.runAction(button.dataset.devAction);
    });
    this.panel.addEventListener('toggle', () => this.syncFields(), true);
  }

  isPerformanceHudEnabled() {
    return this.performanceHudEnabled;
  }

  setPerformanceHudEnabled(enabled) {
    const authorized = this.isAuthorized();
    this.performanceHudEnabled = authorized && enabled;
    const toggle = this.panel?.querySelector('[data-dev-performance-toggle]');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(this.performanceHudEnabled));
      toggle.textContent = this.performanceHudEnabled
        ? 'Ocultar métricas do ecrã'
        : 'Mostrar métricas no ecrã';
    }
    if (!authorized) {
      this.performanceHud?.classList.add('hidden');
      return;
    }
    if (!this.performanceHud && this.performanceHudEnabled) {
      this.performanceHud = document.createElement('aside');
      this.performanceHud.id = 'developer-performance-hud';
      this.performanceHud.className = 'developer-performance-hud';
      this.performanceHud.setAttribute('aria-label', 'Monitor de desempenho');
      this.performanceHud.innerHTML = `
        <div class="developer-performance-hud-header">
          <strong>Desempenho · Dev</strong>
          <span>arrastar para mover</span>
          <button type="button" data-dev-performance-close aria-label="Ocultar monitor">×</button>
        </div>
        <dl>
          <div><dt>FPS</dt><dd data-performance-fps>—</dd></div>
          <div><dt>Frame médio</dt><dd data-performance-frame>—</dd></div>
          <div><dt>Atualização</dt><dd data-performance-update>—</dd></div>
          <div><dt>Renderização</dt><dd data-performance-render>—</dd></div>
          <div><dt>Heap JS</dt><dd data-performance-memory>—</dd></div>
          <div><dt>RAM da página</dt><dd data-performance-page-memory>—</dd></div>
          <div><dt>RAM dispositivo</dt><dd data-performance-device-memory>—</dd></div>
          <div><dt>Elementos DOM</dt><dd data-performance-dom>—</dd></div>
          <div><dt>Canvas</dt><dd data-performance-canvas>—</dd></div>
        </dl>
        <p>RAM da página depende do suporte do navegador; a RAM do dispositivo é uma estimativa.</p>
      `;
      const header = this.performanceHud.querySelector('.developer-performance-hud-header');
      let dragOffsetX = 0;
      let dragOffsetY = 0;
      header.addEventListener('pointerdown', (event) => {
        if (event.target.closest('button')) return;
        const rect = this.performanceHud.getBoundingClientRect();
        dragOffsetX = event.clientX - rect.left;
        dragOffsetY = event.clientY - rect.top;
        this.performanceHud.style.left = `${rect.left}px`;
        this.performanceHud.style.right = 'auto';
        this.performanceHud.style.top = `${rect.top}px`;
        this.performanceHudMoved = true;
        header.setPointerCapture(event.pointerId);
        this.performanceHud.classList.add('is-dragging');
        event.preventDefault();
      });
      header.addEventListener('pointermove', (event) => {
        if (!header.hasPointerCapture(event.pointerId)) return;
        const maxLeft = Math.max(8, window.innerWidth - this.performanceHud.offsetWidth - 8);
        const maxTop = Math.max(8, window.innerHeight - this.performanceHud.offsetHeight - 8);
        const left = Math.min(maxLeft, Math.max(8, event.clientX - dragOffsetX));
        const top = Math.min(maxTop, Math.max(8, event.clientY - dragOffsetY));
        this.performanceHud.style.left = `${left}px`;
        this.performanceHud.style.top = `${top}px`;
      });
      const finishDrag = (event) => {
        if (!header.hasPointerCapture(event.pointerId)) return;
        header.releasePointerCapture(event.pointerId);
        this.performanceHud.classList.remove('is-dragging');
        this.avoidPerformanceHudButtonOverlap();
      };
      header.addEventListener('pointerup', finishDrag);
      header.addEventListener('pointercancel', finishDrag);
      this.performanceHud.addEventListener('click', (event) => {
        if (event.target.closest('[data-dev-performance-close]')) this.setPerformanceHudEnabled(false);
      });
      document.body.append(this.performanceHud);
      const reposition = () => window.requestAnimationFrame(() => {
        if (this.performanceHudMoved) this.clampPerformanceHudToViewport();
        else this.positionPerformanceHudBelowControls();
      });
      window.addEventListener('resize', reposition);
      window.visualViewport?.addEventListener('resize', reposition);
      document.getElementById('btn-toggle-hud-menu')?.addEventListener('click', reposition);
      document.getElementById('btn-toggle-subsolo-menu')?.addEventListener('click', reposition);
    }
    this.performanceHud?.classList.toggle('hidden', !this.performanceHudEnabled);
    if (this.performanceHudEnabled) {
      this.performanceFrames = [];
      this.lastPerformanceHudUpdate = 0;
      this.pageMemoryBytes = null;
      this.pageMemoryStatus = 'A medir…';
      this.pageMemoryMeasurePending = false;
      this.positionPerformanceHudBelowControls();
    } else {
      this.performanceFrames = [];
    }
  }

  positionPerformanceHudBelowControls() {
    if (!this.performanceHud || this.performanceHudMoved || !this.performanceHudEnabled) return;
    const controlSelectors = [
      '#hud',
      '#subsolo-hud',
      '#hud-menu-items.is-open',
      '#subsolo-hud-menu-items.is-open',
      '#hud-editor-toolbar:not(.hidden)'
    ];
    const controlsBottom = controlSelectors
      .map((selector) => document.querySelector(selector))
      .filter((element) => element && element.getClientRects().length > 0)
      .reduce((bottom, element) => Math.max(bottom, element.getBoundingClientRect().bottom), 0);
    const gap = 12;
    const maxTop = Math.max(gap, window.innerHeight - this.performanceHud.offsetHeight - gap);
    const top = Math.min(controlsBottom + gap, maxTop);
    this.performanceHud.style.left = 'auto';
    this.performanceHud.style.right = `${gap}px`;
    this.performanceHud.style.top = `${top}px`;
  }

  clampPerformanceHudToViewport() {
    if (!this.performanceHud || !this.performanceHudEnabled) return;
    const gap = 8;
    const maxLeft = Math.max(gap, window.innerWidth - this.performanceHud.offsetWidth - gap);
    const maxTop = Math.max(gap, window.innerHeight - this.performanceHud.offsetHeight - gap);
    const rect = this.performanceHud.getBoundingClientRect();
    this.performanceHud.style.left = `${Math.min(maxLeft, Math.max(gap, rect.left))}px`;
    this.performanceHud.style.right = 'auto';
    this.performanceHud.style.top = `${Math.min(maxTop, Math.max(gap, rect.top))}px`;
    this.avoidPerformanceHudButtonOverlap();
  }

  avoidPerformanceHudButtonOverlap() {
    if (!this.performanceHud || !this.performanceHudEnabled) return;
    const panel = this.performanceHud.getBoundingClientRect();
    const margin = 8;
    const gap = 6;
    const buttons = [...document.querySelectorAll(
      '#hud button, #subsolo-hud button, #mobile-controls button, .hud-editor-toolbar button'
    )]
      .filter((button) => (
        !this.performanceHud.contains(button)
        && button.getClientRects().length > 0
        && getComputedStyle(button).visibility !== 'hidden'
      ))
      .map((button) => button.getBoundingClientRect());
    const candidates = [
      { left: panel.left, top: panel.top },
      { left: margin, top: margin },
      { left: window.innerWidth - panel.width - margin, top: margin },
      { left: margin, top: window.innerHeight - panel.height - margin },
      { left: window.innerWidth - panel.width - margin, top: window.innerHeight - panel.height - margin }
    ];
    for (const button of buttons) {
      candidates.push(
        { left: button.left, top: button.top - panel.height - gap },
        { left: button.left, top: button.bottom + gap },
        { left: button.left - panel.width - gap, top: button.top },
        { left: button.right + gap, top: button.top }
      );
    }

    let best = null;
    for (const candidate of candidates) {
      const left = Math.min(
        Math.max(margin, window.innerWidth - panel.width - margin),
        Math.max(margin, candidate.left)
      );
      const top = Math.min(
        Math.max(margin, window.innerHeight - panel.height - margin),
        Math.max(margin, candidate.top)
      );
      const bounds = {
        left,
        top,
        right: left + panel.width,
        bottom: top + panel.height
      };
      const overlapCount = buttons.filter((button) => (
        bounds.left < button.right + gap
        && bounds.right + gap > button.left
        && bounds.top < button.bottom + gap
        && bounds.bottom + gap > button.top
      )).length;
      const distance = (left - panel.left) ** 2 + (top - panel.top) ** 2;
      const score = overlapCount * 1e12 + distance;
      if (!best || score < best.score) best = { left, top, score };
    }

    if (best) {
      this.performanceHud.style.left = `${best.left}px`;
      this.performanceHud.style.right = 'auto';
      this.performanceHud.style.top = `${best.top}px`;
    }
  }

  measurePageMemory(timestamp) {
    if (this.pageMemoryMeasurePending || timestamp - this.lastPageMemoryMeasureAt < 5000) return;
    const measure = performance.measureUserAgentSpecificMemory;
    if (typeof measure !== 'function') {
      this.pageMemoryStatus = 'N/D';
      this.lastPageMemoryMeasureAt = timestamp;
      return;
    }

    this.lastPageMemoryMeasureAt = timestamp;
    this.pageMemoryMeasurePending = true;
    try {
      Promise.resolve(measure.call(performance))
        .then(({ bytes }) => {
          this.pageMemoryBytes = Number.isFinite(bytes) ? bytes : null;
          this.pageMemoryStatus = this.pageMemoryBytes === null ? 'N/D' : '';
        })
        .catch((error) => {
          this.pageMemoryBytes = null;
          this.pageMemoryStatus = error?.name === 'SecurityError' ? 'Bloqueada' : 'Indisponível';
        })
        .finally(() => {
          this.pageMemoryMeasurePending = false;
        });
    } catch (error) {
      this.pageMemoryMeasurePending = false;
      this.pageMemoryStatus = error?.name === 'SecurityError' ? 'Bloqueada' : 'Indisponível';
    }
  }

  recordPerformanceFrame(timestamp, updateMs, renderMs, game) {
    if (!this.isPerformanceHudEnabled() || !this.performanceHud) return;
    this.performanceFrames.push(timestamp);
    while (this.performanceFrames.length > 1 && this.performanceFrames[0] < timestamp - 1000) {
      this.performanceFrames.shift();
    }
    this.measurePageMemory(timestamp);
    if (timestamp - this.lastPerformanceHudUpdate < 250) return;
    this.lastPerformanceHudUpdate = timestamp;
    this.positionPerformanceHudBelowControls();

    const firstFrame = this.performanceFrames[0];
    const frameCount = this.performanceFrames.length;
    const fps = frameCount > 1 && timestamp > firstFrame
      ? Math.round((frameCount - 1) * 1000 / (timestamp - firstFrame))
      : 0;
    const memoryBytes = performance.memory?.usedJSHeapSize;
    const deviceMemoryGb = navigator.deviceMemory;
    const canvas = game.canvas;
    const values = {
      '[data-performance-fps]': `${fps} FPS`,
      '[data-performance-frame]': `${fps ? (1000 / fps).toFixed(1) : '—'} ms`,
      '[data-performance-update]': `${updateMs.toFixed(1)} ms`,
      '[data-performance-render]': `${renderMs.toFixed(1)} ms`,
      '[data-performance-memory]': Number.isFinite(memoryBytes)
        ? `${(memoryBytes / 1048576).toFixed(0)} MB`
        : 'N/D',
      '[data-performance-page-memory]': Number.isFinite(this.pageMemoryBytes)
        ? `${(this.pageMemoryBytes / 1048576).toFixed(0)} MB`
        : this.pageMemoryStatus,
      '[data-performance-device-memory]': Number.isFinite(deviceMemoryGb)
        ? `~${deviceMemoryGb} GB`
        : 'N/D',
      '[data-performance-dom]': document.getElementsByTagName('*').length.toLocaleString(),
      '[data-performance-canvas]': `${canvas.width} × ${canvas.height} · DPR ${(canvas.width / Math.max(1, canvas.clientWidth)).toFixed(2)} · ${this.state.settings.graphicsQuality}`
    };
    for (const [selector, value] of Object.entries(values)) {
      const element = this.performanceHud.querySelector(selector);
      if (element) element.textContent = value;
    }
  }

  createNumberField(labelText, attribute, key, max = MAX_DEBUG_VALUE) {
    const label = document.createElement('label');
    label.textContent = labelText;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = String(max);
    input.step = '1';
    input.setAttribute(attribute, key);
    label.appendChild(input);
    return label;
  }

  syncFields() {
    if (!this.panel) return;
    const setValue = (selector, value) => {
      const input = this.panel.querySelector(selector);
      if (input) input.value = String(value);
    };
    setValue('[data-dev-value="coins"]', this.state.coins);
    setValue('[data-dev-value="level"]', this.state.level);
    setValue('[data-dev-value="reputation"]', this.state.reputation);
    for (const stat of ['totalHarvested', 'customersServed', 'bouquetsCrafted']) {
      setValue(`[data-dev-stat="${stat}"]`, this.state.stats[stat] || 0);
    }
    for (const flowerId of FLOWER_ORDER) {
      setValue(`[data-dev-stock="${flowerId}"]`, this.state.stock[flowerId] || 0);
      setValue(`[data-dev-basket="${flowerId}"]`, this.state.basket.filter((id) => id === flowerId).length);
      const unlocked = this.panel.querySelector(`[data-dev-unlock-flower="${flowerId}"]`);
      if (unlocked) unlocked.checked = this.state.unlockedFlowers[flowerId] === true;
    }
    for (const [upgradeId, upgrade] of Object.entries(UPGRADES_CONFIG)) {
      setValue(`[data-dev-upgrade="${upgradeId}"]`, this.state.upgrades[upgradeId] || 0);
    }
    for (const role of ['cashier', 'harvester']) {
      const employee = this.panel.querySelector(`[data-dev-employee="${role}"]`);
      if (employee) employee.checked = this.state.employment.active[role] === true;
    }

    const plots = this.panel.querySelector('[data-dev-fields="plots"]');
    if (!plots) return;
    plots.replaceChildren();
    this.state.plots.forEach((plot) => {
      const label = document.createElement('label');
      label.className = 'developer-tools-check';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = plot.unlocked;
      input.disabled = plot.id === 0;
      input.dataset.devPlot = String(plot.id);
      const text = document.createElement('span');
      text.textContent = `Terreno ${plot.id + 1} · ${FLOWERS_CONFIG[plot.flowerId]?.name || plot.flowerId}${plot.optional ? ' · extra' : ''}`;
      label.append(input, text);
      plots.appendChild(label);
    });

    const orders = this.panel.querySelector('[data-dev-fields="orders"]');
    orders?.replaceChildren();
    this.state.orders.forEach((order) => {
      const label = document.createElement('label');
      label.className = 'developer-tools-check';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = order.isCompleted === true;
      input.dataset.devOrder = order.id;
      const text = document.createElement('span');
      text.textContent = `Encomenda concluída · ${order.title}`;
      label.append(input, text);
      orders?.appendChild(label);
    });
  }

  readNumber(selector, { min = 0, max = MAX_DEBUG_VALUE } = {}) {
    const input = this.panel?.querySelector(selector);
    const value = Number(input?.value);
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error(`Verifica o valor do campo "${input?.closest('label')?.firstChild?.textContent || 'numérico'}".`);
    }
    return value;
  }

  runAction(action) {
    if (!this.isAuthorized()) {
      this.refreshAccess();
      return;
    }

    try {
      if (action === 'progress') this.applyProgress();
      else if (action === 'inventory') this.applyInventory();
      else if (action === 'upgrades') this.applyUpgrades();
      else if (action === 'garden') this.applyGarden();
      else if (action === 'unlock-all') this.unlockAll();
      else if (action === 'complete-orders') this.completeOrders();
      else if (action === 'add-coins') this.state.addCoins(this.readNumber('[data-dev-value="coinGrant"]', { min: 1 }));
      else if (action === 'unlock-subsolo') this.unlockSubsolo();
      else if (action === 'enter-subsolo') this.enterSubsolo();
      else if (action === 'exit-subsolo') this.exitSubsolo();
      else if (action === 'fill-subsolo') this.fillSubsolo();
      else if (action === 'spawn-secret-customer') this.spawnSecretCustomer();
      else if (action === 'trigger-fiscal') this.triggerFiscal();
      else return;
      this.persistAndRefresh('Alterações de desenvolvimento guardadas.');
    } catch (error) {
      this.setStatus(error.message, true);
    }
  }

  unlockSubsolo() {
    this.state.level = Math.max(this.state.level, 33);
    this.state.coins = Math.max(this.state.coins, 500000);
    this.state.subsolo.conteudoSecreto.ativo = true;
    this.state.subsolo.conteudoSecreto.consentimento = true;
    this.state.subsolo.concessaoPaga = true;
    this.state.subsolo.desbloqueado = true;
    this.state.subsolo.conteudoSecreto.modoDiscreto = false;
    if (this.state.subsoloManager) {
      this.state.subsoloManager.data.respeito.nivel = Math.max(this.state.subsoloManager.data.respeito.nivel, 5);
    }
    this.hud?.showToast?.('Subsolo desbloqueado! Grelha disponível atrás da loja.', 'check');
  }

  enterSubsolo() {
    this.unlockSubsolo();
    const game = this.game || (typeof window !== 'undefined' ? window.floristGame : null);
    if (game?.sceneManager) {
      if (typeof document !== 'undefined') document.getElementById('modal-settings')?.classList.add('hidden');
      const started = game.sceneManager.startDescer();
      if (game.cinematicManager?.isPlaying) {
        this.hud?.showToast?.('A apresentação do Subsolo está a ser reproduzida.', 'info');
      } else if (started) {
        this.hud?.showToast?.('A descer para o Subsolo...', 'sprout');
      }
    }
  }

  exitSubsolo() {
    const game = this.game || (typeof window !== 'undefined' ? window.floristGame : null);
    if (game?.sceneManager) {
      if (typeof document !== 'undefined') document.getElementById('modal-settings')?.classList.add('hidden');
      game.sceneManager.startSubir();
      this.hud?.showToast?.('A subir para a superfície...', 'flower');
    }
  }

  fillSubsolo() {
    this.unlockSubsolo();
    const sub = this.state.subsoloManager;
    if (!sub) return;
    sub.data.recursos.energia = 100;
    sub.data.recursos.agua = 100;
    sub.data.recursos.combustivel = 100;
    sub.data.recursos.odor = 5;
    sub.data.armazemOculto.folhasSecas = Math.max(sub.data.armazemOculto.folhasSecas, 30);
    sub.data.armazemOculto.ramo = Math.max(sub.data.armazemOculto.ramo, 10);
    sub.data.armazemOculto.maco = Math.max(sub.data.armazemOculto.maco, 5);
    sub.data.armazemOculto.reserva = Math.max(sub.data.armazemOculto.reserva, 2);
    sub.data.mala.ramo = Math.max(sub.data.mala.ramo, 5);
    sub.data.cofre.ramo = Math.max(sub.data.cofre.ramo, 5);
    sub.data.cofre.maco = Math.max(sub.data.cofre.maco, 2);
    this.hud?.showToast?.('Recursos, sementes, armazém e cofre abastecidos!', 'check');
  }

  spawnSecretCustomer() {
    this.unlockSubsolo();
    const game = this.game || (typeof window !== 'undefined' ? window.floristGame : null);
    if (game?.secretCustomerManager) {
      if (typeof document !== 'undefined') document.getElementById('modal-settings')?.classList.add('hidden');
      game.secretCustomerManager.spawnSecretCustomer();
      if (game.secretCustomerManager.activeCustomer) {
        game.secretCustomerManager.activeCustomer.x = game.counter.x + 30;
        game.secretCustomerManager.activeCustomer.y = game.counter.y + 40;
        game.secretCustomerManager.activeCustomer.state = 'waiting';
      }
      this.hud?.showToast?.('Cliente secreto apareceu ao balcão!', 'book');
    }
  }

  triggerFiscal() {
    this.unlockSubsolo();
    const sub = this.state.subsoloManager;
    if (sub) {
      if (typeof document !== 'undefined') document.getElementById('modal-settings')?.classList.add('hidden');
      sub.data.calor.valor = 95;
      sub.startFiscalInspection();
      this.hud?.showToast?.('🚨 Fiscal a aproximar-se! Oculta o cofre no balcão!', 'lock');
    }
  }

  applyProgress() {
    this.state.coins = this.readNumber('[data-dev-value="coins"]');
    this.state.level = this.readNumber('[data-dev-value="level"]', { min: 1, max: 9999 });
    this.state.reputation = this.readNumber('[data-dev-value="reputation"]');
    this.state.ensureNextPlot();
    for (const stat of ['totalHarvested', 'customersServed', 'bouquetsCrafted']) {
      this.state.stats[stat] = this.readNumber(`[data-dev-stat="${stat}"]`);
    }
  }

  applyInventory() {
    for (const flowerId of FLOWER_ORDER) {
      this.state.stock[flowerId] = this.readNumber(
        `[data-dev-stock="${flowerId}"]`,
        { max: this.state.getFlowerStockCapacity(flowerId) }
      );
      this.state.unlockedFlowers[flowerId] = this.panel.querySelector(`[data-dev-unlock-flower="${flowerId}"]`).checked;
    }
    this.state.unlockedFlowers.daisy = true;
    const basket = [];
    for (const flowerId of FLOWER_ORDER) {
      const count = this.readNumber(`[data-dev-basket="${flowerId}"]`, { max: this.state.getBasketCapacity() });
      basket.push(...Array(count).fill(flowerId));
    }
    if (basket.length > this.state.getBasketCapacity()) {
      throw new Error(`O cesto suporta no máximo ${this.state.getBasketCapacity()} flores.`);
    }
    this.state.basket = basket;
  }

  applyUpgrades() {
    for (const [upgradeId, upgrade] of Object.entries(UPGRADES_CONFIG)) {
      this.state.upgrades[upgradeId] = this.readNumber(
        `[data-dev-upgrade="${upgradeId}"]`,
        { max: upgrade.maxLevel }
      );
    }
    for (const role of ['cashier', 'harvester']) {
      this.state.employment.active[role] = this.state.upgrades[role] > 0
        && this.panel.querySelector(`[data-dev-employee="${role}"]`).checked;
    }
    this.state.employment.nextPayrollAt = this.state.employment.active.cashier || this.state.employment.active.harvester
      ? Date.now() + 6 * 60 * 1000
      : null;
  }

  applyGarden() {
    this.panel.querySelectorAll('[data-dev-plot]').forEach((input) => {
      const plot = this.state.plots.find((entry) => entry.id === Number(input.dataset.devPlot));
      if (plot && plot.id !== 0) plot.unlocked = input.checked;
    });
    for (const flowerId of FLOWER_ORDER) {
      this.state.unlockedFlowers[flowerId] = flowerId === 'daisy'
        || this.state.plots.some((plot) => plot.unlocked && plot.flowerId === flowerId);
    }
    this.state.orders.forEach((order) => {
      order.isCompleted = this.panel.querySelector(`[data-dev-order="${order.id}"]`)?.checked || order.isCompleted;
    });
    this.state.ensureNextPlot();
  }

  unlockAll() {
    this.state.level = Math.max(20, this.state.level);
    this.state.reputation = 0;
    for (const flowerId of FLOWER_ORDER) {
      this.state.unlockedFlowers[flowerId] = true;
      let owned = this.state.getOwnedPlotCount(flowerId);
      while (owned < 2) {
        if (flowerId === 'daisy') {
          const lockedDaisy = this.state.plots.find((plot) => !plot.unlocked && plot.flowerId === flowerId);
          if (lockedDaisy) {
            lockedDaisy.unlocked = true;
            owned++;
            continue;
          }
        }
        const position = this.state.getNextPlotPosition();
        this.state.plots.push({
          id: Math.max(-1, ...this.state.plots.map((plot) => plot.id)) + 1,
          flowerId,
          unlocked: true,
          optional: true,
          cost: 0,
          ...position,
          flowers: Array.from({ length: 6 }, () => ({ progress: 0.5, timer: 0 }))
        });
        owned++;
      }
    }
    this.state.ensureNextPlot();
    this.syncFields();
  }

  completeOrders() {
    this.state.orders.forEach((order) => {
      order.isCompleted = true;
    });
    this.state.discoveredBouquets = [...new Set([
      ...this.state.discoveredBouquets,
      ...this.state.orders.map((order) => order.bouquetId).filter(Boolean)
    ])];
  }

  persistAndRefresh(message) {
    this.state.notify('state_loaded');
    this.state.save();
    this.hud.update();
    this.syncFields();
    this.setStatus(message);
  }

  setStatus(message, isError = false) {
    const status = this.panel?.querySelector('.developer-tools-status');
    if (!status) return;
    status.textContent = message;
    status.dataset.type = isError ? 'error' : 'success';
  }
}
