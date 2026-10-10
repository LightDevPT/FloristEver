// ========================================================
// FloristEver - Configuração da Bancada de Ramos e Encomendas
// ========================================================
import { PALETTE } from '../utils.js';

export const BOUQUET_CATEGORIES = [
  { id: 'simple', label: 'Ramo simples', min: 0, max: 1.2, specializationCost: 1200, bonus: 0.1, requiredLevel: 5 },
  { id: 'harmonious', label: 'Arranjo harmonioso', min: 1.2, max: 1.5, specializationCost: 2400, bonus: 0.12, requiredLevel: 5 },
  { id: 'extraordinary', label: 'Ramo extraordinário', min: 1.5, max: 1.9, specializationCost: 5000, bonus: 0.15, requiredLevel: 8 },
  { id: 'masterpiece', label: 'Obra-prima botânica', min: 1.9, max: Infinity, specializationCost: 10000, bonus: 0.2, requiredLevel: 10 }
];

export const WRAPPERS = [
  {
    id: 'kraft',
    name: 'Papel Kraft Natural',
    color: '#D4B595',
    outline: PALETTE.deepGreen,
    multiplier: 1.15,
    description: 'Estilo rústico e ecológico.'
  },
  {
    id: 'pink',
    name: 'Papel Seda Rosa',
    color: PALETTE.peonyPink,
    outline: PALETTE.raspberryPink,
    multiplier: 1.25,
    description: 'Delicado, doce e romântico.'
  },
  {
    id: 'lavender',
    name: 'Embrulho Imperial Lilás',
    color: PALETTE.lavender,
    outline: '#6B4E9B',
    multiplier: 1.35,
    description: 'Elegante e perfumado.'
  },
  {
    id: 'gold',
    name: 'Cetim Dourado Radiante',
    color: PALETTE.sunYellow,
    outline: '#B8860B',
    multiplier: 1.5,
    description: 'Luxuoso para ocasiões inesquecíveis.'
  }
];

export const ACCESSORIES = [
  {
    id: 'none',
    name: 'Sem Acessório',
    icon: '—',
    multiplier: 1.0,
    description: 'Apenas o encanto natural das flores.'
  },
  {
    id: 'ribbon',
    name: 'Laço de Fita de Cetim',
    icon: '🎀',
    multiplier: 1.2,
    description: 'Um toque clássico e acolhedor.'
  },
  {
    id: 'heart',
    name: 'Coração de Madeira Talhada',
    icon: '💖',
    multiplier: 1.3,
    description: 'Simboliza carinho eterno.'
  },
  {
    id: 'card',
    name: 'Cartão com Poema Escrito à Mão',
    icon: '💌',
    multiplier: 1.35,
    description: 'Palavras sinceras que tocam o coração.'
  },
  {
    id: 'glitter',
    name: 'Glitter de Pó de Estrelas',
    icon: '✨',
    multiplier: 1.45,
    description: 'Pequenos brilhos mágicos que reluzem na luz.'
  }
];

// Encomendas Especiais da Floricultura
export const SPECIAL_ORDERS = [
  {
    id: 'apology_gift',
    title: 'Pedido de Desculpas Carinhoso',
    customerName: 'Afonso',
    clue: 'Preciso de algo sincero que demonstre afeto e arrependimento. Tulipas e margaridas fariam maravilhas.',
    requiredFlowers: ['tulip', 'daisy'],
    minFlowers: 3,
    preferredWrap: 'pink',
    bonusCoins: 120,
    bonusRep: 50,
    isCompleted: false
  },
  {
    id: 'summer_wedding',
    title: 'Casamento Campestre',
    customerName: 'Mariana',
    clue: 'Um arranjo caloroso, repleto de luz e energia solar para celebrar um dia inesquecível! Girassóis são essenciais.',
    requiredFlowers: ['sunflower'],
    minFlowers: 3,
    preferredWrap: 'gold',
    bonusCoins: 350,
    bonusRep: 120,
    isCompleted: false
  },
  {
    id: 'first_date',
    title: 'Primeiro Encontro Romântico',
    customerName: 'Lucas',
    clue: 'Quero impressionar com elegância e amor verdadeiro. Rosas vermelhas embrulhadas com seda rosa!',
    requiredFlowers: ['rose'],
    minFlowers: 3,
    preferredWrap: 'pink',
    requiredWrap: 'pink',
    bonusCoins: 600,
    bonusRep: 180,
    isCompleted: false
  },
  {
    id: 'royal_tribute',
    title: 'Homenagem Botânica Sublime',
    customerName: 'D. Beatriz',
    clue: 'Desejo a mais rara e nobre composição: orquídeas lilases com fita de cetim ou pó de estrelas.',
    requiredFlowers: ['orchid'],
    minFlowers: 4,
    preferredWrap: 'lavender',
    requiredAccessoryIds: ['ribbon', 'glitter'],
    bonusCoins: 1500,
    bonusRep: 350,
    isCompleted: false
  }
];

// Analisador de Harmonia de Ramos
export function calculateBouquetHarmony(flowerIds = [], wrapId = 'kraft', accessoryId = 'none') {
  if (flowerIds.length === 0) {
    return {
      title: 'Vazio',
      description: 'Adiciona flores para compor o ramo.',
      harmonyMultiplier: 1.0,
      valueMultiplier: 1.0,
      bonuses: []
    };
  }

  let multiplier = 1.0;
  let valueMultiplier = 1.0;
  const bonuses = [];

  const counts = {};
  flowerIds.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
  const uniqueCount = Object.keys(counts).length;

  // Bónus de Variedade ou Pureza
  if (flowerIds.length >= 3 && uniqueCount === 1) {
    multiplier += 0.25;
    bonuses.push('Pureza Monocromática (+25%)');
  } else if (uniqueCount >= 3) {
    multiplier += 0.35;
    bonuses.push('Biodiversidade Harmoniosa (+35%)');
    valueMultiplier = 1.3;
    bonuses.push('Variedade de espécies (+30% no valor)');
  } else if (uniqueCount === 2) {
    valueMultiplier = 1.25;
    bonuses.push('Variedade Floral (+25% no valor)');
  }

  // Bónus de Relação Temática
  if (counts['rose'] && counts['tulip']) {
    multiplier += 0.3;
    bonuses.push('Duologia do Amor: Rosa & Tulipa (+30%)');
  }
  if (counts['sunflower'] && counts['daisy']) {
    multiplier += 0.25;
    bonuses.push('Manhã Ensolarada: Girassol & Margarida (+25%)');
  }
  if (counts['orchid']) {
    multiplier += 0.45;
    bonuses.push('Toque Sublime de Orquídea Rara (+45%)');
  }

  let title = 'Ramo Simples';
  if (multiplier >= 1.9) title = 'Obra-Prima Botânica 🌟';
  else if (multiplier >= 1.5) title = 'Ramo Extraordinário ✨';
  else if (multiplier >= 1.2) title = 'Arranjo Harmonioso 🌸';

  return {
    title,
    harmonyMultiplier: Number(multiplier.toFixed(2)),
    valueMultiplier,
    bonuses
  };
}
