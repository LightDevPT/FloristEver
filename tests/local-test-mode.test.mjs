import assert from 'node:assert/strict';
import test from 'node:test';
import { FLOWER_ORDER } from '../js/config/flowers.js';
import { UPGRADES_CONFIG } from '../js/config/upgrades.js';
import { applyLocalFullTestProfile, isLocalFullTestMode } from '../js/ui/developer-tools.js';

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

globalThis.localStorage = new MemoryStorage();
const { GameState } = await import('../js/state.js');

test('full test mode is limited to the explicit local-server flag', () => {
  assert.equal(isLocalFullTestMode({ hostname: 'localhost', search: '?testMode=full' }), true);
  assert.equal(isLocalFullTestMode({ hostname: '127.0.0.1', search: '?testMode=full' }), true);
  assert.equal(isLocalFullTestMode({ hostname: 'floristever.example', search: '?testMode=full' }), false);
  assert.equal(isLocalFullTestMode({ hostname: 'localhost', search: '' }), false);
});

test('test profile unlocks all flower plots, upgrades, and zones without saving', () => {
  const state = new GameState();
  state.sessionOnlyMode = true;

  applyLocalFullTestProfile(state);

  assert.equal(state.coins, 1_000_000);
  assert.ok(state.plots.every((plot) => plot.unlocked));
  assert.ok(FLOWER_ORDER.every((flowerId) => (
    state.unlockedFlowers[flowerId] && state.getOwnedPlotCount(flowerId) >= 2
  )));
  assert.ok(Object.entries(UPGRADES_CONFIG).every(([upgradeId, upgrade]) => (
    state.upgrades[upgradeId] === upgrade.maxLevel
  )));
  assert.ok(state.getLongTermProjects().every((project) => project.unlocked));
  assert.equal(state.basket.length, state.getBasketCapacity());
  assert.equal(state.save(), true);
  assert.equal(globalThis.localStorage.values.size, 0);
});
