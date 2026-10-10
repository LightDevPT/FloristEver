// ========================================================
// FloristEver - Sistema de Sprites e Assets (assets.js)
// Renderização Vetorial Suave com Contornos em Verde Profundo
// Suporta carregamento opcional de imagens PNG no manifesto
// ========================================================
import { PALETTE, drawRoundedRect } from './utils.js';
import { themeManager } from './theme-manager.js';

class AssetManager {
  constructor() {
    // Manifesto de imagens externas (substituição transparente quando existirem PNGs)
    this.manifest = {
      player: null,
      worker: null,
      customer: null,
      daisy: null,
      tulip: null,
      sunflower: null,
      rose: null,
      orchid: null,
      lavender: null,
      peony: null,
      shop: null,
      fence: null
    };

    this.loadedImages = {};
  }

  // Permite registrar e carregar imagem externa sem alterar lógica do jogo
  registerImage(key, url) {
    this.manifest[key] = url;
    const img = new Image();
    img.src = url;
    img.onload = () => {
      this.loadedImages[key] = img;
    };
  }

  hasCustomImage(key) {
    return !!this.loadedImages[key];
  }

  drawCustomOrFallback(ctx, key, x, y, w, h, fallbackFn) {
    if (this.loadedImages[key]) {
      ctx.drawImage(this.loadedImages[key], x - w / 2, y - h / 2, w, h);
    } else {
      fallbackFn();
    }
  }

  // --------------------------------------------------------
  // 1. Jogador (Florista com Chapéu de Palha e Avental)
  // --------------------------------------------------------
  drawPlayer(ctx, x, y, facing = 1, isWalking = false, walkTime = 0, basketCount = 0, basketCap = 10, isSeated = false) {
    this.drawCustomOrFallback(ctx, 'player', x, y, 48, 54, () => {
      const palette = themeManager.assetPalette;
      ctx.save();
      ctx.translate(x, y);

      // Animação de squash e stretch de caminhada
      const bounce = isWalking ? Math.sin(walkTime * 12) * 3 : 0;
      const sway = isWalking ? Math.cos(walkTime * 10) * 0.08 : 0;
      ctx.rotate(sway);

      // Sombra suave sob a personagem
      ctx.fillStyle = 'rgba(47, 93, 74, 0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 18, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pés / Botas
      ctx.fillStyle = palette.wood;
      ctx.strokeStyle = palette.deepGreen;
      ctx.lineWidth = 2.5;
      const legOffset = isSeated ? 0 : isWalking ? Math.sin(walkTime * 12) * 5 : 0;
      ctx.beginPath();
      if (isSeated) {
        ctx.ellipse(-7, 17, 6, 3.5, -0.12, 0, Math.PI * 2);
        ctx.ellipse(7, 17, 6, 3.5, 0.12, 0, Math.PI * 2);
      } else {
        ctx.ellipse(-7, 16 - bounce + legOffset, 5, 4, 0, 0, Math.PI * 2);
        ctx.ellipse(7, 16 - bounce - legOffset, 5, 4, 0, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      // Corpo / Vestuário acolhedor
      ctx.fillStyle = palette.peonyPink;
      ctx.beginPath();
      ctx.roundRect(-12, isSeated ? -5 : -2 - bounce, 24, isSeated ? 19 : 20, [4, 4, 10, 10]);
      ctx.fill();
      ctx.stroke();

      // Avental verde folha
      ctx.fillStyle = palette.leafGreen;
      ctx.beginPath();
      ctx.roundRect(-8, isSeated ? 1 : 3 - bounce, 16, 14, [2, 2, 6, 6]);
      ctx.fill();
      ctx.stroke();

      // Cabeça
      ctx.fillStyle = '#FFEBD1';
      ctx.beginPath();
      ctx.arc(0, (isSeated ? -14 : -11) - bounce, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cabelo fofo
      ctx.fillStyle = palette.earthBrown;
      ctx.beginPath();
      ctx.arc(0, (isSeated ? -17 : -14) - bounce, 12, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Olhos sorridentes e bochechas rosadas
      ctx.fillStyle = palette.deepGreen;
      const eyeDir = facing > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.arc(3 * eyeDir - 2, -10 - bounce, 1.6, 0, Math.PI * 2);
      ctx.arc(3 * eyeDir + 3, -10 - bounce, 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Bochechas rosadas
      ctx.fillStyle = 'rgba(224, 87, 125, 0.45)';
      ctx.beginPath();
      ctx.arc(3 * eyeDir - 4, -7 - bounce, 2.5, 0, Math.PI * 2);
      ctx.arc(3 * eyeDir + 5, -7 - bounce, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Chapéu de Palha com fita cor-de-rosa
      ctx.fillStyle = palette.cream;
      ctx.beginPath();
      ctx.ellipse(0, (isSeated ? -21 : -18) - bounce, 17, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Copa do chapéu
      ctx.beginPath();
      ctx.arc(0, (isSeated ? -23 : -20) - bounce, 8, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Fita do chapéu
      ctx.fillStyle = palette.raspberryPink;
      ctx.fillRect(-8, (isSeated ? -24 : -21) - bounce, 16, 3);

      // Cesto de Vime lateral
      const basketX = facing > 0 ? 14 : -14;
      ctx.fillStyle = palette.wood;
      ctx.beginPath();
      ctx.roundRect(basketX - 7, -2 - bounce, 14, 12, 4);
      ctx.fill();
      ctx.stroke();

      // Flores visíveis dentro do cesto
      if (basketCount > 0) {
        ctx.fillStyle = palette.peonyPink;
        ctx.beginPath();
        ctx.arc(basketX - 3, -4 - bounce, 4, 0, Math.PI * 2);
        ctx.arc(basketX + 3, -5 - bounce, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      themeManager.drawLayer(ctx, 'drawPlayerAccessory', 0, 0, bounce, isSeated);

      ctx.restore();
    });
  }

  // --------------------------------------------------------
  // 2. Florista Ajudante (Worker autónomo com boina verde)
  // --------------------------------------------------------
  drawWorker(ctx, x, y, facing = 1, isWalking = false, walkTime = 0, basketCount = 0) {
    this.drawCustomOrFallback(ctx, 'worker', x, y, 44, 50, () => {
      const palette = themeManager.assetPalette;
      ctx.save();
      ctx.translate(x, y);

      const bounce = isWalking ? Math.sin(walkTime * 12) * 2.5 : 0;

      // Sombra
      ctx.fillStyle = 'rgba(47, 93, 74, 0.2)';
      ctx.beginPath();
      ctx.ellipse(0, 16, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Botas
      ctx.fillStyle = palette.deepGreen;
      ctx.strokeStyle = palette.deepGreen;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(-6, 14 - bounce, 4, 3, 0, 0, Math.PI * 2);
      ctx.ellipse(6, 14 - bounce, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Macacão azul acolhedor
      ctx.fillStyle = palette.softBlue;
      ctx.beginPath();
      ctx.roundRect(-10, -2 - bounce, 20, 18, [4, 4, 8, 8]);
      ctx.fill();
      ctx.stroke();

      // Cabeça
      ctx.fillStyle = '#FFEBD1';
      ctx.beginPath();
      ctx.arc(0, -10 - bounce, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Olhos
      ctx.fillStyle = palette.deepGreen;
      ctx.beginPath();
      ctx.arc(2, -9 - bounce, 1.5, 0, Math.PI * 2);
      ctx.arc(6, -9 - bounce, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Boina Verde Folha
      ctx.fillStyle = palette.leafGreen;
      ctx.beginPath();
      ctx.ellipse(0, -16 - bounce, 13, 6, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pequeno pompom na boina
      ctx.fillStyle = palette.sunYellow;
      ctx.beginPath();
      ctx.arc(4, -20 - bounce, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cesto de colheita
      if (basketCount > 0) {
        ctx.fillStyle = palette.wood;
        ctx.beginPath();
        ctx.roundRect(10, 0 - bounce, 10, 10, 3);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  // --------------------------------------------------------
  // 3. Clientes da Loja
  // --------------------------------------------------------
  drawCustomer(ctx, x, y, variant = 0, isWalking = false, walkTime = 0, speechIcon = null, speechText = '', speechFlowers = []) {
    const palette = themeManager.assetPalette;
    const flowerOrders = Array.isArray(speechFlowers) ? speechFlowers : [];
    ctx.save();
    ctx.translate(x, y);

    const bounce = isWalking ? Math.sin(walkTime * 11) * 2.5 : 0;
    const bodyColors = [palette.lavender, palette.peonyPink, palette.sunYellow, palette.softBlue];
    const color = bodyColors[variant % bodyColors.length];

    // Sombra
    ctx.fillStyle = 'rgba(47, 93, 74, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sapatos
    ctx.fillStyle = palette.deepGreen;
    ctx.beginPath();
    ctx.ellipse(-5, 14 - bounce, 4, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(5, 14 - bounce, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Vestido / Casaco
    ctx.fillStyle = color;
    ctx.strokeStyle = palette.deepGreen;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-11, -2 - bounce, 22, 18, [6, 6, 8, 8]);
    ctx.fill();
    ctx.stroke();

    // Cabeça
    ctx.fillStyle = '#FFEBD1';
    ctx.beginPath();
    ctx.arc(0, -10 - bounce, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cabelo variado
    ctx.fillStyle = variant % 2 === 0 ? palette.earthBrown : '#2F241F';
    ctx.beginPath();
    ctx.arc(0, -12 - bounce, 11, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Olhos
    ctx.fillStyle = palette.deepGreen;
    ctx.beginPath();
    ctx.arc(-3, -9 - bounce, 1.5, 0, Math.PI * 2);
    ctx.arc(3, -9 - bounce, 1.5, 0, Math.PI * 2);
    ctx.fill();

    themeManager.drawLayer(ctx, 'drawCustomerAccessory', variant, bounce);

    // Balão de fala com o pedido
    if (speechIcon || speechText || flowerOrders.length > 0) {
      ctx.save();
      ctx.translate(0, -38 - bounce);

      const speechLabel = speechText || speechIcon || '❓';
      ctx.font = '16px sans-serif';
      const contentWidth = flowerOrders.length > 0
        ? flowerOrders.length * 22
        : ctx.measureText(speechLabel).width;
      const bubbleWidth = Math.max(44, contentWidth + 16);

      // Balão
      ctx.fillStyle = palette.cream;
      ctx.strokeStyle = palette.deepGreen;
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, -bubbleWidth / 2, -16, bubbleWidth, 28, 8, true, true);

      // Ponta do balão
      ctx.beginPath();
      ctx.moveTo(-4, 12);
      ctx.lineTo(0, 18);
      ctx.lineTo(4, 12);
      ctx.closePath();
      ctx.fillStyle = palette.cream;
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (flowerOrders.length > 0) {
        const startX = -((flowerOrders.length - 1) * 22) / 2;
        flowerOrders.forEach(({ flower, amount }, index) => {
          const itemX = startX + index * 22;
          this.drawFlowerSymbol(ctx, itemX - 2, -2, flower);
          if (amount > 1) {
            ctx.fillStyle = palette.deepGreen;
            ctx.font = '700 7px "Quicksand", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`×${amount}`, itemX + 3, 4);
          }
        });
      } else {
        ctx.fillText(speechLabel, 0, -2);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  // --------------------------------------------------------
  // 4. Flores no Campo (em vários estágios de crescimento)
  // --------------------------------------------------------
  drawFlower(ctx, x, y, flowerConfig, progress = 1.0, swayAngle = 0) {
    flowerConfig = themeManager.resolveFlowerConfig(flowerConfig);
    const palette = themeManager.palette;
    ctx.save();
    ctx.translate(x, y);

    // progress: 0.0 -> 0.25 (semente/solo mole), 0.25 -> 0.65 (broto verde), 0.65 -> 0.99 (botão), >= 1.0 (madura/pronta)
    if (progress < 0.25) {
      // Estado 1: Montinho de terra com semente
      ctx.fillStyle = '#6E4527';
      ctx.beginPath();
      ctx.ellipse(0, 4, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.leafGreen;
      ctx.beginPath();
      ctx.arc(0, 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (progress < 0.65) {
      // Estado 2: Pequeno broto com folhinha
      const t = (progress - 0.25) / 0.4;
      const height = 6 + t * 8;
      ctx.strokeStyle = palette.leafGreen;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.quadraticCurveTo(2, 4 - height / 2, 0, 4 - height);
      ctx.stroke();

      // Pequenas folhinhas
      ctx.fillStyle = palette.leafGreen;
      ctx.beginPath();
      ctx.ellipse(4, 4 - height * 0.6, 5, 2.5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Estado 3 & 4: Flor em crescimento avançado ou madura
    const isMature = progress >= 1.0;
    const scale = isMature ? 1.0 : (0.7 + (progress - 0.65) * 0.85);

    // Balanço orgânico suave ao vento
    const currentSway = isMature ? Math.sin(swayAngle) * 0.08 : 0;
    ctx.rotate(currentSway);
    ctx.scale(scale, scale);

    // Caule
    ctx.strokeStyle = flowerConfig.stemColor || palette.leafGreen;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.quadraticCurveTo(Math.sin(swayAngle * 0.5) * 4, -4, 0, -12);
    ctx.stroke();

    // Folha lateral
    ctx.fillStyle = palette.leafGreen;
    ctx.strokeStyle = palette.deepGreen;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(7, -4, 6, 3, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cabeça da Flor
    ctx.translate(0, -14);

    if (isMature) themeManager.drawFlowerHalo(ctx, flowerConfig);

    // Se estiver madura, adiciona leve brilho / pulso dourado suave
    if (isMature) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(0, 0, flowerConfig.radius + 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pétalas
    const petals = flowerConfig.petals || 6;
    const petalColor = flowerConfig.color || palette.peonyPink;
    ctx.fillStyle = petalColor;
    ctx.strokeStyle = flowerConfig.outlineColor || palette.deepGreen;
    ctx.lineWidth = 2.2;

    if (flowerConfig.shape === 'spike') {
      for (let index = 0; index < petals; index++) {
        const offset = (index - (petals - 1) / 2) * flowerConfig.radius * 0.16;
        ctx.beginPath();
        ctx.ellipse(
          offset,
          -Math.abs(offset) * 0.45,
          flowerConfig.radius * 0.3,
          flowerConfig.radius * 0.2,
          Math.sign(offset) * 0.55,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
      }
    } else {
      for (let i = 0; i < petals; i++) {
        const angle = (i / petals) * Math.PI * 2;
        const px = Math.cos(angle) * (flowerConfig.radius * 0.65);
        const py = Math.sin(angle) * (flowerConfig.radius * 0.65);

        ctx.beginPath();
        if (flowerConfig.petalShape === 'heart') {
          const petalSize = flowerConfig.radius * 0.44;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(angle + Math.PI / 2);
          ctx.scale(petalSize / 16, petalSize / 16);
          ctx.moveTo(0, 6);
          ctx.bezierCurveTo(-2, 4, -8, 0, -8, -3);
          ctx.bezierCurveTo(-8, -8, -2, -9, 0, -4);
          ctx.bezierCurveTo(2, -9, 8, -8, 8, -3);
          ctx.bezierCurveTo(8, 0, 2, 4, 0, 6);
          ctx.restore();
          ctx.closePath();
        } else {
          ctx.ellipse(px, py, flowerConfig.radius * 0.45, flowerConfig.radius * 0.32, angle, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();
      }
    }

    // Centro da Flor
    ctx.fillStyle = flowerConfig.centerColor || palette.sunYellow;
    ctx.beginPath();
    ctx.arc(0, 0, flowerConfig.radius * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    themeManager.drawLayer(
      ctx,
      'drawFlowerAccent',
      flowerConfig,
      progress,
      themeManager.effectsReduced
    );
    ctx.restore();
  }

  drawFlowerSymbol(ctx, x, y, flowerConfig, muted = false) {
    ctx.save();
    ctx.translate(x, y);

    const petalColor = muted ? '#B9B3A8' : flowerConfig.color;
    const centerColor = muted ? '#81796D' : flowerConfig.centerColor;
    const outlineColor = muted ? '#81796D' : flowerConfig.outlineColor || PALETTE.deepGreen;
    const petalCount = Math.max(3, Math.min(18, Math.round(flowerConfig.petals || 6)));

    ctx.strokeStyle = flowerConfig.stemColor || PALETTE.leafGreen;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(0, 1);
    ctx.stroke();

    ctx.fillStyle = flowerConfig.stemColor || PALETTE.leafGreen;
    ctx.beginPath();
    ctx.ellipse(-2, 4, 2.2, 1, -0.45, 0, Math.PI * 2);
    ctx.ellipse(2, 5, 2, 0.9, 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = petalColor;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.55;
    if (flowerConfig.shape === 'spike') {
      for (let index = 0; index < petalCount; index++) {
        const offset = (index - (petalCount - 1) / 2) * 0.55;
        ctx.beginPath();
        ctx.ellipse(offset, -Math.abs(offset) * 0.18, 1.15, 1.8, Math.sign(offset) * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else {
      const headRadius = flowerConfig.radius >= 18 ? 2.6 : 2.1;
      for (let index = 0; index < petalCount; index++) {
        const angle = (index / petalCount) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(
          Math.cos(angle) * headRadius,
          Math.sin(angle) * headRadius - 1.5,
          2.15,
          flowerConfig.petalShape === 'heart' ? 1.4 : 1.05,
          angle,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.fillStyle = centerColor;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(0, -1.5, 1.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // --------------------------------------------------------
  // 5. Loja e Balcão
  // --------------------------------------------------------
  drawShopBuilding(ctx, x, y, width, height, decorLevel = 0, storeName = 'FloristEver', expansionLevel = 0) {
    const palette = themeManager.assetPalette;
    ctx.save();
    ctx.translate(x, y);

    // Sombra do edifício
    ctx.fillStyle = 'rgba(47, 93, 74, 0.25)';
    drawRoundedRect(ctx, 4, 8, width, height, 16, true, false);

    // Paredes de Madeira da Loja
    ctx.fillStyle = palette.wood;
    ctx.strokeStyle = palette.deepGreen;
    ctx.lineWidth = 4;
    drawRoundedRect(ctx, 0, 0, width, height, 16, true, true);

    // Tábuas horizontais de madeira na parede
    ctx.strokeStyle = 'rgba(47, 93, 74, 0.25)';
    ctx.lineWidth = 2;
    for (let py = 30; py < height - 10; py += 24) {
      ctx.beginPath();
      ctx.moveTo(8, py);
      ctx.lineTo(width - 8, py);
      ctx.stroke();
    }

    // Toldo / Cobertura listada (Creme & Rosa Framboesa)
    const awningHeight = 36;
    const stripeCount = 7;
    const stripeWidth = width / stripeCount;

    for (let i = 0; i < stripeCount; i++) {
      const fallbackColor = i % 2 === 0 ? palette.raspberryPink : palette.cream;
      ctx.fillStyle = themeManager.getAwningColor(i, fallbackColor);
      ctx.strokeStyle = palette.deepGreen;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(i * stripeWidth, -awningHeight + 10, stripeWidth, awningHeight, [0, 0, 8, 8]);
      ctx.fill();
      ctx.stroke();
    }

    // Cada ampliação acrescenta uma montra à fachada da loja.
    const windowCount = Math.max(1, Math.min(4, 1 + expansionLevel));
    const windowSpacing = windowCount > 1 ? (width - 108) / (windowCount - 1) : 0;
    for (let index = 0; index < windowCount; index++) {
      const windowX = 24 + index * windowSpacing;
      ctx.fillStyle = palette.softBlue;
      ctx.strokeStyle = palette.deepGreen;
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, windowX, 40, 60, 48, 8, true, true);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.moveTo(windowX + 6, 46);
      ctx.lineTo(windowX + 26, 46);
      ctx.lineTo(windowX + 12, 80);
      ctx.lineTo(windowX + 2, 80);
      ctx.fill();
    }

    // Placa com o nome personalizável da loja.
    ctx.fillStyle = palette.cream;
    ctx.strokeStyle = palette.deepGreen;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, width / 2 - 70, 8, 140, 26, 8, true, true);

    ctx.fillStyle = palette.plumText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const signText = String(storeName || 'FloristEver').trim() || 'FloristEver';
    const maxTextWidth = 126;
    let fontSize = 13;
    ctx.font = `800 ${fontSize}px "Quicksand", sans-serif`;
    while (fontSize > 7 && ctx.measureText(signText).width > maxTextWidth) {
      fontSize--;
      ctx.font = `800 ${fontSize}px "Quicksand", sans-serif`;
    }
    ctx.fillText(signText, width / 2, 21, maxTextWidth);

    // Decorações extras se tiver decorLevel
    if (decorLevel > 0) {
      // Vaso ornamental à esquerda
      ctx.fillStyle = palette.earthBrown;
      drawRoundedRect(ctx, -14, height - 34, 18, 28, 4, true, true);
      ctx.fillStyle = palette.peonyPink;
      ctx.beginPath();
      ctx.arc(-5, height - 38, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  // Balcão de Vendas (onde o jogador e o cliente se encontram)
  drawCounter(ctx, x, y, width, height, hasCashier = false) {
    const palette = themeManager.assetPalette;
    ctx.save();
    ctx.translate(x, y);

    // Balcão de madeira nobre polida
    ctx.fillStyle = '#D6A87A';
    ctx.strokeStyle = palette.deepGreen;
    ctx.lineWidth = 3.5;
    drawRoundedRect(ctx, 0, 0, width, height, 10, true, true);

    // Tampo superior
    ctx.fillStyle = '#E8C59D';
    drawRoundedRect(ctx, -2, -4, width + 4, 12, 6, true, true);

    // Tapete acolhedor em frente ao balcão
    ctx.fillStyle = palette.peonyPink;
    ctx.strokeStyle = palette.deepGreen;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 10, height + 4, width - 20, 16, 6, true, true);

    // Caixa registadora dourada se tiver upgrade de Caixa
    if (hasCashier) {
      ctx.fillStyle = palette.sunYellow;
      ctx.strokeStyle = palette.deepGreen;
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, width - 36, -14, 22, 14, 4, true, true);

      // Pequena campainha / mostrador
      ctx.fillStyle = palette.cream;
      ctx.fillRect(width - 32, -10, 14, 5);
      ctx.strokeRect(width - 32, -10, 14, 5);
    }

    ctx.restore();
  }

  // --------------------------------------------------------
  // 6. Árvores, Borboletas e Abelhas Acolhedoras
  // --------------------------------------------------------
  drawTree(ctx, x, y, time = 0, themePalette = null) {
    ctx.save();
    ctx.translate(x, y);

    const sway = Math.sin(time + x * 0.05) * 0.04;
    ctx.rotate(sway);

    // Sombra
    ctx.fillStyle = 'rgba(47, 93, 74, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 32, 28, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tronco
    ctx.fillStyle = PALETTE.earthBrown;
    ctx.strokeStyle = PALETTE.deepGreen;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-7, 6, 14, 26, [2, 2, 4, 4]);
    ctx.fill();
    ctx.stroke();

    // Copa da Árvore (Camadas orgânicas em Verde Folha)
    ctx.fillStyle = themePalette?.leafGreen || PALETTE.leafGreen;
    ctx.strokeStyle = themePalette?.deepGreen || PALETTE.deepGreen;
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    ctx.arc(0, -6, 24, 0, Math.PI * 2);
    ctx.arc(-14, 2, 18, 0, Math.PI * 2);
    ctx.arc(14, 2, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Toque de luz na copa
    ctx.fillStyle = themePalette?.highlight || '#78BC84';
    ctx.beginPath();
    ctx.arc(-6, -12, 12, 0, Math.PI * 2);
    ctx.fill();

    themeManager.drawLayer(ctx, 'drawTreeDecor', time, themeManager.effectsReduced);

    ctx.restore();
  }

  drawButterfly(ctx, x, y, phase = 0, color = PALETTE.peonyPink) {
    ctx.save();
    ctx.translate(x, y);
    const flap = Math.sin(phase * 16);

    ctx.fillStyle = color;
    ctx.strokeStyle = PALETTE.deepGreen;
    ctx.lineWidth = 1.5;

    // Asas esquerda e direita
    ctx.beginPath();
    ctx.ellipse(-4 * Math.abs(flap), 0, 6 * Math.abs(flap), 5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(4 * Math.abs(flap), 0, 6 * Math.abs(flap), 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Corpo minúsculo
    ctx.fillStyle = PALETTE.deepGreen;
    ctx.fillRect(-1, -4, 2, 8);

    ctx.restore();
  }

  drawBee(ctx, x, y, phase = 0) {
    ctx.save();
    ctx.translate(x, y);
    const flap = Math.sin(phase * 24);

    // Asinhas translúcidas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.ellipse(0, -4, 4, 3 * Math.abs(flap), 0, 0, Math.PI * 2);
    ctx.fill();

    // Corpo listrado de abelha
    ctx.fillStyle = PALETTE.sunYellow;
    ctx.strokeStyle = PALETTE.deepGreen;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Listras pretas/castanhas
    ctx.fillStyle = PALETTE.deepGreen;
    ctx.fillRect(-1, -3, 1.5, 6);
    ctx.fillRect(1.5, -3, 1.5, 6);

    ctx.restore();
  }
}

export const assetManager = new AssetManager();
