// ========================================================
// FloristEver - Estado Global do Jogo & Persistência (state.js)
// Autosave a cada 10s e no fecho do separador, cálculo offline
// ========================================================
import { FLOWERS_CONFIG, FLOWER_ORDER, getPlotCost } from './config/flowers.js';
import { UPGRADES_CONFIG } from './config/upgrades.js';
import { BOUQUET_CATEGORIES, calculateBouquetHarmony, SPECIAL_ORDERS, WRAPPERS } from './config/bouquets.js';
import { CUSTOMER_CONFIG } from './config/customers.js';
import { CURRENT_SAVE_SCHEMA_VERSION, migrateSaveData } from './save-migrations.mjs';

const STORAGE_KEY = 'floristever_save_v1';
const BACKUP_STORAGE_KEY = 'floristever_save_backup_v1';
const GAME_DAY_MS = 6 * 60 * 1000;
const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
const CHALLENGE_CLAIM_GRACE_MS = 24 * 60 * 60 * 1000;
const PLOT_WATER_BOOST_MS = 60 * 1000;
const PLOT_WATER_COOLDOWN_MS = 3 * 60 * 1000;
const PLOT_WATER_GROWTH_MULTIPLIER = 1.15;
const FLOWER_MASTERY_MILESTONES = [
  { id: 'first-bloom', title: 'Primeira florada', harvested: 1, sold: 0, usedInBouquets: 0 },
  { id: 'shop-favorite', title: 'Favorita da loja', harvested: 0, sold: 5, usedInBouquets: 0 },
  { id: 'bouquet-muse', title: 'Inspiração de ramos', harvested: 0, sold: 0, usedInBouquets: 3 },
  { id: 'botanical-expert', title: 'Especialista botânica', harvested: 15, sold: 10, usedInBouquets: 8 }
];
const ZONE_ACTIVITY_CONFIG = {
  greenhouse: {
    id: 'greenhouse',
    name: 'Estufa das Brisas',
    findings: [
      { id: 'dew-leaf', name: 'Folha de orvalho', x: -950, y: 420 },
      { id: 'glass-seed', name: 'Semente de vidro', x: -900, y: 350 },
      { id: 'sun-petal', name: 'Pétala solar', x: -840, y: 430 }
    ]
  },
  'night-garden': {
    id: 'night-garden',
    name: 'Jardim do Luar',
    findings: [
      { id: 'moon-dew', name: 'Orvalho lunar', x: 1885, y: 735 },
      { id: 'star-seed', name: 'Semente estelar', x: 2015, y: 655 },
      { id: 'silver-petal', name: 'Pétala prateada', x: 2140, y: 735 }
    ]
  }
};
const VISITOR_IDS = new Set(CUSTOMER_CONFIG.specialVisitors.map((visitor) => visitor.id));
const PLACEABLE_DECORATION_INDICES = new Set([0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13]);
const MIN_OWNED_PLOTS_PER_FLOWER = 2;
const FIELD_PLOT_COLUMNS = 8;
const CHALLENGE_STAT_KEYS = ['totalHarvested', 'customersServed', 'totalCoinsEarned', 'flowersSold'];
const DAILY_CHALLENGE_POOL = [
  { id: 'harvest', title: 'Colheita fresca', metric: 'totalHarvested', target: 8, rewardCoins: 60, rewardRep: 20, progressText: 'Colhe flores no jardim.' },
  { id: 'customers', title: 'Clientes felizes', metric: 'customersServed', target: 4, rewardCoins: 60, rewardRep: 20, progressText: 'Atende clientes na floricultura.' },
  { id: 'earnings', title: 'Um dia próspero', metric: 'totalCoinsEarned', target: 150, rewardCoins: 60, rewardRep: 20, progressText: 'Ganha moedas com vendas.' },
  { id: 'flowers-sold', title: 'Flores a caminho', metric: 'flowersSold', target: 12, rewardCoins: 70, rewardRep: 25, progressText: 'Vende flores aos clientes.' }
];
const WEEKLY_CHALLENGE_POOL = [
  { id: 'harvest', title: 'Semana de abundância', metric: 'totalHarvested', target: 40, rewardCoins: 350, rewardRep: 100, progressText: 'Colhe flores durante a semana.' },
  { id: 'customers', title: 'A florista da vila', metric: 'customersServed', target: 25, rewardCoins: 350, rewardRep: 100, progressText: 'Atende clientes durante a semana.' },
  { id: 'earnings', title: 'Prosperidade floral', metric: 'totalCoinsEarned', target: 1200, rewardCoins: 400, rewardRep: 120, progressText: 'Ganha moedas com as tuas vendas.' },
  { id: 'flowers-sold', title: 'Balcão sempre cheio', metric: 'flowersSold', target: 80, rewardCoins: 400, rewardRep: 120, progressText: 'Vende flores aos clientes durante a semana.' }
];
const LONG_TERM_PROJECTS = [
  {
    id: 'greenhouse',
    title: 'Restaurar a estufa',
    description: 'Reúne recursos e experiência para recuperar a antiga estufa de vidro.',
    requirements: [
      { metric: 'totalHarvested', label: 'Flores colhidas', target: 30 },
      { metric: 'customersServed', label: 'Clientes atendidos', target: 15 },
      { metric: 'totalCoinsEarned', label: 'Moedas ganhas', target: 1000 }
    ],
    unlock: { level: 5, flowerSpecies: 5 },
    zone: { id: 'greenhouse', name: 'Estufa das Brisas', x: -900, y: 400 }
  },
  {
    id: 'night-garden',
    title: 'Preparar o Jardim Noturno',
    description: 'Cria um refúgio lunar com novas espécies e a experiência das tuas floradas.',
    requirements: [
      { metric: 'totalHarvested', label: 'Flores colhidas', target: 100 },
      { metric: 'orderCycles', label: 'Floradas concluídas', target: 3 },
      { metric: 'bouquetsCrafted', label: 'Ramos compostos', target: 8 }
    ],
    unlock: { level: 8, flowerSpecies: 12, greenhouse: true },
    zone: { id: 'night-garden', name: 'Jardim do Luar', x: 2010, y: 720 }
  }
];
const HERBARIUM_EXHIBITIONS = [
  {
    id: 'spring-bloom',
    title: 'Exposição: Primeira Primavera',
    description: 'Uma composição para celebrar as primeiras flores da estação.',
    flowers: ['daisy', 'tulip'],
    bouquets: ['daisy+daisy+tulip']
  },
  {
    id: 'sunlit-garden',
    title: 'Exposição: Jardim Dourado',
    description: 'Tons quentes reunidos num arranjo de jardim.',
    flowers: ['rose', 'sunflower'],
    bouquets: ['rose+rose+sunflower']
  }
];
const VALID_FLOWER_IDS = new Set(FLOWER_ORDER);
const VALID_ORDER_IDS = new Set(SPECIAL_ORDERS.map((order) => order.id));
const VALID_PROJECT_IDS = new Set(LONG_TERM_PROJECTS.map((project) => project.id));
const VALID_EXHIBITION_IDS = new Set(HERBARIUM_EXHIBITIONS.map((exhibition) => exhibition.id));
const SAVE_DATA_KEYS = ['coins', 'reputation', 'level', 'stock', 'upgrades', 'plots'];

function getChallengePeriodEnd(type, period) {
  if (type === 'daily') {
    const [year, month, day] = period.split('-').map(Number);
    return new Date(year, month - 1, day + 1).getTime();
  }

  const [year, week] = [Number(period.slice(0, 4)), Number(period.slice(period.indexOf('W') + 1))];
  const januaryFourth = new Date(year, 0, 4);
  const mondayOffset = (januaryFourth.getDay() + 6) % 7;
  return new Date(year, 0, 4 - mondayOffset + week * 7).getTime();
}

function isValidChallengePeriod(type, period) {
  if (typeof period !== 'string') return false;
  if (type === 'daily' && /^\d{4}-\d{2}-\d{2}$/.test(period)) {
    const [year, month, day] = period.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year
      && date.getMonth() === month - 1
      && date.getDate() === day;
  }
  return type === 'weekly' && /^\d{4}-W\d{2}$/.test(period)
    && Number(period.slice(period.indexOf('W') + 1)) >= 1
    && Number(period.slice(period.indexOf('W') + 1)) <= 53;
}

function parseSaveData(raw) {
  if (typeof raw !== 'string') return null;
  try {
    const data = JSON.parse(raw);
    if (
      !data
      || typeof data !== 'object'
      || Array.isArray(data)
      || !SAVE_DATA_KEYS.some((key) => Object.prototype.hasOwnProperty.call(data, key))
      || ['coins', 'reputation', 'level'].some((key) => (
        Object.prototype.hasOwnProperty.call(data, key)
        && !Number.isFinite(data[key])
      ))
      || ['stock', 'upgrades'].some((key) => (
        Object.prototype.hasOwnProperty.call(data, key)
        && (!data[key] || typeof data[key] !== 'object' || Array.isArray(data[key]))
      ))
      || (Object.prototype.hasOwnProperty.call(data, 'basket') && !Array.isArray(data.basket))
      || (Object.prototype.hasOwnProperty.call(data, 'plots') && !Array.isArray(data.plots))
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export class GameState {
  constructor() {
    this.listeners = new Set();
    this.resetToDefaults();
  }

  resetToDefaults() {
    this.saveBlocked = false;
    this.sessionOnlyMode = this.sessionOnlyMode === true;
    this.storeName = 'FloristEver';
    this.coins = 20; // Pequeno fundo inicial acolhedor
    this.reputation = 0;
    this.level = 1;

    // Stock da floricultura pronto para venda aos clientes
    this.stock = Object.fromEntries(FLOWER_ORDER.map((flowerId) => [flowerId, 0]));

    // Flores transportadas pelo jogador no cesto
    this.basket = [];

    // Melhorias e níveis adquiridos
    this.upgrades = {
      cashier: 0,
      harvester: 0,
      bouquetAssistant: 0,
      basketCapacity: 0,
      speedBoots: 0,
      growthSpeed: 0,
      counterUpgrade: 0,
      shopDecor: 0,
      shopExpansion: 0,
      bouquetBench: 0
    };
    this.stockMinimumSkills = {};
    this.bouquetSpecializations = {};

    this.employment = {
      active: {
        cashier: false,
        harvester: false,
        bouquetAssistant: false
      },
      nextPayrollAt: null
    };

    // Definições de áudio e ambientação
    this.settings = {
      sfxVolume: 0.7,
      musicVolume: 0.4,
      sfxMuted: false,
      musicMuted: false,
      dayNightCycle: true,
      themePreference: 'auto',
      themeReducedEffects: false,
      mobileControlLayout: 'left',
      mobileMoveControlSize: 'standard',
      mobileActionControlSize: 'standard'
    };

    // Flores desbloqueadas para compra de parcelas
    this.unlockedFlowers = Object.fromEntries(
      FLOWER_ORDER.map((flowerId) => [
        flowerId,
        FLOWERS_CONFIG[flowerId].unlockedByDefault === true
      ])
    );

    // Parcelas agrícolas (cada parcela tem 6 flores em grelha 3x2)
    this.plots = this.generateInitialPlots();

    // Coleção de ramos criados e encomendas ativas
    this.discoveredBouquets = [];
    this.collection = { harvestedFlowers: {}, flowerRecords: {}, exhibitions: [] };
    this.favoriteObjective = null;
    this.specialVisitors = [];
    this.zoneFindings = { greenhouse: [], 'night-garden': [] };
    this.gardenDecorations = {};
    this.orders = JSON.parse(JSON.stringify(SPECIAL_ORDERS));
    this.orderCycle = 1;

    // Estatísticas
    this.stats = {
      totalHarvested: 0,
      totalCoinsEarned: 0,
      totalCoinsSpent: 0,
      customersServed: 0,
      bouquetsCrafted: 0,
      flowersSold: 0
    };
    this.challengeCycles = this.createChallengeCycles(Date.now());
    this.challengeGrace = [];

    this.tutorial = {
      currentStep: 0,
      completed: false
    };

    this.lastSaveTime = Date.now();
  }

  generateInitialPlots() {
    const plotsConfig = [
      { id: 0, flowerId: 'daisy', unlocked: true, cost: 0, gridX: 0, gridY: 0 },
      { id: 1, flowerId: 'daisy', unlocked: false, cost: 50, gridX: 1, gridY: 0 }
    ];

    const plots = plotsConfig.map(p => ({
      ...p,
      flowers: [
        { progress: 0.9, timer: 0 },
        { progress: 0.7, timer: 0 },
        { progress: 0.5, timer: 0 },
        { progress: 0.3, timer: 0 },
        { progress: 0.8, timer: 0 },
        { progress: 0.6, timer: 0 }
      ],
      wateredAt: 0,
      wateredUntil: 0
    }));
    return plots;
  }

  getNextPlotPosition() {
    const occupied = new Set(this.plots.map((plot) => `${plot.gridX},${plot.gridY}`));
    let gridY = 0;
    while (true) {
      for (let gridX = 0; gridX < FIELD_PLOT_COLUMNS; gridX++) {
        if (!occupied.has(`${gridX},${gridY}`)) return { gridX, gridY };
      }
      gridY++;
    }
  }

  getAvailableFlowerForLevel() {
    for (const flowerId of FLOWER_ORDER) {
      const flower = FLOWERS_CONFIG[flowerId];
      const ownedCount = this.plots.filter((plot) => plot.unlocked && plot.flowerId === flowerId).length;
      if (ownedCount >= MIN_OWNED_PLOTS_PER_FLOWER) continue;
      return flower && this.level >= (flower.requiredLevel || 1) ? flowerId : null;
    }
    return null;
  }

  getShopStockBoardFlowerIds() {
    const unlockedIndices = FLOWER_ORDER
      .map((flowerId, index) => this.unlockedFlowers[flowerId] ? index : -1)
      .filter((index) => index >= 0);
    const lastUnlockedIndex = Math.max(0, ...unlockedIndices);
    const visibleFlowers = new Set([
      FLOWER_ORDER[0],
      ...FLOWER_ORDER.filter((flowerId) => this.unlockedFlowers[flowerId]),
      ...FLOWER_ORDER.filter((flowerId) => (Number(this.stock[flowerId]) || 0) > 0)
    ]);
    const nextFlowerId = FLOWER_ORDER[lastUnlockedIndex + 1];
    if (nextFlowerId) visibleFlowers.add(nextFlowerId);
    return FLOWER_ORDER.filter((flowerId) => visibleFlowers.has(flowerId));
  }

  getPlotCostForNext(flowerId) {
    const ownedCount = this.getOwnedPlotCount(flowerId);
    const paidCount = Math.max(0, ownedCount - (flowerId === 'daisy' ? 1 : 0));
    return getPlotCost(flowerId, paidCount);
  }

  getOwnedPlotCount(flowerId) {
    return this.plots.filter((plot) => plot.unlocked && plot.flowerId === flowerId).length;
  }

  ensureNextPlot() {
    const nextFlowerId = this.getAvailableFlowerForLevel();
    let lockedPlot = this.plots.find((plot) => !plot.unlocked && !plot.optional);

    if (!nextFlowerId) {
      if (lockedPlot) {
        this.plots = this.plots.filter((plot) => plot.id !== lockedPlot.id);
        this.notify('plot_progression_waiting', { removedPlotId: lockedPlot.id });
      }
    } else if (lockedPlot) {
      if (lockedPlot.flowerId !== nextFlowerId) {
        lockedPlot.flowerId = nextFlowerId;
        lockedPlot.cost = this.getPlotCostForNext(nextFlowerId);
        this.notify('plot_available', { plotId: lockedPlot.id, flowerId: nextFlowerId });
      }
    } else {
      const position = this.getNextPlotPosition();
      lockedPlot = {
        id: Math.max(-1, ...this.plots.map((plot) => plot.id)) + 1,
        flowerId: nextFlowerId,
        unlocked: false,
        optional: false,
        cost: this.getPlotCostForNext(nextFlowerId),
        ...position,
        wateredAt: 0,
        wateredUntil: 0,
        flowers: Array.from({ length: 6 }, () => ({ progress: 0.5, timer: 0 }))
      };
      this.plots.push(lockedPlot);
      this.notify('plot_available', { plotId: lockedPlot.id, flowerId: nextFlowerId });
    }

  }

  buyOptionalPlot(flowerId) {
    if (!VALID_FLOWER_IDS.has(flowerId) || !FLOWERS_CONFIG[flowerId]) return false;
    if (this.getOwnedPlotCount(flowerId) < MIN_OWNED_PLOTS_PER_FLOWER) return false;
    if (this.level < (FLOWERS_CONFIG[flowerId].requiredLevel || 1)) return false;

    const cost = this.getPlotCostForNext(flowerId);
    if (!this.spendCoins(cost)) return false;

    const position = this.getNextPlotPosition();
    const plot = {
      id: Math.max(-1, ...this.plots.map((candidate) => candidate.id)) + 1,
      flowerId,
      unlocked: true,
      optional: true,
      cost,
      ...position,
      wateredAt: 0,
      wateredUntil: 0,
      flowers: Array.from({ length: 6 }, () => ({ progress: 0.5, timer: 0 }))
    };
    this.plots.push(plot);
    this.unlockedFlowers[flowerId] = true;
    this.notify('optional_plot_purchased', { plotId: plot.id, flowerId, cost });
    this.save();
    return true;
  }

  // Registo de escutas para atualizar UI
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(eventType, data = {}) {
    for (const listener of this.listeners) {
      try {
        listener(eventType, data, this);
      } catch (err) {
        console.error('Erro no listener do estado:', err);
      }
    }
  }

  getChallengeStats() {
    return Object.fromEntries(CHALLENGE_STAT_KEYS.map((key) => [
      key,
      Math.max(0, Number(this.stats[key]) || 0)
    ]));
  }

  getLongTermProjects() {
    const flowerSpecies = FLOWER_ORDER.filter((flowerId) => (
      this.collection.harvestedFlowers[flowerId] === true
    )).length;
    const metrics = {
      totalHarvested: Math.max(0, Number(this.stats.totalHarvested) || 0),
      customersServed: Math.max(0, Number(this.stats.customersServed) || 0),
      totalCoinsEarned: Math.max(0, Number(this.stats.totalCoinsEarned) || 0),
      bouquetsCrafted: Math.max(0, Number(this.stats.bouquetsCrafted) || 0),
      orderCycles: Math.max(0, (Number(this.orderCycle) || 1) - 1)
    };
    const completed = {};

    return LONG_TERM_PROJECTS.map((project) => {
      const progress = project.requirements.map((requirement) => ({
        ...requirement,
        current: Math.min(requirement.target, metrics[requirement.metric] || 0)
      }));
      const projectComplete = progress.every((entry) => entry.current >= entry.target);
      const levelUnlocked = this.level >= project.unlock.level;
      const speciesUnlocked = flowerSpecies >= project.unlock.flowerSpecies;
      const dependencyUnlocked = !project.unlock.greenhouse || completed.greenhouse === true;
      const unlocked = projectComplete && levelUnlocked && speciesUnlocked && dependencyUnlocked;
      completed[project.id] = unlocked;
      return {
        ...project,
        progress,
        complete: projectComplete,
        flowerSpecies,
        levelUnlocked,
        speciesUnlocked,
        dependencyUnlocked,
        unlocked
      };
    });
  }

  setFavoriteObjective(type, id) {
    if (type === null && id === null) {
      if (!this.favoriteObjective) return false;
      this.favoriteObjective = null;
    } else {
      const validType = ['challenge', 'project', 'collection'].includes(type);
      const challenges = type === 'challenge' ? this.getChallenges() : null;
      const validId = type === 'challenge'
        ? [...challenges.daily, ...challenges.weekly].some((challenge) => challenge.id === id)
        : type === 'project'
          ? VALID_PROJECT_IDS.has(id)
          : type === 'collection'
            ? VALID_EXHIBITION_IDS.has(id)
            : false;
      if (!validType || !validId) return false;
      if (this.favoriteObjective?.type === type && this.favoriteObjective.id === id) {
        this.favoriteObjective = null;
      } else {
        this.favoriteObjective = { type, id };
      }
    }

    this.save();
    this.notify('favorite_objective_changed', { favoriteObjective: this.favoriteObjective });
    return true;
  }

  getTrackedObjective() {
    const favorite = this.favoriteObjective;
    if (!favorite) return null;

    if (favorite.type === 'challenge') {
      const challenges = this.getChallenges();
      const challenge = [...challenges.daily, ...challenges.weekly]
        .find((entry) => entry.id === favorite.id);
      if (!challenge) {
        return {
          ...favorite,
          title: 'Objetivo não disponível',
          nextStep: 'Escolhe outro objetivo nas missões.',
          progress: 0,
          target: 0,
          unavailable: true
        };
      }
      return {
        ...favorite,
        title: challenge.title,
        nextStep: challenge.complete
          ? challenge.claimed ? 'Desafio concluído.' : 'Reclama a recompensa nas missões.'
          : challenge.progressText,
        progress: challenge.progress,
        target: challenge.target,
        complete: challenge.complete,
        unavailable: false
      };
    }

    if (favorite.type === 'project') {
      const project = this.getLongTermProjects().find((entry) => entry.id === favorite.id);
      if (!project) return null;
      const requirement = project.progress.find((entry) => entry.current < entry.target);
      let nextStep = requirement
        ? `${requirement.label}: ${requirement.current}/${requirement.target}.`
        : project.unlocked
          ? `Visita ${project.zone.name}.`
          : !project.levelUnlocked
            ? `Atinge o nível ${project.unlock.level}.`
            : !project.speciesUnlocked
              ? `Descobre ${project.unlock.flowerSpecies} espécies de flores.`
              : `Conclui primeiro o projeto da ${LONG_TERM_PROJECTS[0].zone.name}.`;
      return {
        ...favorite,
        title: project.title,
        nextStep,
        progress: project.progress.filter((entry) => entry.current >= entry.target).length,
        target: project.progress.length,
        complete: project.unlocked,
        unavailable: false
      };
    }

    if (favorite.type === 'collection') {
      const exhibition = this.getHerbariumExhibitions()
        .find((entry) => entry.id === favorite.id);
      if (!exhibition) return null;
      const missingFlower = exhibition.flowers.find((flowerId) => (
        (Number(this.collection.flowerRecords?.[flowerId]?.harvested) || 0) < 1
      ));
      const missingBouquet = exhibition.bouquets.find((recipe) => (
        !this.discoveredBouquets.includes(recipe)
      ));
      const nextStep = exhibition.installed
        ? 'Exposição permanente montada.'
        : missingFlower
          ? `Colhe ${FLOWERS_CONFIG[missingFlower].name}.`
          : missingBouquet
            ? `Compõe o ramo ${missingBouquet.split('+').map((flowerId) => FLOWERS_CONFIG[flowerId].name).join(' + ')}.`
            : 'Monta a exposição no herbário.';
      return {
        ...favorite,
        title: exhibition.title,
        nextStep,
        progress: exhibition.installed
          ? exhibition.flowers.length + exhibition.bouquets.length + 1
          : exhibition.flowers.filter((flowerId) => (
              (Number(this.collection.flowerRecords?.[flowerId]?.harvested) || 0) > 0
            )).length + exhibition.bouquets.filter((recipe) => (
              this.discoveredBouquets.includes(recipe)
            )).length,
        target: exhibition.flowers.length + exhibition.bouquets.length + 1,
        complete: exhibition.installed,
        unavailable: false
      };
    }

    return null;
  }

  getHerbariumExhibitions() {
    return HERBARIUM_EXHIBITIONS.map((exhibition) => ({
      ...exhibition,
      flowers: [...exhibition.flowers],
      bouquets: [...exhibition.bouquets],
      complete: exhibition.flowers.every((flowerId) => (
        (Number(this.collection.flowerRecords?.[flowerId]?.harvested) || 0) > 0
      )) && exhibition.bouquets.every((recipe) => this.discoveredBouquets.includes(recipe)),
      installed: this.collection.exhibitions.includes(exhibition.id)
    }));
  }

  getFlowerMastery(flowerId) {
    if (!VALID_FLOWER_IDS.has(flowerId)) return null;
    const record = this.collection.flowerRecords?.[flowerId] || {};
    const counts = {
      harvested: Math.max(0, Number(record.harvested) || 0),
      sold: Math.max(0, Number(record.sold) || 0),
      usedInBouquets: Math.max(0, Number(record.usedInBouquets) || 0)
    };
    const milestones = FLOWER_MASTERY_MILESTONES.map((milestone) => ({
      ...milestone,
      complete: ['harvested', 'sold', 'usedInBouquets'].every((metric) => (
        counts[metric] >= milestone[metric]
      ))
    }));
    return {
      counts,
      milestones,
      completed: milestones.filter((milestone) => milestone.complete).length,
      total: milestones.length
    };
  }

  getZoneActivities() {
    return Object.values(ZONE_ACTIVITY_CONFIG).map((zone) => ({
      id: zone.id,
      name: zone.name,
      findings: zone.findings.map((finding) => ({
        ...finding,
        found: this.zoneFindings[zone.id].includes(finding.id)
      })),
      complete: zone.findings.every((finding) => this.zoneFindings[zone.id].includes(finding.id))
    }));
  }

  discoverZoneFinding(zoneId, findingId) {
    const zone = ZONE_ACTIVITY_CONFIG[zoneId];
    if (!zone || !zone.findings.some((finding) => finding.id === findingId)) return false;
    if (this.zoneFindings[zoneId].includes(findingId)) return false;
    const project = this.getLongTermProjects().find((entry) => entry.zone.id === zoneId);
    if (!project?.unlocked) return false;
    this.zoneFindings[zoneId].push(findingId);
    if (!this.save()) {
      this.zoneFindings[zoneId].pop();
      return false;
    }
    this.notify('zone_finding_discovered', { zoneId, findingId });
    return true;
  }

  recordSpecialVisitor(visitorId) {
    if (!VISITOR_IDS.has(visitorId) || this.specialVisitors.includes(visitorId)) return false;
    this.specialVisitors.push(visitorId);
    if (!this.save()) {
      this.specialVisitors.pop();
      return false;
    }
    this.notify('special_visitor_met', { visitorId, total: this.specialVisitors.length });
    return true;
  }

  setGardenDecorationPosition(index, x, y) {
    if (
      !Number.isInteger(index)
      || !PLACEABLE_DECORATION_INDICES.has(index)
      || !Number.isFinite(x)
      || !Number.isFinite(y)
      || x < 40
      || x > 2260
      || y < 40
      || y > 1160
    ) return false;
    const original = this.gardenDecorations[index];
    this.gardenDecorations[index] = { x, y };
    if (!this.save()) {
      if (original) this.gardenDecorations[index] = original;
      else delete this.gardenDecorations[index];
      return false;
    }
    this.notify('garden_decoration_moved', { index, x, y });
    return true;
  }

  installHerbariumExhibition(exhibitionId) {
    const exhibition = this.getHerbariumExhibitions()
      .find((entry) => entry.id === exhibitionId);
    if (!exhibition || !exhibition.complete || exhibition.installed) return false;
    this.collection.exhibitions.push(exhibition.id);
    this.notify('herbarium_updated', { exhibitionId });
    this.save();
    return true;
  }

  recordFlowerUse(flowerId, action) {
    if (!VALID_FLOWER_IDS.has(flowerId)) return false;
    const counterByAction = {
      harvested: 'harvested',
      sold: 'sold',
      bouquet: 'usedInBouquets'
    };
    const counter = counterByAction[action];
    if (!counter) return false;
    const record = this.collection.flowerRecords[flowerId]
      || (this.collection.flowerRecords[flowerId] = {
        harvested: 0,
        sold: 0,
        usedInBouquets: 0
      });
    record[counter] = Math.max(0, Number(record[counter]) || 0) + 1;
    this.notify('herbarium_updated', { flowerId, action });
    return true;
  }

  waterPlot(plotId, now = Date.now()) {
    if (!Number.isFinite(now)) throw new TypeError('A data da rega é inválida.');
    const plot = this.plots.find((entry) => entry.id === plotId && entry.unlocked);
    if (!plot) return false;
    if (Number.isFinite(plot.wateredAt) && now < plot.wateredAt + PLOT_WATER_COOLDOWN_MS) {
      return false;
    }
    plot.wateredAt = now;
    plot.wateredUntil = now + PLOT_WATER_BOOST_MS;
    this.save();
    this.notify('plot_watered', { plotId, wateredUntil: plot.wateredUntil });
    return true;
  }

  getPlotGrowthMultiplier(plot, now = Date.now()) {
    return Number.isFinite(plot?.wateredUntil) && plot.wateredUntil > now
      ? PLOT_WATER_GROWTH_MULTIPLIER
      : 1;
  }

  getPlotWaterStatus(plot, now = Date.now()) {
    const cooldownRemainingMs = Math.max(
      0,
      (Number(plot?.wateredAt) || 0) + PLOT_WATER_COOLDOWN_MS - now
    );
    return {
      active: this.getPlotGrowthMultiplier(plot, now) > 1,
      available: cooldownRemainingMs === 0,
      cooldownRemainingMs
    };
  }

  getChallengePeriodIds(now = new Date()) {
    const date = now instanceof Date ? now : new Date(now);
    if (!Number.isFinite(date.getTime())) throw new TypeError('A data dos desafios é inválida.');
    const daily = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
    const weekday = (date.getDay() + 6) % 7;
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - weekday);
    const thursday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3);
    const yearStart = new Date(thursday.getFullYear(), 0, 1);
    const week = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
    return { daily, weekly: `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}` };
  }

  createChallengeCycle(period) {
    return { period, baseline: this.getChallengeStats(), claimed: [] };
  }

  createChallengeCycles(now = new Date()) {
    const periods = this.getChallengePeriodIds(now);
    return {
      daily: this.createChallengeCycle(periods.daily),
      weekly: this.createChallengeCycle(periods.weekly)
    };
  }

  getChallengeEntries(type, cycle) {
    const pools = { daily: DAILY_CHALLENGE_POOL, weekly: WEEKLY_CHALLENGE_POOL };
    const pool = pools[type];
    const periodYear = Number(cycle.period.slice(0, 4));
    const dailyParts = cycle.period.split('-').map(Number);
    const dayNumber = type === 'daily'
      ? Math.floor(Date.UTC(dailyParts[0], dailyParts[1] - 1, dailyParts[2]) / 86400000)
      : 0;
    const weekNumber = Number(cycle.period.slice(cycle.period.indexOf('W') + 1));
    const rotation = type === 'daily' ? dayNumber : periodYear * 53 + weekNumber;
    const offset = ((rotation % pool.length) + pool.length) % pool.length;
    const selected = Array.from({ length: 3 }, (_, index) => pool[(offset + index) % pool.length]);

    return selected.map((challenge) => {
      const baseline = Math.max(0, Number(cycle.baseline[challenge.metric]) || 0);
      const current = Math.max(0, Number(this.stats[challenge.metric]) || 0);
      const progress = Math.min(challenge.target, Math.max(0, current - baseline));
      const id = `${type}-${cycle.period}-${challenge.id}`;
      return {
        ...challenge,
        id,
        cycle: cycle.period,
        type,
        progress,
        complete: progress >= challenge.target,
        claimed: cycle.claimed.includes(id)
      };
    });
  }

  getChallenges(now = new Date()) {
    const date = now instanceof Date ? now : new Date(now);
    if (!Number.isFinite(date.getTime())) throw new TypeError('A data dos desafios é inválida.');
    const periods = this.getChallengePeriodIds(date);
    let changed = false;
    for (const type of ['daily', 'weekly']) {
      const cycle = this.challengeCycles?.[type];
      const validCycle = cycle
        && isValidChallengePeriod(type, cycle.period)
        && cycle.baseline
        && Array.isArray(cycle.claimed);
      if (validCycle && cycle.period !== periods[type]) {
        const claimUntil = getChallengePeriodEnd(type, cycle.period) + CHALLENGE_CLAIM_GRACE_MS;
        if (date.getTime() <= claimUntil) {
          for (const challenge of this.getChallengeEntries(type, cycle)) {
            if (challenge.complete && !challenge.claimed) {
              const saved = this.challengeGrace.some((entry) => entry.id === challenge.id);
              if (!saved) {
                this.challengeGrace.push({ ...challenge, claimUntil, cycle: cycle.period });
                changed = true;
              }
            }
          }
        }
      }
      if (
        !validCycle
        || cycle.period !== periods[type]
      ) {
        this.challengeCycles[type] = this.createChallengeCycle(periods[type]);
        changed = true;
      }
    }
    const activeGrace = this.challengeGrace.filter((entry) => (
      entry
      && typeof entry.id === 'string'
      && entry.complete === true
      && !entry.claimed
      && Number.isFinite(entry.claimUntil)
      && date.getTime() <= entry.claimUntil
    ));
    if (activeGrace.length !== this.challengeGrace.length) {
      this.challengeGrace = activeGrace;
      changed = true;
    }
    if (changed) this.save();

    return Object.fromEntries(['daily', 'weekly'].map((type) => [
      type,
      [
        ...this.getChallengeEntries(type, this.challengeCycles[type]),
        ...this.challengeGrace.filter((entry) => entry.type === type)
      ]
    ]));
  }

  claimChallenge(challengeId, now = new Date()) {
    if (typeof challengeId !== 'string') return false;
    const challenges = this.getChallenges(now);
    const challenge = [...challenges.daily, ...challenges.weekly]
      .find((entry) => entry.id === challengeId);
    if (!challenge || !challenge.complete || challenge.claimed) return false;

    if (challenge.claimUntil) {
      this.challengeGrace = this.challengeGrace.filter((entry) => entry.id !== challenge.id);
    } else {
      this.challengeCycles[challenge.type].claimed.push(challenge.id);
    }
    this.addCoins(challenge.rewardCoins);
    this.addReputation(challenge.rewardRep);
    this.save();
    this.notify('challenge_claimed', { challengeId: challenge.id, type: challenge.type });
    return challenge;
  }

  completeSpecialOrder(orderId) {
    const order = this.orders.find((entry) => entry.id === orderId);
    if (!order || order.isCompleted) return false;

    order.isCompleted = true;
    const cycleCompleted = this.orders.length > 0
      && this.orders.every((entry) => entry.isCompleted);
    if (cycleCompleted) {
      this.orderCycle = Math.min(Number.MAX_SAFE_INTEGER, this.orderCycle + 1);
      this.orders = JSON.parse(JSON.stringify(SPECIAL_ORDERS));
    }

    this.notify('order_completed', { orderId });
    if (cycleCompleted) {
      this.notify('order_cycle_completed', { orderCycle: this.orderCycle });
    }
    return true;
  }

  // --- Economia e Progressão ---
  addCoins(amount) {
    if (amount <= 0) return;
    this.coins += amount;
    this.stats.totalCoinsEarned += amount;
    this.notify('coins_changed', { delta: amount });
  }

  spendCoins(amount) {
    if (this.coins < amount) return false;
    this.coins -= amount;
    this.stats.totalCoinsSpent += amount;
    this.notify('coins_changed', { delta: -amount });
    return true;
  }

  hasEmployee(role) {
    return (this.upgrades[role] || 0) > 0;
  }

  isEmployeeActive(role) {
    return this.hasEmployee(role) && this.employment.active[role] === true;
  }

  getEmployeeDailyWage(role) {
    const cfg = UPGRADES_CONFIG[role];
    if (!cfg?.dailyWage) return 0;
    const count = role === 'harvester' ? this.upgrades.harvester || 0 : 1;
    return this.isEmployeeActive(role) ? count * cfg.dailyWage : 0;
  }

  getDailyPayroll() {
    return ['cashier', 'harvester', 'bouquetAssistant']
      .reduce((total, role) => total + this.getEmployeeDailyWage(role), 0);
  }

  getActiveEmployeeRoles() {
    return ['cashier', 'harvester', 'bouquetAssistant']
      .filter((role) => this.isEmployeeActive(role));
  }

  hasActiveEmployees() {
    return this.getActiveEmployeeRoles().length > 0;
  }

  getStockMinimum(flowerId) {
    return this.stockMinimumSkills[flowerId] === true
      ? FLOWERS_CONFIG[flowerId]?.stockMinimum || 0
      : 0;
  }

  getSellableStock(flowerId) {
    return Math.max(0, (this.stock[flowerId] || 0) - this.getStockMinimum(flowerId));
  }

  buyStockMinimumSkill(flowerId) {
    const flower = FLOWERS_CONFIG[flowerId];
    if (!flower || !this.unlockedFlowers[flowerId] || this.stockMinimumSkills[flowerId] === true) return false;
    if (!this.spendCoins(flower.stockSkillCost)) return false;
    this.stockMinimumSkills[flowerId] = true;
    this.notify('stock_minimum_skill_bought', { flowerId, minimum: flower.stockMinimum });
    this.save();
    return true;
  }

  buyBouquetSpecialization(categoryId) {
    const category = BOUQUET_CATEGORIES.find((entry) => entry.id === categoryId);
    if (
      !category
      || this.bouquetSpecializations[categoryId] === true
      || this.level < category.requiredLevel
      || !this.hasEmployee('bouquetAssistant')
    ) return false;
    if (!this.spendCoins(category.specializationCost)) return false;
    this.bouquetSpecializations[categoryId] = true;
    this.notify('bouquet_specialization_bought', { categoryId });
    this.save();
    return true;
  }

  sellAutomatedBouquet(flowerIds, categoryId = null) {
    if (
      !this.isEmployeeActive('bouquetAssistant')
      || !Array.isArray(flowerIds)
      || flowerIds.length < 1
      || flowerIds.length > 3
    ) return false;
    const counts = flowerIds.reduce((result, flowerId) => {
      result[flowerId] = (result[flowerId] || 0) + 1;
      return result;
    }, {});
    if (!Object.entries(counts).every(([flowerId, quantity]) => (
      FLOWERS_CONFIG[flowerId]
      && this.unlockedFlowers[flowerId]
      && this.getSellableStock(flowerId) >= quantity
    ))) return false;

    const harmony = calculateBouquetHarmony(flowerIds);
    const category = BOUQUET_CATEGORIES.find((entry) => (
      harmony.harmonyMultiplier >= entry.min && harmony.harmonyMultiplier < entry.max
    ));
    if (!category || (categoryId && category.id !== categoryId)) return false;
    for (const [flowerId, quantity] of Object.entries(counts)) {
      this.stock[flowerId] -= quantity;
      for (let index = 0; index < quantity; index++) {
        this.recordFlowerUse(flowerId, 'sold');
        this.recordFlowerUse(flowerId, 'bouquet');
      }
    }
    const basePrice = flowerIds.reduce((total, flowerId) => total + FLOWERS_CONFIG[flowerId].value, 0);
    const benchBonus = 1 + (this.upgrades.bouquetBench || 0) * UPGRADES_CONFIG.bouquetBench.bonusPerLevel;
    const specialtyBonus = this.bouquetSpecializations[category.id] ? 1 + category.bonus : 1;
    const revenue = Math.round(
      basePrice * harmony.harmonyMultiplier * harmony.valueMultiplier
        * WRAPPERS[0].multiplier * benchBonus * specialtyBonus
    );
    this.addCoins(revenue);
    this.addReputation(Math.round(revenue * 0.9 + 15));
    this.stats.bouquetsCrafted++;
    const recipeKey = [...flowerIds].sort().join('+');
    if (!this.discoveredBouquets.includes(recipeKey)) this.discoveredBouquets.push(recipeKey);
    this.notify('stock_updated');
    this.notify('bouquet_crafted', { count: this.stats.bouquetsCrafted });
    this.notify('automated_bouquet_sold', { categoryId: category.id, revenue });
    this.save();
    return { categoryId: category.id, revenue };
  }

  getNextPayrollAt() {
    return this.employment.nextPayrollAt;
  }

  setStoreName(name) {
    if (typeof name !== 'string') return false;
    const normalizedName = name.trim().replace(/\s+/g, ' ').slice(0, 28);
    if (!normalizedName || normalizedName === this.storeName) return false;
    this.storeName = normalizedName;
    this.save();
    this.notify('store_name_changed', { name: normalizedName });
    return true;
  }

  setEmployeeActive(role, active, now = Date.now()) {
    if (!['cashier', 'harvester', 'bouquetAssistant'].includes(role) || !this.hasEmployee(role)) return false;
    if (this.isEmployeeActive(role) === active) return false;

    const activeBeforeChange = this.hasActiveEmployees();
    if (active) {
      const firstDayWage = (role === 'harvester' ? this.upgrades.harvester : 1)
        * UPGRADES_CONFIG[role].dailyWage;
      if (!this.spendCoins(firstDayWage)) return false;
      this.employment.active[role] = true;
      if (!activeBeforeChange || !this.employment.nextPayrollAt || this.employment.nextPayrollAt <= now) {
        this.employment.nextPayrollAt = now + GAME_DAY_MS;
      }
      this.notify('employee_contract_renewed', { role, amount: firstDayWage });
    } else {
      this.employment.active[role] = false;
      if (!this.hasActiveEmployees()) {
        this.employment.nextPayrollAt = null;
      }
      this.notify('employee_contract_ended', { role });
    }

    this.save();
    return true;
  }

  processPayroll(now = Date.now()) {
    const result = { wagesPaid: 0, suspendedRoles: [] };
    const offlineCutoff = now - MAX_OFFLINE_MS;
    if (
      this.employment.nextPayrollAt !== null
      && this.employment.nextPayrollAt < offlineCutoff
      && this.hasActiveEmployees()
    ) {
      this.employment.nextPayrollAt = offlineCutoff;
    }
    let safety = 0;
    while (
      this.employment.nextPayrollAt !== null
      && this.employment.nextPayrollAt <= now
      && safety < MAX_OFFLINE_MS / GAME_DAY_MS
    ) {
      safety++;
      const roles = this.getActiveEmployeeRoles();
      if (roles.length === 0) {
        this.employment.nextPayrollAt = null;
        break;
      }

      const amount = roles.reduce((total, role) => total + this.getEmployeeDailyWage(role), 0);
      if (!this.spendCoins(amount)) {
        for (const role of roles) {
          this.employment.active[role] = false;
        }
        result.suspendedRoles = roles;
        this.notify('employee_contracts_suspended', { roles, amount });
        this.employment.nextPayrollAt = null;
        break;
      }

      result.wagesPaid += amount;
      this.notify('employee_payroll_paid', { roles, amount, nextPayrollAt: this.employment.nextPayrollAt + GAME_DAY_MS });
      this.employment.nextPayrollAt += GAME_DAY_MS;
    }

    if (result.wagesPaid > 0 || result.suspendedRoles.length > 0) {
      this.save();
    }
    return result;
  }

  addReputation(amount) {
    if (amount <= 0) return;
    // Bónus de decoração da loja
    const decorBonus = 1 + (this.upgrades.shopDecor || 0) * 0.2;
    const finalAmount = Math.round(amount * decorBonus);

    this.reputation += finalAmount;
    const repForNextLevel = this.getReputationForNextLevel();

    if (this.reputation >= repForNextLevel) {
      this.reputation -= repForNextLevel;
      this.level += 1;
      this.notify('level_up', { newLevel: this.level });
      this.ensureNextPlot();
    } else {
      this.notify('rep_changed', { added: finalAmount });
    }
  }

  getReputationForNextLevel() {
    return Math.round(100 * Math.pow(1.35, this.level - 1));
  }

  // Capacidade atual do cesto (10 inicial + 5 por nível de cesto)
  getBasketCapacity() {
    return 10 + (this.upgrades.basketCapacity || 0) * 5;
  }

  getShopStockCapacity() {
    return FLOWER_ORDER.reduce((capacity, flowerId) => {
      return capacity + (this.unlockedFlowers[flowerId] ? this.getFlowerStockCapacity(flowerId) : 0);
    }, 0);
  }

  getFlowerStockCapacity(flowerId) {
    if (!VALID_FLOWER_IDS.has(flowerId)) return 0;
    return 20 + (this.upgrades.shopExpansion || 0) * 20;
  }

  getTotalShopStock() {
    return FLOWER_ORDER.reduce((total, flowerId) => {
      return total + Math.max(0, Number(this.stock[flowerId]) || 0);
    }, 0);
  }

  getAvailableShopStockSpace(flowerId = null) {
    if (flowerId !== null) {
      return Math.max(0, this.getFlowerStockCapacity(flowerId) - (Number(this.stock[flowerId]) || 0));
    }
    return FLOWER_ORDER.reduce((space, id) => {
      return space + (this.unlockedFlowers[id] ? this.getAvailableShopStockSpace(id) : 0);
    }, 0);
  }

  // Multiplicador de velocidade do jogador (+10% por nível)
  getPlayerSpeedMultiplier() {
    return 1 + (this.upgrades.speedBoots || 0) * 0.1;
  }

  // Redução do tempo de crescimento (-8% por nível)
  getGrowthTimeMultiplier() {
    return Math.max(0.2, 1 - (this.upgrades.growthSpeed || 0) * 0.08);
  }

  // Adicionar flor colhida ao cesto
  addToBasket(flowerId) {
    if (!VALID_FLOWER_IDS.has(flowerId) || this.basket.length >= this.getBasketCapacity()) {
      return false;
    }
    this.basket.push(flowerId);
    this.stats.totalHarvested++;
    this.collection.harvestedFlowers[flowerId] = true;
    this.recordFlowerUse(flowerId, 'harvested');
    this.notify('flower_harvested', { flowerId });
    this.notify('basket_changed', { count: this.basket.length });
    return true;
  }

  depositBasketToStock(basket) {
    const flowers = Array.isArray(basket) ? [...basket] : [];
    const remaining = [];
    let deposited = 0;

    for (const flowerId of flowers) {
      if (
        VALID_FLOWER_IDS.has(flowerId)
        && this.unlockedFlowers[flowerId]
        && this.getAvailableShopStockSpace(flowerId) > 0
      ) {
        this.stock[flowerId] = (Number(this.stock[flowerId]) || 0) + 1;
        deposited++;
      } else {
        remaining.push(flowerId);
      }
    }

    return {
      deposited,
      remaining
    };
  }

  // Transfere o que couber no stock da loja e conserva o excedente no cesto.
  unloadBasketToStock() {
    if (this.basket.length === 0) return 0;
    const result = this.depositBasketToStock(this.basket);
    if (result.deposited === 0) return 0;

    this.basket = result.remaining;
    this.notify('stock_updated');
    this.notify('basket_changed', { count: this.basket.length });
    this.save();
    return result.deposited;
  }

  discardBasketFlowers(discardCounts) {
    if (!discardCounts || typeof discardCounts !== 'object' || Array.isArray(discardCounts)) return 0;

    const availableCounts = this.basket.reduce((counts, flowerId) => {
      counts[flowerId] = (counts[flowerId] || 0) + 1;
      return counts;
    }, {});
    let requestedTotal = 0;

    for (const [flowerId, count] of Object.entries(discardCounts)) {
      if (
        !VALID_FLOWER_IDS.has(flowerId)
        || !Number.isInteger(count)
        || count < 0
        || count > (availableCounts[flowerId] || 0)
      ) {
        return 0;
      }
      requestedTotal += count;
    }

    if (requestedTotal === 0) return 0;

    const originalBasket = [...this.basket];
    const remainingCounts = { ...discardCounts };
    this.basket = originalBasket.filter((flowerId) => {
      if ((remainingCounts[flowerId] || 0) === 0) return true;
      remainingCounts[flowerId]--;
      return false;
    });

    if (!this.save()) {
      this.basket = originalBasket;
      return null;
    }

    this.notify('basket_changed', { count: this.basket.length });
    this.notify('basket_discarded', { count: requestedTotal, flowers: { ...discardCounts } });
    return requestedTotal;
  }

  // Desbloqueia uma parcela
  unlockPlot(plotId) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot || plot.unlocked) return false;
    if (plot.optional) {
      const ownedCount = this.plots.filter(
        (candidate) => candidate.unlocked && candidate.flowerId === plot.flowerId
      ).length;
      if (ownedCount < MIN_OWNED_PLOTS_PER_FLOWER) return false;
    } else {
      if (plot.id !== this.plots.find((candidate) => !candidate.unlocked && !candidate.optional)?.id) return false;
      if (plot.flowerId !== this.getAvailableFlowerForLevel()) return false;
    }
    const requiredLevel = FLOWERS_CONFIG[plot.flowerId]?.requiredLevel || 1;
    if (this.level < requiredLevel) return false;
    if (this.spendCoins(plot.cost)) {
      plot.unlocked = true;
      this.unlockedFlowers[plot.flowerId] = true;
      this.ensureNextPlot();
      this.notify('plot_unlocked', { plotId, flowerId: plot.flowerId });
      this.save();
      return true;
    }
    return false;
  }

  // Compra uma melhoria
  buyUpgrade(upgradeId) {
    const cfg = UPGRADES_CONFIG[upgradeId];
    if (!cfg) return false;

    const currentLvl = this.upgrades[upgradeId] || 0;
    if (currentLvl >= cfg.maxLevel) return false;

    // Verificação de nível exigido (ex: Bancada de Ramos no Nível 5)
    const requiredLevel = this.getUpgradeRequiredLevel(upgradeId, currentLvl);
    if (requiredLevel && this.level < requiredLevel) {
      return false;
    }

    let cost = 0;
    if (cfg.type === 'single' || cfg.type === 'special') {
      cost = cfg.cost;
    } else {
      cost = cfg.getCost(currentLvl);
    }

    if (this.spendCoins(cost)) {
      this.upgrades[upgradeId] = currentLvl + 1;
      if (['cashier', 'harvester', 'bouquetAssistant'].includes(upgradeId)) {
        const alreadyActive = this.hasActiveEmployees();
        this.employment.active[upgradeId] = true;
        if (!alreadyActive || !this.employment.nextPayrollAt) {
          this.employment.nextPayrollAt = Date.now() + GAME_DAY_MS;
        }
      }
      this.notify('upgrade_bought', { upgradeId, newLevel: this.upgrades[upgradeId] });
      if (['cashier', 'harvester', 'bouquetAssistant'].includes(upgradeId)) {
        this.notify('employee_contract_started', {
          role: upgradeId,
          dailyWage: this.getEmployeeDailyWage(upgradeId),
          nextPayrollAt: this.employment.nextPayrollAt
        });
      }
      this.save();
      return true;
    }
    return false;
  }

  getUpgradeRequiredLevel(upgradeId, currentLevel = this.upgrades[upgradeId] || 0) {
    const cfg = UPGRADES_CONFIG[upgradeId];
    if (!cfg) return 0;
    return cfg.getRequiredLevel
      ? cfg.getRequiredLevel(currentLevel)
      : cfg.requiredLevel || 0;
  }

  // --- Persistência LocalStorage & Progresso Offline ---
  exportSaveData() {
    return {
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      economyVersion: 2,
      employmentVersion: 1,
      coins: this.coins,
      reputation: this.reputation,
      level: this.level,
      stock: this.stock,
      basket: this.basket,
      upgrades: this.upgrades,
      employment: this.employment,
      stockMinimumSkills: this.stockMinimumSkills,
      bouquetSpecializations: this.bouquetSpecializations,
      storeName: this.storeName,
      settings: this.settings,
      unlockedFlowers: this.unlockedFlowers,
      discoveredBouquets: this.discoveredBouquets,
      collection: this.collection,
      orders: this.orders,
      orderCycle: this.orderCycle,
      challengeCycles: this.challengeCycles,
      challengeGrace: this.challengeGrace,
      stats: this.stats,
      favoriteObjective: this.favoriteObjective,
      specialVisitors: this.specialVisitors,
      zoneFindings: this.zoneFindings,
      gardenDecorations: this.gardenDecorations,
      tutorial: this.tutorial,
      plots: this.plots.map(p => ({
        id: p.id,
        flowerId: p.flowerId,
        unlocked: p.unlocked,
        optional: p.optional === true,
        cost: p.cost,
        gridX: p.gridX,
        gridY: p.gridY,
        wateredAt: Number.isFinite(p.wateredAt) ? p.wateredAt : 0,
        wateredUntil: Number.isFinite(p.wateredUntil) ? p.wateredUntil : 0,
        flowers: p.flowers.map(f => ({ progress: Math.min(1.0, f.progress) }))
      })),
      lastSaveTime: this.lastSaveTime
    };
  }

  save() {
    if (this.sessionOnlyMode) return true;
    if (this.saveBlocked) return false;
    try {
      this.lastSaveTime = Date.now();
      const data = this.exportSaveData();
      const serialized = JSON.stringify(data);
      const currentSave = localStorage.getItem(STORAGE_KEY);
      if (parseSaveData(currentSave)) {
        localStorage.setItem(BACKUP_STORAGE_KEY, currentSave);
      }
      localStorage.setItem(STORAGE_KEY, serialized);
      return true;
    } catch (e) {
      console.error('Não foi possível guardar o progresso; a cópia anterior foi preservada:', e);
      return false;
    }
  }

  load() {
    try {
      const primaryRaw = localStorage.getItem(STORAGE_KEY);
      const primaryData = parseSaveData(primaryRaw);
      const backupRaw = primaryData ? null : localStorage.getItem(BACKUP_STORAGE_KEY);
      const backupData = primaryData ? null : parseSaveData(backupRaw);
      const storedData = primaryData || backupData;
      const data = storedData ? migrateSaveData(storedData) : null;
      if (!data) {
        if (primaryRaw || backupRaw) {
          console.error('Os saves principal e de recuperação são inválidos; não foram alterados.');
        }
        this.saveBlocked = Boolean(primaryRaw || backupRaw);
        return null;
      }
      this.saveBlocked = false;
      if (!primaryData && backupData) {
        console.warn('Save principal inválido; progresso recuperado da cópia de segurança.');
      }

      this.coins = Number(data.coins) || 0;
      this.reputation = Number(data.reputation) || 0;
      this.level = Number(data.level) || 1;
      if (typeof data.storeName === 'string' && data.storeName.trim()) {
        this.storeName = data.storeName.trim().replace(/\s+/g, ' ').slice(0, 28);
      }
      this.stock = { ...this.stock, ...(data.stock || {}) };
      if (Array.isArray(data.basket)) {
        this.basket = data.basket.filter((flowerId) => VALID_FLOWER_IDS.has(flowerId));
      }
      this.upgrades = { ...this.upgrades, ...(data.upgrades || {}) };
      this.collection = {
        harvestedFlowers: Object.fromEntries(FLOWER_ORDER.map((flowerId) => [
          flowerId,
          data.collection?.harvestedFlowers?.[flowerId] === true
        ])),
        flowerRecords: Object.fromEntries(FLOWER_ORDER.map((flowerId) => {
          const savedRecord = data.collection?.flowerRecords?.[flowerId] || {};
          return [flowerId, {
            harvested: Math.max(
              data.collection?.harvestedFlowers?.[flowerId] === true ? 1 : 0,
              Math.floor(Number(savedRecord.harvested) || 0)
            ),
            sold: Math.max(0, Math.floor(Number(savedRecord.sold) || 0)),
            usedInBouquets: Math.max(0, Math.floor(Number(savedRecord.usedInBouquets) || 0))
          }];
        })),
        exhibitions: Array.isArray(data.collection?.exhibitions)
          ? [...new Set(data.collection.exhibitions.filter((id) => (
              HERBARIUM_EXHIBITIONS.some((exhibition) => exhibition.id === id)
            )))]
          : []
      };
      this.stockMinimumSkills = Object.fromEntries(FLOWER_ORDER.map((flowerId) => [
        flowerId,
        data.stockMinimumSkills?.[flowerId] === true
      ]));
      this.bouquetSpecializations = Object.fromEntries(BOUQUET_CATEGORIES.map((category) => [
        category.id,
        data.bouquetSpecializations?.[category.id] === true
      ]));
      if (
        data.employmentVersion === 1
        && data.employment
        && typeof data.employment.active === 'object'
      ) {
        this.employment = {
          active: {
            cashier: data.employment.active.cashier === true && this.hasEmployee('cashier'),
            harvester: data.employment.active.harvester === true && this.hasEmployee('harvester'),
            bouquetAssistant: data.employment.active.bouquetAssistant === true
              && this.hasEmployee('bouquetAssistant')
          },
          nextPayrollAt: Number.isFinite(data.employment.nextPayrollAt)
            ? data.employment.nextPayrollAt
            : null
        };
      } else {
        // Existing upgrades are grandfathered with one full game day before their first salary.
        this.employment.active.cashier = this.hasEmployee('cashier');
        this.employment.active.harvester = this.hasEmployee('harvester');
        this.employment.active.bouquetAssistant = this.hasEmployee('bouquetAssistant');
        this.employment.nextPayrollAt = this.hasActiveEmployees()
          ? Date.now() + GAME_DAY_MS
          : null;
      }
      this.settings = { ...this.settings, ...(data.settings || {}) };
      this.unlockedFlowers = { ...this.unlockedFlowers, ...(data.unlockedFlowers || {}) };
      if (Array.isArray(data.discoveredBouquets)) {
        this.discoveredBouquets = data.discoveredBouquets
          .map((recipe) => typeof recipe === 'string' ? recipe.split('+') : [])
          .filter((flowerIds) => flowerIds.length > 0 && flowerIds.every((id) => VALID_FLOWER_IDS.has(id)))
          .map((flowerIds) => flowerIds.sort().join('+'))
          .filter((recipe, index, recipes) => recipes.indexOf(recipe) === index);
      }
      if (Array.isArray(data.orders)) {
        const completedOrderIds = new Set(
          data.orders
            .filter((order) => order?.isCompleted === true && VALID_ORDER_IDS.has(order.id))
            .map((order) => order.id)
        );
        this.orders = JSON.parse(JSON.stringify(SPECIAL_ORDERS))
          .map((order) => ({ ...order, isCompleted: completedOrderIds.has(order.id) }));
      }
      this.orderCycle = Number.isSafeInteger(data.orderCycle) && data.orderCycle >= 1
        ? data.orderCycle
        : 1;
      if (this.orders.length > 0 && this.orders.every((order) => order.isCompleted)) {
        this.orderCycle = Math.min(Number.MAX_SAFE_INTEGER, this.orderCycle + 1);
        this.orders = JSON.parse(JSON.stringify(SPECIAL_ORDERS));
      }
      if (data.stats) this.stats = { ...this.stats, ...data.stats };
      const currentChallengePeriods = this.getChallengePeriodIds();
      this.challengeCycles = { ...this.createChallengeCycles(), ...(data.challengeCycles || {}) };
      const challengePools = { daily: DAILY_CHALLENGE_POOL, weekly: WEEKLY_CHALLENGE_POOL };
      const loadNow = Date.now();
      this.challengeGrace = [];
      for (const entry of Array.isArray(data.challengeGrace) ? data.challengeGrace : []) {
        const type = entry?.type;
        const cycle = entry?.cycle;
        if (!['daily', 'weekly'].includes(type) || !isValidChallengePeriod(type, cycle)) continue;
        const challenge = challengePools[type].find((candidate) => (
          entry.id === `${type}-${cycle}-${candidate.id}`
        ));
        const claimUntil = getChallengePeriodEnd(type, cycle) + CHALLENGE_CLAIM_GRACE_MS;
        if (
          !challenge
          || entry.complete !== true
          || entry.claimed === true
          || loadNow > claimUntil
        ) continue;
        this.challengeGrace.push({
          ...challenge,
          id: entry.id,
          cycle,
          type,
          progress: challenge.target,
          complete: true,
          claimed: false,
          claimUntil
        });
      }
      for (const type of ['daily', 'weekly']) {
        const savedCycle = data.challengeCycles?.[type];
        const validBaseline = savedCycle?.baseline
          && CHALLENGE_STAT_KEYS.every((key) => Number.isFinite(savedCycle.baseline[key]));
        const validClaims = Array.isArray(savedCycle?.claimed)
          && savedCycle.claimed.every((id) => typeof id === 'string');
        if (
          savedCycle?.period
          && isValidChallengePeriod(type, savedCycle.period)
          && savedCycle.period !== currentChallengePeriods[type]
          && validBaseline
          && validClaims
          && loadNow <= getChallengePeriodEnd(type, savedCycle.period) + CHALLENGE_CLAIM_GRACE_MS
        ) {
          for (const challenge of this.getChallengeEntries(type, savedCycle)) {
            const alreadyArchived = this.challengeGrace.some((entry) => entry.id === challenge.id);
            if (challenge.complete && !challenge.claimed && !alreadyArchived) {
              this.challengeGrace.push({
                ...challenge,
                cycle: savedCycle.period,
                claimUntil: getChallengePeriodEnd(type, savedCycle.period) + CHALLENGE_CLAIM_GRACE_MS
              });
            }
          }
        }
      }
      for (const type of ['daily', 'weekly']) {
        const savedCycle = data.challengeCycles?.[type];
        const validBaseline = savedCycle?.baseline
          && CHALLENGE_STAT_KEYS.every((key) => Number.isFinite(savedCycle.baseline[key]));
        const validClaims = Array.isArray(savedCycle?.claimed)
          && savedCycle.claimed.every((id) => typeof id === 'string');
        this.challengeCycles[type] = savedCycle?.period === currentChallengePeriods[type]
          && validBaseline
          && validClaims
          ? {
              period: savedCycle.period,
              baseline: Object.fromEntries(CHALLENGE_STAT_KEYS.map((key) => [
                key,
                Math.max(0, savedCycle.baseline[key])
              ])),
              claimed: [...new Set(savedCycle.claimed)]
            }
          : this.createChallengeCycle(currentChallengePeriods[type]);
      }
      const savedFavorite = data.favoriteObjective;
      this.favoriteObjective = savedFavorite
        && typeof savedFavorite === 'object'
        && (
          (savedFavorite.type === 'challenge' && typeof savedFavorite.id === 'string')
          || (savedFavorite.type === 'project' && VALID_PROJECT_IDS.has(savedFavorite.id))
          || (savedFavorite.type === 'collection' && VALID_EXHIBITION_IDS.has(savedFavorite.id))
        )
        ? { type: savedFavorite.type, id: savedFavorite.id }
        : null;
      this.specialVisitors = Array.isArray(data.specialVisitors)
        ? [...new Set(data.specialVisitors.filter((id) => VISITOR_IDS.has(id)))]
        : [];
      this.zoneFindings = Object.fromEntries(Object.entries(ZONE_ACTIVITY_CONFIG).map(([zoneId, zone]) => [
        zoneId,
        Array.isArray(data.zoneFindings?.[zoneId])
          ? [...new Set(data.zoneFindings[zoneId].filter((id) => zone.findings.some((finding) => finding.id === id)))]
          : []
      ]));
      this.gardenDecorations = Object.fromEntries(
        Object.entries(data.gardenDecorations || {}).flatMap(([indexText, position]) => {
          const index = Number(indexText);
          if (
            !Number.isInteger(index)
            || !PLACEABLE_DECORATION_INDICES.has(index)
            || !Number.isFinite(position?.x)
            || !Number.isFinite(position?.y)
            || position.x < 40
            || position.x > 2260
            || position.y < 40
            || position.y > 1160
          ) return [];
          return [[index, { x: position.x, y: position.y }]];
        })
      );
      if (data.economyVersion !== 2) {
        const legacyTotalEarned = Math.max(0, Number(data.stats?.totalCoinsEarned) || 0);
        this.stats.totalCoinsEarned = Math.max(0, legacyTotalEarned - 20);
      }
      if (!Number.isFinite(data.stats?.totalCoinsSpent)) {
        const legacyTotalEarned = data.economyVersion === 2
          ? this.stats.totalCoinsEarned
          : Math.max(0, Number(data.stats?.totalCoinsEarned) || 0);
        this.stats.totalCoinsSpent = Math.max(
          0,
          legacyTotalEarned - this.coins
        );
      }
      if (data.tutorial && typeof data.tutorial === 'object') {
        this.tutorial = {
          currentStep: Number.isInteger(data.tutorial.currentStep)
            ? Math.max(0, data.tutorial.currentStep)
            : 0,
          completed: data.tutorial.completed === true
        };
      }

      // Restaurar parcelas
      if (Array.isArray(data.plots)) {
        const savedUnlocked = data.plots.filter((plot) => plot && plot.unlocked && FLOWERS_CONFIG[plot.flowerId]);
        const defaultStarter = this.plots.find((plot) => plot.id === 0);
        this.plots = savedUnlocked.map((savedPlot) => {
          const basePlot = savedPlot.id === 0 && defaultStarter
            ? defaultStarter
            : {
                id: savedPlot.id,
                flowerId: savedPlot.flowerId,
                unlocked: true,
                optional: savedPlot.optional === true,
                cost: Number(savedPlot.cost) || 0,
                gridX: 0,
                gridY: 0,
                flowers: Array.from({ length: 6 }, () => ({ progress: 0.5, timer: 0 }))
              };
          basePlot.optional = savedPlot.optional === true;
          basePlot.unlocked = true;
          basePlot.wateredAt = Number.isFinite(savedPlot.wateredAt) && savedPlot.wateredAt >= 0
            ? savedPlot.wateredAt
            : 0;
          basePlot.wateredUntil = Number.isFinite(savedPlot.wateredUntil) && savedPlot.wateredUntil >= 0
            ? savedPlot.wateredUntil
            : 0;
          if (Array.isArray(savedPlot.flowers)) {
            basePlot.flowers = Array.from({ length: 6 }, (_, index) => {
              const savedFlower = savedPlot.flowers[index];
              const progress = Number(savedFlower && savedFlower.progress);
              return { progress: Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0.5, timer: 0 };
            });
          }
          return basePlot;
        });
        if (!this.plots.some((plot) => plot.id === 0)) {
          this.plots.unshift(defaultStarter);
        }
        this.plots.forEach((plot, index) => {
          plot.gridX = index % FIELD_PLOT_COLUMNS;
          plot.gridY = Math.floor(index / FIELD_PLOT_COLUMNS);
        });
        this.ensureNextPlot();
      }

      const now = Date.now();
      const offlineResult = this.processOfflineEmployment(data.lastSaveTime, now);
      this.lastSaveTime = now;
      this.save();
      this.notify('state_loaded');
      return offlineResult;
    } catch (e) {
      this.saveBlocked = true;
      console.warn('Erro ao carregar progresso:', e);
      return null;
    }
  }

  importSaveData(data) {
    try {
      const normalized = {
        ...migrateSaveData(data),
        lastSaveTime: Date.now()
      };
      const serialized = JSON.stringify(normalized);
      if (!parseSaveData(serialized)) return null;
      const currentSave = localStorage.getItem(STORAGE_KEY);
      if (parseSaveData(currentSave)) {
        localStorage.setItem(BACKUP_STORAGE_KEY, currentSave);
      }
      localStorage.setItem(STORAGE_KEY, serialized);
      return this.load();
    } catch (e) {
      console.warn('Erro ao importar progresso da conta:', e);
      return null;
    }
  }

  processOfflineEmployment(lastSaveTime, now = Date.now()) {
    const lastSavedAt = Number(lastSaveTime);
    if (!Number.isFinite(lastSavedAt) || lastSavedAt <= 0 || now <= lastSavedAt) {
      return { offlineGain: 0, wagesPaid: 0, suspendedRoles: [] };
    }

    const elapsedMs = Math.min(MAX_OFFLINE_MS, now - lastSavedAt);
    let cursor = now - elapsedMs;
    if (
      this.employment.nextPayrollAt !== null
      && this.employment.nextPayrollAt < cursor
      && this.hasActiveEmployees()
    ) {
      this.employment.nextPayrollAt = cursor;
    }
    let offlineGain = 0;
    let wagesPaid = 0;
    const suspendedRoles = [];

    const addOfflineRevenue = (seconds) => {
      if (seconds <= 60 || !this.isEmployeeActive('cashier') || !this.isEmployeeActive('harvester')) return;
      const harvesters = this.upgrades.harvester || 0;
      const totalFlowers = Math.floor((seconds / 60) * harvesters * 1.5 * 0.4);
      const earned = totalFlowers * 8;
      if (earned > 0) {
        this.coins += earned;
        this.stats.totalCoinsEarned += earned;
        offlineGain += earned;
      }
    };

    if (this.hasActiveEmployees() && !this.employment.nextPayrollAt) {
      this.employment.nextPayrollAt = cursor + GAME_DAY_MS;
    }

    let safety = 0;
    while (
      this.employment.nextPayrollAt !== null
      && this.employment.nextPayrollAt <= now
      && safety < MAX_OFFLINE_MS / GAME_DAY_MS
    ) {
      safety++;
      const payrollAt = this.employment.nextPayrollAt;
      addOfflineRevenue(Math.max(0, payrollAt - cursor) / 1000);
      cursor = payrollAt;

      const roles = this.getActiveEmployeeRoles();
      if (roles.length === 0) {
        this.employment.nextPayrollAt = null;
        break;
      }

      const amount = roles.reduce((total, role) => total + this.getEmployeeDailyWage(role), 0);
      if (!this.spendCoins(amount)) {
        for (const role of roles) {
          this.employment.active[role] = false;
        }
        suspendedRoles.push(...roles);
        this.employment.nextPayrollAt = null;
        this.notify('employee_contracts_suspended', { roles, amount, offline: true });
        break;
      }

      wagesPaid += amount;
      this.employment.nextPayrollAt += GAME_DAY_MS;
    }

    if (cursor < now) {
      addOfflineRevenue((now - cursor) / 1000);
    }

    return { offlineGain, wagesPaid, suspendedRoles: [...new Set(suspendedRoles)] };
  }

  clearProgress() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BACKUP_STORAGE_KEY);
    this.resetToDefaults();
    this.notify('game_reset');
  }
}

export const state = new GameState();
