import assert from 'node:assert/strict';
import test from 'node:test';

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

test('herbarium records harvesting, sales and bouquet use and persists exhibitions', () => {
  localStorage.clear();
  const state = new GameState();
  state.addToBasket('daisy');
  state.addToBasket('tulip');
  state.recordFlowerUse('daisy', 'sold');
  state.recordFlowerUse('daisy', 'bouquet');
  state.recordFlowerUse('tulip', 'bouquet');

  assert.deepEqual(state.collection.flowerRecords.daisy, {
    harvested: 1,
    sold: 1,
    usedInBouquets: 1
  });
  assert.equal(state.getHerbariumExhibitions()[0].complete, false);

  state.addToBasket('daisy');
  state.discoveredBouquets.push('daisy+daisy+tulip');
  assert.equal(state.getHerbariumExhibitions()[0].complete, true);
  assert.equal(state.installHerbariumExhibition('spring-bloom'), true);
  assert.equal(state.installHerbariumExhibition('spring-bloom'), false);
  assert.equal(state.save(), true);

  const loadedState = new GameState();
  assert.ok(loadedState.load());
  assert.equal(loadedState.getHerbariumExhibitions()[0].installed, true);
  assert.equal(loadedState.collection.flowerRecords.daisy.harvested, 2);
});

test('completed daily challenge remains claimable during the 24-hour renewal grace period', () => {
  const state = new GameState();
  const start = new Date(2026, 9, 7, 12);
  const challenge = state.getChallenges(start).daily[0];
  state.stats[challenge.metric] = challenge.target;
  assert.equal(state.getChallenges(start).daily[0].complete, true);

  const afterRenewal = new Date(2026, 9, 8, 6);
  const archived = state.getChallenges(afterRenewal).daily.find((entry) => entry.id === challenge.id);
  assert.ok(archived);
  assert.ok(archived.claimUntil > afterRenewal.getTime());
  const originalCoins = state.coins;
  assert.equal(state.claimChallenge(challenge.id, afterRenewal).rewardCoins, challenge.rewardCoins);
  assert.equal(state.coins, originalCoins + challenge.rewardCoins);
  assert.equal(state.claimChallenge(challenge.id, afterRenewal), false);
});

test('completed challenge is archived after a save/load across daily renewal', () => {
  localStorage.clear();
  const state = new GameState();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const challenge = state.getChallenges(yesterday).daily[0];
  state.stats[challenge.metric] = challenge.target;
  assert.equal(state.save(), true);

  const loadedState = new GameState();
  assert.ok(loadedState.load());
  const archived = loadedState.getChallenges().daily.find((entry) => entry.id === challenge.id);
  assert.ok(archived);
  assert.ok(archived.claimUntil > Date.now());
});

test('unclaimed completed daily challenge expires after the grace period', () => {
  const state = new GameState();
  const start = new Date(2026, 9, 7, 12);
  const challenge = state.getChallenges(start).daily[0];
  state.stats[challenge.metric] = challenge.target;
  const afterRenewal = new Date(2026, 9, 8, 0, 1);
  state.getChallenges(afterRenewal);

  const afterGrace = new Date(2026, 9, 9, 0, 0, 1);
  assert.equal(
    state.getChallenges(afterGrace).daily.some((entry) => entry.id === challenge.id),
    false
  );
  assert.equal(state.claimChallenge(challenge.id, afterGrace), false);
});
