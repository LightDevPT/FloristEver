import { lightLoginClient } from '../light-login-client.js';
import { TERMS_VERSION } from '../config/terms.js';

export class AccountUi {
  constructor(state, hud, options = {}) {
    this.state = state;
    this.hud = hud;
    this.client = lightLoginClient;
    this.hostId = options.hostId || 'account-settings-panel';
    this.onBeforeAuthenticate = options.onBeforeAuthenticate || null;
    this.onAuthenticated = options.onAuthenticated || null;
    this.onAccountChange = options.onAccountChange || null;
    this.disableSync = options.disableSync === true;
    this.enableAutosync = options.enableAutosync !== false;
    this.syncing = false;
    this.panel = null;
    this.statusEl = null;
    this.formMode = 'login';
    this.renderShell();
    this.bindAutosync();
  }

  renderShell() {
    const settingsHost = document.getElementById(this.hostId);
    if (settingsHost) {
      settingsHost.className = 'account-settings-panel';
      settingsHost.innerHTML = `
        <div class="account-settings-header">
          <label>Conta Light Group</label>
          <p class="setting-help">Sincroniza o progresso entre Web, Android e Windows.</p>
        </div>
        <div class="account-status" aria-live="polite"></div>
        <form class="account-form"></form>
      `;
      this.statusEl = settingsHost.querySelector('.account-status');
      this.formEl = settingsHost.querySelector('.account-form');
      this.renderForm();
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'account-fab';
    button.setAttribute('aria-label', 'Conta Light Group');
    button.textContent = 'Conta';
    document.body.appendChild(button);

    this.panel = document.createElement('div');
    this.panel.className = 'account-panel hidden';
    this.panel.innerHTML = `
      <div class="account-card" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <div class="account-header">
          <div>
            <h2 id="account-title">Conta Light Group</h2>
            <p class="account-subtitle">FloristEver</p>
          </div>
          <button type="button" class="account-close" aria-label="Fechar">x</button>
        </div>
        <div class="account-status" aria-live="polite"></div>
        <form class="account-form"></form>
      </div>
    `;
    document.body.appendChild(this.panel);
    this.statusEl = this.panel.querySelector('.account-status');
    this.formEl = this.panel.querySelector('.account-form');
    button.addEventListener('click', () => this.open());
    this.panel.querySelector('.account-close').addEventListener('click', () => this.close());
    this.panel.addEventListener('click', (event) => {
      if (event.target === this.panel) this.close();
    });
    this.renderForm();
  }

  open() {
    if (!this.panel) return;
    this.panel.classList.remove('hidden');
    this.renderForm();
    this.formEl.querySelector('input')?.focus();
  }

  close() {
    if (!this.panel) return;
    this.panel.classList.add('hidden');
  }

  setStatus(message, type = 'info') {
    this.statusEl.textContent = message;
    this.statusEl.dataset.type = type;
  }

  renderForm() {
    if (this.client.user) {
      this.formEl.innerHTML = `
        <div class="account-user">
          <strong>${this.escape(this.client.user.username)}</strong>
          ${this.client.user.email ? `<span>${this.escape(this.client.user.email)}</span>` : ''}
        </div>
        <div class="account-actions">
          <button type="button" data-action="sync">Sincronizar agora</button>
          <button type="button" data-action="logout" class="secondary">Sair</button>
        </div>
      `;
      this.formEl.querySelector('[data-action="sync"]').addEventListener('click', () => this.syncNow({ preferRemote: false }));
      this.formEl.querySelector('[data-action="logout"]').addEventListener('click', () => this.logout());
      this.setStatus(`Ligado. Revisao cloud: ${this.client.cloudRevision || 0}.`, 'success');
      return;
    }

    const isCreate = this.formMode === 'create';
    const isForgot = this.formMode === 'forgot';
    this.formEl.innerHTML = `
      ${isForgot ? `
        <label>Email<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
        <div class="account-actions">
          <button type="submit">Enviar instruções</button>
          <button type="button" class="secondary" data-action="verification">Reenviar confirmação do email</button>
          <button type="button" class="secondary" data-action="back">Voltar</button>
        </div>
      ` : `
        ${isCreate ? `
          <label>Nome de utilizador<input name="username" autocomplete="username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,19}" title="Usa 3 a 20 letras, números, pontos, hífenes ou sublinhados; começa por letra ou número."></label>
          <label>Email<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
        ` : `
          <label>Email ou nome de utilizador<input name="identifier" autocomplete="username" required></label>
        `}
        <label>Palavra-passe<input name="password" type="password" autocomplete="${isCreate ? 'new-password' : 'current-password'}" required ${isCreate ? 'minlength="12" maxlength="128"' : ''}></label>
        ${isCreate ? '<p class="setting-help">Usa 12 a 128 caracteres, com maiúscula, minúscula, número e símbolo. Evita o teu nome de utilizador, sequências óbvias, quatro caracteres iguais seguidos e espaços no início ou no fim.</p>' : ''}
        ${isCreate ? '<label>Confirmar palavra-passe<input name="confirmPassword" type="password" autocomplete="new-password" required></label>' : ''}
        <div class="account-actions">
          <button type="submit">${isCreate ? 'Criar conta' : 'Entrar'}</button>
          ${!isCreate ? '<button type="button" class="secondary" data-action="forgot">Esqueci-me da palavra-passe</button>' : ''}
          <button type="button" class="secondary" data-action="toggle">${isCreate ? 'Ja tenho conta' : 'Criar conta'}</button>
        </div>
      `}
    `;
    if (isForgot) {
      this.formEl.querySelector('[data-action="verification"]').addEventListener('click', async () => {
        if (!navigator.onLine) {
          this.setStatus('Sem ligação à internet. Tenta novamente quando estiveres online.', 'error');
          return;
        }
        this.setStatus('A enviar confirmação...');
        try {
          const form = new FormData(this.formEl);
          await this.client.resendEmailVerification(form.get('email'));
          this.setStatus('Se a conta existir e precisar de confirmação, enviámos instruções.', 'success');
        } catch (error) {
          this.setStatus(error.message || 'Não foi possível reenviar a confirmação.', 'error');
        }
      });
      this.formEl.querySelector('[data-action="back"]').addEventListener('click', () => {
        this.formMode = 'login';
        this.renderForm();
      });
      this.formEl.onsubmit = (event) => this.submit(event);
      return;
    }
    this.formEl.querySelector('[data-action="toggle"]').addEventListener('click', () => {
      this.formMode = isCreate ? 'login' : 'create';
      this.setStatus('');
      this.renderForm();
    });
    if (!isCreate) {
      this.formEl.querySelector('[data-action="forgot"]').addEventListener('click', () => {
        this.formMode = 'forgot';
        this.setStatus('');
        this.renderForm();
      });
    }
    this.formEl.onsubmit = (event) => this.submit(event);
  }

  async submit(event) {
    event.preventDefault();
    if (this.formMode === 'forgot') {
      if (!navigator.onLine) {
        this.setStatus('Sem ligação à internet. Tenta novamente quando estiveres online.', 'error');
        return;
      }
      this.setStatus('A enviar instruções...');
      try {
        const form = new FormData(this.formEl);
        await this.client.requestPasswordReset(form.get('email'));
        this.formMode = 'login';
        this.renderForm();
        this.setStatus('Se a conta existir, enviámos instruções para repor a palavra-passe.', 'success');
      } catch (error) {
        this.setStatus(error.message || 'Não foi possível pedir a reposição da palavra-passe.', 'error');
      }
      return;
    }
    if (this.onBeforeAuthenticate && !this.onBeforeAuthenticate()) return;
    if (!navigator.onLine) {
      this.setStatus('Sem ligação à internet. A conta requer internet; podes continuar como convidado e o progresso será guardado neste dispositivo.', 'error');
      return;
    }
    const form = new FormData(this.formEl);
    this.setStatus('A comunicar com o Light Group Login...');
    try {
      if (this.formMode === 'create') {
        const username = form.get('username');
        const password = form.get('password');
        const registration = await this.client.register({
          email: form.get('email'),
          username,
          password,
          confirmPassword: form.get('confirmPassword'),
          termsVersion: TERMS_VERSION
        });
        if (!registration.user.emailVerified) {
          this.formMode = 'login';
          this.renderForm();
          this.setStatus('Conta criada. Consulta o teu email e confirma a conta antes de iniciares sessão.', 'success');
          return;
        }
        await this.client.login({
          identifier: username,
          password,
          rememberMe: true
        });
        this.onAccountChange?.(this.client.user);
        await this.syncNow({ preferRemote: false });
        this.renderForm();
        this.setStatus(
          this.disableSync
            ? 'Conta autenticada. A sincronização está desativada nesta sessão de teste.'
            : 'Conta criada e progresso local guardado na cloud.',
          'success'
        );
        this.onAuthenticated?.();
        return;
      }
      await this.client.login({
        identifier: form.get('identifier'),
        password: form.get('password'),
        rememberMe: true
      });
      this.onAccountChange?.(this.client.user);
      await this.syncNow({ preferRemote: true });
      this.renderForm();
      this.onAuthenticated?.();
    } catch (error) {
      const message = !navigator.onLine || error instanceof TypeError
        ? 'Não foi possível ligar ao serviço de contas. Podes continuar como convidado; o progresso fica guardado neste dispositivo.'
        : error.details?.join?.(', ') || error.message || 'Nao foi possivel concluir o pedido.';
      this.setStatus(message, 'error');
    }
  }

  async bootstrap() {
    if (this.disableSync || !this.client.accessToken) return;
    try {
      this.client.syncEnabled = true;
      await this.client.me();
      this.onAccountChange?.(this.client.user);
      await this.syncNow({ preferRemote: true, silent: true });
      this.renderForm();
      this.onAuthenticated?.();
      return true;
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        this.client.clearSession();
      } else if (!navigator.onLine || error instanceof TypeError) {
        this.client.syncEnabled = true;
        this.setStatus('Sem ligação ao serviço. O progresso local está disponível; a sincronização será retomada quando houver ligação.', 'info');
      } else {
        console.error('Não foi possível validar a sessão da conta:', error);
        this.setStatus('Não foi possível validar a conta. O progresso local continua disponível.', 'error');
      }
      return false;
    }
  }

  async syncNow({ preferRemote = false, silent = false } = {}) {
    if (this.disableSync || this.syncing || !this.client.accessToken || !this.client.syncEnabled) return;
    if (this.state.saveBlocked) {
      this.setStatus(
        'A sincronização foi suspensa para proteger um save que esta versão não conseguiu carregar. Atualiza a aplicação antes de voltar a sincronizar.',
        'error'
      );
      return;
    }
    if (!navigator.onLine) {
      if (!silent) this.setStatus('Sem ligação. O progresso local está guardado e será sincronizado quando a ligação regressar.', 'info');
      return;
    }
    this.syncing = true;
    if (!silent) this.setStatus('A sincronizar progresso...');
    try {
      const remote = await this.client.getSave();
      if (preferRemote && remote.save && remote.save.revision > this.client.cloudRevision) {
        this.state.importSaveData(remote.save.data);
        this.client.cloudRevision = remote.save.revision;
        this.hud?.showToast?.('Progresso carregado da conta Light Group.', 'success');
      } else {
        await this.client.putSave(this.state.exportSaveData());
        this.hud?.showToast?.('Progresso sincronizado.', 'coin');
      }
      if (!silent) this.setStatus(`Sincronizado. Revisao cloud: ${this.client.cloudRevision}.`, 'success');
    } catch (error) {
      if (error.status === 409) {
        if (silent) {
          this.setStatus('Existe uma versão diferente na conta. Abre as definições da conta para resolver o conflito com segurança.', 'error');
          return;
        }
        const keepLocal = confirm('Existe um progresso mais recente na conta. Queres manter este progresso local e substituir o da conta?');
        if (keepLocal) {
          await this.client.putSave(this.state.exportSaveData(), { force: true });
          this.setStatus(`Progresso local enviado. Revisao cloud: ${this.client.cloudRevision}.`, 'success');
        } else {
          const remote = await this.client.getSave();
          if (remote.save) {
            this.state.importSaveData(remote.save.data);
            this.client.cloudRevision = remote.save.revision;
            this.setStatus(`Progresso da conta carregado. Revisao cloud: ${this.client.cloudRevision}.`, 'success');
          }
        }
      } else if (!silent || !navigator.onLine || error instanceof TypeError) {
        const message = !navigator.onLine || error instanceof TypeError
          ? 'Sem ligação ao serviço. O progresso local está guardado e a sincronização será tentada novamente.'
          : error.message || 'Sincronizacao falhou.';
        this.setStatus(message, 'error');
      }
    } finally {
      this.syncing = false;
    }
  }

  bindAutosync() {
    if (!this.enableAutosync) return;
    setInterval(() => this.syncNow({ silent: true }), 30000);
    window.addEventListener('pagehide', () => this.syncNow({ silent: true }));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.syncNow({ silent: true });
    });
  }

  async logout() {
    await this.client.logout();
    this.onAccountChange?.(null);
    this.setStatus('Sessao terminada.');
    this.renderForm();
  }

  escape(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[char]);
  }
}
