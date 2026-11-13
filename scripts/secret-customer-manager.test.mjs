import assert from 'node:assert/strict';
import test from 'node:test';
import { SecretCustomerManager } from '../js/subsolo/secret-customer-manager.js';

function createManager() {
  const game = {
    counter: { x: 100, y: 200 },
    hud: { showToast() {} }
  };
  const manager = new SecretCustomerManager(game, {});
  manager.activeCustomer = {
    x: 10,
    y: 20,
    targetX: 100,
    targetY: 200,
    exitX: -60,
    exitY: 390,
    speed: 95,
    state: 'walking_to_counter',
    order: { productId: 'ramo', quantity: 1 }
  };
  return manager;
}

test('clicking a walking secret customer opens the trade when they reach the counter', () => {
  const manager = createManager();
  let openedTrades = 0;
  manager.openSecretTradeModal = () => { openedTrades++; };

  assert.equal(manager.checkPlayerInteraction(10, 20), true);
  assert.equal(manager.tradeRequested, true);
  assert.equal(openedTrades, 0);

  manager.activeCustomer.x = manager.activeCustomer.targetX - 1;
  manager.activeCustomer.y = manager.activeCustomer.targetY - 1;
  manager.updateActiveCustomer(1, true);

  assert.equal(manager.activeCustomer.state, 'waiting');
  assert.equal(manager.tradeRequested, false);
  assert.equal(openedTrades, 1);
});

test('clicking a waiting secret customer opens the trade immediately', () => {
  const manager = createManager();
  manager.activeCustomer.state = 'waiting';
  let openedTrades = 0;
  manager.openSecretTradeModal = () => { openedTrades++; };

  assert.equal(manager.checkPlayerInteraction(10, 20), true);
  assert.equal(openedTrades, 1);
});
