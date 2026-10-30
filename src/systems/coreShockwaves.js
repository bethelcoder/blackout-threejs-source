import * as THREE from 'three';
import { createShockwaveFloorMaterial, MAX_WAVES } from '../shaders/shockwaveFloor.js';

const PHASES = [
  // Speed * interval also decreases, so the rings get closer in world space
  // even though each isolated feeder makes them travel faster.
  { interval: 20, speed: 0.6, gap: 1.6 },
  { interval: 11.5, speed: 1.0, gap: 1.5 },
  { interval: 7.5, speed: 1.45, gap: 1.3 },
  { interval: 5, speed: 2.1, gap: 1.1 },
];

export function createCoreShockwaves({ onHit, onCharge, onFire, random = Math.random } = {}) {
  const material = createShockwaveFloorMaterial();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), material);
  mesh.name = 'Core shockwave floor';
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.035;
  mesh.renderOrder = 1;
  const waves = Array.from({ length: MAX_WAVES }, () => ({ active: false, radius: 0, gap: 0, hit: false }));
  let time = 0, nextIn = 0.9, cooldown = 0, sounded = false;
  function spawn() {
    const wave = waves.find(w => !w.active);
    if (!wave) return;
    Object.assign(wave, { active: true, radius: 1.7, gap: (random() * 2 - 1) * Math.PI, hit: false });
    onFire?.();
  }
  return {
    mesh,
    get charge() { return material.uniforms.uCharge.value; },
    update(delta, camera, phaseIndex = 0, finished = false, enabled = true) {
      const u = material.uniforms;
      if (finished || !enabled) {
        waves.forEach(w => { w.active = false; });
        u.uRadius.value.fill(-10);
        u.uCharge.value = 0;
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      time += delta;
      cooldown = Math.max(0, cooldown - delta);
      const phase = PHASES[THREE.MathUtils.clamp(phaseIndex, 0, 3)];
      nextIn -= delta;
      const charge = nextIn < 0.9 ? 1 - Math.max(0, nextIn) / 0.9 : 0;
      if (charge > 0 && !sounded) { sounded = true; onCharge?.(); }
      if (nextIn <= 0) {
        spawn();
        nextIn = phase.interval;
        sounded = false;
      }
      const distance = Math.hypot(camera.position.x, camera.position.z);
      const bearing = Math.atan2(camera.position.z, camera.position.x);
      const feet = camera.position.y - (camera.userData.playerHeight ?? 1.7);
      waves.forEach((wave, i) => {
        if (wave.active) {
          const previous = wave.radius;
          wave.radius += phase.speed * delta;
          const angle = Math.abs(Math.atan2(Math.sin(bearing - wave.gap), Math.cos(bearing - wave.gap)));
          // Sweep the ring's thickness to avoid skipping hits on slower frames.
          if (!wave.hit && cooldown === 0 && feet < 0.35
            && distance >= previous - 0.35 && distance <= wave.radius + 0.35
            && angle > phase.gap / 2) {
            wave.hit = true;
            cooldown = 3;
            onHit?.();
          }
          if (wave.radius > 10.2) wave.active = false;
        }
        u.uRadius.value[i] = wave.active ? wave.radius : -10;
        u.uGapAngle.value[i] = wave.gap;
      });
      u.uTime.value = time;
      u.uGapWidth.value = phase.gap;
      u.uCharge.value = charge;
    },
    // The level owns the mesh and releases its resources through disposeTree.
  };
}
