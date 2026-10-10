import assert from 'node:assert/strict';
import test from 'node:test';
import { HUD_CUSTOMIZABLE_ITEMS, normalizeHudLayout } from '../js/ui/hud-customizer.js';

test('HUD customization exposes independently movable and resizable interface items', () => {
  assert.ok(HUD_CUSTOMIZABLE_ITEMS.length >= 10);
  assert.equal(new Set(HUD_CUSTOMIZABLE_ITEMS.map(({ id }) => id)).size, HUD_CUSTOMIZABLE_ITEMS.length);
  assert.ok(HUD_CUSTOMIZABLE_ITEMS.every(({ label, selector }) => label && selector));
  assert.ok(HUD_CUSTOMIZABLE_ITEMS.some(({ id }) => id === 'favorite-objective'));
});

test('saved HUD positions are validated and size remains inside supported limits', () => {
  assert.deepEqual(normalizeHudLayout({
    coins: { x: 0, y: 1, scale: 3 },
    level: { x: 0.4, y: 0.6, scale: 0.25 },
    basket: { x: 2, y: 0.5, scale: 1 },
    map: { x: 0.5, y: Number.NaN, scale: 1 }
  }), {
    coins: { x: 0, y: 1, scale: 1.6 },
    level: { x: 0.4, y: 0.6, scale: 0.65 }
  });
  assert.deepEqual(normalizeHudLayout(null), {});
});
