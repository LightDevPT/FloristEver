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
    this.tradeRequested = false;
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
    this.tradeRequested = false;
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
    console.log('[VENDA-DEBUG] comprador gerado', {
      order: { ...this.activeCustomer.order },
      cofre: { ...this.subsolo.data.cofre }
    });
  }

  updateActiveCustomer(dt, isSurfaceActive) {
    const c = this.activeCustomer;

    if (c.state === 'walking_to_counter') {
      const dist = distance(c.x, c.y, c.targetX, c.targetY);
      if (dist < 8) {
        c.state = 'waiting';
        if (this.tradeRequested) {
          this.tradeRequested = false;
          this.openSecretTradeModal();
        }
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
        this.tradeRequested = false;
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
    if (!this.activeCustomer || this.activeCustomer.state === 'leaving') {
      console.log('[VENDA-DEBUG] clique ignorado: comprador inexistente ou a sair', {
        activeCustomer: Boolean(this.activeCustomer),
        state: this.activeCustomer?.state
      });
      return false;
    }
    const dist = distance(worldX, worldY, this.activeCustomer.x, this.activeCustomer.y);
    console.log('[VENDA-DEBUG] teste do hitbox', {
      click: { x: worldX, y: worldY },
      customer: { x: this.activeCustomer.x, y: this.activeCustomer.y },
      distance: dist
    });
    if (dist <= 35) {
      return this.requestTrade();
    }
    console.log('[VENDA-DEBUG] clique fora do hitbox; venda não iniciada');
    return false;
  }

  interactAtCounter() {
    const customer = this.activeCustomer;
    console.log('[VENDA-DEBUG] ação no balcão', {
      activeCustomer: Boolean(customer),
      state: customer?.state,
      order: customer?.order
    });
    if (!customer || customer.state === 'leaving') {
      console.log('[VENDA-DEBUG] ação no balcão ignorada: sem comprador disponível');
      return false;
    }
    return this.requestTrade();
  }

  requestTrade() {
    if (this.activeCustomer.state === 'waiting') {
      console.log('[VENDA-DEBUG] pedido de venda aberto', {
        order: { ...this.activeCustomer.order },
        cofre: { ...this.subsolo.data.cofre }
      });
      this.openSecretTradeModal();
    } else {
      this.tradeRequested = true;
      console.log('[VENDA-DEBUG] venda marcada; comprador ainda a caminho', {
        state: this.activeCustomer.state
      });
      this.game.hud?.showToast('O cliente está a caminho do balcão. A transação abrirá quando chegar.', 'check');
    }
    return true;
  }

  openSecretTradeModal() {
    if (!this.activeCustomer) return;
    const order = this.activeCustomer.order;
    const prodConfig = SUBSOLO_PRODUCTS[order.productId] || SUBSOLO_PRODUCTS.ramo;
    const inCofre = this.subsolo.data.cofre[order.productId] || 0;
    const canAffordStock = inCofre >= order.quantity;
    console.log('[VENDA-DEBUG] modal de venda', {
      productId: order.productId,
      quantity: order.quantity,
      quantityType: typeof order.quantity,
      inCofre,
      inCofreType: typeof this.subsolo.data.cofre[order.productId],
      stockAvailable: canAffordStock,
      order: { ...order },
      cofre: { ...this.subsolo.data.cofre }
    });
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
      modal.className = 'modal-backdrop hidden';
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
          <strong class="reward-val">~${estRevenue} ${ICONS.coin} +15 XP Respeito</strong>
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
      console.log('[VENDA-DEBUG] submissão da venda', { order, packagingId });
      const res = this.subsolo.completeSale(order, packagingId);
      console.log('[VENDA-DEBUG] resultado da venda', res);
      if (res.success) {
        if (this.game.soundManager) this.game.soundManager.playCoin?.();
        this.game.hud.showToast(`Venda concluída! +${res.revenue} moedas (+${res.xp} Respeito)`, 'coin');
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

    this.drawSecretCustomer(ctx, c);
  }

/*
  Cliente secreto (redesenhado)

  Uso:
    this.drawSecretCustomer(ctx, { x: c.x, y: c.y, dir: 1, t: tempoEmSegundos });

  c.x, c.y  = mesma âncora da versão antiga
  c.dir     = 1 (a olhar para a direita) ou -1 (esquerda). Opcional, por omissão 1.
  c.t       = tempo em segundos, anima a respiração, os pés e o bloco de notas. Opcional.
*/
  drawSecretCustomer(ctx, c) {
  const dir = c.dir || 1;
  const t = c.t || 0;
  const bob = Math.sin(t * 2.4) * 0.7;           // respiração
  const step = Math.sin(t * 2.4);                // balanço dos pés
  const note = Math.sin(t * 1.2) > 0.6 ? -1 : 0; // levanta o bloco de vez em quando

  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(dir, 1);

  // Sombra no chão
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(0, 22, 11, 3, 0, 0, Math.PI * 2); ctx.fill();

  // Pernas e sapatos
  ctx.fillStyle = '#2A2E32';
  ctx.fillRect(-6, 15, 5, 6 - step * 0.5);
  ctx.fillRect(1, 15, 5, 6 + step * 0.5);
  ctx.fillStyle = '#16181A';
  ctx.fillRect(-7, 20.5 - step * 0.5, 7, 2.5);
  ctx.fillRect(1, 20.5 + step * 0.5, 7, 2.5);

  ctx.save();
  ctx.translate(0, bob * 0.5);

  // Casaco (trench): ombros estreitos, bainha larga
  ctx.fillStyle = '#3A4247';
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.lineTo(8, -4);
  ctx.lineTo(11, 18);
  ctx.lineTo(-11, 18);
  ctx.closePath();
  ctx.fill();

  // Lado de sombra do casaco
  ctx.fillStyle = '#313840';
  ctx.beginPath();
  ctx.moveTo(-8, -4); ctx.lineTo(-2, -4); ctx.lineTo(-3, 18); ctx.lineTo(-11, 18);
  ctx.closePath(); ctx.fill();

  // Abertura central e botões
  ctx.fillStyle = '#242A2E';
  ctx.fillRect(-0.5, -3, 1, 21);
  ctx.fillStyle = '#8A9298';
  ctx.fillRect(1.5, 0, 1.4, 1.4);
  ctx.fillRect(1.5, 5, 1.4, 1.4);

  // Cinto com fivela
  ctx.fillStyle = '#735A4A';
  ctx.fillRect(-10, 8, 20, 2.5);
  ctx.fillStyle = '#C9A24D';
  ctx.fillRect(-1.5, 7.8, 3, 3);

  // Remendo no casaco
  ctx.fillStyle = '#735A4A';
  ctx.fillRect(-7, 12, 4, 4);
  ctx.strokeStyle = '#A88A74';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([1, 1]);
  ctx.strokeRect(-7, 12, 4, 4);
  ctx.setLineDash([]);

  // Braço de trás
  ctx.fillStyle = '#2F363B';
  ctx.fillRect(-12, -2, 4, 13);
  ctx.fillStyle = '#C89D7C';
  ctx.fillRect(-12, 10.5, 4, 3);

  // Braço da frente a segurar o bloco de notas
  ctx.fillStyle = '#434C52';
  ctx.beginPath();
  ctx.moveTo(8, -3); ctx.lineTo(12, -1); ctx.lineTo(13, 6); ctx.lineTo(8, 6);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#C89D7C';
  ctx.fillRect(9, 5.5, 4, 2.5);

  // Bloco de notas
  ctx.save();
  ctx.translate(0, note);
  ctx.fillStyle = '#DCCFB0';
  ctx.fillRect(11, 1, 6, 8);
  ctx.fillStyle = '#9C8E70';
  ctx.fillRect(11, 1, 6, 1.5);
  ctx.fillRect(12, 4, 4, 0.7);
  ctx.fillRect(12, 6, 3, 0.7);
  ctx.restore();

  // Gola levantada
  ctx.fillStyle = '#2B3236';
  ctx.beginPath();
  ctx.moveTo(-8, -4); ctx.lineTo(-4, -9); ctx.lineTo(-1, -4);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, -4); ctx.lineTo(4, -9); ctx.lineTo(1, -4);
  ctx.closePath(); ctx.fill();

  // Pescoço
  ctx.fillStyle = '#B88C6E';
  ctx.fillRect(-2, -8, 4, 4);

  // Capuz (parte de trás, volume)
  ctx.fillStyle = '#262A2D';
  ctx.beginPath(); ctx.ellipse(-1, -17, 11, 12, 0, 0, Math.PI * 2); ctx.fill();

  // Frente do capuz
  ctx.fillStyle = '#32373B';
  ctx.beginPath(); ctx.ellipse(1, -16, 9.5, 11, 0, 0, Math.PI * 2); ctx.fill();

  // Abertura do capuz com sombra
  ctx.fillStyle = '#1B1E20';
  ctx.beginPath(); ctx.ellipse(3.5, -15, 6.5, 7.5, 0, 0, Math.PI * 2); ctx.fill();

  // Rosto
  ctx.fillStyle = '#C89D7C';
  ctx.beginPath(); ctx.ellipse(4, -14.5, 5, 6, 0, 0, Math.PI * 2); ctx.fill();

  // Sombra da testa (capuz sobre o rosto)
  ctx.fillStyle = 'rgba(30,24,20,0.45)';
  ctx.beginPath(); ctx.ellipse(4, -18.5, 5.2, 2.6, 0, 0, Math.PI * 2); ctx.fill();

  // Óculos escuros
  ctx.fillStyle = '#0F1112';
  ctx.fillRect(1, -16, 4, 2.6);
  ctx.fillRect(6, -16, 3.5, 2.6);
  ctx.fillRect(4.5, -15.4, 1.8, 0.7);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(1.6, -15.7, 1, 0.8);
  ctx.fillRect(6.6, -15.7, 1, 0.8);

  // Nariz e boca
  ctx.fillStyle = '#A8795C';
  ctx.fillRect(8.4, -14, 1.4, 1.8);
  ctx.fillStyle = '#7D4F3A';
  ctx.fillRect(5, -10.8, 3.5, 0.8);

  // Rebordo do capuz
  ctx.strokeStyle = '#4A5258';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(3.5, -15, 7, 8, 0, Math.PI * 0.55, Math.PI * 1.9);
  ctx.stroke();

  ctx.restore();
  ctx.restore();
  }
}
