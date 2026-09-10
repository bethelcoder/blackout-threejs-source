import * as THREE from 'three';
import { buildRoom, buildProp } from './roomBuilder.js';
import { createElectricCorruptionMaterial } from '../shaders/electricCorruption.js';
import { createSparkParticles } from '../systems/particles.js';

// Level 3 purpose: the most complex puzzle — isolate the AI without cutting
// the infrastructure it's currently holding stable. New challenge type
// (boss/set-piece feel) versus the exploration/terminal levels before it.
export function buildLevel3({ scene, aiState, hud, onEnding }) {
  const colliders = [];
  const cleanup = [];

  const { group: room, colliders: wallColliders } = buildRoom({
    width: 10, depth: 10, height: 5, wallColor: 0x4a2e2e, floorColor: 0x3d2525,
  });
  scene.add(room);
  colliders.push(...wallColliders);

  const hemiLight = new THREE.HemisphereLight(0xffdddd, 0x553333, 1.4);
  scene.add(hemiLight);
  cleanup.push(() => scene.remove(hemiLight));

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  cleanup.push(() => scene.remove(ambient));

  const coreLight = new THREE.PointLight(0xff3b3b, 14, 22, 1.0);
  coreLight.position.set(0, 3.2, 0);
  scene.add(coreLight);
  cleanup.push(() => scene.remove(coreLight));

  // Corrupted wall panel using the custom shader
  const corruptionMat = createElectricCorruptionMaterial();
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), corruptionMat);
  panel.position.set(0, 2, -4.85);
  scene.add(panel);
  cleanup.push(() => scene.remove(panel));

  const sparks = createSparkParticles({ origin: [0, 2, -4.5], color: 0xff5f4f, count: 90 });
  scene.add(sparks);
  cleanup.push(() => scene.remove(sparks));

  // Three isolation switches — must be triggered in the correct sequence
  const sequence = ['A', 'B', 'C'];
  let progress = 0;
  let finished = false;
  const switches = {};

  const positions = { A: [-3, 0, -3], B: [0, 0, -3], C: [3, 0, -3] };
  for (const key of sequence) {
    const sw = buildProp({ width: 0.4, height: 1.1, depth: 0.3, color: 0x333333, position: positions[key] });
    sw.mesh.position.y = 1.0;
    sw.mesh.userData.interactable = true;
    sw.mesh.userData.label = `Isolation switch ${key}`;
    sw.mesh.userData.onInteract = () => {
      if (finished) return;
      if (sequence[progress] === key) {
        progress++;
        sw.mesh.material.emissive = new THREE.Color(0x2bff6f);
        sw.mesh.material.emissiveIntensity = 1;
        hud.setObjective(`Isolation sequence: ${progress}/${sequence.length} switches thrown.`);
        if (progress === sequence.length) {
          finished = true;
          hud.setObjective('AI isolated. Grid restored. Escaping...');
          hud.markLevelComplete();
          onEnding();
        }
      } else {
        // Wrong order — reset and raise suspicion
        progress = 0;
        for (const s of Object.values(switches)) {
          s.mesh.material.emissive = new THREE.Color(0x000000);
          s.mesh.material.emissiveIntensity = 0;
        }
        aiState.raise(25);
        hud.setObjective('Incorrect sequence. The order reset — check the maintenance schedule for the correct order.');
      }
    };
    scene.add(sw.mesh);
    colliders.push(sw.box);
    cleanup.push(() => scene.remove(sw.mesh));
    switches[key] = sw;
  }

  // Maintenance schedule prop gives the sequence hint (A, B, C)
  const hint = buildProp({ width: 0.4, height: 0.02, depth: 0.3, color: 0xe8d9a0, position: [4, 0, 4] });
  hint.mesh.position.y = 1.0;
  hint.mesh.userData.interactable = true;
  hint.mesh.userData.label = 'Read maintenance schedule';
  hint.mesh.userData.onInteract = () => {
    hud.setObjective('Schedule found: isolate switches in order A, then B, then C.');
  };
  scene.add(hint.mesh);
  cleanup.push(() => scene.remove(hint.mesh));

  function update(delta) {
    corruptionMat.uniforms.uTime.value += delta;
    corruptionMat.uniforms.uIntensity.value = THREE.MathUtils.lerp(
      corruptionMat.uniforms.uIntensity.value,
      0.25 + aiState.suspicion / 130,
      0.05
    );
    sparks.userData.update(delta);
    aiState.decay(2 * delta);
  }

  return {
    colliders,
    update,
    dispose: () => cleanup.forEach(fn => fn()),
    spawn: new THREE.Vector3(0, 1.7, 4),
    title: 'LEVEL 3 — THE CORE',
    subtitle: 'Isolate the AI without losing the restored grid.',
    objective: 'Find the correct isolation sequence.',
  };
}
