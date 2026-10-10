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
  constructor(state, hud, getUser) {
    this.state = state;
    this.hud = hud;
    this.getUser = getUser;
    this.panel = document.getElementById('developer-tools-panel');
    this.render();
    this.refreshAccess();
  }

  isAuthorized() {
    const user = this.getUser();
    return Array.isArray(user?.roles) && user.roles.includes('developer');
  }

  refreshAccess() {
    if (!this.panel) return;
    this.panel.classList.toggle('hidden', !this.isAuthorized());
  }

  render() {
    if (!this.panel) return;
    this.panel.innerHTML = `
      <header class="developer-tools-header">
        <div>
          <span class="developer-tools-eyebrow">ACESSO DE DESENVOLVIMENTO</span>
          <h3 id="developer-tools-title">Painel de desenvolvimento</h3>
        </div>
        <span class="developer-tools-badge">Conta autorizada</span>
      </header>
      <p class="setting-help">Controlos de teste para o progresso desta conta. As alterações ficam guardadas no teu dispositivo e sincronizam com esta conta quando a sincronização estiver ativa.</p>
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
      const button = event.target.closest('[data-dev-action]');
      if (!button) return;
      this.runAction(button.dataset.devAction);
    });
    this.panel.addEventListener('toggle', () => this.syncFields(), true);
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
      else return;
      this.persistAndRefresh('Alterações de desenvolvimento guardadas.');
    } catch (error) {
      this.setStatus(error.message, true);
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
