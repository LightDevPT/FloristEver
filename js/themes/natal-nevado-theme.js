/* ==========================================================================
   Tema "Natal Nevado" — FloristEver
   O jardim coberto de neve na noite de Natal: relvado branco arrumado em
   fiadas de montículos, luzinhas a piscar em sequência, azevinho, pinheiros
   carregados de neve, sincelos, flocos a cair e, à noite, aurora boreal.
   Mesma API do PADRAO_REMASTER_THEME / COLOR_FESTIVAL_THEME / HEARTS_GARDEN_THEME.

   Identidade
   - Uma só peça memorável: a "Estrela de Natal". Uma flor pronta a colher
     mostra um floco de neve a girar com uma estrela dourada ao centro e
     faíscas a subir. Tudo o resto fica discreto para não competir com ela.
   - O mapa inteiro fica coberto de neve de forma ordenada: o chão é um
     padrão (pattern) de montículos numa grelha escalonada, sempre com a luz
     a vir de cima à esquerda (brilho em cima, sombra azulada em baixo à
     direita). Os limites do mapa fecham-se com uma fiada de dunas de neve.

   Três modos gráficos (setNatalQuality('low' | 'normal' | 'ultra'))
   - Baixa : chão em padrão de 128 px, ~40 flocos num único lote, luzes sem
             brilho, relvado quase sem adereços. Pensado para telemóveis fracos.
   - Normal: padrão de 256 px com ondulações do vento, brilhos de gelo, 2
             camadas de neve (~120 flocos), raios de sol frios, halos nas
             luzes, sincelos, pinheiros e azevinho no chão.
   - Ultra : padrão a 2x com segunda camada de dunas (quebra a repetição),
             3 camadas de neve (~250 flocos) com flocos próximos a brilhar,
             aurora boreal à noite, gelo nos cantos do ecrã, gotas dos
             sincelos, bengalas doces no chão e partículas extra.

   Otimização (alvo: 60 FPS em qualquer modo)
   - O chão inteiro é UM fillRect com um pattern pré-renderizado: custo
     quase constante, independente do tamanho do mapa.
   - Zero gradientes por frame: brilho, vinheta, raios, aurora e gelo são
     criados uma vez por tamanho de ecrã (e só quando o modo precisa deles).
   - Neve sem estado: posições em Float32Array pré-calculadas; cada camada
     é desenhada com um único path e um único fill (3 fills no Ultra).
   - Formas em Path2D criadas uma vez; lâmpadas desenhadas em lotes por cor.
   - Sem Math.random: variação por hash determinístico (sem cintilação).
   - Rede de segurança adaptativa: se o tempo médio de frame passar de
     ~19,5 ms, o tema desce um degrau (Ultra→Normal→Baixa→Mínimo) e só volta
     a subir depois de um período estável cada vez mais longo.
   - Todas as animações respeitam `reducedEffects` (valores fixos).
   ========================================================================== */

const OUTLINE = '#1B4D3C';
const SNOW = '#F7FBFF';
const SNOW_EDGE = 'rgba(112, 152, 190, 0.55)';
const SNOW_SHADE = 'rgba(118, 158, 205, 0.22)';
const ICE = '#BFE6F5';
const PINE = '#2F7D5A';
const PINE_LIGHT = '#4F9E73';
const RED = '#C8283C';
const GOLD = '#F6C453';
const CREAM = '#FFF6E8';
const WOOD = '#B7835B';
const TAU = Math.PI * 2;

const LIGHT_COLORS = Object.freeze([RED, GOLD, '#5FD38D', '#6FB7FF']);
const ORNAMENTS = Object.freeze([RED, GOLD, '#6FB7FF', '#E58BB0', '#FFFFFF']);

const TREE_PALETTES = Object.freeze([
  Object.freeze({ leafGreen: '#2F7D5A', highlight: '#EAF5FB', deepGreen: OUTLINE }),
  Object.freeze({ leafGreen: '#3A8A66', highlight: '#F7FBFF', deepGreen: OUTLINE }),
  Object.freeze({ leafGreen: '#27695A', highlight: '#DDEFF8', deepGreen: OUTLINE }),
  Object.freeze({ leafGreen: '#4A8F5C', highlight: '#F2F8FC', deepGreen: OUTLINE })
]);

/* ---------- Posição das peças de Natal ao redor do arco (ajusta à vontade) ---------- */
const ARCH_POS = Object.freeze({ x: 444, y: 153 });
const TREE_POS = Object.freeze({ x: 512, y: 176 });
const SNOWMAN_POS = Object.freeze({ x: 378, y: 178 });

/* ==========================================================================
   Qualidade gráfica
   ========================================================================== */

const TIER = Object.freeze({ low: 0, normal: 1, ultra: 2 });
let qualityKey = 'normal';
let qualityTier = 1;

/* Campos de cada perfil
   tier         0 baixa · 1 normal · 2 ultra (-1 = mínimo, só em emergência)
   sparkleStep  grelha (px) dos brilhos de gelo animados no chão; 0 = sem brilhos
   decorStep    grelha (px) dos adereços no chão; 0 = sem adereços
   props        1 azevinho · 2 + pinheirinhos · 3 + bengalas doces
   flakes       camadas de neve [quantidade, raio, velocidade, opacidade, balanço]
   glow         nº de flocos próximos com brilho suave (sprite)
   shafts       raios de sol frios entre as copas
   aurora       aurora boreal (à noite)
   frost        gelo nos cantos do ecrã
   halo         halo de luz nas lâmpadas
   bulbCap      máximo de lâmpadas por fio
   icicleGap    distância entre sincelos (px); 0 = sem sincelos
   drip         gotas a cair dos sincelos
   trail        rasto de purpurina dos voadores
   needles      densidade de folhagem das guirlandas
   ready        0 simples · 1 floco + estrela · 2 completo (órbitas, anel, brilho)
   treeLights   luzes a piscar nas árvores
   baubles      bolas por árvore
   edgePines    espaçamento dos pinheirinhos nos limites do mapa; 0 = sem
   drifts       segunda camada de dunas no chão
   anim         animações secundárias (cachecol, etc.) */
const MINIMAL = Object.freeze({
  tier: -1, sparkleStep: 0, decorStep: 0, props: 0,
  flakes: [[14, 1.5, 30, 0.8, 3]], glow: 0,
  shafts: false, aurora: false, frost: false, halo: false, bulbCap: 4,
  icicleGap: 0, drip: false, trail: false, needles: 0.4, ready: 0,
  treeLights: false, baubles: 3, edgePines: 0, drifts: false, anim: false
});
const LOW = Object.freeze({
  tier: 0, sparkleStep: 0, decorStep: 168, props: 1,
  flakes: [[38, 1.5, 36, 0.85, 5]], glow: 0,
  shafts: false, aurora: false, frost: false, halo: false, bulbCap: 5,
  icicleGap: 22, drip: false, trail: false, needles: 0.6, ready: 0,
  treeLights: false, baubles: 4, edgePines: 0, drifts: false, anim: false
});
const NORMAL = Object.freeze({
  tier: 1, sparkleStep: 100, decorStep: 112, props: 2,
  flakes: [[46, 1.2, 26, 0.55, 5], [72, 1.9, 46, 0.9, 9]], glow: 0,
  shafts: true, aurora: false, frost: false, halo: true, bulbCap: 7,
  icicleGap: 15, drip: false, trail: true, needles: 1, ready: 1,
  treeLights: true, baubles: 8, edgePines: 128, drifts: false, anim: true
});
const ULTRA = Object.freeze({
  tier: 2, sparkleStep: 76, decorStep: 84, props: 3,
  flakes: [[80, 1.1, 24, 0.5, 6], [120, 1.8, 42, 0.85, 10], [56, 2.8, 64, 0.95, 14]], glow: 16,
  shafts: true, aurora: true, frost: true, halo: true, bulbCap: 9,
  icicleGap: 11, drip: true, trail: true, needles: 1.4, ready: 2,
  treeLights: true, baubles: 10, edgePines: 90, drifts: true, anim: true
});
const EFFECTIVE = Object.freeze([MINIMAL, LOW, NORMAL, ULTRA]);

// Configuração do chão por modo escolhido (não muda com a rede de segurança)
const SNOW_TILE_CFG = Object.freeze([
  Object.freeze({ size: 128, res: 1, detail: 0, drifts: false }),
  Object.freeze({ size: 256, res: 1, detail: 1, drifts: false }),
  Object.freeze({ size: 256, res: 2, detail: 2, drifts: true })
]);

/* ---------- Estado partilhado do tema ---------- */
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

// Perfil efetivo: o modo escolhido menos o degrau da rede de segurança
function cur() {
  return EFFECTIVE[Math.max(0, qualityTier + 1 - fx.level)];
}

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

  if (fx.slow > 45 && fx.level < 3) {
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

// Enriquecimento de cor (HSL), com cache
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

// Elipse num lote: moveTo evita a linha de ligação
function addLeaf(ctx, cx, cy, rx, ry, rotation) {
  ctx.moveTo(cx + Math.cos(rotation) * rx, cy + Math.sin(rotation) * rx);
  ctx.ellipse(cx, cy, rx, ry, rotation, 0, TAU);
}

function fillEllipse(ctx, x, y, rx, ry, rot) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
  ctx.fill();
}

/* ---------- Formas pré-computadas ---------- */

const HAS_PATH2D = typeof Path2D !== 'undefined';

// Brilho de 4 pontas (escala = size / 16)
const STAR_PATH = HAS_PATH2D
  ? new Path2D('M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z')
  : null;

// Arco de entrada: postes + curva
const ARCH_PATH = HAS_PATH2D
  ? new Path2D('M-36 24 L-36 -8 Q-36 -38 0 -38 Q36 -38 36 -8 L36 24')
  : null;

// Bengala doce (base em 0,0; gancho no topo)
const CANE_PATH = HAS_PATH2D
  ? new Path2D('M0 0 L0 -13 Q0 -19 -4.5 -19 Q-8.5 -19 -8.5 -14.5')
  : null;

// Estrela de 5 pontas (raio 1)
const STAR5_POINTS = (() => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 1 : 0.46;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
})();
const STAR5_PATH = HAS_PATH2D
  ? (() => {
      const p = new Path2D();
      STAR5_POINTS.forEach(([px, py], i) => (i ? p.lineTo(px, py) : p.moveTo(px, py)));
      p.closePath();
      return p;
    })()
  : null;

// Floco de neve de 6 braços (raio 20)
const FLAKE_SEGS = (() => {
  const segs = [];
  for (let a = 0; a < 6; a++) {
    const ang = (a * Math.PI) / 3 - Math.PI / 2;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const px = -s;
    const py = c;
    segs.push([0, 0, c * 20, s * 20]);
    [[8, 6], [13.5, 4.2]].forEach(([d, l]) => {
      const bx = c * d;
      const by = s * d;
      segs.push([bx, by, bx + (c * 0.7 + px * 0.7) * l, by + (s * 0.7 + py * 0.7) * l]);
      segs.push([bx, by, bx + (c * 0.7 - px * 0.7) * l, by + (s * 0.7 - py * 0.7) * l]);
    });
  }
  return segs;
})();
const FLAKE_PATH = HAS_PATH2D
  ? (() => {
      const p = new Path2D();
      FLAKE_SEGS.forEach((s) => {
        p.moveTo(s[0], s[1]);
        p.lineTo(s[2], s[3]);
      });
      return p;
    })()
  : null;

const EMPTY_DASH = [];
const CANE_DASH = [2.4, 2.4];
const ARCH_SNOW_DASH = [9, 6];

function strokeSnowflake(ctx) {
  if (FLAKE_PATH) {
    ctx.stroke(FLAKE_PATH);
    return;
  }
  ctx.beginPath();
  for (const s of FLAKE_SEGS) {
    ctx.moveTo(s[0], s[1]);
    ctx.lineTo(s[2], s[3]);
  }
  ctx.stroke();
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

function strokeCanePath(ctx) {
  if (CANE_PATH) {
    ctx.stroke(CANE_PATH);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -13);
  ctx.quadraticCurveTo(0, -19, -4.5, -19);
  ctx.quadraticCurveTo(-8.5, -19, -8.5, -14.5);
  ctx.stroke();
}

function paintGlint(ctx, x, y, size, fill) {
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

// Estrela de 5 pontas com contorno opcional
function drawStar5(ctx, x, y, r, rot, fill, outlined) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(r, r);
  ctx.fillStyle = fill;
  if (STAR5_PATH) {
    ctx.fill(STAR5_PATH);
    if (outlined) {
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1 / r;
      ctx.lineJoin = 'round';
      ctx.stroke(STAR5_PATH);
    }
  } else {
    ctx.beginPath();
    STAR5_POINTS.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fill();
    if (outlined) {
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1 / r;
      ctx.stroke();
    }
  }
  ctx.restore();
}


/* ==========================================================================
   Sprites: peças estáticas desenhadas UMA vez num canvas pequeno (2x) e depois
   só drawImage (1 chamada em vez de 10-20). Nenhuma delas depende do tempo.
   ========================================================================== */
const SPR_RES = 2;
const spriteCache = new Map();

function makeSprite(key, l, t, r, b, paint) {
  let s = spriteCache.get(key);
  if (s) return s;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil((r - l) * SPR_RES);
  canvas.height = Math.ceil((b - t) * SPR_RES);
  const g = canvas.getContext('2d');
  if (!g) return null;
  g.scale(SPR_RES, SPR_RES);
  g.translate(-l, -t);
  paint(g);
  s = { canvas, l, t, w: r - l, h: b - t };
  spriteCache.set(key, s);
  return s;
}

function blit(ctx, s, x, y, k) {
  ctx.drawImage(s.canvas, x + s.l * k, y + s.t * k, s.w * k, s.h * k);
}

function drawGlint(ctx, x, y, size, fill) {
  const sp = makeSprite('glint|' + fill, -9, -9, 9, 9, (g) => paintGlint(g, 0, 0, 16, fill));
  if (sp) blit(ctx, sp, x, y, size / 16);
  else paintGlint(ctx, x, y, size, fill);
}

function drawBow(ctx, x, y, s, color) {
  const sp = makeSprite('bow|' + color, -10, -8, 10, 10, (g) => paintBow(g, 0, 0, 1, color));
  if (sp) blit(ctx, sp, x, y, s);
  else paintBow(ctx, x, y, s, color);
}

function drawHolly(ctx, x, y, s) {
  const sp = makeSprite('holly', -11, -9, 11, 6, (g) => paintHolly(g, 0, 0, 1));
  if (sp) blit(ctx, sp, x, y, s);
  else paintHolly(ctx, x, y, s);
}

function drawMiniPine(ctx, x, y, s) {
  const sp = makeSprite('pine', -11, -31, 12, 6, (g) => paintMiniPine(g, 0, 0, 1));
  if (sp) blit(ctx, sp, x, y, s);
  else paintMiniPine(ctx, x, y, s);
}

function drawCane(ctx, x, y, s, rot) {
  const sp = makeSprite('cane', -14, -23, 5, 4, (g) => paintCane(g, 0, 0, 1, 0));
  if (!sp) return paintCane(ctx, x, y, s, rot);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  blit(ctx, sp, 0, 0, s);
  ctx.restore();
}

function drawGift(ctx, x, y, s, body, ribbon) {
  const sp = makeSprite('gift|' + body + '|' + ribbon, -9, -17, 11, 5, (g) => paintGift(g, 0, 0, 1, body, ribbon));
  if (sp) blit(ctx, sp, x, y, s);
  else paintGift(ctx, x, y, s, body, ribbon);
}

// Floco de neve com contorno (raio 20), usado pela flor pronta e pela "borboleta"
function getFlakeSprite(key, outlineW, innerW, innerColor) {
  return makeSprite('flake|' + key, -26, -26, 26, 26, (g) => {
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = OUTLINE;
    g.lineWidth = outlineW;
    strokeSnowflake(g);
    g.strokeStyle = innerColor;
    g.lineWidth = innerW;
    strokeSnowflake(g);
  });
}

// Brilho de gelo no chão (cruz + ponto)
function drawSparkle(ctx, x, y) {
  const sp = makeSprite('sparkle', -4, -4, 4, 4, (g) => {
    g.fillStyle = '#FFFFFF';
    g.fillRect(-3, -0.5, 6, 1);
    g.fillRect(-0.5, -3, 1, 6);
    g.beginPath();
    g.arc(0, 0, 1.2, 0, TAU);
    g.fill();
  });
  if (sp) {
    blit(ctx, sp, x, y, 1);
  } else {
    ctx.fillRect(x - 3, y - 0.5, 6, 1);
    ctx.fillRect(x - 0.5, y - 3, 1, 6);
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, TAU);
    ctx.fill();
  }
}

// Tampa de neve nas pétalas (depende só do raio da flor)
function paintFlowerCap(g, r) {
  g.fillStyle = 'rgba(255, 255, 255, 0.92)';
  g.strokeStyle = 'rgba(112, 152, 190, 0.5)';
  g.lineWidth = 0.6;
  g.beginPath();
  g.ellipse(-r * 0.1, -r * 0.62, r * 0.55, r * 0.22, -0.15, 0, TAU);
  g.ellipse(r * 0.38, -r * 0.4, r * 0.22, r * 0.12, 0.5, 0, TAU);
  g.fill();
  g.stroke();
}

/* ==========================================================================
   Caches (criados uma vez; refeitos só quando o modo ou o ecrã mudam)
   ========================================================================== */

// ----- Neve do chão -----

function forEachWrap(size, x, y, rx, ry, fn) {
  for (let oy = -1; oy <= 1; oy++) {
    const cy = y + oy * size;
    if (cy + ry < 0 || cy - ry > size) continue;
    for (let ox = -1; ox <= 1; ox++) {
      const cx = x + ox * size;
      if (cx + rx < 0 || cx - rx > size) continue;
      fn(cx, cy);
    }
  }
}

// Montículos numa grelha escalonada: luz em cima à esquerda, sombra em baixo à direita
function buildSnowTile(size, res, detail) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.round(size * res);
  const g = canvas.getContext('2d');
  if (!g) return null;
  g.scale(res, res);

  const cols = Math.max(2, Math.round(size / 64));
  const cell = size / cols;

  for (let j = 0; j < cols; j++) {
    for (let i = 0; i < cols; i++) {
      const seed = i * 13.7 + j * 29.3 + size;
      const x = (i + (j % 2 ? 0.5 : 0) + 0.5) * cell + (hash(seed) - 0.5) * cell * 0.14;
      const y = (j + 0.5) * cell + (hash(seed + 1) - 0.5) * cell * 0.14;
      const rx = cell * (0.36 + 0.12 * hash(seed + 2));
      const ry = rx * 0.4;

      forEachWrap(size, x, y, rx + 3, ry + 4, (cx, cy) => {
        g.fillStyle = SNOW_SHADE;
        fillEllipse(g, cx + 2, cy + ry * 0.5, rx * 1.02, ry * 0.95);
        g.fillStyle = 'rgba(255, 255, 255, 0.62)';
        fillEllipse(g, cx, cy, rx, ry);
        g.fillStyle = 'rgba(255, 255, 255, 0.85)';
        fillEllipse(g, cx - rx * 0.2, cy - ry * 0.3, rx * 0.55, ry * 0.45);

        if (detail >= 1) {
          // Ondulações do vento entre os montículos
          g.strokeStyle = 'rgba(125, 165, 210, 0.20)';
          g.lineWidth = 1;
          g.beginPath();
          g.arc(cx + cell * 0.5, cy + cell * 0.5 + 6, 10, Math.PI * 1.15, Math.PI * 1.85);
          g.moveTo(cx + cell * 0.5 + 9, cy + cell * 0.5 + 11);
          g.arc(cx + cell * 0.5 + 3, cy + cell * 0.5 + 11, 6, Math.PI * 1.2, Math.PI * 1.8);
          g.stroke();
        }
      });
    }
  }

  if (detail >= 2) {
    // Granulado de cristais
    g.fillStyle = 'rgba(255, 255, 255, 0.95)';
    for (let k = 0; k < 70; k++) {
      g.fillRect(hash(k * 1.7) * size, hash(k * 2.9 + 3) * size, 1, 1);
    }
    g.fillStyle = 'rgba(150, 190, 230, 0.5)';
    for (let k = 0; k < 40; k++) {
      g.fillRect(hash(k * 3.1 + 8) * size, hash(k * 1.3 + 5) * size, 1, 1);
    }
  }
  return canvas;
}

// Dunas largas e suaves (só Ultra): quebram a repetição do padrão pequeno
function buildDriftTile(size) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) return null;

  const cols = 3;
  const cell = size / cols;
  for (let j = 0; j < cols; j++) {
    for (let i = 0; i < cols; i++) {
      const seed = i * 7.9 + j * 19.1 + 3;
      const x = (i + (j % 2 ? 0.5 : 0) + 0.5) * cell;
      const y = (j + 0.5) * cell;
      const rx = cell * (0.5 + 0.12 * hash(seed));
      const ry = rx * 0.34;
      forEachWrap(size, x, y, rx, ry, (cx, cy) => {
        g.save();
        g.translate(cx, cy);
        g.scale(1, ry / rx);
        const light = g.createRadialGradient(-rx * 0.2, -rx * 0.25, 0, 0, 0, rx);
        light.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
        light.addColorStop(0.6, 'rgba(255, 255, 255, 0.18)');
        light.addColorStop(1, 'rgba(255, 255, 255, 0)');
        g.fillStyle = light;
        g.beginPath();
        g.arc(0, 0, rx, 0, TAU);
        g.fill();
        const shade = g.createRadialGradient(rx * 0.25, rx * 0.35, 0, rx * 0.25, rx * 0.35, rx * 0.9);
        shade.addColorStop(0, 'rgba(110, 150, 200, 0.16)');
        shade.addColorStop(1, 'rgba(110, 150, 200, 0)');
        g.fillStyle = shade;
        g.beginPath();
        g.arc(0, 0, rx, 0, TAU);
        g.fill();
        g.restore();
      });
    }
  }
  return canvas;
}

function makePattern(ctx, canvas, res) {
  if (!canvas) return null;
  const pattern = ctx.createPattern(canvas, 'repeat');
  if (pattern && res !== 1 && typeof DOMMatrix !== 'undefined' && pattern.setTransform) {
    try {
      pattern.setTransform(new DOMMatrix([1 / res, 0, 0, 1 / res, 0, 0]));
    } catch (e) {
      /* sem suporte: fica com a escala original */
    }
  }
  return pattern;
}

const snowCache = { tier: -1, a: null, b: null };

function getSnowPatterns(ctx) {
  if (snowCache.tier === qualityTier && snowCache.a) return snowCache;
  const cfg = SNOW_TILE_CFG[qualityTier];
  snowCache.tier = qualityTier;
  snowCache.a = makePattern(ctx, buildSnowTile(cfg.size, cfg.res, cfg.detail), cfg.res);
  snowCache.b = cfg.drifts ? makePattern(ctx, buildDriftTile(347), 1) : null;
  return snowCache;
}

// ----- Sprite de brilho suave (flocos próximos, flor pronta) -----

let glowSprite = null;

function getGlowSprite() {
  if (glowSprite || typeof document === 'undefined') return glowSprite;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const g = canvas.getContext('2d');
  if (!g) return null;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.35, 'rgba(210, 236, 255, 0.45)');
  grad.addColorStop(1, 'rgba(210, 236, 255, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  glowSprite = canvas;
  return glowSprite;
}

// ----- Neve que cai (posições base pré-calculadas) -----

const FLAKE_MAX = 400;
const flakeX = new Float32Array(FLAKE_MAX);
const flakeY = new Float32Array(FLAKE_MAX);
const flakeV = new Float32Array(FLAKE_MAX);
const flakePh = new Float32Array(FLAKE_MAX);
const flakeDr = new Float32Array(FLAKE_MAX);
for (let i = 0; i < FLAKE_MAX; i++) {
  flakeX[i] = hash(i * 1.37);
  flakeY[i] = hash(i * 2.11 + 9);
  flakeV[i] = 0.7 + 0.6 * hash(i * 3.3 + 4);
  flakePh[i] = hash(i * 5.7 + 2) * TAU;
  flakeDr[i] = 0.5 + hash(i * 7.1 + 1);
}
const fp = { x: 0, y: 0 };

function flakePos(k, w, h, t, vy, sway, gust) {
  fp.y = (flakeY[k] * h + t * vy * flakeV[k]) % h;
  const x = (flakeX[k] * w + (t * 7 + gust) * flakeDr[k] + Math.sin(t * 0.9 + flakePh[k]) * sway) % w;
  fp.x = x < 0 ? x + w : x;
}

function drawSnowfall(ctx, w, h, t, P, night) {
  const reduced = fx.reduced;
  const gust = reduced ? 0 : Math.sin(t * 0.11) * 55 + Math.sin(t * 0.037) * 30;
  ctx.fillStyle = night > 0.5 ? '#DCE8FF' : '#FFFFFF';

  let idx = 0;
  let lastStart = 0;
  let lastVy = 0;
  let lastSway = 0;
  const layers = P.flakes;
  for (let L = 0; L < layers.length; L++) {
    const layer = layers[L];
    const n = reduced ? Math.min(layer[0], 24) : layer[0];
    const r = layer[1];
    const vy = layer[2];
    const sway = layer[4];
    ctx.globalAlpha = layer[3];
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      flakePos(idx + i, w, h, t, vy, sway, gust);
      ctx.moveTo(fp.x + r, fp.y);
      ctx.arc(fp.x, fp.y, r, 0, TAU);
    }
    ctx.fill();
    lastStart = idx;
    lastVy = vy;
    lastSway = sway;
    idx += layer[0];
  }

  // Flocos próximos com brilho suave (Ultra)
  if (P.glow > 0 && !reduced) {
    const sprite = getGlowSprite();
    if (sprite) {
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < P.glow; i++) {
        flakePos(lastStart + i, w, h, t, lastVy, lastSway, gust);
        ctx.drawImage(sprite, fp.x - 11, fp.y - 11, 22, 22);
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ----- Atmosfera -----

const atmosphere = { w: 0, h: 0, glow: null, vignette: null, shafts: null, aurora: null, frost: null };

function buildShafts(w, h, tier) {
  if (typeof document === 'undefined') return null;
  const sw = Math.max(2, Math.ceil(w / 2));
  const sh = Math.max(2, Math.ceil(h / 2));
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const g = canvas.getContext('2d');
  if (!g) return null;
  const fade = g.createLinearGradient(0, 0, sw * 0.3, sh);
  fade.addColorStop(0, 'rgba(232, 244, 255, 0.5)');
  fade.addColorStop(0.6, 'rgba(232, 244, 255, 0.14)');
  fade.addColorStop(1, 'rgba(232, 244, 255, 0)');
  g.fillStyle = fade;
  const bands = tier >= 2
    ? [[0.0, 0.05], [0.09, 0.15], [0.2, 0.25], [0.31, 0.4], [0.47, 0.5], [0.58, 0.66]]
    : [[0.02, 0.09], [0.15, 0.2], [0.29, 0.37], [0.47, 0.51]];
  for (const [a, b] of bands) {
    g.beginPath();
    g.moveTo(sw * a, -2);
    g.lineTo(sw * b, -2);
    g.lineTo(sw * (b + 0.55), sh);
    g.lineTo(sw * (a + 0.55), sh);
    g.closePath();
    g.fill();
  }
  return canvas;
}

function buildAurora(w, h) {
  if (typeof document === 'undefined') return null;
  const aw = Math.max(2, Math.ceil(w / 3));
  const ah = Math.max(2, Math.ceil((h * 0.5) / 3));
  const canvas = document.createElement('canvas');
  canvas.width = aw;
  canvas.height = ah;
  const g = canvas.getContext('2d');
  if (!g) return null;

  const ribbons = [
    { color: '92, 242, 176', base: 0.28, amp: 0.1, freq: 0.045, phase: 0.4, band: 0.36 },
    { color: '122, 166, 255', base: 0.38, amp: 0.08, freq: 0.06, phase: 2.1, band: 0.3 },
    { color: '197, 139, 255', base: 0.24, amp: 0.07, freq: 0.038, phase: 4.2, band: 0.26 }
  ];
  for (const rb of ribbons) {
    const base = ah * rb.base;
    const amp = ah * rb.amp;
    const band = ah * rb.band;
    const grad = g.createLinearGradient(0, base - amp, 0, base + band + amp);
    grad.addColorStop(0, `rgba(${rb.color}, 0)`);
    grad.addColorStop(0.35, `rgba(${rb.color}, 0.55)`);
    grad.addColorStop(1, `rgba(${rb.color}, 0)`);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, base);
    for (let x = 0; x <= aw; x += 6) {
      g.lineTo(x, base + Math.sin(x * rb.freq + rb.phase) * amp);
    }
    for (let x = aw; x >= 0; x -= 6) {
      g.lineTo(x, base + band + Math.sin(x * rb.freq * 0.8 + rb.phase + 1) * amp);
    }
    g.closePath();
    g.fill();
  }
  return canvas;
}

// Camadas suaves a 1/4 da resolução: um drawImage ampliado custa menos do que
// avaliar um gradiente em ecrã inteiro todos os frames.
const ATM_K = 4;

function atmCanvas(w, h) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.ceil(w / ATM_K));
  canvas.height = Math.max(2, Math.ceil(h / ATM_K));
  const g = canvas.getContext('2d');
  return g ? { canvas, g } : null;
}

function buildGlowLayer(w, h) {
  const c = atmCanvas(w, h);
  if (!c) return null;
  const { canvas, g } = c;
  const cw = canvas.width;
  const ch = canvas.height;
  g.fillStyle = 'rgba(210, 230, 255, 0.07)';
  g.fillRect(0, 0, cw, ch);
  const glow = g.createRadialGradient(cw * 0.12, -ch * 0.05, 0, cw * 0.12, -ch * 0.05, Math.max(cw, ch) * 0.95);
  glow.addColorStop(0, 'rgba(255, 240, 205, 0.30)');
  glow.addColorStop(0.45, 'rgba(255, 244, 220, 0.09)');
  glow.addColorStop(1, 'rgba(255, 244, 220, 0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, cw, ch);
  return canvas;
}

function buildVignetteLayer(w, h) {
  const c = atmCanvas(w, h);
  if (!c) return null;
  const { canvas, g } = c;
  const cw = canvas.width;
  const ch = canvas.height;
  const v = g.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.max(cw, ch) * 0.78);
  v.addColorStop(0, 'rgba(40, 70, 120, 0)');
  v.addColorStop(1, 'rgba(40, 70, 120, 0.18)');
  g.fillStyle = v;
  g.fillRect(0, 0, cw, ch);
  return canvas;
}

function buildFrost(w, h) {
  const c = atmCanvas(w, h);
  if (!c) return null;
  const { canvas, g } = c;
  const cw = canvas.width;
  const ch = canvas.height;
  const r = Math.min(cw, ch) * 0.3;
  for (const [cx, cy] of [[0, 0], [cw, 0], [0, ch], [cw, ch]]) {
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, 'rgba(225, 242, 255, 0.42)');
    gr.addColorStop(0.55, 'rgba(225, 242, 255, 0.14)');
    gr.addColorStop(1, 'rgba(225, 242, 255, 0)');
    g.fillStyle = gr;
    g.fillRect(cx === 0 ? 0 : cw - r, cy === 0 ? 0 : ch - r, r, r);
  }
  return canvas;
}

function ensureAtmosphere(ctx, w, h, P) {
  if (atmosphere.w !== w || atmosphere.h !== h || !atmosphere.glow) {
    atmosphere.w = w;
    atmosphere.h = h;

    atmosphere.glow = buildGlowLayer(w, h);
    atmosphere.vignette = buildVignetteLayer(w, h);

    atmosphere.shafts = null;
    atmosphere.aurora = null;
    atmosphere.frost = null;
  }
  if (P.shafts && !atmosphere.shafts) atmosphere.shafts = buildShafts(w, h, P.tier);
  if (P.aurora && !atmosphere.aurora) atmosphere.aurora = buildAurora(w, h);
  if (P.frost && !atmosphere.frost) atmosphere.frost = buildFrost(w, h);
}

function invalidateCaches() {
  snowCache.tier = -1;
  snowCache.a = null;
  snowCache.b = null;
  atmosphere.w = 0;
  atmosphere.h = 0;
  atmosphere.glow = null;
}

/* ==========================================================================
   Peças decorativas
   ========================================================================== */

// Laço de fita
function paintBow(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  addLeaf(ctx, -3.6, -0.6, 3.6, 2.4, -0.45);
  addLeaf(ctx, 3.6, -0.6, 3.6, 2.4, 0.45);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-1, 1);
  ctx.lineTo(-4.2, 6.4);
  ctx.lineTo(-1.2, 5);
  ctx.closePath();
  ctx.moveTo(1, 1);
  ctx.lineTo(4.2, 6.4);
  ctx.lineTo(1.2, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -0.2, 1.5, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Azevinho: duas folhas e três bagas
function paintHolly(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = PINE;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  addLeaf(ctx, -3.6, 0.6, 4.4, 2, -0.5);
  addLeaf(ctx, 3.6, 0.6, 4.4, 2, Math.PI + 0.5);
  addLeaf(ctx, 0, -2.4, 4, 1.8, -Math.PI / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = RED;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const bx = (i - 1) * 2.2;
    const by = i === 1 ? -0.4 : 0.8;
    ctx.moveTo(bx + 1.5, by);
    ctx.arc(bx, by, 1.5, 0, TAU);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillRect(-2.9, 0, 0.7, 0.7);
  ctx.fillRect(-0.7, -1.2, 0.7, 0.7);
  ctx.fillRect(1.5, 0, 0.7, 0.7);
  ctx.restore();
}

// Pinheirinho com neve
function paintMiniPine(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(90, 130, 170, 0.25)';
  fillEllipse(ctx, 2, 1, 8, 2.6);
  ctx.fillStyle = WOOD;
  ctx.fillRect(-1.5, -3, 3, 4);

  ctx.fillStyle = PINE;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.9;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, -3); ctx.lineTo(0, -15); ctx.lineTo(8, -3); ctx.closePath();
  ctx.moveTo(-6.5, -11); ctx.lineTo(0, -22); ctx.lineTo(6.5, -11); ctx.closePath();
  ctx.moveTo(-5, -18); ctx.lineTo(0, -28); ctx.lineTo(5, -18); ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = SNOW;
  ctx.beginPath();
  ctx.moveTo(0, -15); ctx.lineTo(-3.4, -10); ctx.lineTo(-1, -11.4); ctx.lineTo(1.4, -10); ctx.lineTo(3.4, -10.2); ctx.closePath();
  ctx.moveTo(0, -22); ctx.lineTo(-3, -17.4); ctx.lineTo(-0.8, -18.6); ctx.lineTo(1.2, -17.2); ctx.lineTo(3, -17.6); ctx.closePath();
  ctx.moveTo(0, -28); ctx.lineTo(-2.4, -23.8); ctx.lineTo(0, -24.8); ctx.lineTo(2.4, -23.8); ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Bengala doce
function paintCane(ctx, x, y, s, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 5.2;
  strokeCanePath(ctx);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 3.2;
  strokeCanePath(ctx);
  ctx.strokeStyle = '#FFFFFF';
  ctx.setLineDash(CANE_DASH);
  strokeCanePath(ctx);
  ctx.setLineDash(EMPTY_DASH);
  ctx.restore();
}

// Prenda embrulhada com neve em cima
function paintGift(ctx, x, y, s, body, ribbon) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(90, 130, 170, 0.25)';
  fillEllipse(ctx, 2, 1, 8, 2.2);
  ctx.fillStyle = body;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.9;
  ctx.fillRect(-6, -9, 12, 9);
  ctx.strokeRect(-6, -9, 12, 9);
  ctx.fillRect(-7, -11.8, 14, 3.2);
  ctx.strokeRect(-7, -11.8, 14, 3.2);
  ctx.fillStyle = ribbon;
  ctx.fillRect(-1.2, -11.8, 2.4, 11.8);
  ctx.beginPath();
  addLeaf(ctx, -2.6, -13.2, 2.6, 1.6, -0.5);
  addLeaf(ctx, 2.6, -13.2, 2.6, 1.6, Math.PI + 0.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = SNOW;
  fillEllipse(ctx, -0.5, -12.2, 5.4, 1.5);
  ctx.restore();
}

// Chapéu de Pai Natal (ancorado na base, a pender para a direita)
function drawSantaHat(ctx, x, y, s, tilt) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(s, s);
  ctx.fillStyle = RED;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-6.5, 0);
  ctx.quadraticCurveTo(-5.5, -10, 1, -12);
  ctx.quadraticCurveTo(6, -13, 8, -7);
  ctx.quadraticCurveTo(5, -8, 6.5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  fillEllipse(ctx, 0, 0.2, 7.6, 2.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(8, -7, 2.3, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Boneco de neve (cachecol a abanar)
function drawSnowman(ctx, x, y, s, t, P) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.fillStyle = 'rgba(90, 130, 170, 0.25)';
  fillEllipse(ctx, 3, 1, 14, 4);

  // Braços
  ctx.strokeStyle = '#6B4A33';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-6, -22); ctx.lineTo(-16, -28);
  ctx.moveTo(-12, -25.6); ctx.lineTo(-14, -31);
  ctx.moveTo(6, -22); ctx.lineTo(15, -17);
  ctx.moveTo(11, -19.4); ctx.lineTo(15, -22);
  ctx.stroke();

  // Corpo: três esferas
  ctx.fillStyle = SNOW;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  const balls = [[0, -9, 9], [0, -22, 7], [0, -32, 5.2]];
  for (const [bx, by, br] of balls) {
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120, 160, 200, 0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(bx, by, br - 1.2, 0.2, 1.6);
    ctx.stroke();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1;
  }

  // Botões, olhos, nariz e sorriso
  ctx.fillStyle = '#2A2540';
  ctx.beginPath();
  ctx.arc(0, -24, 0.9, 0, TAU);
  ctx.arc(0, -20.5, 0.9, 0, TAU);
  ctx.arc(0, -10, 1, 0, TAU);
  ctx.arc(0, -6, 1, 0, TAU);
  ctx.arc(-1.9, -33.2, 0.8, 0, TAU);
  ctx.arc(1.9, -33.2, 0.8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#F28C28';
  ctx.beginPath();
  ctx.moveTo(0.4, -32); ctx.lineTo(5.4, -31.2); ctx.lineTo(0.4, -30.4); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2A2540';
  ctx.beginPath();
  ctx.arc(-1.8, -29.6, 0.45, 0, TAU);
  ctx.arc(0, -29, 0.45, 0, TAU);
  ctx.arc(1.8, -29.6, 0.45, 0, TAU);
  ctx.fill();

  // Cachecol verde com cauda a abanar
  const wave = P.anim && !fx.reduced ? Math.sin(t * 2.2) * 0.25 : 0;
  ctx.fillStyle = '#2F9E62';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.9;
  ctx.fillRect(-6.4, -28, 12.8, 3.4);
  ctx.strokeRect(-6.4, -28, 12.8, 3.4);
  ctx.beginPath();
  ctx.moveTo(3, -25);
  ctx.quadraticCurveTo(7 + wave * 8, -21, 6 + wave * 12, -15);
  ctx.lineTo(2.6 + wave * 12, -15.4);
  ctx.quadraticCurveTo(3.4 + wave * 8, -20, 0.8, -24.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = RED;
  ctx.fillRect(-3.6, -28, 1.3, 3.4);
  ctx.fillRect(0.6, -28, 1.3, 3.4);

  drawSantaHat(ctx, -0.6, -35.8, 0.78, -0.12);
  ctx.restore();
}

// Árvore de Natal: bolas, luzes, grinalda e estrela
const TREE_BAUBLES = Object.freeze([
  [-8, -9], [6, -10], [0, -14], [-6, -21], [5, -22], [-4, -32], [3, -33], [-1.5, -41], [2.5, -44], [-11, -6]
]);
const TREE_LIGHTS = Object.freeze([
  [-10, -7], [-3, -11], [9, -8], [-8, -19], [1, -24], [8, -20], [-5, -30], [6, -31], [0, -38], [-3, -46], [4, -41], [-12, -5]
]);
const BULB_X = new Float32Array(32);
const BULB_Y = new Float32Array(32);

// Lâmpadas em lote: 4 cores, piscam em sequência
function flushBulbs(ctx, count, t, P, coreR) {
  const n = Math.min(count, 32);
  for (let c = 0; c < 4; c++) {
    const a = fx.reduced ? 1 : 0.45 + 0.55 * Math.max(0, Math.sin(t * 2.6 + c * 1.57));
    if (P.halo) {
      const hr = coreR * 2.8;
      ctx.globalAlpha = a * 0.3;
      ctx.fillStyle = LIGHT_COLORS[c];
      ctx.beginPath();
      for (let j = c; j < n; j += 4) {
        ctx.moveTo(BULB_X[j] + hr, BULB_Y[j]);
        ctx.arc(BULB_X[j], BULB_Y[j], hr, 0, TAU);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 0.6 + 0.4 * a;
    ctx.fillStyle = LIGHT_COLORS[c];
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let j = c; j < n; j += 4) {
      ctx.moveTo(BULB_X[j] + coreR, BULB_Y[j]);
      ctx.arc(BULB_X[j], BULB_Y[j], coreR, 0, TAU);
    }
    ctx.fill();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawXmasTree(ctx, x, y, s, t, P) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.fillStyle = 'rgba(90, 130, 170, 0.25)';
  fillEllipse(ctx, 3, 1, 18, 4.5);
  ctx.fillStyle = WOOD;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  ctx.fillRect(-3, -6, 6, 7);
  ctx.strokeRect(-3, -6, 6, 7);

  // Quatro andares
  ctx.fillStyle = PINE;
  ctx.beginPath();
  ctx.moveTo(-14, -6); ctx.lineTo(0, -20); ctx.lineTo(14, -6); ctx.closePath();
  ctx.moveTo(-11, -18); ctx.lineTo(0, -32); ctx.lineTo(11, -18); ctx.closePath();
  ctx.moveTo(-8.5, -29); ctx.lineTo(0, -42); ctx.lineTo(8.5, -29); ctx.closePath();
  ctx.moveTo(-6, -38); ctx.lineTo(0, -50); ctx.lineTo(6, -38); ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Lado iluminado
  ctx.fillStyle = 'rgba(120, 190, 140, 0.35)';
  ctx.beginPath();
  ctx.moveTo(0, -20); ctx.lineTo(-14, -6); ctx.lineTo(-5, -6); ctx.closePath();
  ctx.moveTo(0, -32); ctx.lineTo(-11, -18); ctx.lineTo(-4, -18); ctx.closePath();
  ctx.moveTo(0, -42); ctx.lineTo(-8.5, -29); ctx.lineTo(-3, -29); ctx.closePath();
  ctx.fill();

  // Neve nas pontas dos andares
  ctx.fillStyle = SNOW;
  ctx.beginPath();
  ctx.moveTo(0, -20); ctx.lineTo(-5.4, -14); ctx.lineTo(-2, -15.4); ctx.lineTo(1.4, -13.6); ctx.lineTo(5.4, -14); ctx.closePath();
  ctx.moveTo(0, -32); ctx.lineTo(-4.6, -26); ctx.lineTo(-1.4, -27.4); ctx.lineTo(1.8, -25.8); ctx.lineTo(4.6, -26); ctx.closePath();
  ctx.moveTo(0, -42); ctx.lineTo(-3.8, -36.4); ctx.lineTo(0, -37.6); ctx.lineTo(3.8, -36.4); ctx.closePath();
  ctx.moveTo(0, -50); ctx.lineTo(-2.6, -45.4); ctx.lineTo(0, -46.4); ctx.lineTo(2.6, -45.4); ctx.closePath();
  ctx.fill();

  // Grinalda dourada
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-10, -9); ctx.quadraticCurveTo(0, -3, 10, -10);
  ctx.moveTo(-8, -21); ctx.quadraticCurveTo(0, -14, 8, -22);
  ctx.moveTo(-6, -32); ctx.quadraticCurveTo(0, -26, 6, -33);
  ctx.stroke();

  // Bolas
  const nb = Math.min(P.baubles, TREE_BAUBLES.length);
  for (let c = 0; c < ORNAMENTS.length; c++) {
    ctx.fillStyle = ORNAMENTS[c];
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let i = c; i < nb; i += ORNAMENTS.length) {
      ctx.moveTo(TREE_BAUBLES[i][0] + 1.9, TREE_BAUBLES[i][1]);
      ctx.arc(TREE_BAUBLES[i][0], TREE_BAUBLES[i][1], 1.9, 0, TAU);
    }
    ctx.fill();
    ctx.stroke();
  }

  // Luzes a piscar
  if (P.treeLights) {
    const nl = Math.min(TREE_LIGHTS.length, 12);
    for (let i = 0; i < nl; i++) {
      BULB_X[i] = TREE_LIGHTS[i][0];
      BULB_Y[i] = TREE_LIGHTS[i][1];
    }
    flushBulbs(ctx, nl, t, P, 1.3);
  }

  // Estrela do topo
  const pulse = fx.reduced ? 1 : 0.75 + 0.25 * Math.sin(t * 2.2);
  if (P.halo) {
    ctx.fillStyle = 'rgba(255, 226, 140, 0.28)';
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(0, -53, 8, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  drawStar5(ctx, 0, -53, 5.2, 0, GOLD, true);
  if (P.tier >= 2 && !fx.reduced) {
    ctx.globalAlpha = pulse;
    drawGlint(ctx, 0, -53, 12, '#FFFFFF');
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// Neve em cima de uma aresta (lombada ondulada)
function drawSnowCap(ctx, x0, x1, y, thick) {
  const span = x1 - x0;
  const n = Math.max(2, Math.round(span / 16));
  const w = span / n;
  ctx.beginPath();
  ctx.moveTo(x0, y + 1);
  for (let i = 0; i < n; i++) {
    const bx = x0 + i * w;
    const lift = thick * (0.8 + 0.4 * hash(bx * 0.37));
    ctx.quadraticCurveTo(bx + w * 0.5, y - lift * 1.6, bx + w, y + 1);
  }
  ctx.lineTo(x1, y + thick * 0.6);
  for (let i = n - 1; i >= 0; i--) {
    const bx = x0 + i * w;
    ctx.quadraticCurveTo(bx + w * 0.5, y + thick * 1.5, bx, y + thick * 0.6);
  }
  ctx.closePath();
  ctx.fillStyle = SNOW;
  ctx.fill();
  ctx.strokeStyle = SNOW_EDGE;
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

// Sincelos pendurados (e gotas a cair no Ultra)
function drawIcicles(ctx, x0, x1, y, P, t) {
  const gap = P.icicleGap;
  if (!gap) return;
  const span = x1 - x0;
  const n = Math.max(1, Math.floor(span / gap));
  const step = span / n;

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const seed = x0 * 0.13 + i * 3.1;
    const px = x0 + (i + 0.5) * step;
    const len = 5 + 9 * hash(seed);
    const w = 2 + 1.2 * hash(seed + 1);
    ctx.moveTo(px - w, y);
    ctx.lineTo(px + 0.4, y + len);
    ctx.lineTo(px + w, y);
    ctx.closePath();
  }
  ctx.fillStyle = 'rgba(205, 238, 252, 0.95)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(90, 150, 195, 0.85)';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  if (P.drip && !fx.reduced) {
    ctx.fillStyle = '#BEE6FF';
    for (let i = 0; i < n; i += 3) {
      const seed = x0 * 0.13 + i * 3.1;
      const px = x0 + (i + 0.5) * step;
      const len = 5 + 9 * hash(seed);
      const phase = (t * 0.45 + i * 0.37) % 1;
      ctx.globalAlpha = (1 - phase) * 0.9;
      ctx.beginPath();
      ctx.arc(px + 0.4, y + len + phase * 16, 1, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// Grinalda de pinheiro com laços, bagas e luzes a piscar
function drawLightGarland(ctx, x0, x1, y0, sag, t, P, bulbs) {
  const span = x1 - x0;
  const ctrlY = y0 + sag * 2;

  ctx.lineCap = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(x0 + span / 2, ctrlY, x1, y0);
  ctx.stroke();

  // Agulhas de pinheiro
  const leafCount = Math.max(8, Math.floor((span / 14) * P.needles));
  ctx.fillStyle = PINE;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let i = 0; i < leafCount; i++) {
    const u = (i + 0.5) / leafCount;
    const px = x0 + u * span;
    const py = y0 + 4 * sag * u * (1 - u);
    const slope = Math.atan2(4 * sag * (1 - 2 * u), span);
    const side = i % 2 === 0 ? 1 : -1;
    addLeaf(ctx, px, py + side * 2.4, 4.4, 1.8, slope + side * 0.7);
  }
  ctx.fill();
  ctx.stroke();

  if (P.needles >= 1) {
    ctx.fillStyle = PINE_LIGHT;
    ctx.beginPath();
    for (let i = 0; i < leafCount; i++) {
      const u = (i + 0.9) / leafCount;
      const px = x0 + u * span;
      const py = y0 + 4 * sag * u * (1 - u);
      const slope = Math.atan2(4 * sag * (1 - 2 * u), span);
      addLeaf(ctx, px, py - 1.6, 3.2, 1.3, slope - 0.5);
    }
    ctx.fill();
  }

  // Bagas vermelhas
  const berries = Math.max(3, Math.floor(span / 26));
  ctx.fillStyle = RED;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let i = 0; i < berries; i++) {
    const u = (i + 0.5) / berries;
    const px = x0 + u * span;
    const py = y0 + 4 * sag * u * (1 - u) + 1;
    ctx.moveTo(px + 1.8, py);
    ctx.arc(px, py, 1.8, 0, TAU);
  }
  ctx.fill();
  ctx.stroke();

  // Laços
  const bows = Math.max(2, Math.floor(span / 70));
  for (let i = 0; i < bows; i++) {
    const u = (i + 0.5) / bows;
    drawBow(ctx, x0 + u * span, y0 + 4 * sag * u * (1 - u) + 1, 0.8, i % 2 ? GOLD : RED);
  }

  // Luzes
  if (bulbs > 0) {
    ctx.strokeStyle = 'rgba(27, 77, 60, 0.7)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let j = 0; j < bulbs; j++) {
      const u = (j + 1) / (bulbs + 1);
      const px = x0 + u * span;
      const py = y0 + 4 * sag * u * (1 - u);
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + 6);
      BULB_X[j] = px;
      BULB_Y[j] = py + 8;
    }
    ctx.stroke();
    flushBulbs(ctx, bulbs, t, P, 2.5);
  }
}

// Fio pendurado com folhas, bola e laço (nos cantos da loja)
function drawHangingStrand(ctx, x, y, length, dir, t, P) {
  const sway = P.anim && !fx.reduced ? Math.sin(t * 0.9 + x * 0.05) * 1.5 : 0;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x + dir * 4 + sway, y + length * 0.3, x - dir * 3 + sway, y + length * 0.6, x + dir * 2 + sway, y + length);
  ctx.stroke();

  ctx.fillStyle = PINE;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const k = 0.15 + i * 0.2;
    const lx = x + dir * 3 * Math.sin(k * Math.PI * 1.6) + sway * k;
    const ly = y + length * k;
    const side = i % 2 === 0 ? 1 : -1;
    addLeaf(ctx, lx + side * 3, ly, 3.6, 1.6, side > 0 ? -0.5 : Math.PI + 0.5);
  }
  ctx.fill();
  ctx.stroke();

  drawBow(ctx, x + dir * 1.5 + sway * 0.3, y + length * 0.18, 0.7, RED);

  // Bola dourada no fim
  const bx = x + dir * 2 + sway;
  const by = y + length + 2;
  ctx.fillStyle = GOLD;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(bx, by, 3.4, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillRect(bx - 1.6, by - 1.8, 1.2, 1.2);
  ctx.fillStyle = '#8A8A8A';
  ctx.fillRect(bx - 1, by - 4.6, 2, 1.4);
}

// Arco de entrada em Natal: pinheiro, laço, sincelos e luzes
function drawChristmasArch(ctx, x, y, t, P) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.fillStyle = 'rgba(90, 130, 170, 0.25)';
  fillEllipse(ctx, 2, 26, 48, 8);

  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 7;
  strokeArch(ctx);
  ctx.strokeStyle = WOOD;
  ctx.lineWidth = 4;
  strokeArch(ctx);

  // Folhagem ao longo do arco e dos postes
  ctx.fillStyle = PINE;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) {
    const a = (Math.PI * i) / 10;
    const nx = -Math.cos(a);
    const ny = -Math.sin(a);
    addLeaf(ctx, nx * 36 + nx * 3, -8 + ny * 30 + ny * 3, 4.8, 2.1, Math.atan2(ny, nx) + (i % 2 ? 0.5 : -0.5));
  }
  for (let k = 0; k < 4; k++) {
    const ly = 20 - k * 8;
    addLeaf(ctx, -39, ly, 3.8, 1.8, Math.PI + (k % 2 ? 0.5 : -0.5));
    addLeaf(ctx, 39, ly, 3.8, 1.8, k % 2 ? -0.5 : 0.5);
  }
  ctx.fill();
  ctx.stroke();

  // Bagas
  ctx.fillStyle = RED;
  ctx.beginPath();
  for (let i = 1; i < 10; i += 2) {
    const a = (Math.PI * i) / 10;
    const bx = -Math.cos(a) * 36;
    const by = -8 - Math.sin(a) * 30 - 1;
    ctx.moveTo(bx + 2, by);
    ctx.arc(bx, by, 2, 0, TAU);
  }
  ctx.fill();
  ctx.stroke();

  // Neve em tufos sobre o arco
  ctx.save();
  ctx.translate(0, -2.5);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.6;
  ctx.setLineDash(ARCH_SNOW_DASH);
  strokeArch(ctx);
  ctx.setLineDash(EMPTY_DASH);
  ctx.restore();

  // Sincelos por baixo do arco
  if (P.icicleGap) {
    ctx.beginPath();
    for (let ix = -26; ix <= 26; ix += P.icicleGap > 14 ? 13 : 8) {
      const ux = ix / 36;
      const top = -8 - 30 * Math.sqrt(Math.max(0, 1 - ux * ux)) + 4;
      const len = 4 + 6 * hash(ix * 0.7 + 3);
      ctx.moveTo(ix - 1.8, top);
      ctx.lineTo(ix + 0.3, top + len);
      ctx.lineTo(ix + 1.8, top);
      ctx.closePath();
    }
    ctx.fillStyle = 'rgba(205, 238, 252, 0.95)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(90, 150, 195, 0.85)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // Luzes ao longo do arco
  const bulbs = Math.min(P.bulbCap + 3, 12);
  for (let j = 0; j < bulbs; j++) {
    const a = (Math.PI * (j + 1)) / (bulbs + 1);
    BULB_X[j] = -Math.cos(a) * 36;
    BULB_Y[j] = -8 - Math.sin(a) * 30 + 5;
  }
  flushBulbs(ctx, bulbs, t, P, 2.2);

  // Laço e sino no topo
  drawBow(ctx, 0, -40, 1.25, RED);
  ctx.fillStyle = GOLD;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-2.6, -28);
  ctx.quadraticCurveTo(-2.8, -33, 0, -33.6);
  ctx.quadraticCurveTo(2.8, -33, 2.6, -28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -27.6, 1, 0, TAU);
  ctx.fill();

  if (!fx.reduced && P.tier >= 1) {
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(t * 1.6);
    drawGlint(ctx, 0, -48, 9, GOLD);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// Cardinal vermelho (o pisco do tema padrão, em versão de inverno)
function drawCardinal(ctx, x, y, t) {
  const dip = !fx.reduced && Math.sin(t * 2.6) > 0.88 ? 0.9 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 1;
  ctx.strokeStyle = OUTLINE;

  ctx.fillStyle = '#8E1B2D';
  ctx.beginPath();
  ctx.moveTo(-3.5, 0); ctx.lineTo(-9, 2.4); ctx.lineTo(-7.6, -0.8); ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.6, 3.5, -0.1, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#A81F32';
  ctx.beginPath();
  ctx.ellipse(-1.2, -0.3, 2.5, 1.4, -0.4, 0, TAU);
  ctx.fill();

  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.arc(3.7, -2.5 + dip, 2.5, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // Crista
  ctx.beginPath();
  ctx.moveTo(2.4, -4.3 + dip); ctx.lineTo(3.2, -7 + dip); ctx.lineTo(4.4, -4.5 + dip);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Máscara negra e bico
  ctx.fillStyle = '#2A2540';
  ctx.beginPath();
  ctx.arc(5, -2.1 + dip, 1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#F28C28';
  ctx.beginPath();
  ctx.moveTo(5.8, -3 + dip); ctx.lineTo(8.2, -2.2 + dip); ctx.lineTo(5.8, -1.5 + dip); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(4.3, -3.4 + dip, 0.8, 0.8);
  ctx.restore();
}

/* ---------- Limites do mapa: dunas e pinheirinhos ---------- */

function pushDriftRow(ctx, axis, fixed, min, max, viewMin, viewMax, shadow) {
  const step = 30;
  const i0 = Math.floor(Math.max(viewMin - 40, min) / step);
  const i1 = Math.floor(Math.min(viewMax + 40, max) / step);
  for (let i = i0; i <= i1; i++) {
    const seed = i * 1.3 + axis * 7 + fixed * 0.01;
    const rA = 20 + 10 * hash(seed);
    const rB = 10 + 6 * hash(seed + 1);
    const along = (i + 0.5) * step + (hash(seed + 2) - 0.5) * 6;
    const cx = (axis === 0 ? along : fixed) + (shadow ? 2 : 0);
    const cy = (axis === 0 ? fixed : along) + (shadow ? 3 : 0);
    const rx = axis === 0 ? rA : rB;
    const ry = axis === 0 ? rB : rA;
    ctx.moveTo(cx + rx, cy);
    ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  }
}

function pineRun(ctx, axis, fixed, min, max, viewMin, viewMax, spacing) {
  const i0 = Math.floor(Math.max(viewMin - 20, min) / spacing);
  const i1 = Math.floor(Math.min(viewMax + 20, max) / spacing);
  for (let i = i0; i <= i1; i++) {
    const seed = i * 2.7 + axis * 5 + fixed * 0.02;
    if (hash(seed) < 0.3) continue;
    const along = (i + hash(seed + 1)) * spacing;
    if (along < min + 10 || along > max - 10) continue;
    const s = 0.85 + 0.35 * hash(seed + 2);
    if (axis === 0) drawMiniPine(ctx, along, fixed, s);
    else drawMiniPine(ctx, fixed, along, s);
  }
}

function drawEdges(ctx, b, view, P) {
  const band = 40;
  const nearTop = view.top < b.minY + band;
  const nearBottom = view.bottom > b.maxY - band;
  const nearLeft = view.left < b.minX + band;
  const nearRight = view.right > b.maxX - band;
  if (!(nearTop || nearBottom || nearLeft || nearRight)) return;

  if (P.edgePines) {
    const sp = P.edgePines;
    if (nearTop) pineRun(ctx, 0, b.minY + 8, b.minX, b.maxX, view.left, view.right, sp);
    if (nearBottom) pineRun(ctx, 0, b.maxY - 2, b.minX, b.maxX, view.left, view.right, sp);
    if (nearLeft) pineRun(ctx, 1, b.minX + 8, b.minY, b.maxY, view.top, view.bottom, sp);
    if (nearRight) pineRun(ctx, 1, b.maxX - 8, b.minY, b.maxY, view.top, view.bottom, sp);
  }

  for (let pass = 0; pass < 2; pass++) {
    const shadow = pass === 0;
    ctx.fillStyle = shadow ? 'rgba(135, 172, 208, 0.45)' : SNOW;
    ctx.beginPath();
    if (nearTop) pushDriftRow(ctx, 0, b.minY, b.minX, b.maxX, view.left, view.right, shadow);
    if (nearBottom) pushDriftRow(ctx, 0, b.maxY, b.minX, b.maxX, view.left, view.right, shadow);
    if (nearLeft) pushDriftRow(ctx, 1, b.minX, b.minY, b.maxY, view.top, view.bottom, shadow);
    if (nearRight) pushDriftRow(ctx, 1, b.maxX, b.minY, b.maxY, view.top, view.bottom, shadow);
    ctx.fill();
    if (!shadow) {
      ctx.strokeStyle = SNOW_EDGE;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

/* ==========================================================================
   Tema
   ========================================================================== */

export const NATAL_QUALITY_OPTIONS = Object.freeze([
  Object.freeze({ id: 'low', label: 'Baixa', description: 'Menos detalhes, ideal para dispositivos fracos.' }),
  Object.freeze({ id: 'normal', label: 'Normal', description: 'Equilíbrio entre beleza e desempenho.' }),
  Object.freeze({ id: 'ultra', label: 'Ultra', description: 'Todos os detalhes, para dispositivos de alta gama.' })
]);

export function getNatalQuality() {
  return qualityKey;
}

export function setNatalQuality(mode) {
  if (!Object.prototype.hasOwnProperty.call(TIER, mode)) return qualityKey;
  qualityKey = mode;
  qualityTier = TIER[mode];
  fx.level = 0;
  fx.slow = 0;
  fx.fast = 0;
  fx.avg = 16.7;
  fx.fastNeeded = 60 * 20;
  invalidateCaches();
  return qualityKey;
}

// Sugestão automática com base no hardware (o jogador pode sempre mudar)
export function detectNatalQuality() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory || 4;
  const mobile = /Android|iPhone|iPad|Mobile/i.test(nav.userAgent || '');
  if (cores <= 4 || memory <= 2) return 'low';
  if (!mobile && cores >= 8 && memory >= 8) return 'ultra';
  return 'normal';
}

setNatalQuality(detectNatalQuality());

export const NATAL_NEVADO_THEME = Object.freeze({
  id: 'natal_nevado',
  label: 'Natal Nevado',
  eventPillLabel: 'Natal Nevado',
  eventPillAriaLabel: 'Ver opções do tema Natal Nevado',
  eventPillIconMarkup: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.500V21.500M4.200 7.200L19.800 16.800M19.800 7.200L4.200 16.800" stroke="#1B4D3C" stroke-width="3.400" stroke-linecap="round"/><path d="M12 2.500V21.500M4.200 7.200L19.800 16.800M19.800 7.200L4.200 16.800" stroke="#F7FBFF" stroke-width="1.700" stroke-linecap="round"/><path d="M9.500 5L12 7.200L14.500 5M9.500 19L12 16.800L14.500 19" stroke="#F7FBFF" stroke-width="1.400" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.800" fill="#C8283C" stroke="#1B4D3C" stroke-width="1.200"/><path d="M19.500 1.500L20.300 3.700L22.500 4.500L20.300 5.300L19.500 7.500L18.700 5.300L16.500 4.500L18.700 3.700Z" fill="#F6C453"/></svg>',
  type: 'event',
  dateWindow: Object.freeze({ start: '2026-12-21', end: '2027-01-02' }),
  paletteAppliesToWorld: true,
  assetPalette: Object.freeze({
    cream: CREAM,
    grassLight: '#E4EFF8',
    leafGreen: PINE,
    pathEarth: '#8A7566',
    pathSoil: '#B9A793',
    pathSurface: '#DCD3C4',
    deepGreen: OUTLINE,
    peonyPink: '#F4A6BD',
    raspberryPink: '#D93A4E',
    sunYellow: GOLD,
    lavender: '#9CB4F0',
    earthBrown: '#7A5238',
    wood: WOOD,
    softBlue: '#8FD0EE',
    plumText: '#2A2540'
  }),
  palette: Object.freeze({
    cream: CREAM,
    grassLight: '#E4EFF8',
    leafGreen: PINE,
    deepGreen: OUTLINE,
    peonyPink: '#F4A6BD',
    raspberryPink: '#D93A4E',
    sunYellow: GOLD,
    lavender: '#9CB4F0',
    earthBrown: '#7A5238',
    wood: WOOD,
    softBlue: '#8FD0EE',
    plumText: '#2A2540',
    stone: '#CDD9E4',
    earthGroove: '#8E6A4E',
    pathEarth: '#8A7566',
    pathSoil: '#B9A793',
    pathSurface: '#DCD3C4',
    terrainPatchLight: 'rgba(255, 255, 255, 0.35)',
    terrainPatchDark: 'rgba(90, 130, 175, 0.12)',
    terrainPatchAccent: 'rgba(246, 196, 83, 0.08)',
    terrainTuft: 'rgba(60, 100, 140, 0.22)',
    minimapGrass: '#E4EFF8',
    minimapPath: '#DCD3C4',
    minimapShop: WOOD,
    minimapCounter: RED,
    minimapPlot: '#7A5238',
    minimapPlotBorder: OUTLINE,
    minimapPlayer: RED,
    minimapView: 'rgba(27, 77, 60, 0.8)',
    signWood: '#B98A5E',
    signPaper: CREAM
  }),
  cssTokens: Object.freeze({
    '--color-cream': CREAM,
    '--color-grass-light': '#E4EFF8',
    '--color-leaf-green': PINE,
    '--color-deep-green': OUTLINE,
    '--color-peony-pink': '#F4A6BD',
    '--color-raspberry-pink': '#D93A4E',
    '--color-sun-yellow': GOLD,
    '--color-lavender': '#9CB4F0',
    '--color-earth-brown': '#7A5238',
    '--color-wood': WOOD,
    '--color-soft-blue': '#8FD0EE',
    '--color-plum-text': '#2A2540'
  }),
  hudIconMarkup: Object.freeze({
    basket: '<path d="M6 10L4 19C4 20.100 4.900 21 6 21H18C19.100 21 20 20.100 20 19L18 10H6Z" fill="#C8283C" stroke="#1B4D3C" stroke-width="2" stroke-linejoin="round"/><path d="M5 10H19M8 10C8 6 9.800 4 12 4C14.200 4 16 6 16 10" stroke="#1B4D3C" stroke-width="2" stroke-linecap="round"/><path d="M12 10V21M8 14H16" stroke="#F6C453" stroke-width="1.400" stroke-linecap="round"/><circle cx="9.500" cy="7" r="1.200" fill="#C8283C" stroke="#1B4D3C" stroke-width="0.800"/><circle cx="12" cy="6.200" r="1.200" fill="#C8283C" stroke="#1B4D3C" stroke-width="0.800"/><path d="M13.500 8.200L16.500 6.400" stroke="#2F7D5A" stroke-width="1.600" stroke-linecap="round"/>'
  }),
  pathColor: '#DCD3C4',
  pathEdgeColor: 'rgba(90, 110, 140, 0.25)',
  fenceColor: 'rgba(110, 72, 44, 0.72)',
  awningColors: Object.freeze([RED, CREAM, PINE, GOLD]),

  // API de qualidade (também exportada em separado)
  qualityOptions: NATAL_QUALITY_OPTIONS,
  getQuality: getNatalQuality,
  setQuality: setNatalQuality,
  // Diagnóstico: NATAL_NEVADO_THEME.getPerf() na consola
  getPerf() {
    return { quality: qualityKey, safetyLevel: fx.level, avgFrameMs: Math.round(fx.avg * 10) / 10, fps: Math.round(1000 / fx.avg) };
  },

  getTreePalette(x, y) {
    return TREE_PALETTES[Math.abs(Math.floor(x * 13 + y * 7)) % TREE_PALETTES.length];
  },

  // Mantém o matiz de cada flor; enriquece cor e contorno (resultado em cache)
  resolveFlowerConfig(flowerConfig) {
    if (!flowerConfig || typeof flowerConfig !== 'object') return flowerConfig;
    let resolved = resolvedFlowers.get(flowerConfig);
    if (resolved) return resolved;
    resolved = {
      ...flowerConfig,
      color: enrich(flowerConfig.color, 0.1, 0.03),
      centerColor: enrich(flowerConfig.centerColor, 0.08, 0),
      stemColor: '#2C6E4C',
      outlineColor: OUTLINE
    };
    if (flowerConfig.accent) resolved.accent = enrich(flowerConfig.accent, 0.08, 0.02);
    resolvedFlowers.set(flowerConfig, resolved);
    return resolved;
  },

  /* Camada do chão: o mapa todo coberto de neve, arrumada em fiadas.
     Corre uma vez por frame e fixa o relógio e o retângulo visível. */
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

    const left = Math.max(view.left - 8, mapBounds.minX);
    const right = Math.min(view.right + 8, mapBounds.maxX);
    const top = Math.max(view.top - 8, mapBounds.minY);
    const bottom = Math.min(view.bottom + 8, mapBounds.maxY);
    if (right <= left || bottom <= top) return;

    const P = cur();
    ctx.save();

    // 1) Cobertura de neve: um único fillRect por camada
    const snow = getSnowPatterns(ctx);
    if (snow.a) {
      ctx.fillStyle = snow.a;
      ctx.fillRect(left, top, right - left, bottom - top);
    }
    if (snow.b && P.tier >= 2) {
      ctx.fillStyle = snow.b;
      ctx.fillRect(left, top, right - left, bottom - top);
    }

    // 2) Limites do mapa: dunas e pinheirinhos
    drawEdges(ctx, mapBounds, view, P);

    const t = fx.reduced ? 0 : fx.time;

    // 3) Adereços no chão (azevinho, pinheirinhos, bengalas doces)
    const step = P.decorStep;
    if (step) {
      const c0 = Math.floor(left / step);
      const c1 = Math.floor(right / step);
      const r0 = Math.floor(top / step);
      const r1 = Math.floor(bottom / step);
      for (let cy = r0; cy <= r1; cy++) {
        for (let cx = c0; cx <= c1; cx++) {
          const seed = cx * 91.7 + cy * 47.3;
          const h = hash(seed + 5);
          if (h < 0.9) continue;
          const px = (cx + hash(seed + 8)) * step;
          const py = (cy + hash(seed + 10)) * step;
          if (px < mapBounds.minX + 8 || px > mapBounds.maxX - 8 || py < mapBounds.minY + 8 || py > mapBounds.maxY - 8) continue;
          if (h > 0.955) {
            drawHolly(ctx, px, py, 0.9);
          } else if (h > 0.925 && P.props >= 2) {
            drawMiniPine(ctx, px, py, 0.8 + 0.3 * hash(seed + 12));
          } else if (P.props >= 3) {
            drawCane(ctx, px, py, 0.7, (hash(seed + 14) - 0.5) * 0.5);
          }
        }
      }
    }

    // 4) Brilhos de gelo a cintilar
    const ss = P.sparkleStep;
    if (ss) {
      const c0 = Math.floor(left / ss);
      const c1 = Math.floor(right / ss);
      const r0 = Math.floor(top / ss);
      const r1 = Math.floor(bottom / ss);
      ctx.fillStyle = '#FFFFFF';
      for (let cy = r0; cy <= r1; cy++) {
        for (let cx = c0; cx <= c1; cx++) {
          const seed = cx * 57.3 + cy * 83.1 + 11;
          if (hash(seed) < 0.55) continue;
          const sn = fx.reduced ? 0.8193 : Math.max(0, Math.sin(fx.time * 2 + seed * 1.7));
          const alpha = fx.reduced ? 0.55 : sn * sn * sn;
          if (alpha < 0.05) continue;
          const sx = (cx + hash(seed + 1)) * ss;
          const sy = (cy + hash(seed + 2)) * ss;
          if (sx < mapBounds.minX || sx > mapBounds.maxX || sy < mapBounds.minY || sy > mapBounds.maxY) continue;
          ctx.globalAlpha = alpha;
          if (P.tier >= 2 && hash(seed + 3) > 0.6) {
            drawGlint(ctx, sx, sy, 8, '#FFFFFF');
          } else {
            drawSparkle(ctx, sx, sy);
          }
        }
      }
    }
    // t fica reservado para animações futuras do chão (ex.: neve levantada pelo vento)
    void t;
    ctx.restore();
  },

  /* Luz de inverno: brilho frio, raios de sol, aurora, gelo nos cantos e neve a cair. */
  drawAtmosphere(ctx, width, height, lighting) {
    const P = cur();
    const night = lighting ? lighting.night || 0 : 0;
    const warm = lighting ? Math.max(lighting.sunset || 0, lighting.dawn || 0) : 0;
    const day = 1 - night;
    const reduced = fx.reduced;
    const t = reduced ? 0 : fx.time;

    ensureAtmosphere(ctx, width, height, P);
    ctx.save();

    // Tom frio de dia (já cozido na camada do brilho) e azul profundo à noite
    if (night > 0.02) {
      ctx.globalAlpha = night * 0.16;
      ctx.fillStyle = 'rgb(18, 34, 86)';
      ctx.fillRect(0, 0, width, height);
    }

    if (atmosphere.glow && day > 0.02) {
      ctx.globalAlpha = Math.min(1, day * (0.8 + warm * 0.4));
      ctx.drawImage(atmosphere.glow, 0, 0, width, height);
    }

    // Raios de sol frios
    if (P.shafts && atmosphere.shafts && day > 0.02) {
      const sway = reduced ? 0 : Math.sin(t * 0.22) * 8;
      const breathe = reduced ? 0.5 : 0.46 + 0.12 * Math.sin(t * 0.37);
      ctx.globalAlpha = Math.min(1, breathe * day * (1 + warm * 0.4));
      ctx.drawImage(atmosphere.shafts, sway - 10, 0, width + 20, height);
    }

    // Aurora boreal (Ultra, de noite)
    if (P.aurora && atmosphere.aurora && night > 0.15) {
      const drift = reduced ? 0 : Math.sin(t * 0.08) * width * 0.04;
      const pulse = reduced ? 0.8 : 0.8 + 0.2 * Math.sin(t * 0.3);
      ctx.globalAlpha = Math.min(1, night * 0.6 * pulse);
      ctx.drawImage(atmosphere.aurora, drift - width * 0.05, 0, width * 1.1, height * 0.5);
    }

    if (warm > 0.02) {
      ctx.globalAlpha = warm * 0.5;
      ctx.fillStyle = 'rgba(255, 190, 130, 0.09)';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.globalAlpha = 1;
    if (atmosphere.vignette) ctx.drawImage(atmosphere.vignette, 0, 0, width, height);

    // Gelo nos cantos do ecrã (Ultra)
    if (P.frost && atmosphere.frost) {
      ctx.drawImage(atmosphere.frost, 0, 0, width, height);
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      const fr = Math.min(width, height) * 0.045;
      const spots = [[fr * 1.6, fr * 1.6], [width - fr * 1.6, fr * 1.6], [fr * 1.6, height - fr * 1.6], [width - fr * 1.6, height - fr * 1.6]];
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.translate(spots[i][0], spots[i][1]);
        ctx.rotate(i * 0.5);
        ctx.scale(fr / 20, fr / 20);
        strokeSnowflake(ctx);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    // Neve a cair (sempre por último, por cima de tudo)
    drawSnowfall(ctx, width, height, t, P, night);

    ctx.restore();
  },

  drawShopDecor(ctx, x, y, width, height) {
    const P = cur();
    const t = fx.time;
    ctx.save();
    drawSnowCap(ctx, x + 2, x + width - 2, y - 6, 6);
    drawIcicles(ctx, x + 6, x + width - 6, y - 4, P, t);
    const bulbs = Math.min(P.bulbCap, Math.max(3, Math.floor(width / 24)));
    drawLightGarland(ctx, x + 6, x + width - 6, y - 2, 16, t, P, bulbs);
    drawHangingStrand(ctx, x + 3, y + 2, Math.max(24, height * 0.45), 1, t, P);
    drawHangingStrand(ctx, x + width - 3, y + 2, Math.max(24, height * 0.45), -1, t, P);
    ctx.restore();
  },

  drawStockSignDecor(ctx, x, y, width) {
    const P = cur();
    const t = fx.time;
    ctx.save();
    drawSnowCap(ctx, x + 1, x + width - 1, y - 2, 4);
    if (P.icicleGap) drawIcicles(ctx, x + 6, x + width - 6, y + 1, P, t);

    // Fio de pinheiro com bagas e lâmpadas
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 1);
    for (let i = 1; i <= 10; i++) {
      ctx.lineTo(x + 4 + ((width - 8) * i) / 10, y + 1 + Math.sin(i * 1.9) * 1.6);
    }
    ctx.stroke();

    ctx.fillStyle = PINE;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const lx = x + 10 + ((width - 20) * i) / 8;
      const side = i % 2 === 0 ? -1 : 1;
      addLeaf(ctx, lx, y + 1 + side * 2.2, 3.6, 1.6, side * 0.6);
    }
    ctx.fill();
    ctx.stroke();

    drawBow(ctx, x + width * 0.18, y + 1, 0.8, RED);
    drawHolly(ctx, x + width * 0.5, y + 1, 0.8);
    drawBow(ctx, x + width * 0.82, y + 1, 0.8, GOLD);

    BULB_X[0] = x + width * 0.34; BULB_Y[0] = y + 5;
    BULB_X[1] = x + width * 0.66; BULB_Y[1] = y + 5;
    BULB_X[2] = x + width - 8; BULB_Y[2] = y + 9;
    BULB_X[3] = x + 8; BULB_Y[3] = y + 9;
    flushBulbs(ctx, 4, t, P, 2.2);
    ctx.restore();
  },

  drawGardenDecor(ctx, decorations) {
    const P = cur();
    const t = fx.time;
    const reduced = fx.reduced;
    const view = fx.view;

    // Peças de Natal à entrada do jardim
    if (view.right >= ARCH_POS.x - 70 && view.left <= ARCH_POS.x + 70 && view.bottom >= ARCH_POS.y - 70 && view.top <= ARCH_POS.y + 50) {
      drawChristmasArch(ctx, ARCH_POS.x, ARCH_POS.y, t, P);
    }
    if (view.right >= SNOWMAN_POS.x - 30 && view.left <= SNOWMAN_POS.x + 30 && view.bottom >= SNOWMAN_POS.y - 50 && view.top <= SNOWMAN_POS.y + 10) {
      drawSnowman(ctx, SNOWMAN_POS.x, SNOWMAN_POS.y, 1, t, P);
    }
    if (view.right >= TREE_POS.x - 30 && view.left <= TREE_POS.x + 30 && view.bottom >= TREE_POS.y - 70 && view.top <= TREE_POS.y + 10) {
      drawXmasTree(ctx, TREE_POS.x, TREE_POS.y, 1, t, P);
    }

    for (const decor of decorations) {
      if (decor.x < view.left - 120 || decor.x > view.right + 120 || decor.y < view.top - 120 || decor.y > view.bottom + 120) continue;
      switch (decor.type) {
        case 'flowerBed': {
          // Dunas de neve na base e azevinho nas pontas
          ctx.save();
          ctx.fillStyle = SNOW;
          ctx.strokeStyle = SNOW_EDGE;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const mx = decor.x - 14 + i * 10;
            const rx = 6 + 2 * hash(decor.x * 0.1 + i);
            ctx.moveTo(mx + rx, decor.y + 19);
            ctx.ellipse(mx, decor.y + 19, rx, 3.2, 0, 0, TAU);
          }
          ctx.fill();
          ctx.stroke();
          drawHolly(ctx, decor.x - 18, decor.y + 17, 0.9);
          drawHolly(ctx, decor.x + 66, decor.y + 17, 0.9);
          if (!reduced && P.sparkleStep) {
            ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2.2 + decor.x);
            drawGlint(ctx, decor.x + 12, decor.y - 6, 7, '#FFFFFF');
            ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2.2 + decor.x + 2.1);
            drawGlint(ctx, decor.x + 52, decor.y - 8, 6, '#FFFFFF');
            ctx.globalAlpha = 1;
          }
          ctx.restore();
          break;
        }
        case 'bench': {
          ctx.save();
          const flicker = reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 2 + decor.x * 0.1);
          // Candeeiro quente
          ctx.fillStyle = 'rgba(255, 214, 120, 0.15)';
          ctx.beginPath();
          ctx.arc(decor.x + 42, decor.y - 9, 13 * flicker, 0, TAU);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 233, 160, 0.3)';
          ctx.beginPath();
          ctx.arc(decor.x + 42, decor.y - 9, 6 * flicker, 0, TAU);
          ctx.fill();
          drawSnowCap(ctx, decor.x - 13, decor.x + 13, decor.y - 14, 3);
          drawGift(ctx, decor.x - 22, decor.y - 1, 0.8, RED, GOLD);
          drawGift(ctx, decor.x - 31, decor.y, 0.65, '#6FB7FF', '#FFFFFF');
          ctx.restore();
          break;
        }
        case 'sign': {
          const direction = decor.direction === 'left' ? -1 : 1;
          const postX = decor.x + direction * 10;
          ctx.save();
          // Dune de neve no pé do poste
          ctx.fillStyle = SNOW;
          ctx.strokeStyle = SNOW_EDGE;
          ctx.lineWidth = 0.8;
          fillEllipse(ctx, postX, decor.y + 3, 9, 3);
          ctx.stroke();
          // Ramo de pinheiro com laço
          ctx.fillStyle = PINE;
          ctx.strokeStyle = OUTLINE;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          addLeaf(ctx, postX + 4, decor.y - 3, 3.6, 1.6, -0.5);
          addLeaf(ctx, postX - 4, decor.y - 9, 3.6, 1.6, Math.PI + 0.5);
          addLeaf(ctx, postX + 4, decor.y - 15, 3.4, 1.5, -0.4);
          ctx.fill();
          ctx.stroke();
          drawBow(ctx, postX + 1, decor.y - 19, 0.8, RED);
          if (P.props >= 3) drawCane(ctx, postX - direction * 9, decor.y + 3, 0.6, direction * 0.15);
          ctx.restore();
          break;
        }
        case 'compost': {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineWidth = 1.8;
          // O vapor aparece mais no frio
          for (let i = 0; i < 2; i++) {
            const phase = reduced ? 0.4 : (t * 0.5 + i * 0.5) % 1;
            const wx = decor.x - 5 + i * 10;
            const wy = decor.y - 28 - phase * 12;
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * (1 - phase)})`;
            ctx.beginPath();
            ctx.moveTo(wx, wy + 6);
            ctx.quadraticCurveTo(wx + 4 * Math.sin(phase * 6 + i), wy + 2, wx + 1.5 * Math.sin(phase * 5), wy - 4);
            ctx.stroke();
          }
          drawSnowCap(ctx, decor.x - 14, decor.x + 14, decor.y - 29, 3);
          drawHolly(ctx, decor.x + 15, decor.y - 27, 0.8);
          ctx.restore();
          break;
        }
        case 'birdbath': {
          ctx.save();
          // Água gelada com brilho e fissuras
          ctx.fillStyle = 'rgba(190, 230, 250, 0.7)';
          fillEllipse(ctx, decor.x - 2, decor.y - 2, 14, 4.2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(decor.x - 9, decor.y - 3); ctx.lineTo(decor.x - 3, decor.y - 1); ctx.lineTo(decor.x + 2, decor.y - 3.4);
          ctx.moveTo(decor.x - 3, decor.y - 1); ctx.lineTo(decor.x - 1, decor.y + 1.2);
          ctx.stroke();
          if (!reduced && P.tier >= 1) {
            ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + decor.x);
            drawGlint(ctx, decor.x + 4, decor.y - 3, 6, '#FFFFFF');
            ctx.globalAlpha = 1;
          }
          ctx.restore();
          drawCardinal(ctx, decor.x + 13, decor.y - 7, t);
          break;
        }
        default:
          break;
      }
    }
  },

  /* Voadores: o "borboleta" vira um floco de neve cintilante; a abelha ganha gorro de Pai Natal. */
  drawAmbient(ctx, type, x, y, phase, color, reducedEffects) {
    const P = cur();
    if (type === 'butterfly') {
      if (!reducedEffects && P.trail) {
        const dots = P.tier >= 2 ? 3 : 2;
        ctx.fillStyle = ICE;
        for (let k = 1; k <= dots; k++) {
          const d = k * 0.18;
          const tx = (Math.sin((phase - d) * 0.7) - Math.sin(phase * 0.7)) * 45;
          const ty = (Math.cos((phase - d) * 0.5) - Math.cos(phase * 0.5)) * 35;
          ctx.globalAlpha = 0.45 / k;
          ctx.beginPath();
          ctx.arc(x + tx, y + ty, 1.6 - k * 0.25, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      const pulse = reducedEffects ? 1 : 0.88 + 0.12 * Math.sin(phase * 3);
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(200, 235, 255, 0.28)';
      ctx.beginPath();
      ctx.arc(0, 0, 11 * pulse, 0, TAU);
      ctx.fill();
      ctx.rotate(reducedEffects ? 0.3 : phase * 0.9);
      ctx.scale(0.45 * pulse, 0.45 * pulse);
      const flakeB = getFlakeSprite('fly', 5.2, 3, '#FFFFFF');
      if (flakeB) {
        blit(ctx, flakeB, 0, 0, 1);
      } else {
        ctx.lineCap = 'round';
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 5.2;
        strokeSnowflake(ctx);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        strokeSnowflake(ctx);
      }
      ctx.fillStyle = color || ICE;
      ctx.beginPath();
      ctx.arc(0, 0, 4.2, 0, TAU);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Abelha de gorro
    if (!reducedEffects && P.trail) {
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

    ctx.fillStyle = 'rgba(220, 245, 255, 0.75)';
    ctx.strokeStyle = 'rgba(27, 77, 60, 0.5)';
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
    ctx.fillStyle = '#2A2540';
    ctx.fillRect(-1.6, -3.1, 1.5, 6.2);
    ctx.fillRect(1.4, -3, 1.5, 6);
    ctx.beginPath();
    ctx.arc(5.3, 0, 2, 0, TAU);
    ctx.fill();
    drawSantaHat(ctx, 5.2, -1.4, 0.42, -0.4);
    ctx.restore();
  },

  // Flores prontas ou não: uma tampa de neve e um brilho de gelo
  drawFlowerAccent(ctx, flowerConfig, progress, reducedEffects) {
    if (progress < 0.6) return;
    const P = cur();
    const r = flowerConfig.radius || 8;
    const cap = makeSprite('cap|' + r.toFixed(1), -r - 2, -r - 2, r + 2, 2, (g) => paintFlowerCap(g, r));
    if (cap) {
      blit(ctx, cap, 0, 0, 1);
    } else {
      ctx.save();
      paintFlowerCap(ctx, r);
      ctx.restore();
    }

    if (P.tier >= 1 && !reducedEffects) {
      const prev = ctx.globalAlpha;
      ctx.globalAlpha = 0.4 + 0.6 * Math.max(0, Math.sin(fx.time * 2.4 + r));
      drawGlint(ctx, r * 0.42, -r * 0.18, r * 0.9, '#FFFFFF');
      const id = flowerConfig.id;
      if (P.tier >= 2 && (id === 'daisy' || id === 'sunflower' || id === 'dahlia' || id === 'chrysanthemum')) {
        ctx.globalAlpha = 0.4 + 0.6 * Math.max(0, Math.sin(fx.time * 2.4 + r + 2));
        drawGlint(ctx, -r * 0.4, -r * 0.1, r * 0.7, ICE);
      }
      ctx.globalAlpha = prev;
    }
  },

  /* A Estrela de Natal: floco de neve a girar, estrela dourada ao centro e faíscas.
     Devolve true para substituir o indicador padrão. */
  drawReadyFlower(ctx, x, y, pulse, reducedEffects) {
    const P = cur();
    const t = fx.time;
    const radius = reducedEffects ? 17 : 17 + pulse * 2.5;
    ctx.save();
    ctx.translate(x, y);

    // Halo
    if (P.ready >= 2) {
      const sprite = getGlowSprite();
      if (sprite) {
        ctx.globalAlpha = 0.55 + 0.25 * pulse;
        ctx.drawImage(sprite, -radius * 1.9, -radius * 1.9, radius * 3.8, radius * 3.8);
        ctx.globalAlpha = 1;
      }
    }
    ctx.fillStyle = 'rgba(255, 236, 170, 0.22)';
    ctx.beginPath();
    ctx.arc(0, 0, radius + 4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(225, 242, 255, 0.28)';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(27, 77, 60, 0.85)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Anel que se expande (Ultra)
    if (P.ready >= 2 && !reducedEffects) {
      const phase = (t * 0.8) % 1;
      ctx.globalAlpha = 0.5 * (1 - phase);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, radius + phase * 14, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Floco de neve a girar devagar
    const scale = radius / 20;
    ctx.save();
    ctx.rotate(reducedEffects ? 0.2 : t * 0.45);
    const flakeR = getFlakeSprite('ready', 4.2, 2.4, '#F7FBFF');
    if (flakeR) {
      blit(ctx, flakeR, 0, 0, scale);
    } else {
      ctx.scale(scale, scale);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 4.2;
      strokeSnowflake(ctx);
      ctx.strokeStyle = '#F7FBFF';
      ctx.lineWidth = 2.4;
      strokeSnowflake(ctx);
    }
    ctx.restore();

    // Centro: estrela dourada (ou pontinho no modo simples)
    if (P.ready >= 1) {
      drawStar5(ctx, 0, 0, radius * 0.36, reducedEffects ? 0 : -t * 0.9, GOLD, true);
    } else {
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.2, 0, TAU);
      ctx.fill();
    }

    // Enfeites em órbita (Ultra)
    if (P.ready >= 2 && !reducedEffects) {
      for (let c = 0; c < 3; c++) {
        const a = t * 1.1 + (c * TAU) / 3;
        ctx.fillStyle = LIGHT_COLORS[c];
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (radius + 5), Math.sin(a) * (radius + 5) * 0.55, 1.9, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Faíscas a subir
    if (!reducedEffects && P.ready >= 1) {
      const sparks = P.ready >= 2 ? 6 : 3;
      ctx.fillStyle = '#FFF4C2';
      for (let k = 0; k < sparks; k++) {
        const phase = (t * 0.7 + hash(x * 0.13 + k) * 3 + k * 0.33) % 1;
        ctx.globalAlpha = (1 - phase) * 0.9;
        ctx.beginPath();
        ctx.arc(Math.sin(phase * 6 + k * 2) * 8, -phase * 28, 1.4 * (1 - phase * 0.4), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return true;
  },

  // Gorro de Pai Natal no jogador
  drawPlayerAccessory(ctx, x, y, bounce, isSeated) {
    ctx.save();
    ctx.translate(x + 10, (isSeated ? -24 : -21) - bounce);
    drawSantaHat(ctx, 0, 0, 1, 0.3);
    ctx.restore();
  },

  // Clientes: gorro, azevinho ou laço com sininho
  drawCustomerAccessory(ctx, variant, bounce) {
    const side = variant % 2 === 0 ? -7 : 7;
    const kind = variant % 3;
    ctx.save();
    ctx.translate(side, -23 - bounce);
    if (kind === 0) {
      drawSantaHat(ctx, 0, 0, 0.85, side < 0 ? -0.3 : 0.3);
    } else if (kind === 1) {
      drawHolly(ctx, 0, 0, 1);
    } else {
      drawBow(ctx, 0, 0, 0.9, variant % 2 ? GOLD : RED);
      ctx.fillStyle = GOLD;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(0, 6.6, 1.6, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
});