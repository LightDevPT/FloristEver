import assert from 'node:assert/strict';
import test from 'node:test';
import { Customer } from '../js/entities/customer.js';
import { assetManager } from '../js/assets.js';

function createCustomer(requestType, requestedFlowers) {
  const customer = new Customer(
    1,
    { x: 140, y: 195 },
    ['daisy', 'tulip'],
    { requestType, requestedFlowers }
  );
  customer.state = 'waiting';

  const state = {
    stock: { daisy: 3, tulip: 2, sunflower: 0, rose: 0, orchid: 0 },
    coins: 0,
    reputation: 0,
    upgrades: { bouquetBench: 0 },
    discoveredBouquets: [],
    stats: { customersServed: 0, bouquetsCrafted: 0, flowersSold: 0 },
    flowerRecords: {},
    notify() {},
    getSellableStock(flowerId) { return this.stock[flowerId] || 0; },
    recordFlowerUse(flowerId, action) {
      const record = this.flowerRecords[flowerId] || (this.flowerRecords[flowerId] = { sold: 0, usedInBouquets: 0 });
      if (action === 'sold') record.sold++;
      if (action === 'bouquet') record.usedInBouquets++;
    },
    addCoins(amount) { this.coins += amount; },
    addReputation(amount) { this.reputation += amount; }
  };
  const sounds = { coins: 0, bouquets: 0, playCoin() { this.coins++; }, playBouquetCraft() { this.bouquets++; } };
  const particles = { emitFloatingText() {}, emitHearts() {} };
  return { customer, state, sounds, particles };
}

test('a flower sale fulfills quantities across different flower types', () => {
  const { customer, state, sounds, particles } = createCustomer('flowers', ['daisy', 'daisy', 'tulip']);

  assert.equal(customer.serve(state, sounds, particles), true);
  assert.deepEqual(state.stock, { daisy: 1, tulip: 1, sunflower: 0, rose: 0, orchid: 0 });
  assert.equal(state.coins, 22);
  assert.equal(state.stats.customersServed, 1);
  assert.equal(state.stats.flowersSold, 3);
  assert.deepEqual(state.flowerRecords.daisy, { sold: 2, usedInBouquets: 0 });
  assert.deepEqual(state.flowerRecords.tulip, { sold: 1, usedInBouquets: 0 });
  assert.equal(sounds.coins, 1);
  assert.equal(customer.state, 'leaving');
});

test('a flower order with insufficient stock does not consume any flowers', () => {
  const { customer, state, sounds, particles } = createCustomer('flowers', ['daisy', 'daisy', 'daisy', 'tulip']);
  state.stock.daisy = 2;
  const originalStock = { ...state.stock };

  assert.equal(customer.serve(state, sounds, particles), false);
  assert.deepEqual(state.stock, originalStock);
  assert.equal(state.coins, 0);
  assert.equal(state.stats.customersServed, 0);
});

test('a bouquet order is fulfilled only by an active bouquet-capable helper', () => {
  const { customer, state, sounds, particles } = createCustomer('bouquet', ['daisy', 'tulip', 'daisy']);
  const originalStock = { ...state.stock };

  assert.equal(customer.serve(state, sounds, particles), false);
  assert.deepEqual(state.stock, originalStock);
  assert.equal(customer.serve(state, sounds, particles, true), true);
  assert.deepEqual(state.stock, { daisy: 1, tulip: 1, sunflower: 0, rose: 0, orchid: 0 });
  assert.ok(state.coins > 22);
  assert.equal(state.stats.bouquetsCrafted, 1);
  assert.equal(state.stats.customersServed, 1);
  assert.deepEqual(state.discoveredBouquets, ['daisy+daisy+tulip']);
  assert.deepEqual(state.flowerRecords.daisy, { sold: 2, usedInBouquets: 2 });
  assert.deepEqual(state.flowerRecords.tulip, { sold: 1, usedInBouquets: 1 });
  assert.equal(sounds.bouquets, 1);
});

test('customer flower request bubbles receive botanical symbols and grouped quantities', () => {
  const { customer } = createCustomer('flowers', ['daisy', 'daisy', 'tulip']);
  const originalDrawCustomer = assetManager.drawCustomer;
  let speechArgs;
  assetManager.drawCustomer = (...args) => {
    speechArgs = args.slice(-3);
  };

  try {
    customer.draw({});
  } finally {
    assetManager.drawCustomer = originalDrawCustomer;
  }

  assert.equal(speechArgs[0], null);
  assert.equal(speechArgs[1], '');
  assert.deepEqual(
    speechArgs[2].map(({ flower, amount }) => [flower.id, amount]),
    [['daisy', 2], ['tulip', 1]]
  );

  const renderedFlowerIds = [];
  const originalDrawFlowerSymbol = assetManager.drawFlowerSymbol;
  assetManager.drawFlowerSymbol = (_ctx, _x, _y, flower) => renderedFlowerIds.push(flower.id);
  const context = new Proxy({
    measureText: () => ({ width: 0 })
  }, {
    get(target, property) {
      return property in target ? target[property] : () => {};
    }
  });

  try {
    assetManager.drawCustomer(context, 0, 0, 0, false, 0, null, '', speechArgs[2]);
  } finally {
    assetManager.drawFlowerSymbol = originalDrawFlowerSymbol;
  }

  assert.deepEqual(renderedFlowerIds, ['daisy', 'tulip']);
});
