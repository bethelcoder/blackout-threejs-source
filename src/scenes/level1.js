import * as THREE from 'three';
import { buildRoom, buildProp } from './roomBuilder.js';
import { createSparkParticles } from '../systems/particles.js';

// Level 1 purpose (per story brief): introduce movement, interaction,
// environmental puzzles and the AI threat. This level's own thing: the
// security-camera detection mechanic that later levels build on.
export function buildLevel1({ scene, aiState, hud }) {
  const colliders = [];
  const cleanup = [];

  const { group: room, colliders: wallColliders } = buildRoom({ width: 14, depth: 18, height: 4 });
  scene.add(room);
  colliders.push(...wallColliders);

  // Bright, clean facility lighting
  const hemiLight = new THREE.HemisphereLight(0xe8f4ff, 0x6a7b8c, 1.6);
  scene.add(hemiLight);
  cleanup.push(() => scene.remove(hemiLight));

  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambient);
  cleanup.push(() => scene.remove(ambient));

  // Soft directional downlight for depth
  const dirLight = new THREE.DirectionalLight(0xdff0ff, 1.2);
  dirLight.position.set(2, 4, 3);
  scene.add(dirLight);
  cleanup.push(() => scene.remove(dirLight));

  // Overhead fluorescent tube fixtures along the corridor
  const lightPositions = [
    [0, 3.8, 5],   // Spawn area
    [0, 3.8, 0],   // Mid room
    [0, 3.8, -6],  // Security / door area
  ];

  const lightPanelGeo = new THREE.BoxGeometry(2.0, 0.08, 0.5);
  const lightPanelMat = new THREE.MeshBasicMaterial({ color: 0xebf8ff });

  for (const pos of lightPositions) {
    // Glowing fixture mesh on ceiling
    const fixture = new THREE.Mesh(lightPanelGeo, lightPanelMat);
    fixture.position.set(pos[0], pos[1], pos[2]);
    scene.add(fixture);
    cleanup.push(() => scene.remove(fixture));

    // Point light under the fixture
    const pLight = new THREE.PointLight(0x6be0ff, 16, 22, 1.0);
    pLight.position.set(pos[0], pos[1] - 0.2, pos[2]);
    scene.add(pLight);
    cleanup.push(() => scene.remove(pLight));
  }

  // Clutter props
  const crate1 = buildProp({ width: 1, height: 1, depth: 1, position: [-3, 0, -2] });
  const crate2 = buildProp({ width: 1.4, height: 0.8, depth: 1, position: [3, 0, 2] });
  scene.add(crate1.mesh, crate2.mesh);
  colliders.push(crate1.box, crate2.box);
  cleanup.push(() => scene.remove(crate1.mesh, crate2.mesh));

  // Sparking exposed conduit — electrical effects (rubric: 3D Effects / Innovation)
  const sparks = createSparkParticles({ origin: [4.5, 1.5, -7], color: 0x4fd1ff });
  scene.add(sparks);
  cleanup.push(() => scene.remove(sparks));

  // Technician's note prop: gives the access code (X451, matches terminal AUTH command)
  const noteProp = buildProp({ width: 0.4, height: 0.02, depth: 0.3, color: 0xe8d9a0, position: [-5, 1.0, -7.5] });
  noteProp.mesh.position.y = 1.0;
  noteProp.mesh.userData.interactable = true;
  noteProp.mesh.userData.label = 'Read technician note';
  noteProp.mesh.userData.onInteract = () => {
    hud.setObjective('Note found: access panel code is X451. Head to the keypad.');
  };
  scene.add(noteProp.mesh);
  cleanup.push(() => scene.remove(noteProp.mesh));

  // Security camera — rotates, raises AI suspicion if the player stands in its cone
  const camHead = new THREE.Group();
  camHead.position.set(0, 3.3, -8.7);
  const camBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.3, 12),
    new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.4 })
  );
  camBody.rotation.z = Math.PI / 2;
  const camLens = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xff2b2b, emissive: 0xff2b2b, emissiveIntensity: 1.5 })
  );
  camLens.position.x = 0.2;
  camHead.add(camBody, camLens);
  scene.add(camHead);
  cleanup.push(() => scene.remove(camHead));

  const camCone = new THREE.SpotLight(0xff5f4f, 3, 9, THREE.MathUtils.degToRad(22), 0.4);
  camCone.position.copy(camHead.position);
  const camTarget = new THREE.Object3D();
  scene.add(camTarget);
  camCone.target = camTarget;
  scene.add(camCone);
  cleanup.push(() => scene.remove(camCone, camTarget));

  // Keypad — solved by interacting after reading the note
  let unlocked = false;
  const keypad = buildProp({ width: 0.3, height: 0.3, depth: 0.05, color: 0x333a42, position: [4.8, 0, -8.85] });
  keypad.mesh.position.y = 1.3;
  keypad.mesh.userData.interactable = true;
  keypad.mesh.userData.label = 'Enter access code';
  keypad.mesh.userData.onInteract = () => {
    if (unlocked) return;
    unlocked = true;
    keypad.mesh.material.emissive = new THREE.Color(0x2bff6f);
    keypad.mesh.material.emissiveIntensity = 1;
    doorMesh.visible = false;
    // Move the collider far out of the room so it no longer blocks the exit
    doorCollider.min.set(1000, 1000, 1000);
    doorCollider.max.set(1001, 1001, 1001);
    hud.setObjective('Access granted. Proceed to the control room.');
    hud.markLevelComplete();
  };
  scene.add(keypad.mesh);
  cleanup.push(() => scene.remove(keypad.mesh));

  // Door blocking the exit until keypad is solved
  const doorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2, 3, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x3a4652, metalness: 0.5, roughness: 0.4 })
  );
  doorMesh.position.set(0, 1.5, -8.9);
  scene.add(doorMesh);
  const doorCollider = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0, 1.5, -8.9), new THREE.Vector3(2, 3, 0.2)
  );
  colliders.push(doorCollider);
  cleanup.push(() => scene.remove(doorMesh));

  let t = 0;
  function update(delta, camera) {
    t += delta;
    camHead.rotation.y = Math.sin(t * 0.6) * Math.PI * 0.4;
    const dir = new THREE.Vector3(Math.sin(camHead.rotation.y), 0, -Math.cos(camHead.rotation.y));
    camTarget.position.copy(camHead.position).add(dir.multiplyScalar(5));
    camCone.target.updateMatrixWorld();

    sparks.userData.update(delta);

    // Simple line-of-sight cone check for AI detection
    const toPlayer = new THREE.Vector3().subVectors(camera.position, camHead.position).normalize();
    const facing = new THREE.Vector3(Math.sin(camHead.rotation.y), 0, -Math.cos(camHead.rotation.y));
    const angle = toPlayer.angleTo(facing);
    const dist = camera.position.distanceTo(camHead.position);
    if (angle < THREE.MathUtils.degToRad(22) && dist < 9) {
      aiState.raise(18 * delta);
    } else {
      aiState.decay(8 * delta);
    }
  }

  return {
    colliders,
    update,
    dispose: () => cleanup.forEach(fn => fn()),
    spawn: new THREE.Vector3(0, 1.7, 6),
    title: 'LEVEL 1 — INFILTRATION',
    subtitle: 'Find a way past the perimeter security.',
    objective: 'Explore the maintenance area for clues.',
  };
}
