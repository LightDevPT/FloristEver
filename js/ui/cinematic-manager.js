const CINEMATICS = Object.freeze({
  floristever: Object.freeze({
    id: 'floristever-intro',
    title: 'Apresentação do FloristEver',
    src: new URL('../../cinematic-assets/floristever-intro.html', import.meta.url).href
  }),
  subsolo: Object.freeze({
    id: 'subsolo-intro',
    title: 'Apresentação do Subsolo',
    src: new URL('../../cinematic-assets/subsolo-intro.html', import.meta.url).href
  })
});

const CINEMATIC_DURATION_SECONDS = 46;

export class CinematicManager {
  constructor(state, game) {
    this.state = state;
    this.game = game;
    this.overlay = document.getElementById('cinematic-overlay');
    this.frame = document.getElementById('cinematic-frame');
    this.controlMask = document.getElementById('cinematic-control-mask');
    this.progress = document.getElementById('cinematic-progress');
    this.progressFill = document.getElementById('cinematic-progress-fill');
    this.error = document.getElementById('cinematic-error');
    this.errorMessage = document.getElementById('cinematic-error-message');
    this.retryButton = document.getElementById('cinematic-retry');
    this.skipButton = document.getElementById('cinematic-skip');
    this.gameRoot = document.getElementById('game-container');
    this.active = null;
    this.loadTimeout = null;
    this.previousFocus = null;
    this.previousInert = false;

    if (
      !this.overlay
      || !this.frame
      || !this.controlMask
      || !this.progress
      || !this.progressFill
      || !this.error
      || !this.errorMessage
      || !this.retryButton
      || !this.skipButton
    ) {
      throw new Error('The cinematic overlay is missing required elements.');
    }

    this.handleFrameLoad = this.handleFrameLoad.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.frame.addEventListener('load', this.handleFrameLoad);
    window.addEventListener('resize', this.handleResize);
    this.retryButton.addEventListener('click', () => this.retry());
    this.skipButton.addEventListener('click', () => this.skip());
  }

  get isPlaying() {
    return this.active !== null;
  }

  hasSeen(key) {
    return this.state.settings.cinematicSeen?.[key] === true;
  }

  playIfNeeded(key, onComplete) {
    if (this.hasSeen(key)) {
      onComplete?.();
      return false;
    }
    return this.play(key, onComplete);
  }

  replay(key, onComplete) {
    return this.play(key, onComplete);
  }

  play(key, onComplete = null) {
    const cinematic = CINEMATICS[key];
    if (!cinematic) throw new RangeError(`Unknown cinematic: ${key}`);
    if (this.active) return false;

    this.previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.previousInert = this.gameRoot?.inert === true;
    if (this.gameRoot) this.gameRoot.inert = true;
    this.game?.activeKeys?.clear();
    this.game?.player?.setInput(0, 0);
    if (this.game?.player) this.game.player.hasTarget = false;

    this.active = { key, cinematic, onComplete, ready: false };
    this.overlay.dataset.cinematic = key;
    this.overlay.setAttribute('aria-label', cinematic.title);
    this.overlay.setAttribute('aria-hidden', 'false');
    this.overlay.classList.remove('hidden');
    document.body.classList.add('cinematic-open');
    this.frame.title = cinematic.title;
    this.skipButton.focus();
    this.loadActiveCinematic();
    return true;
  }

  loadActiveCinematic() {
    const active = this.active;
    if (!active) return;
    window.clearTimeout(this.loadTimeout);
    if (active.animationFrameId !== null && active.animationFrameId !== undefined) {
      window.cancelAnimationFrame(active.animationFrameId);
    }
    active.animationFrameId = null;
    active.elapsed = 0;
    active.lastFrameTimestamp = null;
    active.ready = false;
    this.error.classList.add('hidden');
    this.frame.hidden = false;
    this.controlMask.hidden = true;
    this.progress.hidden = true;
    this.progressFill.style.transform = 'scaleX(0)';
    this.frame.src = 'about:blank';
    window.setTimeout(() => {
      if (this.active !== active) return;
      this.frame.src = active.cinematic.src;
      this.loadTimeout = window.setTimeout(() => {
        if (this.active !== active || active.ready) return;
        this.showLoadError();
      }, 12000);
    }, 0);
  }

  handleFrameLoad() {
    const active = this.active;
    if (!active || this.frame.contentWindow.location.href === 'about:blank') return;

    const contentDocument = this.frame.contentDocument;
    const canvas = contentDocument?.querySelector('canvas');
    const controls = contentDocument?.querySelector('.bar');
    if (!canvas || !controls) {
      this.showLoadError();
      return;
    }

    active.ready = true;
    active.controls = controls;
    controls.inert = true;
    controls.setAttribute('aria-hidden', 'true');
    window.clearTimeout(this.loadTimeout);
    this.loadTimeout = null;
    this.controlMask.hidden = false;
    this.progress.hidden = false;
    this.positionControlMask();
    this.updateProgress(active);
    active.animationFrameId = window.requestAnimationFrame(
      (timestamp) => this.advance(active, timestamp)
    );
  }

  handleResize() {
    if (this.active?.ready) this.positionControlMask();
  }

  positionControlMask() {
    const controls = this.active?.controls;
    if (!controls) return;

    const frameRect = this.frame.getBoundingClientRect();
    const controlsRect = controls.getBoundingClientRect();
    const contentDocument = this.frame.contentDocument;
    this.controlMask.style.left = `${frameRect.left + controlsRect.left}px`;
    this.controlMask.style.top = `${frameRect.top + controlsRect.top}px`;
    this.controlMask.style.width = `${controlsRect.width}px`;
    this.controlMask.style.height = `${controlsRect.height}px`;
    this.controlMask.style.backgroundColor = window
      .getComputedStyle(contentDocument.body)
      .backgroundColor;
  }

  advance(active, timestamp) {
    if (this.active !== active) return;

    if (active.lastFrameTimestamp !== null) {
      const elapsed = Math.max(0, (timestamp - active.lastFrameTimestamp) / 1000);
      active.elapsed += Math.min(0.1, elapsed);
    }
    active.lastFrameTimestamp = timestamp;

    if (active.elapsed >= CINEMATIC_DURATION_SECONDS) {
      this.complete(active);
      return;
    }

    this.updateProgress(active);
    active.animationFrameId = window.requestAnimationFrame(
      (nextTimestamp) => this.advance(active, nextTimestamp)
    );
  }

  updateProgress(active) {
    const progress = Math.min(1, active.elapsed / CINEMATIC_DURATION_SECONDS);
    this.progress.setAttribute('aria-valuenow', String(Math.floor(active.elapsed)));
    this.progressFill.style.transform = `scaleX(${progress})`;
  }

  complete(active) {
    if (this.active !== active) return;

    this.state.settings.cinematicSeen[active.key] = true;
    if (!this.state.save() && !this.state.sessionOnlyMode) {
      this.game?.hud?.showToast(
        'Não foi possível guardar a conclusão; a apresentação poderá voltar a aparecer.',
        'error'
      );
    }
    const onComplete = active.onComplete;
    this.active = null;
    this.close(active);
    onComplete?.();
  }

  showLoadError() {
    this.frame.hidden = true;
    this.controlMask.hidden = true;
    this.progress.hidden = true;
    this.errorMessage.textContent = 'Não foi possível carregar a apresentação. Tenta novamente para a ver completa.';
    this.error.classList.remove('hidden');
    this.retryButton.focus();
  }

  retry() {
    if (!this.active) return;
    this.loadActiveCinematic();
    this.skipButton.focus();
  }

  skip() {
    if (!this.active) return;
    this.complete(this.active);
  }

  close(active = this.active) {
    window.clearTimeout(this.loadTimeout);
    this.loadTimeout = null;
    if (active?.animationFrameId !== null && active?.animationFrameId !== undefined) {
      window.cancelAnimationFrame(active.animationFrameId);
    }
    this.frame.src = 'about:blank';
    this.frame.hidden = false;
    this.controlMask.hidden = true;
    this.progress.hidden = true;
    this.progressFill.style.transform = 'scaleX(0)';
    this.error.classList.add('hidden');
    this.overlay.setAttribute('aria-hidden', 'true');
    this.overlay.classList.add('hidden');
    document.body.classList.remove('cinematic-open');
    if (this.gameRoot) this.gameRoot.inert = this.previousInert;
    this.game?.activeKeys?.clear();
    this.game?.player?.setInput(0, 0);
    const canRestoreFocus = this.previousFocus?.isConnected
      && !this.previousFocus.closest?.('.hidden, [hidden], [inert]');
    if (canRestoreFocus) this.previousFocus.focus();
    else this.game?.canvas?.focus?.();
    this.previousFocus = null;
    if (this.active === active || !active) {
      this.active = null;
    }
  }

  destroy() {
    window.clearTimeout(this.loadTimeout);
    if (this.active?.animationFrameId !== null && this.active?.animationFrameId !== undefined) {
      window.cancelAnimationFrame(this.active.animationFrameId);
    }
    this.frame.removeEventListener('load', this.handleFrameLoad);
    window.removeEventListener('resize', this.handleResize);
    this.active = null;
  }
}
