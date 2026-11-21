/* ==========================================================================
   Tema "Festival das Cores" — FloristEver
   Alegre, vibrante e festivo: balões, bandeirolas, confetti e brilhos.
   Mesma API do HEARTS_GARDEN_THEME / GOLDEN_AUTUMN_THEME.

   Otimizações:
   - Estrela, balão e bandeirola em Path2D criados UMA vez.
   - Zero gradientes e zero alocações nas funções chamadas por frame
     (listas de cores/posições são constantes congeladas do módulo).
   - Variação determinística (hash) → sem Math.random, sem cintilação.
   - Todas as animações respeitam `reducedEffects` (valores fixos).
   - Contornos em roxo-escuro para manter legibilidade com cores saturadas.
   ========================================================================== */

const OUTLINE = '#3A1F6B';
const CREAM = '#FFFBEF';

// Cores vibrantes reutilizadas nas decorações
const BRIGHT = Object.freeze(['#FF5FA2', '#FFD60A', '#4CC9F0', '#9B5DE5', '#FF8A3D', '#2EC4B6']);

const FLOWER_STYLES = Object.freeze({
  daisy:         { color: '#FFFFFF', centerColor: '#FFD60A', accent: '#FF5FA2' },
  tulip:         { color: '#FF3D81', centerColor: '#FFFBEF', accent: '#FFD60A' },
  sunflower:     { color: '#FFD60A', centerColor: '#8A4B1F', accent: '#FF8A3D' },
  rose:          { color: '#FF2E63', centerColor: '#FFE0EA', accent: '#FFD60A' },
  orchid:        { color: '#E056FD', centerColor: '#FFD60A', accent: '#FFFBEF' },
  lavender:      { color: '#9B5DE5', centerColor: '#FFFBEF', accent: '#4CC9F0' },
  peony:         { color: '#FF8FC7', centerColor: '#E5197A', accent: '#FFD60A' },
  camellia:      { color: '#FF4D8D', centerColor: '#FFD60A', accent: '#FFFBEF' },
  iris:          { color: '#6C4DFF', centerColor: '#FFD60A', accent: '#4CC9F0' },
  jasmine:       { color: '#FFFBEF', centerColor: '#FFD60A', accent: '#2EC4B6' },
  gardenia:      { color: '#FFF1C9', centerColor: '#FF8A3D', accent: '#FF5FA2' },
  anemone:       { color: '#FF3D81', centerColor: '#2B1650', accent: '#4CC9F0' },
  dahlia:        { color: '#FF8A3D', centerColor: '#FFD60A', accent: '#FF2E63' },
  chrysanthemum: { color: '#FFB703', centerColor: '#E5197A', accent: '#FFFBEF' },
  foxglove:      { color: '#C77DFF', centerColor: '#FFFBEF', accent: '#FF5FA2' },
  verbena:       { color: '#7B2FF7', centerColor: '#FFD60A', accent: '#FFFBEF' },
  hydrangea:     { color: '#4CC9F0', centerColor: '#FFFBEF', accent: '#FF5FA2' },
  lotus:         { color: '#FF9ECF', centerColor: '#FFD60A', accent: '#2EC4B6' },
  magnolia:      { color: '#FFE0F0', centerColor: '#FF5FA2', accent: '#FFD60A' },
  protea:        { color: '#FF5E5B', centerColor: '#2B1650', accent: '#FFD60A' },
  ranunculus:    { color: '#FF6B2C', centerColor: '#FFD60A', accent: '#FFFBEF' },
  alstroemeria:  { color: '#FF9F1C', centerColor: '#FFFBEF', accent: '#E5197A' }
});

const TREE_PALETTES = Object.freeze([
  Object.freeze({ leafGreen: '#2EC45F', highlight: '#B6F27A', deepGreen: '#3A1F6B' }),
  Object.freeze({ leafGreen: '#1FB88A', highlight: '#9FF2D0', deepGreen: '#3A1F6B' }),
  Object.freeze({ leafGreen: '#6AD23A', highlight: '#FFEE7A', deepGreen: '#3A1F6B' }),
  Object.freeze({ leafGreen: '#3DBE7A', highlight: '#FFB7DA', deepGreen: '#3A1F6B' })
]);

/* ---------- Formas pré-computadas (criadas uma única vez) ---------- */

const HAS_PATH2D = typeof Path2D !== 'undefined';
// Brilho de 4 pontas, ~16 de lado (escala = size / 16)
const STAR_PATH = HAS_PATH2D
  ? new Path2D('M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z')
  : null;
// Balão: corpo + nó, ~18 de altura (centrado no corpo)
const BALLOON_BODY = HAS_PATH2D
  ? new Path2D('M0 -8 C6.500 -8 7.500 0 0 7 C-7.500 0 -6.500 -8 0 -8 Z')
  : null;
const BALLOON_KNOT = HAS_PATH2D ? new Path2D('M0 7 L-1.500 9.500 L1.500 9.500 Z') : null;

// Posições de confetti no caminho (x, y, tamanho) — iguais às do tema anterior
const CONFETTI_SPOTS = Object.freeze([
  76, 185, 7,
  187, 207, 6,
  303, 220, 7,
  350, 346, 6,
  350, 558, 7
]);

/* ---------- Utilitários ---------- */

// Hash determinístico [0,1)
function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function drawSparkle(ctx, x, y, size, fill, stroke = OUTLINE) {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 16;
  ctx.scale(s, s);
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  if (STAR_PATH) {
    ctx.fill(STAR_PATH);
    ctx.stroke(STAR_PATH);
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(2, -2);
    ctx.lineTo(8, 0);
    ctx.lineTo(2, 2);
    ctx.lineTo(0, 8);
    ctx.lineTo(-2, 2);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-2, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawBalloon(ctx, x, y, size, fill, withString = false) {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 16;
  ctx.scale(s, s);
  if (withString) {
    ctx.strokeStyle = 'rgba(58, 31, 107, 0.6)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 9.5);
    ctx.quadraticCurveTo(3, 14, 0, 18);
    ctx.stroke();
  }
  ctx.fillStyle = fill;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  if (BALLOON_BODY) {
    ctx.fill(BALLOON_BODY);
    ctx.stroke(BALLOON_BODY);
    ctx.fillStyle = OUTLINE;
    ctx.fill(BALLOON_KNOT);
  } else {
    ctx.beginPath();
    ctx.ellipse(0, -1, 6.500, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // brilho do balão
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-2.500, -4, 1.300, 2.300, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPartyHat(ctx, x, y, size = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.fillStyle = '#FF5FA2';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-5, 4);
  ctx.lineTo(0, -9);
  ctx.lineTo(5, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // listras
  ctx.fillStyle = '#FFD60A';
  ctx.beginPath();
  ctx.moveTo(-3.200, -0.500);
  ctx.lineTo(-0.900, -6.500);
  ctx.lineTo(0.900, -6.500);
  ctx.lineTo(3.200, -0.500);
  ctx.closePath();
  ctx.fill();
  // pompom
  ctx.fillStyle = '#4CC9F0';
  ctx.beginPath();
  ctx.arc(0, -9.500, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBalloonArch(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  // estrutura fina
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-36, 24);
  ctx.lineTo(-36, -8);
  ctx.quadraticCurveTo(-36, -38, 0, -38);
  ctx.quadraticCurveTo(36, -38, 36, -8);
  ctx.lineTo(36, 24);
  ctx.stroke();

  // balões a acompanhar o arco (cores em ciclo, tamanho variável determinístico)
  for (let i = 0; i < 11; i++) {
    const angle = Math.PI * (i / 10);
    const bx = -Math.cos(angle) * 36;
    const by = -8 - Math.sin(angle) * 30;
    drawBalloon(ctx, bx, by, 11 + hash(i + 3) * 3, BRIGHT[i % 6]);
  }
  // cachos nas bases
  drawBalloon(ctx, -36, 20, 11, BRIGHT[4], true);
  drawBalloon(ctx, -31, 15, 9, BRIGHT[2]);
  drawBalloon(ctx, 36, 20, 11, BRIGHT[0], true);
  drawBalloon(ctx, 31, 15, 9, BRIGHT[1]);
  drawSparkle(ctx, 0, -40, 9, '#FFD60A');
  ctx.restore();
}

function drawConfettiSpots(ctx) {
  for (let i = 0; i < CONFETTI_SPOTS.length; i += 3) {
    const x = CONFETTI_SPOTS[i];
    const y = CONFETTI_SPOTS[i + 1];
    const size = CONFETTI_SPOTS[i + 2];
    const k = i / 3;
    drawSparkle(ctx, x, y, size, BRIGHT[k % 6]);
    // 3 pecinhas de confetti à volta (retângulos rodados)
    for (let j = 0; j < 3; j++) {
      const a = hash(k * 7 + j) * Math.PI * 2;
      const d = size * (1.2 + hash(k * 11 + j) * 0.9);
      ctx.save();
      ctx.translate(x + Math.cos(a) * d, y + Math.sin(a) * d);
      ctx.rotate(a * 2);
      ctx.fillStyle = BRIGHT[(k + j + 1) % 6];
      ctx.fillRect(-2, -1, 4, 2);
      ctx.restore();
    }
  }
}

/* ---------- Tema ---------- */

export const COLOR_FESTIVAL_THEME = Object.freeze({
  id: 'festival_cores',
  label: 'Festival das Cores',
  eventPillLabel: 'Festival das Cores',
  eventPillAriaLabel: 'Ver opções do tema Festival das Cores',
  eventPillIconMarkup: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3C17 3 19 8 17.500 11.500C16.500 14 14 16 12 17.500C10 16 7.500 14 6.500 11.500C5 8 7 3 12 3Z" fill="#FF5FA2" stroke="#3A1F6B" stroke-width="1.600" stroke-linejoin="round"/><path d="M12 17.500L10.500 21H13.500L12 17.500Z" fill="#3A1F6B"/><path d="M9.500 7C10 6 11 5.500 11.500 5.500" stroke="#FFFFFF" stroke-width="1.400" stroke-linecap="round"/></svg>',
  type: 'permanent',
  paletteAppliesToWorld: true,
  assetPalette: Object.freeze({
    cream: '#FFFBEF',
    grassLight: '#8FEA6A',
    leafGreen: '#27B35A',
    pathEarth: '#E0944A',
    pathSoil: '#FFC15E',
    pathSurface: '#FFE6A8',
    deepGreen: '#3A1F6B',
    peonyPink: '#FF5FA2',
    raspberryPink: '#E5197A',
    sunYellow: '#FFD60A',
    lavender: '#9B5DE5',
    earthBrown: '#A8553A',
    wood: '#FF8A3D',
    softBlue: '#4CC9F0',
    plumText: '#2B1650'
  }),
  // Verão: 15 jun → 15 ago (ajusta à vontade)
  recurringWindow: Object.freeze({ start: '06-15', end: '08-15' }),
  palette: Object.freeze({
    cream: '#FFFBEF',
    grassLight: '#8FEA6A',
    leafGreen: '#27B35A',
    deepGreen: '#3A1F6B',
    peonyPink: '#FF5FA2',
    raspberryPink: '#E5197A',
    sunYellow: '#FFD60A',
    lavender: '#9B5DE5',
    earthBrown: '#A8553A',
    wood: '#FF8A3D',
    softBlue: '#4CC9F0',
    plumText: '#2B1650',
    earthGroove: '#C9703A',
    terrainPatchLight: 'rgba(255, 255, 255, 0.22)',
    terrainPatchDark: 'rgba(39, 179, 90, 0.14)',
    terrainTuft: 'rgba(58, 31, 107, 0.14)',
    minimapPath: '#FFE6A8',
    minimapShop: '#FF8A3D',
    minimapCounter: '#FFD60A',
    minimapPlot: '#A8553A',
    minimapPlotBorder: '#3A1F6B',
    minimapPlayer: '#E5197A',
    signWood: '#FF8A3D',
    signPaper: '#FFFBEF'
  }),
  cssTokens: Object.freeze({
    '--color-cream': '#FFFBEF',
    '--color-grass-light': '#8FEA6A',
    '--color-leaf-green': '#27B35A',
    '--color-deep-green': '#3A1F6B',
    '--color-peony-pink': '#FF5FA2',
    '--color-raspberry-pink': '#E5197A',
    '--color-sun-yellow': '#FFD60A',
    '--color-lavender': '#9B5DE5',
    '--color-earth-brown': '#A8553A',
    '--color-wood': '#FF8A3D',
    '--color-soft-blue': '#4CC9F0',
    '--color-plum-text': '#2B1650'
  }),
  hudIconMarkup: Object.freeze({
    basket: '<path d="M6 10L4 19C4 20.100 4.900 21 6 21H18C19.100 21 20 20.100 20 19L18 10H6Z" fill="#FF8A3D" stroke="#3A1F6B" stroke-width="2" stroke-linejoin="round"/><path d="M5 10H19M8 10C8 6 9.800 4 12 4C14.200 4 16 6 16 10" stroke="#3A1F6B" stroke-width="2" stroke-linecap="round"/><path d="M12 2L13.500 6L17.500 7.500L13.500 9L12 13L10.500 9L6.500 7.500L10.500 6Z" fill="#FFD60A" stroke="#3A1F6B" stroke-width="1" stroke-linejoin="round"/>'
  }),
  pathColor: '#FFE6A8',
  pathEdgeColor: 'rgba(58, 31, 107, 0.2)',
  fenceColor: 'rgba(58, 31, 107, 0.55)',
  awningColors: Object.freeze(['#FF5FA2', '#FFFBEF', '#4CC9F0', '#FFD60A']),

  getTreePalette(x, y) {
    return TREE_PALETTES[Math.abs(Math.floor(x * 13 + y * 7)) % TREE_PALETTES.length];
  },

  resolveFlowerConfig(flowerConfig) {
    const style = FLOWER_STYLES[flowerConfig.id];
    return style
      ? { ...flowerConfig, ...style, stemColor: '#27B35A', outlineColor: OUTLINE }
      : flowerConfig;
  },

  drawAtmosphere(ctx, width, height) {
    ctx.save();
    // brilho solar leve; mantém as cores saturadas sem lavar a imagem
    ctx.fillStyle = 'rgba(255, 240, 160, 0.05)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },

  drawShopDecor(ctx, x, y, width, height) {
    ctx.save();
    // fio das bandeirolas
    ctx.strokeStyle = 'rgba(58, 31, 107, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 4);
    ctx.quadraticCurveTo(x + width / 2, y + 10, x + width - 8, y - 4);
    ctx.stroke();
    // bandeirolas triangulares ao longo da curva (ponto da Bézier quadrática)
    const span = width - 16;
    for (let index = 0; index < 9; index++) {
      const t = index / 8;
      const px = x + 8 + t * span;
      const py = y - 4 + 28 * t * (1 - t);
      ctx.fillStyle = BRIGHT[index % 6];
      ctx.beginPath();
      ctx.moveTo(px - 4, py);
      ctx.lineTo(px + 4, py);
      ctx.lineTo(px, py + 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
    drawBalloon(ctx, x + 6, y - 6, 9, '#FF5FA2', true);
    drawBalloon(ctx, x + width - 6, y - 6, 9, '#4CC9F0', true);
    drawSparkle(ctx, x + width / 2, y - 6, 8, '#FFD60A');
    ctx.restore();
  },

  drawStockSignDecor(ctx, x, y, width, height) {
    ctx.save();
    ctx.strokeStyle = '#FF5FA2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - 2, y - 2, width + 4, height + 4, 9);
    ctx.stroke();
    drawSparkle(ctx, x + width - 9, y + 8, 10, '#FFD60A');
    drawBalloon(ctx, x + 9, y + 8, 9, '#9B5DE5');
    ctx.restore();
  },

  drawGardenDecor(ctx, decorations) {
    drawBalloonArch(ctx, 444, 153);
    for (const decor of decorations) {
      if (decor.type === 'bench') {
        drawBalloon(ctx, decor.x + 31, decor.y - 8, 9, BRIGHT[(Math.abs(decor.x) | 0) % 6], true);
      } else if (decor.type === 'sign') {
        const direction = decor.direction === 'left' ? -1 : 1;
        drawSparkle(ctx, decor.x + direction * 50, decor.y - 19, 11, '#FFD60A');
      }
    }
  },

  drawPathDecor(ctx) {
    drawConfettiSpots(ctx);
  },

  drawAmbient(ctx, type, x, y, phase, color, reducedEffects) {
    if (type === 'butterfly') {
      const flap = reducedEffects ? 0.6 : 0.45 + Math.abs(Math.sin(phase * 1.3)) * 0.2;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = BRIGHT[Math.floor(phase) % 6];
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(-3.500, -1.500, 3.800, 4.500 * flap, -0.4, 0, Math.PI * 2);
      ctx.ellipse(3.500, -1.500, 3.800, 4.500 * flap, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // asas de baixo, mais pequenas
      ctx.fillStyle = BRIGHT[(Math.floor(phase) + 3) % 6];
      ctx.beginPath();
      ctx.ellipse(-2.500, 2, 2.400, 2.600 * flap, 0.3, 0, Math.PI * 2);
      ctx.ellipse(2.500, 2, 2.400, 2.600 * flap, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    // Brilho a cintilar
    const twinkle = reducedEffects ? 4 : 3 + Math.abs(Math.sin(phase * 2)) * 2.500;
    drawSparkle(ctx, x, y, twinkle * 2, '#FFF27A', 'rgba(58, 31, 107, 0.6)');
  },

  drawFlowerAccent(ctx, flowerConfig, progress, reducedEffects) {
    const style = FLOWER_STYLES[flowerConfig.id];
    if (!style || progress < 0.65) return;
    const id = flowerConfig.id;
    const r = flowerConfig.radius;
    if (id === 'daisy' || id === 'sunflower' || id === 'dahlia' || id === 'chrysanthemum') {
      drawSparkle(ctx, 0, 0, r * 0.7, style.accent);
    } else if (id === 'rose' || id === 'orchid') {
      // gotinha de brilho
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = style.accent;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(r * 0.24, -r * 0.18, 1.600, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (id === 'lavender') {
      drawBalloon(ctx, 0, r * 0.62, 7, style.accent);
    }
  },

  drawReadyFlower(ctx, x, y, pulse, reducedEffects) {
    const radius = reducedEffects ? 18 : 18 + pulse * 2.500;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 240, 120, 0.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(58, 31, 107, 0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    if (!reducedEffects) {
      // dois brilhos que "respiram" com o pulso
      drawSparkle(ctx, x + 13, y - 13, 6 + pulse * 3, '#FFD60A');
      drawSparkle(ctx, x - 14, y - 9, 5 + pulse * 2, '#FF5FA2');
    }
    return true;
  },

  drawPlayerAccessory(ctx, x, y, bounce, isSeated) {
    drawPartyHat(ctx, x + 10, (isSeated ? -24 : -21) - bounce, 0.75);
  },

  drawCustomerAccessory(ctx, variant, bounce) {
    const side = variant % 2 === 0 ? -7 : 7;
    if (variant % 3 === 0) {
      drawBalloon(ctx, side, -23 - bounce, 8, BRIGHT[variant % 6], true);
    } else {
      drawSparkle(ctx, side, -21 - bounce, 8, BRIGHT[variant % 6]);
    }
  }
});
