// ========================================================
// FloristEver v2.0.0 — Interface Temática do Subsolo (subsolo-ui.js)
// HUD dedicado, modais de produção/secagem/bancada/logística e troca fluida
// ========================================================

import { SUBSOLO_VARIETIES, SUBSOLO_PRODUCTS, SUBSOLO_RESPECT_CONFIG, PACKAGING_OPTIONS } from './subsolo-config.js';
import { formatNumber } from '../utils.js';
import { ICONS } from '../icons.js';

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
    this.subsoloMenuToggle = document.getElementById('btn-toggle-subsolo-menu');
    this.subsoloMenuItems = document.getElementById('subsolo-hud-menu-items');

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

    window.__floristSubsoloUI = this;
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
    this.subsoloMenuToggle?.addEventListener('click', () => {
      this.setSubsoloMenuOpen(this.subsoloMenuToggle.getAttribute('aria-expanded') !== 'true');
    });
    this.subsoloMenuItems?.addEventListener('click', (event) => {
      if (event.target.closest('button')) this.setSubsoloMenuOpen(false);
    });
    document.addEventListener('pointerdown', (event) => {
      if (!(event.target instanceof Element) || !event.target.closest('.subsolo-hud-actions')) {
        this.setSubsoloMenuOpen(false);
      }
    });

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

    // Fechar modais do subsolo com a tecla Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isSubsoloActive) {
        this.setSubsoloMenuOpen(false);
        [this.modalCultivo, this.modalSecagem, this.modalPrep, this.modalLogistica].forEach((m) => {
          if (m && !m.classList.contains('hidden')) {
            m.classList.add('hidden');
          }
        });
      }
    });
  }

  setSubsoloMenuOpen(isOpen) {
    if (!this.subsoloMenuToggle || !this.subsoloMenuItems) return;
    this.subsoloMenuItems.classList.toggle('is-open', isOpen);
    this.subsoloMenuToggle.setAttribute('aria-expanded', String(isOpen));
    this.subsoloMenuToggle.setAttribute('aria-label', isOpen ? 'Fechar menu do Subsolo' : 'Abrir menu do Subsolo');
  }

  setSubsoloActive(active) {
    this.isSubsoloActive = active;
    this.setSubsoloMenuOpen(false);
    document.body.classList.toggle('subsolo-mode', active);

    if (active) {
      // ── Desativa e Fecha Rigorosamente Todos os Controlos e Modais da Superfície ──
      this.game.closeCompostModal?.();
      this.game.bouquetUi?.modalBouquet?.classList.add('hidden');
      this.game.bouquetUi?.modalBook?.classList.add('hidden');
      document.getElementById('modal-shop')?.classList.add('hidden');
      document.getElementById('modal-bouquet')?.classList.add('hidden');
      document.getElementById('modal-book')?.classList.add('hidden');
      document.getElementById('modal-compost')?.classList.add('hidden');
      document.getElementById('modal-missions')?.classList.add('hidden');
      document.getElementById('modal-settings')?.classList.add('hidden');
      document.getElementById('modal-challenges')?.classList.add('hidden');
      document.getElementById('map-panel')?.classList.add('hidden');
      document.getElementById('hud-menu-items')?.classList.remove('is-open');

      // Se o jogador estiver em modo decoração de jardim ou sentado, desativa imediatamente
      if (this.game.decorationMode) {
        this.game.decorationMode = false;
        document.body.classList.remove('garden-decoration-mode');
        document.getElementById('btn-toggle-decoration-mode')?.setAttribute('aria-pressed', 'false');
      }
      if (this.game.player?.isSeated) {
        this.game.player.standUp();
      }

      // Oculta sistemas e menus da superfície
      if (this.surfaceHudActions) this.surfaceHudActions.classList.add('subsolo-hidden');
      if (this.surfaceWorldStatus) this.surfaceWorldStatus.classList.add('subsolo-hidden');
      if (this.surfaceObjective) this.surfaceObjective.classList.add('subsolo-hidden');
      document.getElementById('hud-basket-pill')?.classList.add('subsolo-hidden');
      document.getElementById('btn-toggle-map')?.classList.add('subsolo-hidden');
      document.getElementById('tutorial-banner')?.classList.add('hidden');

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
      document.getElementById('hud-basket-pill')?.classList.remove('subsolo-hidden');
      document.getElementById('btn-toggle-map')?.classList.remove('subsolo-hidden');

      // Oculta a HUD e modais do Subsolo
      if (this.subsoloHudContainer) {
        this.subsoloHudContainer.classList.add('hidden');
      }
      this.closeAllSubsoloModals();
      this.game.hud?.setInteractionPrompt(false);
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
      this.pillEnergy.style.setProperty('--pct', `${energia}%`);
      const meterBar = document.getElementById('meter-energy-bar');
      if (meterBar) meterBar.style.width = `${energia}%`;
    }

    // Água
    const agua = Math.round(data.recursos.agua);
    if (this.pillWaterText) this.pillWaterText.textContent = `${agua}%`;
    if (this.pillWater) {
      this.pillWater.classList.toggle('critical-resource', agua <= 15);
      this.pillWater.style.setProperty('--pct', `${agua}%`);
      const meterBar = document.getElementById('meter-water-bar');
      if (meterBar) meterBar.style.width = `${agua}%`;
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
        const meterBar = document.getElementById('meter-heat-bar');
        if (meterBar) meterBar.style.width = `${calor}%`;
      }
    }

    // Mala
    const totalMala = (data.mala.ramo || 0) + (data.mala.maco || 0) + (data.mala.reserva || 0);
    const capMala = this.manager.getMalaCapacity();
    if (this.pillMalaText) this.pillMalaText.textContent = `${totalMala}/${capMala}`;
    if (this.pillMala) {
      const malaPct = Math.min(100, Math.round((totalMala / capMala) * 100));
      const meterBar = document.getElementById('meter-mala-bar');
      if (meterBar) meterBar.style.width = `${malaPct}%`;
    }

    // Notificações em Tempo Real nos Botões da HUD
    this.updateHudBadges();
  }

  updateHudBadges() {
    const data = this.manager.data;
    if (!data) return;

    // Badges de itens prontos
    const readyPlots = data.canteiros.filter((p) => p.status === 'ready').length;
    const readyRacks = data.estendais.filter((r) => r.status === 'ready').length;
    const isPrepReady = data.preparacao.status === 'ready';

    this.setButtonBadge('btn-subsolo-cultivo', readyPlots);
    this.setButtonBadge('btn-subsolo-secagem', readyRacks);
    this.setButtonBadge('btn-subsolo-prep', isPrepReady ? '!' : 0);
  }

  setButtonBadge(buttonId, count) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    let badge = btn.querySelector('.hud-notify-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'hud-notify-badge';
      btn.appendChild(badge);
    }
    if (count && count !== 0) {
      badge.textContent = count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  handleDynamoCrank() {
    const gained = this.manager.crankManualDynamo();
    if (gained) {
      this.game.hud?.showToast(`+${gained}% Energia gerada no dínamo manual!`, 'check');
      this.updateHud();
      if (this.game.soundManager) {
        this.game.soundManager.playTone(480, { duration: 0.12, type: 'triangle', volume: 0.2 });
      }
      if (this.modalCultivo && !this.modalCultivo.classList.contains('hidden')) {
        this.renderCultivoModalContent();
      }
    }
  }

  handleSubir() {
    this.closeAllSubsoloModals();
    this.game.sceneManager?.startSubir();
  }

  // ==========================================
  // MODAL 1: CULTIVO (Estufa Subterrânea UV)
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
    const energia = Math.round(data.recursos.energia);
    const agua = Math.round(data.recursos.agua);
    const combustivel = Math.round(data.recursos.combustivel || 0);
    const hasPower = energia > 5;
    const hasWater = agua > 5;
    const speedMult = (hasPower && hasWater) ? '100% (Ótima)' : '25% (Sem energia ou água)';

    const readyCount = data.canteiros.filter((p) => p.status === 'ready').length;
    const emptyCount = data.canteiros.filter((p) => p.status === 'empty').length;

    const statusBanner = document.getElementById('subsolo-cultivo-speed-banner');
    if (statusBanner) {
      statusBanner.innerHTML = `
        <div class="telemetry-chip">
          <span class="telemetry-icon">${hasPower && hasWater ? ICONS.subsoloEnergy : ICONS.subsoloHeat}</span>
          <div class="telemetry-info">
            <span class="telemetry-label">Velocidade UV</span>
            <strong class="telemetry-value ${hasPower && hasWater ? 'text-good' : 'text-bad'}">${speedMult}</strong>
          </div>
        </div>
        <div class="telemetry-meters-row">
          <div class="telemetry-mini-pill" title="Energia Elétrica: ${energia}%">
            ${ICONS.subsoloEnergy} <span>${energia}%</span>
            <div class="telemetry-mini-bar"><div class="fill" style="width: ${energia}%;"></div></div>
          </div>
          <div class="telemetry-mini-pill" title="Reservatório de Água: ${agua}%">
            ${ICONS.subsoloWater} <span>${agua}%</span>
            <div class="telemetry-mini-bar"><div class="fill fill-cyan" style="width: ${agua}%;"></div></div>
          </div>
          <div class="telemetry-mini-pill" title="Combustível do Gerador: ${combustivel}L">
            ${ICONS.subsoloFuel} <span>${combustivel}L</span>
            <div class="telemetry-mini-bar"><div class="fill fill-amber" style="width: ${Math.min(100, combustivel)}%;"></div></div>
          </div>
        </div>
      `;
      statusBanner.className = `subsolo-status-badge ${hasPower && hasWater ? 'status-good' : 'status-bad'}`;
    }

    // Barra de Ações Rápidas (Batch Actions)
    let batchBar = document.getElementById('subsolo-cultivo-batch-bar');
    if (!batchBar) {
      batchBar = document.createElement('div');
      batchBar.id = 'subsolo-cultivo-batch-bar';
      batchBar.className = 'subsolo-batch-bar';
      container.parentElement.insertBefore(batchBar, container);
    }
    batchBar.innerHTML = `
      <div class="batch-bar-left">
        <span class="batch-badge">Estufa: <strong>${data.canteiros.length} Canteiros</strong></span>
        ${readyCount > 0 ? `<button type="button" class="btn-success btn-sm btn-bounce btn-batch-action" onclick="window.__floristSubsoloUI.harvestAllReadyPlots()">${ICONS.subsoloHarvest} Colher Todos (${readyCount})</button>` : ''}
      </div>
      <div class="batch-bar-right">
        ${emptyCount > 0 ? `
          <button type="button" class="btn-primary btn-sm btn-subsolo-action" onclick="window.__floristSubsoloUI.plantAllEmptyPlots()">${ICONS.sprout} Semear Todos Vazios (${emptyCount})</button>
        ` : ''}
      </div>
    `;

    // Canteiros
    container.innerHTML = data.canteiros.map((plot, i) => {
      if (plot.status === 'empty') {
        return `
          <div class="subsolo-card-slot slot-empty">
            <div class="slot-header">
              <span class="slot-title">${ICONS.sprout} Canteiro #${i + 1}</span>
              <span class="slot-tag tag-empty">Disponível</span>
            </div>
            <p class="slot-desc">Solo enriquecido sob lâmpadas UV de espectro completo.</p>
            <div class="slot-actions">
              <select id="select-seed-${i}" class="subsolo-select" aria-label="Escolher semente">
                ${Object.entries(SUBSOLO_VARIETIES).map(([id, v]) => {
                  const unlocked = data.respeito.nivel >= v.requiredRespect;
                  return `<option value="${id}" ${unlocked ? '' : 'disabled'}>${v.name} (${formatNumber(v.seedCost)}🪙 • S${v.requiredRespect}+)</option>`;
                }).join('')}
              </select>
              <button type="button" class="btn-primary btn-sm btn-subsolo-action" onclick="window.__floristSubsoloUI.plantPlot(${i})">${ICONS.sprout} Semear</button>
            </div>
          </div>
        `;
      } else if (plot.status === 'growing') {
        const variety = SUBSOLO_VARIETIES[plot.varietyId] || SUBSOLO_VARIETIES.sombra_verde;
        const pct = Math.round(plot.progress * 100);
        let stageName = 'Germinação';
        if (pct >= 35 && pct < 75) stageName = 'Crescimento UV';
        else if (pct >= 75) stageName = 'Floração';

        return `
          <div class="subsolo-card-slot growing-slot">
            <div class="slot-header">
              <span class="slot-title">${variety.icon || ''} ${variety.name}</span>
              <span class="slot-tag tag-growing">${pct}%</span>
            </div>
            <div class="slot-stage-badge">
              <span class="stage-dot"></span> <span>${stageName}</span>
            </div>
            <div class="subsolo-progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
              <div class="fill" style="width: ${pct}%"></div>
            </div>
            <div class="slot-footer-info">
              <span class="info-pill">${ICONS.subsoloEnergy} Fotoperíodo Ativo</span>
              <span class="info-yield">+${variety.yieldLeaves} folhas</span>
            </div>
          </div>
        `;
      } else {
        const variety = SUBSOLO_VARIETIES[plot.varietyId] || SUBSOLO_VARIETIES.sombra_verde;
        return `
          <div class="subsolo-card-slot ready-slot">
            <div class="slot-header">
              <span class="slot-title">${variety.icon || ''} ${variety.name}</span>
              <span class="slot-tag tag-ready">Maduro!</span>
            </div>
            <div class="ready-yield-display">
              <span class="yield-icon">${ICONS.subsoloHarvest}</span>
              <div>
                <strong>Pronto para Colheita</strong>
                <p class="slot-desc">Rendimento: <strong>+${variety.yieldLeaves} folhas frescas</strong></p>
              </div>
            </div>
            <button type="button" class="btn-success btn-sm btn-bounce btn-subsolo-action" onclick="window.__floristSubsoloUI.harvestPlot(${i})">${ICONS.subsoloHarvest} Colher Flores</button>
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
      this.updateHud();
    } else {
      this.game.hud?.showToast('Não tens moedas ou nível de Respeito suficiente.', 'lock');
    }
  }

  plantAllEmptyPlots() {
    const data = this.manager.data;
    let planted = 0;
    data.canteiros.forEach((plot, i) => {
      if (plot.status === 'empty') {
        const select = document.getElementById(`select-seed-${i}`);
        const varietyId = select ? select.value : 'sombra_verde';
        if (this.manager.plantSeed(i, varietyId)) planted++;
      }
    });
    if (planted > 0) {
      this.game.hud?.showToast(`${planted} canteiros semeados com sucesso!`, 'sprout');
      this.renderCultivoModalContent();
      this.updateHud();
    } else {
      this.game.hud?.showToast('Moedas insuficientes para semear todos os canteiros.', 'lock');
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

  harvestAllReadyPlots() {
    const data = this.manager.data;
    let harvested = 0;
    data.canteiros.forEach((plot, i) => {
      if (plot.status === 'ready') {
        if (this.manager.harvestPlot(i)) harvested++;
      }
    });
    if (harvested > 0) {
      this.game.hud?.showToast(`${harvested} canteiros colhidos e transferidos para secagem!`, 'flower');
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
  // MODAL 2: SECAGEM (Estendais de Cura & Desidratação)
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
    const readyCount = data.estendais.filter((r) => r.status === 'ready').length;

    // Barra de controlo de secagem
    let batchBar = document.getElementById('subsolo-secagem-batch-bar');
    if (!batchBar) {
      batchBar = document.createElement('div');
      batchBar.id = 'subsolo-secagem-batch-bar';
      batchBar.className = 'subsolo-batch-bar';
      container.parentElement.insertBefore(batchBar, container);
    }
    batchBar.innerHTML = `
      <div class="batch-bar-left">
        <span class="batch-badge">Ventilação Térmica: <strong>Ativa</strong></span>
      </div>
      <div class="batch-bar-right">
        ${readyCount > 0 ? `<button type="button" class="btn-success btn-sm btn-bounce btn-batch-action" onclick="window.__floristSubsoloUI.collectAllReadyRacks()">${ICONS.subsoloHarvest} Recolher Todas Folhas (${readyCount})</button>` : ''}
      </div>
    `;

    container.innerHTML = data.estendais.map((rack, i) => {
      if (rack.status === 'empty') {
        return `
          <div class="subsolo-card-slot slot-empty">
            <div class="slot-header">
              <span class="slot-title">${ICONS.subsoloSecagem} Estendal #${i + 1}</span>
              <span class="slot-tag tag-empty">Livre</span>
            </div>
            <p class="slot-desc">Estrutura de madeira suspensa pronta para receber colheitas frescas.</p>
            <div class="empty-rack-indicator">
              <span>🌾 Colhe flores na Estufa para secar aqui</span>
            </div>
          </div>
        `;
      } else if (rack.status === 'drying') {
        const variety = SUBSOLO_VARIETIES[rack.varietyId] || SUBSOLO_VARIETIES.sombra_verde;
        const duration = rack.duration || 600;
        const elapsed = (Date.now() - rack.startedAt) / 1000;
        const pct = Math.min(99, Math.round((elapsed / duration) * 100));
        let curingStage = 'Desidratação Lenta';
        if (pct >= 50 && pct < 85) curingStage = 'Fixação de Aroma';
        else if (pct >= 85) curingStage = 'Fase Final';

        return `
          <div class="subsolo-card-slot growing-slot">
            <div class="slot-header">
              <span class="slot-title">${variety.icon || ''} ${variety.name} (${rack.leaves} un.)</span>
              <span class="slot-tag tag-growing">${pct}%</span>
            </div>
            <div class="slot-stage-badge stage-amber">
              <span class="stage-dot dot-amber"></span> <span>${curingStage}</span>
            </div>
            <div class="subsolo-progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
              <div class="fill fill-amber" style="width: ${pct}%"></div>
            </div>
            <div class="slot-footer-info">
              <span class="info-pill">Cura Natural a Frio</span>
              <span class="info-yield">${rack.leaves} folhas</span>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="subsolo-card-slot ready-slot ready-rack">
            <div class="slot-header">
              <span class="slot-title">${ICONS.subsoloSecagem} Folhas Curadas (${rack.leaves} un.)</span>
              <span class="slot-tag tag-ready">Curado!</span>
            </div>
            <p class="slot-desc">Processo de secagem concluído. Textura suave e óleo essencial preservado.</p>
            <button type="button" class="btn-success btn-sm btn-bounce btn-subsolo-action" onclick="window.__floristSubsoloUI.collectRack(${i})">${ICONS.subsoloHarvest} Guardar no Armazém</button>
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

  collectAllReadyRacks() {
    const data = this.manager.data;
    let collected = 0;
    data.estendais.forEach((rack, i) => {
      if (rack.status === 'ready') {
        if (this.manager.collectRack(i)) collected++;
      }
    });
    if (collected > 0) {
      this.game.hud?.showToast(`${collected} lotes de folhas secas guardados no Armazém!`, 'check');
      this.renderSecagemModalContent();
      this.updateHud();
    }
  }

  // ==========================================
  // MODAL 3: PREPARAÇÃO (Bancada de Corte e Manufatura)
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

    // Hero Display da bancada
    if (data.preparacao.status === 'idle') {
      benchContainer.innerHTML = `
        <div class="subsolo-bench-status idle">
          <div class="bench-header">
            <div class="bench-icon-badge">${ICONS.subsoloPrep}</div>
            <div class="bench-header-text">
              <strong>Bancada de Manufatura Livre</strong>
              <p class="bench-subtitle">Escolhe um formato abaixo para cortar, prensar e preparar lotes discretos.</p>
            </div>
          </div>
          <div class="bench-stock-chip">
            <div class="stock-chip-label">
              <span class="chip-icon">${ICONS.subsoloHarvest}</span>
              <span>Matéria-prima no Armazém:</span>
            </div>
            <strong class="stock-highlight">${dryLeaves} Folhas Secas</strong>
          </div>
        </div>
      `;
    } else if (data.preparacao.status === 'preparing') {
      const prod = SUBSOLO_PRODUCTS[data.preparacao.productId] || SUBSOLO_PRODUCTS.ramo;
      const elapsed = (Date.now() - data.preparacao.startedAt) / 1000;
      const pct = Math.min(99, Math.round((elapsed / data.preparacao.duration) * 100));
      benchContainer.innerHTML = `
        <div class="subsolo-bench-status working">
          <div class="bench-header">
            <div class="bench-icon-badge bench-spinning">${ICONS.subsoloPrep}</div>
            <div class="bench-header-text">
              <strong>A Manufaturar: ${prod.icon || ''} ${prod.name}</strong>
              <span class="slot-tag tag-growing">${pct}% Concluído</span>
            </div>
          </div>
          <div class="subsolo-progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
            <div class="fill fill-cyan" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    } else {
      const prod = SUBSOLO_PRODUCTS[data.preparacao.productId] || SUBSOLO_PRODUCTS.ramo;
      benchContainer.innerHTML = `
        <div class="subsolo-bench-status ready">
          <div class="bench-header">
            <div class="bench-icon-badge bench-ready-icon">${ICONS.check}</div>
            <div class="bench-header-text">
              <strong>${prod.icon || ''} ${prod.name} Pronto!</strong>
              <p class="bench-subtitle">Lote finalizado com padrão impecável. Pronto para armazenamento.</p>
            </div>
          </div>
          <button type="button" class="btn-success btn-sm btn-bounce btn-subsolo-action" onclick="window.__floristSubsoloUI.collectPrep()">${ICONS.subsoloPrep} Guardar no Armazém</button>
        </div>
      `;
    }

    // Catálogo de produtos preparáveis
    catalogContainer.innerHTML = Object.entries(SUBSOLO_PRODUCTS).map(([id, prod]) => {
      const canRespect = data.respeito.nivel >= prod.requiredRespect;
      const canLeaves = dryLeaves >= prod.requiredLeaves;
      const canMake = canRespect && canLeaves && data.preparacao.status === 'idle';

      let reason = '';
      if (!canRespect) reason = `Requer Respeito S${prod.requiredRespect}+`;
      else if (!canLeaves) reason = `Faltam ${prod.requiredLeaves - dryLeaves} folhas`;
      else if (data.preparacao.status !== 'idle') reason = 'Bancada ocupada';

      return `
        <div class="subsolo-card-slot prep-card-slot ${canMake ? '' : 'disabled-slot'}">
          <div class="slot-header">
            <span class="slot-title">${prod.icon || ''} ${prod.name}</span>
            <span class="slot-tag tag-value">~${formatNumber(prod.baseValue)}🪙</span>
          </div>
          <p class="slot-desc">${prod.desc}</p>
          <div class="prep-specs-row">
            <span class="spec-pill ${canLeaves ? 'spec-ok' : 'spec-missing'}">${ICONS.subsoloHarvest} ${prod.requiredLeaves} folhas</span>
            <span class="spec-pill">⏱️ ${Math.round(prod.prepTimeSeconds / 60)} min</span>
            <span class="spec-pill ${canRespect ? 'spec-unlocked' : 'spec-locked'}">★ S${prod.requiredRespect}+</span>
          </div>
          ${!canMake && reason ? `<div class="prep-hint-alert">${reason}</div>` : ''}
          <button type="button" class="btn-primary btn-sm btn-subsolo-action" ${canMake ? '' : 'disabled'} onclick="window.__floristSubsoloUI.startPrep('${id}')">${ICONS.subsoloPrep} Preparar Lote</button>
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
    const malaPct = Math.min(100, Math.round((malaTotal / malaCap) * 100));
    const cofrePct = Math.min(100, Math.round((cofreTotal / cofreCap) * 100));

    const fiscalAlert = data.calor.fiscalPresente ? `
      <div class="subsolo-fiscal-alert">
        <div class="alert-header">
          <span class="alert-icon">${ICONS.subsoloHeat}</span>
          <div>
            <strong>INSPEÇÃO FISCAL EM CURSO NA FLORICULTURA!</strong>
            <p>Oculta o cofre antes que o fiscal termine a vistoria (${Math.ceil(data.calor.fiscalJanelaRestante)}s restantes)!</p>
          </div>
        </div>
        <button type="button" class="btn-danger btn-bounce btn-subsolo-alert" onclick="window.__floristSubsoloUI.hideCofre()">${ICONS.subsoloShield} Ocultar Cofre da Fiscalização</button>
      </div>
    ` : '';

    container.innerHTML = `
      ${fiscalAlert}
      
      <!-- Diagrama de Fluxo de Contrabando -->
      <div class="subsolo-flow-diagram">
        <div class="flow-step">
          <span class="flow-dot amber"></span>
          <span>Armazém do Túnel</span>
        </div>
        <span class="flow-arrow">➔</span>
        <div class="flow-step">
          <span class="flow-dot cyan"></span>
          <span>Mala de Transporte</span>
        </div>
        <span class="flow-arrow">➔</span>
        <div class="flow-step">
          <span class="flow-dot purple"></span>
          <span>Cofre Secreto</span>
        </div>
        <span class="flow-arrow">➔</span>
        <div class="flow-step">
          <span class="flow-dot green"></span>
          <span>Clientes em Código</span>
        </div>
      </div>

      <!-- Barra de Ações Rápidas de Logística -->
      <div class="subsolo-logistics-quick-actions">
        ${malaTotal < malaCap ? `<button type="button" class="btn-secondary btn-sm" onclick="window.__floristSubsoloUI.transferAllToMala()">${ICONS.subsoloMala} Encher Mala a partir do Armazém</button>` : ''}
        ${malaTotal > 0 && cofreTotal < cofreCap ? `<button type="button" class="btn-primary btn-sm btn-bounce" onclick="window.__floristSubsoloUI.depositAllToCofre()">${ICONS.subsoloLogistica} Guardar Toda a Mala no Cofre</button>` : ''}
      </div>

      <div class="subsolo-logistics-grid">
        <!-- 1. Armazém Subsolo -->
        <div class="logistics-col col-armazem">
          <div class="col-header">
            <h3>${ICONS.subsoloPrep} Armazém do Túnel</h3>
            <span class="col-badge">Produção</span>
          </div>
          <p class="col-desc">Mercadoria processada guardada no subsolo em segurança.</p>
          
          <div class="stock-item">
            <span class="stock-name">Ramos Discretos:</span>
            <div class="stock-ctrl">
              <strong class="stock-number">${data.armazemOculto.ramo || 0}</strong>
              ${data.armazemOculto.ramo > 0 && malaTotal < malaCap ? `<button type="button" class="btn-xs btn-transfer" title="Mover 1 para a mala" onclick="window.__floristSubsoloUI.transferToMala('ramo')">+1 Mala</button>` : ''}
            </div>
          </div>
          <div class="stock-item">
            <span class="stock-name">Maços Prensados:</span>
            <div class="stock-ctrl">
              <strong class="stock-number">${data.armazemOculto.maco || 0}</strong>
              ${data.armazemOculto.maco > 0 && malaTotal < malaCap ? `<button type="button" class="btn-xs btn-transfer" title="Mover 1 para a mala" onclick="window.__floristSubsoloUI.transferToMala('maco')">+1 Mala</button>` : ''}
            </div>
          </div>
          <div class="stock-item">
            <span class="stock-name">Reserva Especial:</span>
            <div class="stock-ctrl">
              <strong class="stock-number">${data.armazemOculto.reserva || 0}</strong>
              ${data.armazemOculto.reserva > 0 && malaTotal < malaCap ? `<button type="button" class="btn-xs btn-transfer" title="Mover 1 para a mala" onclick="window.__floristSubsoloUI.transferToMala('reserva')">+1 Mala</button>` : ''}
            </div>
          </div>
        </div>

        <!-- 2. Mala de Mão -->
        <div class="logistics-col col-mala">
          <div class="col-header">
            <h3>${ICONS.subsoloMala} Mala de Transporte</h3>
            <span class="col-badge col-badge-cyan">${malaTotal}/${malaCap}</span>
          </div>
          <p class="col-desc">Transporta itens discretamente entre o túnel e a loja.</p>
          <div class="capacity-gauge-track"><div class="gauge-fill fill-cyan" style="width: ${malaPct}%;"></div></div>

          <div class="stock-item">
            <span class="stock-name">Ramos na Mala:</span>
            <div class="stock-ctrl">
              <strong class="stock-number">${data.mala.ramo || 0}</strong>
              ${data.mala.ramo > 0 && cofreTotal < cofreCap ? `<button type="button" class="btn-xs btn-transfer" title="Mover 1 para o cofre" onclick="window.__floristSubsoloUI.depositToCofre('ramo')">+1 Cofre</button>` : ''}
            </div>
          </div>
          <div class="stock-item">
            <span class="stock-name">Maços na Mala:</span>
            <div class="stock-ctrl">
              <strong class="stock-number">${data.mala.maco || 0}</strong>
              ${data.mala.maco > 0 && cofreTotal < cofreCap ? `<button type="button" class="btn-xs btn-transfer" title="Mover 1 para o cofre" onclick="window.__floristSubsoloUI.depositToCofre('maco')">+1 Cofre</button>` : ''}
            </div>
          </div>
          <div class="stock-item">
            <span class="stock-name">Reservas na Mala:</span>
            <div class="stock-ctrl">
              <strong class="stock-number">${data.mala.reserva || 0}</strong>
              ${data.mala.reserva > 0 && cofreTotal < cofreCap ? `<button type="button" class="btn-xs btn-transfer" title="Mover 1 para o cofre" onclick="window.__floristSubsoloUI.depositToCofre('reserva')">+1 Cofre</button>` : ''}
            </div>
          </div>
        </div>

        <!-- 3. Cofre Secreto da Floricultura -->
        <div class="logistics-col col-cofre">
          <div class="col-header">
            <h3>${ICONS.subsoloLogistica} Cofre Oculto</h3>
            <span class="col-badge col-badge-purple">${cofreTotal}/${cofreCap}</span>
          </div>
          <p class="col-desc">Apenas itens no cofre podem ser entregues a Clientes Secretos.</p>
          <div class="capacity-gauge-track"><div class="gauge-fill fill-purple" style="width: ${cofrePct}%;"></div></div>

          <div class="stock-item">
            <span class="stock-name">Ramos Disponíveis:</span>
            <strong class="stock-number">${data.cofre.ramo || 0}</strong>
          </div>
          <div class="stock-item">
            <span class="stock-name">Maços Disponíveis:</span>
            <strong class="stock-number">${data.cofre.maco || 0}</strong>
          </div>
          <div class="stock-item">
            <span class="stock-name">Reservas Disponíveis:</span>
            <strong class="stock-number">${data.cofre.reserva || 0}</strong>
          </div>
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

  transferAllToMala() {
    const data = this.manager.data;
    const malaCap = this.manager.getMalaCapacity();
    let moved = 0;
    for (const prodId of ['ramo', 'maco', 'reserva']) {
      while ((data.armazemOculto[prodId] || 0) > 0) {
        const currentMala = (data.mala.ramo || 0) + (data.mala.maco || 0) + (data.mala.reserva || 0);
        if (currentMala >= malaCap) break;
        if (this.manager.transferToMala(prodId, 1)) moved++;
        else break;
      }
    }
    if (moved > 0) {
      this.game.hud?.showToast(`${moved} produtos transferidos para a Mala!`, 'check');
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

  depositAllToCofre() {
    const data = this.manager.data;
    const cofreCap = this.manager.getCofreCapacity();
    let deposited = 0;
    for (const prodId of ['ramo', 'maco', 'reserva']) {
      while ((data.mala[prodId] || 0) > 0) {
        const currentCofre = (data.cofre.ramo || 0) + (data.cofre.maco || 0) + (data.cofre.reserva || 0);
        if (currentCofre >= cofreCap) break;
        if (this.manager.depositMalaToCofre(prodId, 1)) deposited++;
        else break;
      }
    }
    if (deposited > 0) {
      this.game.hud?.showToast(`${deposited} produtos guardados no Cofre!`, 'check');
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
