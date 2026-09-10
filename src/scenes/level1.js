import * as THREE from 'three';
import { buildRoom, buildProp, buildHazardStrip, buildBreakerCabinet } from './roomBuilder.js';
import { createSparkParticles } from '../systems/particles.js';
import { sound } from '../systems/audio.js';

/**
 * LEVEL 1 — INFILTRATION
 * Environment: Maintenance / Electrical Section
 * Objective: Explore maintenance area, avoid security camera, find code, unlock blast door.
 */
export function buildLevel1({ scene, aiState, hud }) {
  const colliders = [];
  const cleanup = [];

  const { group: room, colliders: wallColliders } = buildRoom({ width: 14, depth: 20, height: 4 });
  scene.add(room);
  colliders.push(...wallColliders);

  // Bright facility lighting
  const hemiLight = new THREE.HemisphereLight(0xe8f4ff, 0x6a7b8c, 1.6);
  scene.add(hemiLight);
  cleanup.push(() => scene.remove(hemiLight));

  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambient);
  cleanup.push(() => scene.remove(ambient));

  const dirLight = new THREE.DirectionalLight(0xdff0ff, 1.2);
  dirLight.position.set(2, 4, 3);
  scene.add(dirLight);
  cleanup.push(() => scene.remove(dirLight));

  // Overhead fluorescent tube fixtures along the corridor
  const lightPositions = [
    [0, 3.8, 6],   // Spawn area
    [0, 3.8, 0],   // Mid room
    [0, 3.8, -7],  // Security / door area
  ];

  const lightPanelGeo = new THREE.BoxGeometry(2.0, 0.08, 0.5);
  const lightPanelMat = new THREE.MeshBasicMaterial({ color: 0xebf8ff });

  for (const pos of lightPositions) {
    const fixture = new THREE.Mesh(lightPanelGeo, lightPanelMat);
    fixture.position.set(pos[0], pos[1], pos[2]);
    scene.add(fixture);
    cleanup.push(() => scene.remove(fixture));

    const pLight = new THREE.PointLight(0x6be0ff, 16, 22, 1.0);
    pLight.position.set(pos[0], pos[1] - 0.2, pos[2]);
    scene.add(pLight);
    cleanup.push(() => scene.remove(pLight));
  }

  // Electrical breaker cabinets against the wall
  const cabinet = buildBreakerCabinet({ position: [-5.8, 0, -2] });
  scene.add(cabinet.group);
  colliders.push(cabinet.box);
  cleanup.push(() => scene.remove(cabinet.group));

  // Clutter props / crates
  const crate1 = buildProp({ width: 1.2, height: 1.2, depth: 1.2, color: 0x4a5868, position: [-3.5, 0, -3] });
  const crate2 = buildProp({ width: 1.6, height: 0.9, depth: 1.2, color: 0x5a6a7c, position: [3.5, 0, 2] });
  const crate3 = buildProp({ width: 1.0, height: 0.8, depth: 1.0, color: 0x4a5868, position: [4.0, 0, -5] });
  scene.add(crate1.mesh, crate2.mesh, crate3.mesh);
  colliders.push(crate1.box, crate2.box, crate3.box);
  cleanup.push(() => scene.remove(crate1.mesh, crate2.mesh, crate3.mesh));

  // Sparking exposed conduit
  const sparks = createSparkParticles({ origin: [4.5, 1.5, -8], color: 0x4fd1ff });
  scene.add(sparks);
  cleanup.push(() => scene.remove(sparks));

  // Technician's note prop: contains access code X451
  const noteDesk = buildProp({ width: 1.2, height: 0.9, depth: 0.6, color: 0x3d4855, position: [-5, 0, -6] });
  scene.add(noteDesk.mesh);
  colliders.push(noteDesk.box);
  cleanup.push(() => scene.remove(noteDesk.mesh));

  const noteProp = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.02, 0.25),
    new THREE.MeshStandardMaterial({ color: 0xe8d9a0, roughness: 0.4 })
  );
  noteProp.position.set(-5, 0.92, -6);
  noteProp.userData.interactable = true;
  noteProp.userData.label = 'Read technician note';
  noteProp.userData.onInteract = () => {
    sound.playInteract();
    hud.setObjective('Note found: access panel code is X451. Head to the door keypad.');
  };
  scene.add(noteProp);
  cleanup.push(() => scene.remove(noteProp));

  // Security camera (with PiP camera view reference)
  const camHead = new THREE.Group();
  camHead.position.set(0, 3.4, -9.6);
  const camBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.35, 12),
    new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7, roughness: 0.3 })
  );
  camBody.rotation.z = Math.PI / 2;
  const camLens = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xff2b2b, emissive: 0xff2b2b, emissiveIntensity: 2.0 })
  );
  camLens.position.x = 0.2;
  camHead.add(camBody, camLens);
  scene.add(camHead);
  cleanup.push(() => scene.remove(camHead));

  // Secondary CCTV camera instance for Picture-in-Picture viewing
  const cctvCamera = new THREE.PerspectiveCamera(65, 16 / 9, 0.1, 50);
  cctvCamera.position.copy(camHead.position);

  const camCone = new THREE.SpotLight(0xff4433, 4, 12, THREE.MathUtils.degToRad(24), 0.4);
  camCone.position.copy(camHead.position);
  const camTarget = new THREE.Object3D();
  scene.add(camTarget);
  camCone.target = camTarget;
  scene.add(camCone);
  cleanup.push(() => scene.remove(camCone, camTarget));

  // Hazard stripe in front of exit door
  const hazardStrip = buildHazardStrip({ width: 3.0, depth: 0.8, position: [0, 0.01, -9.0] });
  scene.add(hazardStrip);
  cleanup.push(() => scene.remove(hazardStrip));

  // Keypad terminal prop
  let unlocked = false;
  const keypad = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.35, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x2b343d, metalness: 0.6, roughness: 0.3 })
  );
  keypad.position.set(2.0, 1.4, -9.85);
  keypad.userData.interactable = true;
  keypad.userData.label = 'Enter access code';
  keypad.userData.onInteract = () => {
    if (unlocked) return;
    unlocked = true;
    sound.playKeypadBeep();
    setTimeout(() => sound.playAccessGranted(), 200);

    keypad.material.emissive = new THREE.Color(0x2bff6f);
    keypad.material.emissiveIntensity = 1.5;
    doorMesh.visible = false;
    doorCollider.min.set(1000, 1000, 1000);
    doorCollider.max.set(1001, 1001, 1001);
    hud.setObjective('Access granted. Proceed through the blast door to the control room.');
    hud.markLevelComplete();
  };
  scene.add(keypad);
  cleanup.push(() => scene.remove(keypad));

  // Blast door blocking exit
  const doorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 3.2, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x485868, metalness: 0.6, roughness: 0.35 })
  );
  doorMesh.position.set(0, 1.6, -9.88);
  scene.add(doorMesh);
  const doorCollider = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0, 1.6, -9.88), new THREE.Vector3(2.4, 3.2, 0.2)
  );
  colliders.push(doorCollider);
  cleanup.push(() => scene.remove(doorMesh));

  let t = 0;
  let warnTimer = 0;

  function update(delta, camera) {
    t += delta;
    camHead.rotation.y = Math.sin(t * 0.7) * Math.PI * 0.42;
    const dir = new THREE.Vector3(Math.sin(camHead.rotation.y), -0.2, -Math.cos(camHead.rotation.y)).normalize();
    camTarget.position.copy(camHead.position).add(dir.clone().multiplyScalar(6));
    camCone.target.updateMatrixWorld();

    cctvCamera.lookAt(camTarget.position);

    sparks.userData.update(delta);

    // Line-of-sight cone check for AI camera detection
    const toPlayer = new THREE.Vector3().subVectors(camera.position, camHead.position);
    const dist = toPlayer.length();
    toPlayer.normalize();

    const facing = new THREE.Vector3(Math.sin(camHead.rotation.y), 0, -Math.cos(camHead.rotation.y));
    const angle = toPlayer.angleTo(facing);

    if (angle < THREE.MathUtils.degToRad(24) && dist < 12) {
      aiState.raise(24 * delta);
      warnTimer += delta;
      if (warnTimer > 0.35) {
        sound.playDetectionWarning(aiState.suspicion / 100);
        warnTimer = 0;
      }
    } else {
      aiState.decay(8 * delta);
    }
  }

  return {
    colliders,
    cctvCamera,
    update,
    dispose: () => cleanup.forEach(fn => fn()),
    spawn: new THREE.Vector3(0, 1.7, 7.5),
    title: 'LEVEL 1 — INFILTRATION',
    subtitle: 'Find a way past the perimeter security.',
    objective: 'Explore the maintenance area for access credentials.',
  };
}
