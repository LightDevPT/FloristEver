import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  getThemePreference,
  isThemeManifestValid,
  LUMINOUS_GARDEN_UNLOCK_LEVEL,
  ThemeManager,
  resolveThemeId
} from '../js/theme-manager.js';
import { HALLOWEEN_THEME } from '../js/themes/halloween.js';
import { LUMINOUS_GARDEN_THEME } from '../js/themes/luminous-garden.js';
import { HEARTS_GARDEN_THEME } from '../js/themes/hearts-garden.js';
import {
  DAY_NIGHT_CYCLE_SECONDS,
  getDayNightLighting,
  MAX_NIGHT_OVERLAY_ALPHA
} from '../js/day-night.js';
import { GameState } from '../js/state.js';
import { FLOWERS_CONFIG, FLOWER_ORDER } from '../js/config/flowers.js';

const halloweenId = HALLOWEEN_THEME.id;

test('day-night lighting has smooth, bright daytime and a readable night for every theme', () => {
  const daylight = getDayNightLighting(0);
  const sunset = getDayNightLighting(DAY_NIGHT_CYCLE_SECONDS * 0.58);
  const night = getDayNightLighting(DAY_NIGHT_CYCLE_SECONDS * 0.85);
  const dawn = getDayNightLighting(DAY_NIGHT_CYCLE_SECONDS * 0.97);

  assert.equal(DAY_NIGHT_CYCLE_SECONDS, 360);
  assert.equal(daylight.night, 0);
  assert.equal(daylight.sunset, 0);
  assert.equal(daylight.dawn, 0);
  assert.equal(sunset.sunset, 1);
  assert.equal(night.night, 1);
  assert.equal(night.dawn, 0);
  assert.equal(dawn.dawn, 1);
  assert.ok(MAX_NIGHT_OVERLAY_ALPHA <= 0.2);
  assert.ok(night.night <= 1);
  assert.equal(getDayNightLighting(360).phase, daylight.phase);
  assert.equal(getDayNightLighting(-360).phase, daylight.phase);
});

test('automatic theme is active throughout the inclusive annual event window', () => {
  assert.equal(resolveThemeId('auto', new Date(2026, 9, 23, 23, 59)), 'classic');
  assert.equal(resolveThemeId('auto', new Date(2026, 9, 24, 0, 0)), halloweenId);
  assert.equal(resolveThemeId('auto', new Date(2026, 10, 7, 23, 59)), halloweenId);
  assert.equal(resolveThemeId('auto', new Date(2026, 10, 8, 0, 0)), 'classic');
  assert.equal(resolveThemeId('auto', new Date(2027, 9, 24, 12, 0)), halloweenId);
});

test('manual theme selection and global kill switch resolve safely', () => {
  assert.equal(resolveThemeId('halloween', new Date(2026, 0, 1)), halloweenId);
  assert.equal(resolveThemeId('classic', new Date(2026, 9, 31)), 'classic');
  assert.equal(resolveThemeId('auto', new Date(2026, 9, 31), false), 'classic');
  assert.equal(resolveThemeId('invalid', new Date(2026, 9, 31)), 'classic');
});

test('permanent theme unlock and event priority are independent', () => {
  const eventDate = new Date(2026, 9, 31);
  const requiredLevel = LUMINOUS_GARDEN_UNLOCK_LEVEL;
  const luminousId = LUMINOUS_GARDEN_THEME.id;

  assert.equal(resolveThemeId('luminous', eventDate, true, true, requiredLevel - 1), 'classic');
  assert.equal(resolveThemeId('luminous', eventDate, true, true, requiredLevel), luminousId);
  assert.equal(resolveThemeId('luminous', eventDate, false, true, requiredLevel), luminousId);
  assert.equal(resolveThemeId('luminous', eventDate, true, false, requiredLevel), 'classic');
  assert.equal(resolveThemeId('auto', eventDate, true, true, requiredLevel), halloweenId);
  assert.equal(resolveThemeId('halloween', eventDate, true, true, requiredLevel), halloweenId);
  assert.equal(getThemePreference({ themePreference: 'luminous' }, requiredLevel - 1), 'classic');
  assert.equal(getThemePreference({ themePreference: 'luminous' }, requiredLevel), 'luminous');
});

test('hearts garden is permanent, free, and selected by the February event window', () => {
  const heartsId = HEARTS_GARDEN_THEME.id;
  const date = (day) => new Date(2027, 1, day, 12, 0);

  assert.equal(resolveThemeId('auto', date(6)), 'classic');
  assert.equal(resolveThemeId('auto', date(7)), heartsId);
  assert.equal(resolveThemeId('auto', date(14)), heartsId);
  assert.equal(resolveThemeId('auto', date(21)), heartsId);
  assert.equal(resolveThemeId('auto', date(22)), 'classic');
  assert.equal(resolveThemeId('jardim_coracoes', date(6)), heartsId);
  assert.equal(resolveThemeId('jardim_coracoes', date(14), false, true), heartsId);
  assert.equal(resolveThemeId('jardim_coracoes', date(14), true, false), 'classic');
  assert.equal(resolveThemeId('auto', date(14), false), 'classic');
  assert.equal(resolveThemeId('classic', date(14)), 'classic');
  assert.equal(getThemePreference({ themePreference: 'jardim_coracoes' }), 'jardim_coracoes');
  assert.equal(isThemeManifestValid(HEARTS_GARDEN_THEME, heartsId, 'permanent'), true);
  assert.match(HEARTS_GARDEN_THEME.hudIconMarkup.coin, /fill="#FFC94A"/);
  assert.match(HEARTS_GARDEN_THEME.hudIconMarkup.basket, /#FF9EBC/);
  assert.equal(HEARTS_GARDEN_THEME.palette.grassLight, '#B7E99E');
  assert.equal(
    isThemeManifestValid(
      { ...HEARTS_GARDEN_THEME, recurringWindow: { start: '02-21', end: '02-07' } },
      heartsId,
      'permanent'
    ),
    false
  );
});

test('invalid theme manifests fail closed to the base visual', () => {
  assert.equal(isThemeManifestValid(HALLOWEEN_THEME, halloweenId, 'event'), true);
  assert.equal(isThemeManifestValid(LUMINOUS_GARDEN_THEME, 'luminous-garden', 'permanent'), true);
  assert.equal(
    isThemeManifestValid({ ...LUMINOUS_GARDEN_THEME, cssTokens: { '--color-cream': 'invalid' } }, 'luminous-garden', 'permanent'),
    false
  );
  assert.equal(isThemeManifestValid(LUMINOUS_GARDEN_THEME, 'unexpected', 'permanent'), false);
  assert.equal(isThemeManifestValid(HEARTS_GARDEN_THEME, 'unexpected', 'permanent'), false);
});

test('theme settings and manifests are included in the offline app sources', () => {
  const serviceWorker = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(serviceWorker, /const CACHE_NAME = 'floristever-v77'/);
  assert.match(serviceWorker, /'\.\/js\/themes\/luminous-garden\.js'/);
  assert.match(html, /name="theme-preference" value="luminous"/);
  assert.match(html, /Desbloqueia ao atingir o nível 10/);
  assert.match(html, /name="theme-preference" value="jardim_coracoes"/);
  assert.match(html, /Jardim dos Corações de 7 a 21 de fevereiro/);
  assert.match(serviceWorker, /'\.\/js\/themes\/hearts-garden\.js'/);
  assert.match(serviceWorker, /'\.\/js\/day-night\.js'/);
  assert.match(serviceWorker, /'\.\/js\/garden-paths\.js'/);
});

test('theme manager degrades and restores effects after sustained frame-rate changes', () => {
  const fakeState = {
    settings: { themePreference: 'luminous', themeReducedEffects: false },
    level: LUMINOUS_GARDEN_UNLOCK_LEVEL,
    subscribe() {}
  };
  const manager = new ThemeManager(fakeState);

  manager.beginFrame(0);
  for (let now = 40; now <= 3040; now += 40) manager.beginFrame(now);
  assert.equal(manager.performanceFallback, true);
  assert.equal(manager.effectsReduced, true);

  for (let now = 3063; now <= 9100; now += 23) manager.beginFrame(now);
  assert.equal(manager.performanceFallback, false);
  assert.equal(manager.effectsReduced, false);
});

test('legacy or invalid theme preferences default to automatic without migration', () => {
  assert.equal(getThemePreference(undefined), 'auto');
  assert.equal(getThemePreference({}), 'auto');
  assert.equal(getThemePreference({ themePreference: 'invalid' }), 'classic');
  assert.equal(getThemePreference({ themePreference: 'classic' }), 'classic');

  const gameState = new GameState();
  const save = gameState.exportSaveData();
  assert.equal(save.settings.themePreference, 'auto');
  assert.equal(save.settings.themeReducedEffects, false);
  assert.equal(save.schemaVersion, 1);
});

test('luminous flower variants preserve gameplay and progression fields for every flower', () => {
  for (const flowerId of FLOWER_ORDER) {
    const original = FLOWERS_CONFIG[flowerId];
    const themed = LUMINOUS_GARDEN_THEME.resolveFlowerConfig(original);

    assert.notEqual(themed, original);
    assert.notEqual(themed.color, original.color);
    assert.equal(themed.id, original.id);
    assert.equal(themed.value, original.value);
    assert.equal(themed.requiredLevel, original.requiredLevel);
    assert.equal(themed.growthTime, original.growthTime);
    assert.equal(themed.petals, original.petals);
    assert.equal(themed.radius, original.radius);
    assert.equal(original.color, FLOWERS_CONFIG[flowerId].color);
  }
});

test('hearts garden flower variants preserve gameplay and progression fields for every flower', () => {
  for (const flowerId of FLOWER_ORDER) {
    const original = FLOWERS_CONFIG[flowerId];
    const themed = HEARTS_GARDEN_THEME.resolveFlowerConfig(original);

    assert.notEqual(themed, original);
    assert.notEqual(themed.color, original.color);
    assert.equal(themed.id, original.id);
    assert.equal(themed.value, original.value);
    assert.equal(themed.requiredLevel, original.requiredLevel);
    assert.equal(themed.growthTime, original.growthTime);
    assert.equal(themed.petals, original.petals);
    assert.equal(themed.radius, original.radius);
    assert.equal(original.color, FLOWERS_CONFIG[flowerId].color);
  }
});

test('seasonal flower variants preserve all gameplay and progression fields', () => {
  const original = {
    id: 'sunflower',
    color: '#F7C948',
    centerColor: '#8B5E3C',
    value: 30,
    requiredLevel: 3,
    petals: 12,
    radius: 17
  };
  const seasonal = HALLOWEEN_THEME.resolveFlowerConfig(original);

  assert.notEqual(seasonal, original);
  assert.notEqual(seasonal.color, original.color);
  assert.equal(seasonal.value, original.value);
  assert.equal(seasonal.requiredLevel, original.requiredLevel);
  assert.equal(seasonal.petals, original.petals);
  assert.equal(seasonal.radius, original.radius);
  assert.equal(original.color, '#F7C948');
});
