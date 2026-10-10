// ========================================================
// FloristEver - Interface do HUD Superior & Toasts (hud.js)
// Atualização em tempo real de moedas, reputação e cesto
// ========================================================
import { formatNumber, PALETTE } from '../utils.js';
import { getIcon } from '../icons.js';
import { CUSTOMER_CONFIG } from '../config/customers.js';

export class HudManager {
  constructor(state, sound) {
    this.state = state;
    this.sound = sound;

    // Elementos DOM do HUD
    this.coinEl = document.getElementById('hud-coin-amount');
    this.levelBadgeEl = document.getElementById('hud-level-number');
    this.repFillEl = document.getElementById('hud-rep-fill');
    this.repTextEl = document.getElementById('hud-rep-text');
    this.basketPillEl = document.getElementById('hud-basket-pill');
    this.basketCountEl = document.getElementById('hud-basket-count');
    this.bouquetBtn = document.getElementById('btn-open-bouquet');
    this.bouquetLockBadge = document.getElementById('bouquet-lock-badge');
    this.toastContainer = document.getElementById('toast-container');
    this.interactionPrompt = document.getElementById('interaction-prompt');
    this.interactionLabel = document.getElementById('interaction-label');
    this.favoriteObjectiveEl = document.getElementById('hud-favorite-objective');
    this.favoriteObjectiveTitleEl = document.getElementById('hud-favorite-objective-title');
    this.favoriteObjectiveNextEl = document.getElementById('hud-favorite-objective-next');
    this.favoriteObjectiveOpenBtn = document.getElementById('hud-favorite-objective-open');
    this.favoriteObjectiveClearBtn = document.getElementById('hud-favorite-objective-clear');
    this.onOpenFavoriteObjective = null;
    this.worldStatus = {
      ready: {
        item: document.getElementById('status-ready-flowers'),
        count: document.getElementById('status-ready-count'),
        label: document.getElementById('status-ready-label'),
        icon: 'flower'
      },
      waiting: {
        item: document.getElementById('status-waiting-customers'),
        count: document.getElementById('status-waiting-count'),
        label: document.getElementById('status-waiting-label'),
        icon: 'cashier'
      },
      stock: {
        item: document.getElementById('status-missing-stock'),
        count: document.getElementById('status-stock-count'),
        label: document.getElementById('status-stock-label'),
        icon: 'basket'
      }
    };
    this.lastWorldStatus = '';
    for (const status of Object.values(this.worldStatus)) {
      const icon = status.item?.querySelector('.world-status-icon');
      if (icon) icon.innerHTML = getIcon(status.icon);
    }

    this.bindEvents();
    this.update();
  }

  bindEvents() {
    this.state.subscribe((event, data) => {
      this.update();

      if (event === 'level_up') {
        this.showToast(`Nível de reputação aumentado para ${data.newLevel}`, 'sprout');
        this.sound.playUpgrade();
      } else if (event === 'plot_unlocked') {
        this.showToast('Novo canteiro disponível no jardim', 'flower');
      } else if (event === 'employee_payroll_paid') {
        this.showToast(`Salários pagos: ${data.amount} moedas`, 'coin');
      } else if (event === 'employee_contract_renewed') {
        this.showToast('Contrato reativado; salário do primeiro dia pago', 'check');
      } else if (event === 'employee_contract_ended') {
        this.showToast('Contrato suspenso; podes retomar a automação na loja', 'lock');
      } else if (event === 'employee_contracts_suspended') {
        this.showToast('Saldo insuficiente: contratos suspensos. Retoma-os na loja quando puderes pagar.', 'coin');
      } else if (event === 'special_visitor_met') {
        const visitor = CUSTOMER_CONFIG.specialVisitors.find((entry) => entry.id === data.visitorId);
        if (visitor) this.showToast(`Conheceste ${visitor.name}! ${visitor.thanks}`, 'book');
      } else if (event === 'special_visitor_arrived') {
        const visitor = CUSTOMER_CONFIG.specialVisitors.find((entry) => entry.id === data.visitorId);
        if (visitor && !this.state.specialVisitors.includes(visitor.id)) {
          this.showToast(`${visitor.name} chegou. ${visitor.introduction}`, 'book');
        }
      }
    });
    this.favoriteObjectiveOpenBtn?.addEventListener('click', () => {
      const objective = this.state.getTrackedObjective();
      if (objective && typeof this.onOpenFavoriteObjective === 'function') {
        this.onOpenFavoriteObjective(objective);
      }
    });
    this.favoriteObjectiveClearBtn?.addEventListener('click', () => {
      this.state.setFavoriteObjective(null, null);
    });
  }

  update() {
    // Moedas
    if (this.coinEl) {
      this.coinEl.textContent = formatNumber(this.state.coins);
    }

    // Reputação e Nível
    if (this.levelBadgeEl) {
      this.levelBadgeEl.textContent = `Nív. ${this.state.level}`;
    }
    const needed = this.state.getReputationForNextLevel();
    const pct = Math.min(100, Math.round((this.state.reputation / needed) * 100));
    if (this.repFillEl) {
      this.repFillEl.style.width = `${pct}%`;
    }
    if (this.repTextEl) {
      this.repTextEl.textContent = `${this.state.reputation} / ${needed} XP`;
    }

    // Cesto
    const count = this.state.basket.length;
    const cap = this.state.getBasketCapacity();
    if (this.basketCountEl) {
      this.basketCountEl.textContent = `${count} / ${cap}`;
    }
    if (this.basketPillEl) {
      if (count >= cap) {
        this.basketPillEl.classList.add('basket-full');
      } else {
        this.basketPillEl.classList.remove('basket-full');
      }
    }

    // Desbloqueio da Bancada de Ramos no Nível 5
    if (this.bouquetBtn) {
      const isUnlocked = this.state.level >= 5;
      if (isUnlocked) {
        this.bouquetBtn.classList.remove('locked-feature');
        if (this.bouquetLockBadge) this.bouquetLockBadge.style.display = 'none';
      } else {
        this.bouquetBtn.classList.add('locked-feature');
        if (this.bouquetLockBadge) this.bouquetLockBadge.style.display = 'inline-flex';
      }
    }

    this.updateFavoriteObjective();
  }

  updateFavoriteObjective() {
    if (!this.favoriteObjectiveEl) return;
    const objective = this.state.getTrackedObjective();
    this.favoriteObjectiveEl.classList.toggle('hidden', !objective);
    if (!objective) return;
    if (this.favoriteObjectiveTitleEl) {
      this.favoriteObjectiveTitleEl.textContent = objective.title;
    }
    if (this.favoriteObjectiveNextEl) {
      this.favoriteObjectiveNextEl.textContent = objective.target > 0
        ? `${objective.nextStep} (${objective.progress}/${objective.target})`
        : objective.nextStep;
    }
    if (this.favoriteObjectiveOpenBtn) {
      this.favoriteObjectiveOpenBtn.setAttribute(
        'aria-label',
        `${objective.title}. ${objective.nextStep} Abrir objetivo.`
      );
    }
  }

  createFavoriteButton(type, id) {
    const button = document.createElement('button');
    const isFavorite = this.state.favoriteObjective?.type === type
      && this.state.favoriteObjective.id === id;
    button.type = 'button';
    button.className = `objective-favorite-toggle${isFavorite ? ' is-favorite' : ''}`;
    button.setAttribute('aria-pressed', String(isFavorite));
    button.setAttribute(
      'aria-label',
      isFavorite ? 'Remover dos objetivos favoritos' : 'Marcar como objetivo favorito'
    );
    button.title = isFavorite ? 'Remover dos objetivos favoritos' : 'Seguir este objetivo';
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>';
    button.addEventListener('click', () => {
      this.state.setFavoriteObjective(type, id);
      this.sound.playClick();
    });
    return button;
  }

  updateWorldIndicators(readyFlowers, waitingCustomers, missingStockOrders) {
    const counts = [readyFlowers, waitingCustomers, missingStockOrders];
    const signature = counts.join(':');
    if (signature === this.lastWorldStatus) return;
    this.lastWorldStatus = signature;

    Object.values(this.worldStatus).forEach((status, index) => {
      const count = counts[index];
      const labels = [
        `${count} ${count === 1 ? 'flor pronta para colher' : 'flores prontas para colher'}`,
        `${count} ${count === 1 ? 'cliente à espera' : 'clientes à espera'}`,
        `${count} ${count === 1 ? 'pedido sem stock suficiente' : 'pedidos sem stock suficiente'}`
      ];
      if (status.count) status.count.textContent = String(count);
      if (status.label) {
        status.label.textContent = index === 0
          ? (count === 1 ? 'flor pronta' : 'flores prontas')
          : index === 1
            ? (count === 1 ? 'cliente à espera' : 'clientes à espera')
            : (count === 1 ? 'pedido' : 'pedidos');
      }
      if (status.item) {
        status.item.classList.toggle('hidden', count === 0);
        status.item.setAttribute('aria-label', labels[index]);
      }
    });
  }

  showToast(message, iconKey = 'flower') {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    const iconSvg = getIcon(iconKey, getIcon('flower'));
    toast.innerHTML = `<span class="toast-icon">${iconSvg}</span><span>${message}</span>`;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      setTimeout(() => toast.remove(), 350);
    }, 3200);
  }

  setInteractionPrompt(visible, text = 'Atender Cliente') {
    if (!this.interactionPrompt) return;
    if (visible) {
      if (this.interactionLabel) this.interactionLabel.textContent = text;
      this.interactionPrompt.classList.remove('hidden');
    } else {
      this.interactionPrompt.classList.add('hidden');
    }
  }
}
