// ========================================================
// FloristEver v2.0.0 — Testes Automatizados do Update Subsolo (subsolo.test.mjs)
// Validação transversal: cenas, produção, logística, vendas e anti-softlocks
// ========================================================

import assert from 'node:assert/strict';
import test from 'node:test';
import { GameState } from '../js/state.js';
import { SceneManager, SCENE_STATES } from '../js/subsolo/scene-manager.js';
import { SubsoloManager, createDefaultSubsoloState } from '../js/subsolo/subsolo-state.js';
import { SUBSOLO_ENABLED, SUBSOLO_UNLOCK_LEVEL, SUBSOLO_VARIETIES, SUBSOLO_PRODUCTS } from '../js/subsolo/subsolo-config.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}
globalThis.localStorage = new MemoryStorage();

test('subsolo defaults: unconsented and locked without breaking existing game', () => {
  const state = new GameState();
  assert.equal(state.subsolo.conteudoSecreto.ativo, false);
  assert.equal(state.subsolo.conteudoSecreto.consentimento, false);
  assert.equal(state.subsolo.desbloqueado, false);
  assert.equal(state.subsolo.concessaoPaga, false);
  assert.equal(state.subsoloManager.isUnlocked(), false);
  assert.equal(state.subsoloManager.canAccessGrate(), false);
});

test('subsolo unlocks only at level 33 with explicit consent and paid concession', () => {
  const state = new GameState();
  state.level = 32;
  state.coins = 500000;
  state.subsolo.conteudoSecreto.ativo = true;
  state.subsolo.conteudoSecreto.consentimento = true;

  assert.equal(state.subsoloManager.canAccessGrate(), false);

  state.level = 33;
  assert.equal(state.subsoloManager.canAccessGrate(), true);
  assert.equal(state.subsoloManager.isUnlocked(), false); // concessão ainda não paga

  assert.equal(state.subsoloManager.payConcession(), true);
  assert.equal(state.subsoloManager.isUnlocked(), true);
  assert.equal(state.subsolo.concessaoPaga, true);
});

test('discreet mode completely hides subsolo access', () => {
  const state = new GameState();
  state.level = 33;
  state.subsolo.conteudoSecreto.ativo = true;
  state.subsolo.conteudoSecreto.consentimento = true;
  state.subsolo.concessaoPaga = true;

  assert.equal(state.subsoloManager.isUnlocked(), true);

  state.subsolo.conteudoSecreto.modoDiscreto = true;
  assert.equal(state.subsoloManager.isUnlocked(), false);
  assert.equal(state.subsoloManager.canAccessGrate(), false);
});

test('scene manager: 100 transitions stress test runs cleanly without corruption', () => {
  const mockGame = {
    player: { x: 0, y: 0 },
    camera: { x: 0, y: 0 },
    hud: { closeAllModals: () => {}, showToast: () => {} },
    soundManager: { playTone: () => {} },
    state: new GameState()
  };

  const sceneManager = new SceneManager(mockGame);
  assert.equal(sceneManager.getCurrentScene(), SCENE_STATES.SUPERFICIE);

  for (let i = 0; i < 100; i++) {
    // Descer
    assert.equal(sceneManager.startDescer(), true);
    assert.equal(sceneManager.getCurrentScene(), SCENE_STATES.TRANSICAO_DESCER);
    sceneManager.update(0.35); // atinge o ponto de switch
    assert.equal(sceneManager.transitionStep, 'fade_in');
    sceneManager.update(0.35); // conclui a transição
    assert.equal(sceneManager.getCurrentScene(), SCENE_STATES.SUBSOLO);

    // Subir
    assert.equal(sceneManager.startSubir(), true);
    assert.equal(sceneManager.getCurrentScene(), SCENE_STATES.TRANSICAO_SUBIR);
    sceneManager.update(0.35);
    assert.equal(sceneManager.transitionStep, 'fade_in');
    sceneManager.update(0.35);
    assert.equal(sceneManager.getCurrentScene(), SCENE_STATES.SUPERFICIE);
  }

  assert.equal(sceneManager.transitionCount, 200);
  assert.equal(sceneManager.getCurrentScene(), SCENE_STATES.SUPERFICIE);
});

test('emergency exit returns safely to surface immediately', () => {
  const state = new GameState();
  const mockGame = {
    player: { x: 200, y: 200 },
    camera: { x: 200, y: 200 },
    hud: { showToast: () => {} },
    state
  };

  const sceneManager = new SceneManager(mockGame);
  sceneManager.currentState = SCENE_STATES.SUBSOLO;

  sceneManager.emergencyExitToSurface();
  assert.equal(sceneManager.getCurrentScene(), SCENE_STATES.SUPERFICIE);
  assert.equal(mockGame.player.x, sceneManager.gratePosition.x);
});

test('anti-softlock: crops grow at 25% without power/water and manual dynamo generates energy', () => {
  const state = new GameState();
  state.level = 33;
  state.subsolo.concessaoPaga = true;
  const manager = state.subsoloManager;

  // Esvazia energia, água e combustível
  manager.data.recursos.energia = 0;
  manager.data.recursos.agua = 0;
  manager.data.recursos.combustivel = 0;

  const plot = manager.data.canteiros[0];
  plot.status = 'growing';
  plot.progress = 0.1;
  const initialProg = plot.progress;

  // Atualiza 60 segundos
  manager.update(60, manager.data.lastUpdateTimestamp + 60000);
  assert.ok(plot.progress > initialProg, 'A colheita deve progredir mesmo sem recursos (a 25% de velocidade)');

  // Dínamo manual
  assert.equal(manager.data.recursos.energia, 0);
  manager.crankManualDynamo();
  assert.equal(manager.data.recursos.energia, 15);
});

test('drying racks pause when ready and never lose items', () => {
  const state = new GameState();
  state.level = 33;
  state.subsolo.concessaoPaga = true;
  const manager = state.subsoloManager;

  const rack = manager.data.estendais[0];
  rack.status = 'drying';
  rack.varietyId = 'sombra_verde';
  rack.leaves = 6;
  rack.startedAt = Date.now() - 1000000;
  rack.duration = 480;

  manager.update(10, Date.now());
  assert.equal(rack.status, 'ready');

  const prevDried = manager.data.armazemOculto.folhasSecas;
  assert.equal(manager.collectRack(0), true);
  assert.equal(manager.data.armazemOculto.folhasSecas, prevDried + 6);
  assert.equal(rack.status, 'empty');
});

test('logistics: messenger transfers to cofre and strictly NEVER sells', () => {
  const state = new GameState();
  state.level = 35;
  state.coins = 1000;
  state.subsolo.concessaoPaga = true;
  state.subsolo.armazemOculto.ramo = 5;
  state.subsolo.cofre.ramo = 0;
  state.subsolo.ajudantes.mensageiroAtivo = true;

  const manager = state.subsoloManager;
  const initialCoins = state.coins;

  manager.update(1, Date.now() + 1000);

  // O mensageiro deve ter transferido produto para o Cofre
  assert.ok(manager.data.cofre.ramo > 0, 'O mensageiro transferiu produto para o cofre');
  // E o saldo de moedas NUNCA mudou (mensageiro não vende!)
  assert.equal(state.coins, initialCoins);
});

test('secret sale credits wallet, awards respect and checks safe stock', () => {
  const state = new GameState();
  state.level = 33;
  state.coins = 500;
  state.subsolo.concessaoPaga = true;
  state.subsolo.cofre.ramo = 2;

  const manager = state.subsoloManager;
  const initialCoins = state.coins;
  const initialRespectXp = manager.data.respeito.xp;

  const res = manager.completeSale({ productId: 'ramo', quantity: 1, urgent: false }, 'none');
  assert.equal(res.success, true);
  assert.ok(res.revenue > 0);
  assert.equal(state.coins, initialCoins + res.revenue);
  assert.equal(manager.data.cofre.ramo, 1);
  assert.ok(manager.data.respeito.xp > initialRespectXp);

  // Tentar vender sem stock no cofre
  manager.data.cofre.ramo = 0;
  const failRes = manager.completeSale({ productId: 'ramo', quantity: 1 }, 'none');
  assert.equal(failRes.success, false);
});

test('heat inspection: hiding the safe evades penalty, failure incurs fine', () => {
  const state = new GameState();
  state.level = 33;
  state.coins = 20000;
  state.subsolo.concessaoPaga = true;
  const manager = state.subsoloManager;

  manager.data.calor.valor = 95;
  manager.startFiscalInspection();
  assert.equal(manager.data.calor.fiscalPresente, true);

  // Ocultar o cofre a tempo
  assert.equal(manager.hideCofre(), true);
  assert.equal(manager.data.cofre.oculto, true);
  manager.resolveInspection();
  assert.equal(manager.data.calor.fiscalPresente, false);
  assert.ok(manager.data.calor.valor < 95, 'Calor desceu após inspeção superada');
  assert.equal(state.coins, 20000, 'Nenhuma multa cobrada');

  // Segunda inspeção com falha (não oculta)
  manager.startFiscalInspection();
  manager.data.cofre.oculto = false;
  manager.resolveInspection();
  assert.ok(state.coins < 20000, 'Multa deduzida com sucesso');
  assert.ok(manager.data.calor.bloqueadoAte > Date.now(), 'Vendas bloqueadas temporariamente');
});
