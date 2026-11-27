const WIDTH = 680;
const HEIGHT = 520;
const BASE_X = 340;
const BASE_Y = 472;
const RESOLUTION = 2;

let cache = null;

export const BETA_STATUE_SCALE = 0.45;

function paintStatic(ctx) {
  const roundedRect = (x, y, width, height, radius, fill, stroke, lineWidth = 1.5) => {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  };
  const ellipse = (cx, cy, rx, ry, rotation, fill, stroke, alpha = 1) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, rotation, 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  };
  const path = (data, fill, stroke, lineWidth = 1.5) => {
    const shape = new Path2D(data);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill(shape);
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke(shape);
    }
  };
  const text = (value, x, y, font, color) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(value, x, y);
  };
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const font = "'Trebuchet MS', system-ui, sans-serif";

  ellipse(340, 480, 170, 16, 0, '#000', null, 0.16);

  roundedRect(195, 426, 290, 46, 4, '#9AA0AC', '#5E6472');
  roundedRect(195, 426, 290, 9, 3, '#B9BEC8');
  roundedRect(300, 440, 80, 22, 11, '#D9A93F', '#8F6A16');
  text('Beta 2026', 340, 455, `bold 12px ${font}`, '#3A2A08');

  roundedRect(232, 302, 216, 126, 0, '#AEB3BE', '#5E6472');
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#8E94A0';
  ctx.fillRect(428, 302, 20, 126);
  ctx.restore();
  roundedRect(250, 322, 180, 88, 4, '#3E4350', '#262A33');
  roundedRect(256, 328, 168, 76, 3, null, '#D9A93F');
  text('Obrigado, beta tester', 340, 352, `bold 14px ${font}`, '#EBCB75');
  text('por cuidares do jardim', 340, 374, `12px ${font}`, '#CDD1DA');
  text('desde o primeiro dia', 340, 390, `12px ${font}`, '#CDD1DA');

  roundedRect(218, 284, 244, 20, 3, '#BCC1CB', '#5E6472');
  ellipse(236, 428, 22, 6, 0, '#86A872', null, 0.8);
  ellipse(452, 472, 26, 6, 0, '#86A872', null, 0.8);

  path('M340 268 C340 230 340 190 340 152', null, '#7F9F86', 7);
  ellipse(316, 216, 9, 22, radians(-50), '#8FB096', '#56765E');
  ellipse(364, 200, 9, 22, radians(50), '#8FB096', '#56765E');

  path('M288 286 C260 282 250 250 272 230 C280 248 302 264 340 268 L340 286 Z', '#B4B9C4', '#5E6472');
  path('M392 286 C420 282 430 250 408 230 C400 248 378 264 340 268 L340 286 Z', '#B4B9C4', '#5E6472');
  path('M276 246 Q286 252 292 266 M286 240 Q296 248 302 262 M268 238 Q274 244 278 254', null, '#7B8190');
  path('M404 246 Q394 252 388 266 M394 240 Q384 248 378 262 M412 238 Q406 244 402 254', null, '#7B8190');

  for (const angle of [0, 72, 144, 216, 288]) {
    ctx.save();
    ctx.translate(340, 152);
    ctx.rotate(radians(angle));
    ctx.beginPath();
    ctx.ellipse(0, -30, 16, 31, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#E8C468';
    ctx.fill();
    ctx.strokeStyle = '#9C7A1F';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
  ellipse(340, 152, 17, 17, 0, '#F6E2A0', '#9C7A1F');
  path(
    'M340 148 C335 140 325 144 329 151 C331 155 337 158 340 162 C343 158 349 155 351 151 C355 144 345 140 340 148 Z',
    '#D4505F',
    '#8E2A37',
    1
  );
}

function buildCache() {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * RESOLUTION;
  canvas.height = HEIGHT * RESOLUTION;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível criar a imagem da estátua BETA.');
  ctx.scale(RESOLUTION, RESOLUTION);
  paintStatic(ctx);
  return canvas;
}

const SPARKLES = [
  { x: 286, y: 128, r: 14, phase: 0 },
  { x: 396, y: 104, r: 11, phase: 1.7 },
  { x: 384, y: 193, r: 10, phase: 3.1 },
  { x: 296, y: 182, r: 8, phase: 4.6 }
];

function drawStar(ctx, x, y, radius) {
  const curve = radius * 0.28;
  ctx.beginPath();
  ctx.moveTo(x, y - radius);
  ctx.quadraticCurveTo(x + curve, y - curve, x + radius, y);
  ctx.quadraticCurveTo(x + curve, y + curve, x, y + radius);
  ctx.quadraticCurveTo(x - curve, y + curve, x - radius, y);
  ctx.quadraticCurveTo(x - curve, y - curve, x, y - radius);
  ctx.fill();
}

export function drawBetaStatue(
  ctx,
  x,
  y,
  { scale = BETA_STATUE_SCALE, time = performance.now() / 1000 } = {}
) {
  cache ||= buildCache();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(-BASE_X, -BASE_Y);
  ctx.drawImage(cache, 0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#F6E2A0';
  for (const sparkle of SPARKLES) {
    const intensity = 0.5 + 0.5 * Math.sin(time * 2.2 + sparkle.phase);
    ctx.globalAlpha = 0.35 + 0.65 * intensity;
    drawStar(ctx, sparkle.x, sparkle.y, sparkle.r * (0.7 + 0.3 * intensity));
  }
  ctx.restore();
}

export function betaStatueHitbox(x, y, scale = BETA_STATUE_SCALE) {
  return {
    x: x - 150 * scale,
    y: y - 384 * scale,
    w: 300 * scale,
    h: 392 * scale
  };
}

export function isBetaTester(user) {
  return Array.isArray(user?.tags) && user.tags.includes('BETA');
}
