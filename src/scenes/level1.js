import * as THREE from 'three';
import { createClockPuzzle } from '../riddles/clockPuzzle.js';
import { buildRoom, buildHazardStrip, buildItemPickupProp } from './roomBuilder.js';
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
import { DetailLod } from '../systems/detailLod.js';
import { buildSecurityCamera, createRoomSecurityView, createSecuritySweep } from './securityCamera.js';
import { createVentHaze } from '../shaders/ventHaze.js';

/**
 * LEVEL 1 — INFILTRATION
 * Environment: High-Voltage Substation Corridor
 */
export function buildLevel1({ scene, aiState, hud, onShock, onVentEnter, onVentExit, onCameraExposure, onPinStrike }) {
  const colliders = [];
  const cleanup = [];
  const poweredLights = [];
  // Static dressing is drawn at the detail its distance allows once loaded.
  const detailLod = new DetailLod();
  cleanup.push(() => detailLod.dispose());

  // Build the clean substation corridor with gaps
  const { group: room, colliders: wallColliders } = buildRoom({ width: 14, depth: 20, height: 6.8, includePlinths: false, includeRightCabinets: false, officeCeiling: true, officeFinishes: true, leftCabinetMaxZ: 2.5, backDoorOpening: { width: 1.55, height: 2.62 } });
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

  // In-World Pickup Items for backpack testing (tools, books, torch, keycard)
  const itemPickups = [
    { itemId: 'technical_guide', pos: [-1.8, 0.45, 6.2], rot: [0, 0.3, 0] },
    { itemId: 'maintenance_manual', pos: [-2.2, 0.45, 4.5], rot: [0, -0.2, 0] },
    { itemId: 'insulated_wrench', pos: [1.8, 0.45, 6.0], rot: [0, 0.8, 0] },
    { itemId: 'multimeter', pos: [2.2, 0.45, 4.2], rot: [0, -0.5, 0] },
    { itemId: 'torch', pos: [1.5, 0.45, 4.8], rot: [0, 0.1, 0] },
    { itemId: 'access_card', pos: [-1.5, 0.45, 2.5], rot: [0, 0.6, 0] },
  ];

  const benchMat = new THREE.MeshStandardMaterial({ color: 0x222a33, roughness: 0.7, metalness: 0.6 });
  const benchTopMat = new THREE.MeshStandardMaterial({ color: 0x364350, roughness: 0.5, metalness: 0.8 });

  for (const item of itemPickups) {
    const stand = new THREE.Group();
    stand.position.set(item.pos[0], 0, item.pos[2]);
    const standBody = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.42, 12), benchMat);
    standBody.position.y = 0.21;
    standBody.castShadow = true;
    standBody.receiveShadow = true;
    const standTop = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 12), benchTopMat);
    standTop.position.y = 0.43;
    standTop.castShadow = true;
    standTop.receiveShadow = true;
    stand.add(standBody, standTop);
    scene.add(stand);
    cleanup.push(() => scene.remove(stand));

    const prop = buildItemPickupProp({ itemId: item.itemId, position: [item.pos[0], 0.45, item.pos[2]], rotation: item.rot });
    scene.add(prop);
    cleanup.push(() => scene.remove(prop));
  }


 // Sci-fi cargo crate
 const ventCrate = new THREE.Group();
 ventCrate.name = 'Crate blocking maintenance vent';
 
 const bodyMaterial = new THREE.MeshStandardMaterial({
   color: 0x303943,
   roughness: 0.72,
   metalness: 0.78,
 });
 
 const panelMaterial = new THREE.MeshStandardMaterial({
   color: 0x56616b,
   roughness: 0.62,
   metalness: 0.8,
 });
 
 const darkMaterial = new THREE.MeshStandardMaterial({
   color: 0x151c24,
   roughness: 0.85,
   metalness: 0.55,
 });
 
 const warningMaterial = new THREE.MeshStandardMaterial({
   color: 0xffa52b,
   roughness: 0.65,
   metalness: 0.35,
 });
 
 const lightMaterial = new THREE.MeshStandardMaterial({
   color: 0x39eaff,
   emissive: 0x087d99,
   emissiveIntensity: 2,
   metalness: 0.25,
   roughness: 0.3,
 });
 
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
 
 // Main reinforced body
 addPart(
   new THREE.BoxGeometry(crateWidth, crateHeight, crateDepth),
   bodyMaterial, 0, 0, 0
 );
 
 // Front and rear inset panels
 for (const side of [-1, 1]) {
   const faceZ = side * (crateDepth / 2 + 0.012);
 
   addPart(
     new THREE.BoxGeometry(1.42, 1.78, 0.035),
     darkMaterial, 0, 0, faceZ
   );
 
   // Three raised armour plates
   for (const y of [-0.53, 0, 0.53]) {
     addPart(
       new THREE.BoxGeometry(1.25, 0.42, 0.045),
       panelMaterial, 0, y, side * 0.485
     );
   }
 
   // Heavy corner reinforcement
   for (const x of [-0.79, 0.79]) {
     addPart(
       new THREE.BoxGeometry(0.14, 2.12, 0.09),
       panelMaterial, x, 0, side * 0.47
     );
   }
 
   // Cyan status lights
   for (const y of [-0.78, 0.78]) {
     addPart(
       new THREE.BoxGeometry(0.38, 0.045, 0.025),
       lightMaterial, 0, y, side * 0.505
     );
   }
 
   // Industrial warning stripes
   for (const x of [-0.48, -0.36, 0.36, 0.48]) {
     const stripe = addPart(
       new THREE.BoxGeometry(0.055, 0.24, 0.018),
       warningMaterial, x, -0.91, side * 0.49
     );
     stripe.rotation.z = -0.3;
   }
 }
 
 // Reinforced horizontal bands across the front and rear
 for (const side of [-1, 1]) {
   for (const y of [-1.02, 1.02]) {
     addPart(
       new THREE.BoxGeometry(1.72, 0.09, 0.055),
       darkMaterial, 0, y, side * 0.46
     );
   }
 }
 
 // Keep your existing, working crate position here:
 ventCrate.position.set(1.95, 4.8, 8.53);
 
 scene.add(ventCrate);
 
 // Keep the crate interactable
 ventCrate.userData.interactable = true;
 ventCrate.userData.label = 'Pushable crate — walk into it to push';
 ventCrate.userData.promptAction = '[PUSH]';
 
 // Register its collider for the existing pushing system
 const ventCrateCollider = new THREE.Box3().setFromObject(ventCrate);
 ventCrateCollider.pushableMesh = ventCrate;
 colliders.push(ventCrateCollider);
 
 // Clean up all crate resources when the level is disposed
 cleanup.push(() => {
   scene.remove(ventCrate);
 
   const geometries = new Set();
   const materials = new Set();
 
   ventCrate.traverse(part => {
     if (part.geometry) geometries.add(part.geometry);
 
     if (part.material) {
       for (const material of Array.isArray(part.material)
         ? part.material
         : [part.material]) {
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

  // Lighting
  const hemiLight = new THREE.HemisphereLight(0xe8f4ff, 0x6a7b8c, 0.55);
  scene.add(hemiLight);
  cleanup.push(() => scene.remove(hemiLight));

  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);
  cleanup.push(() => scene.remove(ambient));
  poweredLights.push({ light: hemiLight, off: 0.025, on: 0.55 }, { light: ambient, off: 0.012, on: 0.25 });

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
  const ventSpots = [[-1.5, -5], [4.5, 1], [-4.5, 7]];
  for (const [x, z] of ventSpots) {
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
        poweredLights.push({ light, off: 0, on: 4 });
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

  // Faint displaced air under each ceiling vent, so the grilles read as working
  // extractors rather than decoration.
  const ventHazes = ventSpots.map(([x, z], index) => {
    const haze = createVentHaze({
      position: new THREE.Vector3(x, 6.64, z),
      seed: index * 13.7,
    });
    scene.add(haze.group);
    cleanup.push(() => haze.dispose());
    return haze;
  });

  // Cardboard clutter props.
  const cardboardBoxes = buildCardboardBoxes();
  scene.add(cardboardBoxes.group);
  colliders.push(...cardboardBoxes.colliders);
  cleanup.push(() => cardboardBoxes.dispose());

  // Backroom furnishings: shelves, tables, cupboards, and scattered documents
  const backroomProps = buildBackroomProps({ scene, colliders });
  scene.add(backroomProps.group);
  cleanup.push(() => backroomProps.dispose());

  const storageCabinets = buildStorageCabinets();
  scene.add(storageCabinets.group);
  colliders.push(...storageCabinets.colliders);
  cleanup.push(() => storageCabinets.dispose());

  // 1. Clock Hint Poster (Right wall gap)


  // 2. Clock Riddle System (Left wall gap)
  const clockPuzzle = createClockPuzzle({ 
    onPinStrike,
    scene, 
    colliders, 
    cleanup, 
    hud, 
    sound,
    clockPosition: [-6.92, 2.2, 7.2],
    lockerPosition: [-6.6, 0, 9.0]
  });

  // Ambient sparks
  const sparks = createSparkParticles({ origin: [4.5, 3.8, -4], color: 0x4fd1ff });
  scene.add(sparks);
  cleanup.push(() => scene.remove(sparks));

  // High-mounted camera sweeps a visible, narrower view across the room.
  const cctvCamera = createRoomSecurityView();
  const securityCamera = buildSecurityCamera();
  securityCamera.group.position.copy(cctvCamera.position);
  securityCamera.group.lookAt(0, 0, -0.8);
  scene.add(securityCamera.group);
  cleanup.push(() => securityCamera.dispose());
  const cameraStatus = new THREE.PointLight(0xff3322, 0.5, 1.5);
  cameraStatus.position.copy(cctvCamera.position);
  scene.add(cameraStatus);
  cleanup.push(() => scene.remove(cameraStatus));
  const securitySweep = createSecuritySweep(cctvCamera, securityCamera.group, colliders);
  scene.add(securitySweep.group);
  cleanup.push(() => securitySweep.dispose());
  securitySweep.group.visible = false;
  cameraStatus.intensity = 0;

  const electricBox = buildElectricBox({ hud, sound });
  electricBox.group.position.set(2.2, 1.3, 9.77);
  electricBox.group.rotation.y = Math.PI;
  scene.add(electricBox.group);
  colliders.push(new THREE.Box3(new THREE.Vector3(1.9, 0.89, 9.58), new THREE.Vector3(2.5, 1.71, 9.98)));
  cleanup.push(() => electricBox.dispose());
  const power = createRoomPower({
    canActivate: () => electricBox.repaired,
    onBlocked: () => hud.setObjective('The circuit is broken. Repair the electric box on the entrance wall [E], then return to this switch.'),
    lights: poweredLights,
    onBrightness: brightness => diffuserMat.color.setScalar(0.025 + brightness * 0.57),
    onSwitch: () => {
      sound.playSwitch();
      hud.setObjective('Room power restored. Lights warming up...');
    },
    onSecurityOnline: () => {
      securitySweep.group.visible = true;
      cameraStatus.intensity = 0.5;
      hud.setObjective('CCTV is online. Stay behind cover; find the screwdriver in the under-stairs toolbox.');
    },
  });
  const lightSwitch = buildLightSwitch({ onActivate: () => power.activate(), isOn: () => power.activated, isReady: () => electricBox.repaired });
  lightSwitch.group.position.set(6.93, 1.45, 8.4);
  lightSwitch.group.rotation.y = -Math.PI / 2;
  scene.add(lightSwitch.group);
  cleanup.push(() => lightSwitch.dispose());

  // Hazard stripe & Exit Door
  const hazardStrip = buildHazardStrip({ width: 4.0, depth: 0.8, position: [0, 0.01, -9.0] });
  scene.add(hazardStrip);
  cleanup.push(() => scene.remove(hazardStrip));

  const securityKeypad = buildSecurityKeypad({
    onPinStrike,
    position: [2.0, 1.4, -9.85],
    rotation: [0, 0, 0],
    correctCode: '0451',
    sound,
    hud,
  });
  scene.add(securityKeypad.mesh);
  cleanup.push(() => {
    securityKeypad.dispose();
  });

  const storageDoor = buildStorageDoor({ isUnlocked: () => securityKeypad.isUnlocked(), hud, sound });
  scene.add(storageDoor.group);
  colliders.push(storageDoor.collider);
  cleanup.push(() => storageDoor.dispose());

  let warnTimer = 0;

  function update(delta, camera) {
    detailLod.update(camera);
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
      if (warnTimer > 0.35) {
        sound.playDetectionWarning(aiState.suspicion / 100);
        warnTimer = 0;
      }
    } else {
      warnTimer = 0;
      aiState.decay(8 * delta);
    }
  }

  const ready = storageCabinets.ready.then(() => {
    detailLod.addByName(scene, [
      'Backroom Props & Furniture',
      'Stacked Cardboard Boxes — Crafted by jerovdl',
      'Imported metal storage cabinets',
      'Maintenance notice board',
    ]);
  });

  return {
    ready,
    colliders,
    walkableSurfaces: walkway.walkableSurfaces,
    cctvCamera,
    get cctvEnabled() { return power.securityOnline; },
    update,
    dispose: () => cleanup.forEach((fn) => fn()),
    spawn: new THREE.Vector3(0, 1.7, 7.5),
    title: 'LEVEL 1 — INFILTRATION',
    subtitle: 'Repair the circuit, then restore the lights.',
    objective: 'Use your torch to find the electric box on the entrance wall. Press [E] to repair its wires, then use the light switch.',
  };
}

