import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCoreShockwaves } from '../src/systems/coreShockwaves.js';

function run({ gap = false, jumping = false, phase = 0 } = {}) {
  let hits = 0, warnings = 0, pulses = 0;
  const waves = createCoreShockwaves({ random: () => 0.5,
    onHit: () => hits++, onCharge: () => warnings++, onFire: () => pulses++ });
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(gap ? 5.5 : -5.5, jumping ? 2.2 : 1.7, 0);
  for (let i = 0; i < 1200; i++) waves.update(1 / 60, camera, phase, false, false);
  assert.equal(pulses, 0, 'No waves before the UV answer');
  assert.equal(waves.mesh.visible, false);
  for (let i = 0; i < 30; i++) waves.update(1 / 60, camera, phase);
  assert.equal(pulses, 0, 'Charge warning before the first wave');
  const speed = [0.6, 1.0, 1.45, 2.1][phase];
  const endTime = 0.9 + 3.8 / speed + 0.15;
  for (let i = 0; i < Math.ceil((endTime - 0.5) * 60); i++) waves.update(1 / 60, camera, phase);
  assert.ok(warnings > 0, 'Audible charge warning');
  assert.equal(hits, gap || jumping ? 0 : 1, 'Safe gap, jump and one strike per wave');
  assert.ok(pulses >= 1, 'Waves continue while the first ring travels');
  const before = waves.mesh.material.uniforms.uTime.value;
  waves.update(0, camera, phase);
  assert.equal(waves.mesh.material.uniforms.uTime.value, before, 'Zero delta freezes simulation');
  waves.update(1 / 60, camera, phase, true);
  assert.equal(waves.charge, 0);
  assert.equal(waves.mesh.visible, false);
  assert.ok(waves.mesh.material.uniforms.uRadius.value.every(r => r === -10));
  waves.mesh.geometry.dispose(); waves.mesh.material.dispose();
}
run(); run({ gap: true }); run({ jumping: true }); run({ phase: 1 }); run({ phase: 2 }); run({ phase: 3 });
const camera = new THREE.PerspectiveCamera(); camera.position.set(0, 3, 5);
const spacings = [];
for (let phase = 0; phase < 4; phase++) {
  let elapsed = 0; const fired = [];
  const waves = createCoreShockwaves({ onFire: () => fired.push(elapsed) });
  while (fired.length < 2 && elapsed < 30) {
    elapsed += 1 / 120; waves.update(1 / 120, camera, phase);
    assert.ok(waves.mesh.material.uniforms.uRadius.value.filter(r => r >= 0).length <= 1, 'Each ring clears the room before another appears');
  }
  assert.equal(fired.length, 2);
  const interval = fired[1] - fired[0];
  assert.ok(Math.abs(interval - [20, 11.5, 7.5, 5][phase]) < 0.02);
  spacings.push(interval * [0.6, 1.0, 1.45, 2.1][phase]);
  waves.mesh.geometry.dispose(); waves.mesh.material.dispose();
}
assert.ok(spacings.every((spacing, i) => !i || spacing < spacings[i - 1]), 'Physical spacing decreases after each feeder');
console.log('Shockwave timing, shrinking spacing, hits, safe gaps, jumps and shutdown checks passed');
