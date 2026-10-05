import { sound } from './audio.js';

// Security escalation ladder straight from the story brief (section 4):
// CALM -> SUSPICIOUS -> ALERT -> HUNTING -> LOCKDOWN
const STATES = ['CALM', 'SUSPICIOUS', 'ALERT', 'HUNTING', 'LOCKDOWN'];

export class AIState {
  constructor(onChange) {
    this.index = 0;
    this.onChange = onChange || (() => {});
    this.suspicion = 0; // 0-100, drives escalation
    this._notify();
  }

  get state() { return STATES[this.index]; }

  /** Raise suspicion (e.g. spotted by a camera, tripped an alarm). */
  raise(amount) {
    this.suspicion = Math.min(100, this.suspicion + amount);
    sound.updateAIState(this.suspicion);
    const targetIndex = Math.min(STATES.length - 1, Math.floor(this.suspicion / (100 / STATES.length)));
    if (targetIndex !== this.index) {
      this.index = targetIndex;
      this._notify();
    }
  }

  /** Suspicion naturally decays when the player is out of sight/quiet. */
  decay(amount) {
    if (this.suspicion === 0) return;
    this.suspicion = Math.max(0, this.suspicion - amount);
    sound.updateAIState(this.suspicion);
    const targetIndex = Math.min(STATES.length - 1, Math.floor(this.suspicion / (100 / STATES.length)));
    if (targetIndex !== this.index) {
      this.index = targetIndex;
      this._notify();
    }
  }

  reset() {
    this.suspicion = 0;
    this.index = 0;
    sound.updateAIState(0);
    this._notify();
  }

  _notify() {
    this.onChange(this.state);
  }
}
