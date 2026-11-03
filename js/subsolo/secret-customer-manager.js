// ========================================================
// FloristEver v2.0.0 — Gestão de Clientes Secretos (secret-customer-manager.js)
// Vendas em código na floricultura, atendimento estritamente manual
// ========================================================

import {
  GARDEN_CODE_DICTIONARY,
  COUNTERSIGNS,
  PACKAGING_OPTIONS,
  SUBSOLO_PRODUCTS
} from './subsolo-config.js';
import { distance, PALETTE } from '../utils.js';
import { ICONS } from '../icons.js';

export class SecretCustomerManager {
  constructor(game, subsoloManager) {
    this.game = game;
    this.subsolo = subsoloManager;
    this.activeCustomer = null;
    this.pendingQueue = [];
    this.spawnTimer = 0;
    this.nextSpawnInterval = 60; // segundos
  }

  update(dt, isSurfaceActive) {
    if (!this.subsolo.isUnlocked()) return;

    // Se o jogador estiver na superfície e não houver cliente secreto ativo
    if (isSurfaceActive) {
      this.spawnTimer += dt;
      if (!this.activeCustomer && this.spawnTimer >= this.nextSpawnInterval) {
        this.spawnTimer = 0;
        this.nextSpawnInterval = 90 + Math.random() * 90; // Cada 1.5 a 3 minutos
        this.spawnSecretCustomer();
      }
    }

    if (this.activeCustomer) {
      this.updateActiveCustomer(dt, isSurfaceActive);
    }
  }

  spawnSecretCustomer() {
    // Escolhe um pedido com base no nível de respeito
    const sLvl = this.subsolo.data.respeito.nivel;
    const availableCodes = GARDEN_CODE_DICTIONARY.filter((c) => {
      if (c.productId === 'maco' && sLvl < 6) return false;
      if (c.productId === 'reserva' && sLvl < 10) return false;
      return true;
    });

    const chosenCode = availableCodes[Math.floor(Math.random() * availableCodes.length)] || availableCodes[0];
    const countersign = sLvl >= 5 ? COUNTERSIGNS[Math.floor(Math.random() * COUNTERSIGNS.length)] : null;

    this.activeCustomer = {
      x: 50,
      y: 380,
      targetX: this.game.counter.x + 30,
      targetY: this.game.counter.y + 40,
      exitX: -60,
      exitY: 390,
      speed: 95,
      state: 'walking_to_counter', // 'walking_to_counter' | 'waiting' | 'leaving'
      order: {
        codeId: chosenCode.id,
        phrase: chosenCode.phrase,
        productId: chosenCode.productId || 'ramo',
        quantity: chosenCode.quantity || 1,
        minQuality: chosenCode.minQuality || 1,
        urgent: chosenCode.urgent === true
      },
      countersign,
      isSatisfied: false
    };
  }

  updateActiveCustomer(dt, isSurfaceActive) {
    const c = this.activeCustomer;

    if (c.state === 'walking_to_counter') {
      const dist = distance(c.x, c.y, c.targetX, c.targetY);
      if (dist < 8) {
        c.state = 'waiting';
      } else {
        const dx = (c.targetX - c.x) / dist;
        const dy = (c.targetY - c.y) / dist;
        c.x += dx * c.speed * dt;
        c.y += dy * c.speed * dt;
      }
    } else if (c.state === 'waiting') {
      // Regra Inegociável: clientes secretos NUNCA expiram enquanto o jogador está no subsolo
      // E ajudantes / caixa automático NUNCA os atendem!
    } else if (c.state === 'leaving') {
      const dist = distance(c.x, c.y, c.exitX, c.exitY);
      if (dist < 10) {
        this.activeCustomer = null;
      } else {
        const dx = (c.exitX - c.x) / dist;
        const dy = (c.exitY - c.y) / dist;
        c.x += dx * c.speed * dt;
        c.y += dy * c.speed * dt;
      }
    }
  }

  /**
   * Verifica se o jogador clicou no cliente secreto para atendimento manual.
   */
  checkPlayerInteraction(worldX, worldY) {
    if (!this.activeCustomer || this.activeCustomer.state !== 'waiting') return false;
    const dist = distance(worldX, worldY, this.activeCustomer.x, this.activeCustomer.y);
    if (dist <= 35) {
      this.openSecretTradeModal();
      return true;
    }
    return false;
  }

  openSecretTradeModal() {
    if (!this.activeCustomer) return;
    const order = this.activeCustomer.order;
    const prodConfig = SUBSOLO_PRODUCTS[order.productId] || SUBSOLO_PRODUCTS.ramo;
    const inCofre = this.subsolo.data.cofre[order.productId] || 0;
    const canAffordStock = inCofre >= order.quantity;
    const countersign = this.activeCustomer.countersign;
    const assist = this.subsolo.data.conteudoSecreto.ajudaCodigo;

    // Regista código descoberto no Caderno do Livro
    if (!this.subsolo.data.caderno.paginasDescobertas.includes(order.codeId)) {
      this.subsolo.data.caderno.paginasDescobertas.push(order.codeId);
    }

    let modal = document.getElementById('modal-secret-trade');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-secret-trade';
      modal.className = 'modal-overlay hidden';
      document.body.appendChild(modal);
    }

    const estRevenue = Math.round(prodConfig.baseValue * order.quantity * Math.min(1.4, 1 + 0.02 * (this.subsolo.data.respeito.nivel - 1)));

    modal.innerHTML = `
      <div class="modal-card secret-trade-card">
        <div class="secret-trade-header">
          <div class="secret-header-title">
            <span class="trenchcoat-icon">${ICONS.subsoloTrenchcoat}</span>
            <div>
              <h3>Cliente em Código</h3>
              <span class="clandestine-badge">Transação Secreta</span>
            </div>
          </div>
          <button type="button" id="btn-close-secret-trade" class="btn-close-modal" aria-label="Fechar">✕</button>
        </div>

        <div class="secret-trade-quote-box">
          <span class="transmission-label">TRANSMISSÃO INTERCETADA:</span>
          <div class="quote-text">"${order.phrase}"</div>
          ${assist ? `<div class="quote-assist-pill">${ICONS.subsoloDev} <span>Pedido decifrado: <strong>${order.quantity}x ${prodConfig.name}</strong></span></div>` : ''}
        </div>

        ${countersign ? `
          <div class="secret-trade-field">
            <label for="secret-trade-countersign" class="field-label">Contra-senha de resposta segura:</label>
            <select id="secret-trade-countersign" class="subsolo-select">
              <option value="correct">${countersign.correct}</option>
              <option value="wrong1">${countersign.distractors[0]}</option>
              <option value="wrong2">${countersign.distractors[1]}</option>
            </select>
          </div>
        ` : ''}

        <div class="secret-trade-field">
          <label for="secret-trade-packaging" class="field-label">Método de camuflagem / embalagem:</label>
          <select id="secret-trade-packaging" class="subsolo-select">
            ${PACKAGING_OPTIONS.map((p) => `<option value="${p.id}">${p.label} — ${p.desc}</option>`).join('')}
          </select>
        </div>

        <div class="secret-trade-stock-bar ${canAffordStock ? 'stock-ok' : 'stock-empty'}">
          <div class="stock-info">
            <span class="stock-title">${ICONS.subsoloLogistica} Stock no Cofre da Loja:</span>
            <strong class="stock-count">${inCofre} / ${order.quantity} un.</strong>
          </div>
          <span class="stock-status-pill">${canAffordStock ? `${ICONS.check} Pronto p/ Venda` : `${ICONS.close} Esgotado no Cofre`}</span>
        </div>

        <div class="secret-trade-reward-banner">
          <span>Recompensa Estimada:</span>
          <strong class="reward-val">~${estRevenue}🪙 +15 XP Respeito</strong>
        </div>

        <div class="secret-trade-actions">
          <button type="button" id="btn-submit-secret-trade" class="btn-primary btn-secret-submit btn-bounce" ${!canAffordStock ? 'disabled' : ''}>
            ${ICONS.check} Concluir Transação
          </button>
          <button type="button" id="btn-dismiss-secret-trade" class="btn-secondary btn-secret-dismiss">
            ${ICONS.close} Despachar Cliente
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');

    document.getElementById('btn-close-secret-trade').onclick = () => modal.classList.add('hidden');
    document.getElementById('btn-dismiss-secret-trade').onclick = () => {
      modal.classList.add('hidden');
      if (this.activeCustomer) this.activeCustomer.state = 'leaving';
    };

    document.getElementById('btn-submit-secret-trade').onclick = () => {
      const packagingId = document.getElementById('secret-trade-packaging').value;
      const res = this.subsolo.completeSale(order, packagingId);
      if (res.success) {
        if (this.game.soundManager) this.game.soundManager.playCoin?.();
        this.game.hud.showToast(`Venda concluída! +🪙${res.revenue} (+${res.xp} Respeito)`, 'coin');
        modal.classList.add('hidden');
        if (this.activeCustomer) {
          this.activeCustomer.isSatisfied = true;
          this.activeCustomer.state = 'leaving';
        }
      } else {
        this.game.hud.showToast(`Não foi possível vender: ${res.reason}`, 'error');
      }
    };
  }

  draw(ctx, visibleBounds) {
    if (!this.activeCustomer) return;
    const c = this.activeCustomer;

    if (visibleBounds && (
      c.x + 30 < visibleBounds.left ||
      c.x - 30 > visibleBounds.right ||
      c.y + 30 < visibleBounds.top ||
      c.y - 30 > visibleBounds.bottom
    )) {
      return;
    }

    ctx.save();
    // Capuz e roupa escura gasta
    ctx.fillStyle = '#32373B';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y - 12, 11, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rosto oculto na penumbra
    ctx.fillStyle = '#C89D7C';
    ctx.beginPath();
    ctx.arc(c.x + 3, c.y - 14, 4, 0, Math.PI * 2);
    ctx.fill();

    // Capuz sobreposto
    ctx.fillStyle = '#262A2D';
    ctx.beginPath();
    ctx.arc(c.x, c.y - 16, 10, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();

    // Corpo e casaco com remendos
    ctx.fillStyle = '#3A4247';
    ctx.fillRect(c.x - 9, c.y - 2, 18, 22);

    // Remendo no casaco
    ctx.fillStyle = '#735A4A';
    ctx.fillRect(c.x - 5, c.y + 4, 5, 5);

    // Balão de fala quando está à espera
    if (c.state === 'waiting') {
      ctx.fillStyle = '#222629';
      ctx.strokeStyle = '#5E8C8A';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(c.x - 16, c.y - 48, 32, 22, 6);
      ctx.fill();
      ctx.stroke();

      // Símbolo discreto (folha estilizada, não flores normais)
      ctx.fillStyle = '#B56BFF';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌿', c.x, c.y - 33);
    }

    ctx.restore();
  }
}
