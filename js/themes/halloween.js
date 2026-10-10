function drawPumpkin(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#EF8A3A';
  ctx.strokeStyle = '#493D48';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(0, 5);
  ctx.moveTo(-4, -4);
  ctx.quadraticCurveTo(-2, 0, -4, 4);
  ctx.moveTo(4, -4);
  ctx.quadraticCurveTo(2, 0, 4, 4);
  ctx.stroke();
  ctx.fillStyle = '#64784B';
  ctx.beginPath();
  ctx.roundRect(-1.5, -9, 3, 4, 1);
  ctx.fill();
  ctx.restore();
}

function drawWeb(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(70, 56, 72, 0.72)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, 0);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, size);
  ctx.moveTo(0, 0);
  ctx.lineTo(size * 0.72, size * 0.72);
  for (let ring = 1; ring <= 3; ring++) {
    const distance = size * ring / 4;
    ctx.moveTo(distance, 0);
    ctx.quadraticCurveTo(distance * 0.66, distance * 0.66, 0, distance);
  }
  ctx.stroke();
  ctx.restore();
}

function drawBat(ctx, x, y, phase, reducedEffects) {
  ctx.save();
  ctx.translate(x, y);
  if (!reducedEffects) ctx.rotate(Math.sin(phase * 0.5) * 0.12);
  const flap = reducedEffects ? 0.65 : 0.55 + Math.abs(Math.sin(phase * 5)) * 0.22;
  ctx.fillStyle = '#483E50';
  ctx.strokeStyle = '#342F3B';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.quadraticCurveTo(-9, -6 * flap, -5, -3);
  ctx.lineTo(-3, -7);
  ctx.lineTo(0, -3);
  ctx.lineTo(3, -7);
  ctx.lineTo(5, -3);
  ctx.quadraticCurveTo(9, -6 * flap, 10, 0);
  ctx.quadraticCurveTo(5, -1, 0, 3);
  ctx.quadraticCurveTo(-5, -1, -10, 0);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FFD36B';
  ctx.fillRect(-3, -1, 1.5, 1.5);
  ctx.fillRect(2, -1, 1.5, 1.5);
  ctx.restore();
}

function drawFirefly(ctx, x, y, phase, reducedEffects) {
  const alpha = reducedEffects ? 0.9 : 0.55 + (Math.sin(phase * 2) + 1) * 0.2;
  ctx.save();
  ctx.fillStyle = `rgba(255, 211, 107, ${alpha})`;
  ctx.shadowColor = '#FFD36B';
  ctx.shadowBlur = reducedEffects ? 0 : 8;
  ctx.beginPath();
  ctx.arc(x, y, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWitchHat(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#4A3E50';
  ctx.strokeStyle = '#342F3B';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-8, -1);
  ctx.lineTo(-2, -15);
  ctx.quadraticCurveTo(1, -18, 2, -14);
  ctx.lineTo(8, -1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#E98743';
  ctx.beginPath();
  ctx.moveTo(-4, -7);
  ctx.lineTo(5, -7);
  ctx.lineTo(7, -3);
  ctx.lineTo(-5, -3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCatEars(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#493E50';
  ctx.strokeStyle = '#342F3B';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-9, 0);
  ctx.lineTo(-7, -12);
  ctx.lineTo(0, -4);
  ctx.closePath();
  ctx.moveTo(2, -4);
  ctx.lineTo(9, -12);
  ctx.lineTo(10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#E8A2A0';
  ctx.beginPath();
  ctx.moveTo(-7, -3);
  ctx.lineTo(-6.5, -8);
  ctx.lineTo(-3, -4);
  ctx.closePath();
  ctx.moveTo(4, -4);
  ctx.lineTo(8, -8);
  ctx.lineTo(8, -3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export const HALLOWEEN_THEME = Object.freeze({
  id: 'halloween-2026',
  label: 'Halloween',
  eventPillLabel: 'Jardim de Halloween',
  eventPillAriaLabel: 'Ver opções do tema de Halloween',
  eventPillIconMarkup: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L14.2 8.3L20 8.8L15.6 12.5L17 18.2L12 15.1L7 18.2L8.4 12.5L4 8.8L9.8 8.3L12 3Z" fill="#F0BD63" stroke="#403844" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  type: 'event',
  recurringWindow: Object.freeze({ start: '10-24', end: '11-07' }),
  palette: Object.freeze({
    cream: '#FFF3DF',
    grassLight: '#A5AE80',
    leafGreen: '#788857',
    pathEarth: '#785642',
    pathSoil: '#AD8B5B',
    pathSurface: '#CCB47A',
    deepGreen: '#403844',
    peonyPink: '#DDA1AD',
    raspberryPink: '#E47A42',
    sunYellow: '#F0BD63',
    lavender: '#9278B8',
    earthBrown: '#725040',
    wood: '#B88966',
    softBlue: '#C1D6D4',
    plumText: '#382E3A'
  }),
  cssTokens: Object.freeze({
    '--color-cream': '#FFF3DF',
    '--color-grass-light': '#A5AE80',
    '--color-leaf-green': '#788857',
    '--color-deep-green': '#403844',
    '--color-peony-pink': '#DDA1AD',
    '--color-raspberry-pink': '#E47A42',
    '--color-sun-yellow': '#F0BD63',
    '--color-lavender': '#9278B8',
    '--color-earth-brown': '#725040',
    '--color-wood': '#B88966',
    '--color-soft-blue': '#C1D6D4',
    '--color-plum-text': '#382E3A'
  }),
  awningColors: Object.freeze(['#E47A42', '#FFF3DF', '#9278B8', '#FFF3DF']),
  getTreePalette(x, y) {
    const variants = [
      { leafGreen: '#B5794E', highlight: '#D49A61', deepGreen: '#59433F' },
      { leafGreen: '#8775A6', highlight: '#AA91BE', deepGreen: '#493E50' },
      { leafGreen: '#9B965F', highlight: '#C1AC70', deepGreen: '#4B4B3C' }
    ];
    const seed = Math.abs(Math.floor(x * 13 + y * 7)) % variants.length;
    return variants[seed];
  },
  resolveFlowerConfig(flowerConfig) {
    const seasonalColors = {
      sunflower: { color: '#EF9141', centerColor: '#493E50' },
      lavender: { color: '#987BB8', centerColor: '#F0BD63' },
      orchid: { color: '#B47AA4', centerColor: '#F0BD63' },
      camellia: { color: '#D7838A', centerColor: '#F0BD63' },
      iris: { color: '#806DA8', centerColor: '#F0BD63' },
      jasmine: { color: '#E8D8BB', centerColor: '#F0BD63' },
      gardenia: { color: '#DCCFB7', centerColor: '#F0BD63' },
      anemone: { color: '#C66C77', centerColor: '#493E50' },
      dahlia: { color: '#B96E82', centerColor: '#F0BD63' },
      chrysanthemum: { color: '#D99A50', centerColor: '#493E50' },
      foxglove: { color: '#9278B8', centerColor: '#F0BD63' },
      verbena: { color: '#8979AA', centerColor: '#F0BD63' },
      hydrangea: { color: '#8196A9', centerColor: '#F0BD63' },
      lotus: { color: '#D9859E', centerColor: '#F0BD63' },
      magnolia: { color: '#D9C7C4', centerColor: '#F0BD63' },
      protea: { color: '#C3785E', centerColor: '#493E50' },
      ranunculus: { color: '#D58A59', centerColor: '#F0BD63' },
      alstroemeria: { color: '#C77E68', centerColor: '#F0BD63' }
    };
    const colors = seasonalColors[flowerConfig.id];
    return colors ? { ...flowerConfig, ...colors } : flowerConfig;
  },
  drawAtmosphere(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = 'rgba(91, 61, 89, 0.055)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
  drawShopDecor(ctx, x, y, width) {
    drawWeb(ctx, x + 1, y - 25, 18);
    drawWeb(ctx, x + width - 19, y - 25, 18);
    drawPumpkin(ctx, x + 12, y - 11, 0.82);
    drawPumpkin(ctx, x + width - 12, y - 11, 0.82);
  },
  drawStockSignDecor(ctx, x, y, width) {
    drawFirefly(ctx, x + width + 8, y + 12, y, true);
    ctx.save();
    ctx.strokeStyle = '#665044';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + width + 8, y + 15);
    ctx.lineTo(x + width + 8, y + 22);
    ctx.stroke();
    ctx.restore();
  },
  drawGardenDecor(ctx, decorations) {
    for (const decor of decorations) {
      if (decor.type === 'flowerBed') {
        drawPumpkin(ctx, decor.x + 78, decor.y + 3, 0.65);
      } else if (decor.type === 'sign') {
        const direction = decor.direction === 'left' ? -1 : 1;
        drawFirefly(ctx, decor.x + direction * 47, decor.y - 30, decor.y, true);
      }
    }
  },
  drawAmbient(ctx, type, x, y, phase, color, reducedEffects) {
    if (type === 'butterfly') drawBat(ctx, x, y, phase, reducedEffects);
    else drawFirefly(ctx, x, y, phase, reducedEffects);
  },
  drawPlayerAccessory(ctx, x, y, bounce, isSeated) {
    drawWitchHat(ctx, x, y + (isSeated ? -21 : -18) - bounce, 0.84);
  },
  drawCustomerAccessory(ctx, variant, bounce) {
    if (variant % 2 === 0) drawWitchHat(ctx, 0, -24 - bounce, 0.7);
    else drawCatEars(ctx, 0, -21 - bounce);
  },
  drawGardenLayer(ctx, mapBounds, reducedEffects) {
    if (!reducedEffects) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      for (let index = 0; index < 5; index++) {
        const x = mapBounds.minX + 210 + index * 185;
        const y = mapBounds.maxY - 30 - (index % 2) * 22;
        ctx.fillStyle = index % 2 ? '#9B6E9D' : '#CF8B54';
        ctx.beginPath();
        ctx.ellipse(x, y, 4, 2, index * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
});
