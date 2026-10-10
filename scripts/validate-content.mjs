import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FLOWERS_CONFIG, FLOWER_ORDER } from '../js/config/flowers.js';
import { ACCESSORIES, SPECIAL_ORDERS, WRAPPERS, calculateBouquetHarmony } from '../js/config/bouquets.js';
import { UPGRADES_CONFIG } from '../js/config/upgrades.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ID_PATTERN = /^[a-z][a-zA-Z0-9_]*$/;
const RESOURCE_FIELD_PATTERN = /(?:image|asset|resource|textFile|src|path)$/i;

export function extractPrecacheAssets(serviceWorkerText) {
  const match = /const ASSETS_TO_CACHE = (\[[\s\S]*?\]);/.exec(serviceWorkerText);
  if (!match) throw new Error('Não foi encontrada a lista ASSETS_TO_CACHE no service worker.');
  return match[1].slice(1, -1).split(/\r?\n/)
    .map((line) => line.trim().replace(/,$/, ''))
    .filter(Boolean)
    .map((line) => {
      const entry = /^(['"])(.*)\1$/.exec(line);
      if (!entry) throw new Error(`Entrada inválida na lista ASSETS_TO_CACHE: ${line}`);
      return entry[2];
    });
}

function validateUniqueIds(entries, category, errors) {
  const ids = entries.map((entry) => entry.id);
  const seen = new Set();
  for (const id of ids) {
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
      errors.push(`${category}: ID inválido "${id}".`);
    } else if (seen.has(id)) {
      errors.push(`${category}: ID duplicado "${id}".`);
    }
    seen.add(id);
  }
}

function validateInteger(value, label, errors, { minimum = 0 } = {}) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    errors.push(`${label} tem de ser um número inteiro finito >= ${minimum}.`);
  }
}

function validateFinitePositive(value, label, errors) {
  if (!Number.isFinite(value) || value <= 0) {
    errors.push(`${label} tem de ser um número finito > 0.`);
  }
}

function collectResourceReferences(value, key = '', references = []) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectResourceReferences(entry, key, references));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([childKey, childValue]) => {
      collectResourceReferences(childValue, childKey, references);
    });
  } else if (
    typeof value === 'string'
    && RESOURCE_FIELD_PATTERN.test(key)
    && (value.startsWith('./') || value.includes('/') || /\.[a-z0-9]{2,5}(?:[?#]|$)/i.test(value))
  ) {
    references.push({ key, value });
  }
  return references;
}

function validateResourceReferences(references, precacheAssets, errors) {
  const precached = new Set(precacheAssets);
  for (const { key, value } of references) {
    if (/^https?:\/\//i.test(value)) {
      errors.push(`${key} usa um recurso remoto que não está disponível offline: ${value}.`);
      continue;
    }
    const normalized = value.replace(/^\.\//, '').split(/[?#]/, 1)[0];
    const absolutePath = path.resolve(ROOT, normalized);
    if (absolutePath !== ROOT && !absolutePath.startsWith(`${ROOT}${path.sep}`)) {
      errors.push(`${key} aponta para fora do projeto: ${value}.`);
      continue;
    }
    if (!fs.existsSync(absolutePath)) {
      errors.push(`${key} referencia um ficheiro inexistente: ${value}.`);
    }
    const precachePath = `./${path.relative(ROOT, absolutePath).split(path.sep).join('/')}`;
    if (!precached.has(precachePath)) {
      errors.push(`${key} referencia um ficheiro fora do pré-cache: ${value}.`);
    }
  }
}

export function validateContent() {
  const errors = [];
  const flowerIds = Object.keys(FLOWERS_CONFIG);
  const flowerIdSet = new Set(flowerIds);
  const upgradeIds = Object.keys(UPGRADES_CONFIG);
  const wrapperIds = new Set(WRAPPERS.map((wrapper) => wrapper.id));
  const accessoryIds = new Set(ACCESSORIES.map((accessory) => accessory.id));

  validateUniqueIds(flowerIds.map((id) => ({ id })), 'Flores', errors);
  validateUniqueIds(SPECIAL_ORDERS, 'Encomendas', errors);
  validateUniqueIds(upgradeIds.map((id) => ({ id })), 'Melhorias', errors);
  validateUniqueIds(WRAPPERS, 'Embrulhos', errors);
  validateUniqueIds(ACCESSORIES, 'Acessórios', errors);
  validateUniqueIds(FLOWER_ORDER.map((id) => ({ id })), 'Ordem de progressão das flores', errors);

  if (FLOWER_ORDER.length !== flowerIds.length || FLOWER_ORDER.some((id) => !flowerIdSet.has(id))) {
    errors.push('FLOWER_ORDER tem de listar cada flor configurada exatamente uma vez.');
  }

  for (const [id, flower] of Object.entries(FLOWERS_CONFIG)) {
    if (flower.id !== id) errors.push(`Flor "${id}" tem um id interno diferente da chave.`);
    if (typeof flower.name !== 'string' || !flower.name.trim()) errors.push(`Flor "${id}" não tem nome.`);
    validateInteger(flower.requiredLevel, `Flor "${id}".requiredLevel`, errors, { minimum: 1 });
    validateInteger(flower.value, `Flor "${id}".value`, errors);
    validateInteger(flower.unlockCost, `Flor "${id}".unlockCost`, errors);
    validateInteger(flower.plotBaseCost, `Flor "${id}".plotBaseCost`, errors);
    validateFinitePositive(flower.growthTime, `Flor "${id}".growthTime`, errors);
  }

  for (const order of SPECIAL_ORDERS) {
    if (typeof order.title !== 'string' || !order.title.trim()) errors.push(`Encomenda "${order.id}" não tem título.`);
    validateInteger(order.minFlowers, `Encomenda "${order.id}".minFlowers`, errors, { minimum: 1 });
    validateInteger(order.bonusCoins, `Encomenda "${order.id}".bonusCoins`, errors);
    validateInteger(order.bonusRep, `Encomenda "${order.id}".bonusRep`, errors);
    if (!Array.isArray(order.requiredFlowers) || order.requiredFlowers.length === 0) {
      errors.push(`Encomenda "${order.id}" tem de exigir pelo menos uma flor.`);
    } else {
      for (const flowerId of order.requiredFlowers) {
        if (!flowerIdSet.has(flowerId)) {
          errors.push(`Encomenda "${order.id}" referencia a flor inexistente "${flowerId}".`);
        }
      }
    }
    if (order.preferredWrap && !wrapperIds.has(order.preferredWrap)) {
      errors.push(`Encomenda "${order.id}" referencia o embrulho inexistente "${order.preferredWrap}".`);
    }
    if (order.requiredWrap && !wrapperIds.has(order.requiredWrap)) {
      errors.push(`Encomenda "${order.id}" referencia o embrulho obrigatório inexistente "${order.requiredWrap}".`);
    }
    for (const accessoryId of order.requiredAccessoryIds || []) {
      if (!accessoryIds.has(accessoryId)) {
        errors.push(`Encomenda "${order.id}" referencia o acessório inexistente "${accessoryId}".`);
      }
    }
    const requiredLevel = Math.max(
      5,
      ...(order.requiredFlowers || []).map((flowerId) => FLOWERS_CONFIG[flowerId]?.requiredLevel || 1)
    );
    for (const flowerId of order.requiredFlowers || []) {
      const flower = FLOWERS_CONFIG[flowerId];
      if (flower && flower.requiredLevel > requiredLevel) {
        errors.push(`Encomenda "${order.id}" exige "${flowerId}" antes do seu nível de desbloqueio.`);
      }
    }
    const expansion = UPGRADES_CONFIG.shopExpansion;
    const maxPerFlowerStock = 20 + (expansion?.maxLevel || 0) * 20;
    if (Number.isSafeInteger(order.minFlowers) && order.minFlowers > maxPerFlowerStock) {
      errors.push(`Encomenda "${order.id}" exige mais flores do que a capacidade máxima de stock por flor.`);
    }
  }

  for (const upgrade of Object.values(UPGRADES_CONFIG)) {
    validateInteger(upgrade.maxLevel, `Melhoria "${upgrade.id}".maxLevel`, errors);
    for (const key of ['cost', 'baseCost', 'dailyWage', 'requiredLevel']) {
      if (upgrade[key] !== undefined) {
        validateInteger(upgrade[key], `Melhoria "${upgrade.id}".${key}`, errors);
      }
    }
    if (upgrade.costMultiplier !== undefined) {
      validateFinitePositive(upgrade.costMultiplier, `Melhoria "${upgrade.id}".costMultiplier`, errors);
    }
    if (typeof upgrade.getCost === 'function') {
      for (let level = 0; level < upgrade.maxLevel; level++) {
        validateInteger(upgrade.getCost(level), `Melhoria "${upgrade.id}".getCost(${level})`, errors);
      }
    }
    if (typeof upgrade.getRequiredLevel === 'function') {
      for (let level = 0; level < upgrade.maxLevel; level++) {
        validateInteger(
          upgrade.getRequiredLevel(level),
          `Melhoria "${upgrade.id}".getRequiredLevel(${level})`,
          errors
        );
      }
    }
  }

  for (const entry of [...WRAPPERS, ...ACCESSORIES]) {
    validateFinitePositive(entry.multiplier, `Conteúdo "${entry.id}".multiplier`, errors);
  }

  const harmonySource = calculateBouquetHarmony.toString();
  const staticHarmonyFlowerIds = [...harmonySource.matchAll(/counts\[['"]([^'"]+)['"]\]/g)]
    .map((match) => match[1]);
  for (const flowerId of staticHarmonyFlowerIds) {
    if (!flowerIdSet.has(flowerId)) {
      errors.push(`A harmonia dos ramos referencia a flor inexistente "${flowerId}".`);
    }
  }

  let precacheAssets = [];
  try {
    precacheAssets = extractPrecacheAssets(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'));
  } catch (error) {
    errors.push(error.message);
  }
  for (const asset of precacheAssets) {
    if (asset === './') continue;
    const normalized = asset.replace(/^\.\//, '').split(/[?#]/, 1)[0];
    const absolutePath = path.resolve(ROOT, normalized);
    if (
      absolutePath === ROOT
      || !absolutePath.startsWith(`${ROOT}${path.sep}`)
      || !fs.existsSync(absolutePath)
    ) {
      errors.push(`O pré-cache referencia um ficheiro inexistente ou fora do projeto: ${asset}.`);
    }
  }

  const resources = [
    ...collectResourceReferences(FLOWERS_CONFIG),
    ...collectResourceReferences(SPECIAL_ORDERS),
    ...collectResourceReferences(UPGRADES_CONFIG),
    ...collectResourceReferences(WRAPPERS),
    ...collectResourceReferences(ACCESSORIES)
  ];
  validateResourceReferences(resources, precacheAssets, errors);

  if (!precacheAssets.includes('./js/save-migrations.mjs')) {
    errors.push('O módulo de migrações do save não está no pré-cache do service worker.');
  }

  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = validateContent();
  if (errors.length > 0) {
    errors.forEach((error) => console.error(`ERRO: ${error}`));
    process.exitCode = 1;
  } else {
    console.log(
      `Validação de conteúdo concluída: ${Object.keys(FLOWERS_CONFIG).length} flores, `
      + `${SPECIAL_ORDERS.length} encomendas e ${Object.keys(UPGRADES_CONFIG).length} melhorias.`
    );
  }
}
