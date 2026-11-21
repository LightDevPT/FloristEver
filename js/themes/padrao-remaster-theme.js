/* ==========================================================================
   Tema "Padrão Remaster" — FloristEver
   O jardim do tema padrão, visto à luz da manhã: orvalho nas folhas,
   pólen no ar, raios de sol entre as copas e, ao anoitecer, pirilampos.
   Mesma API do COLOR_FESTIVAL_THEME / HEARTS_GARDEN_THEME.

   Identidade
   - Uma só peça memorável: o "Florescer". Uma flor pronta a colher abre
     uma corola de pétalas que gira devagar e solta pólen. Tudo o resto
     fica discreto para não competir com ela.
   - As flores mantêm os matizes originais (é um remaster, não um tema novo):
     as cores do jogo são enriquecidas por cálculo HSL e guardadas em cache.

   Otimização (alvo: 60 FPS no mínimo)
   - Zero gradientes criados por frame: brilho, vinheta e raios de sol são
     criados UMA vez por tamanho de ecrã. Os raios vivem num canvas a meia
     resolução e entram com um único drawImage.
   - Relva, brilhos e flores do chão: só as células visíveis, em lotes
     (um único stroke por cor), com culling pela matriz do canvas.
   - Formas em Path2D criadas uma vez; tabelas de seno/cosseno pré-calculadas.
   - Sem Math.random: variação por hash determinístico (sem cintilação).
   - Qualidade adaptativa: se o tempo médio de frame passar de ~19,5 ms o
     tema reduz sozinho a densidade (nível 0 → 1 → 2) e só volta a subir
     depois de um período estável, cada vez mais longo (sem oscilação).
   - Todas as animações respeitam `reducedEffects` (valores fixos).
   ========================================================================== */

const OUTLINE = '#24523F';
const CREAM = '#FFF4DC';
const GOLD = '#F9C74F';
const PINK = '#F2A0B5';
const LILAC = '#A98FDC';
const LEAF = '#4E9F5F';
const WOOD = '#C48B5A';
const TAU = Math.PI * 2;

const BLOOM = Object.freeze([PINK, GOLD, LILAC, '#FFFDF6', '#9AD7E6']);

const TREE_PALETTES = Object.freeze([
  Object.freeze({ leafGreen: '#4E9F5F', highlight: '#B9E08A', deepGreen: OUTLINE }),
  Object.freeze({ leafGreen: '#5BAA6A', highlight: '#CDEB92', deepGreen: OUTLINE }),
  Object.freeze({ leafGreen: '#3F8F68', highlight: '#A6E0B8', deepGreen: OUTLINE }),
  Object.freeze({ leafGreen: '#6AA84F', highlight: '#F7D88A', deepGreen: OUTLINE })
]);

/* ---------- Formas e tabelas pré-computadas ---------- */

const HAS_PATH2D = typeof Path2D !== 'undefined';

// Brilho de 4 pontas (escala = size / 16)
const STAR_PATH = HAS_PATH2D
  ? new Path2D('M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z')
  : null;

// Arco de entrada: postes + curva (coordenadas locais)
const ARCH_PATH = HAS_PATH2D
  ? new Path2D('M-36 24 L-36 -8 Q-36 -38 0 -38 Q36 -38 36 -8 L36 24')
  : null;

// Cinco pétalas (começa no topo)
const P5X = Object.freeze([0, 1, 2, 3, 4].map((i) => Math.cos(-Math.PI / 2 + (i * TAU) / 5)));
const P5Y = Object.freeze([0, 1, 2, 3, 4].map((i) => Math.sin(-Math.PI / 2 + (i * TAU) / 5)));

// Corola do "Florescer": anel exterior (8 pétalas) e interior (8 pétalas, desfasadas)
function buildPetalRing(count, distance, rx, ry, offset) {
  if (!HAS_PATH2D) return null;
  const ring = new Path2D();
  for (let i = 0; i < count; i++) {
    const angle = offset + (i * TAU) / count;
    const cx = Math.cos(angle) * distance;
    const cy = Math.sin(angle) * distance;
    ring.moveTo(cx + Math.cos(angle) * ry, cy + Math.sin(angle) * ry);
    ring.ellipse(cx, cy, ry, rx, angle, 0, TAU);
  }
  return ring;
}
const BLOOM_RING_OUTER = buildPetalRing(8, 21, 1.9, 3.6, 0);
const BLOOM_RING_INNER = buildPetalRing(8, 15, 1.4, 2.6, Math.PI / 8);

/* ---------- Estado partilhado do tema ----------
   drawGardenLayer corre uma vez por frame, antes de todos os outros ganchos
   do mundo. Guarda aqui o relógio do jogo (pára com o jogo em pausa), o
   retângulo visível e o nível de qualidade. Os restantes ganchos leem daqui,
   sem alocações. */
const fx = {
  time: 0,
  reduced: false,
  level: 0,
  view: { left: -1e9, top: -1e9, right: 1e9, bottom: 1e9 },
  last: 0,
  avg: 16.7,
  slow: 0,
  fast: 0,
  fastNeeded: 60 * 20
};

function trackFramePacing() {
  const now = performance.now();
  const dt = now - fx.last;
  fx.last = now;
  if (dt <= 0 || dt > 120) return; // separador em segundo plano / pausa

  fx.avg += (dt - fx.avg) * 0.06;
  if (fx.avg > 19.5) {
    fx.slow++;
    fx.fast = 0;
  } else if (fx.avg < 17.6) {
    fx.fast++;
    fx.slow = 0;
  } else {
    fx.slow = 0;
    fx.fast = 0;
  }

  if (fx.slow > 45 && fx.level < 2) {
    fx.level++;
    fx.slow = 0;
    fx.fast = 0;
    fx.fastNeeded = Math.min(fx.fastNeeded * 2, 60 * 240);
  } else if (fx.fast > fx.fastNeeded && fx.level > 0) {
    fx.level--;
    fx.fast = 0;
  }
}

/* ---------- Utilitários ---------- */

// Hash determinístico [0,1)
function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Enriquecimento de cor (HSL), com cache: o remaster mantém o matiz original
const enrichCache = new Map();

function enrich(hex, saturationBoost, lightBoost) {
  if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const key = `${hex}|${saturationBoost}|${lightBoost}`;
  const cached = enrichCache.get(key);
  if (cached) return cached;

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;
  const d = max - min;
  if (d > 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  // Cores quase neutras (brancos, cremes) não ganham saturação
  s = s < 0.08 ? s : Math.min(1, s + saturationBoost);
  l = Math.min(0.96, l + lightBoost);

  const hue = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let nr = l;
  let ng = l;
  let nb = l;
  if (s > 0) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    nr = hue(p, q, h + 1 / 3);
    ng = hue(p, q, h);
    nb = hue(p, q, h - 1 / 3);
  }
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  const out = `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
  enrichCache.set(key, out);
  return out;
}

const resolvedFlowers = new WeakMap();

// Vértices de uma folha (elipse) num lote: moveTo evita a linha de ligação
function addLeaf(ctx, cx, cy, rx, ry, rotation) {
  ctx.moveTo(cx + Math.cos(rotation) * rx, cy + Math.sin(rotation) * rx);
  ctx.ellipse(cx, cy, rx, ry, rotation, 0, TAU);
}

function drawGlint(ctx, x, y, size, fill) {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 16;
  ctx.scale(s, s);
  ctx.fillStyle = fill;
  if (STAR_PATH) {
    ctx.fill(STAR_PATH);
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
  }
  ctx.restore();
}

function drawBlossom(ctx, x, y, r, petal, center) {
  const petalRadius = r * 0.56;
  const distance = r * 0.62;
  ctx.fillStyle = petal;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const px = x + P5X[i] * distance;
    const py = y + P5Y[i] * distance;
    ctx.moveTo(px + petalRadius, py);
    ctx.arc(px, py, petalRadius, 0, TAU);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.34, 0, TAU);
  ctx.fill();
}

/* ---------- Cache de atmosfera (criado uma vez por tamanho de ecrã) ---------- */

const atmosphere = { w: 0, h: 0, glow: null, vignette: null, shafts: null };

function ensureAtmosphere(ctx, w, h) {
  if (atmosphere.w === w && atmosphere.h === h && atmosphere.glow) return;
  atmosphere.w = w;
  atmosphere.h = h;

  const glow = ctx.createRadialGradient(w * 0.12, -h * 0.05, 0, w * 0.12, -h * 0.05, Math.max(w, h) * 0.95);
  glow.addColorStop(0, 'rgba(255, 230, 160, 0.34)');
  glow.addColorStop(0.45, 'rgba(255, 238, 190, 0.10)');
  glow.addColorStop(1, 'rgba(255, 238, 190, 0)');
  atmosphere.glow = glow;

  const vignette = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.35,
    w / 2, h / 2, Math.max(w, h) * 0.78
  );
  vignette.addColorStop(0, 'rgba(36, 82, 63, 0)');
  vignette.addColorStop(1, 'rgba(36, 60, 40, 0.16)');
  atmosphere.vignette = vignette;

  atmosphere.shafts = null;
  if (typeof document !== 'undefined') {
    const sw = Math.max(2, Math.ceil(w / 2));
    const sh = Math.max(2, Math.ceil(h / 2));
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const sctx = canvas.getContext('2d');
    if (sctx) {
      const fade = sctx.createLinearGradient(0, 0, sw * 0.3, sh);
      fade.addColorStop(0, 'rgba(255, 240, 196, 0.55)');
      fade.addColorStop(0.6, 'rgba(255, 240, 196, 0.16)');
      fade.addColorStop(1, 'rgba(255, 240, 196, 0)');
      sctx.fillStyle = fade;
      const bands = [[0.02, 0.09], [0.15, 0.2], [0.29, 0.37], [0.47, 0.51]];
      for (const [a, b] of bands) {
        sctx.beginPath();
        sctx.moveTo(sw * a, -2);
        sctx.lineTo(sw * b, -2);
        sctx.lineTo(sw * (b + 0.55), sh);
        sctx.lineTo(sw * (a + 0.55), sh);
        sctx.closePath();
        sctx.fill();
      }
      atmosphere.shafts = canvas;
    }
  }
}

/* ---------- Peças decorativas ---------- */

// Fio de luzes com guirlanda: folhas, flores e lâmpadas ao longo de uma curva
function drawGarland(ctx, x0, x1, y0, sag, t, reduced, bulbs) {
  const span = x1 - x0;
  const ctrlY = y0 + sag * 2;

  ctx.lineCap = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(x0 + span / 2, ctrlY, x1, y0);
  ctx.stroke();

  const leafCount = Math.max(10, Math.floor(span / 14));
  ctx.fillStyle = LEAF;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let i = 0; i < leafCount; i++) {
    const u = (i + 0.5) / leafCount;
    const px = x0 + u * span;
    const py = y0 + 4 * sag * u * (1 - u);
    const slope = Math.atan2(4 * sag * (1 - 2 * u), span);
    const side = i % 2 === 0 ? 1 : -1;
    addLeaf(ctx, px, py + side * 2.4, 4, 1.9, slope + side * 0.7);
  }
  ctx.fill();
  ctx.stroke();

  const blossomCount = Math.max(4, Math.floor(span / 30));
  for (let i = 0; i < blossomCount; i++) {
    const u = (i + 0.5) / blossomCount;
    drawBlossom(ctx, x0 + u * span, y0 + 4 * sag * u * (1 - u) + 1, 3.6, BLOOM[i % 5], GOLD);
  }

  if (bulbs > 0) {
    ctx.strokeStyle = 'rgba(36, 82, 63, 0.7)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let j = 0; j < bulbs; j++) {
      const u = (j + 1) / (bulbs + 1);
      const px = x0 + u * span;
      const py = y0 + 4 * sag * u * (1 - u);
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + 6);
    }
    ctx.stroke();

    // Halos e núcleos em dois lotes; a oscilação é por lâmpada
    ctx.fillStyle = 'rgba(255, 224, 140, 0.16)';
    ctx.beginPath();
    for (let j = 0; j < bulbs; j++) {
      const u = (j + 1) / (bulbs + 1);
      const flicker = reduced ? 1 : 0.8 + 0.2 * Math.sin(t * 2.1 + j * 1.7);
      const px = x0 + u * span;
      const py = y0 + 4 * sag * u * (1 - u) + 8;
      ctx.moveTo(px + 7 * flicker, py);
      ctx.arc(px, py, 7 * flicker, 0, TAU);
    }
    ctx.fill();
    ctx.fillStyle = '#FFE9A0';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let j = 0; j < bulbs; j++) {
      const u = (j + 1) / (bulbs + 1);
      const px = x0 + u * span;
      const py = y0 + 4 * sag * u * (1 - u) + 8;
      ctx.moveTo(px + 2.6, py);
      ctx.arc(px, py, 2.6, 0, TAU);
    }
    ctx.fill();
    ctx.stroke();
  }
}

function drawSideVine(ctx, x, y, length, dir, t, reduced) {
  const sway = reduced ? 0 : Math.sin(t * 0.9 + x * 0.05) * 1.5;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(
    x + dir * 5 + sway, y + length * 0.3,
    x - dir * 4 + sway, y + length * 0.6,
    x + dir * 2 + sway, y + length
  );
  ctx.stroke();

  ctx.fillStyle = LEAF;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const k = 0.15 + i * 0.2;
    const lx = x + dir * 3 * Math.sin(k * Math.PI * 1.6) + sway * k;
    const ly = y + length * k;
    const side = i % 2 === 0 ? 1 : -1;
    addLeaf(ctx, lx + side * 3, ly, 3.4, 1.7, side > 0 ? -0.5 : Math.PI + 0.5);
  }
  ctx.fill();
  ctx.stroke();
  drawBlossom(ctx, x + dir * 2 + sway, y + length, 3.2, BLOOM[Math.abs(Math.round(x)) % 5], GOLD);
}

function strokeArch(ctx) {
  if (ARCH_PATH) {
    ctx.stroke(ARCH_PATH);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(-36, 24);
  ctx.lineTo(-36, -8);
  ctx.quadraticCurveTo(-36, -38, 0, -38);
  ctx.quadraticCurveTo(36, -38, 36, -8);
  ctx.lineTo(36, 24);
  ctx.stroke();
}

// Pórtico de glicínias à entrada do jardim
function drawFloralArch(ctx, x, y, t, reduced) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.fillStyle = 'rgba(36, 82, 63, 0.14)';
  ctx.beginPath();
  ctx.ellipse(0, 26, 48, 8, 0, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 7;
  strokeArch(ctx);
  ctx.strokeStyle = WOOD;
  ctx.lineWidth = 4;
  strokeArch(ctx);

  // Folhas ao longo do arco e dos postes
  ctx.fillStyle = LEAF;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) {
    const a = (Math.PI * i) / 10;
    const nx = -Math.cos(a);
    const ny = -Math.sin(a);
    addLeaf(ctx, nx * 36 + nx * 3, -8 + ny * 30 + ny * 3, 4.4, 2, Math.atan2(ny, nx) + (i % 2 ? 0.5 : -0.5));
  }
  for (let k = 0; k < 4; k++) {
    const ly = 20 - k * 8;
    addLeaf(ctx, -39, ly, 3.6, 1.8, Math.PI + (k % 2 ? 0.5 : -0.5));
    addLeaf(ctx, 39, ly, 3.6, 1.8, k % 2 ? -0.5 : 0.5);
  }
  ctx.fill();
  ctx.stroke();

  // Cachos de glicínia a balançar (dois tons, dois lotes)
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? '#C9B6F0' : '#9B7FD9';
    ctx.beginPath();
    for (let i = 2; i <= 8; i++) {
      const a = (Math.PI * i) / 10;
      const bx = -Math.cos(a) * 36;
      const by = -8 - Math.sin(a) * 30;
      const sway = reduced ? 0 : Math.sin(t * 1.1 + i * 0.9) * 2.2;
      for (let k = 0; k < 4; k++) {
        if ((k + i) % 2 !== pass) continue;
        const r = 2.7 - k * 0.45;
        const cx = bx + sway * (k / 3);
        const cy = by + 4 + k * 3.6;
        ctx.moveTo(cx + r, cy);
        ctx.arc(cx, cy, r, 0, TAU);
      }
    }
    ctx.fill();
  }

  for (let i = 1; i < 10; i += 2) {
    const a = (Math.PI * i) / 10;
    drawBlossom(ctx, -Math.cos(a) * 36, -8 - Math.sin(a) * 30 - 1, 4.2, BLOOM[(i >> 1) % 5], GOLD);
  }

  ctx.globalAlpha = reduced ? 0.9 : 0.65 + 0.35 * Math.sin(t * 1.6);
  drawGlint(ctx, 0, -42, 9, GOLD);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawRobin(ctx, x, y, t, reduced) {
  const dip = !reduced && Math.sin(t * 2.6) > 0.88 ? 0.9 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 1;
  ctx.strokeStyle = OUTLINE;

  ctx.fillStyle = '#7B5A45';
  ctx.beginPath();
  ctx.moveTo(-3.5, 0);
  ctx.lineTo(-8.5, 2.2);
  ctx.lineTo(-7.5, -0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#9A7658';
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.4, 3.3, -0.1, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#E8714B';
  ctx.beginPath();
  ctx.ellipse(1.6, 0.9, 2.5, 2, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#7B5A45';
  ctx.beginPath();
  ctx.ellipse(-1.2, -0.4, 2.4, 1.3, -0.4, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#9A7658';
  ctx.beginPath();
  ctx.arc(3.6, -2.4 + dip, 2.4, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(5.7, -2.9 + dip);
  ctx.lineTo(8, -2.2 + dip);
  ctx.lineTo(5.7, -1.7 + dip);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#24523F';
  ctx.beginPath();
  ctx.arc(4.4, -3 + dip, 0.55, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* ---------- Tema ---------- */

export const PADRAO_REMASTER_THEME = Object.freeze({
  id: 'padrao_remaster',
  label: 'Padrão Remaster',
  eventPillLabel: 'Padrão Remaster',
  eventPillAriaLabel: 'Ver opções do tema Padrão Remaster',
  eventPillIconMarkup: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="7" r="3.2" fill="#F2A0B5" stroke="#24523F" stroke-width="1.4"/><circle cx="16.8" cy="10.5" r="3.2" fill="#F2A0B5" stroke="#24523F" stroke-width="1.4"/><circle cx="14.9" cy="16" r="3.2" fill="#F2A0B5" stroke="#24523F" stroke-width="1.4"/><circle cx="9.1" cy="16" r="3.2" fill="#F2A0B5" stroke="#24523F" stroke-width="1.4"/><circle cx="7.2" cy="10.5" r="3.2" fill="#F2A0B5" stroke="#24523F" stroke-width="1.4"/><circle cx="12" cy="12.2" r="2.7" fill="#F9C74F" stroke="#24523F" stroke-width="1.2"/><path d="M19.500 1.500L20.300 3.700L22.500 4.500L20.300 5.300L19.500 7.500L18.700 5.300L16.500 4.500L18.700 3.700Z" fill="#F9C74F"/></svg>',
  type: 'permanent',
  paletteAppliesToWorld: true,
  assetPalette: Object.freeze({
    cream: CREAM,
    grassLight: '#A3CF78',
    leafGreen: LEAF,
    pathEarth: '#8E5F3E',
    pathSoil: '#C09060',
    pathSurface: '#E3CB94',
    deepGreen: OUTLINE,
    peonyPink: PINK,
    raspberryPink: '#D6457A',
    sunYellow: GOLD,
    lavender: LILAC,
    earthBrown: '#8A5A38',
    wood: WOOD,
    softBlue: '#9AD7E6',
    plumText: '#3A2447'
  }),
  palette: Object.freeze({
    cream: CREAM,
    grassLight: '#A3CF78',
    leafGreen: LEAF,
    deepGreen: OUTLINE,
    peonyPink: PINK,
    raspberryPink: '#D6457A',
    sunYellow: GOLD,
    lavender: LILAC,
    earthBrown: '#8A5A38',
    wood: WOOD,
    softBlue: '#9AD7E6',
    plumText: '#3A2447',
    stone: '#DCCBAA',
    earthGroove: '#A87648',
    pathEarth: '#8E5F3E',
    pathSoil: '#C09060',
    pathSurface: '#E3CB94',
    terrainPatchLight: 'rgba(255, 246, 214, 0.20)',
    terrainPatchDark: 'rgba(36, 82, 63, 0.10)',
    terrainPatchAccent: 'rgba(249, 199, 79, 0.08)',
    terrainTuft: 'rgba(36, 82, 63, 0.26)',
    minimapGrass: '#A3CF78',
    minimapPath: '#E3CB94',
    minimapShop: WOOD,
    minimapCounter: GOLD,
    minimapPlot: '#8A5A38',
    minimapPlotBorder: OUTLINE,
    minimapPlayer: '#D6457A',
    minimapView: 'rgba(36, 82, 63, 0.8)',
    signWood: '#C99A6B',
    signPaper: '#FBF1D8'
  }),
  cssTokens: Object.freeze({
    '--color-cream': CREAM,
    '--color-grass-light': '#A3CF78',
    '--color-leaf-green': LEAF,
    '--color-deep-green': OUTLINE,
    '--color-peony-pink': PINK,
    '--color-raspberry-pink': '#D6457A',
    '--color-sun-yellow': GOLD,
    '--color-lavender': LILAC,
    '--color-earth-brown': '#8A5A38',
    '--color-wood': WOOD,
    '--color-soft-blue': '#9AD7E6',
    '--color-plum-text': '#3A2447'
  }),
  hudIconMarkup: Object.freeze({
    basket: '<path d="M6 10L4 19C4 20.100 4.900 21 6 21H18C19.100 21 20 20.100 20 19L18 10H6Z" fill="#C48B5A" stroke="#24523F" stroke-width="2" stroke-linejoin="round"/><path d="M5 10H19M8 10C8 6 9.800 4 12 4C14.200 4 16 6 16 10" stroke="#24523F" stroke-width="2" stroke-linecap="round"/><path d="M8 14H16M7.500 17H16.500" stroke="#8A5A38" stroke-width="1.200" stroke-linecap="round"/><circle cx="12" cy="7.500" r="2" fill="#F2A0B5" stroke="#24523F" stroke-width="1"/>'
  }),
  pathColor: '#E3CB94',
  pathEdgeColor: 'rgba(110, 72, 44, 0.22)',
  fenceColor: 'rgba(110, 72, 44, 0.72)',
  awningColors: Object.freeze([PINK, CREAM, '#9AD7E6', GOLD]),

  getTreePalette(x, y) {
    return TREE_PALETTES[Math.abs(Math.floor(x * 13 + y * 7)) % TREE_PALETTES.length];
  },

  // Mantém o matiz de cada flor; só enriquece cor e contorno (resultado em cache)
  resolveFlowerConfig(flowerConfig) {
    if (!flowerConfig || typeof flowerConfig !== 'object') return flowerConfig;
    let resolved = resolvedFlowers.get(flowerConfig);
    if (resolved) return resolved;
    resolved = {
      ...flowerConfig,
      color: enrich(flowerConfig.color, 0.12, 0.025),
      centerColor: enrich(flowerConfig.centerColor, 0.1, 0),
      stemColor: '#3F8A4F',
      outlineColor: OUTLINE
    };
    if (flowerConfig.accent) resolved.accent = enrich(flowerConfig.accent, 0.1, 0.02);
    resolvedFlowers.set(flowerConfig, resolved);
    return resolved;
  },

  /* Camada do chão: relva a baloiçar, trevos em flor e orvalho a cintilar.
     Corre uma vez por frame e fixa o relógio e o retângulo visível do tema. */
  drawGardenLayer(ctx, mapBounds, reduced, gameTime) {
    fx.time = gameTime || 0;
    fx.reduced = reduced === true;
    trackFramePacing();

    const m = ctx.getTransform();
    const view = fx.view;
    view.left = (0 - m.e) / m.a;
    view.right = (ctx.canvas.width - m.e) / m.a;
    view.top = (0 - m.f) / m.d;
    view.bottom = (ctx.canvas.height - m.f) / m.d;

    const step = fx.level === 0 ? 76 : fx.level === 1 ? 108 : 0;
    if (!step) return;

    const left = Math.max(view.left - 20, mapBounds.minX);
    const right = Math.min(view.right + 20, mapBounds.maxX);
    const top = Math.max(view.top - 20, mapBounds.minY);
    const bottom = Math.min(view.bottom + 20, mapBounds.maxY);
    if (right <= left || bottom <= top) return;

    const c0 = Math.floor(left / step);
    const c1 = Math.floor(right / step);
    const r0 = Math.floor(top / step);
    const r1 = Math.floor(bottom / step);
    const t = fx.reduced ? 0 : fx.time;

    ctx.save();
    ctx.lineCap = 'round';

    // 1) Lâminas escuras (um único stroke)
    ctx.strokeStyle = 'rgba(36, 82, 63, 0.30)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        const seed = cx * 91.7 + cy * 47.3;
        if (hash(seed) < 0.25) continue;
        const bx = (cx + hash(seed + 1)) * step;
        const by = (cy + hash(seed + 2)) * step;
        const w = Math.sin(t * 1.3 + seed) * 2.2;
        ctx.moveTo(bx - 3, by);
        ctx.quadraticCurveTo(bx - 3 + w * 0.3, by - 6, bx - 5 + w, by - 11);
        ctx.moveTo(bx + 3, by);
        ctx.quadraticCurveTo(bx + 3 + w * 0.3, by - 6, bx + 5 + w, by - 10);
      }
    }
    ctx.stroke();

    // 2) Lâmina central clara (um único stroke)
    ctx.strokeStyle = 'rgba(185, 224, 138, 0.55)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        const seed = cx * 91.7 + cy * 47.3;
        if (hash(seed) < 0.25) continue;
        const bx = (cx + hash(seed + 1)) * step;
        const by = (cy + hash(seed + 2)) * step;
        const w = Math.sin(t * 1.3 + seed) * 2.2;
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + w * 0.5, by - 8, bx + 1 + w * 1.1, by - 15);
      }
    }
    ctx.stroke();

    // 3) Trevos em flor e orvalho (poucos elementos, individuais)
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        const seed = cx * 91.7 + cy * 47.3;
        const h = hash(seed + 5);
        if (h > 0.93) {
          drawBlossom(
            ctx,
            (cx + hash(seed + 8)) * step,
            (cy + hash(seed + 10)) * step,
            3.1,
            BLOOM[Math.floor(hash(seed + 9) * 5)],
            GOLD
          );
        } else if (h < 0.07 && fx.level === 0) {
          const alpha = fx.reduced
            ? 0.5
            : Math.pow(Math.max(0, Math.sin(fx.time * 2.2 + seed * 1.7)), 3);
          if (alpha < 0.04) continue;
          const sx = (cx + hash(seed + 11)) * step;
          const sy = (cy + hash(seed + 12)) * step;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(sx - 3, sy - 0.5, 6, 1);
          ctx.fillRect(sx - 0.5, sy - 3, 1, 6);
          ctx.beginPath();
          ctx.arc(sx, sy, 1.2, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  },

  /* Luz da manhã: brilho solar, raios entre as copas, pólen no ar.
     À noite o pólen transforma-se em pirilampos. */
  drawAtmosphere(ctx, width, height, lighting) {
    const night = lighting ? lighting.night || 0 : 0;
    const warm = lighting ? Math.max(lighting.sunset || 0, lighting.dawn || 0) : 0;
    const day = 1 - night;
    const t = fx.time;
    const reduced = fx.reduced;

    ensureAtmosphere(ctx, width, height);
    ctx.save();

    ctx.globalAlpha = Math.min(1, day * (0.8 + warm * 0.4));
    ctx.fillStyle = atmosphere.glow;
    ctx.fillRect(0, 0, width, height);

    if (atmosphere.shafts && fx.level < 2 && day > 0.02) {
      const sway = reduced ? 0 : Math.sin(t * 0.22) * 8;
      const breathe = reduced ? 0.55 : 0.5 + 0.14 * Math.sin(t * 0.37);
      ctx.globalAlpha = Math.min(1, breathe * day * (1 + warm * 0.5));
      ctx.drawImage(atmosphere.shafts, sway - 10, 0, width + 20, height);
    }

    if (warm > 0.02) {
      ctx.globalAlpha = warm * 0.5;
      ctx.fillStyle = 'rgba(255, 170, 96, 0.10)';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = atmosphere.vignette;
    ctx.fillRect(0, 0, width, height);

    const count = reduced ? 0 : fx.level === 0 ? 16 : fx.level === 1 ? 8 : 0;
    if (count > 0) {
      const fireflies = night > 0.35;
      for (let i = 0; i < count; i++) {
        const speed = 5 + hash(i + 11) * 9;
        let x = (hash(i) * width + t * speed + Math.sin(t * 0.6 + i) * 14) % width;
        if (x < 0) x += width;
        let y = (hash(i + 5) * height - t * (3 + hash(i + 7) * 5)) % height;
        if (y < 0) y += height;

        if (fireflies) {
          const glow = Math.pow(Math.max(0, Math.sin(t * 1.7 + i * 2.3)), 2);
          ctx.globalAlpha = glow * night * 0.35;
          ctx.fillStyle = '#C9F26B';
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = (0.25 + glow * 0.75) * night;
          ctx.fillStyle = '#EFFFA8';
          ctx.beginPath();
          ctx.arc(x, y, 1.7, 0, TAU);
          ctx.fill();
        } else {
          const drift = 0.5 + 0.5 * Math.sin(t * 0.9 + i);
          ctx.globalAlpha = (0.12 + drift * 0.14) * day;
          ctx.fillStyle = '#FFF1B8';
          ctx.beginPath();
          ctx.arc(x, y, 4.2, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = (0.35 + drift * 0.4) * day;
          ctx.beginPath();
          ctx.arc(x, y, 1.4, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  },

  drawShopDecor(ctx, x, y, width, height) {
    const t = fx.time;
    const reduced = fx.reduced;
    ctx.save();
    drawGarland(ctx, x + 6, x + width - 6, y - 2, 18, t, reduced, 7);
    drawSideVine(ctx, x + 3, y + 2, Math.max(24, height * 0.45), 1, t, reduced);
    drawSideVine(ctx, x + width - 3, y + 2, Math.max(24, height * 0.45), -1, t, reduced);
    ctx.restore();
  },

  drawStockSignDecor(ctx, x, y, width) {
    const t = fx.time;
    const reduced = fx.reduced;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 1);
    for (let i = 1; i <= 10; i++) {
      ctx.lineTo(x + 4 + ((width - 8) * i) / 10, y + 1 + Math.sin(i * 1.9) * 1.6);
    }
    ctx.stroke();

    ctx.fillStyle = LEAF;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const lx = x + 10 + ((width - 20) * i) / 8;
      const side = i % 2 === 0 ? -1 : 1;
      addLeaf(ctx, lx, y + 1 + side * 2.2, 3.4, 1.6, side * 0.6);
    }
    ctx.fill();
    ctx.stroke();

    drawBlossom(ctx, x + width * 0.18, y + 1, 3.4, PINK, GOLD);
    drawBlossom(ctx, x + width * 0.5, y + 1, 3.4, '#FFFDF6', GOLD);
    drawBlossom(ctx, x + width * 0.82, y + 1, 3.4, LILAC, CREAM);

    const flicker = reduced ? 1 : 0.8 + 0.2 * Math.sin(t * 2.4);
    ctx.strokeStyle = 'rgba(36, 82, 63, 0.7)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + width - 8, y + 2);
    ctx.lineTo(x + width - 8, y + 9);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 224, 140, 0.18)';
    ctx.beginPath();
    ctx.arc(x + width - 8, y + 11, 7 * flicker, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#FFE9A0';
    ctx.strokeStyle = OUTLINE;
    ctx.beginPath();
    ctx.arc(x + width - 8, y + 11, 2.5, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },

  drawGardenDecor(ctx, decorations) {
    const t = fx.time;
    const reduced = fx.reduced;
    const view = fx.view;

    if (view.right >= 396 && view.left <= 492 && view.bottom >= 100 && view.top <= 190) {
      drawFloralArch(ctx, 444, 153, t, reduced);
    }

    for (const decor of decorations) {
      switch (decor.type) {
        case 'flowerBed': {
          // Franja de relva na base e brilhos de orvalho sobre as flores
          const sway = reduced ? 0 : Math.sin(t * 1.2 + decor.x * 0.05) * 1.2;
          ctx.save();
          ctx.lineCap = 'round';
          ctx.strokeStyle = LEAF;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (let i = 0; i < 14; i++) {
            const bx = decor.x - 16 + i * 6;
            const lean = (i % 2 ? 1 : -1) * 1.6 + sway;
            ctx.moveTo(bx, decor.y + 20);
            ctx.quadraticCurveTo(bx + lean * 0.4, decor.y + 17, bx + lean, decor.y + 14 - (i % 3));
          }
          ctx.stroke();
          if (!reduced && fx.level < 2) {
            ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2.2 + decor.x);
            drawGlint(ctx, decor.x + 12, decor.y - 6, 7, '#FFFFFF');
            ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2.2 + decor.x + 2.1);
            drawGlint(ctx, decor.x + 52, decor.y - 8, 6, '#FFFFFF');
          }
          ctx.restore();
          break;
        }
        case 'bench': {
          ctx.save();
          const flicker = reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 2 + decor.x * 0.1);
          ctx.fillStyle = 'rgba(255, 224, 140, 0.13)';
          ctx.beginPath();
          ctx.arc(decor.x + 42, decor.y - 9, 12 * flicker, 0, TAU);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 233, 160, 0.26)';
          ctx.beginPath();
          ctx.arc(decor.x + 42, decor.y - 9, 6 * flicker, 0, TAU);
          ctx.fill();

          ctx.fillStyle = PINK;
          ctx.strokeStyle = OUTLINE;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.roundRect(decor.x - 13, decor.y - 13, 26, 7, 3.2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = GOLD;
          ctx.beginPath();
          ctx.arc(decor.x, decor.y - 9.5, 1, 0, TAU);
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'sign': {
          const direction = decor.direction === 'left' ? -1 : 1;
          const postX = decor.x + direction * 10;
          const sway = reduced ? 0 : Math.sin(t * 1.1 + decor.x * 0.04) * 0.8;
          ctx.save();
          ctx.lineCap = 'round';
          ctx.strokeStyle = OUTLINE;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(postX, decor.y + 3);
          ctx.bezierCurveTo(postX + 4, decor.y - 4, postX - 4, decor.y - 10, postX + 1 + sway, decor.y - 19);
          ctx.stroke();
          ctx.fillStyle = LEAF;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          addLeaf(ctx, postX + 4, decor.y - 3, 3.2, 1.6, -0.5);
          addLeaf(ctx, postX - 4, decor.y - 10, 3.2, 1.6, Math.PI + 0.5);
          addLeaf(ctx, postX + 4 + sway, decor.y - 16, 3, 1.5, -0.4);
          ctx.fill();
          ctx.stroke();
          drawBlossom(ctx, postX + 1 + sway, decor.y - 19, 3.2, BLOOM[Math.abs(Math.round(decor.x)) % 5], GOLD);
          ctx.restore();
          break;
        }
        case 'compost': {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineWidth = 1.6;
          for (let i = 0; i < 2; i++) {
            const phase = reduced ? 0.4 : (t * 0.5 + i * 0.5) % 1;
            const wx = decor.x - 5 + i * 10;
            const wy = decor.y - 28 - phase * 12;
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * (1 - phase)})`;
            ctx.beginPath();
            ctx.moveTo(wx, wy + 6);
            ctx.quadraticCurveTo(wx + 4 * Math.sin(phase * 6 + i), wy + 2, wx + 1.5 * Math.sin(phase * 5), wy - 4);
            ctx.stroke();
          }
          ctx.fillStyle = LEAF;
          ctx.strokeStyle = OUTLINE;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          addLeaf(ctx, decor.x + 13, decor.y - 28, 4, 1.8, -0.6);
          addLeaf(ctx, decor.x + 17, decor.y - 26, 3.2, 1.5, 0.3);
          addLeaf(ctx, decor.x - 15, decor.y - 27, 3.4, 1.6, Math.PI + 0.5);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'birdbath': {
          ctx.save();
          const phase = reduced ? 0.4 : (t * 0.55) % 1;
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * (1 - phase)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(decor.x - 2, decor.y - 2, 4 + 12 * phase, 1.4 + 3.3 * phase, 0, 0, TAU);
          ctx.stroke();
          ctx.restore();
          drawRobin(ctx, decor.x + 13, decor.y - 7, t, reduced);
          break;
        }
        default:
          break;
      }
    }
  },

  drawAmbient(ctx, type, x, y, phase, color, reducedEffects) {
    if (type === 'butterfly') {
      if (!reducedEffects && fx.level < 2) {
        // Rasto de purpurina, calculado analiticamente a partir da trajetória
        ctx.fillStyle = GOLD;
        for (let k = 1; k <= 3; k++) {
          const d = k * 0.18;
          const tx = (Math.sin((phase - d) * 0.7) - Math.sin(phase * 0.7)) * 45;
          const ty = (Math.cos((phase - d) * 0.5) - Math.cos(phase * 0.5)) * 35;
          ctx.globalAlpha = 0.4 / k;
          ctx.beginPath();
          ctx.arc(x + tx, y + ty, 1.5 - k * 0.25, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      const flap = reducedEffects ? 0.7 : 0.35 + Math.abs(Math.sin(phase * 1.6)) * 0.65;
      const heading = Math.atan2(-Math.sin(phase * 0.5) * 17.5, Math.cos(phase * 0.7) * 31.5);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(heading * 0.25);

      ctx.save();
      ctx.scale(0.25 + flap * 0.75, 1);
      ctx.fillStyle = color || PINK;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(-5, -2, 5, 5.6, -0.45, 0, TAU);
      ctx.ellipse(5, -2, 5, 5.6, 0.45, 0, TAU);
      ctx.ellipse(-3.6, 3.6, 3.4, 3.8, 0.5, 0, TAU);
      ctx.ellipse(3.6, 3.6, 3.4, 3.8, -0.5, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(-5.6, -3, 1.5, 0, TAU);
      ctx.arc(5.6, -3, 1.5, 0, TAU);
      ctx.moveTo(-2.2, 3.6);
      ctx.arc(-3.6, 3.6, 1.4, 0, TAU);
      ctx.moveTo(5, 3.6);
      ctx.arc(3.6, 3.6, 1.4, 0, TAU);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = OUTLINE;
      ctx.beginPath();
      ctx.ellipse(0, 0.5, 1.1, 4.6, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-0.5, -4);
      ctx.quadraticCurveTo(-1.5, -7, -3, -8.5);
      ctx.moveTo(0.5, -4);
      ctx.quadraticCurveTo(1.5, -7, 3, -8.5);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Abelha
    if (!reducedEffects && fx.level < 2) {
      ctx.fillStyle = GOLD;
      for (let k = 1; k <= 3; k++) {
        const d = k * 0.16;
        const tx = (Math.sin((phase - d) * 1.2) - Math.sin(phase * 1.2)) * 25;
        const ty = (Math.cos((phase - d) * 0.9) - Math.cos(phase * 0.9)) * 20;
        ctx.globalAlpha = 0.45 / k;
        ctx.beginPath();
        ctx.arc(x + tx, y + ty, 1.4 - k * 0.2, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    const heading = Math.atan2(-Math.sin(phase * 0.9) * 18, Math.cos(phase * 1.2) * 30);
    const flick = reducedEffects ? 0.6 : Math.abs(Math.sin(phase * 14));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);

    ctx.fillStyle = 'rgba(220, 245, 255, 0.72)';
    ctx.strokeStyle = 'rgba(36, 82, 63, 0.5)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(-1, -3.2, 3.2 * (0.5 + flick * 0.5), 2, -0.4, 0, TAU);
    ctx.moveTo(-1 + 3.2 * (0.5 + flick * 0.5), 3.2);
    ctx.ellipse(-1, 3.2, 3.2 * (0.5 + flick * 0.5), 2, 0.4, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = GOLD;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.2, 3.4, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3A2447';
    ctx.fillRect(-1.6, -3.1, 1.5, 6.2);
    ctx.fillRect(1.4, -3, 1.5, 6);
    ctx.beginPath();
    ctx.arc(5.3, 0, 2, 0, TAU);
    ctx.fill();
    ctx.restore();
  },

  drawFlowerAccent(ctx, flowerConfig, progress, reducedEffects) {
    if (progress < 0.6) return;
    const r = flowerConfig.radius || 8;
    const id = flowerConfig.id;
    ctx.save();

    if (id === 'rose' || id === 'peony' || id === 'camellia' || id === 'magnolia' || id === 'lotus') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.55, -2.5, -1.3);
      ctx.stroke();
    }

    // Gota de orvalho
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.strokeStyle = 'rgba(36, 82, 63, 0.45)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(r * 0.32, -r * 0.28, r * 0.17, r * 0.21, 0.5, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(r * 0.28, -r * 0.34, r * 0.06, 0, TAU);
    ctx.fill();

    if (!reducedEffects && fx.level < 2 && (id === 'daisy' || id === 'sunflower' || id === 'dahlia' || id === 'chrysanthemum')) {
      ctx.globalAlpha = 0.4 + 0.6 * Math.max(0, Math.sin(fx.time * 2.4 + r));
      drawGlint(ctx, -r * 0.32, -r * 0.36, r * 0.9, '#FFFFFF');
    }
    ctx.restore();
  },

  /* O Florescer: corola de pétalas a girar devagar, halo dourado e pólen a subir.
     Devolve true para substituir o indicador padrão. */
  drawReadyFlower(ctx, x, y, pulse, reducedEffects) {
    const t = fx.time;
    const radius = reducedEffects ? 17 : 17 + pulse * 2.5;
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = 'rgba(255, 226, 140, 0.2)';
    ctx.beginPath();
    ctx.arc(0, 0, radius + 4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 240, 180, 0.22)';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(36, 82, 63, 0.85)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    const scale = radius / 20;
    ctx.save();
    ctx.rotate(reducedEffects ? 0.2 : t * 0.5);
    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(249, 199, 79, 0.92)';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 0.9;
    if (BLOOM_RING_OUTER) {
      ctx.fill(BLOOM_RING_OUTER);
      ctx.stroke(BLOOM_RING_OUTER);
    }
    ctx.rotate(reducedEffects ? 0 : -t);
    ctx.fillStyle = 'rgba(242, 160, 181, 0.95)';
    if (BLOOM_RING_INNER) {
      ctx.fill(BLOOM_RING_INNER);
      ctx.stroke(BLOOM_RING_INNER);
    }
    ctx.restore();

    if (!reducedEffects && fx.level < 2) {
      ctx.fillStyle = '#FFE9A0';
      for (let k = 0; k < 3; k++) {
        const phase = (t * 0.7 + hash(x * 0.13 + k) * 3 + k * 0.33) % 1;
        ctx.globalAlpha = (1 - phase) * 0.9;
        ctx.beginPath();
        ctx.arc(Math.sin(phase * 6 + k * 2) * 7, -phase * 26, 1.4 * (1 - phase * 0.4), 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    return true;
  },

  // Raminho de flores no cabelo
  drawPlayerAccessory(ctx, x, y, bounce, isSeated) {
    ctx.save();
    ctx.translate(x + 10, (isSeated ? -24 : -21) - bounce);
    ctx.fillStyle = LEAF;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    addLeaf(ctx, -4, 1.5, 4, 1.8, -0.6);
    addLeaf(ctx, 4.5, 1.2, 4, 1.8, 0.5);
    ctx.fill();
    ctx.stroke();
    drawBlossom(ctx, -4.8, -2, 2.2, LILAC, CREAM);
    drawBlossom(ctx, -1, -1, 3.2, PINK, GOLD);
    drawBlossom(ctx, 3.2, -2.4, 2.6, '#FFFDF6', GOLD);
    ctx.restore();
  },

  drawCustomerAccessory(ctx, variant, bounce) {
    const side = variant % 2 === 0 ? -7 : 7;
    const kind = variant % 3;
    ctx.save();
    ctx.translate(side, -23 - bounce);
    if (kind === 0) {
      drawBlossom(ctx, 0, 0, 4, BLOOM[variant % 5], GOLD);
    } else if (kind === 1) {
      ctx.fillStyle = LEAF;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      addLeaf(ctx, -2.6, 0.6, 3.6, 1.7, -0.6);
      addLeaf(ctx, 2.6, 0.2, 3.6, 1.7, 0.6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = BLOOM[(variant + 1) % 5];
      ctx.beginPath();
      ctx.arc(0, -2, 1.7, 0, TAU);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = BLOOM[variant % 5];
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-4.4, -2.6);
      ctx.lineTo(-4.4, 2.6);
      ctx.closePath();
      ctx.moveTo(0, 0);
      ctx.lineTo(4.4, -2.6);
      ctx.lineTo(4.4, 2.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = OUTLINE;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
});
