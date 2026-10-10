// ========================================================
// FloristEver - Configuração das Melhorias (Upgrades)
// ========================================================

const SHOP_EXPANSION_SIZE_INCREASES = Object.freeze([
  Object.freeze({ width: 0, height: 0 }),
  Object.freeze({ width: 50, height: 20 }),
  Object.freeze({ width: 100, height: 44 }),
  Object.freeze({ width: 140, height: 66 })
]);

export function getShopExpansionVisualSize(level, baseWidth = 200, baseHeight = 130) {
  if (
    !Number.isSafeInteger(level)
    || level < 0
    || level >= SHOP_EXPANSION_SIZE_INCREASES.length
    || !Number.isFinite(baseWidth)
    || baseWidth <= 0
    || !Number.isFinite(baseHeight)
    || baseHeight <= 0
  ) {
    throw new RangeError('O nível ou as dimensões da expansão da floricultura são inválidos.');
  }
  const increase = SHOP_EXPANSION_SIZE_INCREASES[level];
  return {
    width: baseWidth + increase.width,
    height: baseHeight + increase.height
  };
}

export const UPGRADES_CONFIG = {
  cashier: {
    id: 'cashier',
    category: 'service',
    name: 'Caixa Automático',
    iconKey: 'cashier',
    description: 'Atende clientes de forma automática no balcão sem precisares de estar lá.',
    nextEffectDesc: () => 'Passa a atender automaticamente os clientes quando há flores em stock.',
    cost: 200,
    requiredLevel: 2,
    dailyWage: 10,
    maxLevel: 1,
    type: 'single',
    effectDesc: (lvl) => lvl > 0 ? 'Ativo (Vendas automáticas no balcão)' : 'Clientes precisam de atendimento manual com [E]'
  },
  harvester: {
    id: 'harvester',
    category: 'cultivation',
    name: 'Florista Ajudante',
    iconKey: 'harvester',
    description: 'Contrata um florista dedicado que colhe flores maduras e abastece o stock. Com contrato ativo e nível 5, os ajudantes também preparam pedidos de ramos no balcão.',
    nextEffectDesc: () => 'Adiciona 1 ajudante para colher flores e, a partir do nível 5, preparar pedidos de ramos no balcão.',
    baseCost: 400,
    costMultiplier: 1.8,
    requiredLevel: 3,
    dailyWage: 8,
    maxLevel: 5,
    type: 'tiered',
    getCost: (lvl) => Math.round(400 * Math.pow(1.8, lvl)),
    effectDesc: (lvl) => `${lvl} / 5 ajudantes a trabalhar no campo`
  },
  bouquetAssistant: {
    id: 'bouquetAssistant',
    category: 'service',
    name: 'Florista de Ramos',
    iconKey: 'bouquet',
    description: 'Contrata um florista que compõe e vende ramos com o stock disponível, sem usar flores reservadas pelo stock mínimo.',
    nextEffectDesc: () => 'Cria e vende automaticamente ramos adequados ao stock e às especializações compradas.',
    cost: 6000,
    requiredLevel: 5,
    dailyWage: 18,
    maxLevel: 1,
    type: 'single',
    effectDesc: (lvl) => lvl > 0 ? 'Criação e venda automática de ramos' : 'Sem ajudante de criação de ramos'
  },
  basketCapacity: {
    id: 'basketCapacity',
    category: 'equipment',
    name: 'Cesto de Vime Expandido',
    iconKey: 'basket',
    description: 'Aumenta a capacidade de carga do teu cesto em +5 flores por nível.',
    nextEffectDesc: (lvl) => `Aumenta a capacidade de ${10 + lvl * 5} para ${15 + lvl * 5} flores (+5).`,
    baseCost: 80,
    costMultiplier: 1.5,
    maxLevel: 10,
    type: 'tiered',
    getCost: (lvl) => Math.round(80 * Math.pow(1.5, lvl)),
    effectDesc: (lvl) => `Capacidade atual: ${10 + lvl * 5} flores`
  },
  speedBoots: {
    id: 'speedBoots',
    category: 'equipment',
    name: 'Botas de Jardineiro',
    iconKey: 'speedBoots',
    description: 'Aumenta a velocidade de deslocação em +10% por nível.',
    nextEffectDesc: (lvl) => `Aumenta o bónus de velocidade de ${lvl * 10}% para ${(lvl + 1) * 10}%.`,
    baseCost: 100,
    costMultiplier: 1.45,
    maxLevel: 10,
    type: 'tiered',
    getCost: (lvl) => Math.round(100 * Math.pow(1.45, lvl)),
    effectDesc: (lvl) => `Bónus de velocidade: +${lvl * 10}%`
  },
  growthSpeed: {
    id: 'growthSpeed',
    category: 'cultivation',
    name: 'Composto Botânico e Rega',
    iconKey: 'growthSpeed',
    description: 'Acelera o ciclo de maturação de todas as flores em 8% por nível.',
    nextEffectDesc: (lvl) => `Reduz o tempo de crescimento de ${lvl * 8}% para ${(lvl + 1) * 8}%.`,
    baseCost: 250,
    costMultiplier: 1.6,
    maxLevel: 10,
    type: 'tiered',
    getCost: (lvl) => Math.round(250 * Math.pow(1.6, lvl)),
    effectDesc: (lvl) => `Redução de tempo: -${lvl * 8}%`
  },
  counterUpgrade: {
    id: 'counterUpgrade',
    category: 'service',
    name: 'Balcão de Atendimento em Madeira',
    iconKey: 'counterUpgrade',
    description: 'Aumenta a frequência de chegada dos clientes. O intervalo tem um limite mínimo.',
    nextEffectDesc: (lvl, gameLevel = 1) => {
      const currentInterval = Math.max(0.45, 1 - lvl * 0.12 - (gameLevel - 1) * 0.03);
      const nextInterval = Math.max(0.45, 1 - (lvl + 1) * 0.12 - (gameLevel - 1) * 0.03);
      const reduction = Math.round((currentInterval - nextInterval) * 100);
      return reduction > 0
        ? `Reduz o intervalo entre clientes em mais ${reduction} pontos percentuais.`
        : 'O intervalo de chegada já atingiu o mínimo; esta melhoria não o reduz mais.';
    },
    baseCost: 350,
    costMultiplier: 1.7,
    maxLevel: 5,
    type: 'tiered',
    getCost: (lvl) => Math.round(350 * Math.pow(1.7, lvl)),
    effectDesc: (lvl, gameLevel = 1) => {
      const interval = Math.max(0.45, 1 - lvl * 0.12 - (gameLevel - 1) * 0.03);
      return `Intervalo entre chegadas: ${Math.round(interval * 100)}% do base (mínimo: 45%)`;
    }
  },
  shopDecor: {
    id: 'shopDecor',
    category: 'shop',
    name: 'Mostruários Botânicos',
    iconKey: 'shopDecor',
    description: 'Vasos floridos e montras que concedem +20% bónus de Reputação (XP).',
    nextEffectDesc: (lvl) => `Aumenta o bónus de reputação de ${lvl * 20}% para ${(lvl + 1) * 20}%.`,
    baseCost: 500,
    costMultiplier: 1.8,
    maxLevel: 5,
    type: 'tiered',
    getCost: (lvl) => Math.round(500 * Math.pow(1.8, lvl)),
    effectDesc: (lvl) => `Bónus de XP por venda: +${lvl * 20}%`
  },
  shopExpansion: {
    id: 'shopExpansion',
    category: 'shop',
    name: 'Expansão da Floricultura',
    iconKey: 'shopExpansion',
    description: 'Expande fisicamente a fachada e o espaço interior da loja; também aumenta em 20 unidades o limite individual de stock de cada flor.',
    nextEffectDesc: (lvl) => {
      const current = getShopExpansionVisualSize(lvl);
      const next = getShopExpansionVisualSize(lvl + 1);
      return `Aumenta o stock por flor de ${20 + lvl * 20} para ${40 + lvl * 20} unidades e a loja de ${current.width}×${current.height} para ${next.width}×${next.height} no mapa.`;
    },
    baseCost: 500,
    costMultiplier: 3,
    maxLevel: 3,
    type: 'tiered',
    getCost: (lvl) => Math.round(500 * Math.pow(3, lvl)),
    getRequiredLevel: (lvl) => 3 + lvl * 3,
    effectDesc: (lvl) => {
      const { width, height } = getShopExpansionVisualSize(lvl);
      return `Loja ${width}×${height} no mapa · limite ${20 + lvl * 20} por flor`;
    }
  },
  bouquetBench: {
    id: 'bouquetBench',
    category: 'bouquet',
    iconKey: 'bouquet',
    name: 'Acabamento Premium de Ramos',
    description: 'Aumenta em 10% o valor de venda dos ramos criados na bancada.',
    nextEffectDesc: () => 'Acrescenta um bónus de 10% ao valor de venda de cada ramo.',
    cost: 1500,
    requiredLevel: 5,
    maxLevel: 1,
    type: 'special',
    bonusPerLevel: 0.1,
    effectDesc: (lvl) => lvl > 0 ? 'Bónus atual no valor dos ramos: +10%' : 'Sem bónus de venda de ramos'
  }
};
