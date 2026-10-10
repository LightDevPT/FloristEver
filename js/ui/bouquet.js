import { FLOWERS_CONFIG, FLOWER_ORDER } from '../config/flowers.js';
import { WRAPPERS, ACCESSORIES, calculateBouquetHarmony } from '../config/bouquets.js';
import { UPGRADES_CONFIG } from '../config/upgrades.js';
import { CUSTOMER_CONFIG } from '../config/customers.js';
import { formatNumber, PALETTE, getCanvasPixelRatio } from '../utils.js';
import { getIcon } from '../icons.js';

export class BouquetUi {
  constructor(state, sound, hud, particles) {
    this.state = state;
    this.sound = sound;
    this.hud = hud;
    this.particles = particles;

    // Modais e botões
    this.modalBouquet = document.getElementById('modal-bouquet');
    this.modalBook = document.getElementById('modal-book');
    this.openBouquetBtn = document.getElementById('btn-open-bouquet');
    this.openBookBtn = document.getElementById('btn-open-book');

    // Elementos da Bancada
    this.stockListEl = document.getElementById('bouquet-stock-list');
    this.slotsRowEl = document.getElementById('bouquet-slots');
    this.wrapSelectorEl = document.getElementById('wrap-selector');
    this.accSelectorEl = document.getElementById('accessory-selector');
    this.harmonyTitleEl = document.getElementById('harmony-title');
    this.harmonyDescEl = document.getElementById('harmony-desc');
    this.harmonyBonusesEl = document.getElementById('harmony-bonuses');
    this.computedPriceEl = document.getElementById('bouquet-computed-price');
    this.craftBtn = document.getElementById('btn-craft-bouquet');
    this.previewDisplayEl = document.getElementById('bouquet-preview-display');
    this.activeOrderGuidanceEl = document.getElementById('active-order-guidance');

    // Estado da Bancada Atual
    this.selectedFlowers = []; // array de flowerId (até 5)
    this.selectedWrap = 'kraft';
    this.selectedAccessory = 'none';
    this.maxFlowers = 5;
    this.bookPageIndex = 0;
    this.bookTurning = false;
    this.activeOrderId = null;

    this.init();
    this.state.subscribe((event) => {
      if (
        ['basket_changed', 'flower_harvested', 'stock_updated', 'plot_unlocked', 'level_up', 'order_completed', 'order_cycle_completed', 'favorite_objective_changed', 'herbarium_updated', 'special_visitor_met', 'state_loaded'].includes(event)
        && this.modalBook
        && !this.modalBook.classList.contains('hidden')
      ) {
        this.renderBook();
      }
      if (event === 'order_cycle_completed') {
        this.hud.showToast(`Florada concluída! As encomendas da florada ${data.orderCycle} já chegaram.`, 'check');
      }
      if (
        ['stock_updated', 'plot_unlocked', 'level_up', 'state_loaded'].includes(event)
        && this.modalBouquet
        && !this.modalBouquet.classList.contains('hidden')
      ) {
        this.renderWorkbench();
      }
    });
  }

  init() {
    if (this.openBouquetBtn) {
      this.openBouquetBtn.addEventListener('click', () => {
        if (this.state.level < 5) {
          this.hud.showToast('Requer Nível 5 de Reputação para abrir a Bancada de Arranjos', 'lock');
          return;
        }
        this.openBouquetModal();
      });
    }

    if (this.openBookBtn) {
      this.openBookBtn.addEventListener('click', () => this.openBookModal());
    }

    // Fechar modais
    [this.modalBouquet, this.modalBook].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target.closest('[data-close]') || e.target === modal) {
            this.sound.playClick();
            modal.classList.add('hidden');
          }
        });
      }
    });

    const pageButtons = document.querySelectorAll('#modal-book .book-index-link');
    pageButtons.forEach((button, index) => {
      button.addEventListener('click', () => this.turnBookTo(index));
    });
    document.getElementById('book-prev-page')?.addEventListener('click', () => this.turnBookTo(0));
    document.getElementById('book-next-page')?.addEventListener('click', () => this.turnBookTo(1));
    window.addEventListener('keydown', (event) => {
      if (!this.modalBook || this.modalBook.classList.contains('hidden')) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.turnBookTo(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.turnBookTo(0);
      }
    });

    // Botão de Criar Ramo
    if (this.craftBtn) {
      this.craftBtn.addEventListener('click', () => this.craftBouquet());
    }

    this.renderSelectors();
  }

  openBouquetModal() {
    this.sound.playClick();
    if (this.modalBouquet) {
      this.modalBouquet.classList.remove('hidden');
      this.renderWorkbench();
    }
  }

  openBookModal() {
    this.sound.playClick();
    if (this.modalBook) {
      this.modalBook.classList.remove('hidden');
      this.renderBook();
      this.updateBookPage();
    }
  }

  turnBookTo(pageIndex) {
    if (this.bookTurning || pageIndex === this.bookPageIndex || ![0, 1].includes(pageIndex)) return;
    const page = document.getElementById('book-page');
    if (!page) return;
    this.bookTurning = true;
    const direction = pageIndex > this.bookPageIndex ? 'forward' : 'backward';
    page.classList.remove('is-turning-forward', 'is-turning-backward');
    void page.offsetWidth;
    page.classList.add(`is-turning-${direction}`);

    window.setTimeout(() => {
      this.bookPageIndex = pageIndex;
      this.updateBookPage();
    }, 330);
    window.setTimeout(() => {
      page.classList.remove(`is-turning-${direction}`);
      this.bookTurning = false;
    }, 680);
  }

  updateBookPage() {
    const selectedTab = this.bookPageIndex === 0 ? 'tab-orders' : 'tab-collection';
    const page = document.getElementById('book-page');
    const kicker = document.getElementById('book-page-kicker');
    const counter = document.getElementById('book-page-counter');
    const previous = document.getElementById('book-prev-page');
    const next = document.getElementById('book-next-page');
    document.querySelectorAll('#modal-book .book-index-link').forEach((button, index) => {
      const active = index === this.bookPageIndex;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    document.querySelectorAll('#modal-book .tab-pane').forEach((pane) => {
      const active = pane.id === selectedTab;
      pane.classList.toggle('active', active);
      pane.setAttribute('aria-hidden', String(!active));
    });
    if (kicker) kicker.textContent = this.bookPageIndex === 0 ? 'CAPÍTULO I' : 'CAPÍTULO II';
    if (counter) counter.textContent = this.bookPageIndex === 0 ? '01 / 02' : '02 / 02';
    if (previous) previous.disabled = this.bookPageIndex === 0;
    if (next) next.disabled = this.bookPageIndex === 1;
    if (page) page.setAttribute('aria-label', this.bookPageIndex === 0
      ? 'Página 1: Encomendas especiais'
      : 'Página 2: Herbário de ramos');
  }

  renderSelectors() {
    // Renderiza botões de embrulho
    if (this.wrapSelectorEl) {
      this.wrapSelectorEl.innerHTML = '';
      WRAPPERS.forEach(wrap => {
        const btn = document.createElement('button');
        btn.className = `option-pill ${wrap.id === this.selectedWrap ? 'active' : ''}`;
        btn.type = 'button';
        btn.textContent = wrap.name;
        btn.addEventListener('click', () => {
          this.selectedWrap = wrap.id;
          this.renderSelectors();
          this.calculateAndRefresh();
        });
        this.wrapSelectorEl.appendChild(btn);
      });
    }

    // Renderiza botões de acessórios
    if (this.accSelectorEl) {
      this.accSelectorEl.innerHTML = '';
      ACCESSORIES.forEach(acc => {
        const btn = document.createElement('button');
        btn.className = `option-pill ${acc.id === this.selectedAccessory ? 'active' : ''}`;
        btn.type = 'button';
        btn.textContent = `${acc.icon} ${acc.name}`;
        btn.addEventListener('click', () => {
          this.selectedAccessory = acc.id;
          this.renderSelectors();
          this.calculateAndRefresh();
        });
        this.accSelectorEl.appendChild(btn);
      });
    }
  }

  renderWorkbench() {
    this.renderSelectors();
    this.renderStockList();
    this.renderSlots();
    this.calculateAndRefresh();
  }

  getOrderRequirementCounts(order) {
    return order.requiredFlowers.reduce((counts, flowerId) => {
      counts[flowerId] = (counts[flowerId] || 0) + 1;
      return counts;
    }, {});
  }

  getOrderStatus(order) {
    const requiredLevel = Math.max(
      5,
      ...Object.keys(this.getOrderRequirementCounts(order))
        .map((flowerId) => FLOWERS_CONFIG[flowerId]?.requiredLevel || 1)
    );
    const missingFlowers = Object.keys(this.getOrderRequirementCounts(order))
      .filter((flowerId) => !this.state.unlockedFlowers[flowerId]);
    const totalStock = FLOWER_ORDER.reduce((total, flowerId) => {
      return total + (this.state.unlockedFlowers[flowerId] ? this.state.getSellableStock(flowerId) : 0);
    }, 0);

    return {
      requiredLevel,
      missingFlowers,
      isLocked: this.state.level < requiredLevel || missingFlowers.length > 0,
      totalStock,
      requirements: this.getOrderRequirementCounts(order)
    };
  }

  getActiveOrder() {
    return this.state.orders.find((order) => order.id === this.activeOrderId) || null;
  }

  orderMatchesSelectedBouquet(order) {
    const requirements = this.getOrderRequirementCounts(order);
    const hasRequiredFlowers = Object.entries(requirements).every(([flowerId, quantity]) => {
      return this.selectedFlowers.filter((id) => id === flowerId).length >= quantity;
    });
    const hasRequiredAccessories = !order.requiredAccessoryIds
      || order.requiredAccessoryIds.includes(this.selectedAccessory);
    const selectedStockCounts = this.selectedFlowers.reduce((counts, flowerId) => {
      counts[flowerId] = (counts[flowerId] || 0) + 1;
      return counts;
    }, {});
    const hasStockForSelection = Object.entries(selectedStockCounts).every(([flowerId, quantity]) => {
      return this.state.getSellableStock(flowerId) >= quantity;
    });

    return !order.isCompleted
      && !this.getOrderStatus(order).isLocked
      && this.selectedFlowers.length >= order.minFlowers
      && hasRequiredFlowers
      && (!order.requiredWrap || order.requiredWrap === this.selectedWrap)
      && hasRequiredAccessories
      && hasStockForSelection;
  }

  prepareOrder(orderId) {
    const order = this.state.orders.find((entry) => entry.id === orderId);
    if (!order || order.isCompleted || this.getOrderStatus(order).isLocked) return;

    this.selectedFlowers = [];
    const requirements = this.getOrderRequirementCounts(order);
    Object.entries(requirements).forEach(([flowerId, quantity]) => {
      const available = Math.min(quantity, this.state.getSellableStock(flowerId));
      for (let count = 0; count < available; count++) this.selectedFlowers.push(flowerId);
    });

    for (const flowerId of FLOWER_ORDER) {
      while (
        this.selectedFlowers.length < order.minFlowers
        && this.selectedFlowers.filter((id) => id === flowerId).length < this.state.getSellableStock(flowerId)
        && this.state.unlockedFlowers[flowerId]
      ) {
        this.selectedFlowers.push(flowerId);
      }
    }

    this.selectedWrap = order.requiredWrap || order.preferredWrap || 'kraft';
    this.selectedAccessory = order.requiredAccessoryIds?.[0] || 'none';
    this.activeOrderId = order.id;
    this.sound.playClick();
    if (this.modalBook) this.modalBook.classList.add('hidden');
    this.openBouquetModal();
  }

  renderOrderGuidance() {
    if (!this.activeOrderGuidanceEl) return;
    const order = this.getActiveOrder();
    this.activeOrderGuidanceEl.classList.toggle('hidden', !order);
    if (!order) {
      this.activeOrderGuidanceEl.innerHTML = '';
      return;
    }

    const requirements = this.getOrderRequirementCounts(order);
    const requirementRows = Object.entries(requirements).map(([flowerId, quantity]) => {
      const cfg = FLOWERS_CONFIG[flowerId];
      const selected = this.selectedFlowers.filter((id) => id === flowerId).length;
      const enough = selected >= quantity;
      return `<li class="${enough ? 'is-ready' : 'is-missing'}">${cfg?.name || flowerId}: ${selected}/${quantity} no ramo <span>(stock: ${this.state.stock[flowerId] || 0})</span></li>`;
    }).join('');
    const wrap = WRAPPERS.find((entry) => entry.id === (order.requiredWrap || order.preferredWrap));
    const accessoryNames = order.requiredAccessoryIds
      ?.map((id) => ACCESSORIES.find((entry) => entry.id === id)?.name || id)
      .join(' ou ');
    const meetsRequirements = this.orderMatchesSelectedBouquet(order);
    const missingCount = Math.max(0, order.minFlowers - this.selectedFlowers.length);

    this.activeOrderGuidanceEl.innerHTML = `
      <div class="active-order-heading">
        <div><span class="active-order-kicker">Encomenda selecionada</span><strong>${order.title}</strong></div>
        <button type="button" class="active-order-cancel">Cancelar</button>
      </div>
      <ul class="active-order-checklist">
        ${requirementRows}
        <li class="${missingCount === 0 ? 'is-ready' : 'is-missing'}">Flores no total: ${this.selectedFlowers.length}/${order.minFlowers}${missingCount ? ` <span>(faltam ${missingCount})</span>` : ''}</li>
        ${order.requiredWrap
          ? `<li class="${this.selectedWrap === order.requiredWrap ? 'is-ready' : 'is-missing'}">Embrulho exigido: ${wrap?.name || order.requiredWrap}</li>`
          : `<li class="is-hint">Embrulho sugerido: ${wrap?.name || 'qualquer'}</li>`}
        ${order.requiredAccessoryIds
          ? `<li class="${order.requiredAccessoryIds.includes(this.selectedAccessory) ? 'is-ready' : 'is-missing'}">Acessório: ${accessoryNames}</li>`
          : ''}
      </ul>
      <p class="active-order-status">${meetsRequirements
        ? 'Tudo certo — podes entregar esta encomenda.'
        : 'Completa os requisitos acima. Se faltar stock, fecha a bancada, colhe flores e volta a preparar a encomenda.'}</p>
    `;

    this.activeOrderGuidanceEl.querySelector('.active-order-cancel')?.addEventListener('click', () => {
      this.activeOrderId = null;
      this.renderWorkbench();
    });
  }

  renderStockList() {
    if (!this.stockListEl) return;
    this.stockListEl.innerHTML = '';

    let totalAvailable = 0;

    for (const fId of FLOWER_ORDER) {
      const cfg = FLOWERS_CONFIG[fId];
      if (!this.state.unlockedFlowers[fId]) continue;

      const availableQty = this.getAvailableStockForId(fId);
      totalAvailable += availableQty;

      const item = document.createElement('button');
      item.type = 'button';
      item.className = `stock-flower-item ${availableQty <= 0 ? 'out-of-stock' : ''}`;
      item.setAttribute(
        'aria-label',
        `Adicionar ${cfg.name} ao arranjo, ${availableQty} unidades em stock de ${this.state.getFlowerStockCapacity(fId)}`
      );

      item.innerHTML = `
        <div class="flower-tag">
          <span class="flower-color-dot" style="background:${cfg.color};" aria-hidden="true"></span>
          <span>${cfg.name}</span>
        </div>
        <span class="stock-qty-pill">${availableQty}/${this.state.getFlowerStockCapacity(fId)}</span>
      `;

      if (availableQty > 0) {
        item.addEventListener('click', () => {
          if (this.selectedFlowers.length < this.maxFlowers) {
            this.sound.playClick();
            this.selectedFlowers.push(fId);
            this.renderWorkbench();
          }
        });
      } else {
        item.disabled = true;
      }

      this.stockListEl.appendChild(item);
    }

    if (totalAvailable === 0) {
      const emptyNotice = document.createElement('div');
      emptyNotice.className = 'empty-state-hint';
      emptyNotice.textContent = 'Sem flores colhidas em armazém. Colhe flores no jardim para abastecer o ateliê.';
      this.stockListEl.appendChild(emptyNotice);
    }
  }

  // Stock disponível descontando as flores já colocadas nos slots
  getAvailableStockForId(fId) {
    const inStock = this.state.stock[fId] || 0;
    const inWorkbench = this.selectedFlowers.filter(id => id === fId).length;
    return Math.max(0, inStock - this.state.getStockMinimum(fId) - inWorkbench);
  }

  renderSlots() {
    if (!this.slotsRowEl) return;
    this.slotsRowEl.innerHTML = '';

    for (let i = 0; i < this.maxFlowers; i++) {
      const fId = this.selectedFlowers[i];
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = `slot-box ${fId ? 'filled' : ''}`;

      if (fId) {
        const cfg = FLOWERS_CONFIG[fId];
        slot.innerHTML = `<span class="slot-flower-dot" style="background:${cfg ? cfg.color : '#E0577D'};" aria-hidden="true"></span>`;
        slot.title = `${cfg ? cfg.name : 'Flor'} (Clica para retirar do arranjo)`;
        slot.setAttribute('aria-label', `Remover ${cfg ? cfg.name : 'flor'} do arranjo`);
        slot.addEventListener('click', () => {
          this.sound.playClick();
          this.selectedFlowers.splice(i, 1);
          this.renderWorkbench();
        });
      } else {
        slot.textContent = '+';
        slot.setAttribute('aria-label', `Espaço ${i + 1} vazio`);
        slot.disabled = true;
      }

      this.slotsRowEl.appendChild(slot);
    }
  }

  calculateAndRefresh() {
    const wrap = WRAPPERS.find(w => w.id === this.selectedWrap) || WRAPPERS[0];
    const acc = ACCESSORIES.find(a => a.id === this.selectedAccessory) || ACCESSORIES[0];

    const harmony = calculateBouquetHarmony(this.selectedFlowers, this.selectedWrap, this.selectedAccessory);

    if (this.harmonyTitleEl) this.harmonyTitleEl.textContent = harmony.title;
    if (this.harmonyDescEl) {
      if (this.selectedFlowers.length === 0) {
        this.harmonyDescEl.textContent = 'Adiciona pelo menos 3 flores do stock para criar um arranjo.';
      } else {
        const meanings = this.selectedFlowers.map(id => FLOWERS_CONFIG[id]?.name).join(', ');
        this.harmonyDescEl.textContent = `Composição poética: ${meanings}.`;
      }
    }

    if (this.harmonyBonusesEl) {
      this.harmonyBonusesEl.innerHTML = '';
      harmony.bonuses.forEach(b => {
        const li = document.createElement('li');
        li.textContent = `✔ ${b}`;
        this.harmonyBonusesEl.appendChild(li);
      });
      if (wrap.multiplier > 1.0) {
        const li = document.createElement('li');
        li.textContent = `✔ ${wrap.name} (x${wrap.multiplier})`;
        this.harmonyBonusesEl.appendChild(li);
      }
      if (acc.multiplier > 1.0) {
        const li = document.createElement('li');
        li.textContent = `✔ ${acc.name} (x${acc.multiplier})`;
        this.harmonyBonusesEl.appendChild(li);
      }
      if (this.state.upgrades.bouquetBench > 0) {
        const li = document.createElement('li');
        li.textContent = `✔ Bónus de venda da bancada (+${Math.round(UPGRADES_CONFIG.bouquetBench.bonusPerLevel * 100)}%)`;
        this.harmonyBonusesEl.appendChild(li);
      }
    }

    // Preço Base das flores somadas
    let baseSum = 0;
    this.selectedFlowers.forEach(id => {
      baseSum += (FLOWERS_CONFIG[id]?.value || 5);
    });

    const benchBonus = 1 + (this.state.upgrades.bouquetBench || 0)
      * UPGRADES_CONFIG.bouquetBench.bonusPerLevel;
    const finalMultiplier = harmony.harmonyMultiplier * harmony.valueMultiplier
      * wrap.multiplier * acc.multiplier * benchBonus;
    const finalPrice = Math.round(baseSum * finalMultiplier);

    if (this.computedPriceEl) {
      this.computedPriceEl.textContent = formatNumber(finalPrice);
    }

    if (this.craftBtn) {
      const activeOrder = this.getActiveOrder();
      const canCraft = activeOrder
        ? this.orderMatchesSelectedBouquet(activeOrder)
        : this.selectedFlowers.length >= 3;
      this.craftBtn.disabled = !canCraft;
      this.craftBtn.textContent = activeOrder ? 'Entregar encomenda' : 'Criar Ramo Perfeito';
    }

    this.renderOrderGuidance();
    this.renderBouquetCanvasPreview(wrap, acc);
  }

  renderBouquetCanvasPreview(wrap, acc) {
    if (!this.previewDisplayEl) return;
    this.previewDisplayEl.innerHTML = '';

    if (this.selectedFlowers.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'bouquet-preview-empty';
      empty.textContent = 'O teu arranjo aparecerá aqui';
      this.previewDisplayEl.appendChild(empty);
      return;
    }

    const canvas = document.createElement('canvas');
    const width = 240;
    const height = 140;
    const displayWidth = this.previewDisplayEl.clientWidth;
    const displayHeight = this.previewDisplayEl.clientHeight;
    const pixelRatio = getCanvasPixelRatio(displayWidth, displayHeight, window.devicePixelRatio);
    canvas.width = Math.round(displayWidth * pixelRatio);
    canvas.height = Math.round(displayHeight * pixelRatio);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Desenhar cone de papel de embrulho
    ctx.save();
    ctx.translate(120, 110);

    ctx.fillStyle = wrap.color;
    ctx.strokeStyle = PALETTE.deepGreen;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.lineTo(-38, -35);
    ctx.lineTo(38, -35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Acessório / Fita
    if (acc.id !== 'none') {
      ctx.fillStyle = PALETTE.raspberryPink;
      ctx.beginPath();
      ctx.arc(0, -10, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Desenhar as flores dispostas harmonicamente no topo do cone
    const count = this.selectedFlowers.length;
    this.selectedFlowers.forEach((fId, idx) => {
      const cfg = FLOWERS_CONFIG[fId];
      if (!cfg) return;

      const angle = ((idx - (count - 1) / 2) / (count || 1)) * 0.9;
      const dist = 42;
      const fx = Math.sin(angle) * dist;
      const fy = -38 - Math.cos(angle) * 14;

      ctx.save();
      ctx.translate(fx, fy);
      // Pétalas estilizadas
      ctx.fillStyle = cfg.color;
      ctx.strokeStyle = PALETTE.deepGreen;
      ctx.lineWidth = 2;
      for (let p = 0; p < (cfg.petals || 6); p++) {
        const pa = (p / (cfg.petals || 6)) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(pa) * 8, Math.sin(pa) * 8, 6, 4, pa, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      // Centro
      ctx.fillStyle = cfg.centerColor || PALETTE.sunYellow;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    ctx.restore();
    this.previewDisplayEl.appendChild(canvas);
  }

  craftBouquet() {
    if (this.selectedFlowers.length < 3) return;

    const selectedOrder = this.getActiveOrder();
    if (selectedOrder && !this.orderMatchesSelectedBouquet(selectedOrder)) {
      this.hud.showToast('O ramo ainda não cumpre todos os requisitos da encomenda', 'lock');
      return;
    }

    // Deduz flores do stock
    for (const fId of this.selectedFlowers) {
      if (this.state.getSellableStock(fId) <= 0) {
        this.hud.showToast('Flores insuficientes em armazém', 'flower');
        return;
      }
    }

    for (const fId of this.selectedFlowers) {
      this.state.stock[fId] -= 1;
      this.state.recordFlowerUse(fId, 'sold');
      this.state.recordFlowerUse(fId, 'bouquet');
    }

    const wrap = WRAPPERS.find(w => w.id === this.selectedWrap) || WRAPPERS[0];
    const acc = ACCESSORIES.find(a => a.id === this.selectedAccessory) || ACCESSORIES[0];
    const harmony = calculateBouquetHarmony(this.selectedFlowers, this.selectedWrap, this.selectedAccessory);

    let baseSum = 0;
    this.selectedFlowers.forEach(id => { baseSum += (FLOWERS_CONFIG[id]?.value || 5); });
    const bouquetBonus = 1 + (this.state.upgrades.bouquetBench || 0)
      * UPGRADES_CONFIG.bouquetBench.bonusPerLevel;
    const finalPrice = Math.round(
      baseSum * harmony.harmonyMultiplier * harmony.valueMultiplier
        * wrap.multiplier * acc.multiplier * bouquetBonus
    );
    const repGained = Math.round(finalPrice * 0.9 + 15);

    const matchedOrder = selectedOrder || this.state.orders.find((order) => {
      return !order.isCompleted && this.orderMatchesSelectedBouquet(order);
    }) || null;

    let extraCoins = 0;
    let extraRep = 0;
    if (matchedOrder) {
      if (!this.state.completeSpecialOrder(matchedOrder.id)) {
        this.hud.showToast('Não foi possível concluir esta encomenda. Tenta novamente.', 'lock');
        return;
      }
      extraCoins = matchedOrder.bonusCoins;
      extraRep = matchedOrder.bonusRep;
      this.hud.showToast(`Encomenda concluída: ${matchedOrder.title} (+${extraCoins} moedas)`, 'check');
    }

    const totalEarned = finalPrice + extraCoins;
    this.state.addCoins(totalEarned);
    this.state.addReputation(repGained + extraRep);
    this.state.stats.bouquetsCrafted++;

    // Registar no Livro de Ramos se for combinação nova
    const recipeKey = [...this.selectedFlowers].sort().join('+');
    if (!this.state.discoveredBouquets.includes(recipeKey)) {
      this.state.discoveredBouquets.push(recipeKey);
      this.hud.showToast('Nova receita botânica catalogada no registo', 'book');
    }

    this.sound.playBouquetCraft();
    this.particles.emitHearts(window.innerWidth / 2, window.innerHeight / 2, 8);
    this.particles.emitFloatingText(window.innerWidth / 2, window.innerHeight / 2 - 30, `+${totalEarned}`, PALETTE.sunYellow);

    // Limpar bancada
    this.selectedFlowers = [];
    this.activeOrderId = null;
    this.state.save();
    this.renderWorkbench();

    if (this.modalBouquet) {
      this.modalBouquet.classList.add('hidden');
    }
  }

  renderBook() {
    // 1. Encomendas Especiais
    const cycleTitle = document.getElementById('order-cycle-title');
    const cycleDescription = document.getElementById('order-cycle-description');
    const cycleProgress = document.getElementById('order-cycle-progress');
    const completedOrders = this.state.orders.filter((order) => order.isCompleted).length;
    const totalOrders = this.state.orders.length;
    const cycleNumber = this.state.orderCycle || 1;
    if (cycleTitle) cycleTitle.textContent = `Florada ${cycleNumber}`;
    if (cycleDescription) {
      cycleDescription.textContent = `${completedOrders} de ${totalOrders} encomendas concluídas · completa todas para receber uma nova florada.`;
    }
    if (cycleProgress) {
      const progress = totalOrders > 0 ? Math.round(completedOrders / totalOrders * 100) : 0;
      cycleProgress.setAttribute('aria-valuenow', String(progress));
      cycleProgress.setAttribute('aria-valuetext', `${completedOrders} de ${totalOrders} encomendas`);
      cycleProgress.querySelector('span').style.width = `${progress}%`;
    }

    const ordersListEl = document.getElementById('orders-list');
    if (ordersListEl) {
      ordersListEl.innerHTML = '';
      if (this.state.orders.length === 0) {
        ordersListEl.innerHTML = '<div class="empty-state-hint">Nenhuma encomenda pendente. Novos clientes solicitarão encomendas especiais ao atingir novos níveis.</div>';
      } else {
        this.state.orders.forEach(ord => {
          const orderStatus = this.getOrderStatus(ord);
          const flowerRequirements = Object.entries(orderStatus.requirements).map(([flowerId, quantity]) => {
            const flower = FLOWERS_CONFIG[flowerId];
            const stock = this.state.getSellableStock(flowerId);
            const ready = this.state.unlockedFlowers[flowerId] && stock >= quantity;
            return `<li class="${ready ? 'is-ready' : 'is-missing'}">${flower?.name || flowerId} <span>${stock}/${quantity} em stock</span></li>`;
          }).join('');
          const totalReady = orderStatus.totalStock >= ord.minFlowers;
          const statusText = ord.isCompleted
            ? 'Concluída'
            : orderStatus.isLocked
              ? `Bloqueada · nível ${orderStatus.requiredLevel}`
              : 'Disponível';
          const orderWrap = WRAPPERS.find((wrap) => wrap.id === (ord.requiredWrap || ord.preferredWrap));
          const accessories = ord.requiredAccessoryIds
            ?.map((id) => ACCESSORIES.find((entry) => entry.id === id)?.name || id)
            .join(' ou ');
          const card = document.createElement('div');
          card.className = `order-card${ord.isCompleted ? ' order-completed' : ''}${orderStatus.isLocked ? ' order-locked' : ''}`;
          card.innerHTML = `
            <div class="order-info">
              <h4>${ord.title} <span class="status-tag ${ord.isCompleted ? 'status-completed' : orderStatus.isLocked ? 'status-locked' : 'status-available'}">${statusText}</span></h4>
              <p><strong>Cliente:</strong> ${ord.customerName}</p>
              <p class="order-clue">${ord.clue}</p>
              <div class="order-requirements">
                <strong>O que preparar (${ord.minFlowers} flores no mínimo)</strong>
                <ul>${flowerRequirements}</ul>
                <p class="${totalReady ? 'is-ready' : 'is-missing'}">Stock total para o ramo: ${orderStatus.totalStock}/${ord.minFlowers} flores</p>
                <p>${ord.requiredWrap ? 'Embrulho exigido' : 'Embrulho sugerido'}: ${orderWrap?.name || 'qualquer'}</p>
                ${accessories ? `<p>Acessório obrigatório: ${accessories}</p>` : ''}
                ${orderStatus.isLocked
                  ? `<p class="order-block-reason">${this.state.level < orderStatus.requiredLevel
                    ? `Desbloqueia no nível ${orderStatus.requiredLevel}.`
                    : `Cultiva primeiro: ${orderStatus.missingFlowers.map((id) => FLOWERS_CONFIG[id]?.name || id).join(', ')}.`}</p>`
                  : ''}
              </div>
              <div class="order-reward">
                <span class="reward-pill"><span class="icon-inline">${getIcon('coin')}</span> +${ord.bonusCoins}</span>
                <span class="reward-pill"><span class="icon-inline">${getIcon('sprout')}</span> +${ord.bonusRep} XP</span>
              </div>
            </div>
          `;
          const prepareButton = document.createElement('button');
          prepareButton.type = 'button';
          prepareButton.className = 'btn-primary order-prepare-btn';
          prepareButton.textContent = ord.isCompleted ? 'Encomenda concluída' : 'Preparar ramo';
          prepareButton.disabled = ord.isCompleted || orderStatus.isLocked;
          prepareButton.addEventListener('click', () => this.prepareOrder(ord.id));
          card.appendChild(prepareButton);
          ordersListEl.appendChild(card);
        });
      }
    }

    const flowerCollectionEl = document.getElementById('flower-collection-grid');
    const flowerSummaryEl = document.getElementById('flower-collection-summary');
    if (flowerCollectionEl) {
      const unlockedCount = FLOWER_ORDER.filter((flowerId) => (
        this.state.unlockedFlowers[flowerId]
        || this.state.plots.some((plot) => plot.unlocked && plot.flowerId === flowerId)
      )).length;
      const harvestedCount = FLOWER_ORDER.filter((flowerId) => (
        (Number(this.state.collection.flowerRecords[flowerId]?.harvested) || 0) > 0
      )).length;
      if (flowerSummaryEl) {
        flowerSummaryEl.textContent = `${harvestedCount} de ${FLOWER_ORDER.length} espécies colhidas · ${unlockedCount} desbloqueadas`;
      }
      flowerCollectionEl.replaceChildren();

      for (const flowerId of FLOWER_ORDER) {
        const flower = FLOWERS_CONFIG[flowerId];
        const unlocked = this.state.unlockedFlowers[flowerId]
          || this.state.plots.some((plot) => plot.unlocked && plot.flowerId === flowerId);
        const harvested = this.state.collection.harvestedFlowers[flowerId] === true;
        const record = this.state.collection.flowerRecords[flowerId] || {};
        const status = harvested
          ? 'Colhida'
          : unlocked
            ? 'Desbloqueada · por colher'
            : 'Ainda não desbloqueada';
        const card = document.createElement('article');
        card.className = `recipe-card flower-catalog-card${unlocked ? '' : ' undiscovered'}`;
        const swatch = document.createElement('span');
        swatch.className = 'flower-color-dot';
        swatch.style.backgroundColor = flower.color;
        swatch.setAttribute('aria-hidden', 'true');
        const title = document.createElement('strong');
        title.className = 'recipe-title';
        title.textContent = flower.name;
        const detail = document.createElement('p');
        detail.className = 'recipe-subtitle';
        detail.textContent = status;
        const description = document.createElement('p');
        description.className = 'flower-catalog-description';
        const mastery = this.state.getFlowerMastery(flowerId);
        const meaning = unlocked ? flower.meaning : `Desbloqueia no nível ${flower.requiredLevel}.`;
        description.textContent = [
          meaning,
          `Colhidas ${record.harvested || 0}`,
          `vendidas ${record.sold || 0}`,
          `usadas em ramos ${record.usedInBouquets || 0}`
        ].join(' · ');
        const masteryLabel = document.createElement('p');
        masteryLabel.className = 'flower-mastery-progress';
        masteryLabel.textContent = `Mestria visual: ${mastery.completed}/${mastery.total}`;
        const masteryBadges = document.createElement('div');
        masteryBadges.className = 'flower-mastery-badges';
        for (const milestone of mastery.milestones) {
          const badge = document.createElement('span');
          badge.className = `flower-mastery-badge${milestone.complete ? ' is-earned' : ''}`;
          badge.textContent = milestone.complete ? `✦ ${milestone.title}` : `○ ${milestone.title}`;
          badge.title = milestone.complete
            ? `${milestone.title} desbloqueado`
            : [
                milestone.harvested ? `${milestone.harvested} colheitas` : '',
                milestone.sold ? `${milestone.sold} vendas` : '',
                milestone.usedInBouquets ? `${milestone.usedInBouquets} usos em ramos` : ''
              ].filter(Boolean).join(' · ');
          masteryBadges.appendChild(badge);
        }
        card.setAttribute('aria-label', `${flower.name}: ${status}`);
        card.append(swatch, title, detail, description, masteryLabel, masteryBadges);
        flowerCollectionEl.appendChild(card);
      }
    }

    const visitorsEl = document.getElementById('special-visitors-list');
    const visitorsSummaryEl = document.getElementById('special-visitors-summary');
    if (visitorsEl) {
      visitorsEl.replaceChildren();
      if (visitorsSummaryEl) {
        visitorsSummaryEl.textContent = `${this.state.specialVisitors.length} de ${CUSTOMER_CONFIG.specialVisitors.length} visitantes especiais conhecidos`;
      }
      for (const visitor of CUSTOMER_CONFIG.specialVisitors) {
        const met = this.state.specialVisitors.includes(visitor.id);
        const card = document.createElement('article');
        card.className = `special-visitor-card${met ? ' is-met' : ''}`;
        const title = document.createElement('strong');
        title.textContent = met ? visitor.name : 'Visitante por conhecer';
        const description = document.createElement('p');
        description.textContent = met ? visitor.thanks : 'Continua a receber visitas na floricultura.';
        card.append(title, description);
        visitorsEl.appendChild(card);
      }
    }

    const exhibitionsEl = document.getElementById('herbarium-exhibitions-list');
    if (exhibitionsEl) {
      exhibitionsEl.replaceChildren();
      for (const exhibition of this.state.getHerbariumExhibitions()) {
        const card = document.createElement('article');
        card.className = `herbarium-exhibition${exhibition.installed ? ' is-installed' : exhibition.complete ? ' is-complete' : ''}`;
        const title = document.createElement('strong');
        title.textContent = exhibition.title;
        const description = document.createElement('p');
        description.textContent = exhibition.description;
        const requirements = document.createElement('p');
        const flowerNames = exhibition.flowers
          .map((id) => FLOWERS_CONFIG[id]?.name || id)
          .join(', ');
        const bouquetNames = exhibition.bouquets.map((recipe) => (
          recipe.split('+').map((id) => FLOWERS_CONFIG[id]?.name || id).join(' + ')
        )).join(', ');
        requirements.textContent = `Coleção: ${flowerNames} · Ramo catalogado: ${bouquetNames}`;
        const status = document.createElement('span');
        status.className = 'herbarium-exhibition-status';
        status.textContent = exhibition.installed
          ? 'Exposição permanente montada na loja'
          : exhibition.complete
            ? 'Coleção completa'
            : 'Coleção por completar';
        card.append(
          title,
          description,
          requirements,
          status,
          this.hud.createFavoriteButton('collection', exhibition.id)
        );
        if (exhibition.complete && !exhibition.installed) {
          const install = document.createElement('button');
          install.type = 'button';
          install.className = 'btn-primary';
          install.textContent = 'Montar exposição';
          install.addEventListener('click', () => {
            if (!this.state.installHerbariumExhibition(exhibition.id)) {
              throw new Error(`Não foi possível montar a exposição "${exhibition.title}".`);
            }
            this.hud.showToast('Exposição permanente montada na loja!', 'book');
            this.renderBook();
          });
          card.appendChild(install);
        }
        exhibitionsEl.appendChild(card);
      }
    }

    // 2. Coleção de Ramos Descobertos
    const collectionEl = document.getElementById('recipes-collection-grid');
    if (collectionEl) {
      collectionEl.replaceChildren();
      if (this.state.discoveredBouquets.length === 0) {
        const hint = document.createElement('div');
        hint.className = 'empty-state-hint';
        hint.textContent = 'Nenhum arranjo catalogado. Experimenta compor combinações de flores na bancada de trabalho para desbloquear registos botânicos.';
        collectionEl.appendChild(hint);
      } else {
        this.state.discoveredBouquets.forEach(key => {
          const flowerIds = key.split('+');
          const names = flowerIds.map(id => FLOWERS_CONFIG[id]?.name || id).join(' + ');

          const flowerDots = flowerIds.map(id => {
            const color = FLOWERS_CONFIG[id]?.color || '#E0577D';
            return `<span class="flower-color-dot" style="background:${color};" title="${FLOWERS_CONFIG[id]?.name || id}"></span>`;
          }).join('');

          const card = document.createElement('div');
          card.className = 'recipe-card';
          card.innerHTML = `
            <div class="recipe-swatches">${flowerDots}</div>
            <strong class="recipe-title">${names}</strong>
            <p class="recipe-subtitle">Composição catalogada</p>
          `;
          collectionEl.appendChild(card);
        });
      }
    }
  }
}
