import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { extractPrecacheAssets, validateContent } from '../scripts/validate-content.mjs';
import { FLOWERS_CONFIG, FLOWER_ORDER } from '../js/config/flowers.js';
import { assetManager } from '../js/assets.js';
import { getCanvasPixelRatio } from '../js/utils.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('current game content passes cross-reference and value validation', () => {
  assert.deepEqual(validateContent(), []);
});

test('lavender and peony remain in their original progression positions', () => {
  assert.deepEqual(FLOWER_ORDER.slice(5, 7), ['lavender', 'peony']);
  assert.equal(FLOWERS_CONFIG.lavender.requiredLevel, 10);
  assert.equal(FLOWERS_CONFIG.peony.requiredLevel, 12);
});

test('all 15 expansion flowers are configured and ordered after the original catalogue', () => {
  const expansionFlowerIds = [
    'camellia', 'iris', 'jasmine', 'gardenia', 'anemone',
    'dahlia', 'chrysanthemum', 'foxglove', 'verbena', 'hydrangea',
    'lotus', 'magnolia', 'protea', 'ranunculus', 'alstroemeria'
  ];

  assert.equal(FLOWER_ORDER.length, 22);
  assert.deepEqual(FLOWER_ORDER.slice(7), expansionFlowerIds);
  assert.deepEqual(
    expansionFlowerIds.map((id) => FLOWERS_CONFIG[id].requiredLevel),
    [14, 16, 17, 18, 19, 21, 22, 23, 24, 25, 28, 29, 30, 31, 32]
  );
  for (const id of expansionFlowerIds) {
    const flower = FLOWERS_CONFIG[id];
    assert.equal(flower.unlockedByDefault, false);
    assert.ok(flower.name);
    assert.ok(flower.shortDescription);
    assert.ok(flower.growthTime > 0);
    assert.ok(flower.value > 0);
    assert.ok(flower.plotBaseCost > 0);
  }
});

test('every flower has a valid, unique display color and symbol', () => {
  const flowers = FLOWER_ORDER.map((id) => FLOWERS_CONFIG[id]);
  assert.ok(flowers.every((flower) => /^#[\da-f]{6}$/i.test(flower.color)));
  assert.ok(flowers.every((flower) => typeof flower.icon === 'string' && flower.icon.trim()));
  assert.equal(new Set(flowers.map((flower) => flower.color.toLowerCase())).size, flowers.length);
  assert.equal(new Set(flowers.map((flower) => flower.icon)).size, flowers.length);
});

test('canvas pixel ratio sharpens high-density screens without unbounded backing stores', () => {
  assert.equal(getCanvasPixelRatio(390, 844, 3), 2);
  assert.equal(getCanvasPixelRatio(1206, 890, 1), 1);
  assert.ok(getCanvasPixelRatio(3840, 2160, 2) <= 1.02);
  assert.equal(getCanvasPixelRatio(390, 844, 0), 1);
  assert.throws(() => getCanvasPixelRatio(0, 844, 2), RangeError);
});

test('stock symbols render botanical shapes from each flower config without text glyphs', () => {
  const calls = [];
  const context = {
    save() {},
    restore() {},
    translate() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fill() {},
    ellipse() { calls.push('ellipse'); },
    arc() { calls.push('center'); }
  };

  for (const flowerId of FLOWER_ORDER) {
    calls.length = 0;
    const flower = FLOWERS_CONFIG[flowerId];
    assetManager.drawFlowerSymbol(context, 0, 0, flower);
    assert.ok(calls.filter((call) => call === 'ellipse').length >= flower.petals);
    assert.ok(calls.includes('center'));
  }
});

test('new save migration module is present in the source offline precache', () => {
  const serviceWorker = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert.ok(extractPrecacheAssets(serviceWorker).includes('./js/save-migrations.mjs'));
});
