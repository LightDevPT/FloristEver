import assert from 'node:assert/strict';
import test from 'node:test';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};

const [{ GameState }, { BouquetWorkerManager }, { calculateBouquetHarmony }] = await Promise.all([
  import('../js/state.js'),
  import('../js/entities/bouquet-worker.js'),
  import('../js/config/bouquets.js')
]);
const { FLOWER_ORDER } = await import('../js/config/flowers.js');

test('bouquet price multiplier rewards adding different flower species', () => {
  const oneSpecies = calculateBouquetHarmony(['daisy', 'daisy', 'daisy']);
  const twoSpecies = calculateBouquetHarmony(['daisy', 'daisy', 'tulip']);
  const threeSpecies = calculateBouquetHarmony(['daisy', 'tulip', 'sunflower']);

  assert.ok(twoSpecies.valueMultiplier > oneSpecies.valueMultiplier);
  assert.ok(threeSpecies.valueMultiplier > twoSpecies.valueMultiplier);
  assert.equal(threeSpecies.valueMultiplier, 1.3);
});

test('stock board shows all unlocked and stocked flowers plus the next progression flower', () => {
  storage.clear();
  const state = new GameState();
  assert.deepEqual(state.getShopStockBoardFlowerIds(), ['daisy', 'tulip']);

  state.unlockedFlowers.tulip = true;
  assert.deepEqual(state.getShopStockBoardFlowerIds(), ['daisy', 'tulip', 'sunflower']);

  state.unlockedFlowers.sunflower = true;
  state.unlockedFlowers.rose = true;
  state.unlockedFlowers.orchid = true;
  state.stock.peony = 2;
  assert.deepEqual(state.getShopStockBoardFlowerIds(), [
    'daisy',
    'tulip',
    'sunflower',
    'rose',
    'orchid',
    'lavender',
    'peony'
  ]);
});

test('new flower species are available in game progression and persisted collection', () => {
  storage.clear();
  const state = new GameState();
  assert.deepEqual(Object.keys(state.stock), FLOWER_ORDER);
  assert.equal(state.unlockedFlowers.lavender, false);
  assert.equal(state.unlockedFlowers.peony, false);
  assert.equal(state.unlockedFlowers.camellia, false);
  state.unlockedFlowers.camellia = true;
  assert.equal(state.addToBasket('camellia'), true);
  assert.equal(state.collection.harvestedFlowers.camellia, true);
  state.save();

  const restored = new GameState();
  assert.ok(restored.load());
  assert.equal(restored.collection.harvestedFlowers.camellia, true);
});

test('expansion flowers unlock in order only after the level and previous-flower requirements', () => {
  storage.clear();
  const state = new GameState();
  state.level = 14;
  state.coins = 1_000_000;
  state.plots = FLOWER_ORDER.slice(0, 7).flatMap((flowerId, index) => {
    state.unlockedFlowers[flowerId] = true;
    return [0, 1].map((gridY) => ({
      id: index * 2 + gridY,
      flowerId,
      unlocked: true,
      cost: 0,
      gridX: index % 4,
      gridY: Math.floor(index / 4) * 2 + gridY,
      flowers: Array.from({ length: 6 }, () => ({ progress: 0.5, timer: 0 }))
    }));
  });

  assert.equal(state.getAvailableFlowerForLevel(), 'camellia');
  state.ensureNextPlot();
  let nextPlot = state.plots.find((plot) => !plot.unlocked && !plot.optional);
  assert.equal(nextPlot.flowerId, 'camellia');
  assert.equal(state.unlockPlot(nextPlot.id), true);
  nextPlot = state.plots.find((plot) => !plot.unlocked && !plot.optional);
  assert.equal(nextPlot.flowerId, 'camellia');
  assert.equal(state.unlockPlot(nextPlot.id), true);
  assert.equal(state.unlockedFlowers.camellia, true);
  assert.equal(state.getAvailableFlowerForLevel(), null);

  state.level = 16;
  state.ensureNextPlot();
  nextPlot = state.plots.find((plot) => !plot.unlocked && !plot.optional);
  assert.equal(nextPlot.flowerId, 'iris');
});

test('existing garden plots are compacted into eight-column rows when loading a save', () => {
  storage.clear();
  const state = new GameState();
  state.plots = Array.from({ length: 10 }, (_, index) => ({
    id: index,
    flowerId: 'daisy',
    unlocked: true,
    optional: false,
    cost: 0,
    gridX: index % 4,
    gridY: Math.floor(index / 4),
    flowers: Array.from({ length: 6 }, () => ({ progress: 0.5, timer: 0 }))
  }));
  state.level = 2;
  assert.equal(state.save(), true);

  const restored = new GameState();
  assert.ok(restored.load());
  const unlockedPlots = restored.plots
    .filter((plot) => plot.unlocked)
    .sort((first, second) => first.id - second.id);
  assert.deepEqual(
    unlockedPlots.map(({ gridX, gridY }) => [gridX, gridY]),
    [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [0, 1], [1, 1]]
  );
  assert.equal(restored.plots.find((plot) => !plot.unlocked).gridX, 2);
  assert.equal(restored.plots.find((plot) => !plot.unlocked).gridY, 1);
});

test('mobile control layout and sizes persist with game settings', () => {
  storage.clear();
  const state = new GameState();
  assert.equal(state.settings.mobileControlLayout, 'left');
  assert.equal(state.settings.mobileMoveControlSize, 'standard');
  assert.equal(state.settings.mobileActionControlSize, 'standard');

  state.settings.mobileControlLayout = 'right';
  state.settings.mobileMoveControlSize = 'large';
  state.settings.mobileActionControlSize = 'small';
  assert.equal(state.save(), true);

  const restored = new GameState();
  assert.ok(restored.load());
  assert.equal(restored.settings.mobileControlLayout, 'right');
  assert.equal(restored.settings.mobileMoveControlSize, 'large');
  assert.equal(restored.settings.mobileActionControlSize, 'small');
});

test('compost disposal removes only selected basket flowers without changing economy or stock', () => {
  storage.clear();
  const state = new GameState();
  state.basket = ['daisy', 'rose', 'daisy', 'tulip'];
  state.stock.daisy = 3;
  state.coins = 725;
  const originalStats = structuredClone(state.stats);

  assert.equal(state.discardBasketFlowers({ daisy: 1, rose: 1 }), 2);
  assert.deepEqual(state.basket, ['daisy', 'tulip']);
  assert.equal(state.stock.daisy, 3);
  assert.equal(state.coins, 725);
  assert.deepEqual(state.stats, originalStats);
  const restored = new GameState();
  assert.ok(restored.load());
  assert.deepEqual(restored.basket, ['daisy', 'tulip']);
});

test('compost disposal rejects invalid or unavailable quantities without changing the basket', () => {
  storage.clear();
  const state = new GameState();
  state.basket = ['daisy', 'rose'];

  assert.equal(state.discardBasketFlowers(null), 0);
  assert.equal(state.discardBasketFlowers({ daisy: 1.5 }), 0);
  assert.equal(state.discardBasketFlowers({ daisy: 2 }), 0);
  assert.equal(state.discardBasketFlowers({ peony: 1 }), 0);
  assert.deepEqual(state.basket, ['daisy', 'rose']);
});

test('failed compost save restores the original basket', () => {
  storage.clear();
  const state = new GameState();
  state.basket = ['daisy', 'rose'];
  const setItem = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = () => { throw new Error('storage unavailable'); };

  try {
    assert.equal(state.discardBasketFlowers({ daisy: 1 }), null);
    assert.deepEqual(state.basket, ['daisy', 'rose']);
  } finally {
    globalThis.localStorage.setItem = setItem;
  }
});

test('flower stock minimum is priced per species and survives save loading', () => {
  storage.clear();
  const state = new GameState();
  state.coins = 1000;
  assert.equal(state.buyStockMinimumSkill('tulip'), false);

  state.unlockedFlowers.tulip = true;
  assert.equal(state.buyStockMinimumSkill('tulip'), true);
  assert.equal(state.coins, 300);
  assert.equal(state.getStockMinimum('tulip'), 5);
  assert.equal(state.getSellableStock('tulip'), 0);

  const restored = new GameState();
  assert.ok(restored.load());
  assert.equal(restored.getStockMinimum('tulip'), 5);
});

test('bouquet assistant keeps reserved stock and gets paid through employment payroll', () => {
  storage.clear();
  const state = new GameState();
  state.level = 5;
  state.coins = 20_000;
  assert.equal(state.buyStockMinimumSkill('daisy'), true);
  assert.equal(state.buyUpgrade('bouquetAssistant'), true);
  assert.equal(state.buyBouquetSpecialization('simple'), true);
  state.stock.daisy = 8;

  const manager = new BouquetWorkerManager(state);
  manager.update(12);

  assert.equal(state.stock.daisy, 6);
  assert.equal(state.getSellableStock('daisy'), 0);
  assert.equal(state.stats.bouquetsCrafted, 1);
  assert.equal(state.discoveredBouquets.length, 1);
  assert.equal(state.getDailyPayroll(), 18);

  assert.equal(state.setEmployeeActive('bouquetAssistant', false), true);
  assert.equal(state.getDailyPayroll(), 0);
});
