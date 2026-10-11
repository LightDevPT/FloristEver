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

    modal.innerHTML = `
      <div class="modal-card secret-trade-card" style="max-width: 440px; background: #23272B; color: #E5E8EB; border: 2px solid #5A6670; border-radius: 12px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; color: #FFC857; display: flex; align-items: center; gap: 8px;">
            <span>🧥</span> Cliente em Código
          </h3>
          <button type="button" id="btn-close-secret-trade" class="btn-close-modal" style="background: none; border: none; color: #99A8B2; font-size: 20px; cursor: pointer;">✕</button>
        </div>

        <div style="background: #191C1E; border-left: 4px solid #B56BFF; padding: 10px 14px; border-radius: 4px; margin-bottom: 14px;">
          <p style="margin: 0; font-style: italic; font-size: 14px; color: #F0F4F8;">"${order.phrase}"</p>
          ${assist ? `<p style="margin: 6px 0 0; font-size: 11px; color: #68D67F; font-weight: bold;">(Ajuda: pede ${order.quantity}x ${prodConfig.name})</p>` : ''}
        </div>

        ${countersign ? `
          <div style="margin-bottom: 12px;">
            <label style="font-size: 12px; color: #A0B0BC; display: block; margin-bottom: 4px;">Contra-senha de resposta:</label>
            <select id="secret-trade-countersign" style="width: 100%; padding: 8px; background: #2E343A; color: #FFF; border: 1px solid #4A5660; border-radius: 6px;">
              <option value="correct">${countersign.correct}</option>
              <option value="wrong1">${countersign.distractors[0]}</option>
              <option value="wrong2">${countersign.distractors[1]}</option>
            </select>
          </div>
        ` : ''}

        <div style="margin-bottom: 14px;">
          <label style="font-size: 12px; color: #A0B0BC; display: block; margin-bottom: 4px;">Tipo de embalagem discreta:</label>
          <select id="secret-trade-packaging" style="width: 100%; padding: 8px; background: #2E343A; color: #FFF; border: 1px solid #4A5660; border-radius: 6px;">
            ${PACKAGING_OPTIONS.map((p) => `<option value="${p.id}">${p.label} (${p.desc})</option>`).join('')}
          </select>
        </div>

        <div style="background: #1E2225; padding: 10px; border-radius: 6px; margin-bottom: 14px; font-size: 12px; display: flex; justify-content: space-between;">
          <span>Stock no Cofre: <strong>${inCofre}</strong> / ${order.quantity} necessários</span>
          <span style="color: ${canAffordStock ? '#5DE27F' : '#E85D5D'}; font-weight: bold;">${canAffordStock ? 'Disponível' : 'Cofre Vazio'}</span>
        </div>

        <div style="display: flex; gap: 10px;">
          <button type="button" id="btn-submit-secret-trade" class="btn-primary" style="flex: 1; padding: 10px; font-weight: bold;" ${!canAffordStock ? 'disabled' : ''}>
            Entregar e Cobrar
          </button>
          <button type="button" id="btn-dismiss-secret-trade" class="btn-secondary" style="padding: 10px;">
            Pedir p/ Voltar Mais Tarde
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
