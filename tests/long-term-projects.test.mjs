import assert from 'node:assert/strict';
import test from 'node:test';
import { FLOWER_ORDER } from '../js/config/flowers.js';

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

globalThis.localStorage = new MemoryStorage();
const { GameState } = await import('../js/state.js');

function meetProjectRequirements(state) {
  state.stats.totalHarvested = 100;
  state.stats.customersServed = 15;
  state.stats.totalCoinsEarned = 1000;
  state.stats.bouquetsCrafted = 8;
  state.orderCycle = 4;
  state.level = 8;
  for (const flowerId of FLOWER_ORDER) {
    state.collection.harvestedFlowers[flowerId] = true;
  }
}

test('long-term zones stay locked until their cumulative goals and prerequisites are met', () => {
  const state = new GameState();
  const [greenhouse, nightGarden] = state.getLongTermProjects();
  assert.equal(greenhouse.unlocked, false);
  assert.equal(nightGarden.unlocked, false);

  meetProjectRequirements(state);
  for (const flowerId of FLOWER_ORDER.slice(4)) {
    state.collection.harvestedFlowers[flowerId] = false;
  }
  assert.equal(state.getLongTermProjects()[0].unlocked, false);
  state.collection.harvestedFlowers[FLOWER_ORDER[4]] = true;
  const [restoredGreenhouse, lockedNightGarden] = state.getLongTermProjects();
  assert.equal(restoredGreenhouse.unlocked, true);
  assert.equal(lockedNightGarden.unlocked, false);
  for (const flowerId of FLOWER_ORDER) {
    state.collection.harvestedFlowers[flowerId] = true;
  }
  assert.equal(state.getLongTermProjects()[1].unlocked, true);

  state.level = 1;
  assert.equal(state.getLongTermProjects()[0].unlocked, false);
});

test('long-term project progress is derived from data preserved in the save', () => {
  localStorage.clear();
  const state = new GameState();
  meetProjectRequirements(state);
  assert.equal(state.save(), true);

  const restored = new GameState();
  assert.ok(restored.load());
  const [greenhouse, nightGarden] = restored.getLongTermProjects();
  assert.equal(greenhouse.unlocked, true);
  assert.equal(nightGarden.unlocked, true);
});
