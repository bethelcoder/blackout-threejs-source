// Options menu + persistent settings (Polish rubric: options menu, quality-of-life features).
//
// This module owns the settings values, saves them to localStorage, builds the Options overlay and the
// buttons that open it (pause menu and main menu), and runs the optional frame-rate counter. It does not
// know about the renderer, audio or camera: main.js subscribes to changes and applies them, which keeps
// every setting's effect in one visible place.
const STORAGE_KEY = 'blackout.settings.v1';
const LOW_FPS = 40;          // below this for LOW_FPS_SAMPLES samples triggers onLowFps
const LOW_FPS_SAMPLES = 8;   // 8 samples x 0.5 s = 4 s of sustained low frame rate

export const SCHEMA = [
  { key: 'masterVolume', label: 'MASTER VOLUME', type: 'range', min: 0, max: 1, step: 0.05, default: 1,
    format: (v) => `${Math.round(v * 100)}%` },
  { key: 'musicVolume', label: 'MENU MUSIC', type: 'range', min: 0, max: 1, step: 0.05, default: 0.4,
    format: (v) => `${Math.round(v * 100)}%` },
  { key: 'mouseSensitivity', label: 'MOUSE SENSITIVITY', type: 'range', min: 0.3, max: 2.5, step: 0.1, default: 1,
    format: (v) => `${v.toFixed(1)}x` },
  { key: 'fov', label: 'FIELD OF VIEW', type: 'range', min: 60, max: 100, step: 1, default: 70,
    format: (v) => `${Math.round(v)}\u00b0` },
  { key: 'resolution', label: 'RENDER RESOLUTION', type: 'select', default: 'auto',
    options: [['auto', 'AUTO (ADAPTIVE)'], ['high', 'HIGH'], ['medium', 'MEDIUM'], ['low', 'LOW']] },
  { key: 'reflections', label: 'REFLECTIONS', type: 'select', default: 'dynamic',
    options: [['off', 'OFF'], ['static', 'STATIC'], ['dynamic', 'DYNAMIC (LIVE PROBE)']] },
  { key: 'reflectionStrength', label: 'REFLECTION STRENGTH', type: 'range', min: 0.1, max: 1, step: 0.05, default: 0.4,
    format: (v) => `${Math.round(v * 100)}%` },
  { key: 'showFps', label: 'SHOW FRAME RATE', type: 'toggle', default: false },
  { key: 'adaptiveAI', label: 'ADAPTIVE AI (LEARNS YOUR ROUTES)', type: 'toggle', default: true },
];

function coerce(item, value) {
  if (item.type === 'range') {
    const n = Number(value);
    if (!Number.isFinite(n)) return undefined;
    return Math.min(item.max, Math.max(item.min, n));
  }
  if (item.type === 'select') {
    return item.options.some(([v]) => v === value) ? value : undefined;
  }
  if (item.type === 'toggle') return typeof value === 'boolean' ? value : undefined;
  return undefined;
}

export class Settings {
  constructor() {
    this.values = {};
    for (const item of SCHEMA) this.values[item.key] = item.default;
    this._load();

    this.listeners = new Set();
    this.onLowFps = null;              // set by main.js
    this.reflectionsPinned = false;    // true once the player has touched the reflections option

    this.rows = new Map();             // key -> { input, output }
    this.overlay = null;
    this.fpsEl = null;
    this.aiStatusEl = null;
    this.returnFocusEl = null;

    this._fpsFrames = 0;
    this._fpsElapsed = 0;
    this._lowSamples = 0;
  }

  // ---------------------------------------------------------------- values

  get(key) { return this.values[key]; }

  /** Calls fn(key, value) whenever a setting changes. */
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  set(key, value) {
    const item = SCHEMA.find((entry) => entry.key === key);
    if (!item) return;
    const next = coerce(item, value);
    if (next === undefined || next === this.values[key]) return;
    this.values[key] = next;
    this._save();
    this._syncRow(key);
    this.listeners.forEach((fn) => fn(key, next));
  }

  resetToDefaults() {
    this.reflectionsPinned = true;
    for (const item of SCHEMA) this.set(item.key, item.default);
  }

  // ---------------------------------------------------------------- frame-rate counter

  /** Call once per frame while the game is running. Drives the FPS counter and the low-FPS fallback. */
  reportFrame(seconds) {
    if (seconds <= 0 || seconds > 0.25) { this._fpsFrames = 0; this._fpsElapsed = 0; return; }
    this._fpsFrames++;
    this._fpsElapsed += seconds;
    if (this._fpsElapsed < 0.5) return;

    const fps = this._fpsFrames / this._fpsElapsed;
    this._fpsFrames = 0;
    this._fpsElapsed = 0;

    if (this.fpsEl && this.values.showFps) this.fpsEl.textContent = `${Math.round(fps)} FPS`;

    this._lowSamples = fps < LOW_FPS ? this._lowSamples + 1 : 0;
    if (this._lowSamples >= LOW_FPS_SAMPLES) {
      this._lowSamples = 0;
      this.onLowFps?.(fps);
    }
  }

  // ---------------------------------------------------------------- UI

  /**
   * Builds the Options overlay and adds an OPTIONS button to the pause menu and the main menu.
   * getAIAttempts(): number of past attempts the AI has learned from. onResetAIMemory(): wipe them.
   */
  mount({ getAIAttempts = () => 0, onResetAIMemory = () => {} } = {}) {
    this._injectStyles();
    this._buildOverlay(getAIAttempts, onResetAIMemory);
    this._buildFpsCounter();
    this._addMenuButtons();

    // Capture phase so the game's own Escape / Enter / H handlers never see keys meant for this panel.
    window.addEventListener('keydown', (event) => {
      if (!this.isOpen()) return;
      if (event.code === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.close();
      } else if (['Enter', 'NumpadEnter', 'KeyH', 'KeyR'].includes(event.code)) {
        event.stopPropagation();
      }
    }, true);

    for (const item of SCHEMA) this._syncRow(item.key);
    this._syncFps();
  }

  isOpen() { return !!this.overlay && !this.overlay.classList.contains('hidden'); }

  open() {
    if (!this.overlay) return;
    this.returnFocusEl = document.activeElement;
    this._syncAIStatus();
    this.overlay.classList.remove('hidden');
    document.getElementById('btn-options-close')?.focus();
  }

  close() {
    if (!this.overlay) return;
    this.overlay.classList.add('hidden');
    this.returnFocusEl?.focus?.();
    this.returnFocusEl = null;
  }

  _buildOverlay(getAIAttempts, onResetAIMemory) {
    this.getAIAttempts = getAIAttempts;

    const overlay = document.createElement('div');
    overlay.id = 'options-menu';
    overlay.className = 'overlay hidden';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'options-title');
    overlay.innerHTML = `
      <div class="menu-panel tactical-modal options-panel">
        <div class="tech-corner tl"></div>
        <div class="tech-corner tr"></div>
        <div class="tech-corner bl"></div>
        <div class="tech-corner br"></div>
        <div class="tech-header-tag">
          <span class="pulse-cyan-dot"></span>
          <span>SYSTEM CONFIGURATION // OPTIONS</span>
        </div>
        <h2 id="options-title" class="tactical-menu-title">OPTIONS</h2>
        <div class="tech-divider"></div>
        <div id="options-rows" class="options-rows"></div>
        <div class="tactical-menu-actions">
          <button id="btn-options-defaults" class="tactical-btn warn">
            <span class="btn-arrow">&#9658;</span><span class="btn-text">RESET TO DEFAULTS</span>
          </button>
          <button id="btn-options-close" class="tactical-btn primary">
            <span class="btn-arrow">&#9658;</span><span class="btn-text">BACK [ESC]</span>
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    this.overlay = overlay;

    const rowsEl = overlay.querySelector('#options-rows');
    for (const item of SCHEMA) {
      const row = document.createElement('div');
      row.className = 'options-row';
      const id = `opt-${item.key}`;

      const label = document.createElement('label');
      label.htmlFor = id;
      label.textContent = item.label;

      const output = document.createElement('span');
      output.className = 'options-value';

      let input;
      if (item.type === 'range') {
        input = document.createElement('input');
        input.type = 'range';
        input.min = item.min;
        input.max = item.max;
        input.step = item.step;
        input.addEventListener('input', () => this.set(item.key, Number(input.value)));
      } else if (item.type === 'select') {
        input = document.createElement('select');
        for (const [value, text] of item.options) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = text;
          input.appendChild(option);
        }
        input.addEventListener('change', () => {
          if (item.key === 'reflections') this.reflectionsPinned = true;
          this.set(item.key, input.value);
        });
      } else {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.addEventListener('change', () => this.set(item.key, input.checked));
      }
      input.id = id;

      row.append(label, input, output);
      rowsEl.appendChild(row);
      this.rows.set(item.key, { item, input, output });
    }

    // AI memory status + reset button.
    const aiRow = document.createElement('div');
    aiRow.className = 'options-row options-row-ai';
    const aiLabel = document.createElement('label');
    aiLabel.textContent = 'AI MEMORY';
    this.aiStatusEl = document.createElement('span');
    this.aiStatusEl.className = 'options-value options-ai-status';
    const aiReset = document.createElement('button');
    aiReset.type = 'button';
    aiReset.className = 'options-mini-btn';
    aiReset.textContent = 'WIPE';
    aiReset.addEventListener('click', () => { onResetAIMemory(); this._syncAIStatus(); });
    aiRow.append(aiLabel, this.aiStatusEl, aiReset);
    rowsEl.appendChild(aiRow);

    overlay.querySelector('#btn-options-close').addEventListener('click', () => this.close());
    overlay.querySelector('#btn-options-defaults').addEventListener('click', () => this.resetToDefaults());
  }

  _buildFpsCounter() {
    const el = document.createElement('div');
    el.id = 'fps-counter';
    el.className = 'hidden';
    el.textContent = '-- FPS';
    document.body.appendChild(el);
    this.fpsEl = el;
    this.subscribe((key) => { if (key === 'showFps') this._syncFps(); });
  }

  _addMenuButtons() {
    // Pause menu: directly under RESUME.
    const resume = document.getElementById('btn-resume');
    if (resume?.parentElement) {
      const button = document.createElement('button');
      button.id = 'btn-options';
      button.className = 'tactical-btn';
      button.innerHTML = '<span class="btn-arrow">&#9658;</span><span class="btn-text">OPTIONS</span>';
      button.addEventListener('click', () => this.open());
      resume.insertAdjacentElement('afterend', button);
    }

    // Main menu: just before PERSONNEL & ASSETS.
    const credits = document.getElementById('nav-credits');
    if (credits?.parentElement) {
      const button = document.createElement('button');
      button.id = 'nav-options';
      button.className = 'game-menu-btn';
      button.innerHTML = '<span class="menu-arrow">\u25ba</span><span class="menu-label">OPTIONS</span>'
        + '<span class="menu-shortcut">[SETTINGS]</span>';
      button.addEventListener('click', () => this.open());
      credits.insertAdjacentElement('beforebegin', button);
    }
  }

  _syncRow(key) {
    const row = this.rows.get(key);
    if (!row) return;
    const value = this.values[key];
    if (row.item.type === 'toggle') {
      row.input.checked = value;
      row.output.textContent = value ? 'ON' : 'OFF';
    } else if (row.item.type === 'range') {
      row.input.value = value;
      row.output.textContent = row.item.format(value);
    } else {
      row.input.value = value;
      row.output.textContent = '';
    }
  }

  _syncFps() {
    if (this.fpsEl) this.fpsEl.classList.toggle('hidden', !this.values.showFps);
  }

  _syncAIStatus() {
    if (!this.aiStatusEl) return;
    const attempts = this.getAIAttempts();
    this.aiStatusEl.textContent = attempts === 0
      ? 'NO DATA'
      : `${attempts} ATTEMPT${attempts === 1 ? '' : 'S'} STUDIED`;
  }

  _injectStyles() {
    if (document.getElementById('settings-style')) return;
    const style = document.createElement('style');
    style.id = 'settings-style';
    style.textContent = `
      #options-menu { z-index: 60; }
      .options-panel { width: min(580px, 92vw); max-height: 90vh; overflow-y: auto; }
      .options-rows { display: flex; flex-direction: column; gap: 10px; margin: 6px 0 14px; padding: 0 4px; }
      .options-row {
        display: grid; grid-template-columns: 1.15fr 1fr 64px; align-items: center; gap: 12px;
        font-family: var(--font-mono, monospace); font-size: 0.78rem; letter-spacing: 0.1em; color: #c9efff;
      }
      .options-row label { color: #9fc3d6; }
      .options-row input[type="range"] { width: 100%; accent-color: var(--cyan-primary, #00e5ff); }
      .options-row input[type="checkbox"] { width: 20px; height: 20px; accent-color: var(--cyan-primary, #00e5ff); }
      .options-row select {
        background: rgba(4, 10, 16, 0.95); color: #c9efff; border: 1px solid var(--panel-border, #1c3a4d);
        padding: 5px 6px; font-family: inherit; font-size: 0.74rem; letter-spacing: 0.08em;
      }
      .options-value { text-align: right; color: var(--cyan-primary, #00e5ff); white-space: nowrap; }
      .options-row-ai { grid-template-columns: 1.15fr 1fr 64px; }
      .options-ai-status { text-align: left; }
      .options-mini-btn {
        background: transparent; color: #ff8c7a; border: 1px solid #ff5a44; cursor: pointer;
        font-family: inherit; font-size: 0.72rem; letter-spacing: 0.1em; padding: 4px 6px;
      }
      .options-mini-btn:hover { background: rgba(255, 90, 68, 0.15); }
      #fps-counter {
        position: fixed; top: 8px; right: 12px; z-index: 70; pointer-events: none;
        font-family: var(--font-mono, monospace); font-size: 0.8rem; letter-spacing: 0.1em;
        color: #7dffb2; text-shadow: 0 0 6px rgba(0, 0, 0, 0.9);
      }`;
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------- persistence

  _save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values)); }
    catch (_) { /* storage unavailable: settings last for this session only */ }
  }

  _load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return;
      for (const item of SCHEMA) {
        const value = coerce(item, saved[item.key]);
        if (value !== undefined) this.values[item.key] = value;
      }
    } catch (_) { /* corrupt storage: fall back to defaults */ }
  }
}

export const settings = new Settings();