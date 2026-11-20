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
    // Reutiliza os tons usados pelas pétalas, em vez de converter as mesmas cores
    // repetidamente a cada frame.
    this.tintCache = new Map();
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
  _head(ctx, cfg, palette, open, pulse) {
    const R = cfg.radius || 14;
    const n = Math.max(3, Math.min(18, Math.round(cfg.petals || 6)));
    const col = cfg.color || palette.peonyPink;
    const out = cfg.outlineColor || palette.deepGreen;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 2;

    if (cfg.shape === 'spike') { // estilo lavanda: espiga de floretes
      const H = R * 1.7 * (0.45 + 0.55 * open);
      const rows = Math.max(4, Math.min(9, n));
      ctx.strokeStyle = out; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, -H); ctx.stroke();
      ctx.strokeStyle = cfg.stemColor || palette.leafGreen; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, -H); ctx.stroke();
      for (let r = rows - 1; r >= 0; r--) {
        const t = r / (rows - 1);
        const y = 2 - t * H * 0.92;
        const sz = R * 0.23 * (1 - 0.42 * t) * (0.6 + 0.4 * open);
        const fill = this._tint(col, r % 2 ? 0.14 : -0.06);
        ctx.fillStyle = fill; ctx.strokeStyle = out; ctx.lineWidth = 1.6;
        [-1, 1].forEach((d) => {
          ctx.beginPath(); ctx.ellipse(d * sz * 0.85, y, sz, sz * 1.25, d * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        });
      }
      ctx.fillStyle = this._tint(col, 0.1);
      ctx.beginPath(); ctx.ellipse(0, -H - 1, R * 0.12, R * 0.22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      return;
    }

    const len = R * 0.9 * (0.5 + 0.5 * open);
    const wid = R * 0.62 * Math.min(1, 7 / n + 0.25) * (0.6 + 0.4 * open);
    const d0 = R * 0.16;
    const ring = (count, offset, lenF, fill) => {
      for (let i = 0; i < count; i++) {
        const a = offset + (i / count) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a); ctx.translate(d0, 0);
        this._petalPath(ctx, cfg.petalShape, len * lenF, wid * lenF);
        ctx.fillStyle = fill; ctx.strokeStyle = out; ctx.lineWidth = 2;
        ctx.fill(); ctx.stroke();
        if (open > 0.55 && cfg.petalShape !== 'heart') { // nervura + brilho
          ctx.strokeStyle = 'rgba(47, 93, 74, 0.22)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(len * lenF * 0.14, 0); ctx.lineTo(len * lenF * 0.68, 0); ctx.stroke();
          if (lenF === 1) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.beginPath(); ctx.ellipse(len * 0.66, -wid * 0.14, len * 0.15, wid * 0.1, 0, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.restore();
      }
    };
    if (n >= 5) ring(n, Math.PI / n, 0.88, this._tint(col, -0.14)); // pétalas de trás
    ring(n, 0, 1, col);

    // Centro
    const cr = R * 0.38 * (0.7 + 0.3 * open);
    ctx.fillStyle = cfg.centerColor || palette.sunYellow;
    ctx.strokeStyle = out; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, cr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (open > 0.5) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      for (let i = 0; i < 6; i++) {
        const a = i * 1.047 + 0.3;
        ctx.beginPath(); ctx.arc(Math.cos(a) * cr * 0.55, Math.sin(a) * cr * 0.55, Math.max(0.7, cr * 0.1), 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = `rgba(255, 255, 255, ${0.45 + pulse * 0.2})`;
      ctx.beginPath(); ctx.arc(-cr * 0.32, -cr * 0.32, cr * 0.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  _bud(ctx, cfg, palette, k) {
    const R = cfg.radius || 14;
    const col = cfg.color || palette.peonyPink;
    const out = cfg.outlineColor || palette.deepGreen;
    const s = 0.7 + 0.3 * k;
    ctx.save();
    ctx.lineWidth = 2; ctx.strokeStyle = out; ctx.lineJoin = 'round';
    if (cfg.shape === 'spike') {
      ctx.fillStyle = this._tint(col, -0.05);
      ctx.beginPath(); ctx.ellipse(0, -R * 0.35 * s, R * 0.16 * s, R * 0.55 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(0, -R * 0.15, R * 0.34 * s, R * 0.52 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(47, 93, 74, 0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -R * 0.62 * s); ctx.quadraticCurveTo(R * 0.12, -R * 0.2, 0, R * 0.3); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.ellipse(-R * 0.12, -R * 0.3, R * 0.06, R * 0.16, 0.2, 0, Math.PI * 2); ctx.fill();
    }
    // sépalas
    ctx.strokeStyle = out; ctx.lineWidth = 1.8;
    this._leaf(ctx, 0, R * 0.32, R * 0.55, R * 0.16, -Math.PI / 2 - 0.55, palette.leafGreen, out, 1.6);
    this._leaf(ctx, 0, R * 0.32, R * 0.55, R * 0.16, -Math.PI / 2 + 0.55, palette.leafGreen, out, 1.6);
    ctx.restore();
  }

  _sparkle(ctx, x, y, s, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = `rgba(255, 244, 190, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.18, -s * 0.18, s, 0);
    ctx.quadraticCurveTo(s * 0.18, s * 0.18, 0, s); ctx.quadraticCurveTo(-s * 0.18, s * 0.18, -s, 0);
    ctx.quadraticCurveTo(-s * 0.18, -s * 0.18, 0, -s); ctx.fill();
    ctx.restore();
  }

  _soil(ctx, s = 1) {
    ctx.fillStyle = '#6E4527';
    ctx.beginPath(); ctx.ellipse(0, 4.5, 10 * s, 4.6 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8A5A36';
    ctx.beginPath(); ctx.ellipse(-2 * s, 3.4, 5.5 * s, 1.8 * s, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9A8C7A';
    ctx.beginPath(); ctx.arc(6 * s, 5.2, 1.1, 0, Math.PI * 2); ctx.arc(-7 * s, 5.6, 0.9, 0, Math.PI * 2); ctx.fill();
  }

  _petalPath(ctx, shape, len, wid) {
    ctx.beginPath();
    if (shape === 'heart') {
      ctx.save();
      ctx.rotate(Math.PI / 2);
      const s = len / 15;
      ctx.scale(s, s);
      ctx.translate(0, -6);
      ctx.moveTo(0, 6);
      ctx.bezierCurveTo(-2, 4, -8, 0, -8, -3);
      ctx.bezierCurveTo(-8, -8, -2, -9, 0, -4);
      ctx.bezierCurveTo(2, -9, 8, -8, 8, -3);
      ctx.bezierCurveTo(8, 0, 2, 4, 0, 6);
      ctx.restore();
      ctx.closePath();
    } else {
      ctx.ellipse(len / 2, 0, len / 2, wid / 2, 0, 0, Math.PI * 2);
    }
  }

  _leaf(ctx, x, y, len, wid, rot, fill, stroke, lw = 1.8) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(len * 0.25, -wid, len * 0.75, -wid * 0.9, len, 0);
    ctx.bezierCurveTo(len * 0.75, wid * 0.9, len * 0.25, wid, 0, 0);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = lw;
    ctx.fill(); ctx.stroke();
    if (lw >= 1.2) {
      ctx.strokeStyle = 'rgba(47, 93, 74, 0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(len * 0.12, 0); ctx.lineTo(len * 0.82, 0); ctx.stroke();
    }
    ctx.restore();
  }

  _tint(color, amt) {
    const key = `${color}|${amt}`;
    const cached = this.tintCache.get(key);
    if (cached) return cached;
    const m = /^#?([0-9a-f]{6})$/i.exec(String(color || '').trim());
    if (!m) return color;
    const n = parseInt(m[1], 16);
    const f = amt >= 0 ? (c) => c + (255 - c) * amt : (c) => c * (1 + amt);
    const tinted = `rgb(${Math.round(f(n >> 16))},${Math.round(f((n >> 8) & 255))},${Math.round(f(n & 255))})`;
    // Limite fixo para não acumular entradas caso temas dinâmicos gerem novas cores.
    if (this.tintCache.size >= 128) this.tintCache.clear();
    this.tintCache.set(key, tinted);
    return tinted;
  }

  drawStockBoard(ctx, x, y, width = 96, height = 46, current = 0, max = 20, counts = []) {
    const palette = themeManager.assetPalette;
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = palette.deepGreen; ctx.lineWidth = 3;
    ctx.fillStyle = palette.earthBrown;
    [width * 0.2, width * 0.72].forEach(px => { ctx.beginPath(); ctx.roundRect(px, height - 2, 6, 18, 2); ctx.fill(); ctx.stroke(); });
    ctx.fillStyle = 'rgba(47,93,74,.2)'; ctx.beginPath(); ctx.ellipse(width / 2, height + 16, width * 0.45, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(0, 0, width, height, 8); ctx.fillStyle = palette.cream; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(0, 0, width, 14, [8, 8, 0, 0]); ctx.fillStyle = palette.raspberryPink; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '800 9px "Quicksand", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('STOCK', width / 2, 7.5);
    const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
    ctx.lineWidth = 2; ctx.fillStyle = 'rgba(47,93,74,.15)';
    ctx.beginPath(); ctx.roundRect(8, 19, width - 16, 7, 3.5); ctx.fill(); ctx.stroke();
    if (ratio > 0) { ctx.fillStyle = ratio > 0.8 ? palette.raspberryPink : palette.leafGreen; ctx.beginPath(); ctx.roundRect(8, 19, (width - 16) * ratio, 7, 3.5); ctx.fill(); }
    ctx.fillStyle = palette.plumText || palette.deepGreen; ctx.font = '700 8px "Quicksand", sans-serif';
    ctx.fillText(`${current}/${max} no total`, width / 2, 33);
    const shown = counts.slice(0, 4);
    shown.forEach((c, i) => { const cx = width / 2 + (i - (shown.length - 1) / 2) * 20; this._bloom(ctx, cx - 4, 41, 2.6, c.color || '#fff', palette.sunYellow); ctx.fillStyle = palette.deepGreen; ctx.textAlign = 'left'; ctx.font = '800 7px "Quicksand", sans-serif'; ctx.fillText(String(c.amount ?? 0), cx + 1, 41.5); });
    ctx.restore();
  }

  drawLantern(ctx, x, y, time = 0, lit = true) {
    const palette = themeManager.assetPalette;
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = palette.deepGreen; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-2.5, 0, 5, 46, 2); ctx.fillStyle = palette.earthBrown; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 4); ctx.quadraticCurveTo(14, 2, 14, 12); ctx.stroke();
    if (lit) {
      const flick = 0.85 + Math.sin(time * 7) * 0.05 + Math.sin(time * 13) * 0.04;
      const gradient = ctx.createRadialGradient(14, 22, 2, 14, 22, 34);
      gradient.addColorStop(0, `rgba(255,214,102,${0.55 * flick})`);
      gradient.addColorStop(1, 'rgba(255,214,102,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(14, 22, 34, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(8, 12, 12, 16, 3); ctx.fillStyle = lit ? '#FFE79A' : '#9aa7ac'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, 12); ctx.lineTo(14, 5); ctx.lineTo(22, 12); ctx.closePath(); ctx.fillStyle = palette.raspberryPink; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(7, 28, 14, 3, 1.5); ctx.fillStyle = palette.earthBrown; ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  drawFlowerBox(ctx, x, y, width, time = 0) {
    const palette = themeManager.assetPalette;
    const cols = [palette.peonyPink, '#ffffff', palette.sunYellow, palette.lavender, palette.raspberryPink];
    ctx.save(); ctx.translate(x, y);
    const n = Math.max(2, Math.floor(width / 14));
    for (let i = 0; i < n; i++) {
      const fx = 7 + i * ((width - 14) / Math.max(1, n - 1));
      const sway = Math.sin(time * 2 + i) * 0.8;
      ctx.strokeStyle = palette.deepGreen; ctx.lineWidth = 1.6;
      ctx.fillStyle = palette.leafGreen;
      ctx.beginPath(); ctx.ellipse(fx - 4, 1, 4, 2, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      this._bloom(ctx, fx + sway, -5 - (i % 2) * 2, 3.4, cols[i % cols.length], palette.sunYellow, 5);
    }
    ctx.lineWidth = 2.5; ctx.strokeStyle = palette.deepGreen;
    ctx.beginPath(); ctx.roundRect(0, 0, width, 10, [2, 2, 5, 5]); ctx.fillStyle = '#B07A4A'; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(47,93,74,.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(3, 5); ctx.lineTo(width - 3, 5); ctx.stroke();
    ctx.restore();
  }

  _bloom(ctx, x, y, r, color, center, stem = 0) {
    const palette = themeManager.assetPalette;
    ctx.strokeStyle = palette.deepGreen;
    if (stem > 0) {
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + stem); ctx.stroke();
    }
    ctx.lineWidth = 1.4;
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, r * 0.62, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = center; ctx.fill();
  }

  _headwear(ctx, kind, palette, color, headY) {
    if (kind === 'beret') {
      ctx.beginPath(); ctx.ellipse(1, headY - 9, 13, 6, -0.2, 0, Math.PI * 2); this._fs(ctx, color);
      ctx.beginPath(); ctx.arc(1, headY - 15, 1.8, 0, Math.PI * 2); this._fs(ctx, color);
    } else if (kind === 'sun') {
      ctx.beginPath(); ctx.ellipse(0, headY - 8, 17, 5.5, 0, 0, Math.PI * 2); this._fs(ctx, palette.cream);
      ctx.beginPath(); ctx.arc(0, headY - 10, 8, Math.PI, Math.PI * 2); this._fs(ctx, palette.cream);
      ctx.fillStyle = color; ctx.fillRect(-8, headY - 12, 16, 3);
    } else if (kind === 'clip') { // flor no cabelo
      ctx.fillStyle = color;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(7 + Math.cos(a) * 2.6, headY - 9 + Math.sin(a) * 2.6, 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(7, headY - 9, 1.6, 0, Math.PI * 2); this._fs(ctx, palette.sunYellow);
    } else if (kind === 'beanie') {
      ctx.beginPath(); ctx.arc(0, headY - 4, 11.5, Math.PI, Math.PI * 2); this._fs(ctx, color);
      ctx.beginPath(); ctx.roundRect(-12, headY - 6, 24, 5, 2.5); this._fs(ctx, palette.cream);
      ctx.beginPath(); ctx.arc(0, headY - 16, 3, 0, Math.PI * 2); this._fs(ctx, palette.cream);
    } else if (kind === 'hood') {
      ctx.beginPath(); ctx.arc(0, headY - 2, 13, Math.PI * 0.92, Math.PI * 2.08); this._fs(ctx, color);
    }
  }

  _face(ctx, palette, headY, eyeDir = 0, glasses = false) {
    ctx.fillStyle = palette.deepGreen;
    ctx.beginPath();
    ctx.arc(-3 + eyeDir, headY + 1.5, 1.5, 0, Math.PI * 2);
    ctx.arc(3 + eyeDir, headY + 1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(224, 87, 125, 0.45)';
    ctx.beginPath();
    ctx.arc(-6 + eyeDir, headY + 4.5, 2.2, 0, Math.PI * 2);
    ctx.arc(6 + eyeDir, headY + 4.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.deepGreen; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(eyeDir, headY + 4, 2.2, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    if (glasses) {
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(-3.5 + eyeDir, headY + 1.5, 3.6, 0, Math.PI * 2);
      ctx.moveTo(6.5 + eyeDir, headY + 1.5);
      ctx.arc(3.5 + eyeDir, headY + 1.5, 3.6, 0, Math.PI * 2);
      ctx.moveTo(-0.1 + eyeDir, headY + 1.2); ctx.lineTo(0.1 + eyeDir, headY + 1.2);
      ctx.stroke();
    }
    ctx.strokeStyle = palette.deepGreen; ctx.lineWidth = 2.5;
  }

  _hairFront(ctx, style, color, headY) {
    ctx.beginPath();
    if (style === 3) { // cacheado
      [-8, -3, 3, 8].forEach((dx, i) => ctx.arc(dx, headY - 7 - (i % 2) * 2, 5, 0, Math.PI * 2));
      this._fs(ctx, color);
      return;
    }
    ctx.arc(0, headY - 2, 11.5, Math.PI, Math.PI * 2);
    this._fs(ctx, color);
    if (style === 0 || style === 4) { // franja lateral
      ctx.beginPath(); ctx.ellipse(-4, headY - 7, 7, 4, -0.4, 0, Math.PI * 2); this._fs(ctx, color);
    }
  }

  _hairBack(ctx, style, color, headY) {
    ctx.fillStyle = color;
    if (style === 1) { // coque
      ctx.beginPath(); ctx.arc(0, headY - 12, 5.5, 0, Math.PI * 2); this._fs(ctx, color);
    } else if (style === 2) { // rabo-de-cavalo
      ctx.beginPath(); ctx.ellipse(-12, headY + 1, 4, 8, 0.35, 0, Math.PI * 2); this._fs(ctx, color);
    } else if (style === 4) { // comprido
      ctx.beginPath(); ctx.roundRect(-12, headY - 6, 24, 20, [10, 10, 5, 5]); this._fs(ctx, color);
    }
  }

  _hairTone(v, palette) {
    return [palette.earthBrown, '#2F241F', '#D9A441', '#B5523B', '#C9C5BD', '#7A4B2A', '#4A3B6B'][(v * 3 + 2) % 7];
  }

  _skinTone(v) { return ['#FFEBD1', '#F7D6B5', '#E8B98F', '#C98B62', '#9B6440', '#6E4430'][(v * 5 + 1) % 6]; }

  _fs(ctx, fill) { ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); }

  drawPlayer(ctx, x, y, facing = 1, isWalking = false, walkTime = 0, basketCount = 0, basketCap = 10, isSeated = false, outfit = 0) {
    this.drawCustomOrFallback(ctx, outfit === 1 ? 'playerAlt' : 'player', x, y, 48, 54, () => {
      const palette = themeManager.assetPalette;
      ctx.save();
      ctx.translate(x, y);

      const bounce = isWalking ? Math.sin(walkTime * 12) * 3 : 0;
      const sway = isWalking ? Math.cos(walkTime * 10) * 0.08 : 0;
      ctx.rotate(sway);
      const bodyTop = isSeated ? -5 : -2 - bounce;
      const headY = (isSeated ? -14 : -11) - bounce;
      const hatY = (isSeated ? -21 : -18) - bounce;
      const gala = outfit === 1;

      // Sombra
      ctx.fillStyle = 'rgba(47, 93, 74, 0.22)';
      ctx.beginPath(); ctx.ellipse(0, 18, gala ? 18 : 16, 8, 0, 0, Math.PI * 2); ctx.fill();

      // Calçado: botas de madeira (padrão) | sapatinhos de gala com laço
      ctx.strokeStyle = palette.deepGreen; ctx.lineWidth = 2.5;
      const legOffset = isSeated ? 0 : isWalking ? Math.sin(walkTime * 12) * 5 : 0;
      ctx.beginPath();
      if (isSeated) {
        ctx.ellipse(-7, 17, 6, 3.5, -0.12, 0, Math.PI * 2); ctx.ellipse(7, 17, 6, 3.5, 0.12, 0, Math.PI * 2);
      } else {
        ctx.ellipse(-7, 16 - bounce + legOffset, 5, 4, 0, 0, Math.PI * 2);
        ctx.ellipse(7, 16 - bounce - legOffset, 5, 4, 0, 0, Math.PI * 2);
      }
      this._fs(ctx, gala ? palette.raspberryPink : palette.wood);

      if (!gala) {
        // ---------- Roupa padrão ----------
        ctx.beginPath(); ctx.roundRect(-12, bodyTop, 24, isSeated ? 19 : 20, [4, 4, 10, 10]); this._fs(ctx, palette.peonyPink);
        ctx.beginPath(); ctx.roundRect(-8, isSeated ? 1 : 3 - bounce, 16, 14, [2, 2, 6, 6]); this._fs(ctx, palette.leafGreen);
      } else {
        // ---------- Traje de Gala Floral ----------
        // Saia rodada lavanda
        ctx.beginPath();
        ctx.moveTo(-10, bodyTop + 4); ctx.lineTo(10, bodyTop + 4);
        ctx.quadraticCurveTo(18, bodyTop + 12, 16, 16 - bounce * 0.5);
        ctx.quadraticCurveTo(0, 20 - bounce * 0.5, -16, 16 - bounce * 0.5);
        ctx.quadraticCurveTo(-18, bodyTop + 12, -10, bodyTop + 4);
        this._fs(ctx, palette.lavender);
        // Barra de folhas
        ctx.fillStyle = palette.leafGreen;
        for (let i = -3; i <= 3; i++) {
          ctx.beginPath(); ctx.ellipse(i * 4.5, 16.5 - bounce * 0.5 - Math.abs(i) * 0.4, 2.4, 1.4, i * 0.2, 0, Math.PI * 2); ctx.fill();
        }
        // Corpete branco com cinto framboesa
        ctx.beginPath(); ctx.roundRect(-9, bodyTop - 1, 18, 11, [5, 5, 2, 2]); this._fs(ctx, palette.cream);
        ctx.fillStyle = palette.raspberryPink; ctx.fillRect(-9, bodyTop + 7, 18, 3);
        // Florzinhas bordadas na saia
        [[-8, 9], [0, 12], [8, 9]].forEach(([fx, fy]) => {
          ctx.fillStyle = palette.sunYellow;
          ctx.beginPath(); ctx.arc(fx, fy - bounce * 0.5, 2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff';
          for (let k = 0; k < 4; k++) {
            const a = k * Math.PI / 2 + 0.4;
            ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 2.8, fy - bounce * 0.5 + Math.sin(a) * 2.8, 1.3, 0, Math.PI * 2); ctx.fill();
          }
        });
        // Mangas bufantes
        ctx.beginPath(); ctx.arc(-11, bodyTop + 2, 4, 0, Math.PI * 2); this._fs(ctx, palette.cream);
        ctx.beginPath(); ctx.arc(11, bodyTop + 2, 4, 0, Math.PI * 2); this._fs(ctx, palette.cream);
      }

      // Cabeça
      ctx.beginPath(); ctx.arc(0, headY, 11, 0, Math.PI * 2); this._fs(ctx, '#FFEBD1');

      // Cabelo
      if (gala) { // cabelo comprido com ondas
        ctx.beginPath(); ctx.roundRect(-13, headY - 6, 7, 18, 5); this._fs(ctx, palette.earthBrown);
        ctx.beginPath(); ctx.roundRect(6, headY - 6, 7, 18, 5); this._fs(ctx, palette.earthBrown);
        ctx.beginPath(); ctx.arc(0, headY - 3, 12, Math.PI, Math.PI * 2); this._fs(ctx, palette.earthBrown);
      } else {
        ctx.beginPath(); ctx.arc(0, (isSeated ? -17 : -14) - bounce, 12, Math.PI, Math.PI * 2); this._fs(ctx, palette.earthBrown);
      }

      // Olhos e bochechas
      ctx.fillStyle = palette.deepGreen;
      const eyeDir = facing > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.arc(3 * eyeDir - 2, -10 - bounce, 1.6, 0, Math.PI * 2); ctx.arc(3 * eyeDir + 3, -10 - bounce, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(224, 87, 125, 0.45)';
      ctx.beginPath();
      ctx.arc(3 * eyeDir - 4, -7 - bounce, 2.5, 0, Math.PI * 2); ctx.arc(3 * eyeDir + 5, -7 - bounce, 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (!gala) {
        // Chapéu de palha com fita
        ctx.beginPath(); ctx.ellipse(0, hatY, 17, 6, 0, 0, Math.PI * 2); this._fs(ctx, palette.cream);
        ctx.beginPath(); ctx.arc(0, hatY - 2, 8, Math.PI, Math.PI * 2); this._fs(ctx, palette.cream);
        ctx.fillStyle = palette.raspberryPink; ctx.fillRect(-8, hatY - 3, 16, 3);
      } else {
        // Coroa de flores
        const cols = [palette.peonyPink, '#fff', palette.sunYellow, palette.lavender, '#fff', palette.peonyPink, palette.sunYellow];
        cols.forEach((c, i) => {
          const a = Math.PI + (i / (cols.length - 1)) * Math.PI;
          const px = Math.cos(a) * 11.5, py = headY - 3 + Math.sin(a) * 9.5;
          ctx.beginPath(); ctx.arc(px, py, 3.4, 0, Math.PI * 2); this._fs(ctx, c);
          ctx.beginPath(); ctx.arc(px, py, 1.1, 0, Math.PI * 2); ctx.fillStyle = palette.deepGreen; ctx.fill();
        });
        // Gola branca e laço
        ctx.beginPath(); ctx.ellipse(0, headY + 11, 7, 2.6, 0, 0, Math.PI * 2); this._fs(ctx, '#fff');
        ctx.beginPath(); ctx.moveTo(0, headY + 11.5); ctx.lineTo(-5, headY + 9); ctx.lineTo(-5, headY + 14); ctx.closePath();
        ctx.moveTo(0, headY + 11.5); ctx.lineTo(5, headY + 9); ctx.lineTo(5, headY + 14); ctx.closePath();
        this._fs(ctx, palette.raspberryPink);
      }

      // Cesto de vime lateral
      const basketX = facing > 0 ? 14 : -14;
      ctx.beginPath(); ctx.roundRect(basketX - 7, -2 - bounce, 14, 12, 4); this._fs(ctx, palette.wood);
      if (basketCount > 0) {
        ctx.beginPath();
        ctx.arc(basketX - 3, -4 - bounce, 4, 0, Math.PI * 2); ctx.arc(basketX + 3, -5 - bounce, 3.5, 0, Math.PI * 2);
        this._fs(ctx, palette.peonyPink);
      }

      themeManager.drawLayer(ctx, 'drawPlayerAccessory', 0, 0, bounce, isSeated);
      ctx.restore();
    });
  }

  // --------------------------------------------------------
  // 2. Florista Ajudante (Worker autónomo com boina verde)
  // --------------------------------------------------------
  drawWorker(ctx, x, y, facing = 1, isWalking = false, walkTime = 0, basketCount = 0, variant = 0) {
    this.drawCustomOrFallback(ctx, 'worker', x, y, 44, 50, () => {
      const palette = themeManager.assetPalette;
      const v = Math.abs(variant | 0) % 4;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(facing >= 0 ? 1 : -1, 1);

      const bounce = isWalking ? Math.sin(walkTime * 12) * 2.5 : 0;
      const step = isWalking ? Math.sin(walkTime * 12) * 3 : 0;
      ctx.lineWidth = 2; ctx.strokeStyle = palette.deepGreen;

      // Sombra
      ctx.fillStyle = 'rgba(47, 93, 74, 0.2)';
      ctx.beginPath(); ctx.ellipse(0, 16, 14, 7, 0, 0, Math.PI * 2); ctx.fill();

      // Botas de borracha com sola
      ctx.beginPath();
      ctx.ellipse(-6, 14 - bounce + step, 4.5, 3.2, 0, 0, Math.PI * 2);
      ctx.ellipse(6, 14 - bounce - step, 4.5, 3.2, 0, 0, Math.PI * 2);
      this._fs(ctx, [palette.deepGreen, palette.earthBrown, '#2F241F', palette.earthBrown][v]);
      ctx.fillStyle = palette.cream;
      ctx.fillRect(-10, 15.4 - bounce + step, 8, 1.6); ctx.fillRect(2, 15.4 - bounce - step, 8, 1.6);

      const base = [palette.softBlue, palette.sunYellow, '#F29A4B', palette.leafGreen][v];
      const shirt = [palette.cream, '#fff', palette.cream, palette.cream][v];

      // Camisa por baixo (mangas)
      ctx.beginPath(); ctx.roundRect(-11, -3 - bounce, 22, 12, [5, 5, 2, 2]); this._fs(ctx, shirt);

      if (v === 0 || v === 3) { // macacão com alças, bolso e botões
        ctx.beginPath(); ctx.roundRect(-10, 1 - bounce, 20, 15, [3, 3, 8, 8]); this._fs(ctx, base);
        ctx.fillStyle = base;
        ctx.fillRect(-8, -3 - bounce, 3, 6); ctx.fillRect(5, -3 - bounce, 3, 6);
        ctx.strokeRect(-8, -3 - bounce, 3, 6); ctx.strokeRect(5, -3 - bounce, 3, 6);
        ctx.fillStyle = palette.sunYellow;
        ctx.beginPath(); ctx.arc(-6.5, 1 - bounce, 1.1, 0, Math.PI * 2); ctx.arc(6.5, 1 - bounce, 1.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(-4, 6 - bounce, 8, 6, 2); this._fs(ctx, v === 0 ? '#8FB6D8' : '#58A06E');
      } else if (v === 1) { // jardineira amarela com bolso de flor
        ctx.beginPath(); ctx.roundRect(-9, 0 - bounce, 18, 16, [3, 3, 8, 8]); this._fs(ctx, base);
        ctx.beginPath(); ctx.roundRect(-5, 6 - bounce, 10, 7, 2); this._fs(ctx, '#F4B73A');
        ctx.fillStyle = palette.peonyPink; ctx.beginPath(); ctx.arc(0, 4.5 - bounce, 2.2, 0, Math.PI * 2); ctx.fill();
      } else { // colete laranja com refletor
        ctx.beginPath(); ctx.roundRect(-10, -2 - bounce, 20, 17, [4, 4, 6, 6]); this._fs(ctx, base);
        ctx.fillStyle = '#FFF3B0'; ctx.fillRect(-10, 5 - bounce, 20, 2.6); ctx.fillRect(-10, 10 - bounce, 20, 2.6);
      }

      // Cinto de ferramentas com pazinha
      ctx.fillStyle = palette.earthBrown; ctx.fillRect(-10.5, 9 - bounce, 21, 2.6);
      ctx.beginPath(); ctx.roundRect(8, 8 - bounce, 4, 8, 1.5); this._fs(ctx, '#B9C2C8');

      // Cabeça com tons de pele variados
      const headY = -10 - bounce;
      const skin = this._skinTone(v + 2);
      ctx.beginPath(); ctx.arc(0, headY, 10, 0, Math.PI * 2); this._fs(ctx, skin);
      this._face(ctx, palette, headY, 2);

      // Cachecol (variante 3)
      if (v === 3) { ctx.beginPath(); ctx.roundRect(-9, -2 - bounce, 18, 4, 2); this._fs(ctx, palette.raspberryPink); }

      // Chapelaria
      if (v === 0) this._headwear(ctx, 'beret', palette, palette.leafGreen, headY + 2);
      else if (v === 1) this._headwear(ctx, 'sun', palette, palette.sunYellow, headY + 4);
      else if (v === 2) { // bandana
        ctx.beginPath(); ctx.arc(0, headY - 3, 10.5, Math.PI, Math.PI * 2); this._fs(ctx, palette.raspberryPink);
        ctx.beginPath(); ctx.moveTo(-9, headY - 3); ctx.lineTo(-15, headY - 6); ctx.lineTo(-14, headY + 1); ctx.closePath(); this._fs(ctx, palette.raspberryPink);
      } else this._headwear(ctx, 'beanie', palette, palette.lavender, headY + 3);

      // Luvas e cesto
      if (basketCount > 0) {
        ctx.beginPath(); ctx.roundRect(10, 0 - bounce, 11, 10, 3); this._fs(ctx, palette.wood);
        ctx.fillStyle = palette.peonyPink; ctx.beginPath(); ctx.arc(14, -1 - bounce, 2.6, 0, Math.PI * 2); ctx.arc(18, -2 - bounce, 2.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(10, 6 - bounce, 2.6, 0, Math.PI * 2); this._fs(ctx, palette.cream);

      ctx.restore();
    });
  }

  // --------------------------------------------------------
  // 3. Clientes da Loja
  // --------------------------------------------------------
  drawCustomer(ctx, x, y, variant = 0, isWalking = false, walkTime = 0, speechIcon = null, speechText = '', speechFlowers = []) {
    const palette = themeManager.assetPalette;
    const flowerOrders = Array.isArray(speechFlowers) ? speechFlowers : [];
    const v = Math.abs(variant | 0);
    const h = (salt, mod) => ((v + 1) * (salt * 7 + 3) + salt * salt + (v >> 1) * salt) % mod;

    const outfit = h(1, 6);
    const skin = this._skinTone(h(2, 6));
    const hair = this._hairTone(h(3, 7), palette);
    const hairStyle = h(4, 5);
    const glasses = h(5, 4) === 0;
    const hat = [null, null, 'beret', 'sun', 'clip', 'beanie', null][h(6, 7)];
    const colors = [palette.lavender, palette.peonyPink, palette.sunYellow, palette.softBlue, palette.leafGreen, palette.raspberryPink];
    const color = colors[h(7, 6)];
    const trim = colors[(h(7, 6) + 2) % 6];

    ctx.save();
    ctx.translate(x, y);
    const bounce = isWalking ? Math.sin(walkTime * 11) * 2.5 : 0;
    const step = isWalking ? Math.sin(walkTime * 11) * 2.5 : 0;
    const headY = -10 - bounce;
    ctx.strokeStyle = palette.deepGreen; ctx.lineWidth = 2.5;

    // Sombra
    ctx.fillStyle = 'rgba(47, 93, 74, 0.2)';
    ctx.beginPath(); ctx.ellipse(0, 16, 14, 7, 0, 0, Math.PI * 2); ctx.fill();

    // Mochila atrás (outfit 4)
    if (outfit === 4) { ctx.beginPath(); ctx.roundRect(-15, 0 - bounce, 8, 13, 3); this._fs(ctx, trim); }

    // Cabelo atrás
    this._hairBack(ctx, hairStyle, hair, headY);

    // Sapatos variados
    ctx.beginPath();
    ctx.ellipse(-5, 14 - bounce + step, 4, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(5, 14 - bounce - step, 4, 3, 0, 0, Math.PI * 2);
    this._fs(ctx, outfit === 3 ? palette.sunYellow : [palette.deepGreen, palette.earthBrown, palette.cream][h(8, 3)]);

    // ----- Roupas -----
    if (outfit === 0) { // vestido de bolinhas com laço
      ctx.beginPath();
      ctx.moveTo(-9, -2 - bounce); ctx.lineTo(9, -2 - bounce);
      ctx.quadraticCurveTo(15, 8 - bounce, 14, 16); ctx.lineTo(-14, 16);
      ctx.quadraticCurveTo(-15, 8 - bounce, -9, -2 - bounce); this._fs(ctx, color);
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      [[-6, 6], [3, 4], [8, 11], [-2, 12], [-9, 12]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(dx, dy - bounce * 0.6, 1.5, 0, Math.PI * 2); ctx.fill(); });
      ctx.beginPath(); ctx.moveTo(0, 0 - bounce); ctx.lineTo(-5, -3 - bounce); ctx.lineTo(-5, 3 - bounce); ctx.closePath();
      ctx.moveTo(0, 0 - bounce); ctx.lineTo(5, -3 - bounce); ctx.lineTo(5, 3 - bounce); ctx.closePath(); this._fs(ctx, trim);
    } else if (outfit === 1) { // casaco com botões e cachecol listrado
      ctx.beginPath(); ctx.roundRect(-11.5, -2 - bounce, 23, 19, [6, 6, 6, 6]); this._fs(ctx, color);
      ctx.fillStyle = palette.deepGreen;
      [3, 8, 13].forEach(by => { ctx.beginPath(); ctx.arc(0, by - bounce, 1.1, 0, Math.PI * 2); ctx.fill(); });
      ctx.beginPath(); ctx.roundRect(-10, -3 - bounce, 20, 5, 2.5); this._fs(ctx, trim);
      ctx.fillStyle = palette.cream; ctx.fillRect(-6, -2.5 - bounce, 2.5, 4); ctx.fillRect(1, -2.5 - bounce, 2.5, 4);
      ctx.beginPath(); ctx.roundRect(5, 0 - bounce, 4, 10, 2); this._fs(ctx, trim);
    } else if (outfit === 2) { // camisa, colete e gravata-borboleta
      ctx.beginPath(); ctx.roundRect(-11, -2 - bounce, 22, 18, [5, 5, 7, 7]); this._fs(ctx, palette.cream);
      ctx.beginPath(); ctx.moveTo(-9, -2 - bounce); ctx.lineTo(-1.5, 0 - bounce); ctx.lineTo(-1.5, 16); ctx.lineTo(-9, 16); ctx.closePath();
      ctx.moveTo(9, -2 - bounce); ctx.lineTo(1.5, 0 - bounce); ctx.lineTo(1.5, 16); ctx.lineTo(9, 16); ctx.closePath(); this._fs(ctx, color);
      ctx.beginPath(); ctx.moveTo(0, 0 - bounce); ctx.lineTo(-4, -2 - bounce); ctx.lineTo(-4, 2 - bounce); ctx.closePath();
      ctx.moveTo(0, 0 - bounce); ctx.lineTo(4, -2 - bounce); ctx.lineTo(4, 2 - bounce); ctx.closePath(); this._fs(ctx, palette.raspberryPink);
    } else if (outfit === 3) { // impermeável amarelo com capuz
      ctx.beginPath(); ctx.roundRect(-12, -2 - bounce, 24, 19, [6, 6, 8, 8]); this._fs(ctx, palette.sunYellow);
      ctx.fillStyle = palette.deepGreen;
      [2, 7, 12].forEach(by => { ctx.beginPath(); ctx.arc(0, by - bounce, 1.1, 0, Math.PI * 2); ctx.fill(); });
      ctx.beginPath(); ctx.roundRect(-8, 8 - bounce, 6, 5, 1.5); this._fs(ctx, '#E9AE22');
    } else if (outfit === 4) { // camisola às riscas
      ctx.beginPath(); ctx.roundRect(-11, -2 - bounce, 22, 18, [6, 6, 8, 8]); this._fs(ctx, color);
      ctx.fillStyle = palette.cream;
      [1, 6, 11].forEach(by => ctx.fillRect(-10, by - bounce, 20, 2.4));
      ctx.beginPath(); ctx.roundRect(-9, -3 - bounce, 18, 4, 2); this._fs(ctx, trim);
    } else { // macacão com camisa e flor na lapela
      ctx.beginPath(); ctx.roundRect(-11, -2 - bounce, 22, 18, [5, 5, 7, 7]); this._fs(ctx, palette.cream);
      ctx.beginPath(); ctx.roundRect(-9, 3 - bounce, 18, 13, [3, 3, 7, 7]); this._fs(ctx, color);
      ctx.fillRect(-7, -2 - bounce, 3, 6); ctx.fillRect(4, -2 - bounce, 3, 6);
      ctx.beginPath(); ctx.arc(-6, 5 - bounce, 2.4, 0, Math.PI * 2); this._fs(ctx, palette.peonyPink);
    }

    // Cabeça + rosto
    ctx.beginPath(); ctx.arc(0, headY, 10, 0, Math.PI * 2); this._fs(ctx, skin);
    this._face(ctx, palette, headY, 0, glasses);

    // Cabelo frente + chapéu / capuz
    if (outfit === 3) {
      this._headwear(ctx, 'hood', palette, palette.sunYellow, headY);
    } else {
      this._hairFront(ctx, hairStyle, hair, headY);
      if (hat) this._headwear(ctx, hat, palette, trim, headY + (hat === 'sun' ? 3 : 1));
    }

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

      ctx.fillStyle = palette.cream;
      ctx.strokeStyle = palette.deepGreen;
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, -bubbleWidth / 2, -16, bubbleWidth, 28, 8, true, true);

      ctx.beginPath();
      ctx.moveTo(-4, 12); ctx.lineTo(0, 18); ctx.lineTo(4, 12);
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
  drawFlower(ctx, x, y, flowerConfig, progress = 1.0, swayAngle = 0, drawThemeHalo = true) {
    flowerConfig = themeManager.resolveFlowerConfig(flowerConfig);
    const cfg = flowerConfig;
    const palette = themeManager.palette;
    const out = palette.deepGreen;
    const pulse = 0.5 + 0.5 * Math.sin(swayAngle * 1.3);
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // ---- Estágio 1: montinho com semente (e ponta verde a espreitar)
    if (progress < 0.25) {
      const t = progress / 0.25;
      this._soil(ctx, 1);
      ctx.strokeStyle = '#4B2E18'; ctx.lineWidth = 1.4; ctx.fillStyle = '#B07A47';
      ctx.beginPath(); ctx.ellipse(0, 3, 2.8, 1.9, -0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-1.6, 3.4); ctx.lineTo(1.6, 2.4); ctx.stroke();
      if (t > 0.55) {
        const g = (t - 0.55) / 0.45;
        ctx.fillStyle = palette.leafGreen; ctx.strokeStyle = out; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(0, 1.2 - g * 2.5, 1.7 + g * 0.8, 1.6 + g * 2.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
      return;
    }

    // ---- Estágio 2: broto com duas folhinhas
    if (progress < 0.65) {
      const t = (progress - 0.25) / 0.4;
      const h = 6 + t * 9;
      ctx.rotate(Math.sin(swayAngle) * 0.03);
      this._soil(ctx, 0.85);
      ctx.beginPath(); ctx.moveTo(0, 4); ctx.quadraticCurveTo(2, 4 - h / 2, 0, 4 - h);
      ctx.strokeStyle = out; ctx.lineWidth = 5; ctx.stroke();
      ctx.strokeStyle = palette.leafGreen; ctx.lineWidth = 2.6; ctx.stroke();
      const ly = 4 - h * 0.85, L = 4 + t * 6, W = 1.8 + t * 2;
      this._leaf(ctx, 0, ly, L, W, Math.PI + 0.5, palette.leafGreen, out, 1.6);
      this._leaf(ctx, 0, ly, L, W, -0.5, this._tint(palette.leafGreen, 0.08), out, 1.6);
      ctx.restore();
      return;
    }

    // ---- Estágios 3 e 4: botão → a abrir → madura
    const mature = progress >= 1.0;
    const u = Math.min(1, (progress - 0.65) / 0.35);
    const scale = mature ? 1.0 : 0.8 + 0.2 * u;
    ctx.rotate(Math.sin(swayAngle) * (mature ? 0.08 : 0.03));
    ctx.scale(scale, scale);
    this._soil(ctx, 0.8);

    // Caule com contorno
    const bend = Math.sin(swayAngle * 0.5) * 4;
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.quadraticCurveTo(bend, -4, 0, -12);
    ctx.strokeStyle = out; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = cfg.stemColor || palette.leafGreen; ctx.lineWidth = 3.2; ctx.stroke();

    // Folhas (mais finas na espiga)
    const thin = cfg.shape === 'spike' ? 0.6 : 1;
    this._leaf(ctx, 0.5, -3, 12, 4.2 * thin, -0.35, palette.leafGreen, out);
    this._leaf(ctx, -0.5, 0, 10, 3.6 * thin, Math.PI + 0.45, this._tint(palette.leafGreen, 0.08), out);

    // Cabeça
    ctx.translate(0, -14);
    if (mature) {
      if (drawThemeHalo) themeManager.drawFlowerHalo(ctx, cfg);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.26 + pulse * 0.14})`;
      ctx.beginPath(); ctx.arc(0, 0, (cfg.radius || 14) + 3 + pulse * 1.5, 0, Math.PI * 2); ctx.fill();
    }
    if (!mature && u < 0.4) this._bud(ctx, cfg, palette, u / 0.4);
    else this._head(ctx, cfg, palette, mature ? 1 : (u - 0.4) / 0.6, pulse);

    // Faíscas de "pronta a colher"
    if (mature && !themeManager.effectsReduced) {
      const R = cfg.radius || 14;
      this._sparkle(ctx, R * 0.9, -R * 0.8, 3 + pulse * 1.6, 0.55 + pulse * 0.4);
      this._sparkle(ctx, -R * 0.95, -R * 0.2, 2.2 + (1 - pulse) * 1.4, 0.45 + (1 - pulse) * 0.45);
    }

    themeManager.drawLayer(ctx, 'drawFlowerAccent', cfg, progress, themeManager.effectsReduced);
    ctx.restore();
  }

  drawFlowerSymbol(ctx, x, y, flowerConfig, muted = false) {
    const P = typeof PALETTE !== 'undefined' ? PALETTE : themeManager.palette;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    const petalColor = muted ? '#B9B3A8' : flowerConfig.color;
    const centerColor = muted ? '#81796D' : flowerConfig.centerColor;
    const outlineColor = muted ? '#81796D' : flowerConfig.outlineColor || P.deepGreen;
    const stemColor = muted ? '#9A9488' : flowerConfig.stemColor || P.leafGreen;
    const petalCount = Math.max(3, Math.min(18, Math.round(flowerConfig.petals || 6)));

    // caule + folhinhas
    ctx.strokeStyle = stemColor; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(0, 6.5); ctx.lineTo(0, 1); ctx.stroke();
    ctx.fillStyle = stemColor; ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.ellipse(-2.3, 4.4, 2.4, 1.05, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(2.3, 5.2, 2.2, 1, 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.55;
    if (flowerConfig.shape === 'spike') {
      const rows = 5;
      ctx.fillStyle = petalColor;
      for (let r = rows - 1; r >= 0; r--) {
        const t = r / (rows - 1), py = 1.5 - t * 6.5, sz = 1.35 - t * 0.4;
        [-1, 1].forEach((d) => {
          ctx.beginPath(); ctx.ellipse(d * sz * 0.8, py, sz, sz * 1.2, d * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        });
      }
      ctx.beginPath(); ctx.ellipse(0, -5.6, 0.8, 1.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      return;
    }

    const headRadius = flowerConfig.radius >= 18 ? 2.6 : 2.1;
    const draw = (count, offset, scale, fill) => {
      ctx.fillStyle = fill;
      for (let i = 0; i < count; i++) {
        const a = offset + (i / count) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(
          Math.cos(a) * headRadius * scale, Math.sin(a) * headRadius * scale - 1.5,
          2.15 * scale, (flowerConfig.petalShape === 'heart' ? 1.4 : 1.05) * scale, a, 0, Math.PI * 2
        );
        ctx.fill(); ctx.stroke();
      }
    };
    if (petalCount >= 6 && !muted) draw(petalCount, Math.PI / petalCount, 0.85, this._tint(petalColor, -0.14));
    draw(petalCount, 0, 1, petalColor);

    ctx.fillStyle = centerColor; ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.arc(0, -1.5, 1.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath(); ctx.arc(-0.45, -1.95, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // --------------------------------------------------------
  // 5. Loja e Balcão
  // --------------------------------------------------------
  drawShopBuilding(ctx, x, y, width, height, decorLevel = 0, storeName = 'FloristEver', expansionLevel = 0, time = 0) {
    const palette = themeManager.assetPalette;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // Sombra
    ctx.fillStyle = 'rgba(47, 93, 74, 0.25)';
    drawRoundedRect(ctx, 4, 8, width, height, 16, true, false);

    // Parede: tábuas alternadas + pregos + base de pedra + traves de canto
    ctx.save();
    ctx.beginPath(); ctx.roundRect(0, 0, width, height, 16); ctx.clip();
    ctx.fillStyle = palette.wood; ctx.fillRect(0, 0, width, height);
    for (let py = 12, i = 0; py < height - 12; py += 24, i++) {
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.08)' : 'rgba(47,93,74,.07)'; ctx.fillRect(0, py, width, 24);
      ctx.strokeStyle = 'rgba(47, 93, 74, 0.28)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(width, py); ctx.stroke();
      ctx.fillStyle = 'rgba(47,93,74,.4)';
      [10, width - 10].forEach(nx => { ctx.beginPath(); ctx.arc(nx, py + 12, 1.4, 0, Math.PI * 2); ctx.fill(); });
    }
    ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(0, 0, 9, height); ctx.fillRect(width - 9, 0, 9, height);
    const baseY = height - 14;
    ctx.fillStyle = '#B9B3A0'; ctx.fillRect(0, baseY, width, 14);
    ctx.strokeStyle = 'rgba(47,93,74,.4)'; ctx.lineWidth = 1.6;
    for (let sx = 0, r = 0; sx < width; sx += 22, r++) { ctx.beginPath(); ctx.moveTo(sx + (r % 2) * 8, baseY); ctx.lineTo(sx + (r % 2) * 8, height); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(width, baseY); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = palette.deepGreen; ctx.lineWidth = 4;
    drawRoundedRect(ctx, 0, 0, width, height, 16, false, true);

    // Janelas (tamanho adaptado ao nº de ampliações)
    const windowCount = Math.max(1, Math.min(4, 1 + expansionLevel));
    const ww = Math.min(60, (width - 48 - (windowCount - 1) * 14) / windowCount);
    const gap = windowCount > 1 ? (width - 48 - windowCount * ww) / (windowCount - 1) : 0;
    const wx0 = windowCount > 1 ? 24 : (width - ww) / 2;
    for (let i = 0; i < windowCount; i++) {
      const wx = wx0 + i * (ww + gap);
      if (ww >= 40) { // portadas
        ctx.fillStyle = palette.leafGreen; ctx.strokeStyle = palette.deepGreen; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.roundRect(wx - 9, 38, 8, 52, 3); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.roundRect(wx + ww + 1, 38, 8, 52, 3); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(47,93,74,.45)'; ctx.lineWidth = 1.4;
        for (let l = 0; l < 4; l++) { const ly = 44 + l * 10; ctx.beginPath(); ctx.moveTo(wx - 8, ly); ctx.lineTo(wx - 2, ly); ctx.moveTo(wx + ww + 2, ly); ctx.lineTo(wx + ww + 8, ly); ctx.stroke(); }
      }
      ctx.fillStyle = palette.softBlue; ctx.strokeStyle = palette.deepGreen; ctx.lineWidth = 3;
      drawRoundedRect(ctx, wx, 40, ww, 48, 8, true, true);
      ctx.strokeStyle = 'rgba(47,93,74,.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(wx + ww / 2, 42); ctx.lineTo(wx + ww / 2, 86); ctx.moveTo(wx + 2, 64); ctx.lineTo(wx + ww - 2, 64); ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath(); ctx.moveTo(wx + 6, 46); ctx.lineTo(wx + 24, 46); ctx.lineTo(wx + 11, 80); ctx.lineTo(wx + 2, 80); ctx.closePath(); ctx.fill();
      // cortina em onda
      ctx.fillStyle = palette.peonyPink; ctx.strokeStyle = palette.deepGreen; ctx.lineWidth = 2;
      const sc = Math.max(3, Math.round(ww / 12));
      ctx.beginPath(); ctx.moveTo(wx + 2, 42);
      for (let s = 0; s < sc; s++) { const sx = wx + 2 + (s + 0.5) * ((ww - 4) / sc); ctx.quadraticCurveTo(sx, 56, wx + 2 + (s + 1) * ((ww - 4) / sc), 42); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      this.drawFlowerBox(ctx, wx - 4, 84, ww + 8, time + i);
    }

    // Toldo recortado em escamas + trave de madeira
    const awTop = -26, awBase = 4, sw = width / 7;
    ctx.fillStyle = '#B07A4A'; ctx.strokeStyle = palette.deepGreen; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-6, awTop - 7, width + 12, 10, 5); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const fallbackColor = i % 2 === 0 ? palette.raspberryPink : palette.cream;
      ctx.fillStyle = themeManager.getAwningColor(i, fallbackColor);
      ctx.beginPath();
      ctx.moveTo(i * sw, awTop); ctx.lineTo((i + 1) * sw, awTop); ctx.lineTo((i + 1) * sw, awBase);
      ctx.arc(i * sw + sw / 2, awBase, sw / 2, 0, Math.PI, false);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    const sh = ctx.createLinearGradient(0, awBase, 0, awBase + 18);
    sh.addColorStop(0, 'rgba(47,93,74,.22)'); sh.addColorStop(1, 'rgba(47,93,74,0)');
    ctx.fillStyle = sh; ctx.fillRect(4, awBase + sw / 2, width - 8, 14);

    // Placa suspensa com o nome
    const bw = 140, bx = width / 2 - bw / 2, by = 12;
    ctx.strokeStyle = palette.deepGreen; ctx.lineWidth = 2;
    [bx + 18, bx + bw - 18].forEach(cx => { ctx.beginPath(); ctx.moveTo(cx, awBase + 2); ctx.lineTo(cx, by + 2); ctx.stroke(); });
    ctx.lineWidth = 3; ctx.fillStyle = palette.cream;
    drawRoundedRect(ctx, bx, by, bw, 26, 8, true, true);
    this._bloom(ctx, bx + 11, by + 13, 4, palette.peonyPink, palette.sunYellow);
    this._bloom(ctx, bx + bw - 11, by + 13, 4, palette.lavender, palette.sunYellow);
    ctx.fillStyle = palette.plumText || palette.deepGreen;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const signText = String(storeName || 'FloristEver').trim() || 'FloristEver';
    const maxTextWidth = 106;
    let fontSize = 13;
    ctx.font = `800 ${fontSize}px "Quicksand", sans-serif`;
    while (fontSize > 7 && ctx.measureText(signText).width > maxTextWidth) { fontSize--; ctx.font = `800 ${fontSize}px "Quicksand", sans-serif`; }
    ctx.fillText(signText, width / 2, by + 13.5, maxTextWidth);

    // Decoração progressiva
    if (decorLevel >= 1) { // vaso grande à esquerda
      ctx.lineWidth = 3; ctx.strokeStyle = palette.deepGreen;
      ctx.beginPath(); ctx.roundRect(-14, height - 34, 18, 28, [3, 3, 6, 6]); ctx.fillStyle = palette.earthBrown; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(-16, height - 38, 22, 6, 3); ctx.fillStyle = '#9A6A44'; ctx.fill(); ctx.stroke();
      [[-9, -48, palette.peonyPink], [-2, -52, '#fff'], [-5, -44, palette.sunYellow]].forEach(([dx, dy, c]) => this._bloom(ctx, dx, height + dy, 4.5, c, palette.sunYellow, 8));
    }
    if (decorLevel >= 2) { // vaso à direita + bandeirolas
      ctx.lineWidth = 3; ctx.strokeStyle = palette.deepGreen;
      ctx.beginPath(); ctx.roundRect(width - 4, height - 30, 18, 24, [3, 3, 6, 6]); ctx.fillStyle = palette.earthBrown; ctx.fill(); ctx.stroke();
      this._bloom(ctx, width + 5, height - 38, 5, palette.lavender, palette.sunYellow, 8);
      const flags = [palette.peonyPink, palette.sunYellow, palette.softBlue, palette.lavender, palette.leafGreen];
      const n = Math.max(6, Math.floor(width / 24)), top = awTop - 5;
      ctx.lineWidth = 1.8; ctx.strokeStyle = palette.deepGreen;
      ctx.beginPath(); for (let i = 0; i <= 24; i++) { const t = i / 24; const px = -4 + t * (width + 8), py = top - 4 + Math.sin(t * Math.PI) * 9; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, px = -4 + t * (width + 8), py = top - 4 + Math.sin(t * Math.PI) * 9, sway = Math.sin(time * 2.4 + i) * 1.5;
        ctx.beginPath(); ctx.moveTo(px - 4, py); ctx.lineTo(px + 4, py); ctx.lineTo(px + sway, py + 9); ctx.closePath();
        ctx.fillStyle = flags[i % flags.length]; ctx.fill(); ctx.stroke();
      }
    }
    if (decorLevel >= 3) { // trepadeira florida + luzinhas no toldo
      ctx.strokeStyle = palette.deepGreen; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(3, awBase + 6); ctx.bezierCurveTo(-6, 30, 12, 50, 2, height - 20); ctx.stroke();
      for (let i = 0; i < 7; i++) { const py = awBase + 10 + i * ((height - 40) / 7); ctx.fillStyle = palette.leafGreen; ctx.beginPath(); ctx.ellipse(3 + (i % 2 ? 6 : -4), py, 4.5, 2.4, i % 2 ? 0.6 : -0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); if (i % 3 === 1) this._bloom(ctx, 6 + (i % 2) * 2, py + 3, 2.6, palette.peonyPink, palette.sunYellow); }
      for (let i = 0; i < 9; i++) { const lx = (i + 0.5) * (width / 9), tw = 0.55 + 0.45 * Math.sin(time * 3 + i * 1.7); ctx.fillStyle = `rgba(255,224,130,${0.5 + 0.5 * tw})`; ctx.beginPath(); ctx.arc(lx, awBase + sw / 2 + 4, 2.2, 0, Math.PI * 2); ctx.fill(); }
      this.drawLantern(ctx, width + 18, height - 66, time, true);
    }
    ctx.restore();
  }

  // Balcão de Vendas (onde o jogador e o cliente se encontram)
  drawCounter(ctx, x, y, width, height, hasCashier = false, time = 0) {
    const palette = themeManager.assetPalette;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // Sombra no chão
    ctx.fillStyle = 'rgba(47, 93, 74, 0.2)';
    ctx.beginPath(); ctx.ellipse(width / 2, height + 3, width * 0.52, 6, 0, 0, Math.PI * 2); ctx.fill();

    // Tapete de boas-vindas com franjas e flores
    const ry = height + 4, rw = width - 20;
    ctx.strokeStyle = palette.deepGreen; ctx.lineWidth = 2;
    for (let f = 0; f < 6; f++) { const fy = ry + 2 + f * 2.4; ctx.beginPath(); ctx.moveTo(10, fy); ctx.lineTo(5, fy); ctx.moveTo(10 + rw, fy); ctx.lineTo(15 + rw, fy); ctx.stroke(); }
    ctx.fillStyle = palette.peonyPink; drawRoundedRect(ctx, 10, ry, rw, 16, 6, true, true);
    ctx.fillStyle = palette.cream; drawRoundedRect(ctx, 15, ry + 3, rw - 10, 10, 4, true, false);
    for (let i = 0; i < Math.floor((rw - 20) / 20); i++) this._bloom(ctx, 24 + i * 20, ry + 8, 3, i % 2 ? palette.lavender : palette.raspberryPink, palette.sunYellow);

    // Corpo do balcão
    ctx.fillStyle = '#D6A87A'; ctx.strokeStyle = palette.deepGreen; ctx.lineWidth = 3.5;
    drawRoundedRect(ctx, 0, 0, width, height, 10, true, true);
    ctx.fillStyle = 'rgba(47,93,74,.18)'; ctx.fillRect(4, height - 7, width - 8, 5); // rodapé
    const panels = Math.max(2, Math.floor(width / 46)), pw = (width - 12) / panels;
    for (let i = 0; i < panels; i++) {
      ctx.fillStyle = '#C9955F'; ctx.strokeStyle = 'rgba(47,93,74,.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(8 + i * pw, 14, pw - 6, height - 26, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(11 + i * pw, 17, pw - 12, 3);
    }
    // Placa com flor
    ctx.strokeStyle = palette.deepGreen; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(width / 2 - 15, height / 2 - 4, 30, 14, 5); ctx.fillStyle = palette.cream; ctx.fill(); ctx.stroke();
    this._bloom(ctx, width / 2, height / 2 + 3, 4, palette.raspberryPink, palette.sunYellow);

    // Tampo com brilho
    ctx.fillStyle = '#E8C59D'; ctx.strokeStyle = palette.deepGreen; ctx.lineWidth = 3;
    drawRoundedRect(ctx, -4, -6, width + 8, 14, 6, true, true);
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(6, -3, width - 12, 2.5);

    // Objetos no tampo
    ctx.lineWidth = 2;
    if (width > 90) { // jarra com ramo
      ctx.beginPath(); ctx.roundRect(10, -22, 12, 16, [3, 3, 5, 5]); ctx.fillStyle = 'rgba(143,196,232,.85)'; ctx.fill(); ctx.stroke();
      [[-3, palette.peonyPink], [3, '#fff'], [9, palette.sunYellow]].forEach(([dx, c], i) => this._bloom(ctx, 16 + dx - 3, -30 - (i % 2) * 4, 4, c, palette.sunYellow, 9));
    }
    if (width > 130) { // campainha
      ctx.save(); ctx.translate(width * 0.36, -6); ctx.rotate(Math.sin(time * 3) * 0.12 * (time > 0 ? 1 : 0));
      ctx.beginPath(); ctx.roundRect(-8, -3, 16, 3, 1.5); ctx.fillStyle = palette.earthBrown; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -3, 7, Math.PI, 0); ctx.fillStyle = palette.sunYellow; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -11, 1.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    if (width > 170) { // bloco de notas + lápis
      ctx.save(); ctx.translate(width * 0.52, -6); ctx.rotate(-0.08);
      ctx.beginPath(); ctx.roundRect(-9, -9, 18, 9, 2); ctx.fillStyle = palette.cream; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, -5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(14, -10); ctx.strokeStyle = palette.raspberryPink; ctx.stroke(); ctx.restore();
    }

    // Caixa registadora
    if (hasCashier) {
      const cx = width - 44;
      ctx.strokeStyle = palette.deepGreen; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.roundRect(cx, -26, 30, 20, 4); ctx.fillStyle = palette.sunYellow; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(cx + 4, -42, 22, 14, 3); ctx.fillStyle = palette.cream; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7FE0A8'; ctx.fillRect(cx + 7, -39, 16, 6);
      ctx.fillStyle = palette.deepGreen; ctx.font = '800 5px "Quicksand", sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('0,00', cx + 22, -36);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { ctx.fillStyle = (r + c) % 3 === 0 ? palette.raspberryPink : palette.cream; ctx.beginPath(); ctx.arc(cx + 5 + c * 6.5, -21 + r * 6, 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.roundRect(cx + 3, -8, 24, 4, 2); ctx.fillStyle = '#B07A4A'; ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  getTreeSprite(themePalette) {
    if (!this.treeSpriteCache) this.treeSpriteCache = new Map();
    const leaf = themePalette?.leafGreen || PALETTE.leafGreen;
    const deep = themePalette?.deepGreen || PALETTE.deepGreen;
    const highlight = themePalette?.highlight || '#78BC84';
    const key = `${leaf}|${deep}|${highlight}`;
    if (this.treeSpriteCache.has(key)) return this.treeSpriteCache.get(key);

    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 104;
    const sctx = canvas.getContext('2d');
    if (!sctx) return null;

    sctx.translate(48, 52);

    // Sombra
    sctx.fillStyle = 'rgba(47, 93, 74, 0.2)';
    sctx.beginPath();
    sctx.ellipse(0, 32, 28, 14, 0, 0, Math.PI * 2);
    sctx.fill();

    // Tronco
    sctx.fillStyle = PALETTE.earthBrown;
    sctx.strokeStyle = PALETTE.deepGreen;
    sctx.lineWidth = 3;
    sctx.beginPath();
    sctx.roundRect(-7, 6, 14, 26, [2, 2, 4, 4]);
    sctx.fill();
    sctx.stroke();

    // Copa da Árvore
    sctx.fillStyle = leaf;
    sctx.strokeStyle = deep;
    sctx.lineWidth = 3.5;
    sctx.beginPath();
    sctx.arc(0, -6, 24, 0, Math.PI * 2);
    sctx.arc(-14, 2, 18, 0, Math.PI * 2);
    sctx.arc(14, 2, 18, 0, Math.PI * 2);
    sctx.fill();
    sctx.stroke();

    // Toque de luz na copa
    sctx.fillStyle = highlight;
    sctx.beginPath();
    sctx.arc(-6, -12, 12, 0, Math.PI * 2);
    sctx.fill();

    this.treeSpriteCache.set(key, canvas);
    return canvas;
  }

  // --------------------------------------------------------
  // 6. Árvores, Borboletas e Abelhas Acolhedoras
  // --------------------------------------------------------
  drawTree(ctx, x, y, time = 0, themePalette = null) {
    ctx.save();
    ctx.translate(x, y);

    const sway = Math.sin(time + x * 0.05) * 0.04;
    ctx.rotate(sway);

    const sprite = this.getTreeSprite(themePalette);
    if (sprite) {
      ctx.drawImage(sprite, -48, -52);
    } else {
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
    }

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
