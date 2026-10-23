// ========================================================
// FloristEver v2.0.0 — Interface Temática do Subsolo (subsolo-ui.js)
// HUD dedicado, modais de produção/secagem/bancada/logística e troca fluida
// ========================================================

import { SUBSOLO_VARIETIES, SUBSOLO_PRODUCTS, SUBSOLO_RESPECT_CONFIG, PACKAGING_OPTIONS } from './subsolo-config.js';
import { formatNumber } from '../utils.js';

export class SubsoloUI {
  constructor(game, subsoloManager) {
    this.game = game;
    this.manager = subsoloManager;
    this.isSubsoloActive = false;

    // Elementos da HUD
    this.surfaceHudActions = document.getElementById('hud-menu-items')?.parentElement;
    this.surfaceWorldStatus = document.getElementById('hud-world-status');
    this.surfaceObjective = document.getElementById('hud-favorite-objective');
    this.subsoloHudContainer = document.getElementById('subsolo-hud');

    // Pills temáticas
    this.pillRespect = document.getElementById('subsolo-hud-respect');
    this.pillEnergy = document.getElementById('subsolo-hud-energy');
    this.pillEnergyText = document.getElementById('subsolo-energy-text');
    this.pillWater = document.getElementById('subsolo-hud-water');
    this.pillWaterText = document.getElementById('subsolo-water-text');
    this.pillHeat = document.getElementById('subsolo-hud-heat');
    this.pillHeatText = document.getElementById('subsolo-heat-text');
    this.pillMala = document.getElementById('subsolo-hud-mala');
    this.pillMalaText = document.getElementById('subsolo-mala-text');

    // Modais do Subsolo
    this.modalCultivo = document.getElementById('modal-subsolo-cultivo');
    this.modalSecagem = document.getElementById('modal-subsolo-secagem');
    this.modalPrep = document.getElementById('modal-subsolo-prep');
    this.modalLogistica = document.getElementById('modal-subsolo-logistica');

    this.bindEvents();
  }

  bindEvents() {
    // Botões de Ação da HUD do Subsolo
    document.getElementById('btn-subsolo-cultivo')?.addEventListener('click', () => this.openCultivoModal());
    document.getElementById('btn-subsolo-secagem')?.addEventListener('click', () => this.openSecagemModal());
    document.getElementById('btn-subsolo-prep')?.addEventListener('click', () => this.openPrepModal());
    document.getElementById('btn-subsolo-logistica')?.addEventListener('click', () => this.openLogisticaModal());
    document.getElementById('btn-subsolo-dynamo')?.addEventListener('click', () => this.handleDynamoCrank());
    document.getElementById('btn-subsolo-subir')?.addEventListener('click', () => this.handleSubir());

    // Cliques nas pills para atalhos
    this.pillEnergy?.addEventListener('click', () => this.handleDynamoCrank());
    this.pillWater?.addEventListener('click', () => this.openCultivoModal());
    this.pillMala?.addEventListener('click', () => this.openLogisticaModal());
    this.pillHeat?.addEventListener('click', () => this.openLogisticaModal());

    // Fechar modais ao clicar em botões [data-close]
    document.querySelectorAll('.btn-close-subsolo, [data-close-subsolo]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const modalId = btn.getAttribute('data-close-subsolo') || btn.closest('.modal-backdrop')?.id;
        if (modalId) {
          const m = document.getElementById(modalId);
          if (m) m.classList.add('hidden');
        }
      });
    });

    // Fechar ao clicar no backdrop
    [this.modalCultivo, this.modalSecagem, this.modalPrep, this.modalLogistica].forEach((modal) => {
      if (!modal) return;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    });
  }

  setSubsoloActive(active) {
    this.isSubsoloActive = active;

    if (active) {
      // Oculta sistemas da superfície
      if (this.surfaceHudActions) this.surfaceHudActions.classList.add('subsolo-hidden');
      if (this.surfaceWorldStatus) this.surfaceWorldStatus.classList.add('subsolo-hidden');
      if (this.surfaceObjective) this.surfaceObjective.classList.add('subsolo-hidden');
      const mapPanel = document.getElementById('map-panel');
      if (mapPanel) mapPanel.classList.add('hidden');

      // Mostra a HUD temática do Subsolo
      if (this.subsoloHudContainer) {
        this.subsoloHudContainer.classList.remove('hidden');
      }

      this.updateHud();
    } else {
      // Restaura sistemas da superfície
      if (this.surfaceHudActions) this.surfaceHudActions.classList.remove('subsolo-hidden');
      if (this.surfaceWorldStatus) this.surfaceWorldStatus.classList.remove('subsolo-hidden');
      if (this.surfaceObjective) this.surfaceObjective.classList.remove('subsolo-hidden');

      // Oculta a HUD e modais do Subsolo
      if (this.subsoloHudContainer) {
        this.subsoloHudContainer.classList.add('hidden');
      }
      this.closeAllSubsoloModals();
    }
  }

  closeAllSubsoloModals() {
    [this.modalCultivo, this.modalSecagem, this.modalPrep, this.modalLogistica].forEach((m) => {
      m?.classList.add('hidden');
    });
  }

  update(dt) {
    if (!this.isSubsoloActive) return;
    this.updateHud();

    // Se algum modal estiver aberto, atualiza em tempo real
    if (this.modalCultivo && !this.modalCultivo.classList.contains('hidden')) {
      this.renderCultivoModalContent();
    }
    if (this.modalSecagem && !this.modalSecagem.classList.contains('hidden')) {
      this.renderSecagemModalContent();
    }
    if (this.modalPrep && !this.modalPrep.classList.contains('hidden')) {
      this.renderPrepModalContent();
    }
    if (this.modalLogistica && !this.modalLogistica.classList.contains('hidden')) {
      this.renderLogisticaModalContent();
    }
  }

  updateHud() {
    const data = this.manager.data;
    if (!data) return;

    // Respeito
    if (this.pillRespect) {
      const curLvl = data.respeito.nivel;
      const lvlConfig = SUBSOLO_RESPECT_CONFIG.find((c) => c.level === curLvl) || { title: 'Recruta' };
      this.pillRespect.textContent = `★ S${curLvl}`;
      this.pillRespect.title = `Nível de Respeito: S${curLvl} (${lvlConfig.title}) - ${data.respeito.xp} XP`;
    }

    // Energia
    const energia = Math.round(data.recursos.energia);
    if (this.pillEnergyText) this.pillEnergyText.textContent = `${energia}%`;
    if (this.pillEnergy) {
      this.pillEnergy.classList.toggle('critical-resource', energia <= 15);
      this.pillEnergy.classList.toggle('warning-resource', energia > 15 && energia <= 35);
    }

    // Água
    const agua = Math.round(data.recursos.agua);
    if (this.pillWaterText) this.pillWaterText.textContent = `${agua}%`;
    if (this.pillWater) {
      this.pillWater.classList.toggle('critical-resource', agua <= 15);
    }

    // Calor
    if (this.pillHeat && this.pillHeatText) {
      if (data.conteudoSecreto.modoTranquilo) {
        this.pillHeatText.textContent = '🕊️';
        this.pillHeat.title = 'Modo Tranquilo ativo: sem calor nem fiscalização';
        this.pillHeat.classList.remove('critical-resource', 'warning-resource');
      } else {
        const calor = Math.round(data.calor.valor);
        if (data.calor.fiscalPresente) {
          this.pillHeatText.textContent = `🚨 FISCAL (${Math.ceil(data.calor.fiscalJanelaRestante)}s)`;
          this.pillHeat.classList.add('critical-resource');
          this.pillHeat.title = 'ATENÇÃO: Fiscalização em curso! Abre a Logística e Oculta o Cofre!';
        } else {
          this.pillHeatText.textContent = `${calor}%`;
          this.pillHeat.classList.toggle('critical-resource', calor >= 80);
          this.pillHeat.classList.toggle('warning-resource', calor >= 45 && calor < 80);
          this.pillHeat.title = `Nível de Calor: ${calor}% (Aumenta com vendas não discretas)`;
        }
      }
    }

    // Mala
    const totalMala = (data.mala.ramo || 0) + (data.mala.maco || 0) + (data.mala.reserva || 0);
    const capMala = this.manager.getMalaCapacity();
    if (this.pillMalaText) this.pillMalaText.textContent = `${totalMala}/${capMala}`;
  }

  handleDynamoCrank() {
    const gained = this.manager.crankManualDynamo();
    if (gained) {
      this.game.hud?.showToast('+15% Energia gerada no dínamo manual!', 'check');
      this.updateHud();
      if (this.game.soundManager) {
        this.game.soundManager.playTone(480, { duration: 0.12, type: 'triangle', volume: 0.2 });
      }
    }
  }

  handleSubir() {
    this.closeAllSubsoloModals();
    this.game.sceneManager?.startSubir();
  }

  // ==========================================
  // MODAL 1: CULTIVO (Estufa Subterrânea)
  // ==========================================
  openCultivoModal() {
    this.closeAllSubsoloModals();
    if (!this.modalCultivo) return;
    this.renderCultivoModalContent();
    this.modalCultivo.classList.remove('hidden');
  }

  renderCultivoModalContent() {
    const container = document.getElementById('subsolo-cultivo-plots');
    if (!container) return;

    const data = this.manager.data;
    const hasPower = data.recursos.energia > 5;
    const hasWater = data.recursos.agua > 5;
    const speedMult = (hasPower && hasWater) ? '100%' : '25% (Sem energia ou água)';

    const statusBanner = document.getElementById('subsolo-cultivo-speed-banner');
    if (statusBanner) {
      statusBanner.textContent = `⚡ Velocidade de crescimento: ${speedMult}`;
      statusBanner.className = `subsolo-status-badge ${hasPower && hasWater ? 'status-good' : 'status-bad'}`;
    }

    // Canteiros
    container.innerHTML = data.canteiros.map((plot, i) => {
      if (plot.status === 'empty') {
        return `
          <div class="subsolo-card-slot">
            <div class="slot-header"><strong>Canteiro #${i + 1}</strong> <span class="slot-tag tag-empty">Vazio</span></div>
            <p class="slot-desc">Terra pronta para semear flores do subsolo.</p>
            <div class="slot-actions">
              <select id="select-seed-${i}" class="subsolo-select">
                ${Object.entries(SUBSOLO_VARIETIES).map(([id, v]) => {
                  const unlocked = data.respeito.nivel >= v.requiredRespect;
                  return `<option value="${id}" ${unlocked ? '' : 'disabled'}>${v.name} (${formatNumber(v.seedCost)}🪙 - S${v.requiredRespect}+)</option>`;
                }).join('')}
              </select>
              <button class="btn-primary btn-sm" onclick="window.__floristSubsoloUI.plantPlot(${i})">Semear</button>
            </div>
          </div>
        `;
      } else if (plot.status === 'growing') {
        const variety = SUBSOLO_VARIETIES[plot.varietyId] || SUBSOLO_VARIETIES.sombra_verde;
        const pct = Math.round(plot.progress * 100);
        return `
          <div class="subsolo-card-slot">
            <div class="slot-header"><strong>${variety.name}</strong> <span class="slot-tag tag-growing">${pct}%</span></div>
            <div class="subsolo-progress-bar"><div class="fill" style="width: ${pct}%"></div></div>
            <p class="slot-desc">Crescimento acelerado sob iluminação roxa.</p>
          </div>
        `;
      } else {
        const variety = SUBSOLO_VARIETIES[plot.varietyId] || SUBSOLO_VARIETIES.sombra_verde;
        return `
          <div class="subsolo-card-slot ready-slot">
            <div class="slot-header"><strong>${variety.name}</strong> <span class="slot-tag tag-ready">Pronto!</span></div>
            <p class="slot-desc">Colheita rende ${variety.yieldLeaves} folhas frescas.</p>
            <button class="btn-success btn-sm btn-bounce" onclick="window.__floristSubsoloUI.harvestPlot(${i})">Colher Flores</button>
          </div>
        `;
      }
    }).join('');
  }

  plantPlot(index) {
    const select = document.getElementById(`select-seed-${index}`);
    const varietyId = select ? select.value : 'sombra_verde';
    const ok = this.manager.plantSeed(index, varietyId);
    if (ok) {
      this.game.hud?.showToast('Semente plantada no canteiro!', 'sprout');
      this.renderCultivoModalContent();
    } else {
      this.game.hud?.showToast('Não tens moedas ou nível de Respeito suficiente.', 'lock');
    }
  }

  harvestPlot(index) {
    const ok = this.manager.harvestPlot(index);
    if (ok) {
      this.game.hud?.showToast('Colheita enviada para os estendais de secagem!', 'flower');
      this.renderCultivoModalContent();
      this.updateHud();
    }
  }

  refillWaterTank() {
    this.manager.refillWater();
    this.game.hud?.showToast('Reservatório de água recarregado a 100%!', 'check');
    this.updateHud();
    this.renderCultivoModalContent();
  }

  buyFuelSupply() {
    const ok = this.manager.buyFuel(20);
    if (ok) {
      this.game.hud?.showToast('Combustível abastecido (+20L)!', 'check');
      this.updateHud();
      this.renderCultivoModalContent();
    } else {
      this.game.hud?.showToast('Moedas insuficientes ou depósito cheio.', 'lock');
    }
  }

  // ==========================================
  // MODAL 2: SECAGEM (Estendais)
  // ==========================================
  openSecagemModal() {
    this.closeAllSubsoloModals();
    if (!this.modalSecagem) return;
    this.renderSecagemModalContent();
    this.modalSecagem.classList.remove('hidden');
  }

  renderSecagemModalContent() {
    const container = document.getElementById('subsolo-secagem-racks');
    if (!container) return;

    const data = this.manager.data;
    container.innerHTML = data.estendais.map((rack, i) => {
      if (rack.status === 'empty') {
        return `
          <div class="subsolo-card-slot">
            <div class="slot-header"><strong>Estendal #${i + 1}</strong> <span class="slot-tag tag-empty">Vazio</span></div>
            <p class="slot-desc">Pendura colheitas frescas para curar as folhas.</p>
          </div>
        `;
      } else if (rack.status === 'drying') {
        const variety = SUBSOLO_VARIETIES[rack.varietyId] || SUBSOLO_VARIETIES.sombra_verde;
        const duration = rack.duration || 600;
        const elapsed = (Date.now() - rack.startedAt) / 1000;
        const pct = Math.min(99, Math.round((elapsed / duration) * 100));
        return `
          <div class="subsolo-card-slot">
            <div class="slot-header"><strong>${variety.name} (${rack.leaves} folhas)</strong> <span class="slot-tag tag-growing">${pct}%</span></div>
            <div class="subsolo-progress-bar"><div class="fill" style="width: ${pct}%"></div></div>
            <p class="slot-desc">A secar e curar aroma lentamente...</p>
          </div>
        `;
      } else {
        return `
          <div class="subsolo-card-slot ready-slot">
            <div class="slot-header"><strong>Folhas Secas Curadas (${rack.leaves} un.)</strong> <span class="slot-tag tag-ready">Seco!</span></div>
            <p class="slot-desc">Pronto a recolher para a bancada de preparação.</p>
            <button class="btn-success btn-sm btn-bounce" onclick="window.__floristSubsoloUI.collectRack(${i})">Recolher Folhas</button>
          </div>
        `;
      }
    }).join('');
  }

  collectRack(index) {
    const ok = this.manager.collectRack(index);
    if (ok) {
      this.game.hud?.showToast('Folhas secas guardadas no Armazém Oculto!', 'check');
      this.renderSecagemModalContent();
      this.updateHud();
    }
  }

  // ==========================================
  // MODAL 3: PREPARAÇÃO (Bancada de Corte e Ramos)
  // ==========================================
  openPrepModal() {
    this.closeAllSubsoloModals();
    if (!this.modalPrep) return;
    this.renderPrepModalContent();
    this.modalPrep.classList.remove('hidden');
  }

  renderPrepModalContent() {
    const benchContainer = document.getElementById('subsolo-prep-bench');
    const catalogContainer = document.getElementById('subsolo-prep-catalog');
    if (!benchContainer || !catalogContainer) return;

    const data = this.manager.data;
    const dryLeaves = data.armazemOculto.folhasSecas || 0;

    // Estado da bancada
    if (data.preparacao.status === 'idle') {
      benchContainer.innerHTML = `
        <div class="subsolo-bench-status idle">
          <p><strong>Bancada Livre.</strong> Seleciona um formato abaixo para cortar e embalar.</p>
          <p class="bench-res">📦 Matéria-prima disponível: <strong>${dryLeaves} Folhas Secas</strong></p>
        </div>
      `;
    } else if (data.preparacao.status === 'preparing') {
      const prod = SUBSOLO_PRODUCTS[data.preparacao.productId] || SUBSOLO_PRODUCTS.ramo;
      const elapsed = (Date.now() - data.preparacao.startedAt) / 1000;
      const pct = Math.min(99, Math.round((elapsed / data.preparacao.duration) * 100));
      benchContainer.innerHTML = `
        <div class="subsolo-bench-status working">
          <p><strong>A cortar e prensar: ${prod.name}</strong> (${pct}%)</p>
          <div class="subsolo-progress-bar"><div class="fill" style="width: ${pct}%"></div></div>
        </div>
      `;
    } else {
      const prod = SUBSOLO_PRODUCTS[data.preparacao.productId] || SUBSOLO_PRODUCTS.ramo;
      benchContainer.innerHTML = `
        <div class="subsolo-bench-status ready">
          <p><strong>${prod.name} Finalizado!</strong></p>
          <button class="btn-success btn-sm btn-bounce" onclick="window.__floristSubsoloUI.collectPrep()">Recolher para o Armazém</button>
        </div>
      `;
    }

    // Catálogo de produtos preparáveis
    catalogContainer.innerHTML = Object.entries(SUBSOLO_PRODUCTS).map(([id, prod]) => {
      const canRespect = data.respeito.nivel >= prod.requiredRespect;
      const canLeaves = dryLeaves >= prod.requiredLeaves;
      const canMake = canRespect && canLeaves && data.preparacao.status === 'idle';

      return `
        <div class="subsolo-card-slot ${canMake ? '' : 'disabled-slot'}">
          <div class="slot-header"><strong>${prod.name}</strong> <span class="slot-tag">Valor: ~${formatNumber(prod.baseValue)}🪙</span></div>
          <p class="slot-desc">${prod.desc} (Gasta ${prod.requiredLeaves} folhas secas, tempo: ${prod.prepTimeSeconds}s, Respeito: S${prod.requiredRespect}+)</p>
          <button class="btn-primary btn-sm" ${canMake ? '' : 'disabled'} onclick="window.__floristSubsoloUI.startPrep('${id}')">Preparar</button>
        </div>
      `;
    }).join('');
  }

  startPrep(productId) {
    const ok = this.manager.startPreparation(productId);
    if (ok) {
      this.game.hud?.showToast('Preparação iniciada na bancada!', 'check');
      this.renderPrepModalContent();
      this.updateHud();
    } else {
      this.game.hud?.showToast('Folhas insuficientes ou nível de Respeito baixo.', 'lock');
    }
  }

  collectPrep() {
    const ok = this.manager.collectPreparation();
    if (ok) {
      this.game.hud?.showToast('Produto finalizado e guardado no Armazém Oculto!', 'check');
      this.renderPrepModalContent();
      this.updateHud();
    }
  }

  // ==========================================
  // MODAL 4: LOGÍSTICA (Armazém ↔ Mala ↔ Cofre)
  // ==========================================
  openLogisticaModal() {
    this.closeAllSubsoloModals();
    if (!this.modalLogistica) return;
    this.renderLogisticaModalContent();
    this.modalLogistica.classList.remove('hidden');
  }

  renderLogisticaModalContent() {
    const container = document.getElementById('subsolo-logistica-content');
    if (!container) return;

    const data = this.manager.data;
    const malaCap = this.manager.getMalaCapacity();
    const cofreCap = this.manager.getCofreCapacity();

    const malaTotal = (data.mala.ramo || 0) + (data.mala.maco || 0) + (data.mala.reserva || 0);
    const cofreTotal = (data.cofre.ramo || 0) + (data.cofre.maco || 0) + (data.cofre.reserva || 0);

    const fiscalAlert = data.calor.fiscalPresente ? `
      <div class="subsolo-fiscal-alert">
        <p><strong>🚨 FISCALIZAÇÃO ATIVA NA FLORICULTURA!</strong></p>
        <p>Oculta o cofre imediatamente para evitar multas!</p>
        <button class="btn-danger btn-bounce" onclick="window.__floristSubsoloUI.hideCofre()">Ocultar Cofre da Fiscalização</button>
      </div>
    ` : '';

    container.innerHTML = `
      ${fiscalAlert}
      <div class="subsolo-logistics-grid">
        <!-- 1. Armazém Subsolo -->
        <div class="logistics-col">
          <h3>📦 Armazém Subsolo</h3>
          <p class="col-desc">Produção pronta guardada no túnel.</p>
          <div class="stock-item"><span>Ramos do Subsolo:</span> <strong>${data.armazemOculto.ramo || 0}</strong> ${data.armazemOculto.ramo > 0 && malaTotal < malaCap ? `<button class="btn-xs" onclick="window.__floristSubsoloUI.transferToMala('ramo')">+ Mala</button>` : ''}</div>
          <div class="stock-item"><span>Maços Prensados:</span> <strong>${data.armazemOculto.maco || 0}</strong> ${data.armazemOculto.maco > 0 && malaTotal < malaCap ? `<button class="btn-xs" onclick="window.__floristSubsoloUI.transferToMala('maco')">+ Mala</button>` : ''}</div>
          <div class="stock-item"><span>Reserva Especial:</span> <strong>${data.armazemOculto.reserva || 0}</strong> ${data.armazemOculto.reserva > 0 && malaTotal < malaCap ? `<button class="btn-xs" onclick="window.__floristSubsoloUI.transferToMala('reserva')">+ Mala</button>` : ''}</div>
        </div>

        <!-- 2. Mala de Mão -->
        <div class="logistics-col">
          <h3>💼 Mala de Mão (${malaTotal}/${malaCap})</h3>
          <p class="col-desc">Transporte secreto entre o túnel e a loja.</p>
          <div class="stock-item"><span>Ramos:</span> <strong>${data.mala.ramo || 0}</strong> ${data.mala.ramo > 0 && cofreTotal < cofreCap ? `<button class="btn-xs" onclick="window.__floristSubsoloUI.depositToCofre('ramo')">→ Cofre</button>` : ''}</div>
          <div class="stock-item"><span>Maços:</span> <strong>${data.mala.maco || 0}</strong> ${data.mala.maco > 0 && cofreTotal < cofreCap ? `<button class="btn-xs" onclick="window.__floristSubsoloUI.depositToCofre('maco')">→ Cofre</button>` : ''}</div>
          <div class="stock-item"><span>Reservas:</span> <strong>${data.mala.reserva || 0}</strong> ${data.mala.reserva > 0 && cofreTotal < cofreCap ? `<button class="btn-xs" onclick="window.__floristSubsoloUI.depositToCofre('reserva')">→ Cofre</button>` : ''}</div>
        </div>

        <!-- 3. Cofre Secreto da Floricultura -->
        <div class="logistics-col">
          <h3>🔐 Cofre Oculto (${cofreTotal}/${cofreCap})</h3>
          <p class="col-desc">Apenas o que estiver aqui pode ser vendido a Clientes Secretos.</p>
          <div class="stock-item"><span>Ramos no Cofre:</span> <strong>${data.cofre.ramo || 0}</strong></div>
          <div class="stock-item"><span>Maços no Cofre:</span> <strong>${data.cofre.maco || 0}</strong></div>
          <div class="stock-item"><span>Reservas no Cofre:</span> <strong>${data.cofre.reserva || 0}</strong></div>
        </div>
      </div>
    `;
  }

  transferToMala(prodId) {
    const ok = this.manager.transferToMala(prodId, 1);
    if (ok) {
      this.renderLogisticaModalContent();
      this.updateHud();
    }
  }

  depositToCofre(prodId) {
    const ok = this.manager.depositMalaToCofre(prodId, 1);
    if (ok) {
      this.renderLogisticaModalContent();
      this.updateHud();
    }
  }

  hideCofre() {
    const ok = this.manager.hideCofre();
    if (ok) {
      this.game.hud?.showToast('Cofre ocultado com sucesso! Fiscalização despistada!', 'check');
      this.renderLogisticaModalContent();
      this.updateHud();
    }
  }

  handleDynamoCrank() {
    const gained = this.manager.crankManualDynamo();
    if (gained > 0) {
      if (this.game.soundManager) this.game.soundManager.playClick?.();
      this.game.hud?.showToast(`+${gained} energia gerada no dínamo manual!`, 'check');
      this.updateHud();
      if (this.modalCultivo && !this.modalCultivo.classList.contains('hidden')) {
        this.renderCultivoModalContent();
      }
    }
  }

  handleSubir() {
    this.closeAllSubsoloModals();
    if (this.game.sceneManager) {
      this.game.sceneManager.startSubir();
    }
  }
}

