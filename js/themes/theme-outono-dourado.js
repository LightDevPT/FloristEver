/* ==========================================================================
   Tema "Outono Dourado" — FloristEver
   Mesma API do HEARTS_GARDEN_THEME (jardim_coracoes).

   Otimizações:
   - Formas complexas (folha, bolota) em Path2D criados UMA vez (nível de módulo).
   - Zero gradientes e zero alocações de objetos/arrays nas funções chamadas por frame
     (arrays de coordenadas e cores são constantes congeladas do módulo).
   - Variação "aleatória" determinística (hash) → sem Math.random por frame,
     sem cintilação entre frames e resultados reproduzíveis.
   - Todas as animações respeitam `reducedEffects` (valores fixos, sem seno/cosseno extra).
   - save()/restore() apenas onde há transformações ou estado alterado.
   ========================================================================== */

const OUTLINE = '#4A2C1E';
const CREAM = '#FFF3DE';

const FLOWER_STYLES = Object.freeze({
  daisy:         { color: '#FFD98A', centerColor: '#B5582A', accent: '#E8892F' },
  tulip:         { color: '#E8742F', centerColor: '#FFF3DE', accent: '#B5382A' },
  sunflower:     { color: '#F5B83D', centerColor: '#5A3321', accent: '#E8892F' },
  rose:          { color: '#B5382A', centerColor: '#F4C9A0', accent: '#E8892F' },
  orchid:        { color: '#D9805A', centerColor: '#7A2E2A', accent: '#FFF3DE' },
  lavender:      { color: '#9C6B8F', centerColor: '#FFF3DE', accent: '#E8B04A' },
  peony:         { color: '#F2A68A', centerColor: '#B5382A', accent: '#E8B04A' },
  camellia:      { color: '#C4503C', centerColor: '#F5B83D', accent: '#FFF3DE' },
  iris:          { color: '#8C5E9E', centerColor: '#F5B83D', accent: '#E8892F' },
  jasmine:       { color: '#FFF3DE', centerColor: '#F5B83D', accent: '#E8892F' },
  gardenia:      { color: '#F7E2C0', centerColor: '#FFF3DE', accent: '#D9805A' },
  anemone:       { color: '#A8402F', centerColor: '#3B2218', accent: '#FFF3DE' },
  dahlia:        { color: '#E8892F', centerColor: '#F5B83D', accent: '#B5382A' },
  chrysanthemum: { color: '#D6A03A', centerColor: '#7A4B33', accent: '#B5382A' },
  foxglove:      { color: '#B07A9E', centerColor: '#FFF3DE', accent: '#7A2E2A' },
  verbena:       { color: '#8E6BA0', centerColor: '#F5B83D', accent: '#FFF3DE' },
  hydrangea:     { color: '#8FAFC4', centerColor: '#FFF3DE', accent: '#B5582A' },
  lotus:         { color: '#F2B79A', centerColor: '#F5B83D', accent: '#FFF3DE' },
  magnolia:      { color: '#F6DCC4', centerColor: '#D9805A', accent: '#FFF3DE' },
  protea:        { color: '#C4503C', centerColor: '#3B2218', accent: '#F5B83D' },
  ranunculus:    { color: '#D9622B', centerColor: '#F5B83D', accent: '#FFF3DE' },
  alstroemeria:  { color: '#E8A05A', centerColor: '#FFF3DE', accent: '#B5382A' }
});

const TREE_PALETTES = Object.freeze([
  Object.freeze({ leafGreen: '#E8892F', highlight: '#F7C873', deepGreen: '#4A2C1E' }),
  Object.freeze({ leafGreen: '#C4503C', highlight: '#F2A68A', deepGreen: '#4A2C1E' }),
  Object.freeze({ leafGreen: '#D6A03A', highlight: '#FFE29A', deepGreen: '#4A2C1E' }),
  Object.freeze({ leafGreen: '#8FA650', highlight: '#D8E39A', deepGreen: '#4A2C1E' })
]);

/* ---------- Formas pré-computadas (criadas uma única vez) ---------- */

const HAS_PATH2D = typeof Path2D !== 'undefined';
// Folha centrada na origem, ~16 de altura (escala = size / 16)
const LEAF_PATH = HAS_PATH2D
  ? new Path2D('M0 -8 C6 -6 7.5 2 0 8 C-7.5 2 -6 -6 0 -8 Z')
  : null;
const LEAF_VEIN = HAS_PATH2D ? new Path2D('M0 -6 L0 7') : null;
// Bolota: corpo + chapéu, ~16 de altura
const ACORN_BODY = HAS_PATH2D
  ? new Path2D('M-4.5 -1 C-4.5 6 -1.5 8.5 0 8.5 C1.5 8.5 4.5 6 4.5 -1 Z')
  : null;
const ACORN_CAP = HAS_PATH2D
  ? new Path2D('M-5.5 -1 C-5.5 -6.5 5.5 -6.5 5.5 -1 Z M0 -6 L0 -8.5')
  : null;

const LEAF_COLORS = Object.freeze(['#E8892F', '#B5382A', '#F5B83D', '#C4503C']);

// Posições (iguais às do tema anterior para encaixar no mapa)
const PILE_SPOTS = Object.freeze([
  76, 185, 7,
  187, 207, 6,
  303, 220, 7,
  350, 346, 6,
  350, 558, 7
]);

/* ---------- Utilitários ---------- */

// Hash determinístico [0,1) — substitui Math.random nas decorações estáticas
function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function drawLeaf(ctx, x, y, size, fill, rotation = 0, stroke = OUTLINE) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const s = size / 16;
  ctx.scale(s, s);
  ctx.lineWidth = 1.2;
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  if (LEAF_PATH) {
    ctx.fill(LEAF_PATH);
    ctx.stroke(LEAF_PATH);
    ctx.lineWidth = 0.8;
    ctx.stroke(LEAF_VEIN);
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.bezierCurveTo(6, -6, 7.5, 2, 0, 8);
    ctx.bezierCurveTo(-7.5, 2, -6, -6, 0, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawAcorn(ctx, x, y, size = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.lineWidth = 1;
  ctx.strokeStyle = OUTLINE;
  ctx.fillStyle = '#C98A4B';
  if (ACORN_BODY) {
    ctx.fill(ACORN_BODY);
    ctx.stroke(ACORN_BODY);
    ctx.fillStyle = '#7A4B33';
    ctx.fill(ACORN_CAP);
    ctx.stroke(ACORN_CAP);
  } else {
    ctx.beginPath();
    ctx.arc(0, 3, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawPumpkin(ctx, x, y, size = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.lineWidth = 1;
  ctx.strokeStyle = OUTLINE;
  ctx.fillStyle = '#E8892F';
  ctx.beginPath();
  ctx.ellipse(-3.5, 0, 4.5, 5.5, 0, 0, Math.PI * 2);
  ctx.ellipse(3.5, 0, 4.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#F2A65A';
  ctx.beginPath();
  ctx.ellipse(0, 0, 4, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#5A3321';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -5.5);
  ctx.quadraticCurveTo(1, -8, 3, -8.5);
  ctx.stroke();
  ctx.restore();
}

function drawLeafArch(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  // estrutura de madeira
  ctx.strokeStyle = '#7A4B33';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-36, 24);
  ctx.lineTo(-36, -8);
  ctx.quadraticCurveTo(-36, -38, 0, -38);
  ctx.quadraticCurveTo(36, -38, 36, -8);
  ctx.lineTo(36, 24);
  ctx.stroke();
  ctx.strokeStyle = '#C98A4B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-36, 22);
  ctx.lineTo(-36, -8);
  ctx.quadraticCurveTo(-36, -38, 0, -38);
  ctx.quadraticCurveTo(36, -38, 36, -8);
  ctx.lineTo(36, 22);
  ctx.stroke();

  // folhas ao longo do arco (determinístico, sem Math.random)
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const angle = Math.PI * t;
    const lx = -Math.cos(angle) * 33;
    const ly = -6 - Math.sin(angle) * 29;
    const rot = angle - Math.PI / 2 + (hash(i + 1) - 0.5) * 0.9;
    drawLeaf(ctx, lx, ly, 9 + hash(i + 20) * 3, LEAF_COLORS[i % 4], rot);
  }
  drawPumpkin(ctx, -30, 22, 0.8);
  drawPumpkin(ctx, 31, 22, 0.7);
  drawAcorn(ctx, 0, -33, 0.7);
  ctx.restore();
}

function drawLeafPiles(ctx) {
  for (let i = 0; i < PILE_SPOTS.length; i += 3) {
    const x = PILE_SPOTS[i];
    const y = PILE_SPOTS[i + 1];
    const size = PILE_SPOTS[i + 2];
    drawLeaf(ctx, x - size * 0.7, y + 1, size, LEAF_COLORS[(i / 3) % 4], -0.7);
    drawLeaf(ctx, x + size * 0.6, y, size, LEAF_COLORS[(i / 3 + 2) % 4], 0.8);
    drawLeaf(ctx, x, y - size * 0.4, size * 1.05, LEAF_COLORS[(i / 3 + 1) % 4], 0.1);
  }
}

/* ---------- Tema ---------- */

export const GOLDEN_AUTUMN_THEME = Object.freeze({
  id: 'outono_dourado',
  label: 'Outono Dourado',
  eventPillLabel: 'Outono Dourado',
  eventPillAriaLabel: 'Ver opções do tema Outono Dourado',
  eventPillIconMarkup: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3C18 6 19.500 13 12 21C4.500 13 6 6 12 3Z" fill="#E8892F" stroke="#4A2C1E" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 7V19" stroke="#4A2C1E" stroke-width="1.4" stroke-linecap="round"/></svg>',
  type: 'permanent',
  paletteAppliesToWorld: true,
  assetPalette: Object.freeze({
    cream: '#FFF3DE',
    grassLight: '#C9D98A',
    leafGreen: '#7A9A4E',
    pathEarth: '#8A5A3C',
    pathSoil: '#B98550',
    pathSurface: '#E3C58F',
    deepGreen: '#4A2C1E',
    peonyPink: '#F2A65A',
    raspberryPink: '#B5382A',
    sunYellow: '#F5B83D',
    lavender: '#9C6B8F',
    earthBrown: '#7A4B33',
    wood: '#C98A4B',
    softBlue: '#BFD8C4',
    plumText: '#3B2218'
  }),
  // 15 out → 20 nov (a data atual cai dentro da janela)
  recurringWindow: Object.freeze({ start: '10-15', end: '11-20' }),
  palette: Object.freeze({
    cream: '#FFF3DE',
    grassLight: '#C9D98A',
    leafGreen: '#7A9A4E',
    deepGreen: '#4A2C1E',
    peonyPink: '#F2A65A',
    raspberryPink: '#B5382A',
    sunYellow: '#F5B83D',
    lavender: '#9C6B8F',
    earthBrown: '#7A4B33',
    wood: '#C98A4B',
    softBlue: '#BFD8C4',
    plumText: '#3B2218',
    earthGroove: '#8A4F32',
    terrainPatchLight: 'rgba(255, 243, 222, 0.17)',
    terrainPatchDark: 'rgba(122, 75, 51, 0.13)',
    terrainTuft: 'rgba(74, 44, 30, 0.16)',
    minimapPath: '#EBD2A8',
    minimapShop: '#C98A4B',
    minimapCounter: '#F5B83D',
    minimapPlot: '#7A4B33',
    minimapPlotBorder: '#4A2C1E',
    minimapPlayer: '#B5382A',
    signWood: '#C98A4B',
    signPaper: '#FFF3DE'
  }),
  cssTokens: Object.freeze({
    '--color-cream': '#FFF3DE',
    '--color-grass-light': '#C9D98A',
    '--color-leaf-green': '#7A9A4E',
    '--color-deep-green': '#4A2C1E',
    '--color-peony-pink': '#F2A65A',
    '--color-raspberry-pink': '#B5382A',
    '--color-sun-yellow': '#F5B83D',
    '--color-lavender': '#9C6B8F',
    '--color-earth-brown': '#7A4B33',
    '--color-wood': '#C98A4B',
    '--color-soft-blue': '#BFD8C4',
    '--color-plum-text': '#3B2218'
  }),
  hudIconMarkup: Object.freeze({
    basket: '<path d="M6 10L4 19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19L18 10H6Z" fill="#C98A4B" stroke="#4A2C1E" stroke-width="2" stroke-linejoin="round"/><path d="M5 10H19M8 10C8 6 9.8 4 12 4C14.2 4 16 6 16 10" stroke="#4A2C1E" stroke-width="2" stroke-linecap="round"/><path d="M12 3C16 5 17 9 12 13C7 9 8 5 12 3Z" fill="#E8892F" stroke="#4A2C1E" stroke-width="1"/>'
  }),
  pathColor: '#EBD2A8',
  pathEdgeColor: 'rgba(74, 44, 30, 0.22)',
  fenceColor: 'rgba(74, 44, 30, 0.6)',
  awningColors: Object.freeze(['#E8892F', '#FFF3DE', '#B5382A', '#FFF3DE']),

  getTreePalette(x, y) {
    return TREE_PALETTES[Math.abs(Math.floor(x * 13 + y * 7)) % TREE_PALETTES.length];
  },

  resolveFlowerConfig(flowerConfig) {
    const style = FLOWER_STYLES[flowerConfig.id];
    return style
      ? { ...flowerConfig, ...style, stemColor: '#7A9A4E', outlineColor: OUTLINE }
      : flowerConfig;
  },

  drawAtmosphere(ctx, width, height) {
    ctx.save();
    // véu quente de fim de tarde
    ctx.fillStyle = 'rgba(255, 150, 60, 0.06)';
    ctx.fillRect(0, 0, width, height);
    // sombra suave no rodapé (barato: uma só faixa, sem gradiente)
    ctx.fillStyle = 'rgba(74, 44, 30, 0.035)';
    ctx.fillRect(0, height * 0.82, width, height * 0.18);
    ctx.restore();
  },

  drawShopDecor(ctx, x, y, width, height) {
    ctx.save();
    // fio da grinalda
    ctx.strokeStyle = 'rgba(74, 44, 30, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 4);
    ctx.quadraticCurveTo(x + width / 2, y + 10, x + width - 8, y - 4);
    ctx.stroke();
    // folhas penduradas ao longo da curva
    for (let index = 0; index < 9; index++) {
      const t = index / 8;
      const lx = x + 10 + t * (width - 20);
      const ly = y + 1 + Math.sin(t * Math.PI) * 7;
      drawLeaf(ctx, lx, ly + 2, 7, LEAF_COLORS[index % 4], (index % 2 ? 0.5 : -0.5));
    }
    drawPumpkin(ctx, x + width / 2, y + 1, 0.7);
    ctx.restore();
  },

  drawStockSignDecor(ctx, x, y, width, height) {
    ctx.save();
    ctx.strokeStyle = '#E8892F';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - 2, y - 2, width + 4, height + 4, 9);
    ctx.stroke();
    drawLeaf(ctx, x + width - 9, y + 8, 10, '#B5382A', 0.6);
    drawAcorn(ctx, x + 9, y + 8, 0.7);
    ctx.restore();
  },

  drawGardenDecor(ctx, decorations) {
    drawLeafArch(ctx, 444, 153);
    for (const decor of decorations) {
      if (decor.type === 'bench') {
        drawPumpkin(ctx, decor.x + 31, decor.y - 5, 0.7);
      } else if (decor.type === 'sign') {
        const direction = decor.direction === 'left' ? -1 : 1;
        drawLeaf(ctx, decor.x + direction * 50, decor.y - 19, 11, '#E8892F', direction * 0.6);
      }
    }
  },

  drawPathDecor(ctx) {
    drawLeafPiles(ctx);
  },

  drawAmbient(ctx, type, x, y, phase, color, reducedEffects) {
    if (type === 'butterfly') {
      // Folha a cair e a rodopiar (substitui a borboleta)
      const spin = reducedEffects ? 0.6 : Math.sin(phase * 1.3) * 0.9;
      const flip = reducedEffects ? 0.8 : 0.45 + Math.abs(Math.cos(phase * 1.1)) * 0.55;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(spin);
      ctx.scale(flip, 1);
      ctx.fillStyle = LEAF_COLORS[Math.floor(phase) & 3];
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -4.5);
      ctx.quadraticCurveTo(3.8, -1, 0, 4.5);
      ctx.quadraticCurveTo(-3.8, -1, 0, -4.5);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }
    // Brasa / pólen quente
    ctx.save();
    ctx.fillStyle = '#F5B83D';
    ctx.beginPath();
    ctx.ellipse(x, y, 2.4, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  drawFlowerAccent(ctx, flowerConfig, progress, reducedEffects) {
    const style = FLOWER_STYLES[flowerConfig.id];
    if (!style || progress < 0.65) return;
    const id = flowerConfig.id;
    const r = flowerConfig.radius;
    if (id === 'sunflower' || id === 'daisy' || id === 'dahlia' || id === 'chrysanthemum') {
      drawLeaf(ctx, 0, 0, r * 0.55, style.accent, 0.4);
    } else if (id === 'rose' || id === 'orchid') {
      // gota de orvalho
      ctx.fillStyle = '#FFF3DE';
      ctx.strokeStyle = '#E8B04A';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(r * 0.24, -r * 0.18, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (id === 'lavender') {
      drawAcorn(ctx, 0, r * 0.62, 0.38);
    }
  },

  drawReadyFlower(ctx, x, y, pulse, reducedEffects) {
    const radius = reducedEffects ? 18 : 18 + pulse * 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 220, 140, 0.16)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(74, 44, 30, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    return true;
  },

  drawPlayerAccessory(ctx, x, y, bounce, isSeated) {
    const baseY = (isSeated ? -22 : -19) - bounce;
    drawLeaf(ctx, x + 10, baseY, 9, '#E8892F', 0.5);
    drawLeaf(ctx, x + 6, baseY + 1, 7, '#B5382A', -0.4);
  },

  drawCustomerAccessory(ctx, variant, bounce) {
    const side = variant % 2 === 0 ? -7 : 7;
    if (variant % 3 === 0) {
      drawAcorn(ctx, side, -21 - bounce, 0.5);
    } else {
      drawLeaf(ctx, side, -21 - bounce, 8, LEAF_COLORS[variant & 3], side * 0.08);
    }
  }
});
