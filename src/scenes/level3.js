import * as THREE from 'three';
import { buildRoom, buildProp, buildHazardStrip } from './roomBuilder.js';
import { createElectricCorruptionMaterial } from '../shaders/electricCorruption.js';
import { createSparkParticles } from '../systems/particles.js';
import { sound } from '../systems/audio.js';

/**
 * LEVEL 3 — THE CORE
 * Environment: Central Infrastructure / AI Control Chamber
 * Signature Mechanics: Custom GLSL corruption shader + multi-switch isolation puzzle.
 * Narrative climax: Isolate the AI without losing the restored municipal grid.
 */
export function buildLevel3({ scene, aiState, hud, onEnding }) {
  const colliders = [];
  const cleanup = [];

  const { group: room, colliders: wallColliders } = buildRoom({
    width: 14, depth: 14, height: 5.5, wallColor: 0x5a3e3e, floorColor: 0x473232,
  });
  scene.add(room);
  colliders.push(...wallColliders);

  // Core chamber atmospheric lighting
  const hemiLight = new THREE.HemisphereLight(0xffcccc, 0x664444, 1.4);
  scene.add(hemiLight);
  cleanup.push(() => scene.remove(hemiLight));

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  cleanup.push(() => scene.remove(ambient));

  // Central pulsating red AI core light
  const coreLight = new THREE.PointLight(0xff2b2b, 16, 24, 1.0);
  coreLight.position.set(0, 3.2, 0);
  scene.add(coreLight);
  cleanup.push(() => scene.remove(coreLight));

  // Central AI Core Reactor Prop
  const coreGroup = new THREE.Group();
  coreGroup.position.set(0, 2.5, 0);

  // Central energy orb
  const orbMat = new THREE.MeshBasicMaterial({ color: 0xff3b3b });
  const coreOrb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), orbMat);
  coreGroup.add(coreOrb);

  // Rotating energy containment rings
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.2 });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.05, 8, 32), ringMat);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.05, 8, 32), ringMat);
  const ring3 = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.05, 8, 32), ringMat);
  coreGroup.add(ring1, ring2, ring3);

  // Core pedestal base
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.5, 1.2, 16),
    new THREE.MeshStandardMaterial({ color: 0x2c3540, metalness: 0.7, roughness: 0.3 })
  );
  pedestal.position.set(0, 0.6, 0);
  pedestal.castShadow = true;
  scene.add(pedestal);
  colliders.push(new THREE.Box3().setFromObject(pedestal));
  cleanup.push(() => scene.remove(pedestal));

  scene.add(coreGroup);
  cleanup.push(() => scene.remove(coreGroup));

  // Hazard warning perimeter around the AI core
  const hazardCircle = buildHazardStrip({ width: 4.5, depth: 0.6, position: [0, 0.01, 2.4] });
  scene.add(hazardCircle);
  cleanup.push(() => scene.remove(hazardCircle));

  // Corrupted wall panel running custom GLSL shader
  const corruptionMat = createElectricCorruptionMaterial();
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.5), corruptionMat);
  panel.position.set(0, 2.4, -6.85);
  scene.add(panel);
  cleanup.push(() => scene.remove(panel));

  // Sparks discharging around the corrupted conduit
  const sparks = createSparkParticles({ origin: [0, 2.2, -6.5], color: 0xff5f4f, count: 100 });
  scene.add(sparks);
  cleanup.push(() => scene.remove(sparks));

  // Three Isolation Switches (A, B, C)
  const sequence = ['A', 'B', 'C'];
  let progress = 0;
  let finished = false;
  const switches = {};

  const positions = { A: [-4.0, 0, -4.0], B: [0, 0, -4.5], C: [4.0, 0, -4.0] };

  for (const key of sequence) {
    const swDesk = buildProp({ width: 0.5, height: 1.1, depth: 0.4, color: 0x3d4855, position: positions[key] });
    swDesk.mesh.position.y = 1.0;
    swDesk.mesh.userData.interactable = true;
    swDesk.mesh.userData.label = `Pull isolation breaker [${key}]`;

    swDesk.mesh.userData.onInteract = () => {
      if (finished) return;
      sound.playSwitch();

      if (sequence[progress] === key) {
        progress++;
        swDesk.mesh.material.emissive = new THREE.Color(0x2bff6f);
        swDesk.mesh.material.emissiveIntensity = 1.8;
        sound.playAccessGranted();
        hud.setObjective(`Isolation sequence: ${progress}/${sequence.length} breakers locked.`);

        if (progress === sequence.length) {
          finished = true;
          hud.setObjective('AI isolated! Grid stabilized. Initiating facility lockdown override...');
          hud.markLevelComplete();
          setTimeout(() => onEnding(), 1200);
        }
      } else {
        // Wrong sequence order — reset switches and escalate AI suspicion
        progress = 0;
        for (const s of Object.values(switches)) {
          s.mesh.material.emissive = new THREE.Color(0x000000);
          s.mesh.material.emissiveIntensity = 0;
        }
        sound.playDetectionWarning(0.9);
        aiState.raise(30);
        hud.setObjective('INCORRECT SEQUENCE: Breakers reset! Inspect the maintenance schedule for correct shutdown order.');
      }
    };

    scene.add(swDesk.mesh);
    colliders.push(swDesk.box);
    cleanup.push(() => scene.remove(swDesk.mesh));
    switches[key] = swDesk;
  }

  // Maintenance schedule clue clipboard
  const hintDesk = buildProp({ width: 1.0, height: 0.9, depth: 0.5, color: 0x3d4855, position: [5.0, 0, 4.0] });
  scene.add(hintDesk.mesh);
  colliders.push(hintDesk.box);
  cleanup.push(() => scene.remove(hintDesk.mesh));

  const hintProp = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.02, 0.25),
    new THREE.MeshStandardMaterial({ color: 0xe8d9a0, roughness: 0.4 })
  );
  hintProp.position.set(5.0, 0.92, 4.0);
  hintProp.userData.interactable = true;
  hintProp.userData.label = 'Read maintenance schedule';
  hintProp.userData.onInteract = () => {
    sound.playInteract();
    hud.setObjective('Schedule found: safely isolate breakers in alphabetical order — [A] → [B] → [C].');
  };
  scene.add(hintProp);
  cleanup.push(() => scene.remove(hintProp));

  let t = 0;

  function update(delta) {
    t += delta;

    // Rotate core energy containment rings
    ring1.rotation.x = t * 0.8;
    ring1.rotation.y = t * 0.5;
    ring2.rotation.y = t * 0.9;
    ring2.rotation.z = t * 0.6;
    ring3.rotation.z = t * 1.1;
    ring3.rotation.x = t * 0.7;

    // Core light pulse
    coreLight.intensity = 14 + Math.sin(t * 5.0) * 4.0;

    // Update custom shader uniforms
    corruptionMat.uniforms.uTime.value += delta;
    corruptionMat.uniforms.uIntensity.value = THREE.MathUtils.lerp(
      corruptionMat.uniforms.uIntensity.value,
      0.35 + aiState.suspicion / 120,
      0.08
    );

    sparks.userData.update(delta);
    aiState.decay(2 * delta);
  }

  return {
    colliders,
    update,
    dispose: () => cleanup.forEach(fn => fn()),
    spawn: new THREE.Vector3(0, 1.7, 5.5),
    title: 'LEVEL 3 — THE CORE',
    subtitle: 'Isolate the AI without cutting the stabilized municipal grid.',
    objective: 'Locate the maintenance schedule to isolate the core breakers in sequence.',
  };
}
