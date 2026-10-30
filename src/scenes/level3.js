import * as THREE from 'three';
import { buildRoom, buildProp } from './roomBuilder.js';
import { buildCoreHologramScreen } from './coreHologramScreen.js';
import { createCoreOrbMaterial } from '../shaders/coreOrb.js';
import { buildCoreRoomProps } from './coreRoomProps.js';
import { sound } from '../systems/audio.js';
import { buildCoreBase } from './coreBase.js';
import { applyCoreWalls } from './coreWalls.js';
import { buildCoreCeiling } from './coreCeiling.js';
import { buildCoreLamps } from './coreLamps.js';
import { buildCorePillars } from './corePillars.js';
import { buildRightSupercomputer } from './rightSupercomputer.js';
import { buildLeftWorkstation } from './leftWorkstation.js';
import { buildCoreCrates } from './coreCrates.js';
import { buildEarthHologram } from './earthHologram.js';
import { buildCoreFurnishings } from './coreFurnishings.js';
import { buildCoreChair } from './coreChair.js';
import { buildCoreToolboxes } from './coreToolboxes.js';
import { buildCoreWetFloorSign } from './coreWetFloorSign.js';
import { buildCoreExtinguisher } from './coreExtinguisher.js';
import { buildCoreFirstAid } from './coreFirstAid.js';
import { buildCoreDisplayTerminal } from './coreDisplayTerminal.js';
import { buildCoreBot } from './coreBot.js';
import { createRobotRepair } from '../systems/robotRepair.js';
import { createCircuitPuzzle } from '../systems/circuitPuzzle.js';
import { createLogbookPuzzle } from '../systems/logbookPuzzle.js';
import { buildInvisibleInk } from './invisibleInk.js';
import { createComponentAssembly } from '../systems/componentAssembly.js';
import { DetailLod } from '../systems/detailLod.js';

// Free GPU memory for everything under `root` (brief section 6.1).
// Safe even if an asset is shared elsewhere: three simply re-uploads it if reused.
function disposeTree(root) {
  root.traverse(obj => {
    obj.geometry?.dispose();
    const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
    for (const m of mats) {
      for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
      m.dispose();
    }
    obj.shadow?.dispose?.();
  });
}

/**
 * LEVEL 3 — THE CORE (Confront)
 * Assemble the recovered components, then connect the AI shutdown circuit.
 */
export function buildLevel3({ scene, aiState, hud, equipment, onEnding, onSurgeHit, createKeypadRenderer }) {
  const colliders = [];
  const roots = [];                       // everything we add: removed + disposed in dispose()
  const add = (obj) => { scene.add(obj); roots.push(obj); return obj; };
  // Imported set dressing is registered once loaded, then drawn at the detail
  // its distance from the player allows.
  const detailLod = new DetailLod();

  // ---------- Room ----------
  const { group: room, colliders: wallColliders, floor } = buildRoom({
    width: 14, depth: 14, height: 5.5, wallColor: 0x5a3e3e,
    officeFloor: true,
    officeCeiling: true,
    includeLeftCabinets: false,
    includeRightCabinets: false,
    includePlinths: false,
  });
  floor.name = 'Level 3 office floor';
  applyCoreWalls(room);
  add(room);
  colliders.push(...wallColliders);
  const ceiling = buildCoreCeiling(room);
  scene.add(ceiling.group);
  const ceilingLamps = buildCoreLamps();
  scene.add(ceilingLamps.group);
  const cornerPillars = buildCorePillars();
  scene.add(cornerPillars.group);
  colliders.push(...cornerPillars.colliders);
  const rightSupercomputer = buildRightSupercomputer();
  scene.add(rightSupercomputer.group);
  colliders.push(rightSupercomputer.collider);
  const leftWorkstation = buildLeftWorkstation();
  scene.add(leftWorkstation.group);
  colliders.push(leftWorkstation.collider);
  const woodenCrates = buildCoreCrates();
  scene.add(woodenCrates.group);
  colliders.push(woodenCrates.collider);
  const earthHologram = buildEarthHologram();
  scene.add(earthHologram.group);
  colliders.push(earthHologram.collider);
  const furnishings = buildCoreFurnishings();
  scene.add(furnishings.group);
  colliders.push(...furnishings.colliders);
  const workstationChair = buildCoreChair();
  scene.add(workstationChair.group);
  colliders.push(workstationChair.collider);
  const toolboxes = buildCoreToolboxes();
  scene.add(toolboxes.group);
  colliders.push(toolboxes.collider);
  const wetFloorSign = buildCoreWetFloorSign();
  scene.add(wetFloorSign.group);
  colliders.push(wetFloorSign.collider);
  const extinguisher = buildCoreExtinguisher();
  scene.add(extinguisher.group);
  colliders.push(extinguisher.collider);
  const firstAid = buildCoreFirstAid();
  scene.add(firstAid.group);
  colliders.push(firstAid.collider);
  let coreCircuitSolved = false;
  const displayTerminal = buildCoreDisplayTerminal({
    hud,
    password: 'AETHON-904',
    isCoreOverridden: () => coreCircuitSolved,
    onSolved: () => {
      if (!finished) beginIsolation();
    }
  });
  scene.add(displayTerminal.group);
  colliders.push(displayTerminal.collider);
  const deskBot = buildCoreBot();
  scene.add(deskBot.group);
  colliders.push(deskBot.collider);

  // ---------- Lighting (one shadow caster, tight shadow frustum) ----------
  add(new THREE.HemisphereLight(0xffcccc, 0x664444, 0.6));
  add(new THREE.AmbientLight(0xffffff, 0.2));
  const spot = new THREE.SpotLight(0xff9a8a, 60, 16, 1.0, 0.6, 1.2);
  spot.position.set(0, 5.2, 0);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.camera.near = 1;
  spot.shadow.camera.far = 12;
  spot.shadow.bias = -0.0005;
  add(spot);
  add(spot.target);

  // ---------- Core: pedestal -> floating coreGroup -> orb + rings + light ----------
  // Hierarchy: the rings, orb and light are children of coreGroup so they move,
  // scale and dissolve as one unit; coreGroup sits on the pedestal under `core`.
  const core = add(new THREE.Group());

  const pedestal = buildCoreBase();
  core.add(pedestal.group);

  const hazardRing = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 2.0, 48),
    new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.8 })
  );
  hazardRing.rotation.x = -Math.PI / 2;
  hazardRing.position.y = 0.012;
  hazardRing.receiveShadow = true;
  core.add(hazardRing);

  const coreGroup = new THREE.Group();
  coreGroup.position.y = 2.5;
  core.add(coreGroup);

  const orbMat = createCoreOrbMaterial();
  coreGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 48, 32), orbMat));

  const ringMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.2 });
  const rings = [1.0, 1.3, 1.6].map(radius => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.05, 8, 48), ringMat);
    coreGroup.add(ring);
    return ring;
  });

  const coreLight = new THREE.PointLight(0xff2b2b, 14, 24, 1.0);
  coreGroup.add(coreLight);

  core.updateMatrixWorld(true);
  colliders.push(pedestal.collider);

  // ---------- Floating wall telemetry ----------
  const hologramScreen = buildCoreHologramScreen();
  add(hologramScreen.group);

  let progress = 0;
  let finished = false;
  const logbook = createLogbookPuzzle({
    getKeypadModel: () => leftWorkstation.group.getObjectByName('Upper drawer code keypad'),
    createKeypadRenderer,
    onUnlock: () => {
    leftWorkstation.openDrawer();
    sound.playAccessGranted();
    hud.setObjective('Drawer unlocked. Aim at the UV flashlight inside and press E to pick it up.');
  }, onSolved: () => {
    leftWorkstation.uvPickup.visible = false;
    sound.playAccessGranted();
    hud.setObjective('UV flashlight collected. Equip it from the backpack [B]. Shine it on the safety notice on the wall behind the entrance, then search the service poster, inspection label, and maintenance floor tile for invisible ink.');
  } });
  const invisibleInk = buildInvisibleInk({ equipment, enabled: () => logbook.solved, hud, onSolved: () => {
    sound.playAccessGranted();
    hud.setObjective('Invisible Ink complete. Assembly access word: RELAY. Next, talk to the robot beside the left desk. Type HELLO on its keypad to wake it and answer three riddles.');
  } });
  add(invisibleInk.group);
  const requireLogbook = () => {
    if (logbook.solved) {
      if (invisibleInk.solved) return false;
      hud.setObjective('Complete Invisible Ink first: equip the UV flashlight, record the wall cipher and three hidden fragments, then decode the assembly access word at the safety notice.');
      return true;
    }
    hud.setObjective('Start with the engineer’s logbook on the left computer desk. Trust the stamps. Unlock the drawer and collect the UV flashlight first.');
    return true;
  };
  const robotRepair = createRobotRepair({ onSolved: () => {
    hologramScreen.setGuidance(true);
    sound.playAccessGranted();
    hud.setObjective('Three circuit components collected. Use the glowing wall hologram to assemble them. The UV access word unlocks the assembly station.');
  } });
  const assembly = createComponentAssembly({ onSolved: () => {
    progress = 3;
    hologramScreen.setGuidance(true);
    sound.playAccessGranted();
    hud.setObjective('Board assembled. Use the hologram again to connect the final circuit and isolate the AI.');
  } });
  const coreOverride = createCircuitPuzzle({ onSolved: () => {
    if (assembly.solved && robotRepair.solved && !finished) {
      coreCircuitSolved = true;
      hologramScreen.setGuidance(true);
      sound.playAccessGranted();
      hud.setObjective('Core circuit overridden! But the self-hosted AI has gone rogue on the display terminal! Read the cue card password on its bezel and engage the emergency kill switch!');
    }
  } });
  Object.assign(deskBot.group.userData, {
    interactable: true,
    label: 'Talk to robot',
    getLabel: () => robotRepair.solved ? 'Chat with friendly robot' : 'Talk to robot / communication keypad',
    onInteract: () => {
      if (requireLogbook()) return;
      robotRepair.open();
    },
  });
  const openCircuit = () => {
    if (requireLogbook() || finished) return;
    if (!robotRepair.solved) { hud.setObjective('Solve the robot riddles to collect all three circuit components.'); return; }
    hologramScreen.setGuidance(false);
    if (!assembly.solved) { assembly.open(); return; }
    coreOverride.open();
  };
  Object.assign(hologramScreen.group.userData, {
    interactable: true,
    label: 'Connect hologram shutdown circuit',
    getLabel: () => !assembly.solved ? 'Assemble circuit components' : 'Connect hologram shutdown circuit',
    reach: 3.5,
    onInteract: openCircuit,
  });
  // ---------- Maintenance desk ----------
  const deskFrameMat = new THREE.MeshStandardMaterial({ color: 0x59646f, metalness: 0.1, roughness: 0.6 });
  const deskTopMat = new THREE.MeshStandardMaterial({ color: 0x7b8794, metalness: 0.1, roughness: 0.55 });
  const hintDesk = new THREE.Group();
  hintDesk.name = 'Maintenance desk';
  // Sized to the briefing-station trim in coreFurnishings: 1.0 m wide, 0.9 m top,
  // so the side rails clear the tabletop and the light bar sits on its back edge.
  hintDesk.position.set(5.0, 0, 4.0);
  hintDesk.add(buildProp({
    geometry: new THREE.BoxGeometry(1.0, 0.06, 0.65),
    material: deskTopMat,
    position: [0, 0.87, 0],
  }));
  for (const x of [-0.455, 0.455]) {
    hintDesk.add(buildProp({
      geometry: new THREE.BoxGeometry(0.09, 0.84, 0.58),
      material: deskFrameMat,
      position: [x, 0.42, 0],
    }));
  }
  hintDesk.add(buildProp({
    geometry: new THREE.BoxGeometry(0.85, 0.05, 0.5),
    material: deskFrameMat,
    position: [0, 0.22, 0],
  }));
  add(hintDesk);
  hintDesk.updateMatrixWorld(true);
  colliders.push(new THREE.Box3().setFromObject(hintDesk));

  // Keep the starting puzzle on the furnished left workstation.
  const book = leftWorkstation.bookAnchor;
  Object.assign(leftWorkstation.uvPickup.userData, {
    interactable: true,
    label: 'Pick up UV flashlight',
    onInteract: () => {
      if (!logbook.unlocked || logbook.solved) return;
      if (!logbook.collect()) hud.setObjective('Backpack full. Free a slot, then pick up the UV flashlight.');
    },
  });
  Object.assign(book.userData, { interactable: true, label: 'Read engineer’s logbook', onInteract: () => logbook.open() });
  Object.assign(leftWorkstation.drawer.userData, {
    interactable: true, label: 'Enter drawer code',
    getLabel: () => logbook.solved ? 'Empty drawer' : logbook.unlocked ? 'Open drawer' : 'Enter drawer code',
    onInteract: () => {
      if (!logbook.unlocked) { logbook.open(true); return; }
      hud.setObjective(logbook.solved ? 'The drawer is empty. UV flashlight already collected.' : 'Aim at the UV flashlight inside the drawer and press E to pick it up.');
    },
  });
  const note = leftWorkstation.monitorNoteAnchor;
  Object.assign(note.userData, { interactable: true, label: 'Read monitor sticky note', onInteract: () => hud.setObjective('“Trust the stamps.” Read the engineer’s logbook on the left computer desk. Use the four red-stamped entries to unlock its upper drawer.') });
  // ---------- Perimeter dressing ----------
  // Keep the central route to the hologram clear.
  const roomProps = buildCoreRoomProps();
  scene.add(roomProps.group);
  colliders.push(...roomProps.colliders);

  let t = 0;
  let spin = 0;
  const charge = 0;
  let dissolve = 0;
  let ended = false;

  function beginIsolation() {
    finished = true;
    sound.playGlitch();
    hud.setObjective('AI core isolated. Grid stable. Purging core memory...');
    // Do NOT call hud.markLevelComplete(): main.js would trigger the ending
    // after ~1.75 s and cut the dissolve short. We call onEnding() ourselves.
  }

  const lerpK = (delta, rate) => 1 - Math.exp(-delta * rate);   // frame-rate independent smoothing

  function update(delta, camera) {
    leftWorkstation.update(delta);
    detailLod.update(camera);
    earthHologram.update(delta);
    invisibleInk.update(camera);
    if (logbook.isOpen || invisibleInk.isOpen || robotRepair.isOpen || assembly.isOpen || coreOverride.isOpen || displayTerminal.isOpen) return;
    t += delta;
    // --- Ending: dissolve the core, then hand over to the ending sequence ---
    if (finished) {
      dissolve += delta / 2.2;
      orbMat.uniforms.uDissolve.value = dissolve;
      const s = Math.max(0.001, 1 - dissolve);
      rings.forEach(r => r.scale.setScalar(s));
      if (dissolve >= 1.05 && !ended) { ended = true; onEnding(); }
    }

    // --- Core visuals driven by game state ---
    spin += delta * (1 + progress * 0.6 + charge * 3);
    rings[0].rotation.set(spin * 0.8, spin * 0.5, 0);
    rings[1].rotation.set(0, spin * 0.9, spin * 0.6);
    rings[2].rotation.set(spin * 0.7, 0, spin * 1.1);

    const fade = finished ? Math.max(0, 1 - dissolve) : 1;
    coreLight.intensity = (14 + Math.sin(t * 5.0) * 4.0 + charge * 10) * fade;

    const orbU = orbMat.uniforms;
    orbU.uTime.value = t;
    const agitationTarget = finished ? 0.2 : 0.3 + progress * 0.3 + charge * 0.5;
    orbU.uAgitation.value += (agitationTarget - orbU.uAgitation.value) * lerpK(delta, 6);

    hologramScreen.update(t, progress, charge);

    aiState.decay(2 * delta);
  }

  const ready = Promise.all([roomProps.ready, wetFloorSign.ready, pedestal.ready, ceiling.ready, ceilingLamps.ready, cornerPillars.ready, rightSupercomputer.ready, leftWorkstation.ready, woodenCrates.ready, earthHologram.ready, workstationChair.ready, toolboxes.ready, extinguisher.ready, firstAid.ready, displayTerminal.ready, deskBot.ready])
    .then(() => {
      detailLod.addByName(scene, [
        'Level 3 right-wall supercomputer',
        'Level 3 left-wall computer desk',
        'Level 3 wooden crates',
        'Level 3 organised equipment bays',
        'Level 3 workstation chair',
        'Level 3 stacked toolboxes',
        'Level 3 wall-mounted fire extinguisher',
        'Level 3 wall-mounted first aid box',
        'Level 3 display terminal beside left desk',
        'Core room perimeter dressing',
      ]);
    });

  function dispose() {
    invisibleInk.dispose();
    logbook.dispose();
    detailLod.dispose();
    roomProps.dispose();
    robotRepair.dispose();
    assembly.dispose();
    coreOverride.dispose();
    deskBot.dispose();
    displayTerminal.dispose();
    firstAid.dispose();
    extinguisher.dispose();
    toolboxes.dispose();
    wetFloorSign.dispose();
    workstationChair.dispose();
    furnishings.dispose();
    earthHologram.dispose();
    woodenCrates.dispose();
    leftWorkstation.dispose();
    rightSupercomputer.dispose();
    cornerPillars.dispose();
    ceilingLamps.dispose();
    ceiling.dispose();
    pedestal.dispose();
    for (const obj of roots) { scene.remove(obj); disposeTree(obj); }
    roots.length = 0;
  }

  return {
    ready,
    colliders,
    get panelOpen() { return logbook.isOpen || invisibleInk.isOpen || robotRepair.isOpen || assembly.isOpen || coreOverride.isOpen || displayTerminal.isOpen; },
    get assemblyComplete() { return assembly.solved; },
    get accessKeyword() { return invisibleInk.accessKeyword; },
    update,
    dispose,
    spawn: new THREE.Vector3(0, 1.7, 5.5),
    title: 'LEVEL 3 — THE CORE',
    subtitle: 'Isolate the AI without cutting the stabilized municipal grid.',
    objective: 'Read the engineer’s logbook on the left computer desk. Trust the stamps: find the four-digit drawer code and collect the UV flashlight.',
  };
}
