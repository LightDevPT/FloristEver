// ========================================================
// FloristEver v2.0.0 — Configuração Oficial do Subsolo (subsolo-config.js)
// Dados do negócio subterrâneo secreto (Nível 33)
// ========================================================

export const SUBSOLO_ENABLED = true;
export const SUBSOLO_UNLOCK_LEVEL = 33;
export const SUBSOLO_CONCESSION_COST = 240000; // Moedas (calibrado para amortização em 13h)

export const PALETTE_SUBSOLO = Object.freeze({
  brick: '#6B5A52',
  brickDark: '#4A3C36',
  water: '#5E8C8A',
  iron: '#3E4A52',
  ironLight: '#596770',
  amber: '#FFC857',
  growLight: '#B56BFF',
  growGlow: 'rgba(181, 107, 255, 0.25)',
  outline: '#2A2F33',
  pipe: '#53626C',
  ratFur: '#8B7355',
  moss: '#4A6B4F',
  hudBg: 'rgba(30, 36, 40, 0.92)'
});

export const SUBSOLO_VARIETIES = Object.freeze({
  sombra_verde: {
    id: 'sombra_verde',
    name: 'Sombra Verde',
    requiredRespect: 1,
    growthTimeSeconds: 15 * 60, // 15 min
    dryingTimeSeconds: 8 * 60,   // 8 min
    yieldLeaves: 6,
    odorRate: 1.0,
    seedCost: 500,
    icon: '🌿',
    color: '#4FA868',
    description: 'Variedade rústica com folhas resistentes que crescem bem sob lâmpadas fracas.'
  },
  luar_roxo: {
    id: 'luar_roxo',
    name: 'Luar Roxo',
    requiredRespect: 3,
    growthTimeSeconds: 22 * 60, // 22 min
    dryingTimeSeconds: 10 * 60,  // 10 min
    yieldLeaves: 8,
    odorRate: 0.5, // Baixo odor
    seedCost: 1200,
    icon: '🔮',
    color: '#8A5FB8',
    description: 'Aroma subtil e discreto, ideal para reduzir o Odor no túnel.'
  },
  ambar_seco: {
    id: 'ambar_seco',
    name: 'Âmbar Seco',
    requiredRespect: 8,
    growthTimeSeconds: 10 * 60, // 10 min (rápida)
    dryingTimeSeconds: 6 * 60,   // 6 min
    yieldLeaves: 5,
    odorRate: 1.3,
    seedCost: 1800,
    icon: '🍂',
    color: '#D49244',
    description: 'Ciclo rápido e folhas douradas, mas produz mais resíduo e Odor.'
  },
  raiz_dourada: {
    id: 'raiz_dourada',
    name: 'Raiz Dourada',
    requiredRespect: 15,
    growthTimeSeconds: 32 * 60, // 32 min (lenta e nobre)
    dryingTimeSeconds: 14 * 60,  // 14 min
    yieldLeaves: 12,
    odorRate: 2.0,
    seedCost: 3500,
    icon: '✨',
    color: '#DDAA33',
    description: 'A cepa lendária do Subsolo: rendimento excecional e valor muito elevado.'
  }
});

export const SUBSOLO_VARIETY_ORDER = Object.freeze([
  'sombra_verde',
  'luar_roxo',
  'ambar_seco',
  'raiz_dourada'
]);

export const SUBSOLO_PRODUCTS = Object.freeze({
  ramo: {
    id: 'ramo',
    name: 'Ramo Discreto',
    requiredLeaves: 2,
    minQuality: 1,
    baseValue: 7920, // 18u
    prepTimeSeconds: 3 * 60, // 3 min por lote
    requiredRespect: 1,
    icon: '📦',
    description: 'Duas folhas secas selecionadas, atadas de forma limpa e discreta.'
  },
  maco: {
    id: 'maco',
    name: 'Maço Especial',
    requiredLeaves: 5,
    minQuality: 3,
    baseValue: 12320, // 28u
    prepTimeSeconds: 5 * 60, // 5 min
    requiredRespect: 6,
    icon: '🎁',
    description: 'Composição de cinco folhas secas de alta qualidade com acabamento cuidado.'
  },
  reserva: {
    id: 'reserva',
    name: 'Reserva da Casa',
    requiredLeaves: 10,
    minQuality: 4,
    baseValue: 21120, // 48u
    prepTimeSeconds: 8 * 60, // 8 min
    requiredRespect: 10,
    icon: '👑',
    description: 'Lote supremo com dez folhas maturadas e seladas em pano escuro.'
  }
});

export const SUBSOLO_PRODUCT_ORDER = Object.freeze(['ramo', 'maco', 'reserva']);

// Níveis de Respeito do Subsolo (S1 a S20)
export const SUBSOLO_RESPECT_CONFIG = Object.freeze([
  { level: 1,  minGlobalLevel: 33, xpNeeded: 120,  title: 'Novato das Sombras', unlocks: 'Secção 1, 4 canteiros, Ramo Discreto, Mala inicial' },
  { level: 2,  minGlobalLevel: 33, xpNeeded: 260,  title: 'Arrumador', unlocks: 'Gerador a combustível, expansão da Mala (15)' },
  { level: 3,  minGlobalLevel: 34, xpNeeded: 420,  title: 'Conhecido', unlocks: 'Secção 2, Variedade Luar Roxo, ventilação' },
  { level: 4,  minGlobalLevel: 34, xpNeeded: 600,  title: 'Discreto', unlocks: 'Ajudante Mensageiro, embalagens avançadas' },
  { level: 5,  minGlobalLevel: 35, xpNeeded: 820,  title: 'Afiançado', unlocks: 'Clientes Regulares, contra-senhas' },
  { level: 6,  minGlobalLevel: 36, xpNeeded: 1100, title: 'Preparador', unlocks: 'Produto Maço Especial, secagem controlada' },
  { level: 7,  minGlobalLevel: 36, xpNeeded: 1450, title: 'Vigilante', unlocks: 'Filtros de ar avançados, Ramo de Fachada' },
  { level: 8,  minGlobalLevel: 37, xpNeeded: 1850, title: 'Comerciante', unlocks: 'Secção 3, Variedade Âmbar Seco' },
  { level: 9,  minGlobalLevel: 38, xpNeeded: 2300, title: 'Confidente', unlocks: 'Capacidade do Cofre (30), Mala (25)' },
  { level: 10, minGlobalLevel: 39, xpNeeded: 2850, title: 'Atacadista', unlocks: 'Produto Reserva da Casa, clientes atacadistas' },
  { level: 11, minGlobalLevel: 40, xpNeeded: 3500, title: 'Mestre do Túnel', unlocks: 'Bancada dupla de preparação' },
  { level: 12, minGlobalLevel: 41, xpNeeded: 4250, title: 'Engenhoso', unlocks: 'Automação: Jardineiro Subterrâneo' },
  { level: 13, minGlobalLevel: 42, xpNeeded: 5100, title: 'Industrial', unlocks: 'Automação: Secador Subterrâneo' },
  { level: 14, minGlobalLevel: 43, xpNeeded: 6100, title: 'Influente', unlocks: 'Secção 4, Capacidade do Armazém (120)' },
  { level: 15, minGlobalLevel: 44, xpNeeded: 7200, title: 'Grão-Mestre', unlocks: 'Secção 5, Variedade Raiz Dourada' },
  { level: 16, minGlobalLevel: 45, xpNeeded: 8500, title: 'Intocável', unlocks: 'Cofre Secreto Blindado (45)' },
  { level: 17, minGlobalLevel: 46, xpNeeded: 10000, title: 'Barão da Cave', unlocks: 'Mala Gigante (40), gerador silencioso' },
  { level: 18, minGlobalLevel: 47, xpNeeded: 11700, title: 'Sombra Maior', unlocks: 'Armazém Oculto (200)' },
  { level: 19, minGlobalLevel: 48, xpNeeded: 13600, title: 'Lenda Urbana', unlocks: 'Secção 6 (Final)' },
  { level: 20, minGlobalLevel: 50, xpNeeded: 16000, title: 'Senhor do Subsolo', unlocks: 'Estatuto Máximo, Vitrine de Honra' }
]);

export const SUBSOLO_SECTION_COSTS = Object.freeze([
  0,        // S1 (inclusa na concessão)
  0,        // S1
  350000,   // S2
  750000,   // S3
  1500000,  // S4
  3000000,  // S5
  6000000   // S6
]);

export const SUBSOLO_UPGRADES_CONFIG = Object.freeze({
  canteiros: {
    id: 'canteiros',
    name: 'Canteiros Subterrâneos',
    maxLevel: 12,
    baseCost: 80000,
    costMultiplier: 1.45,
    getCost: (lvl) => Math.round(80000 * Math.pow(1.45, lvl)),
    description: 'Adiciona +1 canteiro iluminado para cultivo.'
  },
  secadores: {
    id: 'secadores',
    name: 'Estendais de Secagem',
    maxLevel: 8,
    baseCost: 65000,
    costMultiplier: 1.5,
    getCost: (lvl) => Math.round(65000 * Math.pow(1.5, lvl)),
    description: 'Adiciona +1 estendal para secagem simultânea de folhas.'
  },
  preparacao: {
    id: 'preparacao',
    name: 'Bancadas de Preparação',
    maxLevel: 4,
    baseCost: 100000,
    costMultiplier: 1.6,
    getCost: (lvl) => Math.round(100000 * Math.pow(1.6, lvl)),
    description: 'Aumenta a velocidade de corte e preparação em 20% por nível.'
  },
  armazem: {
    id: 'armazem',
    name: 'Capacidade do Armazém Oculto',
    maxLevel: 10,
    baseCost: 50000,
    costMultiplier: 1.4,
    getCost: (lvl) => Math.round(50000 * Math.pow(1.4, lvl)),
    description: 'Aumenta em +15 a capacidade máxima de cada produto guardado no subsolo.'
  },
  mala: {
    id: 'mala',
    name: 'Mala de Fundo Falso',
    maxLevel: 6,
    baseCost: 40000,
    costMultiplier: 1.45,
    getCost: (lvl) => Math.round(40000 * Math.pow(1.45, lvl)),
    description: 'Permite transportar mais +5 produtos ao subir a escada.'
  },
  cofre: {
    id: 'cofre',
    name: 'Cofre Disfarçado do Balcão',
    maxLevel: 5,
    baseCost: 70000,
    costMultiplier: 1.55,
    getCost: (lvl) => Math.round(70000 * Math.pow(1.55, lvl)),
    description: 'Aumenta a capacidade de produto pronto a vender na superfície (+6 por nível).'
  },
  filtros: {
    id: 'filtros',
    name: 'Filtros de Carvão e Ar',
    maxLevel: 6,
    baseCost: 90000,
    costMultiplier: 1.5,
    getCost: (lvl) => Math.round(90000 * Math.pow(1.5, lvl)),
    description: 'Reduz o Odor e atrasa a acumulação de Calor em 15% por nível.'
  },
  gerador: {
    id: 'gerador',
    name: 'Depósito e Gerador Reforçado',
    maxLevel: 5,
    baseCost: 85000,
    costMultiplier: 1.5,
    getCost: (lvl) => Math.round(85000 * Math.pow(1.5, lvl)),
    description: 'Aumenta a capacidade do reservatório de combustível em +25 litros.'
  },
  mensageiro: {
    id: 'mensageiro',
    name: 'Ajudante Mensageiro',
    maxLevel: 3,
    baseCost: 350000,
    costMultiplier: 2.0,
    getCost: (lvl) => Math.round(350000 * Math.pow(2.0, lvl)),
    description: 'Transporta produto do Armazém para o Cofre silenciosamente. Nunca vende aos clientes.'
  }
});

// Embalagens para a venda na superfície
export const PACKAGING_OPTIONS = Object.freeze([
  { id: 'none', label: 'Sem disfarce', cost: 0, heatBonus: 4, repBonus: 0, desc: 'Rápido, mas chama mais atenção (+4 Calor)' },
  { id: 'paper', label: 'Saco de papel pardo', cost: 200, heatBonus: 1, repBonus: 5, desc: 'Disfarce simples e acessível (+1 Calor)' },
  { id: 'tea_box', label: 'Caixa de folhas de chá', cost: 600, heatBonus: 0, repBonus: 15, desc: 'Disfarce neutro e seguro (0 Calor)' },
  { id: 'facade_bouquet', label: 'Ramo de Fachada', cost: 0, consumesFlowers: 2, heatBonus: -2, repBonus: 30, desc: 'Escondido dentro de flores comuns (-2 Calor, +30 XP)' }
]);

// Dicionário de Códigos de Jardim
export const GARDEN_CODE_DICTIONARY = Object.freeze([
  { id: 'code_ramo_1', phrase: 'Uma tulipa de domingo', productId: 'ramo', quantity: 1, quality: 1 },
  { id: 'code_ramo_2', phrase: 'Dois rebentos da horta', productId: 'ramo', quantity: 2, quality: 1 },
  { id: 'code_maco_1', phrase: 'O buquê do avô', productId: 'maco', quantity: 1, quality: 3 },
  { id: 'code_maco_2', phrase: 'Arranjo com folhas largas', productId: 'maco', quantity: 2, quality: 3 },
  { id: 'code_reserva_1', phrase: 'Algo do jardim da cave', productId: 'reserva', quantity: 1, quality: 4 },
  { id: 'code_reserva_2', phrase: 'O frasco do fundo da prateleira', productId: 'reserva', quantity: 2, quality: 4 },
  { id: 'code_variety_luar', phrase: 'Sem espinhos e bem serena', varietyId: 'luar_roxo' },
  { id: 'code_variety_ambar', phrase: 'Seca ao sol poente', varietyId: 'ambar_seco' },
  { id: 'code_quality_3', phrase: 'Bem regada esta manhã', minQuality: 3 },
  { id: 'code_urgent', phrase: 'Ainda com o orvalho de ontem', urgent: true }
]);

// Contra-senhas para clientes regulares (S5+)
export const COUNTERSIGNS = Object.freeze([
  {
    prompt: 'O vento corre forte no vale hoje?',
    correct: 'Só dentro dos canos antigos.',
    distractors: ['Sim, a tempestade aproxima-se.', 'Não sinto ar nenhum.']
  },
  {
    prompt: 'Tens sementes que brotam no escuro?',
    correct: 'Sob a lâmpada certa, tudo floresce.',
    distractors: ['As flores precisam de sol pleno.', 'As sementes estão esgotadas.']
  },
  {
    prompt: 'O carteiro passou pela porta traseira?',
    correct: 'Deixou apenas um saco fechado.',
    distractors: ['Não temos entregas à tarde.', 'Passou pela entrada principal.']
  }
]);

/**
 * Rotação determinística do dicionário a cada 14 dias (offline-first).
 */
export function getSeasonalDictionaryVersion(timestamp = Date.now()) {
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
  return Math.floor(timestamp / TWO_WEEKS_MS) % 4 + 1;
}
