import { state } from './state.js';
import { PALETTE } from './utils.js';
import { HALLOWEEN_THEME } from './themes/halloween.js';
import { LUMINOUS_GARDEN_THEME } from './themes/luminous-garden.js';
import { HEARTS_GARDEN_THEME } from './themes/hearts-garden.js';

export const EVENT_THEMES_ENABLED = true;
export const PERMANENT_THEMES_ENABLED = true;
export const LUMINOUS_GARDEN_UNLOCK_LEVEL = LUMINOUS_GARDEN_THEME.unlockLevel;
export const THEME_PREFERENCES = Object.freeze(['auto', 'halloween', 'luminous', 'jardim_coracoes', 'classic']);
const THEMES_BY_PREFERENCE = new Map([
  ['halloween', HALLOWEEN_THEME],
  ['luminous', LUMINOUS_GARDEN_THEME],
  ['jardim_coracoes', HEARTS_GARDEN_THEME]
]);
const THEMES_BY_ID = new Map([...THEMES_BY_PREFERENCE.values()].map((theme) => [theme.id, theme]));

function isRecurringWindowValid(window) {
  if (!window || typeof window !== 'object') return false;
  if (
    typeof window.start !== 'string'
    || typeof window.end !== 'string'
    || !/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(window.start)
    || !/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(window.end)
  ) {
    return false;
  }
  const [startMonth, startDay] = window.start.split('-').map(Number);
  const [endMonth, endDay] = window.end.split('-').map(Number);
  if (
    new Date(2024, startMonth - 1, startDay).getMonth() + 1 !== startMonth
    || new Date(2024, endMonth - 1, endDay).getMonth() + 1 !== endMonth
  ) {
    return false;
  }
  return startMonth * 100 + startDay <= endMonth * 100 + endDay;
}

function isWithinRecurringWindow(date, window) {
  if (!isRecurringWindowValid(window)) return false;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const [startMonth, startDay] = window.start.split('-').map(Number);
  const [endMonth, endDay] = window.end.split('-').map(Number);
  const current = month * 100 + day;
  return current >= startMonth * 100 + startDay && current <= endMonth * 100 + endDay;
}

export function resolveThemeId(
  preference,
  date = new Date(),
  eventThemesEnabled = EVENT_THEMES_ENABLED,
  permanentThemesEnabled = PERMANENT_THEMES_ENABLED,
  level = 0
) {
  if (preference === 'classic') return 'classic';
  const selectedTheme = THEMES_BY_PREFERENCE.get(preference);
  if (selectedTheme && selectedTheme.type === 'permanent') {
    if (!permanentThemesEnabled) return 'classic';
    if (preference === 'luminous' && level < LUMINOUS_GARDEN_UNLOCK_LEVEL) return 'classic';
    return selectedTheme.id;
  }
  if (preference === 'halloween') return eventThemesEnabled ? HALLOWEEN_THEME.id : 'classic';
  if (!eventThemesEnabled) return 'classic';
  if (preference !== 'auto') return 'classic';

  const eventThemes = [HEARTS_GARDEN_THEME, HALLOWEEN_THEME];
  return eventThemes.find((theme) => (
    (theme.type !== 'permanent' || permanentThemesEnabled)
    && isWithinRecurringWindow(date, theme.recurringWindow)
  ))?.id || 'classic';
}

export function getThemePreference(settings, level = 0) {
  if (settings?.themePreference === undefined) return 'auto';
  if (!THEME_PREFERENCES.includes(settings.themePreference)) return 'classic';
  if (settings.themePreference === 'luminous' && level < LUMINOUS_GARDEN_UNLOCK_LEVEL) return 'classic';
  return settings.themePreference;
}

export function isThemeManifestValid(theme, expectedId, expectedType) {
  if (
    !theme
    || theme.id !== expectedId
    || theme.type !== expectedType
    || typeof theme.label !== 'string'
    || !theme.label.trim()
    || !theme.palette
    || typeof theme.palette !== 'object'
    || Array.isArray(theme.palette)
    || !theme.cssTokens
    || typeof theme.cssTokens !== 'object'
    || Array.isArray(theme.cssTokens)
    || (theme.recurringWindow && !isRecurringWindowValid(theme.recurringWindow))
    || (theme.hudIconMarkup && (
      typeof theme.hudIconMarkup !== 'object'
      || Array.isArray(theme.hudIconMarkup)
      || !Object.values(theme.hudIconMarkup).every((value) => typeof value === 'string')
    ))
  ) {
    return false;
  }

  return Object.values(theme.cssTokens).every((value) => (
    typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)
  ));
}

export class ThemeManager {
  constructor(gameState) {
    this.state = gameState;
    this.activeTheme = null;
    this.lastFrameAt = null;
    this.lowFrameSince = null;
    this.stableFrameSince = null;
    this.performanceFallback = false;
    this.activeHalosThisFrame = 0;
    this.appliedCssTokens = new Set();
    this.reportedErrors = new Set();
    this.baseHudIconMarkup = new Map();
    this.refresh();
    this.state.subscribe(() => this.refresh());
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.refresh();
      });
      window.addEventListener('focus', () => this.refresh());
    }
  }

  get preference() {
    return getThemePreference(this.state.settings, this.state.level);
  }

  get reducedEffects() {
    const systemPrefersReducedMotion = typeof matchMedia === 'function'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;
    return this.state.settings?.themeReducedEffects === true || systemPrefersReducedMotion;
  }

  get effectsReduced() {
    return this.reducedEffects || this.performanceFallback;
  }

  setPerformanceFallback(enabled) {
    if (this.performanceFallback === enabled) return;
    this.performanceFallback = enabled;
    const notice = typeof document !== 'undefined'
      ? document.getElementById('theme-performance-notice')
      : null;
    notice?.classList.toggle('hidden', !enabled);
  }

  get palette() {
    return this.activeTheme?.paletteAppliesToWorld
      ? { ...PALETTE, ...this.activeTheme.palette }
      : PALETTE;
  }

  get assetPalette() {
    return this.activeTheme?.assetPalette
      ? { ...PALETTE, ...this.activeTheme.assetPalette }
      : PALETTE;
  }

  beginFrame(now = performance.now()) {
    this.activeHalosThisFrame = 0;
    if (this.activeTheme?.type !== 'permanent' || this.reducedEffects) {
      this.lastFrameAt = now;
      this.lowFrameSince = null;
      this.stableFrameSince = null;
      this.setPerformanceFallback(false);
      return;
    }
    if (this.lastFrameAt !== null) {
      const frameDuration = now - this.lastFrameAt;
      if (frameDuration <= 250 && frameDuration >= 34) {
        this.stableFrameSince = null;
        this.lowFrameSince ??= now;
        if (now - this.lowFrameSince >= 3000) this.setPerformanceFallback(true);
      } else if (frameDuration < 24) {
        this.lowFrameSince = null;
        this.stableFrameSince ??= now;
        if (now - this.stableFrameSince >= 6000) this.setPerformanceFallback(false);
      } else {
        this.lowFrameSince = null;
        this.stableFrameSince = null;
      }
    }
    this.lastFrameAt = now;
  }

  refresh(date = new Date()) {
    const id = resolveThemeId(
      this.preference,
      date,
      EVENT_THEMES_ENABLED,
      PERMANENT_THEMES_ENABLED,
      this.state.level
    );
    const candidate = THEMES_BY_ID.get(id) || null;
    const expectedType = candidate?.type;
    this.activeTheme = candidate && isThemeManifestValid(candidate, id, expectedType)
      ? candidate
      : null;
    if (this.activeTheme?.type !== 'permanent') {
      this.setPerformanceFallback(false);
      this.lowFrameSince = null;
      this.stableFrameSince = null;
    }
    if (candidate && !this.activeTheme && !this.reportedErrors.has('manifest')) {
      console.error(`Manifesto do tema "${id}" inválido; o visual padrão será mantido.`);
      this.reportedErrors.add('manifest');
    }

    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    this.appliedCssTokens.forEach((token) => root.style.removeProperty(token));
    this.appliedCssTokens.clear();
    for (const [token, value] of Object.entries(this.activeTheme?.cssTokens || {})) {
      root.style.setProperty(token, value);
      this.appliedCssTokens.add(token);
    }
    if (this.activeTheme) root.dataset.visualTheme = this.activeTheme.id;
    else delete root.dataset.visualTheme;

    this.updateHudIconography();
    const eventPill = document.getElementById('theme-event-pill');
    if (eventPill) {
      const scheduledEventActive = Boolean(this.activeTheme?.recurringWindow)
        && this.preference === 'auto'
        && isWithinRecurringWindow(date, this.activeTheme.recurringWindow);
      const showEventPill = this.activeTheme?.type === 'event' || scheduledEventActive;
      eventPill.hidden = !showEventPill;
      eventPill.classList.toggle('hidden', !showEventPill);
      const label = eventPill.querySelector('[data-theme-event-label]');
      const icon = eventPill.querySelector('.world-status-icon');
      if (label) label.textContent = this.activeTheme?.eventPillLabel || 'Jardim de Halloween';
      eventPill.setAttribute(
        'aria-label',
        this.activeTheme?.eventPillAriaLabel || 'Ver opções do tema de Halloween'
      );
      if (icon) {
        if (this.activeTheme?.eventPillIconMarkup) {
          icon.innerHTML = this.activeTheme.eventPillIconMarkup;
        }
      }
    }
  }

  updateHudIconography() {
    if (typeof document === 'undefined') return;
    const iconSelectors = { coin: '.coin-icon svg', basket: '.basket-icon svg' };
    for (const [iconName, selector] of Object.entries(iconSelectors)) {
      const icon = document.querySelector(selector);
      if (!icon) continue;
      if (!this.baseHudIconMarkup.has(iconName)) {
        this.baseHudIconMarkup.set(iconName, icon.innerHTML);
      }
      icon.innerHTML = this.activeTheme?.hudIconMarkup?.[iconName]
        || this.baseHudIconMarkup.get(iconName);
    }
  }

  setPreference(preference) {
    if (!THEME_PREFERENCES.includes(preference)) return false;
    if (preference === 'luminous' && this.state.level < LUMINOUS_GARDEN_UNLOCK_LEVEL) return false;
    const previous = this.state.settings.themePreference;
    this.state.settings.themePreference = preference;
    if (!this.state.save()) {
      this.state.settings.themePreference = previous;
      this.refresh();
      return false;
    }
    this.state.notify('theme_preference_changed');
    this.refresh();
    return true;
  }

  setReducedEffects(reduced) {
    if (typeof reduced !== 'boolean') return false;
    const previous = this.state.settings.themeReducedEffects;
    this.state.settings.themeReducedEffects = reduced;
    if (!this.state.save()) {
      this.state.settings.themeReducedEffects = previous;
      this.refresh();
      return false;
    }
    this.state.notify('theme_preference_changed');
    this.refresh();
    return true;
  }

  getTreePalette(x, y) {
    return this.activeTheme?.getTreePalette?.(x, y) || null;
  }

  resolveFlowerConfig(flowerConfig) {
    if (!this.activeTheme || !flowerConfig) return flowerConfig;
    return this.runThemeCallback('resolveFlowerConfig', flowerConfig) || flowerConfig;
  }

  getAwningColor(index, fallback) {
    const colors = this.activeTheme?.awningColors;
    return colors?.length ? colors[index % colors.length] : fallback;
  }

  getAnimationPulse(offset = 0) {
    if (this.effectsReduced) return 0.5;
    const period = this.activeTheme?.animationPulsePeriodMs || 6400;
    return (Math.sin(((performance.now() + offset) / period) * Math.PI * 2) + 1) / 2;
  }

  drawFlowerHalo(ctx, flowerConfig) {
    const theme = this.activeTheme;
    if (!theme || typeof theme.drawFlowerHalo !== 'function' || !flowerConfig) return;
    if (this.activeHalosThisFrame >= (theme.maxHalosActive || 0)) return;
    this.activeHalosThisFrame += 1;
    const pulse = (Math.sin((performance.now() / (theme.haloPulsePeriodMs || 6400)) * Math.PI * 2) + 1) / 2;
    this.runThemeCallback('drawFlowerHalo', ctx, flowerConfig, pulse, this.effectsReduced);
  }

  drawLayer(ctx, layer, ...args) {
    if (!this.activeTheme || typeof this.activeTheme[layer] !== 'function') return;
    this.runThemeCallback(layer, ctx, ...args);
  }

  runThemeCallback(name, ...args) {
    try {
      return this.activeTheme?.[name]?.(...args);
    } catch (error) {
      if (!this.reportedErrors.has(name)) {
        console.error(`Falha ao desenhar o tema "${name}"; o visual base será mantido.`, error);
        this.reportedErrors.add(name);
      }
      return null;
    }
  }
}

export const themeManager = new ThemeManager(state);
