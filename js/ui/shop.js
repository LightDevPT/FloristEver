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

const UPGRADE_TINTS = ['#2F5D4A', '#B24A6C', '#2F6F8F', '#946414', '#6E4F80'];

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
    if (document.body.classList.contains('subsolo-mode')) return;
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
    if (document.body.classList.contains('subsolo-mode')) return;
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

    const byCategory = new Map(UPGRADE_CATEGORIES.map(category => [category.id, []]));
    const views = [];
    for (const key of Object.keys(UPGRADES_CONFIG)) {
      const view = this.getUpgradeView(key);
      const bucket = byCategory.get(view.cfg.category);
      if (!bucket) {
        throw new Error(`A melhoria "${key}" não tem uma categoria visual válida.`);
      }
      bucket.push(view);
      views.push(view);
    }

    const total = views.length;
    const done = views.filter(view => view.status === 'max').length;
    const ready = views.filter(view => view.status === 'ready').length;
    const donePct = total ? Math.round((done / total) * 100) : 0;
    const panel = document.createElement('div');
    panel.className = 'up-panel';

    const sections = [];
    const chips = [];

    UPGRADE_CATEGORIES.forEach((category, index) => {
      const items = byCategory.get(category.id);
      if (!items.length) return;

      const tint = UPGRADE_TINTS[index % UPGRADE_TINTS.length];
      const doneInCategory = items.filter(view => view.status === 'max').length;
      const section = document.createElement('section');
      section.className = 'up-category upgrade-category';
      section.id = `up-cat-${category.id}`;
      section.dataset.category = category.id;
      section.style.setProperty('--tint', tint);
      section.setAttribute('aria-labelledby', `upgrade-category-${category.id}`);
      section.innerHTML = `
        <div class="up-category-head">
          <div class="up-category-icon" aria-hidden="true">${getIcon(category.icon, getIcon('upgrade'))}</div>
          <div class="up-category-text">
            <h3 id="upgrade-category-${category.id}">${category.title}</h3>
            <p>${category.description}</p>
          </div>
          <div class="up-category-count" aria-label="${doneInCategory} de ${items.length} concluídas">
            <strong>${doneInCategory}</strong><span>/ ${items.length}</span>
          </div>
        </div>
        <div class="up-grid"></div>
      `;

      const grid = section.querySelector('.up-grid');
      for (const view of items) {
        grid.appendChild(this.createUpgradeCard(view));
      }
      sections.push(section);

      chips.push(`
        <button type="button" class="up-chip" data-target="up-cat-${category.id}" style="--tint:${tint}">
          <span class="up-chip-dot" aria-hidden="true"></span>
          <span class="up-chip-label">${category.title}</span>
          <span class="up-chip-count">${doneInCategory}/${items.length}</span>
        </button>
      `);
    });

    panel.innerHTML = `
      <div class="up-overview">
        <div class="up-overview-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}" aria-label="Melhorias concluídas">
          <span style="width:${donePct}%"></span>
        </div>
        <ul class="up-stats">
          <li class="up-stat"><strong>${done}/${total}</strong><span>concluídas</span></li>
          <li class="up-stat${ready ? ' is-hot' : ''}"><strong>${ready}</strong><span>${ready === 1 ? 'pronta a comprar' : 'prontas a comprar'}</span></li>
        </ul>
      </div>
      <nav class="up-nav" aria-label="Categorias de melhorias">${chips.join('')}</nav>
    `;
    sections.forEach(section => panel.appendChild(section));

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    panel.querySelector('.up-nav').addEventListener('click', event => {
      const chip = event.target.closest('.up-chip');
      if (!chip) return;
      const target = panel.querySelector(`#${chip.dataset.target}`);
      if (target) {
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
    });

    this.listContainer.appendChild(panel);
  }

  getUpgradeView(key) {
    const cfg = UPGRADES_CONFIG[key];
    const level = this.state.upgrades[key] || 0;
    const isMax = level >= cfg.maxLevel;

    let cost = 0;
    if (!isMax) {
      cost = cfg.type === 'single' || cfg.type === 'special'
        ? cfg.cost
        : cfg.getCost(level);
    }

    const requiredLevel = this.state.getUpgradeRequiredLevel(key, level);
    const isLocked = !isMax && !!requiredLevel && this.state.level < requiredLevel;
    const canAfford = !isMax && this.state.coins >= cost;

    let status = 'saving';
    if (isMax) status = 'max';
    else if (isLocked) status = 'locked';
    else if (canAfford) status = 'ready';

    const isEmployeeKey = key === 'cashier' || key === 'harvester';
    const employeeActive = isEmployeeKey && this.state.isEmployeeActive(key);
    const activeCount = key === 'harvester' && employeeActive ? level : 0;

    let levelLabel = cfg.type === 'single'
      ? (level > 0 ? 'Instalado' : 'Disponível')
      : `Nível ${level} de ${cfg.maxLevel}`;

    let effect = cfg.effectDesc ? cfg.effectDesc(level, this.state.level) : '';
    const nextEffect = !isMax && cfg.nextEffectDesc
      ? cfg.nextEffectDesc(level, this.state.level)
      : '';

    if (key === 'cashier' && level > 0) {
      levelLabel = `${employeeActive ? 'Contrato ativo' : 'Contrato suspenso'} · Nível ${level} de ${cfg.maxLevel}`;
      effect = employeeActive
        ? `Automação ativa · ${this.formatCoins(this.state.getEmployeeDailyWage('cashier'))}/dia`
        : 'Automação suspensa · retoma o contrato no painel da equipa';
    } else if (key === 'harvester' && level > 0) {
      levelLabel = `${activeCount} / ${level} ajudantes ativos`;
      effect = `${activeCount} de ${level} ajudantes a trabalhar · ${this.formatCoins(this.state.getEmployeeDailyWage('harvester'))}/dia`;
    }

    return {
      key, cfg, level, isMax, cost, requiredLevel, isLocked, canAfford,
      status, levelLabel, effect, nextEffect,
    };
  }

  createUpgradeCard(view) {
    const { key, cfg, level, isMax, cost, requiredLevel, status, levelLabel, effect, nextEffect } = view;
    const card = document.createElement('article');
    card.className = `up-card is-${status}`;
    card.dataset.upgrade = key;

    const icon = getIcon(cfg.iconKey || key, getIcon('upgrade'));
    const showProgress = cfg.type !== 'single';
    const progressPct = Math.min(100, Math.round((level / cfg.maxLevel) * 100));
    const badges = {
      max: `<span class="up-badge is-max"><span class="icon-inline">${getIcon('check')}</span>Máximo</span>`,
      locked: `<span class="up-badge is-locked"><span class="icon-inline">${getIcon('lock')}</span>Nível ${requiredLevel}</span>`,
      ready: '<span class="up-badge is-ready">Pronta</span>',
      saving: '',
    };

    let costHtml;
    if (isMax) {
      costHtml = '<div class="up-cost is-done">Melhoria concluída</div>';
    } else if (status === 'locked') {
      costHtml = `
        <div class="up-cost">
          <span class="up-cost-value"><span class="icon-inline">${getIcon('coin')}</span>${formatNumber(cost)}</span>
          <span class="up-note">Desbloqueia no nível ${requiredLevel}</span>
        </div>`;
    } else if (status === 'saving') {
      const missing = cost - this.state.coins;
      const savedPct = Math.max(0, Math.min(100, Math.round((this.state.coins / cost) * 100)));
      costHtml = `
        <div class="up-cost">
          <span class="up-cost-value"><span class="icon-inline">${getIcon('coin')}</span>${formatNumber(cost)}</span>
          <span class="up-save" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${savedPct}" aria-label="Moedas já juntas"><span style="width:${savedPct}%"></span></span>
          <span class="up-note">Faltam ${formatNumber(missing)} moedas</span>
        </div>`;
    } else {
      costHtml = `
        <div class="up-cost">
          <span class="up-cost-value"><span class="icon-inline">${getIcon('coin')}</span>${formatNumber(cost)}</span>
        </div>`;
    }

    let buttonHtml;
    if (isMax) {
      buttonHtml = '<button type="button" class="btn-primary btn-buy-upgrade up-buy" disabled>Nível Máximo</button>';
    } else if (status === 'locked') {
      buttonHtml = `<button type="button" class="btn-primary btn-buy-upgrade up-buy" disabled><span class="icon-inline">${getIcon('lock')}</span> Requer Nível ${requiredLevel}</button>`;
    } else {
      buttonHtml = `<button type="button" class="btn-primary btn-buy-upgrade up-buy" data-id="${key}" ${status === 'ready' ? '' : 'disabled'}>Adquirir</button>`;
    }

    card.innerHTML = `
      <header class="up-card-head">
        <div class="up-icon" aria-hidden="true">${icon}</div>
        <div class="up-titles">
          <h4 class="up-name">${cfg.name}</h4>
          <p class="up-level">${levelLabel}</p>
        </div>
        ${badges[status]}
      </header>

      <p class="up-desc">${cfg.description}</p>

      ${showProgress ? `
        <div class="up-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${cfg.maxLevel}" aria-valuenow="${level}" aria-label="Nível de ${cfg.name}">
          <span style="width:${progressPct}%"></span>
        </div>` : ''}

      ${(effect || nextEffect) ? `
        <dl class="up-effects">
          ${effect ? `<div class="up-effect is-now"><dt>Agora</dt><dd>${effect}</dd></div>` : ''}
          ${nextEffect ? `<div class="up-effect is-next"><dt>Próximo nível</dt><dd>${nextEffect}</dd></div>` : ''}
        </dl>` : ''}

      <footer class="up-foot">
        ${costHtml}
        ${buttonHtml}
      </footer>
    `;

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

    return card;
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

    const el = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const icon = (name) => getIcon(name, '');

    const periods = [
      { type: 'daily', title: 'Desafios diários', short: 'Diárias', reset: 'Renovam todos os dias.' },
      { type: 'weekly', title: 'Desafios semanais', short: 'Semanais', reset: 'Renovam à segunda-feira.' }
    ];

    const summary = {};
    const claimable = [];
    for (const period of periods) {
      const list = challenges[period.type] || [];
      summary[period.type] = {
        total: list.length,
        done: list.filter((challenge) => challenge.complete).length
      };
      for (const challenge of list) {
        if (challenge.complete && !challenge.claimed) claimable.push(challenge);
      }
    }

    const overview = el('div', 'challenge-overview');
    const stats = el('div', 'challenge-overview-stats');
    const makeStat = (label, value, modifier) => {
      const stat = el('div', `challenge-stat${modifier ? ` ${modifier}` : ''}`);
      stat.append(el('strong', '', value), el('span', '', label));
      return stat;
    };
    stats.append(
      makeStat('Para reclamar', String(claimable.length), claimable.length ? 'is-hot' : ''),
      makeStat(periods[0].short, `${summary.daily.done}/${summary.daily.total}`),
      makeStat(periods[1].short, `${summary.weekly.done}/${summary.weekly.total}`)
    );
    overview.appendChild(stats);

    if (claimable.length > 0) {
      const totalCoins = claimable.reduce((sum, challenge) => sum + (challenge.rewardCoins || 0), 0);
      const totalRep = claimable.reduce((sum, challenge) => sum + (challenge.rewardRep || 0), 0);
      const claimAll = el('button', 'btn-primary challenge-claim-all');
      claimAll.type = 'button';
      claimAll.append(
        el('span', 'challenge-claim-all-label', `Reclamar tudo (${claimable.length})`),
        el('span', 'challenge-claim-all-sub', `+${formatNumber(totalCoins)} moedas · +${formatNumber(totalRep)} XP`)
      );
      claimAll.addEventListener('click', () => {
        let coins = 0;
        let rep = 0;
        let count = 0;
        for (const challenge of claimable) {
          const claimed = this.state.claimChallenge(challenge.id);
          if (claimed) {
            coins += claimed.rewardCoins || 0;
            rep += claimed.rewardRep || 0;
            count++;
          }
        }
        if (!count) {
          this.hud.showToast('Não foi possível reclamar as recompensas.', 'lock');
          return;
        }
        this.sound.playUpgrade();
        this.hud.showToast(
          `${count} ${count === 1 ? 'recompensa reclamada' : 'recompensas reclamadas'}: +${formatNumber(coins)} moedas e +${formatNumber(rep)} XP.`,
          'check'
        );
        this.renderChallenges();
      });
      overview.appendChild(claimAll);
    }
    this.challengesContainer.appendChild(overview);

    for (const period of periods) {
      const section = document.createElement('section');
      section.className = 'challenge-period';
      section.dataset.period = period.type;

      const heading = document.createElement('div');
      heading.className = 'challenge-period-heading';
      const titleRow = el('div', 'challenge-period-title');
      titleRow.append(
        el('h4', '', period.title),
        el('span', 'challenge-period-count', `${summary[period.type].done}/${summary[period.type].total}`)
      );
      heading.append(
        titleRow,
        el(
          'span',
          'challenge-period-note',
          `${period.reset} Recompensas concluídas ficam disponíveis até 24 horas após a renovação.`
        )
      );

      const cards = document.createElement('div');
      cards.className = 'challenge-card-list';

      for (const challenge of challenges[period.type] || []) {
        const state = challenge.claimed
          ? 'is-claimed'
          : challenge.complete ? 'is-complete' : 'is-progress';
        const card = document.createElement('article');
        card.className =
          `challenge-card ${state}` +
          `${challenge.claimed ? ' is-complete' : ''}` +
          `${challenge.claimUntil ? ' has-grace-period' : ''}`;

        const pct = challenge.target > 0
          ? Math.max(0, Math.min(100, (challenge.progress / challenge.target) * 100))
          : (challenge.complete ? 100 : 0);
        const titleId = `challenge-title-${challenge.id}`;
        const badge = el('span', 'challenge-badge');
        badge.setAttribute('aria-hidden', 'true');
        if (challenge.complete) badge.innerHTML = icon('check') || '✓';
        else badge.textContent = `${Math.round(pct)}%`;

        const title = el('h5', '', challenge.title);
        title.id = titleId;
        card.setAttribute('aria-labelledby', titleId);

        const cardHeading = el('div', 'challenge-card-heading');
        cardHeading.append(
          badge,
          title,
          this.hud.createFavoriteButton('challenge', challenge.id)
        );
        const description = el('p', 'challenge-card-desc', challenge.progressText);
        const progressLabelText =
          `${formatNumber(challenge.progress)} / ${formatNumber(challenge.target)}`;
        const progressRow = el('div', 'challenge-progress-row');
        progressRow.append(el('span', 'challenge-progress-label', progressLabelText));

        const progress = document.createElement('div');
        progress.className = 'challenge-progress-track';
        progress.setAttribute('role', 'progressbar');
        progress.setAttribute('aria-valuemin', '0');
        progress.setAttribute('aria-valuemax', String(challenge.target));
        progress.setAttribute('aria-valuenow', String(challenge.progress));
        progress.setAttribute('aria-label', `${challenge.title}: ${progressLabelText}`);
        const fill = document.createElement('span');
        fill.style.width = `${pct}%`;
        progress.appendChild(fill);

        const footer = el('div', 'challenge-card-footer');
        const reward = el('div', 'challenge-reward');
        reward.setAttribute(
          'aria-label',
          `Recompensa: ${formatNumber(challenge.rewardCoins)} moedas e ${formatNumber(challenge.rewardRep)} XP`
        );
        const coinChip = el('span', 'challenge-chip is-coins');
        const coinIcon = el('span', 'challenge-chip-icon');
        coinIcon.setAttribute('aria-hidden', 'true');
        coinIcon.innerHTML = icon('coin');
        coinChip.append(coinIcon, el('span', '', formatNumber(challenge.rewardCoins)));
        const xpChip = el('span', 'challenge-chip is-xp');
        xpChip.append(
          el('span', 'challenge-chip-tag', 'XP'),
          el('span', '', formatNumber(challenge.rewardRep))
        );
        reward.append(coinChip, xpChip);

        const ready = challenge.complete && !challenge.claimed;
        const claim = el(
          'button',
          `btn-secondary challenge-claim-button${ready ? ' is-ready' : ''}`
        );
        claim.type = 'button';
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
          this.hud.showToast(
            `Recompensa reclamada: +${formatNumber(claimed.rewardCoins)} moedas e +${formatNumber(claimed.rewardRep)} XP.`,
            'check'
          );
          this.renderChallenges();
        });
        footer.append(reward, claim);

        card.append(cardHeading, description);
        if (challenge.claimUntil) {
          card.appendChild(
            el(
              'p',
              'challenge-grace',
              `Prazo extra para reclamar até ${new Date(challenge.claimUntil).toLocaleString()}.`
            )
          );
        }
        card.append(progressRow, progress, footer);
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
