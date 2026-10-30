import * as THREE from 'three';
import { sound } from './audio.js';

// Extra feedback for the Level 3 shockwaves (visual + audio only: the hit test and the strikes are
// still decided by level3.js and securityRun.js).
//
//   * LIGHT  - one PointLight rides the leading edge of the wave nearest to the player, at the player's
//              bearing. It flares red-orange when the wave is dangerous and dims to green over the safe
//              gap, so the metal, walls and floor around you flash as the ring sweeps in.
//   * SHAKE  - a small camera roll that grows as a wave closes in, plus a jolt when a surge fires.
//              It is applied after the frame's movement and removed at the start of the next update,
//              so it never leaks into the player's real aim. Skipped for players who ask their system
//              for reduced motion.
//   * SOUND  - a deep boom when a surge fires, and a boom + electric crackle + glitch when it hits you.
//              Synthesised with Web Audio through the game's master gain (volume + mute still apply).
const PEAK_INTENSITY = 18;       // light intensity at full strength
const LIGHT_DISTANCE = 7;        // metres the light reaches
const LIGHT_HEIGHT = 0.45;
const LIGHT_RANGE = 4;           // light ramps up as the wave gets within this many metres of the player
const SHAKE_RANGE = 3;           // shake ramps up within this many metres
const MAX_ROLL = 0.03;           // radians (about 1.7 degrees) from proximity
const JOLT_ROLL = 0.02;          // extra radians when a surge fires

const DANGER_COLOR = new THREE.Color(0xff4a2a);
const SAFE_COLOR = new THREE.Color(0x2bffb0);

const angleDiff = (a, b) =>
  Math.abs(THREE.MathUtils.euclideanModulo(a - b + Math.PI, Math.PI * 2) - Math.PI);

function boom(strength) {
  const ctx = sound.ctx;
  const out = sound.masterGain;
  if (!ctx || !out || sound.isMuted) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, t0);
  osc.frequency.exponentialRampToValueAtTime(30, t0 + 0.6);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(0.9 * strength, t0 + 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.75);
  osc.connect(env);
  env.connect(out);
  osc.start(t0);
  osc.stop(t0 + 0.8);
}

function crackle(strength) {
  const ctx = sound.ctx;
  const out = sound.masterGain;
  if (!ctx || !out || sound.isMuted) return;
  const t0 = ctx.currentTime;
  const length = Math.floor(ctx.sampleRate * 0.35);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 900;
  const env = ctx.createGain();
  env.gain.value = 0.6 * strength;
  source.connect(filter);
  filter.connect(env);
  env.connect(out);
  source.start(t0);
}

export function createShockwaveFx() {
  // Created once at level build time and never toggled with .visible: changing the number of lights in
  // a scene forces every material to recompile, which would cause a hitch mid-fight.
  const light = new THREE.PointLight(0xff4a2a, 0, LIGHT_DISTANCE, 2);
  light.position.set(0, LIGHT_HEIGHT, 0);

  const reducedMotion = typeof window !== 'undefined'
    && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  let time = 0;
  let jolt = 0;
  let roll = 0;
  let appliedRoll = 0;

  /**
   * waves: [{ active, r, gap }] as kept by level3.js. enabled: false once the fight is over.
   * Call once per frame, after the waves have moved.
   */
  function update(delta, camera, waves, { gapWidth, enabled }) {
    time += delta;
    jolt *= Math.exp(-delta * 4.5);

    const dist = Math.hypot(camera.position.x, camera.position.z);
    const bearing = Math.atan2(camera.position.z, camera.position.x);

    let nearest = null;
    let nearestGap = Infinity;
    if (enabled) {
      for (const wave of waves) {
        if (!wave.active) continue;
        const radial = Math.abs(dist - wave.r);
        if (radial < nearestGap) { nearestGap = radial; nearest = wave; }
      }
    }

    let targetIntensity = 0;
    let proximityShake = 0;
    if (nearest) {
      const inGap = angleDiff(bearing, nearest.gap) < gapWidth / 2;
      const near = 1 - THREE.MathUtils.smoothstep(nearestGap, 0, LIGHT_RANGE);
      targetIntensity = PEAK_INTENSITY * (0.35 + 0.65 * near) * (inGap ? 0.45 : 1);
      light.color.lerp(inGap ? SAFE_COLOR : DANGER_COLOR, 0.25);
      // Sit on the ring, in the direction of the player.
      light.position.set(Math.cos(bearing) * nearest.r, LIGHT_HEIGHT, Math.sin(bearing) * nearest.r);
      const shakeNear = 1 - THREE.MathUtils.smoothstep(nearestGap, 0, SHAKE_RANGE);
      proximityShake = shakeNear * shakeNear * MAX_ROLL;
    }

    const flicker = 0.9 + 0.1 * Math.sin(time * 55);
    light.intensity += (targetIntensity * flicker - light.intensity) * (1 - Math.exp(-delta * 14));

    const amplitude = reducedMotion ? 0 : proximityShake + jolt * JOLT_ROLL;
    roll = amplitude * (0.6 * Math.sin(time * 41) + 0.4 * Math.sin(time * 67 + 1.3));
  }

  /** Tilt the camera by this frame's shake. Pair every call with removeShake() next frame. */
  function applyShake(camera) {
    if (roll === 0) return;
    camera.rotateZ(roll);
    appliedRoll = roll;
  }

  /** Undo the tilt applied last frame. Safe to call any time, including when nothing is applied. */
  function removeShake(camera) {
    if (appliedRoll === 0 || !camera) return;
    camera.rotateZ(-appliedRoll);
    appliedRoll = 0;
  }

  /** A surge has just been released by the core. */
  function fire() {
    jolt = 1;
    boom(0.7);
  }

  /** A shockwave has just struck the player. */
  function hit() {
    jolt = 1.5;
    boom(1);
    crackle(1);
    sound.playGlitch();
  }

  return { light, update, applyShake, removeShake, fire, hit };
}