// ========================================================
// FloristEver - Sistema de Parcelas e Campo de Flores (field.js)
// Grelha de parcelas com 6 flores cada, crescimento e colheita
// ========================================================
import { FLOWERS_CONFIG } from '../config/flowers.js';
import { assetManager } from '../assets.js';
import { PALETTE, drawRoundedRect, drawCoinIcon, distance, formatNumber } from '../utils.js';
import { themeManager } from '../theme-manager.js';

const MATURE_FLOWER_CACHE_THRESHOLD = 24;
const MATURE_FLOWER_SPRITE_PHASES = 8;
const MATURE_FLOWER_SPRITE_SIZE = 96;
const MATURE_FLOWER_SPRITE_ORIGIN = 48;
const MATURE_FLOWER_SPRITE_BASELINE = 64;

export class FieldManager {
  constructor(state, sound, particles) {
    this.state = state;
    this.sound = sound;
    this.particles = particles;

    this.plotWidth = 190;
    this.plotHeight = 140;
    this.originX = 400; // Posição inicial dos campos à direita da loja
    this.originY = 160;
    this.gapX = 28;
    this.gapY = 32;

    this.swayTime = 0;
    this.cachedPlots = null;
    this.cachedPlotCount = -1;
    this.cachedGridBounds = { maxGridX: 0, maxGridY: 0 };
    this.cachedPlotGrid = null;
    this.cachedPlotGridSource = null;
    this.cachedPlotGridCount = -1;
    this.flowerCandidatesByPlot = null;
    this.flowerCandidateSource = null;
    this.flowerCandidateCount = -1;
    this.readyFlowers = [];
    this.matureFlowerSprites = new Map();
    this.matureFlowerSpriteSignature = null;
    this.plotBaseSprites = new Map();
    this.plotBaseSpriteSignature = null;
  }

  // Converte grelha de parcela em coordenadas do mundo
  getPlotWorldPos(gridX, gridY) {
    return {
      x: this.originX + gridX * (this.plotWidth + this.gapX),
      y: this.originY + gridY * (this.plotHeight + this.gapY)
    };
  }

  getGridBounds() {
    if (this.cachedPlots === this.state.plots && this.cachedPlotCount === this.state.plots.length) {
      return this.cachedGridBounds;
    }

    let maxGridX = 0;
    let maxGridY = 0;
    for (const plot of this.state.plots) {
      maxGridX = Math.max(maxGridX, plot.gridX);
      maxGridY = Math.max(maxGridY, plot.gridY);
    }
    this.cachedPlots = this.state.plots;
    this.cachedPlotCount = this.state.plots.length;
    this.cachedGridBounds = { maxGridX, maxGridY };
    return this.cachedGridBounds;
  }

  getMapAreaBounds() {
    const { maxGridX, maxGridY } = this.getGridBounds();
    return {
      left: 280,
      top: 140,
      right: Math.max(920, this.originX + maxGridX * (this.plotWidth + this.gapX) + this.plotWidth + 35),
      bottom: Math.max(500, this.originY + maxGridY * (this.plotHeight + this.gapY) + this.plotHeight + 35)
    };
  }

  // Posição no mundo de cada uma das 6 flores dentro da parcela (2 linhas x 3 colunas)
  getFlowerWorldPos(plotPos, flowerIndex) {
    const col = flowerIndex % 3;
    const row = Math.floor(flowerIndex / 3);
    const startX = plotPos.x + 36;
    const startY = plotPos.y + 44;
    const spacingX = 58;
    const spacingY = 56;

    return {
      x: startX + col * spacingX,
      y: startY + row * spacingY
    };
  }

  getMatureFlowerSprites(flowerId, flowerConfig) {
    // Performance fallback may toggle while the scene is running; keep the costly
    // sprite cache stable and key it only on settings that change its base artwork.
    const signature = [
      themeManager.activeTheme?.id || 'classic',
      this.state.settings?.graphicsQuality || 'normal',
      this.state.settings?.themeReducedEffects === true
    ].join(':');
    if (signature !== this.matureFlowerSpriteSignature) {
      this.matureFlowerSprites.clear();
      this.matureFlowerSpriteSignature = signature;
    }
    const cachedSprites = this.matureFlowerSprites.get(flowerId);
    if (cachedSprites) return cachedSprites;
    if (typeof document === 'undefined') return null;

    const sprites = [];
    for (let phase = 0; phase < MATURE_FLOWER_SPRITE_PHASES; phase++) {
      const canvas = document.createElement('canvas');
      canvas.width = MATURE_FLOWER_SPRITE_SIZE;
      canvas.height = MATURE_FLOWER_SPRITE_SIZE;
      const spriteContext = canvas.getContext('2d');
      if (!spriteContext) return null;
      assetManager.drawFlower(
        spriteContext,
        MATURE_FLOWER_SPRITE_ORIGIN,
        MATURE_FLOWER_SPRITE_BASELINE,
        flowerConfig,
        1,
        (phase / MATURE_FLOWER_SPRITE_PHASES) * Math.PI * 4,
        false
      );
      sprites.push(canvas);
    }
    this.matureFlowerSprites.set(flowerId, sprites);
    return sprites;
  }

  getPlotBaseSprite(flowerId, flowerConfig, palette, luminousTheme) {
    if (typeof document === 'undefined') return null;
    const themeId = themeManager.activeTheme?.id || 'classic';
    const maxScale = this.state.settings?.graphicsQuality === 'low'
      ? 1.0
      : this.state.settings?.graphicsQuality === 'normal'
      ? 1.25
      : 2.0;
    const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    const pixelScale = Math.max(1, Math.min(devicePixelRatio || 1, maxScale));
    const fontReady = !document.fonts?.check || document.fonts.check('800 10px "Quicksand"');
    const signature = `${themeId}:${pixelScale}:${fontReady}`;
    if (signature !== this.plotBaseSpriteSignature) {
      this.plotBaseSprites.clear();
      this.plotBaseSpriteSignature = signature;
    }
    const cached = this.plotBaseSprites.get(flowerId);
    if (cached) return cached;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(this.plotWidth * pixelScale);
    canvas.height = Math.round((this.plotHeight + 10) * pixelScale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 10 * pixelScale);

    ctx.fillStyle = palette.earthBrown;
    ctx.strokeStyle = palette.deepGreen;
    ctx.lineWidth = 3.5;
    drawRoundedRect(ctx, 0, 0, this.plotWidth, this.plotHeight, 18, true, true);
    ctx.strokeStyle = palette.earthGroove || (luminousTheme ? '#735A70' : '#744E31');
    ctx.lineWidth = 2;
    for (let row = 36; row < this.plotHeight; row += 56) {
      ctx.beginPath();
      ctx.moveTo(14, row + 16);
      ctx.lineTo(this.plotWidth - 14, row + 16);
      ctx.stroke();
    }

    ctx.font = '800 10px "Quicksand", sans-serif';
    const nameWidth = Math.min(this.plotWidth - 56, Math.max(76, ctx.measureText(flowerConfig.name).width + 18));
    ctx.fillStyle = palette.cream;
    ctx.strokeStyle = palette.deepGreen;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, this.plotWidth / 2 - nameWidth / 2, -10, nameWidth, 18, 6, true, true);
    ctx.fillStyle = palette.plumText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(flowerConfig.name, this.plotWidth / 2, -1, nameWidth - 12);

    this.plotBaseSprites.set(flowerId, canvas);
    return canvas;
  }

  update(dt) {
    this.swayTime += dt * 3;
    const growthMultiplier = this.state.getGrowthTimeMultiplier();
    const now = Date.now();
    this.readyFlowers.length = 0;

    if (this.flowerCandidateSource !== this.state.plots || this.flowerCandidateCount !== this.state.plots.length) {
      this.flowerCandidatesByPlot = new Map();
      for (const plot of this.state.plots) {
        const pos = this.getPlotWorldPos(plot.gridX, plot.gridY);
        this.flowerCandidatesByPlot.set(plot, plot.flowers.map((_, flowerIndex) => {
          const flowerPos = this.getFlowerWorldPos(pos, flowerIndex);
          return {
            plot,
            flowerIndex,
            x: flowerPos.x,
            y: flowerPos.y,
            flowerId: plot.flowerId
          };
        }));
      }
      this.flowerCandidateSource = this.state.plots;
      this.flowerCandidateCount = this.state.plots.length;
    }

    for (const plot of this.state.plots) {
      if (!plot.unlocked) continue;
      const flowerCfg = FLOWERS_CONFIG[plot.flowerId];
      if (!flowerCfg) continue;

      const duration = flowerCfg.growthTime * growthMultiplier;
      const plotGrowthMultiplier = this.state.getPlotGrowthMultiplier(plot, now);
      const candidates = this.flowerCandidatesByPlot.get(plot);
      for (const candidate of candidates) candidate.flowerId = plot.flowerId;

      for (let i = 0; i < plot.flowers.length; i++) {
        const flower = plot.flowers[i];
        if (!flower) {
          plot.flowers[i] = { progress: 0.0, timer: 0 };
          continue;
        }
        if (flower.progress < 1.0) {
          flower.progress += (dt * plotGrowthMultiplier) / duration;
          if (flower.progress >= 1.0) {
            flower.progress = 1.0;
          }
        }
        if (flower.progress >= 1.0) {
          this.readyFlowers.push(candidates[i]);
        }
      }
    }
  }

  // Verifica se o jogador colhe alguma flor ao passar por cima
  checkPlayerHarvest(playerX, playerY) {
    if (this.state.basket.length >= this.state.getBasketCapacity()) {
      return false;
    }

    for (const plot of this.state.plots) {
      if (!plot.unlocked) continue;
      const pos = this.getPlotWorldPos(plot.gridX, plot.gridY);

      // Verificação rápida de proximidade à parcela
      if (playerX < pos.x - 20 || playerX > pos.x + this.plotWidth + 20 ||
          playerY < pos.y - 20 || playerY > pos.y + this.plotHeight + 20) {
        continue;
      }

      const flowerCfg = FLOWERS_CONFIG[plot.flowerId];
      if (!flowerCfg) continue;

      for (let i = 0; i < plot.flowers.length; i++) {
        const flower = plot.flowers[i];
        if (!flower) continue;
        if (flower.progress >= 1.0) {
          const fPos = this.getFlowerWorldPos(pos, i);
          const dist = distance(playerX, playerY, fPos.x, fPos.y);

          if (dist < 44) {
            // Colheita automática!
            if (this.state.addToBasket(plot.flowerId)) {
              flower.progress = 0.0; // Recomeça o ciclo imediatamente
              this.sound.playHarvest();
              this.particles.emitPetals(fPos.x, fPos.y, flowerCfg.color, 8);
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  // Encontra a flor madura mais próxima (usado pela IA dos floristas ajudantes)
  findNearestReadyFlower(x, y, canHarvest = () => true, priorityCanHarvest = null) {
    let nearest = null;
    let minDist = Infinity;

    let priorityNearest = null;
    let priorityMinDist = Infinity;
    for (const candidate of this.readyFlowers) {
      if (candidate.plot.flowers[candidate.flowerIndex]?.progress < 1.0) continue;
      const dist = distance(x, y, candidate.x, candidate.y);
      if (canHarvest(candidate.flowerId) && dist < minDist) {
        minDist = dist;
        nearest = candidate;
      }
      if (priorityCanHarvest?.(candidate.flowerId) && dist < priorityMinDist) {
        priorityMinDist = dist;
        priorityNearest = candidate;
      }
    }
    return priorityNearest || nearest;
  }

  // Interação de clique numa parcela bloqueada para comprar
  handleClick(worldX, worldY) {
    for (const plot of this.state.plots) {
      const pos = this.getPlotWorldPos(plot.gridX, plot.gridY);
      if (plot.unlocked) {
        const waterButton = {
          left: pos.x + this.plotWidth - 41,
          right: pos.x + this.plotWidth,
          top: pos.y - 18,
          bottom: pos.y + 22
        };
        if (
          worldX >= waterButton.left && worldX <= waterButton.right
          && worldY >= waterButton.top && worldY <= waterButton.bottom
        ) {
          if (this.state.waterPlot(plot.id)) {
            this.sound.playClick();
            this.particles.emitPetals(
              pos.x + this.plotWidth - 25,
              pos.y + 2,
              '#68BCE5',
              5
            );
            this.particles.emitFloatingText(
              pos.x + this.plotWidth - 25,
              pos.y - 18,
              'Regada · crescimento +15% durante 1 min.',
              '#2784A8'
            );
          } else {
            const { cooldownRemainingMs } = this.state.getPlotWaterStatus(plot);
            this.particles.emitFloatingText(
              pos.x + this.plotWidth - 23,
              pos.y + 2,
              cooldownRemainingMs > 0 ? 'A parcela ainda está fresca' : 'Não foi possível regar',
              '#4E91B5'
            );
          }
          return true;
        }
        continue;
      }

      if (worldX >= pos.x && worldX <= pos.x + this.plotWidth &&
          worldY >= pos.y && worldY <= pos.y + this.plotHeight) {
        const requiredLevel = FLOWERS_CONFIG[plot.flowerId]?.requiredLevel || 1;
        if (this.state.level < requiredLevel) {
          this.particles.emitFloatingText(
            pos.x + this.plotWidth / 2,
            pos.y + 40,
            `Disponível no nível ${requiredLevel}`,
            '#E0577D'
          );
          return true;
        }
        if (this.state.unlockPlot(plot.id)) {
          this.sound.playUpgrade();
          this.particles.emitFloatingText(pos.x + this.plotWidth / 2, pos.y + 40, '🌸 Novo Campo Desbloqueado!', PALETTE.raspberryPink);
          return true;
        } else {
          this.particles.emitFloatingText(pos.x + this.plotWidth / 2, pos.y + 40, 'Moedas insuficientes!', '#E0577D');
          return true;
        }
      }
    }
    return false;
  }

  draw(ctx, visibleBounds = null) {
    const luminousTheme = themeManager.activeTheme?.id === 'luminous-garden';
    const palette = themeManager.palette;
    const now = Date.now();
    const cacheMatureFlowers = true;
    let plotsToDraw = this.state.plots;
    if (visibleBounds) {
      if (this.cachedPlotGridSource !== this.state.plots || this.cachedPlotGridCount !== this.state.plots.length) {
        this.cachedPlotGrid = new Map(this.state.plots.map((plot) => [`${plot.gridX},${plot.gridY}`, plot]));
        this.cachedPlotGridSource = this.state.plots;
        this.cachedPlotGridCount = this.state.plots.length;
      }
      const { maxGridX, maxGridY } = this.getGridBounds();
      const stepX = this.plotWidth + this.gapX;
      const stepY = this.plotHeight + this.gapY;
      const minGridX = Math.max(0, Math.ceil((visibleBounds.left - this.originX - this.plotWidth) / stepX));
      const maxVisibleGridX = Math.min(maxGridX, Math.floor((visibleBounds.right - this.originX) / stepX));
      const minGridY = Math.max(0, Math.ceil((visibleBounds.top - this.originY - this.plotHeight) / stepY));
      const maxVisibleGridY = Math.min(maxGridY, Math.floor((visibleBounds.bottom + 18 - this.originY) / stepY));
      plotsToDraw = [];
      for (let gridY = minGridY; gridY <= maxVisibleGridY; gridY++) {
        for (let gridX = minGridX; gridX <= maxVisibleGridX; gridX++) {
          const plot = this.cachedPlotGrid.get(`${gridX},${gridY}`);
          if (plot) plotsToDraw.push(plot);
        }
      }
    }
    for (const plot of plotsToDraw) {
      const pos = this.getPlotWorldPos(plot.gridX, plot.gridY);
      const flowerCfg = FLOWERS_CONFIG[plot.flowerId];

      ctx.save();
      ctx.translate(pos.x, pos.y);

      if (plot.unlocked) {
        const baseSprite = this.getPlotBaseSprite(plot.flowerId, flowerCfg, palette, luminousTheme);
        if (baseSprite) ctx.drawImage(baseSprite, 0, -10, this.plotWidth, this.plotHeight + 10);
        else {
          ctx.fillStyle = palette.earthBrown;
          ctx.strokeStyle = palette.deepGreen;
          ctx.lineWidth = 3.5;
          drawRoundedRect(ctx, 0, 0, this.plotWidth, this.plotHeight, 18, true, true);
        }

        // Desenhar as 6 Flores com Path Batching para brilhos de flores prontas
        const defaultReadyGlows = [];
        for (let i = 0; i < plot.flowers.length; i++) {
          const flower = plot.flowers[i];
          if (flower.progress >= 1) {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const fx = 36 + col * 58;
            const fy = 44 + row * 56;
            const pulse = themeManager.getAnimationPulse();
            const themeDrewReadyEffect = themeManager.drawLayer(
              ctx,
              'drawReadyFlower',
              fx,
              fy,
              pulse,
              themeManager.effectsReduced
            );
            if (!themeDrewReadyEffect) {
              const defaultPulse = luminousTheme ? 0 : (Math.sin(this.swayTime * 2 + i) + 1) / 2;
              defaultReadyGlows.push({
                x: fx,
                y: fy,
                r: luminousTheme ? 21 : 19 + defaultPulse * 3,
                pulse: defaultPulse
              });
            }
          }
        }

        // Loteamento (Batch): desenha todos os brilhos em um único conjunto de operações
        if (defaultReadyGlows.length > 0) {
          ctx.beginPath();
          for (const g of defaultReadyGlows) {
            ctx.moveTo(g.x + g.r, g.y);
            ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
          }
          const avgPulse = defaultReadyGlows.reduce((acc, g) => acc + g.pulse, 0) / defaultReadyGlows.length;
          ctx.fillStyle = luminousTheme
            ? 'rgba(117, 229, 223, 0.11)'
            : `rgba(247, 201, 72, ${0.12 + avgPulse * 0.12})`;
          ctx.fill();
          ctx.strokeStyle = luminousTheme
            ? 'rgba(255, 220, 158, 0.72)'
            : `rgba(255, 253, 240, ${0.65 + avgPulse * 0.3})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Desenhar os sprites das flores
        for (let i = 0; i < plot.flowers.length; i++) {
          const flower = plot.flowers[i];
          const col = i % 3;
          const row = Math.floor(i / 3);
          const fx = 36 + col * 58;
          const fy = 44 + row * 56;

          const swayAngle = this.swayTime + i * 0.8;
          const flowerSprites = flower.progress >= 1 && cacheMatureFlowers
            ? this.getMatureFlowerSprites(plot.flowerId, flowerCfg)
            : null;
          if (flowerSprites) {
            const swayCycle = Math.PI * 4;
            const normalizedSway = ((swayAngle % swayCycle) + swayCycle) % swayCycle;
            const phase = Math.min(
              MATURE_FLOWER_SPRITE_PHASES - 1,
              Math.floor((normalizedSway / swayCycle) * MATURE_FLOWER_SPRITE_PHASES)
            );
            ctx.drawImage(
              flowerSprites[phase],
              fx - MATURE_FLOWER_SPRITE_ORIGIN,
              fy - MATURE_FLOWER_SPRITE_BASELINE
            );
            if (typeof themeManager.activeTheme?.drawFlowerHalo === 'function') {
              ctx.save();
              ctx.translate(fx, fy - 14);
              themeManager.drawFlowerHalo(ctx, flowerCfg);
              ctx.restore();
            }
          } else {
            assetManager.drawFlower(
              ctx,
              fx,
              fy,
              flowerCfg,
              flower.progress,
              swayAngle
            );
          }
        }

        const waterStatus = this.state.getPlotWaterStatus(plot, now);
        const waterActive = waterStatus.active;
        const waterAvailable = waterStatus.available;
        const badgeX = this.plotWidth - 36;
        ctx.fillStyle = waterActive ? '#D7F4F8' : waterAvailable ? '#FFFDF8' : '#E4E8E3';
        ctx.strokeStyle = waterActive ? '#2784A8' : waterAvailable ? '#4E91B5' : '#82918A';
        ctx.lineWidth = 1.7;
        drawRoundedRect(
          ctx,
          badgeX,
          -15,
          30,
          30,
          9,
          true,
          true
        );
        ctx.beginPath();
        ctx.moveTo(badgeX + 15, -9);
        ctx.bezierCurveTo(badgeX + 13, -5, badgeX + 9, -1, badgeX + 9, 3);
        ctx.arc(badgeX + 15, 3, 6, Math.PI, 0, false);
        ctx.bezierCurveTo(badgeX + 21, -1, badgeX + 17, -5, badgeX + 15, -9);
        ctx.fillStyle = waterActive ? '#68BCE5' : waterAvailable ? '#A9DCEF' : '#AEBBB5';
        ctx.fill();
        ctx.stroke();
        if (waterActive) {
          ctx.fillStyle = '#2784A8';
          ctx.font = '800 7px "Quicksand", sans-serif';
          ctx.fillText('+15%', badgeX + 15, 11);
        }

      } else {
        const requiredLevel = flowerCfg?.requiredLevel || 1;
        const levelAvailable = this.state.level >= requiredLevel;
        const affordable = this.state.coins >= plot.cost;
        const readyToBuy = levelAvailable && affordable;

        if (levelAvailable) {
          const pulse = (Math.sin(this.swayTime * 2) + 1) / 2;
          ctx.save();
          ctx.strokeStyle = affordable
            ? `rgba(247, 201, 72, ${0.7 + pulse * 0.3})`
            : `rgba(181, 122, 22, ${0.45 + pulse * 0.2})`;
          ctx.lineWidth = affordable ? 3 + pulse * 2 : 3;
          ctx.setLineDash(affordable ? [10, 6] : [5, 6]);
          ctx.beginPath();
          ctx.roundRect(-5, -5, this.plotWidth + 10, this.plotHeight + 10, 17);
          ctx.stroke();
          ctx.restore();
        }

        // Parcela bloqueada: destacar quando já pode ser comprada.
        ctx.fillStyle = levelAvailable ? 'rgba(247, 201, 72, 0.28)' : 'rgba(168, 213, 162, 0.78)';
        ctx.strokeStyle = levelAvailable ? '#B57A16' : palette.deepGreen;
        ctx.lineWidth = levelAvailable ? 3.5 : 2.5;
        drawRoundedRect(ctx, 0, 0, this.plotWidth, this.plotHeight, 14, true, true);

        // Cerca de madeira rústica
        ctx.strokeStyle = palette.wood;
        ctx.lineWidth = 5;
        ctx.strokeRect(6, 6, this.plotWidth - 12, this.plotHeight - 12);

        // Postes verticais da cerca
        for (let fx = 12; fx < this.plotWidth; fx += 32) {
          ctx.fillStyle = palette.wood;
          ctx.strokeStyle = palette.deepGreen;
          ctx.lineWidth = 1.8;
          drawRoundedRect(ctx, fx - 4, 4, 8, this.plotHeight - 8, 3, true, true);
        }

        // Cartaz central com espécie, custo e nível exigido.
        ctx.fillStyle = palette.cream;
        ctx.strokeStyle = levelAvailable ? '#B57A16' : PALETTE.deepGreen;
        ctx.lineWidth = 3;
        const signX = 15;
        const signY = 8;
        const signWidth = this.plotWidth - 30;
        drawRoundedRect(ctx, signX, signY, signWidth, 124, 12, true, true);

        ctx.fillStyle = palette.plumText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '800 12px "Quicksand", sans-serif';
        ctx.fillText(
          plot.optional ? 'Terreno extra (opcional)' : 'Novo terreno',
          this.plotWidth / 2,
          23,
          signWidth - 18
        );
        ctx.font = '800 13px "Quicksand", sans-serif';
        ctx.fillText(flowerCfg.name, this.plotWidth / 2, 39, signWidth - 18);

        // Preço com o mesmo ícone de moeda usado no HUD.
        const priceText = formatNumber(plot.cost);
        ctx.font = '800 14px "Quicksand", sans-serif';
        const priceWidth = ctx.measureText(priceText).width;
        const priceGroupWidth = priceWidth + 25;
        const priceX = this.plotWidth / 2 - priceGroupWidth / 2;
        drawCoinIcon(ctx, priceX + 8, 59, 20);
        ctx.fillStyle = PALETTE.plumText;
        ctx.textAlign = 'left';
        ctx.fillText(priceText, priceX + 19, 59, signWidth - 35);

        ctx.textAlign = 'center';
        ctx.font = '700 10px "Quicksand", sans-serif';
        ctx.fillStyle = levelAvailable ? PALETTE.leafGreen : PALETTE.raspberryPink;
        ctx.fillText(`Nível exigido: ${requiredLevel}`, this.plotWidth / 2, 78, signWidth - 12);

        ctx.textAlign = 'center';
        ctx.font = '700 11px "Quicksand", sans-serif';
        ctx.fillStyle = readyToBuy ? '#8A5A08' : PALETTE.raspberryPink;
        const actionText = !levelAvailable
          ? `Disponível no nível ${requiredLevel}`
          : affordable
            ? 'Clica para comprar'
            : `Faltam ${formatNumber(plot.cost - this.state.coins)} moedas`;
        ctx.fillText(actionText, this.plotWidth / 2, 112, signWidth - 16);
      }

      ctx.restore();
    }
  }
}
