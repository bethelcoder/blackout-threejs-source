import * as THREE from 'three';
import { createClockPuzzle } from '../riddles/clockPuzzle.js';
import { buildRoom, buildHazardStrip, buildProp, buildItemPickupProp } from './roomBuilder.js';
import { createSparkParticles } from '../systems/particles.js';
import { sound } from '../systems/audio.js';
import { buildMaintenanceWalkway } from './maintenanceWalkway.js';
import { buildElectricalHazard } from './electricalHazard.js';
import { buildMaintenanceVent } from './maintenanceVent.js';
import { buildNoticeBoard } from './noticeBoard.js';
import { buildSecurityKeypad } from './securityKeypad.js';
import { buildCardboardBoxes } from './cardboardBoxes.js';
import { buildBackroomProps } from './backroomProps.js';
import { buildSecurityCamera, createRoomSecurityView, createSecuritySweep } from './securityCamera.js';

/**
 * LEVEL 1 — INFILTRATION
 * Environment: High-Voltage Substation Corridor
 */
export function buildLevel1({ scene, aiState, hud, onShock, onVentEnter, onVentExit, onCameraExposure, onPinStrike }) {
  const colliders = [];
  const cleanup = [];

  // Build the clean substation corridor with gaps
  const { group: room, colliders: wallColliders } = buildRoom({ width: 14, depth: 20, height: 6.8, includeRightCabinets: false, officeCeiling: true, officeFinishes: true, leftCabinetMaxZ: 2.5, backDoorOpening: { width: 2.4, height: 3.2 } });
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
  const cardboardBoxes = buildCardboardBoxes();
  scene.add(cardboardBoxes.group);
  colliders.push(...cardboardBoxes.colliders);
  cleanup.push(() => cardboardBoxes.dispose());
  const crate2 = buildProp({ geometry: new THREE.BoxGeometry(1.6, 0.9, 1.2), material: new THREE.MeshStandardMaterial({ color: 0x5a6a7c }), position: [3.5, 0.45, 3.6] });
  const crate3 = buildProp({ geometry: new THREE.BoxGeometry(1.0, 0.8, 1.0), material: new THREE.MeshStandardMaterial({ color: 0x4a5868 }), position: [4.0, 0.4, -5] });
  scene.add(crate2, crate3);
  colliders.push(new THREE.Box3().setFromObject(crate2), new THREE.Box3().setFromObject(crate3));
  cleanup.push(() => scene.remove(crate2, crate3));

  // Backroom furnishings: shelves, tables, cupboards, and scattered documents
  const backroomProps = buildBackroomProps({ scene, colliders });
  scene.add(backroomProps.group);
  cleanup.push(() => backroomProps.dispose());

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

  const exitDoors = new THREE.Group();
  exitDoors.name = 'Level 2 double doors';
  exitDoors.position.set(0, 0, -9.78);
  const doorGeometry = new THREE.BoxGeometry(1, 1, 1);
  const doorPaint = new THREE.MeshStandardMaterial({ color: 0xc7c8c2, metalness: 0.25, roughness: 0.7 });
  const doorTrim = new THREE.MeshStandardMaterial({ color: 0x383b3b, metalness: 0.7, roughness: 0.45 });
  const doorHardware = new THREE.MeshStandardMaterial({ color: 0x939a9d, metalness: 0.85, roughness: 0.35 });
  const doorGlass = new THREE.MeshStandardMaterial({ color: 0x344c58, metalness: 0.35, roughness: 0.2 });
  function doorPart(parent, name, x, y, z, width, height, depth, material = doorPaint) {
    const mesh = new THREE.Mesh(doorGeometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
  }
  for (const x of [-1.27, 1.27]) doorPart(exitDoors, 'Door jamb', x, 1.63, 0.02, 0.12, 3.26, 0.18);
  doorPart(exitDoors, 'Door frame header', 0, 3.27, 0.02, 2.66, 0.12, 0.18);
  const doorHinges = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.x = side * 1.2;
    exitDoors.add(pivot);
    doorHinges.push(pivot);
    const leaf = new THREE.Group();
    leaf.position.x = -side * 0.6;
    pivot.add(leaf);
    const windowX = -side * 0.23;
    // Separate panels leave a real opening for the narrow blue window.
    doorPart(leaf, 'Lower door panel', 0, 0.76, 0, 1.19, 1.52, 0.1);
    doorPart(leaf, 'Upper door panel', 0, 2.99, 0, 1.19, 0.42, 0.1);
    const leftEdge = windowX - 0.145;
    const rightEdge = windowX + 0.145;
    doorPart(leaf, 'Panel left of window', (-0.595 + leftEdge) / 2, 2.15, 0, leftEdge + 0.595, 1.26, 0.1);
    doorPart(leaf, 'Panel right of window', (rightEdge + 0.595) / 2, 2.15, 0, 0.595 - rightEdge, 1.26, 0.1);
    doorPart(leaf, 'Window dark surround', windowX, 2.15, 0.055, 0.34, 1.34, 0.025, doorTrim);
    doorPart(leaf, 'Narrow vision window', windowX, 2.15, 0.072, 0.25, 1.24, 0.018, doorGlass);
    for (const x of [-0.46, 0.46]) doorPart(leaf, 'Push bar bracket', x, 1.22, 0.1, 0.07, 0.14, 0.13, doorHardware);
    doorPart(leaf, 'Horizontal panic bar', 0, 1.2, 0.19, 1.0, 0.055, 0.055, doorHardware);
    doorPart(leaf, 'Overhead door closer', 0, 3.06, 0.1, 0.7, 0.13, 0.12, doorHardware);
    doorPart(leaf, 'Closer arm', -side * 0.12, 2.94, 0.14, 0.5, 0.025, 0.04, doorTrim);
    for (const y of [0.3, 1.65, 2.9]) doorPart(leaf, 'Door hinge', side * 0.57, y, 0.07, 0.035, 0.18, 0.045, doorHardware);
  }
  let doorsOpen = false;
  exitDoors.userData.interactable = true;
  exitDoors.userData.getLabel = () => doorsOpen ? 'Entering Level 2...' : securityKeypad.isUnlocked() ? 'Push doors to enter Level 2' : 'Doors locked - use access keypad';
  exitDoors.userData.onInteract = () => {
    if (doorsOpen) return;
    if (!securityKeypad.isUnlocked()) { hud.setObjective('Find the code in the technician logbook and enter it on the access keypad.'); return; }
    doorsOpen = true;
    doorCollider.makeEmpty();
    sound.playSwitch();
    hud.setObjective('Entering Level 2: the control room.');
    hud.markLevelComplete();
  };
  scene.add(exitDoors);
  const doorCollider = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0, 1.6, -9.78), new THREE.Vector3(2.4, 3.2, 0.2)
  );
  colliders.push(doorCollider);
  cleanup.push(() => {
    scene.remove(exitDoors);
    doorGeometry.dispose();
    for (const material of [doorPaint, doorTrim, doorHardware, doorGlass]) material.dispose();
  });

  let warnTimer = 0;

  function update(delta, camera) {

    ventRoute.update(delta, camera);
    if (doorsOpen) {
      doorHinges[0].rotation.y = THREE.MathUtils.damp(doorHinges[0].rotation.y, -1.4, 6, delta);
      doorHinges[1].rotation.y = THREE.MathUtils.damp(doorHinges[1].rotation.y, 1.4, 6, delta);
    }

    electricalHazard.update(delta, camera);
    clockPuzzle.update(delta);

    if (sparks.userData.update) sparks.userData.update(delta);

    securitySweep.update(delta);
    const cameraSeesPlayer = securitySweep.sees(camera.position);
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

  return {
    colliders,
    walkableSurfaces: walkway.walkableSurfaces,
    cctvCamera,
    update,
    dispose: () => cleanup.forEach((fn) => fn()),
    spawn: new THREE.Vector3(0, 1.7, 7.5),
    title: 'LEVEL 1 — INFILTRATION',
    subtitle: 'Find a way past the perimeter security.',
    objective: 'Backpack equipped [B]. Collect maintenance tools, books, and credentials [F].',
  };
}

