export const HUD_CUSTOMIZABLE_ITEMS = [
  { id: 'coins', label: 'Moedas', selector: '#hud .hud-coins', defaultPosition: [0.08, 0.04], defaultScale: 1.08 },
  { id: 'level', label: 'Nível e experiência', selector: '#hud .hud-level', defaultPosition: [0.5, 0.04], defaultScale: 1.08 },
  { id: 'basket', label: 'Cesto', selector: '#hud .hud-basket', defaultPosition: [0.92, 0.04], defaultScale: 1.08 },
  { id: 'menu', label: 'Menu principal', selector: '#hud .hud-actions', defaultPosition: [0.87, 0.04], defaultScale: 1.08 },
  { id: 'status', label: 'Estado do jardim', selector: '#hud-world-status', defaultPosition: [0.5, 0.12], defaultScale: 1 },
  { id: 'favorite-objective', label: 'Objetivo favorito', selector: '#hud-favorite-objective', defaultPosition: [0.5, 0.2], defaultScale: 1 },
  { id: 'map', label: 'Mapa', selector: '#map-panel', defaultPosition: [0.86, 0.34], defaultScale: 1 },
  { id: 'tutorial', label: 'Dica do jogo', selector: '#tutorial-banner', defaultPosition: [0.5, 0.9], defaultScale: 1 },
  { id: 'interaction', label: 'Dica de interação', selector: '#interaction-prompt', defaultPosition: [0.5, 0.12], defaultScale: 1 },
  { id: 'joystick', label: 'Joystick móvel', selector: '#virtual-joystick', defaultPosition: [0.13, 0.86], defaultScale: 1 },
  { id: 'action', label: 'Botão Agir móvel', selector: '#btn-mobile-action', defaultPosition: [0.87, 0.86], defaultScale: 1 },
  { id: 'updates', label: 'Atualizações', selector: '#update-app-banner', defaultPosition: [0.5, 0.95], defaultScale: 1 },
  { id: 'connection', label: 'Estado da ligação', selector: '#connection-status', defaultPosition: [0.5, 0.9], defaultScale: 1 },
  { id: 'notifications', label: 'Notificações', selector: '#toast-container', defaultPosition: [0.5, 0.22], defaultScale: 1 }
];

const MIN_SCALE = 0.65;
const MAX_SCALE = 1.6;

export function normalizeHudLayout(layout) {
  if (!layout || typeof layout !== 'object' || Array.isArray(layout)) return {};

  const normalized = {};
  for (const item of HUD_CUSTOMIZABLE_ITEMS) {
    const position = layout[item.id];
    if (!position || typeof position !== 'object') continue;
    if (
      !Number.isFinite(position.x)
      || !Number.isFinite(position.y)
      || !Number.isFinite(position.scale)
      || position.x < 0
      || position.x > 1
      || position.y < 0
      || position.y > 1
    ) continue;
    normalized[item.id] = {
      x: position.x,
      y: position.y,
      scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, position.scale))
    };
  }
  return normalized;
}

export class HudCustomizer {
  constructor(state) {
    this.state = state;
    this.items = HUD_CUSTOMIZABLE_ITEMS
      .map((item) => ({ ...item, element: document.querySelector(item.selector) }))
      .filter((item) => item.element);
    for (const item of this.items) item.element.classList.add('hud-customizable');
    this.draft = null;
    this.snapshots = new Map();
    this.selectedId = this.items[0]?.id;
    this.root = document.getElementById('game-container');
    this.toolbar = this.createToolbar();
    this.bindToolbar();
    this.bindDragging();
    this.applySavedLayout();
  }

  createToolbar() {
    const toolbar = document.createElement('section');
    toolbar.className = 'hud-editor-toolbar hidden';
    toolbar.setAttribute('aria-label', 'Personalização da interface');
    toolbar.innerHTML = `
      <label class="hud-editor-item-label">
        Elemento
        <select class="hud-editor-item"></select>
      </label>
      <label class="hud-editor-size-label">
        Tamanho <output class="hud-editor-size-value">100%</output>
        <input class="hud-editor-size" type="range" min="${MIN_SCALE}" max="${MAX_SCALE}" step="0.05" value="1">
      </label>
      <div class="hud-editor-position" aria-label="Ajustar posição">
        <button type="button" data-move="up" aria-label="Mover para cima">↑</button>
        <button type="button" data-move="left" aria-label="Mover para a esquerda">←</button>
        <button type="button" data-move="down" aria-label="Mover para baixo">↓</button>
        <button type="button" data-move="right" aria-label="Mover para a direita">→</button>
      </div>
      <span class="hud-editor-hint">Arrasta os elementos para os reposicionar.</span>
      <div class="hud-editor-actions">
        <button type="button" class="hud-editor-reset">Repor padrão</button>
        <button type="button" class="hud-editor-cancel">Cancelar</button>
        <button type="button" class="hud-editor-save">Guardar</button>
      </div>
      <p class="hud-editor-error hidden" role="alert">Não foi possível guardar. As alterações anteriores foram mantidas.</p>
    `;
    this.root?.appendChild(toolbar);

    const select = toolbar.querySelector('.hud-editor-item');
    for (const item of this.items) {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.label;
      select.appendChild(option);
    }
    return toolbar;
  }

  bindToolbar() {
    this.toolbar.querySelector('.hud-editor-item').addEventListener('change', (event) => {
      this.selectItem(event.target.value);
    });
    this.toolbar.querySelector('.hud-editor-size').addEventListener('input', (event) => {
      const position = this.draft?.[this.selectedId];
      if (!position) return;
      position.scale = Number(event.target.value);
      this.applyPosition(this.items.find((item) => item.id === this.selectedId), position);
      this.updateSizeOutput();
    });
    this.toolbar.querySelectorAll('[data-move]').forEach((button) => {
      button.addEventListener('click', () => this.moveSelected(button.dataset.move, 0.01));
    });
    this.toolbar.querySelector('.hud-editor-reset').addEventListener('click', () => this.resetDraft());
    this.toolbar.querySelector('.hud-editor-cancel').addEventListener('click', () => this.finish(false));
    this.toolbar.querySelector('.hud-editor-save').addEventListener('click', () => this.finish(true));
    window.addEventListener('keydown', (event) => {
      if (!this.draft) return;
      if (event.key === 'Escape') {
        this.finish(false);
        return;
      }
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      if (event.target instanceof Element && event.target.matches('input, select, textarea, button')) return;
      event.preventDefault();
      const position = this.draft[this.selectedId];
      if (!position) return;
      const distance = event.shiftKey ? 0.03 : 0.01;
      if (event.key === 'ArrowUp') position.y -= distance;
      if (event.key === 'ArrowDown') position.y += distance;
      if (event.key === 'ArrowLeft') position.x -= distance;
      if (event.key === 'ArrowRight') position.x += distance;
      this.applyPosition(this.items.find((item) => item.id === this.selectedId), position);
    });
    window.addEventListener('resize', () => {
      if (!this.draft) this.applySavedLayout();
      else this.reapplyDraft();
    });
  }

  bindDragging() {
    for (const item of this.items) {
      item.element.addEventListener('click', (event) => {
        if (!this.draft) return;
        event.preventDefault();
        event.stopPropagation();
      }, true);
      item.element.addEventListener('pointerdown', (event) => {
        if (!this.draft || event.button !== 0) return;
        event.preventDefault();
        this.selectItem(item.id);
        item.element.setPointerCapture(event.pointerId);
        const bounds = item.element.getBoundingClientRect();
        const offsetX = event.clientX - (bounds.left + bounds.width / 2);
        const offsetY = event.clientY - (bounds.top + bounds.height / 2);

        const move = (moveEvent) => {
          const position = this.draft?.[item.id];
          if (!position) return;
          position.x = (moveEvent.clientX - offsetX) / window.innerWidth;
          position.y = (moveEvent.clientY - offsetY) / window.innerHeight;
          this.applyPosition(item, position);
        };
        const end = () => {
          item.element.removeEventListener('pointermove', move);
          item.element.removeEventListener('pointerup', end);
          item.element.removeEventListener('pointercancel', end);
        };
        item.element.addEventListener('pointermove', move);
        item.element.addEventListener('pointerup', end);
        item.element.addEventListener('pointercancel', end);
      });
    }
  }

  capturePosition(item) {
    const bounds = item.element.getBoundingClientRect();
    const visible = bounds.width > 0 && bounds.height > 0;
    const [defaultX, defaultY] = item.defaultPosition;
    return {
      x: visible ? (bounds.left + bounds.width / 2) / window.innerWidth : defaultX,
      y: visible ? (bounds.top + bounds.height / 2) / window.innerHeight : defaultY,
      scale: item.defaultScale
    };
  }

  applyPosition(item, position) {
    if (!item) return;
    const bounds = item.element.getBoundingClientRect();
    const halfWidth = Math.min(0.49, bounds.width / (2 * window.innerWidth));
    const halfHeight = Math.min(0.49, bounds.height / (2 * window.innerHeight));
    position.x = Math.max(halfWidth, Math.min(1 - halfWidth, position.x));
    position.y = Math.max(halfHeight, Math.min(1 - halfHeight, position.y));
    item.element.style.position = 'fixed';
    item.element.style.left = `${position.x * 100}%`;
    item.element.style.top = `${position.y * 100}%`;
    item.element.style.right = 'auto';
    item.element.style.bottom = 'auto';
    item.element.style.margin = '0';
    item.element.style.transform = `translate(-50%, -50%) scale(${position.scale})`;
    item.element.style.transformOrigin = 'center';
  }

  applySavedLayout() {
    const layout = normalizeHudLayout(this.state.settings.hudLayout);
    for (const item of this.items) {
      const position = layout[item.id];
      if (position) this.applyPosition(item, { ...position });
      else this.clearPosition(item);
    }
  }

  clearPosition(item) {
    for (const property of ['position', 'left', 'top', 'right', 'bottom', 'margin', 'transform', 'transform-origin', 'z-index']) {
      item.element.style.removeProperty(property);
    }
  }

  start() {
    if (this.draft) return;
    this.snapshots = new Map(this.items.map((item) => [item.id, item.element.getAttribute('style')]));
    this.hiddenSnapshots = new Map();
    for (const item of this.items) {
      const elements = [item.element, ...item.element.querySelectorAll('.hidden')];
      for (const element of elements) {
        if (!element.classList.contains('hidden')) continue;
        this.hiddenSnapshots.set(element, true);
        element.classList.remove('hidden');
      }
    }
    const savedLayout = normalizeHudLayout(this.state.settings.hudLayout);
    this.draft = Object.fromEntries(this.items.map((item) => [
      item.id,
      { ...(savedLayout[item.id] || this.capturePosition(item)) }
    ]));
    this.toolbar.querySelector('.hud-editor-error').classList.add('hidden');
    this.toolbar.querySelector('.hud-editor-item').value = this.selectedId;
    this.toolbar.classList.remove('hidden');
    document.body.classList.add('hud-customizing');
    this.reapplyDraft();
    this.selectItem(this.selectedId);
  }

  selectItem(id) {
    if (!this.items.some((item) => item.id === id)) return;
    this.selectedId = id;
    this.toolbar.querySelector('.hud-editor-item').value = id;
    for (const item of this.items) {
      item.element.classList.toggle('hud-editor-selected', item.id === id && Boolean(this.draft));
    }
    this.updateSizeOutput();
  }

  updateSizeOutput() {
    const position = this.draft?.[this.selectedId];
    if (!position) return;
    this.toolbar.querySelector('.hud-editor-size').value = String(position.scale);
    this.toolbar.querySelector('.hud-editor-size-value').textContent = `${Math.round(position.scale * 100)}%`;
  }

  moveSelected(direction, distance) {
    const position = this.draft?.[this.selectedId];
    if (!position) return;
    if (direction === 'up') position.y -= distance;
    if (direction === 'down') position.y += distance;
    if (direction === 'left') position.x -= distance;
    if (direction === 'right') position.x += distance;
    this.applyPosition(this.items.find((item) => item.id === this.selectedId), position);
  }

  reapplyDraft() {
    for (const item of this.items) {
      const position = this.draft?.[item.id];
      if (position) this.applyPosition(item, position);
    }
  }

  resetDraft() {
    for (const item of this.items) this.clearPosition(item);
    this.draft = Object.fromEntries(this.items.map((item) => [item.id, this.capturePosition(item)]));
    this.reapplyDraft();
    this.selectItem(this.selectedId);
  }

  finish(save) {
    if (!this.draft) return;
    if (save) {
      const previousLayout = this.state.settings.hudLayout;
      this.state.settings.hudLayout = normalizeHudLayout(this.draft);
      if (!this.state.save()) {
        this.state.settings.hudLayout = previousLayout;
        this.toolbar.querySelector('.hud-editor-error').classList.remove('hidden');
        return;
      }
    } else {
      for (const item of this.items) {
        const style = this.snapshots.get(item.id);
        if (style === null) item.element.removeAttribute('style');
        else item.element.setAttribute('style', style);
      }
    }

    this.draft = null;
    this.toolbar.classList.add('hidden');
    document.body.classList.remove('hud-customizing');
    for (const item of this.items) item.element.classList.remove('hud-editor-selected');
    for (const element of this.hiddenSnapshots.keys()) element.classList.add('hidden');
    this.hiddenSnapshots.clear();
    if (save) this.applySavedLayout();
  }
}
