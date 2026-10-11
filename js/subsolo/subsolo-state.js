// ========================================================
// FloristEver v2.0.0 — Estado e Lógica do Subsolo (subsolo-state.js)
// Simulação baseada em timestamps, anti-softlock e logística
// ========================================================

import {
  SUBSOLO_ENABLED,
  SUBSOLO_UNLOCK_LEVEL,
  SUBSOLO_CONCESSION_COST,
  SUBSOLO_VARIETIES,
  SUBSOLO_PRODUCTS,
  SUBSOLO_UPGRADES_CONFIG,
  SUBSOLO_RESPECT_CONFIG,
  SUBSOLO_SECTION_COSTS,
  PACKAGING_OPTIONS,
  GARDEN_CODE_DICTIONARY,
  COUNTERSIGNS,
  getSeasonalDictionaryVersion
} from './subsolo-config.js';

export function createDefaultSubsoloState() {
  return {
    conteudoSecreto: {
      ativo: false,
      consentimento: false,
      modoDiscreto: false,
      modoTranquilo: false,
      ajudaCodigo: false
    },
    desbloqueado: false,
    concessaoPaga: false,
    respeito: { nivel: 1, xp: 0 },
    secoes: 1,
    canteiros: [
      { id: 0, varietyId: 'sombra_verde', status: 'growing', progress: 0.7, plantedAt: Date.now() - 600000 },
      { id: 1, varietyId: 'sombra_verde', status: 'ready', progress: 1.0, plantedAt: Date.now() - 900000 },
      { id: 2, varietyId: 'sombra_verde', status: 'empty', progress: 0, plantedAt: 0 },
      { id: 3, varietyId: 'sombra_verde', status: 'empty', progress: 0, plantedAt: 0 }
    ],
    estendais: [
      { id: 0, status: 'empty', varietyId: null, leaves: 0, startedAt: 0, duration: 0 }
    ],
    preparacao: {
      status: 'idle', // 'idle' | 'preparing' | 'ready'
      productId: null,
      startedAt: 0,
      duration: 0
    },
    // Pacote inicial acolhedor garante a primeira produção
    armazemOculto: {
      folhasSecas: 8,
      ramo: 2,
      maco: 0,
      reserva: 0
    },
    mala: {
      ramo: 0,
      maco: 0,
      reserva: 0,
      capacidade: 10
    },
    cofre: {
      ramo: 1,
      maco: 0,
      reserva: 0,
      capacidade: 15,
      oculto: false
    },
    recursos: {
      energia: 100,
      maxEnergia: 100,
      combustivel: 40,
      maxCombustivel: 50,
      agua: 100,
      maxAgua: 100,
      odor: 0
    },
    calor: {
      valor: 0,
      ultimoTs: Date.now(),
      fiscalPresente: false,
      fiscalJanelaRestante: 0, // 20 s para ocultar o cofre
      bloqueadoAte: 0
    },
    pedidosPendentes: [],
    caderno: {
      paginasDescobertas: ['code_ramo_1'],
      versaoDicionario: 1
    },
    saturacao: {
      ramo: 0,
      maco: 0,
      reserva: 0
    },
    melhorias: {
      canteiros: 0,
      secadores: 0,
      preparacao: 0,
      armazem: 0,
      mala: 0,
      cofre: 0,
      filtros: 0,
      gerador: 0,
      mensageiro: 0
    },
    ajudantes: {
      mensageiroAtivo: false,
      jardineiroAtivo: false,
      secadorAtivo: false
    },
    lastUpdateTimestamp: Date.now()
  };
}

export class SubsoloManager {
  constructor(gameState) {
    this.gameState = gameState;
    if (!this.gameState.subsolo) {
      this.gameState.subsolo = createDefaultSubsoloState();
    }
  }

  get data() {
    return this.gameState.subsolo;
  }

  isUnlocked() {
    return (
      SUBSOLO_ENABLED &&
      this.data.conteudoSecreto.ativo &&
      this.data.conteudoSecreto.consentimento &&
      !this.data.conteudoSecreto.modoDiscreto &&
      this.gameState.level >= SUBSOLO_UNLOCK_LEVEL &&
      this.data.concessaoPaga
    );
  }

  canAccessGrate() {
    return (
      SUBSOLO_ENABLED &&
      this.data.conteudoSecreto.ativo &&
      this.data.conteudoSecreto.consentimento &&
      !this.data.conteudoSecreto.modoDiscreto &&
      this.gameState.level >= SUBSOLO_UNLOCK_LEVEL
    );
  }

  /**
   * Paga a concessão do túnel para iniciar o negócio secreto.
   */
  payConcession() {
    if (this.data.concessaoPaga) return true;
    if (this.gameState.coins < SUBSOLO_CONCESSION_COST) return false;

    this.gameState.coins -= SUBSOLO_CONCESSION_COST;
    this.data.concessaoPaga = true;
    this.data.desbloqueado = true;
    this.data.respeito.nivel = 1;
    this.data.respeito.xp = 0;
    this.gameState.notify('subsolo_unlocked');
    this.gameState.save();
    return true;
  }

  /**
   * Processamento periódico ou offline por timestamps absolutos.
   */
  update(dt, now = Date.now()) {
    if (!this.data.concessaoPaga) return;

    const elapsedSeconds = Math.max(0, (now - this.data.lastUpdateTimestamp) / 1000);
    this.data.lastUpdateTimestamp = now;

    // 1. Recursos (consumo moderado de combustível e água)
    if (this.data.recursos.combustivel > 0) {
      this.data.recursos.combustivel = Math.max(0, this.data.recursos.combustivel - elapsedSeconds * 0.005);
      this.data.recursos.energia = Math.min(this.data.recursos.maxEnergia, this.data.recursos.energia + elapsedSeconds * 0.1);
    } else {
      this.data.recursos.energia = Math.max(0, this.data.recursos.energia - elapsedSeconds * 0.05);
    }

    const hasPower = this.data.recursos.energia > 5;
    const hasWater = this.data.recursos.agua > 5;
    // Degradação a 25% na ausência de recursos (NUNCA zero = sem soft-locks)
    const resourceSpeedMultiplier = (hasPower && hasWater) ? 1.0 : 0.25;

    // 2. Cultivo nos canteiros
    for (const plot of this.data.canteiros) {
      if (plot.status === 'growing') {
        const variety = SUBSOLO_VARIETIES[plot.varietyId] || SUBSOLO_VARIETIES.sombra_verde;
        const totalDuration = variety.growthTimeSeconds;
        const addedProgress = (elapsedSeconds * resourceSpeedMultiplier) / totalDuration;
        plot.progress = Math.min(1.0, plot.progress + addedProgress);
        if (plot.progress >= 1.0) {
          plot.status = 'ready';
        }
      }
    }

    // 3. Estendais de secagem
    for (const rack of this.data.estendais) {
      if (rack.status === 'drying') {
        const duration = rack.duration || 600;
        const timePassed = (now - rack.startedAt) / 1000;
        if (timePassed >= duration) {
          rack.status = 'ready';
        }
      }
    }

    // 4. Oficina de preparação
    if (this.data.preparacao.status === 'preparing') {
      const timePassed = (now - this.data.preparacao.startedAt) / 1000;
      if (timePassed >= this.data.preparacao.duration) {
        this.data.preparacao.status = 'ready';
      }
    }

    // 5. Automação do Mensageiro (S4+)
    // Transporta produto do Armazém para o Cofre silenciosamente; NUNCA vende.
    if (this.data.ajudantes.mensageiroAtivo) {
      const cofreCap = this.getCofreCapacity();
      for (const prodId of ['ramo', 'maco', 'reserva']) {
        const currentInCofre = this.data.cofre[prodId] || 0;
        const targetTarget = Math.floor(cofreCap / 3);
        if (currentInCofre < targetTarget && (this.data.armazemOculto[prodId] || 0) > 0) {
          this.data.armazemOculto[prodId]--;
          this.data.cofre[prodId] = (this.data.cofre[prodId] || 0) + 1;
        }
      }
    }

    // 6. Calor e Inspeções (módulo ativo apenas se não estiver em Modo Tranquilo)
    if (!this.data.conteudoSecreto.modoTranquilo) {
      // O Calor desce 1 por minuto com o jogador ativo; nunca corre offline
      if (this.data.calor.valor > 0) {
        this.data.calor.valor = Math.max(0, this.data.calor.valor - elapsedSeconds * (1 / 60));
      }

      // Fiscalização
      if (this.data.calor.fiscalPresente) {
        this.data.calor.fiscalJanelaRestante = Math.max(0, this.data.calor.fiscalJanelaRestante - dt);
        if (this.data.calor.fiscalJanelaRestante <= 0) {
          // Tempo expirou: avalia se o cofre foi ocultado
          this.resolveInspection();
        }
      } else if (this.data.calor.valor >= 90 && Math.random() < 0.05 * dt) {
        this.startFiscalInspection();
      }
    }

    // 7. Atualização da rotação do dicionário
    this.data.caderno.versaoDicionario = getSeasonalDictionaryVersion(now);
  }

  // --- Ações de Produção ---

  plantSeed(plotIndex, varietyId = 'sombra_verde') {
    const plot = this.data.canteiros[plotIndex];
    if (!plot || plot.status !== 'empty') return false;

    const variety = SUBSOLO_VARIETIES[varietyId];
    if (!variety) return false;
    if (this.data.respeito.nivel < variety.requiredRespect) return false;
    if (this.gameState.coins < variety.seedCost) return false;

    this.gameState.coins -= variety.seedCost;
    plot.varietyId = varietyId;
    plot.status = 'growing';
    plot.progress = 0;
    plot.plantedAt = Date.now();
    return true;
  }

  harvestPlot(plotIndex) {
    const plot = this.data.canteiros[plotIndex];
    if (!plot || plot.status !== 'ready') return false;

    const variety = SUBSOLO_VARIETIES[plot.varietyId] || SUBSOLO_VARIETIES.sombra_verde;
    const leaves = variety.yieldLeaves;

    // Encontra um estendal livre para pendurar de imediato ou envia para secagem
    let rack = this.data.estendais.find((r) => r.status === 'empty');
    if (rack) {
      rack.status = 'drying';
      rack.varietyId = plot.varietyId;
      rack.leaves = leaves;
      rack.startedAt = Date.now();
      rack.duration = variety.dryingTimeSeconds;
    } else {
      // Se não houver estendal livre, guarda folhas frescas e converte em secas após um tempo base
      this.data.armazemOculto.folhasSecas += leaves;
    }

    plot.status = 'empty';
    plot.progress = 0;
    plot.varietyId = null;
    return true;
  }

  collectRack(rackIndex) {
    const rack = this.data.estendais[rackIndex];
    if (!rack || rack.status !== 'ready') return false;

    this.data.armazemOculto.folhasSecas += rack.leaves;
    rack.status = 'empty';
    rack.varietyId = null;
    rack.leaves = 0;
    return true;
  }

  startPreparation(productId) {
    if (this.data.preparacao.status !== 'idle') return false;
    const product = SUBSOLO_PRODUCTS[productId];
    if (!product) return false;
    if (this.data.respeito.nivel < product.requiredRespect) return false;
    if ((this.data.armazemOculto.folhasSecas || 0) < product.requiredLeaves) return false;

    this.data.armazemOculto.folhasSecas -= product.requiredLeaves;
    this.data.preparacao.status = 'preparing';
    this.data.preparacao.productId = productId;
    this.data.preparacao.startedAt = Date.now();
    const speedBonus = 1 - (this.data.melhorias.preparacao || 0) * 0.15;
    this.data.preparacao.duration = Math.max(30, product.prepTimeSeconds * speedBonus);
    return true;
  }

  collectPreparation() {
    if (this.data.preparacao.status !== 'ready') return false;
    const prodId = this.data.preparacao.productId;
    this.data.armazemOculto[prodId] = (this.data.armazemOculto[prodId] || 0) + 1;
    this.data.preparacao.status = 'idle';
    this.data.preparacao.productId = null;
    return true;
  }

  // --- Dínamo Manual e Recursos (Anti-softlock) ---

  crankManualDynamo() {
    // Tocar gera +15 energia imediata; nunca deixa o jogador sem saída
    this.data.recursos.energia = Math.min(
      this.data.recursos.maxEnergia,
      this.data.recursos.energia + 15
    );
    return true;
  }

  buyFuel(amountLitres = 20) {
    const cost = amountLitres * 200;
    if (this.gameState.coins < cost) return false;
    if (this.data.recursos.combustivel >= this.data.recursos.maxCombustivel) return false;

    this.gameState.coins -= cost;
    this.data.recursos.combustivel = Math.min(
      this.data.recursos.maxCombustivel,
      this.data.recursos.combustivel + amountLitres
    );
    return true;
  }

  refillWater() {
    this.data.recursos.agua = this.data.recursos.maxAgua;
    return true;
  }

  // --- Logística: Mala e Cofre ---

  transferToMala(productId, amount = 1) {
    const available = this.data.armazemOculto[productId] || 0;
    if (available < amount) return false;

    const currentTotalMala = (this.data.mala.ramo || 0) + (this.data.mala.maco || 0) + (this.data.mala.reserva || 0);
    const cap = this.getMalaCapacity();
    if (currentTotalMala + amount > cap) return false;

    this.data.armazemOculto[productId] -= amount;
    this.data.mala[productId] = (this.data.mala[productId] || 0) + amount;
    return true;
  }

  depositMalaToCofre(productId, amount = 1) {
    const inMala = this.data.mala[productId] || 0;
    if (inMala < amount) return false;

    const currentInCofre = (this.data.cofre.ramo || 0) + (this.data.cofre.maco || 0) + (this.data.cofre.reserva || 0);
    const cap = this.getCofreCapacity();
    if (currentInCofre + amount > cap) return false;

    this.data.mala[productId] -= amount;
    this.data.cofre[productId] = (this.data.cofre[productId] || 0) + amount;
    return true;
  }

  getMalaCapacity() {
    return 10 + (this.data.melhorias.mala || 0) * 5;
  }

  getCofreCapacity() {
    return 15 + (this.data.melhorias.cofre || 0) * 6;
  }

  // --- Vendas e Respeito ---

  completeSale(order, packagingId = 'paper') {
    const productId = order.productId || 'ramo';
    const quantity = order.quantity || 1;

    // Verifica stock no Cofre (só se vende a partir do Cofre na superfície!)
    if ((this.data.cofre[productId] || 0) < quantity) {
      return { success: false, reason: 'Stock insuficiente no cofre' };
    }

    const packaging = PACKAGING_OPTIONS.find((p) => p.id === packagingId) || PACKAGING_OPTIONS[1];
    if (packaging.consumesFlowers) {
      // Consome flores comuns da loja para o Ramo de Fachada
      const availableFlowers = Object.entries(this.gameState.stock).filter(([, c]) => c >= 1);
      if (availableFlowers.length < 2) {
        return { success: false, reason: 'Flores insuficientes para o Ramo de Fachada' };
      }
      this.gameState.stock[availableFlowers[0][0]]--;
      this.gameState.stock[availableFlowers[1][0]]--;
    } else if (packaging.cost > 0) {
      if (this.gameState.coins < packaging.cost) {
        return { success: false, reason: 'Moedas insuficientes para a embalagem' };
      }
      this.gameState.coins -= packaging.cost;
    }

    // Deduz do Cofre
    this.data.cofre[productId] -= quantity;

    // Cálculo do Preço
    const prodConfig = SUBSOLO_PRODUCTS[productId] || SUBSOLO_PRODUCTS.ramo;
    const baseVal = prodConfig.baseValue * quantity;

    // Multiplicadores
    const respectMultiplier = Math.min(1.40, 1 + 0.02 * (this.data.respeito.nivel - 1));
    const modeMultiplier = this.data.conteudoSecreto.modoTranquilo ? 0.90 : 1.00;
    const urgencyMultiplier = order.urgent ? 1.15 : 1.00;

    let finalPrice = Math.round(baseVal * respectMultiplier * modeMultiplier * urgencyMultiplier);

    // Credita a carteira única de moedas
    this.gameState.coins += finalPrice;
    this.gameState.stats.totalCoinsEarned += finalPrice;

    // Ganho de Respeito
    const xpGain = 12 * quantity + (packaging.repBonus || 0);
    this.addRespectXp(xpGain);

    // Ajuste de Calor (se aplicável)
    if (!this.data.conteudoSecreto.modoTranquilo) {
      const heatInc = 2 + (packaging.heatBonus || 0);
      this.data.calor.valor = Math.min(100, Math.max(0, this.data.calor.valor + heatInc));
    }

    this.gameState.notify('subsolo_sale_completed', { revenue: finalPrice, respectXp: xpGain });
    this.gameState.save();
    return { success: true, revenue: finalPrice, xp: xpGain };
  }

  addRespectXp(amount) {
    this.data.respeito.xp += amount;
    const currentLvlConfig = SUBSOLO_RESPECT_CONFIG.find((c) => c.level === this.data.respeito.nivel);
    if (!currentLvlConfig) return;

    if (this.data.respeito.xp >= currentLvlConfig.xpNeeded && this.data.respeito.nivel < 20) {
      this.data.respeito.xp -= currentLvlConfig.xpNeeded;
      this.data.respeito.nivel++;
      this.gameState.notify('subsolo_respect_up', { level: this.data.respeito.nivel });
    }
  }

  // --- Calor e Inspeção ---

  startFiscalInspection() {
    this.data.calor.fiscalPresente = true;
    this.data.calor.fiscalJanelaRestante = 20; // 20 segundos para esconder o cofre
    this.gameState.notify('subsolo_inspection_started');
  }

  hideCofre() {
    if (!this.data.calor.fiscalPresente) return false;
    this.data.cofre.oculto = true;
    return true;
  }

  resolveInspection() {
    this.data.calor.fiscalPresente = false;
    if (this.data.cofre.oculto) {
      // Sucesso: cofre ocultado a tempo!
      this.data.calor.valor = Math.max(0, this.data.calor.valor - 35);
      this.addRespectXp(50);
      this.data.cofre.oculto = false;
      this.gameState.notify('subsolo_inspection_evaded');
    } else {
      // Falha: multa limitada e bloqueio de 10 min
      const multa = Math.min(25000, Math.floor(this.gameState.coins * 0.15));
      this.gameState.coins = Math.max(0, this.gameState.coins - multa);
      this.data.calor.bloqueadoAte = Date.now() + 10 * 60 * 1000;
      this.data.calor.valor = 40;
      this.gameState.notify('subsolo_inspection_fined', { fine: multa });
    }
  }
}
