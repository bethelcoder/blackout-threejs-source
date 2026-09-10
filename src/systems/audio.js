/**
 * Procedural Web Audio API sound synthesizer for BLACKOUT.
 * Zero external asset dependencies — guaranteed to work in any browser and LAMP hosting.
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.alarmGain = null;
    this.isMuted = false;
    this.initialized = false;

    // Ambient oscillator references
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.alarmOsc = null;
    this.alarmLfo = null;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      this._startAmbientDrone();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  _startAmbientDrone() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Low sub-bass electrical hum
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'sawtooth';
    this.droneOsc1.frequency.setValueAtTime(55, now); // 55Hz (A1)

    // Filter to keep it deep and atmospheric
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, now);
    filter.Q.setValueAtTime(3.0, now);

    // Subtle chorus-like secondary oscillator
    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'sine';
    this.droneOsc2.frequency.setValueAtTime(110.5, now);

    this.droneOsc1.connect(filter);
    this.droneOsc2.connect(filter);
    filter.connect(this.ambientGain);

    this.droneOsc1.start();
    this.droneOsc2.start();
  }

  /** Modulate ambient audio based on AI security state */
  updateAIState(suspicionLevel) {
    if (!this.ctx || !this.droneOsc1) return;
    const now = this.ctx.currentTime;
    // Pitch shift drone up slightly as tension builds
    const targetFreq = 55 + (suspicionLevel / 100) * 20;
    this.droneOsc1.frequency.setTargetAtTime(targetFreq, now, 0.5);

    // If in HUNTING or LOCKDOWN, pulse emergency siren
    if (suspicionLevel >= 75 && !this.alarmOsc) {
      this._startAlarmSiren();
    } else if (suspicionLevel < 75 && this.alarmOsc) {
      this._stopAlarmSiren();
    }
  }

  _startAlarmSiren() {
    if (!this.ctx || this.alarmOsc) return;
    const now = this.ctx.currentTime;

    this.alarmGain = this.ctx.createGain();
    this.alarmGain.gain.setValueAtTime(0.12, now);
    this.alarmGain.connect(this.masterGain);

    this.alarmOsc = this.ctx.createOscillator();
    this.alarmOsc.type = 'sawtooth';
    this.alarmOsc.frequency.setValueAtTime(600, now);

    // LFO to modulate siren pitch (woop-woop effect)
    this.alarmLfo = this.ctx.createOscillator();
    this.alarmLfo.type = 'sine';
    this.alarmLfo.frequency.setValueAtTime(1.5, now);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(250, now);

    this.alarmLfo.connect(lfoGain);
    lfoGain.connect(this.alarmOsc.frequency);

    this.alarmOsc.connect(this.alarmGain);
    this.alarmLfo.start();
    this.alarmOsc.start();
  }

  _stopAlarmSiren() {
    if (!this.alarmOsc) return;
    try {
      this.alarmOsc.stop();
      this.alarmLfo.stop();
    } catch (_) {}
    this.alarmOsc = null;
    this.alarmLfo = null;
  }

  /** Footstep sound */
  playFootstep(isSprint = false) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isSprint ? 120 : 90, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /** Interaction / pickup sound */
  playInteract() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  /** Keypad key press beep */
  playKeypadBeep() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(950 + Math.random() * 100, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  /** Access granted chime */
  playAccessGranted() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = now + idx * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.22, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.36);
    });
  }

  /** Switch toggle sound */
  playSwitch() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /** Terminal keystroke click */
  playTerminalKey() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200 + Math.random() * 400, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.035);
  }

  /** Terminal command success tone */
  playTerminalSuccess() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(880, now + 0.1);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /** Security camera detection warning pulse */
  playDetectionWarning(intensity = 0.5) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(700 + intensity * 300, now);

    gain.gain.setValueAtTime(0.1 + intensity * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /** Glitch / reboot sound effect */
  playGlitch() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.4);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(3000, now + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }
}

export const sound = new SoundEngine();
