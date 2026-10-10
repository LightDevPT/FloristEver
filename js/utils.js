// ========================================================
// FloristEver - Utilitários Gerais e Sistema de Partículas
// ========================================================

export const PALETTE = {
  cream: '#FFF6E5',
  grassLight: '#A8D5A2',
  leafGreen: '#5FA36B',
  pathEarth: '#986947',
  pathSoil: '#BF9462',
  pathSurface: '#D7BF8B',
  deepGreen: '#2F5D4A',
  peonyPink: '#F4A6B8',
  raspberryPink: '#E0577D',
  sunYellow: '#F7C948',
  lavender: '#B7A3E3',
  earthBrown: '#8B5E3C',
  wood: '#C99A6B',
  softBlue: '#BFE3F2',
  plumText: '#3A2E39',
};

// Formatação amigável de números (ex: 125, 1.2K, 3.4M)
export function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  const n = Math.floor(num);
  if (n < 1000) return n.toString();
  if (n < 1000000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return (n / 1000000).toFixed(2).replace('.00', '') + 'M';
}

// Matemática e Interpolação
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function getCanvasPixelRatio(width, height, devicePixelRatio = 1) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new RangeError('As dimensões do canvas têm de ser positivas e finitas.');
  }

  const requestedRatio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
    ? devicePixelRatio
    : 1;
  const pixelBudgetRatio = Math.sqrt(8_500_000 / (width * height));
  return Math.max(1, Math.min(requestedRatio, 2, pixelBudgetRatio));
}

export function lerp(start, end, t) {
  return start + (end - start) * t;
}

export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.hypot(dx, dy);
}

// Utilitários de Desenho com Estilo Cozy no Canvas
export function drawRoundedRect(ctx, x, y, width, height, radius, fill = true, stroke = true) {
  if (width < 2 * radius) radius = width / 2;
  if (height < 2 * radius) radius = height / 2;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

export function drawCoinIcon(ctx, centerX, centerY, size = 24) {
  const scale = size / 24;
  ctx.save();
  ctx.translate(centerX - size / 2, centerY - size / 2);
  ctx.scale(scale, scale);

  ctx.beginPath();
  ctx.arc(12, 12, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#F7C948';
  ctx.fill();
  ctx.strokeStyle = '#2F5D4A';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(12, 12, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#FCE588';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(12, 8.5);
  ctx.lineTo(12, 15.5);
  ctx.moveTo(10, 10.2);
  ctx.bezierCurveTo(10, 9.5, 10.9, 9, 12, 9);
  ctx.bezierCurveTo(13.1, 9, 14, 9.5, 14, 10.3);
  ctx.bezierCurveTo(14, 11.5, 10, 11.5, 10, 12.7);
  ctx.bezierCurveTo(10, 13.5, 10.9, 14, 12, 14);
  ctx.bezierCurveTo(13.1, 14, 14, 13.5, 14, 12.8);
  ctx.strokeStyle = '#2F5D4A';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.restore();
}

// Sistema de Partículas (Pétalas a voar, moedas flutuantes, corações e passos)
export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  // Gera pequenas pétalas a voar na colheita
  emitPetals(x, y, color = PALETTE.peonyPink, count = 7) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        type: 'petal',
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30, // leve elevação
        size: 4 + Math.random() * 5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 6,
        color: color,
        alpha: 1,
        life: 0,
        maxLife: 0.7 + Math.random() * 0.4
      });
    }
  }

  // Moedas ou números a subir (+5, +12, etc.)
  emitFloatingText(x, y, text, color = PALETTE.sunYellow) {
    this.particles.push({
      type: 'text',
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 15,
      vy: -60,
      text: text,
      color: color,
      alpha: 1,
      life: 0,
      maxLife: 1.2
    });
  }

  // Corações de clientes felizes
  emitHearts(x, y, count = 3) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        type: 'heart',
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 25,
        vy: -45 - Math.random() * 20,
        size: 10 + Math.random() * 4,
        alpha: 1,
        life: 0,
        maxLife: 1.0 + Math.random() * 0.5
      });
    }
  }

  // Poeira suave de passos
  emitStepDust(x, y) {
    this.particles.push({
      type: 'dust',
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      size: 3 + Math.random() * 3,
      alpha: 0.6,
      life: 0,
      maxLife: 0.35
    });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = 1 - (p.life / p.maxLife);

      if (p.type === 'petal') {
        p.rotation += p.rotSpeed * dt;
        p.vy += 60 * dt; // gravidade suave
      }
    }
  }

  draw(ctx, visibleBounds = null) {
    for (const p of this.particles) {
      const margin = p.type === 'text' ? 180 : 24;
      if (visibleBounds && (
        p.x < visibleBounds.left - margin
        || p.x > visibleBounds.right + margin
        || p.y < visibleBounds.top - margin
        || p.y > visibleBounds.bottom + margin
      )) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.type === 'petal') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = PALETTE.deepGreen;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (p.type === 'text') {
        ctx.font = '800 15px "Quicksand", sans-serif';
        ctx.fillStyle = p.color;
        ctx.strokeStyle = PALETTE.deepGreen;
        ctx.lineWidth = 3;
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillText(p.text, p.x, p.y);
      } else if (p.type === 'heart') {
        ctx.translate(p.x, p.y);
        ctx.fillStyle = PALETTE.raspberryPink;
        ctx.strokeStyle = PALETTE.deepGreen;
        ctx.lineWidth = 1.5;
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.3);
        ctx.bezierCurveTo(-s * 0.5, -s * 0.3, -s, s * 0.2, 0, s);
        ctx.bezierCurveTo(s, s * 0.2, s * 0.5, -s * 0.3, 0, s * 0.3);
        ctx.fill();
        ctx.stroke();
      } else if (p.type === 'dust') {
        ctx.fillStyle = PALETTE.earthBrown;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
