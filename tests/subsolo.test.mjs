// ========================================================
// FloristEver v2.0.0 — Testes Automatizados do Update Subsolo (subsolo.test.mjs)
// Validação transversal: cenas, produção, logística, vendas e anti-softlocks
// ========================================================

import assert from 'node:assert/strict';
import test from 'node:test';
import { GameState } from '../js/state.js';
import { SceneManager, SCENE_STATES } from '../js/subsolo/scene-manager.js';
import { SubsoloManager, createDefaultSubsoloState } from '../js/subsolo/subsolo-state.js';
import { SubsoloRenderer } from '../js/subsolo/subsolo-renderer.js';
import { SUBSOLO_ENABLED, SUBSOLO_UNLOCK_LEVEL, SUBSOLO_VARIETIES, SUBSOLO_PRODUCTS, GARDEN_CODE_DICTIONARY, COUNTERSIGNS, getSeasonalDictionaryVersion } from '../js/subsolo/subsolo-config.js';
import { DeveloperToolsPanel } from '../js/ui/developer-tools.js';
import { SecretCustomerManager } from '../js/subsolo/secret-customer-manager.js';

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

test('scene manager fires onTransitionComplete callback on scene enter, exit and emergency', () => {
  const transitions = [];
  const mockGame = {
    player: { x: 0, y: 0 },
    camera: { x: 0, y: 0 },
    hud: { closeAllModals: () => {}, showToast: () => {} },
    soundManager: { playTone: () => {} },
    state: new GameState()
  };

  const sceneManager = new SceneManager(mockGame);
  sceneManager.onTransitionComplete = (scene) => transitions.push(scene);

  // Descer
  sceneManager.startDescer();
  sceneManager.update(0.35);
  sceneManager.update(0.35);
  assert.equal(transitions[0], SCENE_STATES.SUBSOLO);

  // Subir
  sceneManager.startSubir();
  sceneManager.update(0.35);
  sceneManager.update(0.35);
  assert.equal(transitions[1], SCENE_STATES.SUPERFICIE);

  // Saída de emergência
  sceneManager.currentState = SCENE_STATES.SUBSOLO;
  sceneManager.emergencyExitToSurface();
  assert.equal(transitions[2], SCENE_STATES.SUPERFICIE);
});

test('subsolo renderer correctly identifies interactive 2D workstations', () => {
  const state = new GameState();
  const renderer = new SubsoloRenderer({ player: { x: 180, y: 360 } }, state.subsoloManager);

  assert.equal(renderer.getStationAt(120, 200), 'ladder');
  assert.equal(renderer.getStationAt(260, 270), 'dynamo');
  assert.equal(renderer.getStationAt(480, 270), 'cultivo');
  assert.equal(renderer.getStationAt(680, 270), 'secagem');
  assert.equal(renderer.getStationAt(870, 270), 'prep');
  assert.equal(renderer.getStationAt(960, 270), 'logistica');
  assert.equal(renderer.getStationAt(500, 420), null); // chão navegável livre
});

test('full underground production pipeline: plant -> harvest -> dry -> prep -> mala -> cofre -> sale', () => {
  const state = new GameState();
  state.level = 33;
  state.coins = 50000;
  state.subsolo.concessaoPaga = true;
  const manager = state.subsoloManager;

  // 1. Plantar no canteiro 2
  assert.equal(manager.plantSeed(2, 'sombra_verde'), true);
  assert.equal(manager.data.canteiros[2].status, 'growing');

  // 2. Crescimento até estar pronto
  manager.data.canteiros[2].progress = 1.0;
  manager.data.canteiros[2].status = 'ready';

  // 3. Colher para estendal de secagem
  assert.equal(manager.harvestPlot(2), true);
  assert.equal(manager.data.canteiros[2].status, 'empty');
  assert.equal(manager.data.estendais[0].status, 'drying');

  // 4. Secar e recolher folhas curadas para o armazém oculto
  manager.data.estendais[0].status = 'ready';
  const folhaInitial = manager.data.armazemOculto.folhasSecas;
  assert.equal(manager.collectRack(0), true);
  assert.ok(manager.data.armazemOculto.folhasSecas > folhaInitial);

  // 5. Preparar na bancada
  assert.equal(manager.startPreparation('ramo'), true);
  assert.equal(manager.data.preparacao.status, 'preparing');
  manager.data.preparacao.status = 'ready';
  const ramoInitial = manager.data.armazemOculto.ramo;
  assert.equal(manager.collectPreparation(), true);
  assert.equal(manager.data.armazemOculto.ramo, ramoInitial + 1);

  // 6. Transferir do Armazém para a Mala
  const malaInitial = manager.data.mala.ramo;
  assert.equal(manager.transferToMala('ramo', 1), true);
  assert.equal(manager.data.mala.ramo, malaInitial + 1);

  // 7. Depositar da Mala no Cofre da Floricultura
  const cofreInitial = manager.data.cofre.ramo;
  assert.equal(manager.depositMalaToCofre('ramo', 1), true);
  assert.equal(manager.data.cofre.ramo, cofreInitial + 1);

  // 8. Venda a Cliente Secreto a partir do Cofre
  const walletCoins = state.coins;
  const sale = manager.completeSale({ productId: 'ramo', quantity: 1 }, 'none');
  assert.equal(sale.success, true);
  assert.ok(state.coins > walletCoins);
  assert.equal(manager.data.cofre.ramo, cofreInitial);
});

test('developer tools subsolo shortcuts unlock and fill underground resources', () => {
  const state = new GameState();
  state.level = 1;
  state.coins = 20;

  const mockHud = { showToast: () => {}, update: () => {} };
  const mockGame = {
    counter: { x: 100, y: 170 },
    secretCustomerManager: null,
    sceneManager: {
      desceu: false,
      startDescer() { this.desceu = true; }
    }
  };
  mockGame.secretCustomerManager = new SecretCustomerManager(mockGame, state.subsoloManager);

  const devTools = new DeveloperToolsPanel(state, mockHud, () => ({ roles: ['developer'] }), mockGame);

  // 1. Desbloqueio direto via ferramentas de dev
  devTools.unlockSubsolo();
  assert.ok(state.level >= 33, 'Nível promovido para o limiar do subsolo (33)');
  assert.equal(state.subsolo.conteudoSecreto.ativo, true);
  assert.equal(state.subsolo.conteudoSecreto.consentimento, true);
  assert.equal(state.subsolo.concessaoPaga, true);
  assert.equal(state.subsolo.desbloqueado, true);
  assert.equal(state.subsoloManager.isUnlocked(), true);
  assert.equal(state.subsoloManager.canAccessGrate(), true);

  // 2. Abastecimento de recursos
  devTools.fillSubsolo();
  assert.equal(state.subsolo.recursos.energia, 100);
  assert.equal(state.subsolo.recursos.agua, 100);
  assert.equal(state.subsolo.recursos.combustivel, 100);
  assert.ok(state.subsolo.armazemOculto.folhasSecas >= 30);
  assert.ok(state.subsolo.mala.ramo >= 5);
  assert.ok(state.subsolo.cofre.ramo >= 5);

  // 3. Invocar cliente secreto
  devTools.spawnSecretCustomer();
  assert.ok(mockGame.secretCustomerManager.activeCustomer, 'Cliente secreto instanciado');
  assert.equal(mockGame.secretCustomerManager.activeCustomer.state, 'waiting');
  assert.ok(mockGame.secretCustomerManager.activeCustomer.order.productId);

  // 4. Descer ao subsolo
  devTools.enterSubsolo();
  assert.equal(mockGame.sceneManager.desceu, true);
});

test('caderno de codigos dictionary tracking and access rules', () => {
  // Dicionário e contrasinais íntegros
  assert.ok(GARDEN_CODE_DICTIONARY.length >= 8);
  assert.ok(COUNTERSIGNS.length >= 3);
  assert.ok(COUNTERSIGNS.every((cs) => cs.prompt && cs.correct && cs.distractors.length === 2));

  // Versão rotativa quinzenal
  const v1 = getSeasonalDictionaryVersion(1000);
  const v2 = getSeasonalDictionaryVersion(1000 + 14 * 24 * 60 * 60 * 1000);
  assert.ok(v1 >= 1 && v1 <= 4);
  assert.ok(v2 >= 1 && v2 <= 4);

  // Descoberta progressiva no save
  const state = new GameState();
  state.subsolo.caderno.paginasDescobertas = ['code_ramo_1'];
  assert.ok(state.subsolo.caderno.paginasDescobertas.includes('code_ramo_1'));

  // Novo código descoberto após interação
  state.subsolo.caderno.paginasDescobertas.push('code_maco_1');
  assert.equal(state.subsolo.caderno.paginasDescobertas.length, 2);
});


