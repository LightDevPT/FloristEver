const FLOWER_STYLES = Object.freeze({
  daisy: { color: '#FF9EBC', centerColor: '#FFC94A', accent: '#C92F62' },
  tulip: { color: '#F06A91', centerColor: '#FFF4EA', petalShape: 'heart' },
  sunflower: { color: '#FFD34F', centerColor: '#69364C', accent: '#FFF4EA' },
  rose: { color: '#E34B78', centerColor: '#FFF1E5', accent: '#F0A07A' },
  orchid: { color: '#F28BA8', centerColor: '#C92F62', accent: '#FFF4EA' },
  lavender: { color: '#BB91DB', centerColor: '#FFF4EA', accent: '#C92F62' },
  peony: { color: '#FFB0C0', centerColor: '#C92F62', accent: '#F0A07A' },
  camellia: { color: '#F28BA8', centerColor: '#FFC94A', accent: '#FFF4EA' },
  iris: { color: '#B084DB', centerColor: '#FFF4EA', accent: '#E34B78' },
  jasmine: { color: '#FFF4EA', centerColor: '#FFC94A', accent: '#F0A07A' },
  gardenia: { color: '#FFE9D7', centerColor: '#FFF4EA', accent: '#F0A07A' },
  anemone: { color: '#E34B78', centerColor: '#69364C', accent: '#FFF4EA' },
  dahlia: { color: '#F06A91', centerColor: '#FFC94A', accent: '#FFF4EA' },
  chrysanthemum: { color: '#F0A07A', centerColor: '#69364C', accent: '#FFF4EA' },
  foxglove: { color: '#BB91DB', centerColor: '#FFF4EA', accent: '#C92F62' },
  verbena: { color: '#A783D0', centerColor: '#FFC94A', accent: '#FFF4EA' },
  hydrangea: { color: '#9CBFEF', centerColor: '#FFF4EA', accent: '#C92F62' },
  lotus: { color: '#FF9EBC', centerColor: '#FFC94A', accent: '#FFF4EA' },
  magnolia: { color: '#FFE3E8', centerColor: '#F0A07A', accent: '#FFF4EA' },
  protea: { color: '#E87569', centerColor: '#69364C', accent: '#FFF4EA' },
  ranunculus: { color: '#E96F52', centerColor: '#FFC94A', accent: '#FFF4EA' },
  alstroemeria: { color: '#F0A07A', centerColor: '#FFF4EA', accent: '#E34B78' }
});

function drawHeart(ctx, x, y, size, fill, stroke = '#69364C') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-2, 4, -8, 0, -8, -3);
  ctx.bezierCurveTo(-8, -8, -2, -9, 0, -4);
  ctx.bezierCurveTo(2, -9, 8, -8, 8, -3);
  ctx.bezierCurveTo(8, 0, 2, 4, 0, 6);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.25;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBow(ctx, x, y, size = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.fillStyle = '#FF9EBC';
  ctx.strokeStyle = '#69364C';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-1, 0);
  ctx.quadraticCurveTo(-9, -7, -10, 0);
  ctx.quadraticCurveTo(-8, 5, -1, 1);
  ctx.quadraticCurveTo(8, -7, 10, 0);
  ctx.quadraticCurveTo(8, 5, 1, 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#F0A07A';
  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHeartArch(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#A95B6D';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-36, 24);
  ctx.lineTo(-36, -4);
  ctx.bezierCurveTo(-36, -39, -4, -44, 0, -17);
  ctx.bezierCurveTo(4, -44, 36, -39, 36, -4);
  ctx.lineTo(36, 24);
  ctx.stroke();
  ctx.strokeStyle = '#F0A07A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-36, 22);
  ctx.lineTo(-36, -4);
  ctx.bezierCurveTo(-36, -39, -4, -44, 0, -17);
  ctx.bezierCurveTo(4, -44, 36, -39, 36, -4);
  ctx.lineTo(36, 22);
  ctx.stroke();

  for (let index = 0; index < 7; index++) {
    const angle = (index / 6) * Math.PI;
    const flowerX = Math.cos(angle) * 31;
    const flowerY = -7 - Math.sin(angle) * 21;
    ctx.fillStyle = index % 2 ? '#FF9EBC' : '#E34B78';
    ctx.strokeStyle = '#69364C';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(flowerX, flowerY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFF4EA';
    ctx.beginPath();
    ctx.arc(flowerX, flowerY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBow(ctx, 0, -31, 0.85);
  ctx.restore();
}

function drawHeartPebbles(ctx) {
  for (const [x, y, size] of [[76, 185, 7], [187, 207, 6], [303, 220, 7], [350, 346, 6], [350, 558, 7]]) {
    drawHeart(ctx, x, y, size, '#FFF4EA', '#C92F62');
  }
}

export const HEARTS_GARDEN_THEME = Object.freeze({
  id: 'jardim_coracoes',
  label: 'Jardim dos Corações',
  eventPillLabel: 'Jardim dos Corações',
  eventPillAriaLabel: 'Ver opções do tema Jardim dos Corações',
  eventPillIconMarkup: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20S3.5 15.2 3.5 9.2C3.5 5.2 8.4 3.8 12 8C15.6 3.8 20.5 5.2 20.5 9.2C20.5 15.2 12 20 12 20Z" fill="#E34B78" stroke="#69364C" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  type: 'permanent',
  paletteAppliesToWorld: true,
  assetPalette: Object.freeze({
    cream: '#FFF4EA',
    grassLight: '#B7E99E',
    leafGreen: '#5A9B62',
    pathEarth: '#936758',
    pathSoil: '#C29466',
    pathSurface: '#E0C58E',
    deepGreen: '#69364C',
    peonyPink: '#FF9EBC',
    raspberryPink: '#C92F62',
    sunYellow: '#FFC94A',
    lavender: '#BB91DB',
    earthBrown: '#765052',
    wood: '#D88B69',
    softBlue: '#C1E8D2',
    plumText: '#542A40'
  }),
  recurringWindow: Object.freeze({ start: '02-07', end: '02-21' }),
  palette: Object.freeze({
    cream: '#FFF4EA',
    grassLight: '#B7E99E',
    leafGreen: '#5A9B62',
    deepGreen: '#69364C',
    peonyPink: '#FF9EBC',
    raspberryPink: '#C92F62',
    sunYellow: '#FFC94A',
    lavender: '#BB91DB',
    earthBrown: '#765052',
    wood: '#D88B69',
    softBlue: '#C1E8D2',
    plumText: '#542A40',
    earthGroove: '#A85C68',
    terrainPatchLight: 'rgba(255, 244, 234, 0.19)',
    terrainPatchDark: 'rgba(90, 155, 98, 0.12)',
    terrainTuft: 'rgba(105, 54, 76, 0.15)',
    minimapPath: '#F4D5BE',
    minimapShop: '#D88B69',
    minimapCounter: '#FFC94A',
    minimapPlot: '#765052',
    minimapPlotBorder: '#69364C',
    minimapPlayer: '#C92F62',
    signWood: '#D88B69',
    signPaper: '#FFF4EA'
  }),
  cssTokens: Object.freeze({
    '--color-cream': '#FFF4EA',
    '--color-grass-light': '#B7E99E',
    '--color-leaf-green': '#5A9B62',
    '--color-deep-green': '#69364C',
    '--color-peony-pink': '#FF9EBC',
    '--color-raspberry-pink': '#C92F62',
    '--color-sun-yellow': '#FFC94A',
    '--color-lavender': '#BB91DB',
    '--color-earth-brown': '#765052',
    '--color-wood': '#D88B69',
    '--color-soft-blue': '#C1E8D2',
    '--color-plum-text': '#542A40'
  }),
  hudIconMarkup: Object.freeze({
    coin: '<circle cx="12" cy="12" r="9" fill="#FFC94A" stroke="#69364C" stroke-width="2"/><path d="M12 18S6.5 14.8 6.5 10.8C6.5 7.8 10.1 6.7 12 9.4C13.9 6.7 17.5 7.8 17.5 10.8C17.5 14.8 12 18 12 18Z" fill="#FFF4EA" stroke="#69364C" stroke-width="1.2"/>',
    basket: '<path d="M6 10L4 19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19L18 10H6Z" fill="#D88B69" stroke="#69364C" stroke-width="2" stroke-linejoin="round"/><path d="M5 10H19M8 10C8 6 9.8 4 12 4C14.2 4 16 6 16 10" stroke="#69364C" stroke-width="2" stroke-linecap="round"/><path d="M12 9C9 7 7 9 12 13C17 9 15 7 12 9Z" fill="#FF9EBC" stroke="#69364C" stroke-width="1"/>'
  }),
  pathColor: '#F4D5BE',
  pathEdgeColor: 'rgba(105, 54, 76, 0.2)',
  fenceColor: 'rgba(105, 54, 76, 0.58)',
  awningColors: Object.freeze(['#FF9EBC', '#FFF4EA', '#F0A07A', '#FFF4EA']),
  getTreePalette(x, y) {
    const variants = [
      { leafGreen: '#71B978', highlight: '#C8E9A8', deepGreen: '#69364C' },
      { leafGreen: '#68AD70', highlight: '#F6D5A6', deepGreen: '#69364C' },
      { leafGreen: '#86C47D', highlight: '#FFE0A3', deepGreen: '#69364C' }
    ];
    return variants[Math.abs(Math.floor(x * 13 + y * 7)) % variants.length];
  },
  resolveFlowerConfig(flowerConfig) {
    const style = FLOWER_STYLES[flowerConfig.id];
    return style
      ? { ...flowerConfig, ...style, stemColor: '#5A9B62', outlineColor: '#69364C' }
      : flowerConfig;
  },
  drawAtmosphere(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 190, 145, 0.055)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
  drawShopDecor(ctx, x, y, width, height) {
    ctx.save();
    ctx.strokeStyle = 'rgba(105, 54, 76, 0.65)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 4);
    ctx.quadraticCurveTo(x + width / 2, y + 10, x + width - 8, y - 4);
    ctx.stroke();
    for (let index = 0; index < 9; index++) {
      const pearlX = x + 10 + index * (width - 20) / 8;
      ctx.fillStyle = '#FFF4EA';
      ctx.beginPath();
      ctx.arc(pearlX, y + 2 + Math.sin(index / 8 * Math.PI) * 7, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#F0A07A';
      ctx.stroke();
    }
    drawBow(ctx, x + width / 2, y - 4, 0.8);
    ctx.restore();
  },
  drawStockSignDecor(ctx, x, y, width) {
    ctx.save();
    ctx.strokeStyle = '#F0A07A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - 2, y - 2, width + 4, 42, 9);
    ctx.stroke();
    drawHeart(ctx, x + width - 9, y + 8, 8, '#E34B78');
    ctx.restore();
  },
  drawGardenDecor(ctx, decorations) {
    drawHeartArch(ctx, 444, 153);
    for (const decor of decorations) {
      if (decor.type === 'bench') {
        drawBow(ctx, decor.x + 31, decor.y - 6, 0.62);
      } else if (decor.type === 'sign') {
        const direction = decor.direction === 'left' ? -1 : 1;
        drawHeart(ctx, decor.x + direction * 50, decor.y - 19, 10, '#E34B78');
      }
    }
  },
  drawPathDecor(ctx) {
    drawHeartPebbles(ctx);
  },
  drawAmbient(ctx, type, x, y, phase, color, reducedEffects) {
    if (type === 'butterfly') {
      const flap = reducedEffects ? 0.55 : 0.45 + Math.abs(Math.sin(phase * 1.3)) * 0.15;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = phase % 2 < 1 ? '#FF9EBC' : '#FFF4EA';
      ctx.strokeStyle = '#69364C';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(-3, -1, 3.5, 4 * flap, -0.4, 0, Math.PI * 2);
      ctx.ellipse(3, -1, 3.5, 4 * flap, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.fillStyle = '#F0A07A';
    ctx.beginPath();
    ctx.ellipse(x, y, 2.6, 1.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  drawFlowerAccent(ctx, flowerConfig, progress, reducedEffects) {
    const style = FLOWER_STYLES[flowerConfig.id];
    if (!style || progress < 0.65) return;
    if (flowerConfig.id === 'daisy' || flowerConfig.id === 'sunflower') {
      drawHeart(ctx, 0, 0, flowerConfig.radius * 0.55, style.accent, '#69364C');
    } else if (flowerConfig.id === 'rose' || flowerConfig.id === 'orchid') {
      ctx.fillStyle = '#FFF4EA';
      ctx.strokeStyle = '#F0A07A';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(flowerConfig.radius * 0.24, -flowerConfig.radius * 0.18, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (flowerConfig.id === 'lavender') {
      drawBow(ctx, 0, flowerConfig.radius * 0.62, 0.38);
    }
  },
  drawReadyFlower(ctx, x, y, pulse, reducedEffects) {
    const radius = reducedEffects ? 18 : 18 + pulse * 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 245, 236, 0.14)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(91, 42, 58, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    return true;
  },
  drawPlayerAccessory(ctx, x, y, bounce, isSeated) {
    drawBow(ctx, x + 10, (isSeated ? -22 : -19) - bounce, 0.68);
  },
  drawCustomerAccessory(ctx, variant, bounce) {
    drawBow(ctx, variant % 2 === 0 ? -7 : 7, -21 - bounce, 0.55);
  }
});
