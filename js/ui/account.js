import { lightLoginClient } from '../light-login-client.js';
import { TERMS_VERSION } from '../config/terms.js';
import {
  createSaveBackupDocument,
  MAX_SAVE_BACKUP_FILE_BYTES,
  parseSaveBackupDocument
} from '../save-backup.js';

export class AccountUi {
  constructor(state, hud, options = {}) {
    this.state = state;
    this.hud = hud;
    this.client = lightLoginClient;
    this.hostId = options.hostId || 'account-settings-panel';
    this.onBeforeAuthenticate = options.onBeforeAuthenticate || null;
    this.onAuthenticated = options.onAuthenticated || null;
    this.onAccountChange = options.onAccountChange || null;
    this.onBackupImported = options.onBackupImported || null;
    this.disableSync = options.disableSync === true;
    this.accountDisabled = options.accountDisabled === true;
    this.enableBackup = options.enableBackup !== false;
    this.enableAutosync = options.enableAutosync !== false;
    this.playerDataStore = options.playerDataStore || null;
    this.playerProfileUi = options.playerProfileUi || null;
    this.syncing = false;
    this.lastSyncedChecksum = null;
    this.panel = null;
    this.statusEl = null;
    this.backupSection = null;
    this.backupStatusEl = null;
    this.formMode = 'login';
    this.renderShell();
    this.bindAutosync();
    if (this.enableBackup) {
      this.unsubscribeState = this.state.subscribe((event, data) => {
        if (event === 'automatic_backup_failed') {
          this.setBackupStatus(
            `Não foi possível guardar a cópia automática. A cópia anterior foi preservada. ${data.message || ''}`.trim(),
            'error'
          );
        } else if (
          ['automatic_backup_saved', 'automatic_backup_disabled', 'game_reset', 'state_loaded'].includes(event)
        ) {
          this.updateBackupStatus();
        }
      });
    }
  }

  backupMarkup() {
    if (!this.enableBackup) return '';
    return `
      <section class="account-backup" aria-labelledby="account-backup-title">
        <h4 id="account-backup-title">Backup do jogo</h4>
        <p class="setting-help">O ficheiro descarregado inclui o progresso, o nome e o ID do perfil local, o histórico de versões e recompensas e os dados do SubSolo; não inclui credenciais. O backup automático é local e não substitui o ficheiro de transferência.</p>
        <label class="settings-toggle-row account-backup-toggle" for="account-auto-backup">
          <span><strong>Backup automático neste dispositivo</strong><small>Guarda uma cópia local ao ativar e, depois, no máximo uma vez por dia enquanto jogas.</small></span>
          <input id="account-auto-backup" type="checkbox" class="custom-checkbox">
        </label>
        <p class="account-backup-status" role="status" aria-live="polite"></p>
        <div class="account-backup-actions">
          <button type="button" class="btn-primary" data-action="download-backup">Descarregar backup</button>
          <button type="button" class="btn-secondary" data-action="load-backup">Carregar ficheiro</button>
          <button type="button" class="btn-secondary" data-action="restore-auto-backup">Restaurar cópia deste dispositivo</button>
          <button type="button" class="btn-secondary" data-action="restore-recovery-save">Restaurar save anterior</button>
          <input class="account-backup-file" type="file" accept=".json,application/json" tabindex="-1" aria-hidden="true">
        </div>
      </section>
    `;
  }

  renderShell() {
    const settingsHost = document.getElementById(this.hostId);
    if (settingsHost) {
      settingsHost.className = 'account-settings-panel';
      settingsHost.innerHTML = `
        <div class="account-settings-header">
          <label>Conta Light Group</label>
          <p class="setting-help">Usa o backup abaixo para transferir o progresso entre dispositivos.</p>
        </div>
        ${this.playerProfileUi ? '<div data-player-profile-host></div>' : ''}
        <div class="account-status" aria-live="polite"></div>
        <form class="account-form"></form>
        ${this.backupMarkup()}
      `;
      if (this.playerProfileUi) {
        this.playerProfileUi.mount(settingsHost.querySelector('[data-player-profile-host]'));
      }
      this.statusEl = settingsHost.querySelector('.account-status');
      this.formEl = settingsHost.querySelector('.account-form');
      this.bindBackupControls(settingsHost);
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
        ${this.playerProfileUi ? '<div data-player-profile-host></div>' : ''}
        <div class="account-status" aria-live="polite"></div>
        <form class="account-form"></form>
        ${this.backupMarkup()}
      </div>
    `;
    document.body.appendChild(this.panel);
    this.statusEl = this.panel.querySelector('.account-status');
    this.formEl = this.panel.querySelector('.account-form');
    if (this.playerProfileUi) {
      this.playerProfileUi.mount(this.panel.querySelector('[data-player-profile-host]'));
    }
    this.bindBackupControls(this.panel);
    button.addEventListener('click', () => this.open());
    this.panel.querySelector('.account-close').addEventListener('click', () => this.close());
    this.panel.addEventListener('click', (event) => {
      if (event.target === this.panel) this.close();
    });
    this.renderForm();
  }

  bindBackupControls(root) {
    this.backupSection = root.querySelector('.account-backup');
    if (!this.backupSection) return;

    this.backupStatusEl = this.backupSection.querySelector('.account-backup-status');
    const automaticToggle = this.backupSection.querySelector('#account-auto-backup');
    const downloadButton = this.backupSection.querySelector('[data-action="download-backup"]');
    const loadButton = this.backupSection.querySelector('[data-action="load-backup"]');
    const restoreButton = this.backupSection.querySelector('[data-action="restore-auto-backup"]');
    const restoreRecoveryButton = this.backupSection.querySelector('[data-action="restore-recovery-save"]');
    const fileInput = this.backupSection.querySelector('.account-backup-file');

    automaticToggle.checked = this.state.isAutomaticBackupEnabled();
    automaticToggle.disabled = this.state.saveBlocked;
    automaticToggle.addEventListener('change', () => {
      if (!this.state.setAutomaticBackupEnabled(automaticToggle.checked)) {
        automaticToggle.checked = this.state.isAutomaticBackupEnabled();
        this.setBackupStatus(
          'Não foi possível alterar o backup automático. Verifica o espaço de armazenamento disponível e tenta novamente.',
          'error'
        );
        return;
      }
      this.updateBackupStatus();
    });

    downloadButton.addEventListener('click', () => this.downloadBackup());
    loadButton.addEventListener('click', () => fileInput.click());
    restoreButton.addEventListener('click', () => this.restoreAutomaticBackup());
    restoreRecoveryButton.addEventListener('click', () => this.restoreRecoverySave());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file) return;
      try {
        if (file.size > MAX_SAVE_BACKUP_FILE_BYTES) {
          throw new RangeError('O ficheiro de backup excede o limite de 10 MB.');
        }
        const backup = parseSaveBackupDocument(
          await file.text(),
          (data) => this.state.validateSaveData(data)
        );
        await this.importBackup(backup.saveData, backup.exportedAt, backup.playerProfile);
      } catch (error) {
        this.setBackupStatus(error.message || 'Não foi possível ler o ficheiro de backup.', 'error');
      }
    });

    this.updateBackupStatus();
  }

  setBackupStatus(message, type = 'info') {
    if (!this.backupStatusEl) return;
    this.backupStatusEl.textContent = message;
    this.backupStatusEl.dataset.type = type;
  }

  updateBackupStatus() {
    if (!this.backupSection) return;
    const automaticToggle = this.backupSection.querySelector('#account-auto-backup');
    const restoreButton = this.backupSection.querySelector('[data-action="restore-auto-backup"]');
    const restoreRecoveryButton = this.backupSection.querySelector('[data-action="restore-recovery-save"]');
    automaticToggle.checked = this.state.isAutomaticBackupEnabled();
    automaticToggle.disabled = this.state.saveBlocked;

    let backup = null;
    let backupError = null;
    try {
      backup = this.state.getAutomaticBackup();
    } catch (error) {
      backupError = error;
    }

    let recoveryBackup = null;
    let recoveryError = null;
    try {
      recoveryBackup = this.state.getRecoverySaveData();
    } catch (error) {
      recoveryError = error;
    }
    restoreButton.disabled = !backup;
    restoreRecoveryButton.disabled = !recoveryBackup;

    if (backupError) {
      this.setBackupStatus(
        `A cópia automática local não pôde ser validada. ${backupError.message || ''}`.trim(),
        'error'
      );
    } else if (backup) {
      const savedAt = new Date(backup.exportedAt).toLocaleString();
      this.setBackupStatus(
        `${this.state.isAutomaticBackupEnabled() ? 'Backup automático ativo.' : 'Backup automático desativado.'} Última cópia local: ${savedAt}.`,
        'success'
      );
    } else {
      this.setBackupStatus(
        this.state.isAutomaticBackupEnabled()
          ? 'Backup automático ativo; ainda não existe uma cópia local.'
          : 'Backup automático desativado. Podes descarregar uma cópia manual quando quiseres.',
        'info'
      );
    }
    if (recoveryBackup) {
      this.backupStatusEl.textContent += ' Também existe um save anterior recuperável.';
    } else if (recoveryError) {
      this.backupStatusEl.textContent += ' O save anterior não pôde ser validado.';
    }
  }

  async downloadBackup() {
    try {
      if (this.state.saveBlocked) {
        throw new Error('O save atual não pode ser exportado com segurança. Carrega um backup válido para recuperar o jogo.');
      }
      if (!this.state.save()) {
        throw new Error('Não foi possível guardar o progresso antes de criar o backup.');
      }

      const playerProfile = this.playerDataStore
        ? await this.playerDataStore.exportBackupData()
        : null;
      const document = createSaveBackupDocument(
        this.state.exportSaveData(),
        undefined,
        playerProfile
      );
      const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `FloristEver-backup-${document.exportedAt.slice(0, 10)}.json`;
      link.hidden = true;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.setBackupStatus('Backup descarregado. Guarda o ficheiro num local seguro para o carregar noutro dispositivo.', 'success');
    } catch (error) {
      this.setBackupStatus(error.message || 'Não foi possível descarregar o backup.', 'error');
    }
  }

  restoreAutomaticBackup() {
    try {
      const backup = this.state.getAutomaticBackup();
      if (!backup) {
        this.setBackupStatus('Ainda não existe uma cópia automática para restaurar.', 'error');
        return;
      }
      void this.importBackup(backup.saveData, backup.exportedAt, backup.playerProfile);
    } catch (error) {
      this.setBackupStatus(error.message || 'Não foi possível validar a cópia automática.', 'error');
    }
  }

  restoreRecoverySave() {
    try {
      const backup = this.state.getRecoverySaveData();
      if (!backup) {
        this.setBackupStatus('Não existe um save anterior válido para restaurar.', 'error');
        return;
      }
      void this.importBackup(backup.saveData, backup.exportedAt);
    } catch (error) {
      this.setBackupStatus(error.message || 'Não foi possível validar o save anterior.', 'error');
    }
  }

  async importBackup(saveData, exportedAt = null, playerProfile = null) {
    let validatedPlayerProfile = null;
    try {
      if (playerProfile !== null) {
        if (!this.playerDataStore) {
          throw new Error('Este dispositivo não consegue restaurar o perfil incluído no backup.');
        }
        validatedPlayerProfile = this.playerDataStore.validateBackupData(playerProfile);
      }
    } catch (error) {
      this.setBackupStatus(error.message || 'O perfil incluído no backup é inválido.', 'error');
      return false;
    }

    const backupDate = exportedAt ? new Date(exportedAt).toLocaleString() : 'data não indicada';
    const currentSummary = `nível ${Number(this.state.level) || 1}, ${Number(this.state.coins || 0).toLocaleString('pt-PT')} moedas`;
    const incomingSummary = `nível ${Number(saveData.level) || 1}, ${Number(saveData.coins || 0).toLocaleString('pt-PT')} moedas`;
    const preservationNote = this.state.saveBlocked
      ? 'O save atual não pôde ser validado; uma cópia local de recuperação válida será mantida.'
      : 'O progresso local válido será preservado como cópia de recuperação.';
    const accepted = window.confirm(
      `O backup (${incomingSummary}, exportado em ${backupDate}) substituirá o progresso deste dispositivo (${currentSummary}). ${preservationNote} Queres continuar?`
    );
    if (!accepted) return false;

    if (!this.state.saveBlocked && !this.state.save()) {
      this.setBackupStatus('Não foi possível preservar o progresso atual; a importação foi cancelada.', 'error');
      return false;
    }

    let restoreToken = null;
    let restorePrepared = false;
    let saveImported = false;
    try {
      if (validatedPlayerProfile) {
        restoreToken = this.playerDataStore.createImportToken();
        await this.playerDataStore.prepareBackupImport(validatedPlayerProfile, restoreToken);
        restorePrepared = true;
      }
      const importedSaveData = restoreToken
        ? { ...saveData, lastBackupImportId: restoreToken }
        : saveData;
      const result = this.state.importSaveData(importedSaveData);
      if (!result || this.state.saveBlocked) {
        throw new Error('Não foi possível carregar o save do backup.');
      }
      saveImported = true;
    } catch (error) {
      if (restorePrepared) {
        try {
          await this.playerDataStore.finishBackupImport(restoreToken, false);
        } catch (restoreError) {
          console.error('Não foi possível cancelar a preparação da importação do perfil:', restoreError);
        }
      }
      this.setBackupStatus(
        `Não foi possível carregar o backup. ${error.message || 'O progresso anterior foi mantido.'}`,
        'error'
      );
      return false;
    }
    if (restoreToken && restorePrepared && saveImported) {
      try {
        await this.playerDataStore.finishBackupImport(restoreToken, true);
      } catch (error) {
        console.error('O save foi importado, mas o perfil ficou pendente de recuperação:', error);
        this.setBackupStatus(
          'O progresso foi carregado. A identidade e o histórico serão recuperados na próxima abertura do jogo.',
          'error'
        );
        return false;
      }
    }
    this.updateBackupStatus();
    this.setBackupStatus('Backup carregado. O progresso foi atualizado neste dispositivo.', 'success');
    this.hud?.showToast?.('Backup carregado com sucesso.', 'check');
    try {
      await this.onBackupImported?.();
    } catch (error) {
      console.error('O backup foi carregado, mas não foi possível atualizar o estado das recompensas:', error);
      this.setBackupStatus(
        'O progresso foi carregado, mas algumas recompensas podem precisar de uma reabertura do jogo.',
        'error'
      );
    }
    await this.playerProfileUi?.refresh();
    return true;
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
    if (this.accountDisabled) {
      this.formEl.replaceChildren();
      this.setStatus(
        'Desativado — a criação de contas e o início de sessão Light Group não estão disponíveis. O progresso local e os backups continuam disponíveis.',
        'disabled'
      );
      return;
    }

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
    if (this.accountDisabled) {
      this.setStatus('Desativado — a criação de contas e o início de sessão Light Group não estão disponíveis.', 'disabled');
      return;
    }
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
    if (this.accountDisabled) {
      this.setStatus('Desativado — a criação de contas e o início de sessão Light Group não estão disponíveis.', 'disabled');
      return false;
    }
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

  async syncNow({ preferRemote = false, silent = false, keepalive = false } = {}) {
    if (this.accountDisabled || this.disableSync || this.syncing || !this.client.accessToken || !this.client.syncEnabled) return;
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
      const localData = this.state.exportSaveData();
      if (silent && !preferRemote) {
        const localChecksum = await this.client.checksum(localData);
        if (localChecksum === this.lastSyncedChecksum) return;
        if (keepalive && new TextEncoder().encode(JSON.stringify(localData)).byteLength > 60 * 1024) return;
        await this.client.putSave(localData, { keepalive });
        this.lastSyncedChecksum = localChecksum;
      } else {
        const remote = await this.client.getSave();
        if (preferRemote && remote.save && remote.save.revision > this.client.cloudRevision) {
          const hasLocalProgress = Number(localData.level) > 1 || Number(localData.coins) > 20 || Boolean(localData.lastSaveTime);
          let loadRemote = true;
          if (hasLocalProgress) {
            const remoteDate = remote.meta?.updatedAt ? new Date(remote.meta.updatedAt).toLocaleString() : 'data desconhecida';
            const localDate = localData.lastSaveTime ? new Date(localData.lastSaveTime).toLocaleString() : 'data desconhecida';
            loadRemote = confirm(
              `Encontrámos progresso local (nível ${Number(localData.level) || 1}, ${Number(localData.coins) || 0} moedas, ${localDate}) e na conta (nível ${remote.meta?.level || 1}, ${remote.meta?.coins || 0} moedas, ${remoteDate}).\n\nOK: carregar o progresso da conta.\nCancelar: manter e enviar o progresso local.`
            );
          }
          if (loadRemote) {
            this.state.importSaveData(remote.save.data);
            this.client.cloudRevision = remote.save.revision;
            this.lastSyncedChecksum = remote.save.checksum || await this.client.checksum(remote.save.data);
            this.hud?.showToast?.('Progresso carregado da conta Light Group.', 'success');
          } else {
            this.client.cloudRevision = remote.save.revision;
            await this.client.putSave(localData);
            this.lastSyncedChecksum = await this.client.checksum(localData);
            this.hud?.showToast?.('Progresso local guardado na conta.', 'coin');
          }
        } else {
          if (remote.save) this.client.cloudRevision = remote.save.revision;
          const localChecksum = await this.client.checksum(localData);
          if (!remote.save || remote.save.checksum !== localChecksum) await this.client.putSave(localData);
          this.lastSyncedChecksum = localChecksum;
          this.hud?.showToast?.('Progresso sincronizado.', 'coin');
        }
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
    if (!this.enableAutosync || this.accountDisabled) return;
    setInterval(() => this.syncNow({ silent: true }), 90000);
    window.addEventListener('pagehide', () => this.syncNow({ silent: true, keepalive: true }));
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
