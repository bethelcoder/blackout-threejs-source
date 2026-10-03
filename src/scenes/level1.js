import * as THREE from 'three';
import { createClockPuzzle } from '../riddles/clockPuzzle.js';
import { buildRoom, buildProp, buildHazardStrip, buildClockPoster } from './roomBuilder.js';
import { createSparkParticles } from '../systems/particles.js';
import { sound } from '../systems/audio.js';
import { buildMaintenanceWalkway } from './maintenanceWalkway.js';
import { buildElectricalHazard } from './electricalHazard.js';
import { buildMaintenanceVent } from './maintenanceVent.js';

/**
 * LEVEL 1 — INFILTRATION
 * Environment: Maintenance / Electrical Section
 * Objective: Explore maintenance area, avoid security camera, find code, unlock blast door.
 */
export function buildLevel1({ scene, aiState, hud, onShock, onVentEnter, onVentExit }) {
  const colliders = [];
  const cleanup = [];

  // Build the clean substation corridor with gaps
  const { group: room, colliders: wallColliders } = buildRoom({ width: 14, depth: 20, height: 6.8 });
  scene.add(room);
  colliders.push(...wallColliders);
  const walkway = buildMaintenanceWalkway();
  scene.add(walkway.group);
  colliders.push(...walkway.colliders);
  cleanup.push(() => walkway.dispose());
  const electricalHazard = buildElectricalHazard({ aiState, onShock });
  scene.add(electricalHazard.group);
  cleanup.push(() => electricalHazard.dispose());
  const ventRoute = buildMaintenanceVent({ aiState, onEnter: onVentEnter, onExit: onVentExit });
  scene.add(ventRoute.group);
  colliders.push(...ventRoute.colliders);
  cleanup.push(() => ventRoute.dispose());

  // Lighting
  const hemiLight = new THREE.HemisphereLight(0xe8f4ff, 0x6a7b8c, 1.2);
  scene.add(hemiLight);
  cleanup.push(() => scene.remove(hemiLight));

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  cleanup.push(() => scene.remove(ambient));

  // Overhead square panel lights
  const lightPositions = [
    [0, 6.6, 6],   // Spawn area
    [0, 6.6, 0],   // Mid room
    [0, 6.6, -7],  // Security / door area
  ];

  const lightPanelGeo = new THREE.BoxGeometry(1.2, 0.05, 1.2);
  const lightPanelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  for (const pos of lightPositions) {
    const fixture = new THREE.Mesh(lightPanelGeo, lightPanelMat);
    fixture.position.set(pos[0], pos[1], pos[2]);
    scene.add(fixture);
    cleanup.push(() => scene.remove(fixture));

    const pLight = new THREE.PointLight(0xdcf2ff, 18, 20, 1.2);
    pLight.position.set(pos[0], pos[1] - 0.2, pos[2]);
    pLight.castShadow = true;
    scene.add(pLight);
    cleanup.push(() => scene.remove(pLight));
  }

  // Clutter props / crates
  const crate1 = buildProp({ width: 1.2, height: 1.2, depth: 1.2, color: 0x4a5868, position: [-3.5, 0, -3] });
  const crate2 = buildProp({ width: 1.6, height: 0.9, depth: 1.2, color: 0x5a6a7c, position: [3.5, 0, 3.6] });
  const crate3 = buildProp({ width: 1.0, height: 0.8, depth: 1.0, color: 0x4a5868, position: [4.0, 0, -5] });
  scene.add(crate1.mesh, crate2.mesh, crate3.mesh);
  colliders.push(crate1.box, crate2.box, crate3.box);
  cleanup.push(() => scene.remove(crate1.mesh, crate2.mesh, crate3.mesh));

  // 1. Clock Hint Poster (Right wall gap)
  const poster = buildClockPoster({ 
    position: [6.94, 2.0, 7.0], 
    rotationY: -Math.PI / 2 
  });
  scene.add(poster.mesh);
  cleanup.push(() => {
    scene.remove(poster.mesh);
    poster.dispose();
  });

  // 2. Clock Riddle System (Left wall gap)
  const clockPuzzle = createClockPuzzle({ 
    scene, 
    colliders, 
    cleanup, 
    hud, 
    sound,
    clockPosition: [-6.92, 2.2, 0.0],
    lockerPosition: [-6.6, 0, 1.8]
  });

  // Ambient sparks
  const sparks = createSparkParticles({ origin: [4.5, 3.8, -4], color: 0x4fd1ff });
  scene.add(sparks);
  cleanup.push(() => scene.remove(sparks));

  // SECURITY SYSTEM
  const camHead = new THREE.Group();
  camHead.position.set(0, 3.8, -9.6);
  
  const camBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.35, 12),
    new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 })
  );
  camBody.rotation.z = Math.PI / 2;
  
  const camLens = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xff1111, emissive: 0xff1111, emissiveIntensity: 2.0 })
  );
  camLens.position.x = 0.2;
  camHead.add(camBody, camLens);
  scene.add(camHead);
  cleanup.push(() => scene.remove(camHead));

  const cctvCamera = new THREE.PerspectiveCamera(65, 16 / 9, 0.1, 50);
  cctvCamera.position.copy(camHead.position);

  const camCone = new THREE.SpotLight(0xff4433, 4, 15, THREE.MathUtils.degToRad(22), 0.4);
  camCone.position.copy(camHead.position);
  const camTarget = new THREE.Object3D();
  scene.add(camTarget);
  camCone.target = camTarget;
  scene.add(camCone);
  cleanup.push(() => scene.remove(camCone, camTarget));

  // Hazard stripe & Exit Door
  const hazardStrip = buildHazardStrip({ width: 4.0, depth: 0.8, position: [0, 0.01, -9.0] });
  scene.add(hazardStrip);
  cleanup.push(() => scene.remove(hazardStrip));

  let unlocked = false;
  const keypad = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.35, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x1c232a, metalness: 0.7, roughness: 0.2 })
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

  const doorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 3.2, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x2c353f, metalness: 0.8, roughness: 0.3 })
  );
  doorMesh.position.set(0, 1.6, -9.88);
  scene.add(doorMesh);
  const doorCollider = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0, 1.6, -9.88),
    new THREE.Vector3(2.4, 3.2, 0.2)
  );
  colliders.push(doorCollider);
  cleanup.push(() => scene.remove(doorMesh));

  let t = 0;
  let warnTimer = 0;

  function update(delta, camera) {
    if (ventRoute.travelling) { ventRoute.update(delta, camera); return; }
    ventRoute.update(delta, camera);
    t += delta;
    electricalHazard.update(delta, camera);
    clockPuzzle.update(delta);

    camHead.rotation.y = Math.sin(t * 0.7) * Math.PI * 0.42;
    const dir = new THREE.Vector3(Math.sin(camHead.rotation.y), -0.2, -Math.cos(camHead.rotation.y)).normalize();
    camTarget.position.copy(camHead.position).add(dir.clone().multiplyScalar(6));
    camCone.target.updateMatrixWorld();

    cctvCamera.lookAt(camTarget.position);

    if (sparks.userData.update) sparks.userData.update(delta);

    const toPlayer = new THREE.Vector3().subVectors(camera.position, camHead.position);
    const dist = toPlayer.length();
    toPlayer.normalize();

    const facing = new THREE.Vector3(Math.sin(camHead.rotation.y), 0, -Math.cos(camHead.rotation.y));
    const angle = toPlayer.angleTo(facing);

    if (angle < THREE.MathUtils.degToRad(22) && dist < 14) {
      aiState.raise(28 * delta);
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
    walkableSurfaces: walkway.walkableSurfaces,
    cctvCamera,
    update,
    dispose: () => cleanup.forEach((fn) => fn()),
    spawn: new THREE.Vector3(0, 1.7, 7.5),
    title: 'LEVEL 1 — INFILTRATION',
    subtitle: 'Find a way past the perimeter security.',
    objective: 'Explore the substation for access credentials.',
  };
}