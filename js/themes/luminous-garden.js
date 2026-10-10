const FLOWER_COLORS = Object.freeze({
  daisy: { color: '#B9FFFF', centerColor: '#FFD783', halo: '#75F5F0' },
  tulip: { color: '#FF8FC5', centerColor: '#FFE0A3', halo: '#FF6FAF' },
  sunflower: { color: '#FFD267', centerColor: '#59445D', halo: '#FFC65C' },
  rose: { color: '#F66BB7', centerColor: '#7D315E', halo: '#F65DAF' },
  orchid: { color: '#70C9FF', centerColor: '#D7A5FF', halo: '#65BFFF' },
  lavender: { color: '#C7A4FF', centerColor: '#F1D9FF', halo: '#B98AFF' },
  peony: { color: '#FFA1D0', centerColor: '#8E456F', halo: '#F982C3' },
  camellia: { color: '#FF9BB5', centerColor: '#FFE08A', halo: '#FF80B0' },
  iris: { color: '#7CCEFF', centerColor: '#FFE08A', halo: '#67BEFF' },
  jasmine: { color: '#C8FFFF', centerColor: '#FFE8A3', halo: '#A8FFF3' },
  gardenia: { color: '#FFF1B8', centerColor: '#FFD779', halo: '#FFF0A1' },
  anemone: { color: '#FF83B6', centerColor: '#463B66', halo: '#FF6FAF' },
  dahlia: { color: '#FF86C8', centerColor: '#FFE08A', halo: '#FF70BC' },
  chrysanthemum: { color: '#FFE071', centerColor: '#724B68', halo: '#FFD267' },
  foxglove: { color: '#D09AFF', centerColor: '#FFE08A', halo: '#C18BFF' },
  verbena: { color: '#A28BFF', centerColor: '#FFE08A', halo: '#9A82FF' },
  hydrangea: { color: '#80D7FF', centerColor: '#FFE08A', halo: '#72CEFF' },
  lotus: { color: '#FF9FD6', centerColor: '#FFE08A', halo: '#FF8CCF' },
  magnolia: { color: '#FFE3F1', centerColor: '#FFD779', halo: '#FFD0EC' },
  protea: { color: '#FFAA7F', centerColor: '#8E456F', halo: '#FF9A70' },
  ranunculus: { color: '#FFAD78', centerColor: '#FFE08A', halo: '#FF9B69' },
  alstroemeria: { color: '#FFB08D', centerColor: '#FFE08A', halo: '#FFA47C' }
});

const haloSprites = new Map();
const PERIOD_MS = 6400;

function drawLantern(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#14233A';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = '#FFB347';
  ctx.beginPath();
  ctx.roundRect(-4, -6, 8, 11, 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -6, 3, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#FFF1B8';
  ctx.beginPath();
  ctx.arc(0, -1, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function getHaloSprite(flowerId) {
  if (haloSprites.has(flowerId)) return haloSprites.get(flowerId);
  if (typeof document === 'undefined') return null;

  const color = FLOWER_COLORS[flowerId]?.halo || '#75F5F0';
  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(40, 40, 5, 40, 40, 38);
  gradient.addColorStop(0, `${color}66`);
  gradient.addColorStop(0.48, `${color}26`);
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 80, 80);
  haloSprites.set(flowerId, canvas);
  return canvas;
}

function drawFirefly(ctx, x, y, phase, reducedEffects) {
  const alpha = reducedEffects ? 0.82 : 0.56 + (Math.sin(phase * 1.2) + 1) * 0.12;
  ctx.save();
  ctx.fillStyle = `rgba(255, 196, 107, ${alpha})`;
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGlowingButterfly(ctx, x, y, phase, color, reducedEffects) {
  const flap = reducedEffects ? 0.55 : 0.48 + Math.abs(Math.sin(phase * 1.2)) * 0.16;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color || '#70DDE5';
  ctx.strokeStyle = '#14233A';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(-3, -1, 3.5, 4.5 * flap, -0.4, 0, Math.PI * 2);
  ctx.ellipse(3, -1, 3.5, 4.5 * flap, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawLanternOrbs(ctx, x, y, size, phase, reducedEffects) {
  for (let index = 0; index < 3; index++) {
    const angle = index * (Math.PI * 2 / 3) + (reducedEffects ? 0 : phase * 0.08);
    const distance = size * (0.48 + index * 0.04);
    ctx.fillStyle = index === 1 ? '#FFB347' : '#75E5DF';
    ctx.beginPath();
    ctx.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const LUMINOUS_GARDEN_THEME = Object.freeze({
  id: 'luminous-garden',
  label: 'Jardim Luminoso',
  type: 'permanent',
  paletteAppliesToWorld: true,
  unlockLevel: 10,
  maxHalosActive: 24,
  haloPulsePeriodMs: PERIOD_MS,
  palette: Object.freeze({
    cream: '#F2EEDD',
    grassLight: '#2F5A5A',
    leafGreen: '#2B7468',
    pathEarth: '#665449',
    pathSoil: '#A18A5E',
    pathSurface: '#C4B783',
    deepGreen: '#14233A',
    peonyPink: '#F08BC2',
    raspberryPink: '#B9357C',
    sunYellow: '#FFB347',
    lavender: '#9B7BFF',
    earthBrown: '#3E2F3A',
    wood: '#927B76',
    softBlue: '#9CDDE0',
    plumText: '#18283A',
    terrainPatchLight: 'rgba(117, 229, 223, 0.12)',
    terrainPatchDark: 'rgba(155, 123, 255, 0.08)',
    terrainPatchAccent: 'rgba(255, 179, 71, 0.08)',
    terrainTuft: 'rgba(117, 229, 223, 0.18)',
    pathAccentColor: 'rgba(117, 229, 223, 0.78)',
    pathAccentSecondary: 'rgba(255, 179, 71, 0.78)',
    minimapGrass: '#2F5A5A',
    minimapPath: '#687777',
    minimapShop: '#554455',
    minimapCounter: '#FFB347',
    minimapPlot: '#3E2F3A',
    minimapPlotBorder: '#75E5DF',
    minimapView: 'rgba(242, 238, 221, 0.82)',
    minimapPlayer: '#B9357C',
    signWood: '#554455',
    signPaper: '#F2EEDD'
  }),
  cssTokens: Object.freeze({
    '--color-cream': '#F2EEDD',
    '--color-grass-light': '#2F5A5A',
    '--color-leaf-green': '#2B7468',
    '--color-deep-green': '#14233A',
    '--color-peony-pink': '#F08BC2',
    '--color-raspberry-pink': '#B9357C',
    '--color-sun-yellow': '#FFB347',
    '--color-lavender': '#9B7BFF',
    '--color-earth-brown': '#3E2F3A',
    '--color-wood': '#927B76',
    '--color-soft-blue': '#9CDDE0',
    '--color-plum-text': '#18283A'
  }),
  pathColor: '#687777',
  pathEdgeColor: 'rgba(242, 238, 221, 0.4)',
  fenceColor: 'rgba(119, 155, 145, 0.9)',
  awningColors: Object.freeze(['#536582', '#2F5A5A', '#9B7BFF', '#2F5A5A']),
  getTreePalette(x, y) {
    const variants = [
      { leafGreen: '#285758', highlight: '#36706B', deepGreen: '#14233A' },
      { leafGreen: '#314E68', highlight: '#53758A', deepGreen: '#14233A' },
      { leafGreen: '#3D5960', highlight: '#6E8D84', deepGreen: '#14233A' }
    ];
    return variants[Math.abs(Math.floor(x * 13 + y * 7)) % variants.length];
  },
  resolveFlowerConfig(flowerConfig) {
    const colors = FLOWER_COLORS[flowerConfig.id];
    return colors
      ? {
        ...flowerConfig,
        color: colors.color,
        centerColor: colors.centerColor,
        stemColor: '#62B7A3',
        outlineColor: '#14233A'
      }
      : flowerConfig;
  },
  drawFlowerHalo(ctx, flowerConfig, pulse, reducedEffects) {
    const sprite = getHaloSprite(flowerConfig.id);
    if (!sprite) return;
    const alpha = reducedEffects ? 0.48 : 0.38 + pulse * 0.16;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, -40, -40);
    ctx.restore();
  },
  drawAtmosphere(ctx, width, height, lighting) {
    const night = typeof lighting?.night === 'number' ? lighting.night : 1;
    ctx.save();
    ctx.fillStyle = `rgba(11, 34, 52, ${0.03 + night * 0.07})`;
    ctx.fillRect(0, 0, width, height);
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.22,
      width / 2, height / 2, Math.max(width, height) * 0.72
    );
    vignette.addColorStop(0, 'rgba(7, 25, 45, 0)');
    vignette.addColorStop(1, `rgba(7, 25, 45, ${0.05 + night * 0.06})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
  drawShopDecor(ctx, x, y, width, height) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 179, 71, 0.18)';
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height * 0.56, width * 0.42, height * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    drawLantern(ctx, x + 13, y + height - 6, 0.9);
    drawLantern(ctx, x + width - 13, y + height - 6, 0.9);
    ctx.strokeStyle = '#9B7BFF';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + 20, y - 5);
    ctx.quadraticCurveTo(x + width / 2, y + 7, x + width - 20, y - 5);
    ctx.stroke();
    for (let index = 0; index < 5; index++) {
      const lightX = x + 24 + index * (width - 48) / 4;
      ctx.fillStyle = index % 2 ? '#75E5DF' : '#FFB347';
      ctx.beginPath();
      ctx.arc(lightX, y + 1, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  drawStockSignDecor(ctx, x, y, width, height) {
    ctx.save();
    ctx.strokeStyle = '#FFB347';
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - 2, y - 2, width + 4, height + 4, 9);
    ctx.stroke();
    drawLantern(ctx, x + width + 9, y + 13, 0.7);
    ctx.restore();
  },
  drawGardenDecor(ctx, decorations) {
    for (const decor of decorations) {
      if (decor.type === 'sign') {
        const direction = decor.direction === 'left' ? -1 : 1;
        drawLantern(ctx, decor.x + direction * 50, decor.y - 19, 0.7);
      } else if (decor.type === 'bench') {
        drawLantern(ctx, decor.x + 31, decor.y - 6, 0.65);
      }
    }
  },
  drawTreeDecor(ctx, phase, reducedEffects) {
    drawLanternOrbs(ctx, 0, -5, 23, phase, reducedEffects);
  },
  drawAmbient(ctx, type, x, y, phase, color, reducedEffects) {
    if (type === 'butterfly') drawGlowingButterfly(ctx, x, y, phase, color, reducedEffects);
    else drawFirefly(ctx, x, y, phase, reducedEffects);
  },
  drawPlayerAccessory(ctx, x, y, bounce, isSeated) {
    const side = isSeated ? 13 : 15;
    drawLantern(ctx, side, 4 - bounce, 0.85);
  },
  drawCustomerAccessory(ctx, variant, bounce) {
    if (variant % 2 === 0) {
      drawLantern(ctx, 10, -13 - bounce, 0.65);
      return;
    }
    ctx.save();
    ctx.fillStyle = '#75E5DF';
    ctx.strokeStyle = '#14233A';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -18 - bounce, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },
  drawGardenLayer(ctx, mapBounds, reducedEffects, gameTime = 0) {
    const count = reducedEffects ? 4 : 8;
    ctx.save();
    for (let index = 0; index < count; index++) {
      const phase = index * 0.8 + (reducedEffects ? 0 : gameTime * 0.12);
      const x = mapBounds.minX + 120 + index * 131 + (reducedEffects ? 0 : Math.sin(phase) * 8);
      const y = mapBounds.minY + 110 + (index % 4) * 173 + (reducedEffects ? 0 : Math.cos(phase * 0.6) * 7);
      ctx.fillStyle = index % 2 ? '#75E5DF' : '#FFB347';
      ctx.globalAlpha = reducedEffects ? 0.34 : 0.24 + (Math.sin(phase) + 1) * 0.08;
      ctx.beginPath();
      ctx.ellipse(x, y, 2.2, 3.8, phase, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const y of [mapBounds.minY + 230, mapBounds.minY + 520, mapBounds.maxY - 95]) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(117, 229, 223, 0.2)';
      ctx.beginPath();
      ctx.arc(mapBounds.minX + 31, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9B7BFF';
      ctx.beginPath();
      ctx.ellipse(mapBounds.minX + 31, y, 7, 5, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F2EEDD';
      ctx.fillRect(mapBounds.minX + 25, y, 12, 4);
    }
    ctx.restore();
  }
});
