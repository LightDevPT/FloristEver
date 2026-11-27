import { isValidGameVersion } from './config/game-version.js';
import { BETA_PROGRAM, isBetaProgramVersionEligible } from './config/beta-program.js';

export const PLAYER_DATA_DB_NAME = 'floristever-player-data';
export const PLAYER_DATA_BACKUP_VERSION = 1;
export const VERSION_REGISTRATION_ACTIVE_MS = 15 * 60 * 1000;
export const BACKUP_IMPORT_RECOVERY_TIMEOUT_MS = 30_000;

export const DEFAULT_PLAYER_DISPLAY_NAME = 'Jogador';

const PLAYER_DATA_DB_VERSION = 1;
const PLAYER_DATA_STORE_NAME = 'records';
const PRIMARY_RECORD_KEY = 'player';
const TRACKING_LEASE_TIMEOUT_MS = 15 * 1000;
const MAX_ACTIVITY_DELTA_MS = 10 * 1000;
const MAX_BACKUP_CAMPAIGNS = 500;
const PLAYER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEDGER_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/;
const RESERVED_LEDGER_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function normalizePlayerDisplayName(value) {
  if (value === undefined) return DEFAULT_PLAYER_DISPLAY_NAME;
  if (typeof value !== 'string') {
    throw new TypeError('O nome de exibição tem de ser texto.');
  }
  const name = value.trim();
  if (!name || name.length > 24 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new RangeError('O nome de exibição deve ter entre 1 e 24 caracteres.');
  }
  return name;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createEmptyRecord() {
  return {
    key: PRIMARY_RECORD_KEY,
    profile: null,
    versionHistory: [],
    campaignLedger: {},
    betaStatueClaimed: false,
    betaNotificationPending: false,
    pendingRestore: null,
    lastCommittedRestoreToken: null,
    trackingLease: null
  };
}

function makePlayerId(cryptoApi) {
  if (!cryptoApi?.getRandomValues) {
    throw new Error('Este dispositivo não disponibiliza geração segura de identificadores.');
  }
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function normalizeRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return createEmptyRecord();
  return {
    key: PRIMARY_RECORD_KEY,
    profile: record.profile && typeof record.profile === 'object' ? record.profile : null,
    versionHistory: Array.isArray(record.versionHistory) ? record.versionHistory : [],
    campaignLedger: record.campaignLedger && typeof record.campaignLedger === 'object'
      ? record.campaignLedger
      : {},
    betaStatueClaimed: record.betaStatueClaimed === true,
    betaNotificationPending: record.betaNotificationPending === true,
    pendingRestore: record.pendingRestore && typeof record.pendingRestore === 'object'
      ? record.pendingRestore
      : null,
    lastCommittedRestoreToken: typeof record.lastCommittedRestoreToken === 'string'
      ? record.lastCommittedRestoreToken
      : null,
    trackingLease: record.trackingLease && typeof record.trackingLease === 'object'
      ? record.trackingLease
      : null
  };
}

function normalizePlayerTags(tags) {
  if (tags === undefined) return [];
  if (
    !Array.isArray(tags)
    || tags.length > 64
    || tags.some((tag) => typeof tag !== 'string' || !/^[A-Z0-9_]{1,32}$/.test(tag))
  ) {
    throw new TypeError('As etiquetas do perfil do jogador são inválidas.');
  }
  return [...new Set(tags)];
}

function grantBetaTag(record, version, betaProgram) {
  if (
    !record.profile
    || !isBetaProgramVersionEligible(version, betaProgram)
    || record.profile.tags.includes('BETA')
  ) return false;
  record.profile.tags.push('BETA');
  record.betaNotificationPending = true;
  return true;
}

export function formatPlayerId(id) {
  if (typeof id !== 'string' || !PLAYER_ID_PATTERN.test(id)) return '';
  return `FE-${id.replace(/-/g, '').toUpperCase()}`;
}

export class PlayerDataStore {
  constructor({
    indexedDB = globalThis.indexedDB,
    crypto = globalThis.crypto,
    now = () => Date.now(),
    betaProgram = BETA_PROGRAM
  } = {}) {
    this.indexedDB = indexedDB;
    this.crypto = crypto;
    this.now = now;
    this.betaProgram = betaProgram;
    this.databasePromise = null;
  }

  open() {
    if (this.databasePromise) return this.databasePromise;
    if (!this.indexedDB?.open) {
      return Promise.reject(new Error('IndexedDB não está disponível neste dispositivo.'));
    }

    this.databasePromise = new Promise((resolve, reject) => {
      const request = this.indexedDB.open(PLAYER_DATA_DB_NAME, PLAYER_DATA_DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(PLAYER_DATA_STORE_NAME)) {
          database.createObjectStore(PLAYER_DATA_STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(
        request.error || new Error('Não foi possível abrir o armazenamento local do perfil.')
      );
      request.onblocked = () => reject(
        new Error('O armazenamento do perfil está bloqueado por outra janela do jogo.')
      );
    });
    this.databasePromise.catch(() => {
      this.databasePromise = null;
    });
    return this.databasePromise;
  }

  async readRecord() {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(PLAYER_DATA_STORE_NAME, 'readonly');
      const request = transaction.objectStore(PLAYER_DATA_STORE_NAME).get(PRIMARY_RECORD_KEY);
      request.onsuccess = () => resolve(clone(normalizeRecord(request.result)));
      request.onerror = () => reject(
        request.error || new Error('Não foi possível ler o perfil local do jogador.')
      );
      transaction.onabort = () => reject(
        transaction.error || new Error('A leitura do perfil local foi interrompida.')
      );
    });
  }

  async mutateRecord(mutator) {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(PLAYER_DATA_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(PLAYER_DATA_STORE_NAME);
      const request = store.get(PRIMARY_RECORD_KEY);
      let result;

      request.onsuccess = () => {
        try {
          const record = normalizeRecord(request.result);
          result = mutator(record);
          store.put(record);
        } catch (error) {
          transaction.abort();
          reject(error);
        }
      };
      request.onerror = () => {
        transaction.abort();
        reject(request.error || new Error('Não foi possível atualizar o perfil local.'));
      };
      transaction.oncomplete = () => resolve(clone(result));
      transaction.onerror = () => reject(
        transaction.error || new Error('Não foi possível guardar o perfil local.')
      );
      transaction.onabort = () => reject(
        transaction.error || new Error('A atualização do perfil local foi interrompida.')
      );
    });
  }

  async ensureProfile(currentVersion, now = this.now()) {
    if (!isValidGameVersion(currentVersion)) {
      throw new TypeError('A versão atual do jogo não é válida.');
    }
    return this.mutateRecord((record) => {
      if (record.pendingRestore) {
        throw new Error(
          'Existe uma importação de backup pendente. Fecha outras janelas e reinicia o jogo após 30 segundos.'
        );
      }
      if (!record.profile) {
        record.profile = {
          id: makePlayerId(this.crypto),
          displayName: DEFAULT_PLAYER_DISPLAY_NAME,
          createdAt: now,
          createdVersion: currentVersion,
          currentVersion,
          tags: []
        };
        record.versionHistory = [{
          version: currentVersion,
          activeMs: 0,
          firstSeenAt: now,
          registeredAt: null
        }];
      } else {
        if (
          typeof record.profile.id !== 'string'
          || !PLAYER_ID_PATTERN.test(record.profile.id)
          || !Number.isFinite(record.profile.createdAt)
          || !isValidGameVersion(record.profile.createdVersion)
        ) {
          throw new Error('O perfil guardado está inválido; não foi criada uma identidade nova.');
        }
        record.profile.displayName = normalizePlayerDisplayName(record.profile.displayName);
        record.profile.tags = normalizePlayerTags(record.profile.tags);
        record.profile.currentVersion = currentVersion;
        if (!record.versionHistory.some((entry) => entry.version === currentVersion)) {
          record.versionHistory.push({
            version: currentVersion,
            activeMs: 0,
            firstSeenAt: now,
            registeredAt: null
          });
        }
      }
      const registeredEligibleVersion = record.versionHistory.find(
        (entry) => Number.isFinite(entry.registeredAt)
          && isBetaProgramVersionEligible(entry.version, this.betaProgram)
      );
      if (registeredEligibleVersion) {
        grantBetaTag(record, registeredEligibleVersion.version, this.betaProgram);
      }
      return record.profile;
    });
  }

  async recordActiveTime(version, sessionId, deltaMs, now = this.now()) {
    if (!isValidGameVersion(version) || typeof sessionId !== 'string') {
      throw new TypeError('A sessão de jogo não é válida.');
    }
    if (!Number.isFinite(deltaMs) || deltaMs <= 0 || deltaMs > MAX_ACTIVITY_DELTA_MS) {
      return { counted: false, registered: false, activeMs: 0 };
    }

    return this.mutateRecord((record) => {
      if (record.pendingRestore) {
        return { counted: false, registered: false, activeMs: 0 };
      }
      if (!record.profile) return { counted: false, registered: false, activeMs: 0 };
      const currentLease = record.trackingLease;
      if (
        currentLease
        && currentLease.sessionId !== sessionId
        && Number.isFinite(currentLease.heartbeatAt)
        && now >= currentLease.heartbeatAt
        && now - currentLease.heartbeatAt < TRACKING_LEASE_TIMEOUT_MS
      ) {
        return { counted: false, registered: false, activeMs: 0 };
      }

      let entry = record.versionHistory.find((item) => item.version === version);
      if (!entry) {
        entry = { version, activeMs: 0, firstSeenAt: now, registeredAt: null };
        record.versionHistory.push(entry);
      }
      record.profile.currentVersion = version;
      entry.activeMs += Math.floor(deltaMs);
      let betaGranted = false;
      if (!entry.registeredAt && entry.activeMs >= VERSION_REGISTRATION_ACTIVE_MS) {
        entry.registeredAt = now;
        betaGranted = grantBetaTag(record, version, this.betaProgram);
      }
      record.trackingLease = { sessionId, heartbeatAt: now };
      return {
        counted: true,
        registered: Boolean(entry.registeredAt),
        activeMs: entry.activeMs,
        betaGranted
      };
    });
  }

  async consumeBetaNotification() {
    return this.mutateRecord((record) => {
      if (!record.betaNotificationPending || record.pendingRestore) return false;
      record.betaNotificationPending = false;
      return true;
    });
  }

  async claimBetaStatue() {
    return this.mutateRecord((record) => {
      if (
        record.pendingRestore
        || !record.profile?.tags?.includes('BETA')
        || record.betaStatueClaimed
      ) return false;
      record.betaStatueClaimed = true;
      return true;
    });
  }

  async updateDisplayName(value) {
    const displayName = normalizePlayerDisplayName(value);
    return this.mutateRecord((record) => {
      if (record.pendingRestore) {
        throw new Error('Não é possível alterar o perfil enquanto um backup está a ser recuperado.');
      }
      if (!record.profile) {
        throw new Error('O perfil do jogador ainda não foi criado.');
      }
      record.profile.displayName = displayName;
      return record.profile;
    });
  }

  async releaseTrackingLease(sessionId) {
    const record = await this.readRecord();
    if (record.trackingLease?.sessionId !== sessionId) return false;
    return this.mutateRecord((record) => {
      if (record.trackingLease?.sessionId === sessionId) {
        record.trackingLease = null;
      }
      return true;
    });
  }

  async exportBackupData() {
    const record = await this.readRecord();
    if (record.pendingRestore) {
      throw new Error('Existe uma importação de perfil pendente. Reinicia o jogo antes de criar outro backup.');
    }
    return this.validateBackupData({
      formatVersion: PLAYER_DATA_BACKUP_VERSION,
      profile: record.profile,
      versionHistory: record.versionHistory,
      campaignLedger: record.campaignLedger,
      betaStatueClaimed: record.betaStatueClaimed
    });
  }

  createImportToken() {
    return makePlayerId(this.crypto);
  }

  validateBackupData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new TypeError('Os dados do perfil no backup são inválidos.');
    }
    if (data.formatVersion !== PLAYER_DATA_BACKUP_VERSION) {
      throw new RangeError('A versão dos dados de perfil deste backup não é suportada.');
    }
    const profile = data.profile;
    if (
      !profile
      || typeof profile !== 'object'
      || typeof profile.id !== 'string'
      || !PLAYER_ID_PATTERN.test(profile.id)
      || !Number.isFinite(profile.createdAt)
      || !isValidGameVersion(profile.createdVersion)
      || !isValidGameVersion(profile.currentVersion)
    ) {
      throw new TypeError('A identidade do jogador no backup é inválida.');
    }
    const tags = normalizePlayerTags(profile.tags);
    if (!Array.isArray(data.versionHistory) || data.versionHistory.length > 100) {
      throw new TypeError('O histórico de versões no backup é inválido.');
    }
    const versionHistory = data.versionHistory.map((entry) => {
      if (
        !entry
        || typeof entry !== 'object'
        || !isValidGameVersion(entry.version)
        || !Number.isFinite(entry.activeMs)
        || entry.activeMs < 0
        || !Number.isFinite(entry.firstSeenAt)
        || (entry.registeredAt !== null && !Number.isFinite(entry.registeredAt))
        || (
          entry.registeredAt !== null
          && entry.activeMs < VERSION_REGISTRATION_ACTIVE_MS
        )
      ) {
        throw new TypeError('Uma entrada do histórico de versões no backup é inválida.');
      }
      return {
        version: entry.version,
        activeMs: Math.floor(entry.activeMs),
        firstSeenAt: entry.firstSeenAt,
        registeredAt: entry.registeredAt
      };
    });
    if (
      !data.campaignLedger
      || typeof data.campaignLedger !== 'object'
      || Array.isArray(data.campaignLedger)
      || Object.keys(data.campaignLedger).length > MAX_BACKUP_CAMPAIGNS
    ) {
      throw new TypeError('O histórico de campanhas no backup é inválido.');
    }
    if (
      Object.prototype.hasOwnProperty.call(data, 'betaStatueClaimed')
      && typeof data.betaStatueClaimed !== 'boolean'
    ) {
      throw new TypeError('O estado de resgate da estátua BETA no backup é inválido.');
    }
    if (data.betaStatueClaimed === true && !tags.includes('BETA')) {
      throw new TypeError('Um backup com a estátua BETA resgatada tem de incluir a tag BETA.');
    }
    const campaignLedger = {};
    for (const [key, value] of Object.entries(data.campaignLedger)) {
      if (
        !LEDGER_KEY_PATTERN.test(key)
        || RESERVED_LEDGER_KEYS.has(key)
        || !value
        || typeof value !== 'object'
        || Array.isArray(value)
      ) {
        throw new TypeError('Uma entrada do histórico de campanhas no backup é inválida.');
      }
      campaignLedger[key] = clone(value);
    }
    return {
      formatVersion: PLAYER_DATA_BACKUP_VERSION,
      profile: {
        id: profile.id.toLowerCase(),
        displayName: normalizePlayerDisplayName(profile.displayName),
        createdAt: profile.createdAt,
        createdVersion: profile.createdVersion,
        currentVersion: profile.currentVersion,
        tags
      },
      versionHistory,
      campaignLedger,
      betaStatueClaimed: data.betaStatueClaimed === true
    };
  }

  async importBackupData(data) {
    const validated = this.validateBackupData(data);
    return this.mutateRecord((record) => {
      if (record.pendingRestore) {
        throw new Error('Existe uma importação de backup pendente neste dispositivo.');
      }
      record.profile = validated.profile;
      record.versionHistory = validated.versionHistory;
      record.campaignLedger = validated.campaignLedger;
      record.betaStatueClaimed = validated.betaStatueClaimed;
      record.betaNotificationPending = false;
      record.trackingLease = null;
      return true;
    });
  }

  async prepareBackupImport(data, token) {
    const validated = this.validateBackupData(data);
    if (typeof token !== 'string' || !PLAYER_ID_PATTERN.test(token)) {
      throw new TypeError('O identificador de importação do backup é inválido.');
    }
    return this.mutateRecord((record) => {
      if (record.pendingRestore) {
        throw new Error('Já existe uma recuperação de backup pendente neste dispositivo.');
      }
      record.pendingRestore = {
        token,
        profileData: validated,
        preparedAt: this.now()
      };
      return true;
    });
  }

  async finishBackupImport(token, commit) {
    return this.mutateRecord((record) => {
      const pending = record.pendingRestore;
      if (!pending || pending.token !== token) {
        if (commit && record.lastCommittedRestoreToken === token) return true;
        throw new Error('A recuperação pendente não corresponde a este backup.');
      }
      if (commit) {
        record.profile = pending.profileData.profile;
        record.versionHistory = pending.profileData.versionHistory;
        record.campaignLedger = pending.profileData.campaignLedger;
        record.betaStatueClaimed = pending.profileData.betaStatueClaimed;
        record.betaNotificationPending = false;
        record.trackingLease = null;
        record.lastCommittedRestoreToken = token;
      }
      record.pendingRestore = null;
      return true;
    });
  }

  async recoverPendingBackupImport(gameImportToken) {
    return this.mutateRecord((record) => {
      const pending = record.pendingRestore;
      if (!pending) return 'none';
      if (this.now() - pending.preparedAt < BACKUP_IMPORT_RECOVERY_TIMEOUT_MS) {
        return 'pending';
      }
      if (pending.token === gameImportToken) {
        record.profile = pending.profileData.profile;
        record.versionHistory = pending.profileData.versionHistory;
        record.campaignLedger = pending.profileData.campaignLedger;
        record.betaStatueClaimed = pending.profileData.betaStatueClaimed;
        record.betaNotificationPending = false;
        record.trackingLease = null;
        record.lastCommittedRestoreToken = pending.token;
        record.pendingRestore = null;
        return 'committed';
      }
      record.pendingRestore = null;
      return 'discarded';
    });
  }
}

export class ActivePlayTracker {
  constructor(store, {
    version,
    document = globalThis.document,
    window = globalThis.window,
    crypto = globalThis.crypto,
    monotonicNow = () => globalThis.performance.now(),
    wallNow = () => Date.now(),
    isGameplayReady = () => true,
    onBetaGranted = () => {},
    intervalMs = 5000,
    idleTimeoutMs = 90_000
  } = {}) {
    this.store = store;
    this.version = version;
    this.document = document;
    this.window = window;
    this.monotonicNow = monotonicNow;
    this.wallNow = wallNow;
    this.isGameplayReady = isGameplayReady;
    this.onBetaGranted = onBetaGranted;
    this.intervalMs = intervalMs;
    this.idleTimeoutMs = idleTimeoutMs;
    this.sessionId = makePlayerId(crypto);
    this.lastActivityAt = this.wallNow();
    this.lastTickAt = null;
    this.wasActive = false;
    this.timer = null;
    this.started = false;
    this.activityHandler = () => {
      this.lastActivityAt = this.wallNow();
    };
    this.tickHandler = () => {
      void this.tick().catch((error) => {
        console.error('O registo de tempo ativo foi interrompido:', error);
        this.stop({ flush: false });
      });
    };
    this.pagehideHandler = () => {
      void this.tick({ release: true }).catch((error) => {
        console.error('Não foi possível guardar a última sessão ativa:', error);
      });
    };
    this.pageshowHandler = () => {
      this.lastTickAt = this.monotonicNow();
      this.lastActivityAt = this.wallNow();
      this.wasActive = this.isActive();
    };
  }

  isActive() {
    return this.started
      && this.document?.visibilityState === 'visible'
      && !this.document.hidden
      && (typeof this.document.hasFocus !== 'function' || this.document.hasFocus())
      && this.wallNow() - this.lastActivityAt < this.idleTimeoutMs
      && this.isGameplayReady();
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.lastTickAt = this.monotonicNow();
    this.wasActive = this.isActive();
    this.document?.addEventListener('pointerdown', this.activityHandler, true);
    this.document?.addEventListener('keydown', this.activityHandler, true);
    this.document?.addEventListener('touchstart', this.activityHandler, true);
    this.document?.addEventListener('visibilitychange', this.tickHandler);
    this.window?.addEventListener('focus', this.tickHandler);
    this.window?.addEventListener('blur', this.tickHandler);
    this.window?.addEventListener('pagehide', this.pagehideHandler);
    this.window?.addEventListener('pageshow', this.pageshowHandler);
    this.timer = this.window?.setInterval(this.tickHandler, this.intervalMs)
      ?? globalThis.setInterval(this.tickHandler, this.intervalMs);
  }

  async tick({ release = false } = {}) {
    if (!this.started || this.lastTickAt === null) return;
    const now = this.monotonicNow();
    const elapsed = now - this.lastTickAt;
    const activeDuringInterval = this.wasActive
      && Number.isFinite(elapsed)
      && elapsed > 0
      && elapsed <= MAX_ACTIVITY_DELTA_MS;
    this.lastTickAt = now;
    this.wasActive = release ? false : this.isActive();

    if (activeDuringInterval) {
      const result = await this.store.recordActiveTime(
        this.version,
        this.sessionId,
        elapsed,
        this.wallNow()
      );
      if (result.betaGranted) {
        try {
          await this.onBetaGranted();
        } catch (error) {
          console.error('Não foi possível apresentar a notificação da conquista BETA:', error);
        }
      }
    }
    if (!this.wasActive || release) {
      await this.store.releaseTrackingLease(this.sessionId);
    }
  }

  stop({ flush = true } = {}) {
    if (!this.started) return;
    if (flush) {
      void this.tick({ release: true }).catch((error) => {
        console.error('Não foi possível guardar a última sessão ativa:', error);
      });
    }
    this.started = false;
    if (this.timer !== null) {
      const clear = this.window?.clearInterval?.bind(this.window) || globalThis.clearInterval;
      clear(this.timer);
    }
    this.document?.removeEventListener('pointerdown', this.activityHandler, true);
    this.document?.removeEventListener('keydown', this.activityHandler, true);
    this.document?.removeEventListener('touchstart', this.activityHandler, true);
    this.document?.removeEventListener('visibilitychange', this.tickHandler);
    this.window?.removeEventListener('focus', this.tickHandler);
    this.window?.removeEventListener('blur', this.tickHandler);
    this.window?.removeEventListener('pagehide', this.pagehideHandler);
    this.window?.removeEventListener('pageshow', this.pageshowHandler);
  }
}
