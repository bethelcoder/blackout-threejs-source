// ADAPTIVE AI - "the substation remembers you".
//
// While the player moves, the room is divided into a grid of 1.5 m cells and the game records which cells
// the player actually spends time in. When a run ends (caught, level cleared, restart, menu) the visited
// cells are merged into a per-level memory that is saved in localStorage, so it survives retries,
// restarts and page reloads. Older runs fade (DECAY), so the AI tracks your CURRENT habits.
//
// The memory is then used against the player:
//   * habit(cell) = how consistently you have used this cell in past runs, 0..1
//   * security-camera exposure builds up to 50% faster in cells you habitually use, so repeating the
//     same route gets you spotted sooner (see exposureMultiplier(), used in main.js)
//   * the HUD toast tells you when the AI "recognises" a route
//   * the CAUGHT screen draws a heat map: red = routes the AI has learned, cyan = this run
//
// Replay value: to beat the AI you have to vary your route. Turn it off in Options -> Adaptive AI.
const STORAGE_KEY = 'blackout.aiMemory.v1';

const CELL_SIZE = 1.5;          // metres per grid cell
const GRID_OFFSET = 256;        // keeps negative coordinates positive in the numeric key
const GRID_WIDTH = 512;
const MIN_VISIT_SECONDS = 0.4;  // time in a cell before it counts as "visited" in a run
const MIN_RUN_SECONDS = 5;      // runs shorter than this are ignored (instant quits)
const DECAY = 0.8;              // each new run multiplies older memory by this
const FORGET_BELOW = 0.02;      // cells fainter than this are dropped
const EXPOSURE_BONUS = 0.5;     // +50% camera exposure speed at full habit
const SAMPLE_PERIOD = 0.25;     // seconds between path points kept for the heat map
const MAX_PATH_POINTS = 4000;
const NOTICE_HABIT = 0.6;       // habit needed before the AI "comments" on your position
const NOTICE_COOLDOWN = 25;     // seconds between comments
const BRIEFING_DELAY = 3.5;     // seconds into a run before the "prior attempts" message

const NOTICE_MESSAGES = [
  'AI: ROUTE PATTERN RECOGNISED',
  'AI: YOU HAVE BEEN HERE BEFORE',
  'AI: PREDICTING YOUR PATH',
];

function cellKey(x, z) {
  const cx = Math.min(GRID_WIDTH - 1, Math.max(0, Math.floor(x / CELL_SIZE) + GRID_OFFSET));
  const cz = Math.min(GRID_WIDTH - 1, Math.max(0, Math.floor(z / CELL_SIZE) + GRID_OFFSET));
  return cx * GRID_WIDTH + cz;
}

function keyToCell(key) {
  return [Math.floor(key / GRID_WIDTH) - GRID_OFFSET, (key % GRID_WIDTH) - GRID_OFFSET];
}

function habitOf(level, weight) {
  if (!level || level.runWeight <= 0) return 0;
  // One past run is only half-trusted; two or more are fully trusted.
  const confidence = Math.min(1, level.runWeight / 2);
  return Math.min(1, weight / level.runWeight) * confidence;
}

export class AIMemory {
  constructor({ onNotice = () => {} } = {}) {
    this.onNotice = onNotice;
    this.enabled = true;

    this.memory = new Map();     // levelIndex -> { runWeight, runs, cells: Map<key, weight> }
    this.levelIndex = -1;        // -1 = no run in progress
    this.runCells = new Map();   // key -> seconds spent in this run
    this.path = new Float32Array(MAX_PATH_POINTS * 2);
    this.pathCount = 0;
    this.runTime = 0;
    this.sampleClock = 0;
    this.noticeCooldown = 0;
    this.noticeIndex = 0;
    this.briefingIn = -1;
    this.lastKey = -1;
    this.habit = 0;
    this.mapEls = null;

    this._load();
  }

  // ---------------------------------------------------------------- run lifecycle

  beginRun(levelIndex) {
    this.endRun();
    this.levelIndex = levelIndex;
    this.runCells.clear();
    this.pathCount = 0;
    this.runTime = 0;
    this.sampleClock = 0;
    this.noticeCooldown = 5;
    this.lastKey = -1;
    this.habit = 0;
    const level = this.memory.get(levelIndex);
    this.briefingIn = this.enabled && level && level.runs > 0 ? BRIEFING_DELAY : -1;
  }

  /** Merge the run in progress into long-term memory. Safe to call repeatedly. */
  endRun() {
    if (this.levelIndex < 0) return;
    const index = this.levelIndex;
    this.levelIndex = -1;
    if (this.enabled && this.runTime >= MIN_RUN_SECONDS) this._commit(index);
    this.runCells.clear();
    this.pathCount = 0;
    this.runTime = 0;
    this.habit = 0;
  }

  /** Call every frame while the player is actively playing. Allocation-free apart from Map growth. */
  sample(position, delta) {
    if (this.levelIndex < 0 || !this.enabled) { this.habit = 0; return; }

    this.runTime += delta;
    const key = cellKey(position.x, position.z);
    this.runCells.set(key, (this.runCells.get(key) || 0) + delta);

    this.sampleClock += delta;
    if (this.sampleClock >= SAMPLE_PERIOD) {
      this.sampleClock -= SAMPLE_PERIOD;
      if (this.pathCount < MAX_PATH_POINTS) {
        this.path[this.pathCount * 2] = position.x;
        this.path[this.pathCount * 2 + 1] = position.z;
        this.pathCount++;
      }
    }

    const level = this.memory.get(this.levelIndex);
    this.habit = level ? habitOf(level, level.cells.get(key) || 0) : 0;

    this.noticeCooldown = Math.max(0, this.noticeCooldown - delta);
    if (this.briefingIn > 0) {
      this.briefingIn -= delta;
      if (this.briefingIn <= 0 && level) {
        const n = level.runs;
        this.onNotice(`AI MEMORY: ${n} PRIOR ATTEMPT${n === 1 ? '' : 'S'} ANALYSED - VARY YOUR ROUTE`);
      }
    } else if (key !== this.lastKey && this.habit >= NOTICE_HABIT && this.noticeCooldown === 0) {
      this.onNotice(NOTICE_MESSAGES[this.noticeIndex++ % NOTICE_MESSAGES.length]);
      this.noticeCooldown = NOTICE_COOLDOWN;
    }
    this.lastKey = key;
  }

  /** 1.0 normally, up to 1.5 when the player is standing on a habitual route. */
  exposureMultiplier() {
    return 1 + EXPOSURE_BONUS * this.habit;
  }

  // ---------------------------------------------------------------- queries / maintenance

  getRunCount() {
    let total = 0;
    for (const level of this.memory.values()) total += level.runs;
    return total;
  }

  reset() {
    this.memory.clear();
    this.habit = 0;
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* storage unavailable */ }
  }

  // ---------------------------------------------------------------- heat map (CAUGHT screen)

  /**
   * Draws the AI's learned routes (red) and the current run's path (cyan) under `afterEl`.
   * `bounds` is { minX, maxX, minZ, maxZ } of the level, in world metres.
   */
  showLoseMap(afterEl, levelIndex, bounds) {
    if (!afterEl || !bounds) return;
    const els = this._ensureMapElements(afterEl);
    els.wrap.classList.toggle('hidden', !this.enabled);
    if (!this.enabled) return;

    this._draw(els.canvas, levelIndex, bounds);
    const level = this.memory.get(levelIndex);
    const attempts = level ? level.runs : 0;
    els.caption.textContent = attempts > 0
      ? `AI ROUTE MODEL // RED: LEARNED FROM ${attempts} PRIOR ATTEMPT${attempts === 1 ? '' : 'S'} // CYAN: THIS RUN`
      : 'AI ROUTE MODEL // CYAN: THIS RUN - THE AI WILL REMEMBER IT NEXT ATTEMPT';
  }

  _ensureMapElements(afterEl) {
    if (this.mapEls && this.mapEls.wrap.isConnected) return this.mapEls;

    if (!document.getElementById('ai-memory-style')) {
      const style = document.createElement('style');
      style.id = 'ai-memory-style';
      style.textContent = `
        #ai-memory-map { margin: 14px auto 6px; text-align: center; }
        #ai-memory-map canvas {
          display: block; margin: 0 auto; max-width: 100%;
          border: 1px solid rgba(0, 229, 255, 0.35);
          box-shadow: 0 0 18px rgba(0, 229, 255, 0.15);
        }
        #ai-memory-map .ai-memory-caption {
          margin-top: 6px; font-family: var(--font-mono, monospace);
          font-size: 0.68rem; letter-spacing: 0.12em; color: #7fa0b5;
        }`;
      document.head.appendChild(style);
    }

    const wrap = document.createElement('div');
    wrap.id = 'ai-memory-map';
    const canvas = document.createElement('canvas');
    const caption = document.createElement('div');
    caption.className = 'ai-memory-caption';
    wrap.append(canvas, caption);
    afterEl.insertAdjacentElement('afterend', wrap);

    this.mapEls = { wrap, canvas, caption };
    return this.mapEls;
  }

  _draw(canvas, levelIndex, bounds) {
    const spanX = bounds.maxX - bounds.minX;
    const spanZ = bounds.maxZ - bounds.minZ;
    const width = 320;
    const height = Math.round(Math.min(260, Math.max(120, width * spanZ / spanX)));
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    const sx = width / spanX;
    const sz = height / spanZ;

    ctx.fillStyle = '#050b12';
    ctx.fillRect(0, 0, width, height);

    const level = this.memory.get(levelIndex);
    if (level) {
      for (const [key, weight] of level.cells) {
        const [cx, cz] = keyToCell(key);
        const habit = habitOf(level, weight);
        ctx.fillStyle = `rgba(255, 70, 50, ${(0.12 + 0.6 * habit).toFixed(3)})`;
        ctx.fillRect(
          (cx * CELL_SIZE - bounds.minX) * sx,
          (cz * CELL_SIZE - bounds.minZ) * sz,
          CELL_SIZE * sx,
          CELL_SIZE * sz
        );
      }
    }

    if (this.pathCount > 1) {
      ctx.strokeStyle = '#4fd1ff';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < this.pathCount; i++) {
        const x = (this.path[i * 2] - bounds.minX) * sx;
        const y = (this.path[i * 2 + 1] - bounds.minZ) * sz;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  }

  // ---------------------------------------------------------------- persistence

  _commit(index) {
    let level = this.memory.get(index);
    if (!level) {
      level = { runWeight: 0, runs: 0, cells: new Map() };
      this.memory.set(index, level);
    }
    level.runWeight = level.runWeight * DECAY + 1;
    level.runs++;

    for (const [key, weight] of level.cells) {
      const faded = weight * DECAY;
      if (faded < FORGET_BELOW) level.cells.delete(key);
      else level.cells.set(key, faded);
    }
    for (const [key, seconds] of this.runCells) {
      if (seconds >= MIN_VISIT_SECONDS) level.cells.set(key, (level.cells.get(key) || 0) + 1);
    }
    this._save();
  }

  _save() {
    const levels = {};
    for (const [index, level] of this.memory) {
      levels[index] = {
        runWeight: Number(level.runWeight.toFixed(4)),
        runs: level.runs,
        cells: [...level.cells].map(([key, weight]) => [key, Number(weight.toFixed(3))]),
      };
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, levels })); }
    catch (_) { /* storage unavailable or full: memory simply lasts for this session */ }
  }

  _load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!data || data.v !== 1 || typeof data.levels !== 'object') return;
      for (const [index, saved] of Object.entries(data.levels)) {
        if (!Number.isFinite(saved.runWeight) || !Number.isFinite(saved.runs) || !Array.isArray(saved.cells)) continue;
        const cells = new Map();
        for (const entry of saved.cells) {
          if (Array.isArray(entry) && Number.isFinite(entry[0]) && Number.isFinite(entry[1])) cells.set(entry[0], entry[1]);
        }
        this.memory.set(Number(index), { runWeight: saved.runWeight, runs: saved.runs, cells });
      }
    } catch (_) { /* missing or corrupt storage: start with an empty memory */ }
  }
}