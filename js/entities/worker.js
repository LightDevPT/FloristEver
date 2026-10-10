// ========================================================
// FloristEver - Entidade Ajudante Colhedor (worker.js)
// IA autónoma de colheita e abastecimento da floricultura
// ========================================================
import { assetManager } from '../assets.js';
import { distance, PALETTE } from '../utils.js';

export class Worker {
  constructor(id, homeX = 350, homeY = 220) {
    this.id = id;
    this.x = homeX;
    this.y = homeY;
    this.speed = 115;
    this.facing = 1;
    this.isWalking = false;
    this.walkTime = Math.random() * 10;

    this.basket = [];
    this.capacity = 5;

    this.state = 'idle'; // 'idle' | 'walking_to_flower' | 'walking_to_counter' | 'delivering'
    this.targetFlower = null;
    this.counterPos = { x: 230, y: 220 }; // Posição de entrega no balcão da loja
  }

  update(dt, fieldManager, state, sound, particles) {
    this.walkTime += dt;

    if (this.state === 'idle') {
      if (this.basket.length > 0) {
        if (this.basket.some((flowerId) => state.getAvailableShopStockSpace(flowerId) > 0)) {
          this.state = 'walking_to_counter';
        } else {
          this.isWalking = false;
        }
        return;
      }

      if (state.getAvailableShopStockSpace() <= 0) {
        this.isWalking = false;
        return;
      }

      // Se tiver flores e não houver mais nada pronto, ou se o cesto estiver cheio: vai à loja
      if (this.basket.length >= this.capacity) {
        this.state = 'walking_to_counter';
        return;
      }

      // Procura a flor madura mais próxima no jardim
      const basketCounts = new Map();
      for (const flowerId of this.basket) {
        basketCounts.set(flowerId, (basketCounts.get(flowerId) || 0) + 1);
      }
      const canHarvestFlower = (flowerId) => (
        state.getAvailableShopStockSpace(flowerId) > (basketCounts.get(flowerId) || 0)
      );
      const hasStockPriority = (flowerId) => (
        state.getStockMinimum(flowerId) > 0
        && (state.stock[flowerId] || 0) + (basketCounts.get(flowerId) || 0)
          < state.getStockMinimum(flowerId)
        && canHarvestFlower(flowerId)
      );
      const ready = fieldManager.findNearestReadyFlower(
        this.x,
        this.y,
        canHarvestFlower,
        hasStockPriority
      );
      if (ready) {
        this.targetFlower = ready;
        this.state = 'walking_to_flower';
      } else if (this.basket.length > 0) {
        // Se já tem flores e não há mais nada pronto no jardim, vai descarregar
        this.state = 'walking_to_counter';
      } else {
        this.isWalking = false;
      }

    } else if (this.state === 'walking_to_flower') {
      if (!this.targetFlower || this.targetFlower.plot.flowers[this.targetFlower.flowerIndex].progress < 1.0) {
        // A flor já foi colhida por outro florista ou pelo jogador
        this.targetFlower = null;
        this.state = 'idle';
        return;
      }

      const dist = distance(this.x, this.y, this.targetFlower.x, this.targetFlower.y);
      if (dist < 10) {
        const flowerId = this.targetFlower.flowerId;
        const basketFlowerCount = this.basket.filter((id) => id === flowerId).length;
        if (state.getAvailableShopStockSpace(flowerId) <= basketFlowerCount) {
          this.targetFlower = null;
          this.state = 'idle';
          this.isWalking = false;
          return;
        }

        // Colhe a flor!
        this.basket.push(this.targetFlower.flowerId);
        this.targetFlower.plot.flowers[this.targetFlower.flowerIndex].progress = 0.0;
        sound.playHarvest();
        particles.emitPetals(this.targetFlower.x, this.targetFlower.y, PALETTE.leafGreen, 5);

        this.targetFlower = null;
        if (this.basket.length >= this.capacity) {
          this.state = 'walking_to_counter';
        } else {
          this.state = 'idle';
        }
      } else {
        const dx = (this.targetFlower.x - this.x) / dist;
        const dy = (this.targetFlower.y - this.y) / dist;
        this.x += dx * this.speed * dt;
        this.y += dy * this.speed * dt;
        this.facing = dx >= 0 ? 1 : -1;
        this.isWalking = true;
      }

    } else if (this.state === 'walking_to_counter') {
      const dist = distance(this.x, this.y, this.counterPos.x, this.counterPos.y);
      if (dist < 12) {
        const result = state.depositBasketToStock(this.basket);
        if (result.deposited > 0) {
          particles.emitFloatingText(this.x, this.y - 15, `+${result.deposited} Stock`, PALETTE.leafGreen);
          state.notify('stock_updated');
        }
        this.basket = result.remaining;
        this.state = 'idle';
      } else {
        const dx = (this.counterPos.x - this.x) / dist;
        const dy = (this.counterPos.y - this.y) / dist;
        this.x += dx * this.speed * dt;
        this.y += dy * this.speed * dt;
        this.facing = dx >= 0 ? 1 : -1;
        this.isWalking = true;
      }
    }
  }

  draw(ctx, visibleBounds = null) {
    if (visibleBounds && (
      this.x < visibleBounds.left - 50
      || this.x > visibleBounds.right + 50
      || this.y < visibleBounds.top - 55
      || this.y > visibleBounds.bottom + 20
    )) return;

    assetManager.drawWorker(
      ctx,
      this.x,
      this.y,
      this.facing,
      this.isWalking,
      this.walkTime,
      this.basket.length
    );
  }
}

export class WorkerManager {
  constructor(state, sound, particles) {
    this.state = state;
    this.sound = sound;
    this.particles = particles;
    this.workers = [];
  }

  syncWithUpgrades() {
    const desiredCount = this.state.isEmployeeActive('harvester')
      ? this.state.upgrades.harvester || 0
      : 0;
    while (this.workers.length < desiredCount) {
      const id = this.workers.length + 1;
      const w = new Worker(id, 320 + id * 25, 230 + (id % 2) * 20);
      this.workers.push(w);
    }
  }

  update(dt, fieldManager) {
    this.syncWithUpgrades();
    const activeCount = this.state.isEmployeeActive('harvester')
      ? this.state.upgrades.harvester || 0
      : 0;
    for (let i = 0; i < activeCount; i++) {
      this.workers[i].update(dt, fieldManager, this.state, this.sound, this.particles);
    }
  }

  draw(ctx, visibleBounds = null) {
    const activeCount = this.state.isEmployeeActive('harvester')
      ? this.state.upgrades.harvester || 0
      : 0;
    for (let i = 0; i < activeCount; i++) {
      this.workers[i].draw(ctx, visibleBounds);
    }
  }
}
