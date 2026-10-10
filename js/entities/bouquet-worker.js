import { BOUQUET_CATEGORIES, calculateBouquetHarmony } from '../config/bouquets.js';
import { FLOWER_ORDER, FLOWERS_CONFIG } from '../config/flowers.js';
import { assetManager } from '../assets.js';

const PRODUCTION_INTERVAL = 12;

export class BouquetWorkerManager {
  constructor(state) {
    this.state = state;
    this.timer = 0;
    this.walkTime = 0;
  }

  update(dt) {
    this.walkTime += dt;
    if (!this.state.isEmployeeActive('bouquetAssistant')) {
      this.timer = 0;
      return;
    }
    this.timer += dt;
    if (this.timer < PRODUCTION_INTERVAL) return;
    this.timer %= PRODUCTION_INTERVAL;

    const candidates = [];
    const addCandidate = (flowerIds) => {
      const counts = flowerIds.reduce((result, id) => {
        result[id] = (result[id] || 0) + 1;
        return result;
      }, {});
      if (!Object.entries(counts).every(([id, amount]) => (
        this.state.unlockedFlowers[id] && this.state.getSellableStock(id) >= amount
      ))) return;

      const harmony = calculateBouquetHarmony(flowerIds);
      const category = BOUQUET_CATEGORIES.find((entry) => (
        harmony.harmonyMultiplier >= entry.min && harmony.harmonyMultiplier < entry.max
      ));
      if (!category) return;
      const baseValue = flowerIds.reduce((total, id) => total + FLOWERS_CONFIG[id].value, 0);
      candidates.push({
        flowerIds,
        category,
        priority: this.state.bouquetSpecializations[category.id] ? 1 : 0,
        revenue: Math.round(
          baseValue * harmony.harmonyMultiplier * harmony.valueMultiplier
            * 1.15
            * (1 + (this.state.upgrades.bouquetBench || 0) * 0.1)
            * (this.state.bouquetSpecializations[category.id] ? 1 + category.bonus : 1)
        )
      });
    };

    for (const flowerId of FLOWER_ORDER) addCandidate([flowerId]);
    for (let first = 0; first < FLOWER_ORDER.length; first++) {
      for (let second = first; second < FLOWER_ORDER.length; second++) {
        addCandidate([FLOWER_ORDER[first], FLOWER_ORDER[second]]);
        for (let third = second; third < FLOWER_ORDER.length; third++) {
          addCandidate([FLOWER_ORDER[first], FLOWER_ORDER[second], FLOWER_ORDER[third]]);
        }
      }
    }

    candidates.sort((left, right) => (
      right.priority - left.priority || right.revenue - left.revenue
    ));
    for (const candidate of candidates) {
      if (this.state.sellAutomatedBouquet(candidate.flowerIds, candidate.category.id)) return;
    }
  }

  draw(ctx, visibleBounds = null) {
    if (!this.state.isEmployeeActive('bouquetAssistant')) return;
    if (visibleBounds && (
      310 < visibleBounds.left - 50
      || 310 > visibleBounds.right + 50
      || 220 < visibleBounds.top - 55
      || 220 > visibleBounds.bottom + 20
    )) return;
    assetManager.drawWorker(ctx, 310, 220, 1, false, this.walkTime, 3);
  }
}
