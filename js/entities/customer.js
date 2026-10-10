// ========================================================
// FloristEver - Gestão de Clientes da Floricultura (customer.js)
// Chegada ao balcão, pedidos, compras manuais ou automáticas
// ========================================================
import { CUSTOMER_CONFIG } from '../config/customers.js';
import { FLOWERS_CONFIG, FLOWER_ORDER } from '../config/flowers.js';
import { ACCESSORIES, WRAPPERS, calculateBouquetHarmony } from '../config/bouquets.js';
import { UPGRADES_CONFIG } from '../config/upgrades.js';
import { assetManager } from '../assets.js';
import { distance, PALETTE, formatNumber } from '../utils.js';

export class Customer {
  constructor(id, targetCounterPos, availableFlowers = ['daisy'], options = {}) {
    this.id = id;
    this.variant = Math.floor(Math.random() * 4);
    this.name = CUSTOMER_CONFIG.names[Math.floor(Math.random() * CUSTOMER_CONFIG.names.length)];
    this.specialVisitor = options.specialVisitor || null;
    if (this.specialVisitor) this.name = this.specialVisitor.name;

    // Ponto de entrada (caminho à esquerda da loja)
    this.x = 40;
    this.y = 380 + Math.random() * 30;

    this.counterPos = targetCounterPos; // { x, y } em frente ao balcão
    this.exitPos = { x: -60, y: 390 };

    this.speed = CUSTOMER_CONFIG.walkSpeed;
    this.walkTime = 0;
    this.isWalking = true;

    const canRequestBouquet = options.canRequestBouquet === true;
    this.requestType = options.requestType
      || (canRequestBouquet && Math.random() < 0.3 ? 'bouquet' : 'flowers');
    this.requestedFlowers = Array.isArray(options.requestedFlowers)
      ? [...options.requestedFlowers]
      : this.createFlowerRequest(availableFlowers, this.requestType === 'bouquet');
    this.requestedFlowerId = this.requestedFlowers[0] || 'daisy';
    this.requestedAmount = this.requestedFlowers.filter((id) => id === this.requestedFlowerId).length;

    this.state = 'walking_to_counter'; // 'walking_to_counter' | 'waiting' | 'leaving'
    this.patience = CUSTOMER_CONFIG.patienceTime;
    this.isSatisfied = false;
  }

  createFlowerRequest(availableFlowers, isBouquet) {
    const choices = availableFlowers.length > 0 ? availableFlowers : ['daisy'];
    const amount = isBouquet ? 3 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 3);
    const requested = [];

    if (choices.length > 1) {
      const firstIndex = Math.floor(Math.random() * choices.length);
      const firstFlower = choices[firstIndex];
      const secondChoices = choices.filter((flowerId) => flowerId !== firstFlower);
      requested.push(firstFlower, secondChoices[Math.floor(Math.random() * secondChoices.length)]);
    }
    while (requested.length < amount) {
      requested.push(choices[Math.floor(Math.random() * choices.length)]);
    }

    return requested;
  }

  update(dt, state, sound, particles, autoServe = false, canCraftBouquet = false) {
    this.walkTime += dt;

    if (this.state === 'walking_to_counter') {
      const dist = distance(this.x, this.y, this.counterPos.x, this.counterPos.y);
      if (dist < 8) {
        this.state = 'waiting';
        this.isWalking = false;
      } else {
        const dx = (this.counterPos.x - this.x) / dist;
        const dy = (this.counterPos.y - this.y) / dist;
        this.x += dx * this.speed * dt;
        this.y += dy * this.speed * dt;
        this.isWalking = true;
      }

    } else if (this.state === 'waiting') {
      // Se tiver caixa automático, tenta servir de imediato
      if (autoServe || (this.requestType === 'bouquet' && canCraftBouquet)) {
        this.serve(state, sound, particles, canCraftBouquet);
        return;
      }

      this.patience -= dt;
      if (this.patience <= 0) {
        // Desiste pacificamente
        this.state = 'leaving';
      }

    } else if (this.state === 'leaving') {
      const dist = distance(this.x, this.y, this.exitPos.x, this.exitPos.y);
      if (dist < 10) {
        return true; // Pronto para remover
      }
      const dx = (this.exitPos.x - this.x) / dist;
      const dy = (this.exitPos.y - this.y) / dist;
      this.x += dx * this.speed * dt;
      this.y += dy * this.speed * dt;
      this.isWalking = true;
    }

    return false;
  }

  serve(state, sound, particles, canCraftBouquet = false) {
    if (this.state !== 'waiting') return false;

    if (this.requestType === 'bouquet' && !canCraftBouquet) return false;

    const requestedCounts = this.requestedFlowers.reduce((counts, flowerId) => {
      counts[flowerId] = (counts[flowerId] || 0) + 1;
      return counts;
    }, {});
    const hasStock = Object.entries(requestedCounts).every(([flowerId, amount]) => {
      return state.getSellableStock(flowerId) >= amount;
    });
    if (!hasStock) return false;

    for (const [flowerId, amount] of Object.entries(requestedCounts)) {
      state.stock[flowerId] -= amount;
      for (let index = 0; index < amount; index++) {
        state.recordFlowerUse(flowerId, 'sold');
        if (this.requestType === 'bouquet') state.recordFlowerUse(flowerId, 'bouquet');
      }
    }
    state.notify('stock_updated');

    const flowerValue = this.requestedFlowers.reduce((total, flowerId) => {
      return total + (FLOWERS_CONFIG[flowerId]?.value || 5);
    }, 0);
    let revenue = flowerValue;
    if (this.requestType === 'bouquet') {
      const harmony = calculateBouquetHarmony(this.requestedFlowers, 'kraft', 'none');
      const kraft = WRAPPERS.find((wrap) => wrap.id === 'kraft') || WRAPPERS[0];
      const noAccessory = ACCESSORIES.find((accessory) => accessory.id === 'none') || ACCESSORIES[0];
      const benchBonus = 1 + (state.upgrades.bouquetBench || 0)
        * UPGRADES_CONFIG.bouquetBench.bonusPerLevel;
      revenue = Math.round(
        flowerValue * harmony.harmonyMultiplier * harmony.valueMultiplier
          * kraft.multiplier * noAccessory.multiplier * benchBonus
      );
      state.stats.bouquetsCrafted++;
      const recipeKey = [...this.requestedFlowers].sort().join('+');
      if (!state.discoveredBouquets.includes(recipeKey)) {
        state.discoveredBouquets.push(recipeKey);
      }
      sound.playBouquetCraft();
    } else {
      sound.playCoin();
    }

    const repGain = Math.round(revenue * 0.8 + 2);
    state.addCoins(revenue);
    state.addReputation(repGain);
    state.stats.customersServed++;
    state.stats.flowersSold = (Number(state.stats.flowersSold) || 0) + this.requestedFlowers.length;
    state.notify('customer_served', { count: state.stats.customersServed });
    if (this.specialVisitor) state.recordSpecialVisitor(this.specialVisitor.id);
    if (this.requestType === 'bouquet') {
      state.notify('bouquet_crafted', { count: state.stats.bouquetsCrafted });
    }

    particles.emitFloatingText(this.x, this.y - 30, `+🪙${formatNumber(revenue)}`, PALETTE.sunYellow);
    particles.emitHearts(this.x, this.y - 20, 4);

    this.isSatisfied = true;
    this.state = 'leaving';
    return true;
  }

  draw(ctx, visibleBounds = null) {
    if (visibleBounds && (
      this.x < visibleBounds.left - 50
      || this.x > visibleBounds.right + 50
      || this.y < visibleBounds.top - 55
      || this.y > visibleBounds.bottom + 20
    )) return;

    let icon = null;
    let speechText = '';
    let speechFlowers = [];
    if (this.state === 'waiting') {
      if (this.requestType === 'bouquet') {
        icon = '💐';
      } else {
        const counts = this.requestedFlowers.reduce((result, flowerId) => {
          result[flowerId] = (result[flowerId] || 0) + 1;
          return result;
        }, {});
        speechFlowers = Object.entries(counts)
          .map(([flowerId, amount]) => ({ flower: FLOWERS_CONFIG[flowerId], amount }))
          .filter((item) => item.flower);
      }
    } else if (this.state === 'leaving' && this.isSatisfied) {
      icon = '💖';
    }
    if (this.specialVisitor && this.state === 'waiting') icon = '✦';

    assetManager.drawCustomer(
      ctx,
      this.x,
      this.y,
      this.variant,
      this.isWalking,
      this.walkTime,
      icon,
      speechText,
      speechFlowers
    );
  }
}

export class CustomerManager {
  constructor(state, sound, particles) {
    this.state = state;
    this.sound = sound;
    this.particles = particles;
    this.customers = [];
    this.spawnTimer = 2.0; // Primeiro cliente chega bem rápido
    this.specialVisitorTimer = 75;

    // Posições dos lugares na fila do balcão (lado a lado na frente do balcão)
    this.queueSlots = [
      { x: 140, y: 195, occupied: false },
      { x: 110, y: 195, occupied: false },
      { x: 80,  y: 195, occupied: false }
    ];
  }

  getAvailableFlowers() {
    const available = [];
    for (const id of FLOWER_ORDER) {
      if (this.state.unlockedFlowers[id]) {
        available.push(id);
      }
    }
    return available.length > 0 ? available : ['daisy'];
  }

  update(dt) {
    // Cálculo do intervalo de spawn com base nas melhorias do balcão e reputação
    const counterLevel = this.state.upgrades.counterUpgrade || 0;
    const intervalMultiplier = Math.max(0.45, 1.0 - counterLevel * 0.12 - (this.state.level - 1) * 0.03);
    const spawnRate = CUSTOMER_CONFIG.baseSpawnInterval * intervalMultiplier;

    this.spawnTimer -= dt;
    this.specialVisitorTimer -= dt;
    const freeSlot = this.queueSlots.find((slot) => !slot.occupied);
    const canSpawn = freeSlot && this.customers.length < 3;
    if (canSpawn && this.specialVisitorTimer <= 0 && this.state.specialVisitors.length < CUSTOMER_CONFIG.specialVisitors.length) {
      this.specialVisitorTimer = 180;
      const visitor = CUSTOMER_CONFIG.specialVisitors.find((entry) => !this.state.specialVisitors.includes(entry.id))
        || CUSTOMER_CONFIG.specialVisitors[0];
      freeSlot.occupied = true;
      const canRequestBouquet = this.state.level >= 5 && this.state.isEmployeeActive('harvester');
      const cust = new Customer(Date.now(), freeSlot, this.getAvailableFlowers(), {
        canRequestBouquet,
        specialVisitor: visitor
      });
      cust.slot = freeSlot;
      this.customers.push(cust);
      this.state.notify('special_visitor_arrived', { visitorId: visitor.id });
    } else if (canSpawn && this.spawnTimer <= 0) {
      this.spawnTimer = spawnRate + (Math.random() - 0.5) * 2;
      freeSlot.occupied = true;
      const canRequestBouquet = this.state.level >= 5 && this.state.isEmployeeActive('harvester');
      const cust = new Customer(Date.now(), freeSlot, this.getAvailableFlowers(), { canRequestBouquet });
      cust.slot = freeSlot;
      this.customers.push(cust);
    }

    const hasCashier = this.state.isEmployeeActive('cashier');
    const canCraftBouquet = this.state.level >= 5 && this.state.isEmployeeActive('harvester');

    for (let i = this.customers.length - 1; i >= 0; i--) {
      const cust = this.customers[i];
      const shouldRemove = cust.update(
        dt,
        this.state,
        this.sound,
        this.particles,
        hasCashier && cust.requestType === 'flowers',
        canCraftBouquet
      );

      if (cust.state === 'leaving' && cust.slot) {
        cust.slot.occupied = false;
        cust.slot = null;
      }

      if (shouldRemove) {
        this.customers.splice(i, 1);
      }
    }
  }

  // Atendimento manual quando o jogador pressiona ação junto ao balcão
  serveWaitingCustomer() {
    for (const cust of this.customers) {
      if (cust.state === 'waiting') {
        const success = cust.serve(this.state, this.sound, this.particles);
        if (success) return true;
      }
    }
    return false;
  }

  hasWaitingCustomer() {
    return this.customers.some((customer) => {
      return customer.state === 'waiting' && customer.requestType === 'flowers';
    });
  }

  draw(ctx, visibleBounds = null) {
    for (const cust of this.customers) {
      cust.draw(ctx, visibleBounds);
    }
  }
}
