export const SAVE_BACKUP_FORMAT = 'floristever-save-backup';
export const SAVE_BACKUP_FORMAT_VERSION = 2;
const SUPPORTED_SAVE_BACKUP_VERSIONS = new Set([1, SAVE_BACKUP_FORMAT_VERSION]);
export const MAX_SAVE_BACKUP_FILE_BYTES = 10 * 1024 * 1024;

export function createSaveBackupDocument(
  saveData,
  exportedAt = new Date().toISOString(),
  playerProfile = null
) {
  if (!saveData || typeof saveData !== 'object' || Array.isArray(saveData)) {
    throw new TypeError('Os dados do backup têm de ser um objeto.');
  }
  if (typeof exportedAt !== 'string' || !Number.isFinite(Date.parse(exportedAt))) {
    throw new TypeError('A data de exportação do backup é inválida.');
  }

  const document = {
    format: SAVE_BACKUP_FORMAT,
    formatVersion: SAVE_BACKUP_FORMAT_VERSION,
    exportedAt,
    saveData
  };
  if (playerProfile !== null) document.playerProfile = playerProfile;
  return document;
}

export function parseSaveBackupDocument(raw, validateSaveData) {
  if (typeof raw !== 'string') {
    throw new TypeError('O ficheiro de backup não contém texto válido.');
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_SAVE_BACKUP_FILE_BYTES) {
    throw new RangeError('O ficheiro de backup excede o limite de 10 MB.');
  }

  let document;
  try {
    document = JSON.parse(raw);
  } catch {
    throw new SyntaxError('O ficheiro selecionado não contém JSON válido.');
  }
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new TypeError('O ficheiro de backup tem um formato inválido.');
  }

  let saveData = document;
  let exportedAt = null;
  let playerProfile = null;
  if (Object.prototype.hasOwnProperty.call(document, 'format')) {
    if (document.format !== SAVE_BACKUP_FORMAT) {
      throw new TypeError('Este ficheiro não é um backup do FloristEver.');
    }
    if (!SUPPORTED_SAVE_BACKUP_VERSIONS.has(document.formatVersion)) {
      throw new RangeError('A versão deste backup não é suportada por esta versão do jogo.');
    }
    if (typeof document.exportedAt !== 'string' || !Number.isFinite(Date.parse(document.exportedAt))) {
      throw new TypeError('A data do backup é inválida.');
    }
    saveData = document.saveData;
    exportedAt = document.exportedAt;
    playerProfile = document.formatVersion >= 2 ? document.playerProfile ?? null : null;
  }

  const validatedSaveData = validateSaveData(saveData);
  if (!validatedSaveData || typeof validatedSaveData !== 'object' || Array.isArray(validatedSaveData)) {
    throw new TypeError('O ficheiro não contém um save válido do FloristEver.');
  }

  return { saveData: validatedSaveData, exportedAt, playerProfile };
}
