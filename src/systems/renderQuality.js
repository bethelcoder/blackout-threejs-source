// Adjust only the 3D drawing buffer; HTML menus and HUD stay sharp.
//
// Presets (chosen in the Options menu):
//   auto   - adaptive: drops the render scale when the frame rate sags, raises it again when it recovers
//   high   - fixed at full resolution
//   medium - fixed at 80% of full resolution
//   low    - fixed at 65% of full resolution
const FIXED_SCALES = { high: 1, medium: 0.8, low: 0.65 };

export class RenderQuality {
  constructor(renderer) {
    this.renderer = renderer;
    this.scale = 1;
    this.elapsed = 0;
    this.frames = 0;
    this.preset = 'auto';
    this.fixedScale = null;
  }

  setPreset(name) {
    this.preset = name in FIXED_SCALES ? name : 'auto';
    this.fixedScale = FIXED_SCALES[this.preset] ?? null;
    this.scale = this.fixedScale ?? 1;
    // Nothing to apply until resize() has told us the canvas size.
    if (this.width) this.apply();
    this.reset();
  }

  resize(width, height, deviceRatio) {
    this.width = width;
    this.height = height;
    // Bound both high-DPI supersampling and large-monitor pixel counts.
    this.ceiling = Math.min(deviceRatio || 1, 1.5, Math.sqrt(2400000 / Math.max(1, width * height)));
    this.apply();
    this.reset();
  }

  apply() {
    this.renderer.setPixelRatio(this.ceiling * this.scale);
    this.renderer.setSize(this.width, this.height);
  }

  reset() { this.elapsed = 0; this.frames = 0; }

  update(seconds) {
    // A fixed preset never adapts.
    if (this.fixedScale !== null) return;
    // Ignore tab switches, loading stalls and suspended frames.
    if (seconds <= 0 || seconds > 0.15) { this.reset(); return; }
    this.elapsed += seconds;
    this.frames++;
    if (this.elapsed < 3) return;
    const fps = this.frames / this.elapsed;
    const previous = this.scale;
    if (fps < 45) this.scale = Math.max(0.65, this.scale - 0.1);
    else if (fps > 57) this.scale = Math.min(1, this.scale + 0.05);
    this.reset();
    if (previous !== this.scale) this.apply();
  }
}