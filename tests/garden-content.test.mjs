import assert from 'node:assert/strict';
import test from 'node:test';
import { FLOWER_ORDER } from '../js/config/flowers.js';
import { CUSTOMER_CONFIG } from '../js/config/customers.js';

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

function unlockZones(state) {
  state.level = 8;
  state.stats.totalHarvested = 100;
  state.stats.customersServed = 15;
  state.stats.totalCoinsEarned = 1000;
  state.stats.bouquetsCrafted = 8;
  state.orderCycle = 4;
  for (const flowerId of FLOWER_ORDER) {
    state.collection.harvestedFlowers[flowerId] = true;
  }
}

test('flower mastery exposes visual-only milestones derived from herbarium records', () => {
  const state = new GameState();
  state.collection.flowerRecords.daisy = { harvested: 1, sold: 0, usedInBouquets: 0 };
  let mastery = state.getFlowerMastery('daisy');
  assert.equal(mastery.completed, 1);
  assert.equal(mastery.milestones[0].title, 'Primeira florada');
  assert.equal(mastery.milestones[0].complete, true);
  assert.equal(mastery.milestones[1].complete, false);

  state.collection.flowerRecords.daisy = { harvested: 15, sold: 10, usedInBouquets: 8 };
  mastery = state.getFlowerMastery('daisy');
  assert.equal(mastery.completed, mastery.total);
  assert.equal(mastery.milestones.at(-1).title, 'Especialista botânica');
  assert.equal(state.getFlowerMastery('unknown'), null);
});

test('special visitors can be recorded once and persist without changing the economy', () => {
  localStorage.clear();
  const state = new GameState();
  const initialCoins = state.coins;
  const visitorId = CUSTOMER_CONFIG.specialVisitors[0].id;
  assert.equal(state.recordSpecialVisitor('unknown-visitor'), false);
  assert.equal(state.recordSpecialVisitor(visitorId), true);
  assert.equal(state.recordSpecialVisitor(visitorId), false);
  assert.equal(state.coins, initialCoins);

  const restored = new GameState();
  assert.ok(restored.load());
  assert.deepEqual(restored.specialVisitors, [visitorId]);
});

test('zone discoveries require unlock, persist, and complete independently per zone', () => {
  localStorage.clear();
  const state = new GameState();
  const greenhouse = state.getZoneActivities().find((zone) => zone.id === 'greenhouse');
  const firstFinding = greenhouse.findings[0];
  assert.equal(state.discoverZoneFinding(greenhouse.id, firstFinding.id), false);

  unlockZones(state);
  assert.equal(state.discoverZoneFinding(greenhouse.id, firstFinding.id), true);
  assert.equal(state.discoverZoneFinding(greenhouse.id, firstFinding.id), false);
  for (const finding of greenhouse.findings.slice(1)) {
    assert.equal(state.discoverZoneFinding(greenhouse.id, finding.id), true);
  }
  assert.equal(state.getZoneActivities().find((zone) => zone.id === greenhouse.id).complete, true);
  assert.equal(state.getZoneActivities().find((zone) => zone.id === 'night-garden').complete, false);

  const restored = new GameState();
  assert.ok(restored.load());
  assert.equal(restored.getZoneActivities().find((zone) => zone.id === greenhouse.id).complete, true);
});

test('garden decoration positions persist only for movable items and valid map coordinates', () => {
  localStorage.clear();
  const state = new GameState();
  assert.equal(state.setGardenDecorationPosition(0, 520, 410), true);
  assert.equal(state.setGardenDecorationPosition(7, 300, 300), false);
  assert.equal(state.setGardenDecorationPosition(0, -1, 410), false);

  const restored = new GameState();
  assert.ok(restored.load());
  assert.deepEqual(restored.gardenDecorations[0], { x: 520, y: 410 });
  assert.equal(restored.gardenDecorations[7], undefined);
});
