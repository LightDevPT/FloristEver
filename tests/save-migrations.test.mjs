import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  migrateSaveData
} from '../js/save-migrations.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAVE_KEY = 'floristever_save_v1';
const BACKUP_KEY = 'floristever_save_backup_v1';
const FIXTURE_DIRECTORY = path.join(ROOT, 'tests', 'fixtures', 'saves');

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

async function readFixture(name) {
  return JSON.parse(await fs.readFile(path.join(FIXTURE_DIRECTORY, name), 'utf8'));
}

function captureWarnings(callback) {
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args);
  try {
    return { result: callback(), warnings };
  } finally {
    console.warn = originalWarn;
  }
}

for (const name of ['new-game.json', 'mid-game.json', 'advanced-game.json']) {
  test(`legacy ${name} migrates without mutating its read-only fixture`, async () => {
    const fixture = await readFixture(name);
    const original = structuredClone(fixture);

    const migrated = migrateSaveData(fixture);

    assert.equal(migrated.schemaVersion, CURRENT_SAVE_SCHEMA_VERSION);
    assert.deepEqual(fixture, original);
    assert.deepEqual(migrateSaveData(migrated), migrated);
  });
}

test('loading a legacy save stores schema version 1 and preserves the original as backup', async () => {
  localStorage.clear();
  const fixture = await readFixture('mid-game.json');
  const original = JSON.stringify(fixture);
  localStorage.setItem(SAVE_KEY, original);

  const state = new GameState();
  assert.ok(state.load());

  assert.equal(JSON.parse(localStorage.getItem(SAVE_KEY)).schemaVersion, 1);
  assert.equal(localStorage.getItem(BACKUP_KEY), original);
  assert.equal(state.exportSaveData().schemaVersion, CURRENT_SAVE_SCHEMA_VERSION);
  assert.equal(state.stock.camellia, 0);
  assert.equal(state.unlockedFlowers.camellia, false);
  assert.equal(state.collection.harvestedFlowers.alstroemeria, false);
});

test('unsupported save versions leave both the primary save and backup untouched', async () => {
  localStorage.clear();
  const fixture = await readFixture('advanced-game.json');
  const backup = await readFixture('new-game.json');
  const primaryRaw = JSON.stringify({ ...fixture, schemaVersion: CURRENT_SAVE_SCHEMA_VERSION + 1 });
  const backupRaw = JSON.stringify(backup);
  localStorage.setItem(SAVE_KEY, primaryRaw);
  localStorage.setItem(BACKUP_KEY, backupRaw);

  const state = new GameState();
  const { result, warnings } = captureWarnings(() => state.load());

  assert.equal(result, null);
  assert.equal(state.saveBlocked, true);
  assert.ok(warnings.length > 0);
  assert.equal(state.save(), false);
  assert.equal(localStorage.getItem(SAVE_KEY), primaryRaw);
  assert.equal(localStorage.getItem(BACKUP_KEY), backupRaw);
});

test('failed cloud-save migration does not replace the local save or its backup', async () => {
  localStorage.clear();
  const localSaveRaw = JSON.stringify(await readFixture('mid-game.json'));
  const backupRaw = JSON.stringify(await readFixture('new-game.json'));
  localStorage.setItem(SAVE_KEY, localSaveRaw);
  localStorage.setItem(BACKUP_KEY, backupRaw);

  const state = new GameState();
  const { result, warnings } = captureWarnings(() => state.importSaveData({
    ...JSON.parse(localSaveRaw),
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION + 1
  }));

  assert.equal(result, null);
  assert.ok(warnings.length > 0);
  assert.equal(localStorage.getItem(SAVE_KEY), localSaveRaw);
  assert.equal(localStorage.getItem(BACKUP_KEY), backupRaw);
});

test('custom HUD positions and sizes survive a local save and reload', () => {
  localStorage.clear();
  const layout = {
    coins: { x: 0.15, y: 0.2, scale: 1.25 },
    joystick: { x: 0.12, y: 0.85, scale: 0.9 }
  };
  const savedState = new GameState();
  savedState.settings.hudLayout = layout;

  assert.equal(savedState.save(), true);

  const loadedState = new GameState();
  assert.ok(loadedState.load());
  assert.deepEqual(loadedState.settings.hudLayout, layout);
});

test('recurring order floradas advance, renew orders, and survive save reload', () => {
  localStorage.clear();
  const state = new GameState();
  const firstOrderId = state.orders[0].id;

  assert.equal(state.orderCycle, 1);
  assert.equal(state.completeSpecialOrder(firstOrderId), true);
  assert.equal(state.orders[0].isCompleted, true);
  assert.equal(state.completeSpecialOrder(firstOrderId), false);
  assert.equal(state.orderCycle, 1);

  for (const order of state.orders.filter((entry) => !entry.isCompleted)) {
    assert.equal(state.completeSpecialOrder(order.id), true);
  }
  assert.equal(state.orderCycle, 2);
  assert.ok(state.orders.every((order) => !order.isCompleted));
  assert.equal(state.save(), true);

  const loadedState = new GameState();
  assert.ok(loadedState.load());
  assert.equal(loadedState.orderCycle, 2);
  assert.ok(loadedState.orders.every((order) => !order.isCompleted));
});

test('legacy saves with all special orders completed receive the next florada', () => {
  localStorage.clear();
  const oldState = new GameState();
  oldState.orders = oldState.orders.map((order) => ({ ...order, isCompleted: true }));
  localStorage.setItem(SAVE_KEY, JSON.stringify(oldState.exportSaveData()));

  const loadedState = new GameState();
  assert.ok(loadedState.load());
  assert.equal(loadedState.orderCycle, 2);
  assert.ok(loadedState.orders.every((order) => !order.isCompleted));
});

test('daily and weekly challenges track progress and allow each reward to be claimed once', () => {
  localStorage.clear();
  const state = new GameState();
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const challenges = state.getChallenges(now);
  const daily = challenges.daily[0];
  const weekly = challenges.weekly[0];

  state.stats[daily.metric] = Math.max(state.stats[daily.metric], daily.target);
  state.stats[weekly.metric] = Math.max(state.stats[weekly.metric], weekly.target);
  assert.equal(state.getChallenges(now).daily[0].complete, true);
  assert.equal(state.getChallenges(now).weekly[0].complete, true);

  const initialCoins = state.coins;
  const dailyReward = state.claimChallenge(daily.id, now);
  assert.equal(dailyReward.rewardCoins, daily.rewardCoins);
  assert.equal(state.coins, initialCoins + daily.rewardCoins);
  assert.equal(state.claimChallenge(daily.id, now), false);

  const weeklyReward = state.claimChallenge(weekly.id, now);
  assert.equal(weeklyReward.rewardCoins, weekly.rewardCoins);
  assert.equal(state.challengeCycles.daily.claimed.includes(daily.id), true);
  assert.equal(state.challengeCycles.weekly.claimed.includes(weekly.id), true);
  assert.equal(state.save(), true);

  const loadedState = new GameState();
  assert.ok(loadedState.load());
  assert.equal(loadedState.getChallenges(now).daily[0].claimed, true);
  assert.equal(loadedState.getChallenges(now).weekly[0].claimed, true);
});

test('challenge cycles refresh on local midnight and at the start of a new week', () => {
  localStorage.clear();
  const state = new GameState();
  const monday = new Date(2026, 9, 5, 12);
  const tuesday = new Date(2026, 9, 6, 12);
  const nextMonday = new Date(2026, 9, 12, 12);
  const initial = state.getChallenges(monday);
  const oldDailyId = initial.daily[0].id;
  const oldWeeklyId = initial.weekly[0].id;

  assert.notEqual(state.getChallenges(tuesday).daily[0].id, oldDailyId);
  assert.equal(state.getChallenges(tuesday).weekly[0].id, oldWeeklyId);
  assert.notEqual(state.getChallenges(nextMonday).weekly[0].id, oldWeeklyId);
});

test('missions have a dedicated HUD button and dialog outside the upgrades shop', async () => {
  const html = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8');
  const shopDialogStart = html.indexOf('id="modal-shop"');
  const shopDialogEnd = html.indexOf('id="modal-challenges"', shopDialogStart);
  const shopDialog = html.slice(shopDialogStart, shopDialogEnd);

  assert.match(html, /id="btn-open-challenges"[^>]*aria-label="Missões e desafios"/);
  assert.match(html, /id="modal-challenges"[^>]*aria-labelledby="challenges-title"/);
  assert.match(html, /id="shop-challenges-list"/);
  assert.doesNotMatch(shopDialog, /shop-challenges-list|Desafios diários/);
});
