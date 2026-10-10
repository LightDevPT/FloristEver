// ========================================================
// FloristEver - Painel da Loja de Melhorias (shop.js)
// Gestão visual e compra de upgrades da floricultura
// ========================================================
import { UPGRADES_CONFIG } from '../config/upgrades.js';
import { FLOWER_ORDER, FLOWERS_CONFIG } from '../config/flowers.js';
import { BOUQUET_CATEGORIES } from '../config/bouquets.js';
import { formatNumber } from '../utils.js';
import { getIcon } from '../icons.js';

export const UPGRADE_CATEGORIES = [
  {
    id: 'cultivation',
    title: 'Cultivo e colheita',
    description: 'Melhorias para fazer crescer as flores e abastecer a loja.',
    icon: 'sprout'
  },
  {
    id: 'service',
    title: 'Atendimento e equipa',
    description: 'Automatiza o balcão e reforça a equipa da floricultura.',
    icon: 'cashier'
  },
  {
    id: 'equipment',
    title: 'Equipamento pessoal',
    description: 'Aumenta a capacidade do cesto e a mobilidade no jardim.',
    icon: 'basket'
  },
  {
    id: 'shop',
    title: 'Loja e reputação',
    description: 'Expande a floricultura e melhora a experiência dos clientes.',
    icon: 'shopExpansion'
  },
  {
    id: 'bouquet',
    title: 'Criação de ramos',
    description: 'Investe na bancada e aumenta o valor dos ramos vendidos.',
    icon: 'bouquet'
  }
];

export class ShopUi {
  constructor(state, sound, hud) {
    this.state = state;
    this.sound = sound;
    this.hud = hud;

    this.modalEl = document.getElementById('modal-shop');
    this.listContainer = document.getElementById('upgrades-list');
    this.openBtn = document.getElementById('btn-open-shop');
    this.openChallengesBtn = document.getElementById('btn-open-challenges');
    this.challengesModal = document.getElementById('modal-challenges');
    this.goalsContainer = document.getElementById('shop-goals-list');
    this.challengesContainer = document.getElementById('shop-challenges-list');
    this.projectsContainer = document.getElementById('long-term-projects-list');
    this.onTravelToZone = null;
    this.employmentContainer = document.getElementById('employment-contract-list');
    this.employmentTotalWage = document.getElementById('employment-total-wage');
    this.stockSkillsContainer = document.getElementById('stock-minimum-skills');
    this.bouquetSpecializationsContainer = document.getElementById('bouquet-specializations');
    this.finance = {
      income: document.getElementById('finance-income'),
      expenses: document.getElementById('finance-expenses'),
      net: document.getElementById('finance-net'),
      balance: document.getElementById('finance-balance')
    };

    this.init();
  }

  init() {
    if (this.openBtn) {
      this.openBtn.addEventListener('click', () => this.open());
    }
    this.openChallengesBtn?.addEventListener('click', () => this.openChallenges());

    // Fechar ao clicar no botão X ou no backdrop
    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]') || e.target === this.modalEl) {
          this.close();
        }
      });
    }
    this.challengesModal?.addEventListener('click', (event) => {
      if (event.target.closest('[data-close]') || event.target === this.challengesModal) {
        this.closeChallenges();
      }
    });

    this.state.subscribe(() => {
      if (this.isOpen()) {
        this.render();
      }
      if (this.isChallengesOpen()) {
        this.renderChallenges();
      }
    });
    window.setInterval(() => {
      if (this.isOpen()) this.renderEmployment();
      if (this.isChallengesOpen()) this.renderChallenges();
    }, 1000);
  }

  open() {
    this.sound.playClick();
    if (this.modalEl) {
      this.modalEl.classList.remove('hidden');
      this.render();
    }
  }

  close() {
    this.sound.playClick();
    if (this.modalEl) {
      this.modalEl.classList.add('hidden');
    }
  }

  isOpen() {
    return this.modalEl && !this.modalEl.classList.contains('hidden');
  }

  openChallenges() {
    this.sound.playClick();
    this.challengesModal?.classList.remove('hidden');
    this.renderChallenges();
  }

  closeChallenges() {
    this.sound.playClick();
    this.challengesModal?.classList.add('hidden');
  }

  isChallengesOpen() {
    return this.challengesModal && !this.challengesModal.classList.contains('hidden');
  }

  render() {
    if (!this.listContainer) return;
    this.renderFinanceSummary();
    this.renderGoals();
    this.renderEmployment();
    this.renderStockMinimumSkills();
    this.renderBouquetSpecializations();
    this.listContainer.innerHTML = '';

    const categoryGrids = new Map();
    for (const category of UPGRADE_CATEGORIES) {
      const section = document.createElement('section');
      section.className = 'upgrade-category';
      section.dataset.category = category.id;
      section.setAttribute('aria-labelledby', `upgrade-category-${category.id}`);
      section.innerHTML = `
        <div class="upgrade-category-heading">
          <div class="upgrade-category-icon">${getIcon(category.icon, getIcon('upgrade'))}</div>
          <div>
            <h3 id="upgrade-category-${category.id}">${category.title}</h3>
            <p>${category.description}</p>
          </div>
        </div>
        <div class="upgrade-category-grid"></div>
      `;
      categoryGrids.set(category.id, section.querySelector('.upgrade-category-grid'));
      this.listContainer.appendChild(section);
    }

    const upgradeKeys = Object.keys(UPGRADES_CONFIG);

    for (const key of upgradeKeys) {
      const cfg = UPGRADES_CONFIG[key];
      const categoryGrid = categoryGrids.get(cfg.category);
      if (!categoryGrid) {
        throw new Error(`A melhoria "${key}" não tem uma categoria visual válida.`);
      }
      const currentLevel = this.state.upgrades[key] || 0;
      const isMax = currentLevel >= cfg.maxLevel;

      // Calcular custo do próximo nível
      let cost = 0;
      if (!isMax) {
        if (cfg.type === 'single' || cfg.type === 'special') {
          cost = cfg.cost;
        } else {
          cost = cfg.getCost(currentLevel);
        }
      }

      const canAfford = !isMax && this.state.coins >= cost;
      const requiredLevel = this.state.getUpgradeRequiredLevel(key, currentLevel);
      const isLevelLocked = requiredLevel && this.state.level < requiredLevel;

      const card = document.createElement('div');
      card.className = 'upgrade-card';

      let buttonHtml = '';
      if (isMax) {
        buttonHtml = `<button type="button" class="btn-primary btn-buy-upgrade" disabled>Nível Máximo</button>`;
      } else if (isLevelLocked) {
        buttonHtml = `<button type="button" class="btn-primary btn-buy-upgrade" disabled><span class="icon-inline">${getIcon('lock')}</span> Requer Nível ${requiredLevel}</button>`;
      } else {
        buttonHtml = `<button type="button" class="btn-primary btn-buy-upgrade" data-id="${key}" ${!canAfford ? 'disabled' : ''}>Adquirir</button>`;
      }

      const iconSvg = getIcon(cfg.iconKey || key, getIcon('upgrade'));
      const currentEffect = cfg.effectDesc
        ? cfg.effectDesc(currentLevel, this.state.level)
        : '';
      const activeCount = key === 'harvester' && this.state.isEmployeeActive('harvester')
        ? currentLevel
        : 0;
      const nextEffect = !isMax && cfg.nextEffectDesc
        ? cfg.nextEffectDesc(currentLevel, this.state.level)
        : '';

      card.innerHTML = `
        <div>
          <div class="upgrade-head">
            <div class="upgrade-icon">${iconSvg}</div>
            <div class="upgrade-title-area">
              <h3>${cfg.name}</h3>
              <div class="upgrade-level-tag">
                ${cfg.type === 'single' ? (currentLevel > 0 ? 'Instalado' : 'Disponível') : `Nível ${currentLevel} de ${cfg.maxLevel}`}
              </div>
            </div>
          </div>
          <p class="upgrade-desc" style="margin-top: 8px;">${cfg.description}</p>
          <p class="upgrade-desc" style="margin-top: 4px; font-weight: 700; color: #2F5D4A;">
            ${currentEffect}
          </p>
          ${nextEffect ? `<p class="upgrade-next-effect">${nextEffect}</p>` : ''}
        </div>

        <div class="upgrade-footer">
          <div class="upgrade-cost">
            ${isMax ? '<span>—</span>' : `<span class="icon-inline">${getIcon('coin')}</span> <span>${formatNumber(cost)}</span>`}
            ${!isMax && isLevelLocked ? `<span class="upgrade-shortfall">Requer nível ${requiredLevel}</span>` : ''}
            ${!isMax && !isLevelLocked && !canAfford ? `<span class="upgrade-shortfall">Faltam ${formatNumber(cost - this.state.coins)} moedas</span>` : ''}
          </div>
          ${buttonHtml}
        </div>
      `;
      if (key === 'cashier' && currentLevel > 0) {
        const status = this.state.isEmployeeActive('cashier') ? 'Contrato ativo' : 'Contrato suspenso';
        card.querySelector('.upgrade-level-tag').textContent = `${status} · Nível ${currentLevel} de ${cfg.maxLevel}`;
      } else if (key === 'harvester' && currentLevel > 0) {
        card.querySelector('.upgrade-level-tag').textContent = `${activeCount} / ${currentLevel} ajudantes ativos`;
      }
      const effectEl = card.querySelector('.upgrade-desc[style*="font-weight: 700"]');
      if (effectEl && key === 'cashier' && currentLevel > 0) {
        effectEl.textContent = this.state.isEmployeeActive('cashier')
          ? `Automação ativa · ${this.formatCoins(this.state.getEmployeeDailyWage('cashier'))}/dia`
          : 'Automação suspensa · retoma o contrato no painel da equipa';
      } else if (effectEl && key === 'harvester' && currentLevel > 0) {
        effectEl.textContent = `${activeCount} de ${currentLevel} ajudantes a trabalhar · ${this.formatCoins(this.state.getEmployeeDailyWage('harvester'))}/dia`;
      }

      // Event listener de compra
      const buyBtn = card.querySelector(`button[data-id="${key}"]`);
      if (buyBtn && !buyBtn.disabled) {
        buyBtn.addEventListener('click', () => {
          if (this.state.buyUpgrade(key)) {
            this.sound.playUpgrade();
            this.hud.showToast(`Melhoria instalada: ${cfg.name}`, 'check');
            this.render();
          }
        });
      }

      categoryGrid.appendChild(card);
    }
  }

  formatCoins(amount) {
    return `${formatNumber(Math.abs(amount))} moedas`;
  }

  renderFinanceSummary() {
    const earned = Math.max(0, Number(this.state.stats.totalCoinsEarned) || 0);
    const spent = Math.max(0, Number(this.state.stats.totalCoinsSpent) || 0);
    const net = earned - spent;
    const setAmount = (element, amount, signed = false) => {
      if (!element) return;
      const prefix = signed && amount > 0 ? '+' : amount < 0 ? '−' : '';
      element.textContent = `${prefix}${this.formatCoins(amount)}`;
      element.classList.toggle('is-positive', amount > 0);
      element.classList.toggle('is-negative', amount < 0);
    };

    setAmount(this.finance.income, earned);
    setAmount(this.finance.expenses, spent);
    setAmount(this.finance.net, net, true);
    setAmount(this.finance.balance, this.state.coins);
  }

  renderGoals() {
    if (!this.goalsContainer) return;
    this.goalsContainer.replaceChildren();

    const storedFlowers = Object.values(this.state.stock)
      .reduce((total, amount) => total + Math.max(0, Number(amount) || 0), 0);
    const basketFlowers = this.state.basket.length;
    const availableFlowers = storedFlowers + basketFlowers;
    const flowerTarget = 3;
    this.addGoal({
      title: storedFlowers >= flowerTarget
        ? 'Loja abastecida'
        : availableFlowers >= flowerTarget
          ? 'Leva flores ao balcão'
          : 'Abastece a loja',
      description: storedFlowers >= flowerTarget
        ? `${storedFlowers} flores estão em stock para venda.`
        : `${storedFlowers} em stock + ${basketFlowers} no cesto. Leva flores ao balcão até chegar a ${flowerTarget}.`,
      progress: Math.min(100, availableFlowers / flowerTarget * 100),
      complete: storedFlowers >= flowerTarget
    });

    const contractGoal = this.getNextContractGoal();
    if (contractGoal) this.addGoal(contractGoal);

    const orderCount = this.state.orders.length;
    if (orderCount > 0) {
      const completedOrders = this.state.orders.filter((order) => order.isCompleted).length;
      this.addGoal({
        title: `Florada ${this.state.orderCycle || 1}`,
        description: `Conclui as encomendas especiais (${completedOrders}/${orderCount}) para receber uma nova florada.`,
        progress: completedOrders / orderCount * 100,
        complete: false
      });
    }

    const nextPlot = this.state.plots.find((plot) => !plot.unlocked && !plot.optional);
    if (nextPlot) {
      const requiredLevel = FLOWERS_CONFIG[nextPlot.flowerId]?.requiredLevel || 1;
      if (this.state.level < requiredLevel) {
        this.addGoal({
          title: `Atinge o nível ${requiredLevel}`,
          description: `Desbloqueia o terreno de ${this.getFlowerName(nextPlot.flowerId)}.`,
          progress: Math.min(100, this.state.level / requiredLevel * 100),
          complete: false
        });
      } else {
        const affordable = this.state.coins >= nextPlot.cost;
        this.addGoal({
          title: affordable ? 'Expande o jardim' : 'Poupa para um terreno',
          description: affordable
            ? `Já podes comprar o terreno de ${this.getFlowerName(nextPlot.flowerId)} por ${this.formatCoins(nextPlot.cost)}.`
            : `Faltam ${this.formatCoins(nextPlot.cost - this.state.coins)} para o terreno de ${this.getFlowerName(nextPlot.flowerId)}.`,
          progress: nextPlot.cost > 0 ? Math.min(100, this.state.coins / nextPlot.cost * 100) : 100,
          complete: affordable
        });
      }
    } else {
      const hasOptionalPlots = Object.keys(FLOWERS_CONFIG)
        .some((flowerId) => this.state.getOwnedPlotCount(flowerId) >= 2);
      this.addGoal(hasOptionalPlots
        ? {
            title: 'Visita a Loja',
            description: 'Há terrenos extra opcionais disponíveis para compra.',
            progress: 100,
            complete: true
          }
        : {
            title: 'Jardim em expansão',
            description: 'Continua a jogar para revelar o próximo terreno.',
            progress: 100,
            complete: true
          });
    }

    const requiredRep = this.state.getReputationForNextLevel();
    const repProgress = Math.min(100, this.state.reputation / requiredRep * 100);
    const remainingRep = Math.max(0, requiredRep - this.state.reputation);
    this.addGoal({
      title: `Progride para o nível ${this.state.level + 1}`,
      description: remainingRep > 0
        ? `Ganha mais ${formatNumber(remainingRep)} XP com vendas e ramos.`
        : 'A reputação necessária foi alcançada.',
      progress: repProgress,
      complete: remainingRep === 0
    });

    const expansionLevel = this.state.upgrades.shopExpansion || 0;
    if (expansionLevel < UPGRADES_CONFIG.shopExpansion.maxLevel) {
      const requiredExpansionLevel = this.state.getUpgradeRequiredLevel('shopExpansion', expansionLevel);
      const expansionCost = UPGRADES_CONFIG.shopExpansion.getCost(expansionLevel);
      const unlocked = this.state.level >= requiredExpansionLevel;
      this.addGoal({
        title: unlocked ? 'Amplia a floricultura' : `Atinge o nível ${requiredExpansionLevel}`,
        description: unlocked
          ? `Aumenta em 20 unidades o limite de cada flor. Custo: ${this.formatCoins(expansionCost)}.`
          : `Desbloqueia uma expansão de loja ao atingir o nível ${requiredExpansionLevel}.`,
        progress: unlocked ? Math.min(100, this.state.coins / expansionCost * 100) : Math.min(100, this.state.level / requiredExpansionLevel * 100),
        complete: false
      });
    }
  }

  renderChallenges() {
    if (!this.challengesContainer) return;
    this.challengesContainer.replaceChildren();
    const challenges = this.state.getChallenges();
    this.renderLongTermProjects();
    this.renderZoneActivities();
    const periods = [
      { type: 'daily', title: 'Desafios diários', reset: 'Renovam todos os dias.' },
      { type: 'weekly', title: 'Desafios semanais', reset: 'Renovam à segunda-feira.' }
    ];

    for (const period of periods) {
      const section = document.createElement('section');
      section.className = 'challenge-period';
      const heading = document.createElement('div');
      heading.className = 'challenge-period-heading';
      const title = document.createElement('h4');
      title.textContent = period.title;
      const reset = document.createElement('span');
      reset.textContent = `${period.reset} Recompensas concluídas ficam disponíveis até 24 horas após a renovação.`;
      heading.append(title, reset);
      const cards = document.createElement('div');
      cards.className = 'challenge-card-list';

      for (const challenge of challenges[period.type]) {
        const card = document.createElement('article');
        card.className = `challenge-card${challenge.complete ? ' is-complete' : ''}${challenge.claimed ? ' is-claimed' : ''}${challenge.claimUntil ? ' has-grace-period' : ''}`;
        const title = document.createElement('h5');
        title.textContent = challenge.title;
        const cardHeading = document.createElement('div');
        cardHeading.className = 'challenge-card-heading';
        cardHeading.append(
          title,
          this.hud.createFavoriteButton('challenge', challenge.id)
        );
        const description = document.createElement('p');
        description.textContent = challenge.claimUntil
          ? `${challenge.progressText} Prazo extra para reclamar até ${new Date(challenge.claimUntil).toLocaleString()}.`
          : challenge.progressText;
        const progressLabel = document.createElement('span');
        progressLabel.className = 'challenge-progress-label';
        progressLabel.textContent = `${formatNumber(challenge.progress)} / ${formatNumber(challenge.target)}`;
        const progress = document.createElement('div');
        progress.className = 'challenge-progress-track';
        progress.setAttribute('role', 'progressbar');
        progress.setAttribute('aria-valuemin', '0');
        progress.setAttribute('aria-valuemax', String(challenge.target));
        progress.setAttribute('aria-valuenow', String(challenge.progress));
        progress.setAttribute('aria-label', `${challenge.title}: ${progressLabel.textContent}`);
        const fill = document.createElement('span');
        fill.style.width = `${challenge.progress / challenge.target * 100}%`;
        progress.appendChild(fill);
        const footer = document.createElement('div');
        footer.className = 'challenge-card-footer';
        const reward = document.createElement('span');
        reward.className = 'challenge-reward';
        reward.textContent = `Recompensa: ${formatNumber(challenge.rewardCoins)} moedas · ${formatNumber(challenge.rewardRep)} XP`;
        const claim = document.createElement('button');
        claim.type = 'button';
        claim.className = 'btn-secondary challenge-claim-button';
        claim.dataset.challengeId = challenge.id;
        claim.textContent = challenge.claimed
          ? 'Reclamada'
          : challenge.complete
            ? challenge.claimUntil ? 'Reclamar (prazo extra)' : 'Reclamar'
            : 'Em progresso';
        claim.disabled = !challenge.complete || challenge.claimed;
        claim.addEventListener('click', () => {
          const claimed = this.state.claimChallenge(challenge.id);
          if (!claimed) {
            this.hud.showToast('Não foi possível reclamar esta recompensa.', 'lock');
            return;
          }
          this.sound.playUpgrade();
          this.hud.showToast(`Recompensa reclamada: +${formatNumber(claimed.rewardCoins)} moedas e +${formatNumber(claimed.rewardRep)} XP.`, 'check');
          this.render();
        });
        footer.append(reward, claim);
        card.append(cardHeading, description, progressLabel, progress, footer);
        cards.appendChild(card);
      }

      section.append(heading, cards);
      this.challengesContainer.appendChild(section);
    }
  }

  renderLongTermProjects() {
    if (!this.projectsContainer) return;
    this.projectsContainer.replaceChildren();

    for (const project of this.state.getLongTermProjects()) {
      const card = document.createElement('article');
      card.className = `long-term-project${project.unlocked ? ' is-unlocked' : project.complete ? ' is-complete' : ''}`;
      const heading = document.createElement('div');
      heading.className = 'long-term-project-heading';
      const title = document.createElement('h4');
      title.textContent = project.zone.name;
      const status = document.createElement('span');
      status.textContent = project.unlocked ? 'Zona desbloqueada' : project.complete ? 'Projeto concluído' : 'Projeto em curso';
      heading.append(
        title,
        status,
        this.hud.createFavoriteButton('project', project.id)
      );

      const description = document.createElement('p');
      description.textContent = project.description;
      const requirements = document.createElement('ul');
      requirements.className = 'long-term-project-requirements';
      for (const requirement of project.progress) {
        const item = document.createElement('li');
        const done = requirement.current >= requirement.target;
        item.className = done ? 'is-complete' : '';
        item.textContent = `${done ? 'Concluído' : 'Em progresso'} · ${requirement.label}: ${formatNumber(requirement.current)}/${formatNumber(requirement.target)}`;
        requirements.appendChild(item);
      }

      const unlock = document.createElement('p');
      unlock.className = 'long-term-project-unlock';
      unlock.textContent = `Desbloqueio da zona: nível ${project.unlock.level}, catálogo de ${project.unlock.flowerSpecies} espécies${project.unlock.greenhouse ? ' e Estufa das Brisas restaurada' : ''}.`;
      card.append(heading, description, requirements, unlock);

      if (project.unlocked && project.zone.id === 'greenhouse') {
        const visit = document.createElement('button');
        visit.type = 'button';
        visit.className = 'btn-primary long-term-project-visit';
        visit.textContent = `Visitar ${project.zone.name}`;
        visit.addEventListener('click', () => {
          if (typeof this.onTravelToZone !== 'function') {
            throw new Error('A viagem às zonas ainda não foi ligada ao mapa do jogo.');
          }
          this.onTravelToZone(project.zone.id);
          this.closeChallenges();
        });
        card.appendChild(visit);
      }

      this.projectsContainer.appendChild(card);
    }
  }

  renderZoneActivities() {
    const container = document.getElementById('zone-activities-list');
    if (!container) return;
    container.replaceChildren();
    const projects = this.state.getLongTermProjects();
    for (const zone of this.state.getZoneActivities()) {
      const project = projects.find((entry) => entry.zone.id === zone.id);
      const card = document.createElement('article');
      card.className = `zone-activity-card${project?.unlocked ? ' is-unlocked' : ''}${zone.complete ? ' is-complete' : ''}`;
      const title = document.createElement('h4');
      title.textContent = zone.name;
      const progress = document.createElement('p');
      progress.textContent = project?.unlocked
        ? `${zone.findings.filter((finding) => finding.found).length}/${zone.findings.length} recordações encontradas`
        : 'Desbloqueia o projeto desta zona para explorar.';
      const list = document.createElement('ul');
      for (const finding of zone.findings) {
        const item = document.createElement('li');
        item.className = finding.found ? 'is-found' : '';
        item.textContent = project?.unlocked
          ? `${finding.found ? 'Encontrada' : 'Por encontrar'} · ${finding.found ? finding.name : 'Recordação escondida'}`
          : 'Recordação escondida';
        list.appendChild(item);
      }
      card.append(title, progress, list);
      container.appendChild(card);
    }
  }

    getNextContractGoal() {
      for (const role of ['cashier', 'harvester', 'bouquetAssistant']) {
        const cfg = UPGRADES_CONFIG[role];
        const owned = this.state.hasEmployee(role);
        const active = this.state.isEmployeeActive(role);
        const requiredLevel = cfg.requiredLevel || 1;
        const wage = role === 'harvester' ? cfg.dailyWage * (this.state.upgrades.harvester || 1) : cfg.dailyWage;
        const name = {
          cashier: 'caixa automático',
          harvester: 'ajudantes de colheita',
          bouquetAssistant: 'florista de ramos'
        }[role];

        if (!owned) {
          if (this.state.level < requiredLevel) continue;
          const cost = cfg.type === 'single'
            ? cfg.cost
            : cfg.getCost(this.state.upgrades[role] || 0);
          return {
            title: this.state.coins >= cost ? `Contrata ${name}` : `Poupa para ${name}`,
            description: this.state.coins >= cost
              ? `A melhoria custa ${this.formatCoins(cost)}; depois, reserva ${this.formatCoins(wage)} por dia de jogo.`
              : `Faltam ${this.formatCoins(cost - this.state.coins)} para contratar. Salário: ${this.formatCoins(wage)} por dia.`,
            progress: Math.min(100, this.state.coins / cost * 100),
            complete: this.state.coins >= cost
          };
        }

        if (!active) {
          return {
            title: this.state.coins >= wage ? `Retoma ${name}` : `Poupa para reativar ${name}`,
            description: this.state.coins >= wage
              ? `Paga ${this.formatCoins(wage)} agora para reativar; volta a pagar a cada 6 minutos.`
              : `Faltam ${this.formatCoins(wage - this.state.coins)} para o primeiro dia de trabalho.`,
            progress: Math.min(100, this.state.coins / wage * 100),
            complete: this.state.coins >= wage
          };
        }
      }
      return null;
    }

    renderEmployment() {
      if (!this.employmentContainer) return;
      this.employmentContainer.replaceChildren();
      const dailyTotal = this.state.getDailyPayroll();
      if (this.employmentTotalWage) {
        this.employmentTotalWage.textContent = `${this.formatCoins(dailyTotal)}/dia`;
      }

      const remainingMs = this.state.getNextPayrollAt()
        ? Math.max(0, this.state.getNextPayrollAt() - Date.now())
        : null;
      const remainingText = remainingMs === null
        ? 'Sem pagamento agendado'
        : `Próximo salário em ${Math.floor(remainingMs / 60000)}:${String(Math.floor(remainingMs / 1000) % 60).padStart(2, '0')}`;

      for (const role of ['cashier', 'harvester', 'bouquetAssistant']) {
        const cfg = UPGRADES_CONFIG[role];
        const owned = this.state.hasEmployee(role);
        const active = this.state.isEmployeeActive(role);
        const requiredLevel = cfg.requiredLevel || 1;
        const workerCount = role === 'harvester'
          ? Math.max(1, this.state.upgrades.harvester || 0)
          : 1;
        const wage = cfg.dailyWage * workerCount;
        const title = {
          cashier: 'Caixa automático',
          harvester: 'Ajudantes de colheita',
          bouquetAssistant: 'Florista de ramos'
        }[role];
        const description = role === 'cashier'
          ? 'Atende clientes automaticamente quando existe stock.'
          : role === 'bouquetAssistant'
            ? 'Compõe e vende ramos automaticamente sem consumir as reservas mínimas por flor.'
            : owned
            ? `${workerCount} ajudante(s) colhem flores maduras e levam-nas ao stock. Com contrato ativo e nível 5, também preparam pedidos de ramos no balcão.`
            : 'Os ajudantes colhem flores maduras e levam-nas ao stock. Com contrato ativo e nível 5, também preparam pedidos de ramos no balcão.';
        const card = document.createElement('article');
        card.className = `employment-contract${active ? ' is-active' : ''}`;

        const heading = document.createElement('h4');
        heading.textContent = title;
        const detail = document.createElement('p');
        const contractState = owned
          ? active ? `Ativo · ${remainingText}` : 'Suspenso · automação parada'
          : this.state.level < requiredLevel ? `Disponível no nível ${requiredLevel}` : 'Ainda não contratado';
        detail.textContent = `${description} ${contractState}. Salário: ${this.formatCoins(wage)} por dia.`;
        card.append(heading, detail);

        if (owned) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'btn-primary';
          if (active) {
            button.textContent = 'Suspender contrato';
            button.addEventListener('click', () => this.state.setEmployeeActive(role, false));
          } else {
            const affordable = this.state.coins >= wage;
            button.textContent = affordable ? `Retomar · ${this.formatCoins(wage)}` : `Faltam ${this.formatCoins(wage - this.state.coins)}`;
            button.disabled = !affordable;
            button.addEventListener('click', () => this.state.setEmployeeActive(role, true));
          }
          card.appendChild(button);
        } else {
          const hint = document.createElement('p');
          hint.textContent = this.state.level < requiredLevel
            ? `Requer nível ${requiredLevel}; compra a melhoria quando desbloqueada.`
            : 'Contrata através da melhoria correspondente abaixo.';
          card.appendChild(hint);
        }
        this.employmentContainer.appendChild(card);
      }
    }

  renderStockMinimumSkills() {
    if (!this.stockSkillsContainer) return;
    this.stockSkillsContainer.replaceChildren();
    for (const flowerId of FLOWER_ORDER) {
      const flower = FLOWERS_CONFIG[flowerId];
      const purchased = this.state.stockMinimumSkills[flowerId] === true;
      const unlocked = this.state.unlockedFlowers[flowerId] === true;
      const card = document.createElement('article');
      card.className = 'employment-contract';
      const heading = document.createElement('h4');
      heading.textContent = `Stock mínimo · ${flower.name}`;
      const detail = document.createElement('p');
      detail.textContent = purchased
        ? `Os ajudantes dão prioridade a manter ${flower.stockMinimum} unidades; clientes e ramos não consomem esta reserva.`
        : `Define uma reserva mínima de ${flower.stockMinimum} unidades para ${flower.name}.`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn-primary';
      if (purchased) {
        button.textContent = 'Habilidade adquirida';
        button.disabled = true;
      } else if (!unlocked) {
        button.textContent = `Requer desbloquear ${flower.name}`;
        button.disabled = true;
      } else {
        button.textContent = `Comprar · ${this.formatCoins(flower.stockSkillCost)}`;
        button.disabled = this.state.coins < flower.stockSkillCost;
        button.addEventListener('click', () => {
          if (!this.state.buyStockMinimumSkill(flowerId)) return;
          this.sound.playUpgrade();
          this.hud.showToast(`Reserva mínima de ${flower.name} ativada`, 'check');
          this.render();
        });
      }
      card.append(heading, detail, button);
      this.stockSkillsContainer.appendChild(card);
    }
  }

  renderBouquetSpecializations() {
    if (!this.bouquetSpecializationsContainer) return;
    this.bouquetSpecializationsContainer.replaceChildren();
    for (const category of BOUQUET_CATEGORIES) {
      const purchased = this.state.bouquetSpecializations[category.id] === true;
      const assistantHired = this.state.hasEmployee('bouquetAssistant');
      const levelAvailable = this.state.level >= category.requiredLevel;
      const card = document.createElement('article');
      card.className = 'employment-contract';
      const heading = document.createElement('h4');
      heading.textContent = `Especialização · ${category.label}`;
      const detail = document.createElement('p');
      detail.textContent = `Dá prioridade a ramos desta categoria e aumenta o seu valor em ${Math.round(category.bonus * 100)}%.`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn-primary';
      if (purchased) {
        button.textContent = 'Especialização adquirida';
        button.disabled = true;
      } else if (!assistantHired) {
        button.textContent = 'Requer contratar o florista de ramos';
        button.disabled = true;
      } else if (!levelAvailable) {
        button.textContent = `Requer nível ${category.requiredLevel}`;
        button.disabled = true;
      } else {
        button.textContent = `Comprar · ${this.formatCoins(category.specializationCost)}`;
        button.disabled = this.state.coins < category.specializationCost;
        button.addEventListener('click', () => {
          if (!this.state.buyBouquetSpecialization(category.id)) return;
          this.sound.playUpgrade();
          this.hud.showToast(`Especialização adquirida: ${category.label}`, 'check');
          this.render();
        });
      }
      card.append(heading, detail, button);
      this.bouquetSpecializationsContainer.appendChild(card);
    }
  }

  addGoal({ title, description, progress, complete }) {
    const card = document.createElement('article');
    card.className = `shop-goal${complete ? ' is-complete' : ''}`;

    const heading = document.createElement('h4');
    heading.textContent = title;
    const detail = document.createElement('p');
    detail.textContent = description;
    const bar = document.createElement('div');
    bar.className = 'goal-progress-track';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-valuenow', String(Math.round(progress)));
    bar.setAttribute('aria-label', title);
    const fill = document.createElement('span');
    fill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    bar.appendChild(fill);
    card.append(heading, detail, bar);
    this.goalsContainer.appendChild(card);
  }

  getFlowerName(flowerId) {
    return {
      daisy: 'Margaridas',
      tulip: 'Tulipas',
      sunflower: 'Girassóis',
      rose: 'Rosas',
      orchid: 'Orquídeas',
      lavender: 'Lavandas',
      peony: 'Peónias'
    }[flowerId] || FLOWERS_CONFIG[flowerId]?.name || 'flores';
  }
}
