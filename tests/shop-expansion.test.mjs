import assert from 'node:assert/strict';
import test from 'node:test';
import { getShopExpansionVisualSize, UPGRADES_CONFIG } from '../js/config/upgrades.js';
import { UPGRADE_CATEGORIES } from '../js/ui/shop.js';

test('every upgrade belongs to a visible, named category', () => {
  const categoryIds = new Set(UPGRADE_CATEGORIES.map(({ id }) => id));
  const upgradeIds = Object.keys(UPGRADES_CONFIG);

  assert.ok(UPGRADE_CATEGORIES.length > 1);
  assert.ok(UPGRADE_CATEGORIES.every(({ title, description, icon }) => title && description && icon));
  assert.ok(upgradeIds.every((id) => categoryIds.has(UPGRADES_CONFIG[id].category)));
});

test('shop expansion produces a cumulative, visible footprint increase at each upgrade level', () => {
  assert.deepEqual(getShopExpansionVisualSize(0), { width: 200, height: 130 });
  assert.deepEqual(getShopExpansionVisualSize(1), { width: 250, height: 150 });
  assert.deepEqual(getShopExpansionVisualSize(2), { width: 300, height: 174 });
  assert.deepEqual(getShopExpansionVisualSize(3), { width: 340, height: 196 });
  for (let level = 0; level < UPGRADES_CONFIG.shopExpansion.maxLevel; level++) {
    const current = getShopExpansionVisualSize(level);
    const next = getShopExpansionVisualSize(level + 1);
    assert.ok(next.width > current.width);
    assert.ok(next.height > current.height);
  }
});

test('shop expansion descriptions disclose visual dimensions and stock capacity', () => {
  const upgrade = UPGRADES_CONFIG.shopExpansion;
  assert.match(upgrade.nextEffectDesc(0), /200×130 para 250×150/);
  assert.match(upgrade.nextEffectDesc(2), /60 para 80 unidades/);
  assert.match(upgrade.effectDesc(3), /340×196/);
  assert.throws(() => getShopExpansionVisualSize(4), RangeError);
});
