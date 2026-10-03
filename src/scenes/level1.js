import * as THREE from 'three';
import { createClockPuzzle } from '../riddles/clockPuzzle.js';
import { buildRoom, buildHazardStrip, buildProp } from './roomBuilder.js';
import { createSparkParticles } from '../systems/particles.js';
import { sound } from '../systems/audio.js';
import { buildMaintenanceWalkway } from './maintenanceWalkway.js';
import { buildElectricalHazard } from './electricalHazard.js';
import { buildMaintenanceVent } from './maintenanceVent.js';

/**
 * LEVEL 1 — INFILTRATION
 * Environment: High-Voltage Substation Corridor
 */
export function buildLevel1({ scene, aiState, hud, onShock, onVentEnter, onVentExit }) {
  const colliders = [];
  const cleanup = [];

  // Build the clean substation corridor with gaps
  const { group: room, colliders: wallColliders } = buildRoom({ width: 14, depth: 20, height: 6.8, includeRightCabinets: false, officeCeiling: true, officeFinishes: true });
  scene.add(room);
  colliders.push(...wallColliders);

  const walkway = buildMaintenanceWalkway();
  scene.add(walkway.group);
  colliders.push(...walkway.colliders);
  cleanup.push(() => walkway.dispose());

  const electricalHazard = buildElectricalHazard({ aiState, onShock });
  scene.add(electricalHazard.group);
  cleanup.push(() => electricalHazard.dispose());

  const ventRoute = buildMaintenanceVent({ aiState, hud, onEnter: onVentEnter, onExit: onVentExit });
  scene.add(ventRoute.group);
  colliders.push(...ventRoute.colliders);
  cleanup.push(() => ventRoute.dispose());

  // Lighting
  const hemiLight = new THREE.HemisphereLight(0xe8f4ff, 0x6a7b8c, 0.55);
  scene.add(hemiLight);
  cleanup.push(() => scene.remove(hemiLight));

  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);
  cleanup.push(() => scene.remove(ambient));

  // Aged acoustic tiles with a visible suspension grid and inset fixtures.
  const ceilingPanels = new THREE.Group();
  ceilingPanels.name = 'Tiled ceiling with recessed lights';
  const tileGeo = new THREE.BoxGeometry(0.97, 0.04, 1.97);
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = tileCanvas.height = 256;
  const tileContext = tileCanvas.getContext('2d');
  tileContext.fillStyle = '#c5c3b4';
  tileContext.fillRect(0, 0, 256, 256);
  let ceilingSeed = 97;
  const ceilingRandom = () => {
    ceilingSeed = (ceilingSeed * 1664525 + 1013904223) >>> 0;
    return ceilingSeed / 4294967296;
  };
  for (let i = 0; i < 6500; i++) {
    tileContext.fillStyle = i % 2 ? 'rgba(60,58,44,0.09)' : 'rgba(255,255,240,0.12)';
    tileContext.fillRect(ceilingRandom() * 256, ceilingRandom() * 256, 1, 1);
  }
  const stain = tileContext.createRadialGradient(75, 160, 4, 75, 160, 105);
  stain.addColorStop(0, 'rgba(99,91,57,0.12)');
  stain.addColorStop(1, 'rgba(99,91,57,0)');
  tileContext.fillStyle = stain;
  tileContext.fillRect(0, 0, 256, 256);
  const tileTexture = new THREE.CanvasTexture(tileCanvas);
  tileTexture.colorSpace = THREE.SRGBColorSpace;
  const tileMaterials = [0xffffff, 0xf0efe8, 0xe5e4da].map(color =>
    new THREE.MeshStandardMaterial({ map: tileTexture, color, roughness: 0.98 }));
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x53564f, roughness: 0.85 });
  const ventMat = new THREE.MeshStandardMaterial({ color: 0x282e29, roughness: 0.9 });
  const detailGeo = new THREE.BoxGeometry(1, 1, 1);
  const ceilingDetail = (name, x, y, z, width, height, depth, material) => {
    const mesh = new THREE.Mesh(detailGeo, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    ceilingPanels.add(mesh);
  };
  for (let column = 0; column <= 14; column++) {
    ceilingDetail('Ceiling grid rail', -7 + column, 6.735, 0, 0.018, 0.025, 20, trimMat);
  }
  for (let row = 0; row <= 10; row++) {
    ceilingDetail('Ceiling grid cross rail', 0, 6.735, -10 + row * 2, 14, 0.025, 0.018, trimMat);
  }
  for (const [x, z] of [[-1.5, -5], [4.5, 1], [-4.5, 7]]) {
    ceilingDetail('Inset ventilation frame', x, 6.705, z, 0.78, 0.035, 0.95, trimMat);
    ceilingDetail('Dark ventilation opening', x, 6.68, z, 0.69, 0.02, 0.86, ventMat);
    for (let slat = 0; slat < 9; slat++) {
      ceilingDetail('Ceiling vent louver', x, 6.66, z - 0.36 + slat * 0.09, 0.67, 0.025, 0.025, trimMat);
    }
  }
  const diffuserMat = new THREE.MeshBasicMaterial({ color: 0x929796, toneMapped: false });
  for (let column = 0; column < 14; column++) {
    for (let row = 0; row < 10; row++) {
      const isLight = [3, 10].includes(column) && [1, 3, 6, 8].includes(row);
      const panel = new THREE.Mesh(tileGeo, isLight ? diffuserMat : tileMaterials[(column * 7 + row * 3 + Math.floor(row / 3)) % tileMaterials.length]);
      panel.position.set(-6.5 + column, 6.76, -9 + row * 2);
      ceilingPanels.add(panel);
      if (isLight) {
        const light = new THREE.PointLight(0xe7eceb, 4, 18, 1.2);
        light.position.set(panel.position.x, 6.55, panel.position.z);
        ceilingPanels.add(light);
      }
    }
  }
  scene.add(ceilingPanels);
  cleanup.push(() => {
    scene.remove(ceilingPanels);
    tileGeo.dispose();
    tileTexture.dispose();
    tileMaterials.forEach(material => material.dispose());
    trimMat.dispose();
    ventMat.dispose();
    detailGeo.dispose();
    diffuserMat.dispose();
  });

  // Clutter props / crates using new buildProp format
  const crate1 = buildProp({ geometry: new THREE.BoxGeometry(1.2, 1.2, 1.2), material: new THREE.MeshStandardMaterial({ color: 0x4a5868 }), position: [-3.5, 0.6, -3] });
  const crate2 = buildProp({ geometry: new THREE.BoxGeometry(1.6, 0.9, 1.2), material: new THREE.MeshStandardMaterial({ color: 0x5a6a7c }), position: [3.5, 0.45, 3.6] });
  const crate3 = buildProp({ geometry: new THREE.BoxGeometry(1.0, 0.8, 1.0), material: new THREE.MeshStandardMaterial({ color: 0x4a5868 }), position: [4.0, 0.4, -5] });
  scene.add(crate1, crate2, crate3);
  colliders.push(new THREE.Box3().setFromObject(crate1), new THREE.Box3().setFromObject(crate2), new THREE.Box3().setFromObject(crate3));
  cleanup.push(() => scene.remove(crate1, crate2, crate3));

  // 1. Clock Hint Poster (Right wall gap)


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
    ventRoute.update(delta, camera);
    t += delta;

    electricalHazard.update(delta, camera);
    clockPuzzle.update(delta);

    camHead.rotation.y = Math.sin(t * 0.7) * Math.PI * 0.35;
    const dir = new THREE.Vector3(Math.sin(camHead.rotation.y), -0.25, -Math.cos(camHead.rotation.y)).normalize();
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
    title: 'LEVEL 1 â€” INFILTRATION',
    subtitle: 'Find a way past the perimeter security.',
    objective: 'Explore the substation for access credentials.',
  };
}
