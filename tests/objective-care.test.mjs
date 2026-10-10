import assert from 'node:assert/strict';
import test from 'node:test';
import { FLOWERS_CONFIG } from '../js/config/flowers.js';

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

test('favorite challenges, projects, and collections expose a useful next step and persist', () => {
  localStorage.clear();
  const state = new GameState();
  const challenge = state.getChallenges().daily[0];
  assert.equal(state.setFavoriteObjective('challenge', challenge.id), true);
  assert.equal(state.getTrackedObjective().title, challenge.title);
  assert.equal(state.getTrackedObjective().nextStep, challenge.progressText);

  state.stats[challenge.metric] += 2;
  assert.equal(state.getTrackedObjective().progress, 2);
  assert.equal(state.setFavoriteObjective('project', 'greenhouse'), true);
  assert.equal(state.getTrackedObjective().title, 'Restaurar a estufa');
  assert.match(state.getTrackedObjective().nextStep, /Flores colhidas/);

  assert.equal(state.setFavoriteObjective('collection', 'spring-bloom'), true);
  assert.match(state.getTrackedObjective().nextStep, /Colhe Margarida/);
  assert.equal(state.save(), true);

  const restored = new GameState();
  assert.ok(restored.load());
  assert.deepEqual(restored.favoriteObjective, { type: 'collection', id: 'spring-bloom' });
  assert.match(restored.getTrackedObjective().nextStep, /Colhe Margarida/);
});

test('favorite objective can be cleared, and invalid targets are rejected', () => {
  const state = new GameState();
  assert.equal(state.setFavoriteObjective('project', 'unknown-project'), false);
  assert.equal(state.setFavoriteObjective('collection', 'unknown-collection'), false);
  assert.equal(state.setFavoriteObjective(null, null), false);
  assert.equal(state.setFavoriteObjective('project', 'greenhouse'), true);
  assert.equal(state.setFavoriteObjective(null, null), true);
  assert.equal(state.getTrackedObjective(), null);
});

test('watering briefly speeds growth, has a per-plot cooldown, and persists safely', () => {
  localStorage.clear();
  const state = new GameState();
  const plot = state.plots.find((entry) => entry.id === 0);
  const lockedPlot = state.plots.find((entry) => !entry.unlocked);
  const now = Date.now();

  assert.equal(state.waterPlot(lockedPlot.id, now), false);
  assert.equal(state.waterPlot(plot.id, now), true);
  assert.equal(state.getPlotGrowthMultiplier(plot, now + 59_999), 1.15);
  assert.equal(state.getPlotGrowthMultiplier(plot, now + 60_000), 1);
  assert.deepEqual(state.getPlotWaterStatus(plot, now + 60_000), {
    active: false,
    available: false,
    cooldownRemainingMs: 120_000
  });
  assert.equal(state.waterPlot(plot.id, now + 60_000), false);
  assert.equal(state.waterPlot(plot.id, now + 180_000), true);

  const saved = new GameState();
  assert.ok(saved.load());
  const restoredPlot = saved.plots.find((entry) => entry.id === plot.id);
  assert.equal(restoredPlot.wateredAt, now + 180_000);
  assert.equal(restoredPlot.wateredUntil, now + 240_000);
});

test('plot care applies only a modest boost to active flower growth', async () => {
  const { FieldManager } = await import('../js/entities/field.js');
  const state = new GameState();
  const plot = state.plots.find((entry) => entry.id === 0);
  const now = Date.now();
  assert.equal(state.waterPlot(plot.id, now), true);
  plot.flowers[0].progress = 0;

  const field = new FieldManager(state, {}, {});
  field.update(1);
  const duration = FLOWERS_CONFIG[plot.flowerId].growthTime * state.getGrowthTimeMultiplier();
  assert.ok(Math.abs(plot.flowers[0].progress - (1 * 1.15 / duration)) < 0.000001);
});

test('harvest workers scan cached ready flowers and honor stock-priority flowers', async () => {
  const { FieldManager } = await import('../js/entities/field.js');
  const state = new GameState();
  const nearestPlot = state.plots.find((entry) => entry.id === 0);
  const priorityPlot = state.plots.find((entry) => entry.id === 1);
  nearestPlot.flowers.forEach((flower) => { flower.progress = 1; });
  priorityPlot.unlocked = true;
  priorityPlot.flowerId = 'tulip';
  priorityPlot.flowers.forEach((flower) => { flower.progress = 1; });

  const field = new FieldManager(state, {}, {});
  field.update(0);
  const nearestRegular = field.findNearestReadyFlower(
    436,
    204,
    () => true
  );
  const nearestWithPriority = field.findNearestReadyFlower(
    436,
    204,
    () => true,
    (flowerId) => flowerId === 'tulip'
  );

  assert.equal(nearestRegular.plot, nearestPlot);
  assert.equal(nearestWithPriority.plot, priorityPlot);

  priorityPlot.flowerId = 'rose';
  field.update(0);
  assert.equal(
    field.findNearestReadyFlower(436, 204, () => true, (flowerId) => flowerId === 'rose').plot,
    priorityPlot
  );
});
