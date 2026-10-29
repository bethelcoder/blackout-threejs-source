// Adjust only the 3D drawing buffer; HTML menus and HUD stay sharp.
export class RenderQuality {
  constructor(renderer) {
    this.renderer = renderer;
    this.scale = 1;
    this.elapsed = 0;
    this.frames = 0;
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
