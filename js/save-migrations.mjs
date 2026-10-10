export const CURRENT_SAVE_SCHEMA_VERSION = 1;

export function migrateSaveData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new TypeError('O save tem de ser um objeto.');
  }

  const schemaVersion = data.schemaVersion === undefined ? 1 : data.schemaVersion;
  if (!Number.isSafeInteger(schemaVersion) || schemaVersion < 1) {
    throw new TypeError('A versão do esquema do save é inválida.');
  }
  if (schemaVersion > CURRENT_SAVE_SCHEMA_VERSION) {
    throw new RangeError(
      `O save usa a versão ${schemaVersion}, mas esta versão do jogo suporta até ${CURRENT_SAVE_SCHEMA_VERSION}.`
    );
  }

  return { ...data, schemaVersion };
}
