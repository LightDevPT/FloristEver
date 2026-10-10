// ========================================================
// FloristEver - Tutorial Guiado e Não-Intrusivo (tutorial.js)
// Dicas contextuais para os primeiros minutos de jogo
// ========================================================

const REMINDER_DELAY = 12000;
const TRANSITION_DURATION = 250;

export class TutorialManager {
  constructor(state) {
    this.state = state;
    this.bannerEl = document.getElementById('tutorial-banner');
    this.textEl = document.getElementById('tutorial-text');
    this.dismissBtn = document.getElementById('btn-dismiss-tutorial');
    this.userHasMoved = false;
    this.reminderTimeout = null;
    this.transitionTimeout = null;

    this.steps = [
      {
        text: 'Bem-vindo ao FloristEver! Usa as teclas WASD ou setas para andar; no telemóvel, usa o joystick virtual para chegar ao campo de Margaridas.',
        check: () => this.userHasMoved
      },
      {
        text: 'Caminha por cima das flores maduras para as colher para o teu cesto de vime!',
        check: () => this.state.basket.length >= 2 || this.state.stats.totalHarvested >= 2
      },
      {
        text: 'Boa colheita! Agora caminha até ao balcão de madeira da loja para abastecer o stock e atender clientes.',
        check: () => this.state.stats.customersServed > 0 || Object.values(this.state.stock).some((count) => count > 0)
      },
      {
        text: 'Fantástico! Clica no botão "Melhorias" para contratar um Caixa Automático ou comprar novos campos.',
        check: () => (this.state.upgrades.cashier > 0 || this.state.upgrades.harvester > 0 || this.state.coins > 100)
      }
    ];

    this.currentStep = Math.min(this.state.tutorial.currentStep, this.steps.length);
    this.isCompleted = this.state.tutorial.completed || this.currentStep >= this.steps.length;
    this.init();
  }

  init() {
    if (this.isCompleted || (this.state.stats.totalHarvested > 8 || this.state.level > 1)) {
      this.complete();
      return;
    }

    if (this.dismissBtn) {
      this.dismissBtn.addEventListener('click', () => this.dismissTemporarily());
    }

    this.showCurrentStep();
    this.state.subscribe(() => this.checkProgress());
    this.checkProgress();
  }

  markPlayerMoved() {
    if (!this.userHasMoved) {
      this.userHasMoved = true;
      this.checkProgress();
    }
  }

  persist() {
    this.state.tutorial.currentStep = this.currentStep;
    this.state.tutorial.completed = this.isCompleted;
    this.state.save();
  }

  clearTimers() {
    if (this.reminderTimeout !== null) {
      window.clearTimeout(this.reminderTimeout);
      this.reminderTimeout = null;
    }
    if (this.transitionTimeout !== null) {
      window.clearTimeout(this.transitionTimeout);
      this.transitionTimeout = null;
    }
  }

  hide() {
    if (!this.bannerEl) return;
    this.bannerEl.classList.add('is-leaving');
    this.transitionTimeout = window.setTimeout(() => {
      this.bannerEl.classList.add('hidden');
      this.bannerEl.classList.remove('is-leaving', 'is-entering');
      this.transitionTimeout = null;
    }, TRANSITION_DURATION);
  }

  dismissTemporarily() {
    if (this.isCompleted) return;
    this.clearTimers();
    this.hide();
    this.reminderTimeout = window.setTimeout(() => {
      this.reminderTimeout = null;
      this.checkProgress();
      if (!this.isCompleted) this.showCurrentStep();
    }, REMINDER_DELAY);
  }

  showCurrentStep() {
    if (this.isCompleted || !this.textEl || !this.bannerEl) return;
    const step = this.steps[this.currentStep];
    if (!step) {
      this.complete();
      return;
    }

    if (this.transitionTimeout !== null) {
      window.clearTimeout(this.transitionTimeout);
      this.transitionTimeout = null;
    }
    const isVisible = !this.bannerEl.classList.contains('hidden');
    this.bannerEl.classList.remove('hidden', 'is-leaving', 'is-entering');
    this.textEl.textContent = step.text;
    if (isVisible) {
      this.bannerEl.offsetWidth;
      this.bannerEl.classList.add('is-entering');
    }
  }

  complete() {
    this.isCompleted = true;
    this.currentStep = this.steps.length;
    this.clearTimers();
    this.persist();
    this.hide();
  }

  checkProgress() {
    if (this.isCompleted) return;

    const step = this.steps[this.currentStep];
    if (!step || !step.check()) return;

    this.clearTimers();
    this.currentStep++;

    if (this.currentStep >= this.steps.length) {
      this.complete();
      return;
    }

    this.persist();
    this.showCurrentStep();
    this.checkProgress();
  }
}
