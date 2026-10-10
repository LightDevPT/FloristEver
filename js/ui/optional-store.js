// ========================================================
// FloristEver - Loja de compras opcionais
// ========================================================
import { FLOWER_ORDER, FLOWERS_CONFIG } from '../config/flowers.js';
import { formatNumber } from '../utils.js';
import { getIcon } from '../icons.js';

export class OptionalStoreUi {
  constructor(state, sound, hud) {
    this.state = state;
    this.sound = sound;
    this.hud = hud;
    this.modalEl = document.getElementById('modal-optional-store');
    this.productsEl = document.getElementById('optional-store-products');
    this.balanceEl = document.getElementById('optional-store-balance');
    this.openBtn = document.getElementById('btn-open-optional-store');

    this.openBtn?.addEventListener('click', () => this.open());
    this.modalEl?.addEventListener('click', (event) => {
      if (event.target.closest('[data-close]') || event.target === this.modalEl) {
        this.close();
      }
    });
    this.state.subscribe(() => {
      if (this.isOpen()) this.render();
    });
  }

  isOpen() {
    return Boolean(this.modalEl && !this.modalEl.classList.contains('hidden'));
  }

  open() {
    if (!this.modalEl) return;
    this.sound.playClick();
    this.modalEl.classList.remove('hidden');
    this.render();
  }

  close() {
    if (!this.modalEl) return;
    this.sound.playClick();
    this.modalEl.classList.add('hidden');
  }

  render() {
    if (!this.productsEl || !this.balanceEl) return;
    this.balanceEl.textContent = `${formatNumber(this.state.coins)} moedas disponíveis`;
    this.productsEl.replaceChildren();

    const products = FLOWER_ORDER
      .filter((flowerId) => this.state.getOwnedPlotCount(flowerId) >= 2)
      .map((flowerId) => ({
        flowerId,
        flower: FLOWERS_CONFIG[flowerId],
        cost: this.state.getPlotCostForNext(flowerId),
        owned: this.state.getOwnedPlotCount(flowerId)
      }));

    if (products.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'optional-store-empty';
      empty.textContent = 'As opções de terrenos extra aparecem quando tiveres dois terrenos da mesma flor.';
      this.productsEl.appendChild(empty);
      return;
    }

    for (const product of products) {
      const card = document.createElement('article');
      card.className = 'upgrade-card optional-store-product';
      const canAfford = this.state.coins >= product.cost;
      const levelRequired = product.flower.requiredLevel || 1;
      const levelAvailable = this.state.level >= levelRequired;
      const icon = getIcon('flower');

      card.innerHTML = `
        <div>
          <div class="upgrade-head">
            <div class="upgrade-icon optional-flower-icon">${icon}</div>
            <div class="upgrade-title-area">
              <h3>Terreno extra de ${product.flower.name}</h3>
              <div class="upgrade-level-tag">${product.owned} terrenos já comprados</div>
            </div>
          </div>
          <p class="upgrade-desc" style="margin-top: 8px;">Mais espaço de cultivo para ${product.flower.name}. Compra opcional.</p>
        </div>
        <div class="upgrade-footer">
          <div class="upgrade-cost">
            <span class="icon-inline">${getIcon('coin')}</span>
            <span>${formatNumber(product.cost)}</span>
            ${!canAfford ? `<span class="upgrade-shortfall">Faltam ${formatNumber(product.cost - this.state.coins)} moedas</span>` : ''}
          </div>
          <button type="button" class="btn-primary btn-buy-upgrade" data-buy-optional-plot="${product.flowerId}" ${!canAfford || !levelAvailable ? 'disabled' : ''}>Comprar terreno</button>
        </div>
      `;

      card.querySelector('[data-buy-optional-plot]')?.addEventListener('click', () => {
        if (!this.state.buyOptionalPlot(product.flowerId)) return;
        this.sound.playUpgrade();
        this.hud.showToast(`Terreno extra de ${product.flower.name} comprado`, 'check');
        this.render();
      });
      this.productsEl.appendChild(card);
    }
  }
}
