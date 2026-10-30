export class SecurityRun {
  constructor({ onChange = () => {}, onStrike = () => {}, onLose = () => {} } = {}) {
    Object.assign(this, { onChange, onStrike, onLose });
    this.reset();
  }

  reset() {
    this.strikes = 0;
    this.exposure = 0;
    this.grace = 0;
    this.lost = false;
    this.notify();
  }

  notify() { this.onChange(this); }

  update(delta) {
    this.grace = Math.max(0, this.grace - delta);
  }

  cameraExposure(delta, visible) {
    if (this.lost) return;
    this.exposure = visible && this.grace === 0 ? this.exposure + delta : 0;
    if (this.exposure >= 3 - 1e-9) this.strike('camera');
    else this.notify();
  }

  strike(source) {
    if (this.lost || (this.grace > 0 && !source.endsWith('-pin'))) return false;
    this.strikes++;
    this.exposure = 0;
    this.grace = 3;
    this.lost = this.strikes >= 3;
    this.notify();
    if (this.lost) this.onLose(source);
    else this.onStrike(source);
    return true;
  }
}
