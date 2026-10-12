// ========================================================
// FloristEver v2.0.0 — Gestor de Cenas: Superfície ↔ Subsolo (scene-manager.js)
// Gestão de transições, ciclo visual, saída de emergência e kill-switch
// ========================================================

import { SUBSOLO_ENABLED } from './subsolo-config.js';

export const SCENE_STATES = Object.freeze({
  SUPERFICIE: 'SUPERFICIE',
  TRANSICAO_DESCER: 'TRANSICAO_DESCER',
  SUBSOLO: 'SUBSOLO',
  TRANSICAO_SUBIR: 'TRANSICAO_SUBIR'
});

export class SceneManager {
  constructor(game) {
    this.game = game;
    this.currentState = SCENE_STATES.SUPERFICIE;
    this.transitionProgress = 0; // 0.0 a 1.0
    this.transitionDuration = 0.65; // ~650 ms fade
    this.transitionTime = 0;
    this.fadeAlpha = 0;
    this.isDebounced = false;
    this.transitionStep = 'fade_out'; // 'fade_out' | 'switch' | 'fade_in'
    this.onTransitionComplete = null;
    this.transitionCount = 0;
    this.lastTransitionDurationMs = 0;
    this.transitionStartTimestamp = 0;

    // Posições da grelha de esgoto na superfície (área de serviço atrás da floricultura)
    this.gratePosition = { x: 500, y: 140, radius: 28 };
    // Posição de saída ao fundo da escada no subsolo
    this.subsoloSpawnPosition = { x: 180, y: 260 };
  }

  getCurrentScene() {
    return this.currentState;
  }

  isSurfaceActive() {
    return this.currentState === SCENE_STATES.SUPERFICIE;
  }

  isSubsoloActive() {
    return this.currentState === SCENE_STATES.SUBSOLO;
  }

  isTransitioning() {
    return (
      this.currentState === SCENE_STATES.TRANSICAO_DESCER ||
      this.currentState === SCENE_STATES.TRANSICAO_SUBIR
    );
  }

  /**
   * Inicia a transição de descida para o Subsolo.
   */
  startDescer() {
    if (!SUBSOLO_ENABLED) return false;
    if (this.isTransitioning() || this.currentState !== SCENE_STATES.SUPERFICIE) return false;
    if (this.isDebounced) return false;

    this.isDebounced = true;
    this.currentState = SCENE_STATES.TRANSICAO_DESCER;
    this.transitionProgress = 0;
    this.transitionTime = 0;
    this.transitionStep = 'fade_out';
    this.transitionStartTimestamp = performance.now();

    // Fecha modais abertos
    if (this.game.hud) {
      this.game.hud.closeAllModals?.();
      this.game.hud.showToast('A descer ao túnel secreto...', 'info');
    }

    if (this.game.soundManager) {
      this.game.soundManager.playTone(180, { duration: 0.35, type: 'triangle', volume: 0.2 });
    }

    return true;
  }

  /**
   * Inicia a transição de subida de regresso à Superfície.
   */
  startSubir() {
    if (this.isTransitioning() || this.currentState !== SCENE_STATES.SUBSOLO) return false;
    if (this.isDebounced) return false;

    this.isDebounced = true;
    this.currentState = SCENE_STATES.TRANSICAO_SUBIR;
    this.transitionProgress = 0;
    this.transitionTime = 0;
    this.transitionStep = 'fade_out';
    this.transitionStartTimestamp = performance.now();

    if (this.game.soundManager) {
      this.game.soundManager.playTone(320, { duration: 0.3, type: 'sine', volume: 0.2 });
    }

    return true;
  }

  /**
   * Saída de emergência: recuperação segura direta para a superfície sem risco de corrupção.
   */
  emergencyExitToSurface() {
    this.currentState = SCENE_STATES.SUPERFICIE;
    this.transitionProgress = 0;
    this.transitionTime = 0;
    this.fadeAlpha = 0;
    this.isDebounced = false;

    // Reposiciona o jogador junto à grelha de esgoto
    if (this.game.player) {
      this.game.player.x = this.gratePosition.x;
      this.game.player.y = this.gratePosition.y + 40;
    }

    if (this.game.camera) {
      this.game.camera.x = this.gratePosition.x;
      this.game.camera.y = this.gratePosition.y + 40;
    }

    if (this.game.hud) {
      this.game.hud.showToast('Regresso seguro à floricultura efetuado.', 'check');
    }

    // Salva o progresso
    if (this.game.state) {
      this.game.state.save();
    }

    if (typeof this.onTransitionComplete === 'function') {
      this.onTransitionComplete(this.currentState);
    }
  }

  /**
   * Atualização lógica da transição por delta-time.
   */
  update(dt) {
    if (!this.isTransitioning()) return;

    this.transitionTime += dt;
    this.transitionProgress = Math.min(1.0, this.transitionTime / this.transitionDuration);

    if (this.transitionStep === 'fade_out') {
      this.fadeAlpha = Math.min(1.0, this.transitionProgress * 2.0); // Atinge 1.0 a meio
      if (this.transitionProgress >= 0.5) {
        // Ponto de comutação a meio do ecrã preto
        this.transitionStep = 'switch';
        this.executeSceneSwitch();
      }
    } else if (this.transitionStep === 'fade_in') {
      this.fadeAlpha = Math.max(0, 1.0 - (this.transitionProgress - 0.5) * 2.0);
      if (this.transitionProgress >= 1.0) {
        // Transição concluída
        this.fadeAlpha = 0;
        this.isDebounced = false;
        this.lastTransitionDurationMs = performance.now() - this.transitionStartTimestamp;
        this.transitionCount++;

        if (this.currentState === SCENE_STATES.TRANSICAO_DESCER) {
          this.currentState = SCENE_STATES.SUBSOLO;
        } else if (this.currentState === SCENE_STATES.TRANSICAO_SUBIR) {
          this.currentState = SCENE_STATES.SUPERFICIE;
        }

        if (typeof this.onTransitionComplete === 'function') {
          this.onTransitionComplete(this.currentState);
        }
      }
    }
  }

  /**
   * Comutação do estado de renderização.
   */
  executeSceneSwitch() {
    this.transitionStep = 'fade_in';

    if (this.currentState === SCENE_STATES.TRANSICAO_DESCER) {
      // Entrou no Subsolo: reposiciona jogador e câmara no subsolo
      if (this.game.player) {
        this.game.player.x = this.subsoloSpawnPosition.x;
        this.game.player.y = this.subsoloSpawnPosition.y;
      }
      if (this.game.camera) {
        this.game.camera.x = this.subsoloSpawnPosition.x;
        this.game.camera.y = this.subsoloSpawnPosition.y;
      }
    } else {
      // Regressou à Superfície: reposiciona o jogador ao lado da grelha
      if (this.game.player) {
        this.game.player.x = this.gratePosition.x;
        this.game.player.y = this.gratePosition.y + 35;
      }
      if (this.game.camera) {
        this.game.camera.x = this.gratePosition.x;
        this.game.camera.y = this.gratePosition.y + 35;
      }
    }
  }

  /**
   * Renderiza o overlay de transição e poeira no Canvas.
   */
  drawTransitionOverlay(ctx, width, height) {
    if (this.fadeAlpha <= 0.001) return;

    ctx.save();
    ctx.fillStyle = `rgba(18, 22, 24, ${this.fadeAlpha})`;
    ctx.fillRect(0, 0, width, height);

    // Efeito subtil de partículas/poeira no centro durante o fade
    if (this.fadeAlpha > 0.4) {
      const centerX = width / 2;
      const centerY = height / 2;
      ctx.fillStyle = 'rgba(255, 200, 87, 0.4)';
      for (let i = 0; i < 5; i++) {
        const offset = (Math.sin(this.transitionTime * 10 + i) * 30);
        ctx.beginPath();
        ctx.arc(centerX + offset, centerY + (i * 12) - 24, 2 + i * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /**
   * Desenha a grelha de esgoto atrás da floricultura na superfície.
   */
  drawGrateOnSurface(ctx, visibleBounds) {
    if (!SUBSOLO_ENABLED) return;
    const { x, y, radius } = this.gratePosition;

    if (visibleBounds && (
      x + radius < visibleBounds.left ||
      x - radius > visibleBounds.right ||
      y + radius < visibleBounds.top ||
      y - radius > visibleBounds.bottom
    )) {
      return;
    }

    ctx.save();
    // Moldura de pedra em redor da grelha
    ctx.fillStyle = '#655A52';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, radius + 4, (radius * 0.7) + 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fundo escuro do buraco
    ctx.fillStyle = '#1A1817';
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();

    // Barras de ferro da grelha
    ctx.strokeStyle = '#3E4A52';
    ctx.lineWidth = 3;
    for (let offset = -radius + 6; offset <= radius - 6; offset += 7) {
      const halfHeight = Math.sqrt(Math.max(0, radius * radius - offset * offset)) * 0.65;
      ctx.beginPath();
      ctx.moveTo(x + offset, y - halfHeight);
      ctx.lineTo(x + offset, y + halfHeight);
      ctx.stroke();
    }

    // Aro de ferro exterior
    ctx.strokeStyle = '#2A2F33';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.65, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Brilho discreto quando desbloqueado
    const pulse = 0.3 + 0.2 * Math.sin(performance.now() / 400);
    ctx.fillStyle = `rgba(181, 107, 255, ${pulse})`;
    ctx.beginPath();
    ctx.arc(x, y - 2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
