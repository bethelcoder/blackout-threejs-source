import * as THREE from 'three';
import { createClockPuzzle } from '../riddles/clockPuzzle.js';
import { buildRoom, buildHazardStrip } from './roomBuilder.js';
import { createSparkParticles } from '../systems/particles.js';
import { sound } from '../systems/audio.js';
import { buildMaintenanceWalkway } from './maintenanceWalkway.js';
import { buildElectricalHazard } from './electricalHazard.js';
import { buildMaintenanceVent } from './maintenanceVent.js';
import { buildNoticeBoard } from './noticeBoard.js';
import { buildSecurityKeypad } from './securityKeypad.js';
import { buildCardboardBoxes } from './cardboardBoxes.js';
import { buildBackroomProps } from './backroomProps.js';
import { buildLightSwitch } from './lightSwitch.js';
import { buildElectricBox } from './electricBox.js';
import { buildStorageCabinets } from './storageCabinets.js';
import { buildStorageDoor } from './storageDoor.js';
import { buildFrontDoor } from './frontDoor.js';
import { createRoomPower } from '../systems/roomPower.js';
import { buildSecurityCamera, createRoomSecurityView, createSecuritySweep } from './securityCamera.js';
import { createVentHaze } from '../shaders/ventHaze.js';

export function buildLevel1({ scene, aiState, hud, onShock, onVentEnter, onVentExit, onCameraExposure, onPinStrike }) {
  const colliders = [];
  const cleanup = [];
  const poweredLights = [];

  // includeLeftCabinets: false removes the massive glossy switchgear racks.
  const { group: room, colliders: wallColliders } = buildRoom({ 
    width: 14, 
    depth: 20, 
    height: 6.8, 
    includePlinths: false, 
    includeLeftCabinets: false, 
    includeRightCabinets: false, 
    officeCeiling: true, 
    officeFinishes: true, 
    leftCabinetMaxZ: 2.5, 
    backDoorOpening: { width: 1.55, height: 2.62 } 
  });
  scene.add(room);
  colliders.push(...wallColliders);

  const frontDoor = buildFrontDoor();
  scene.add(frontDoor.group);
  colliders.push(frontDoor.collider);
  cleanup.push(() => frontDoor.dispose());

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

  // (Black tables and loose items removed)

  // Sci-fi cargo crate
  const ventCrate = new THREE.Group();
  ventCrate.name = 'Crate blocking maintenance vent';
  
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x303943, roughness: 0.72, metalness: 0.78 });
  const panelMaterial = new THREE.MeshStandardMaterial({ color: 0x56616b, roughness: 0.62, metalness: 0.8 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x151c24, roughness: 0.85, metalness: 0.55 });
  const warningMaterial = new THREE.MeshStandardMaterial({ color: 0xffa52b, roughness: 0.65, metalness: 0.35 });
  const lightMaterial = new THREE.MeshStandardMaterial({ color: 0x39eaff, emissive: 0x087d99, emissiveIntensity: 2, metalness: 0.25, roughness: 0.3 });
  
  const crateWidth = 1.8;
  const crateHeight = 2.2;
  const crateDepth = 0.9;
  
  function addPart(geometry, material, x, y, z) {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(x, y, z);
    part.castShadow = true;
    part.receiveShadow = true;
    ventCrate.add(part);
    return part;
  }
  
  addPart(new THREE.BoxGeometry(crateWidth, crateHeight, crateDepth), bodyMaterial, 0, 0, 0);
  
  for (const side of [-1, 1]) {
    const faceZ = side * (crateDepth / 2 + 0.012);
    addPart(new THREE.BoxGeometry(1.42, 1.78, 0.035), darkMaterial, 0, 0, faceZ);
    for (const y of [-0.53, 0, 0.53]) {
      addPart(new THREE.BoxGeometry(1.25, 0.42, 0.045), panelMaterial, 0, y, side * 0.485);
    }
    for (const x of [-0.79, 0.79]) {
      addPart(new THREE.BoxGeometry(0.14, 2.12, 0.09), panelMaterial, x, 0, side * 0.47);
    }
    for (const y of [-0.78, 0.78]) {
      addPart(new THREE.BoxGeometry(0.38, 0.045, 0.025), lightMaterial, 0, y, side * 0.505);
    }
    for (const x of [-0.48, -0.36, 0.36, 0.48]) {
      const stripe = addPart(new THREE.BoxGeometry(0.055, 0.24, 0.018), warningMaterial, x, -0.91, side * 0.49);
      stripe.rotation.z = -0.3;
    }
  }
  
  for (const side of [-1, 1]) {
    for (const y of [-1.02, 1.02]) {
      addPart(new THREE.BoxGeometry(1.72, 0.09, 0.055), darkMaterial, 0, y, side * 0.46);
    }
  }
  
  ventCrate.position.set(1.95, 4.8, 8.53);
  scene.add(ventCrate);
  
  ventCrate.userData.interactable = true;
  ventCrate.userData.label = 'Pushable crate — walk into it to push';
  ventCrate.userData.promptAction = '[PUSH]';
  
  const ventCrateCollider = new THREE.Box3().setFromObject(ventCrate);
  ventCrateCollider.pushableMesh = ventCrate;
  colliders.push(ventCrateCollider);
  
  cleanup.push(() => {
    scene.remove(ventCrate);
    const geometries = new Set();
    const materials = new Set();
    ventCrate.traverse(part => {
      if (part.geometry) geometries.add(part.geometry);
      if (part.material) {
        for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
          materials.add(material);
        }
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
  });

  const noticeBoard = buildNoticeBoard({ hud });
  scene.add(noticeBoard.group);
  cleanup.push(() => noticeBoard.dispose());

  const hemiLight = new THREE.HemisphereLight(0xe8f4ff, 0x6a7b8c, 0.55);
  scene.add(hemiLight);
  cleanup.push(() => scene.remove(hemiLight));

  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);
  cleanup.push(() => scene.remove(ambient));
  poweredLights.push({ light: hemiLight, off: 0.025, on: 0.55 }, { light: ambient, off: 0.012, on: 0.25 });

  const ceilingPanels = new THREE.Group();
  const tileGeo = new THREE.BoxGeometry(0.97, 0.04, 1.97);
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = tileCanvas.height = 256;
  const tileContext = tileCanvas.getContext('2d');
  tileContext.fillStyle = '#c5c3b4'; tileContext.fillRect(0, 0, 256, 256);
  let ceilingSeed = 97;
  const ceilingRandom = () => { ceilingSeed = (ceilingSeed * 1664525 + 1013904223) >>> 0; return ceilingSeed / 4294967296; };
  for (let i = 0; i < 6500; i++) {
    tileContext.fillStyle = i % 2 ? 'rgba(60,58,44,0.09)' : 'rgba(255,255,240,0.12)';
    tileContext.fillRect(ceilingRandom() * 256, ceilingRandom() * 256, 1, 1);
  }
  const tileTexture = new THREE.CanvasTexture(tileCanvas);
  tileTexture.colorSpace = THREE.SRGBColorSpace;
  const tileMaterials = [0xffffff, 0xf0efe8, 0xe5e4da].map(color => new THREE.MeshStandardMaterial({ map: tileTexture, color, roughness: 0.98 }));
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x53564f, roughness: 0.85 });
  const ventMat = new THREE.MeshStandardMaterial({ color: 0x282e29, roughness: 0.9 });
  const detailGeo = new THREE.BoxGeometry(1, 1, 1);
  const ceilingDetail = (name, x, y, z, width, height, depth, material) => {
    const mesh = new THREE.Mesh(detailGeo, material);
    mesh.position.set(x, y, z); mesh.scale.set(width, height, depth); ceilingPanels.add(mesh);
  };
  for (let column = 0; column <= 14; column++) ceilingDetail('', -7 + column, 6.735, 0, 0.018, 0.025, 20, trimMat);
  for (let row = 0; row <= 10; row++) ceilingDetail('', 0, 6.735, -10 + row * 2, 14, 0.025, 0.018, trimMat);
  const ventSpots = [[-1.5, -5], [4.5, 1], [-4.5, 7]];
  for (const [x, z] of ventSpots) {
    ceilingDetail('', x, 6.705, z, 0.78, 0.035, 0.95, trimMat);
    ceilingDetail('', x, 6.68, z, 0.69, 0.02, 0.86, ventMat);
    for (let slat = 0; slat < 9; slat++) ceilingDetail('', x, 6.66, z - 0.36 + slat * 0.09, 0.67, 0.025, 0.025, trimMat);
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
        poweredLights.push({ light, off: 0, on: 4 });
      }
    }
  }
  scene.add(ceilingPanels);
  cleanup.push(() => {
    scene.remove(ceilingPanels); tileGeo.dispose(); tileTexture.dispose();
    tileMaterials.forEach(m => m.dispose()); trimMat.dispose(); ventMat.dispose(); detailGeo.dispose(); diffuserMat.dispose();
  });

  const ventHazes = ventSpots.map(([x, z], index) => {
    const haze = createVentHaze({ position: new THREE.Vector3(x, 6.64, z), seed: index * 13.7 });
    scene.add(haze.group); cleanup.push(() => haze.dispose()); return haze;
  });

  const cardboardBoxes = buildCardboardBoxes();
  scene.add(cardboardBoxes.group); colliders.push(...cardboardBoxes.colliders); cleanup.push(() => cardboardBoxes.dispose());

  const backroomProps = buildBackroomProps({ scene, colliders });
  scene.add(backroomProps.group); cleanup.push(() => backroomProps.dispose());

  const storageCabinets = buildStorageCabinets();
  scene.add(storageCabinets.group); colliders.push(...storageCabinets.colliders); cleanup.push(() => storageCabinets.dispose());

  const clockPuzzle = createClockPuzzle({ 
    onPinStrike, scene, colliders, cleanup, hud, sound,
    clockPosition: [-6.92, 2.2, 7.2], lockerPosition: [-6.6, 0, 9.0]
  });

  const sparks = createSparkParticles({ origin: [4.5, 3.8, -4], color: 0x4fd1ff });
  scene.add(sparks); cleanup.push(() => scene.remove(sparks));

  const cctvCamera = createRoomSecurityView();
  const securityCamera = buildSecurityCamera();
  securityCamera.group.position.copy(cctvCamera.position); securityCamera.group.lookAt(0, 0, -0.8);
  scene.add(securityCamera.group); cleanup.push(() => securityCamera.dispose());
  const cameraStatus = new THREE.PointLight(0xff3322, 0.5, 1.5);
  cameraStatus.position.copy(cctvCamera.position); scene.add(cameraStatus); cleanup.push(() => scene.remove(cameraStatus));
  const securitySweep = createSecuritySweep(cctvCamera, securityCamera.group, colliders);
  scene.add(securitySweep.group); cleanup.push(() => securitySweep.dispose());
  securitySweep.group.visible = false; cameraStatus.intensity = 0;

  const electricBox = buildElectricBox({ hud, sound });
  electricBox.group.position.set(2.2, 1.3, 9.77); electricBox.group.rotation.y = Math.PI;
  scene.add(electricBox.group);
  colliders.push(new THREE.Box3(new THREE.Vector3(1.9, 0.89, 9.58), new THREE.Vector3(2.5, 1.71, 9.98)));
  cleanup.push(() => electricBox.dispose());
  
  const power = createRoomPower({
    canActivate: () => electricBox.repaired,
    onBlocked: () => hud.setObjective('The circuit is broken. Repair the electric box on the entrance wall [E], then return to this switch.'),
    lights: poweredLights,
    onBrightness: brightness => diffuserMat.color.setScalar(0.025 + brightness * 0.57),
    onSwitch: () => { sound.playSwitch(); hud.setObjective('Room power restored. Lights warming up...'); },
    onSecurityOnline: () => {
      securitySweep.group.visible = true; cameraStatus.intensity = 0.5;
      hud.setObjective('CCTV is online. Stay behind cover; find the screwdriver in the under-stairs toolbox.');
    },
  });
  
  const lightSwitch = buildLightSwitch({ onActivate: () => power.activate(), isOn: () => power.activated, isReady: () => electricBox.repaired });
  lightSwitch.group.position.set(6.93, 1.45, 8.4); lightSwitch.group.rotation.y = -Math.PI / 2;
  scene.add(lightSwitch.group); cleanup.push(() => lightSwitch.dispose());

  const hazardStrip = buildHazardStrip({ width: 4.0, depth: 0.8, position: [0, 0.01, -9.0] });
  scene.add(hazardStrip); cleanup.push(() => scene.remove(hazardStrip));

  const securityKeypad = buildSecurityKeypad({
    onPinStrike, position: [2.0, 1.4, -9.85], rotation: [0, 0, 0], correctCode: '0451', sound, hud,
  });
  scene.add(securityKeypad.mesh); cleanup.push(() => securityKeypad.dispose());

  const storageDoor = buildStorageDoor({ isUnlocked: () => securityKeypad.isUnlocked(), hud, sound });
  scene.add(storageDoor.group); colliders.push(storageDoor.collider); cleanup.push(() => storageDoor.dispose());

  let warnTimer = 0;

  function update(delta, camera) {
    power.update(delta);
    ventRoute.update(delta, camera);
    storageDoor.update(delta);
    electricalHazard.update(delta, camera);
    clockPuzzle.update(delta);
    if (sparks.userData.update) sparks.userData.update(delta);
    for (const haze of ventHazes) haze.update(delta);

    if (power.securityOnline) securitySweep.update(delta);
    const cameraSeesPlayer = power.securityOnline && securitySweep.sees(camera.position);
    onCameraExposure?.(delta, cameraSeesPlayer);
    if (cameraSeesPlayer) {
      aiState.raise(28 * delta);
      warnTimer += delta;
      if (warnTimer > 0.35) { sound.playDetectionWarning(aiState.suspicion / 100); warnTimer = 0; }
    } else {
      warnTimer = 0;
      aiState.decay(8 * delta);
    }
  }

  return {
    colliders, walkableSurfaces: walkway.walkableSurfaces, cctvCamera,
    get cctvEnabled() { return power.securityOnline; },
    update, dispose: () => cleanup.forEach((fn) => fn()),
    spawn: new THREE.Vector3(0, 1.7, 7.5),
    title: 'LEVEL 1 — INFILTRATION',
    subtitle: 'Repair the circuit, then restore the lights.',
    objective: 'Use your torch to find the electric box on the entrance wall. Press [E] to repair its wires, then use the light switch.',
  };
}