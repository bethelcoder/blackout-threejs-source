import * as THREE from 'three';
import { buildRoom, buildProp } from './roomBuilder.js';
import { buildCoreHologramScreen } from './coreHologramScreen.js';
import { createShockwaveFloorMaterial, MAX_WAVES } from '../shaders/shockwaveFloor.js';
import { createCoreOrbMaterial } from '../shaders/coreOrb.js';
import { buildSecurityCamera, createRoomSecurityView, createSecuritySweep } from './securityCamera.js';
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
import { buildCoreExtinguisher } from './coreExtinguisher.js';
import { buildCoreFirstAid } from './coreFirstAid.js';
import { buildCoreDisplayTerminal } from './coreDisplayTerminal.js';
import { buildCoreBot } from './coreBot.js';
import { createRobotRepair } from '../systems/robotRepair.js';
import { createCircuitPuzzle } from '../systems/circuitPuzzle.js';

const PLAYER_HEIGHT = 1.7;       // matches playerControls.js
const WAVE_THICKNESS = 0.5;
const WAVE_START_RADIUS = 1.7;   // just outside the pedestal
const WAVE_END_RADIUS = 10.2;    // past the room corners (~9.9)
const CHARGE_TIME = 1.6;         // telegraph before each surge
const JUMP_CLEARANCE = 0.22;     // feet must be this high to clear a wave (jump peaks ~1.0 m)

// Index = number of feeders already isolated.
const PHASES = [
  { interval: 6.5, speed: 2.5, burst: 1, gap: 2.1 },
  { interval: 6.0, speed: 2.7, burst: 1, gap: 2.0 },
  { interval: 5.5, speed: 2.9, burst: 1, gap: 1.9 },
];

const BREAKER_SPOTS = [
  { id: 'A', x: -5.2, z: -4.4 },
  { id: 'B', x: 0.0, z: -6.0 },
  { id: 'C', x: 5.2, z: -4.4 },
];

const angleDiff = (a, b) =>
  Math.abs(THREE.MathUtils.euclideanModulo(a - b + Math.PI, Math.PI * 2) - Math.PI);

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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

function makeReadoutTexture(id, load) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#061018'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = '#2bd4ff'; g.lineWidth = 4; g.strokeRect(4, 4, 248, 120);
  g.fillStyle = '#2bd4ff'; g.textAlign = 'center';
  g.font = 'bold 30px monospace'; g.fillText(`FEEDER ${id}`, 128, 44);
  g.font = 'bold 44px monospace'; g.fillText(`${load} MW`, 128, 100);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * LEVEL 3 — THE CORE (Confront)
 * Boss fight: dodge/jump the core's shockwaves while isolating three feeders
 * in order of load (highest first). The order is shuffled every run.
 */
export function buildLevel3({ scene, aiState, hud, onEnding, onSurgeHit }) {
  const colliders = [];
  const roots = [];                       // everything we add: removed + disposed in dispose()
  const add = (obj) => { scene.add(obj); roots.push(obj); return obj; };

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
  const extinguisher = buildCoreExtinguisher();
  scene.add(extinguisher.group);
  colliders.push(extinguisher.collider);
  const firstAid = buildCoreFirstAid();
  scene.add(firstAid.group);
  colliders.push(firstAid.collider);
  const displayTerminal = buildCoreDisplayTerminal();
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

  // ---------- Shockwave floor (shader-driven, one draw call) ----------
  const waveMat = createShockwaveFloorMaterial();
  waveMat.uniforms.uThickness.value = WAVE_THICKNESS;
  const waveFloor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), waveMat);
  waveFloor.rotation.x = -Math.PI / 2;
  waveFloor.position.y = 0.03;
  waveFloor.renderOrder = 1;
  add(waveFloor);

  // ---------- Floating wall telemetry ----------
  const hologramScreen = buildCoreHologramScreen();
  add(hologramScreen.group);

  // ---------- Ceiling CCTV ----------
  // Priority is being seen, not being caught: the cone only feeds suspicion,
  // without adding another damage source. The shockwaves stay
  // the single source of strikes so the room doesn't punish twice for one move.
  const cctvView = createRoomSecurityView({
    position: new THREE.Vector3(0, 4.85, -6.55),
    target: new THREE.Vector3(0, 0.6, 2.5),
    fov: 50,
    far: 24,
  });
  const securityCamera = buildSecurityCamera();
  securityCamera.group.position.copy(cctvView.position);
  securityCamera.group.lookAt(0, 0.6, 2.5);
  add(securityCamera.group);

  const cameraStatus = new THREE.PointLight(0xff3322, 0.5, 1.6);
  cameraStatus.position.copy(cctvView.position);
  add(cameraStatus);

  const securitySweep = createSecuritySweep(cctvView, securityCamera.group, colliders);
  add(securitySweep.group);

  // ---------- Puzzle data (shuffled every run) ----------
  const loads = shuffle([34, 58, 91]);
  const loadById = Object.fromEntries(BREAKER_SPOTS.map((s, i) => [s.id, loads[i]]));
  const correctOrder = Object.keys(loadById).sort((a, b) => loadById[b] - loadById[a]); // highest first

  let progress = 0;
  let finished = false;
  let wavesDisabled = false;
  const recoveredClue = () => hud.setObjective('ROBOT RECORD: the hologram circuit starts at 3V and must finish at 5V. Route through all three relays: R1 boosts +3V, R2 drains 2V, R3 boosts +1V. A connected wire alone is not enough.');
  const robotRepair = createRobotRepair({ onSolved: () => {
    recoveredClue();
    sound.playAccessGranted();
  } });
  const coreOverride = createCircuitPuzzle({ onSolved: () => {
    if (wavesDisabled && robotRepair.solved && !finished) beginIsolation();
  } });
  Object.assign(deskBot.group.userData, {
    interactable: true,
    label: 'Repair robot',
    getLabel: () => !wavesDisabled ? 'Robot unsafe - disable shockwave feeders first' : robotRepair.solved ? 'Replay robot maintenance clue' : 'Repair robot',
    onInteract: () => {
      if (!wavesDisabled) { hud.setObjective('Disable the shockwaves first: isolate the three feeders from highest load to lowest. Check the maintenance schedule.'); return; }
      if (robotRepair.solved) recoveredClue(); else robotRepair.open();
    },
  });
  const openCircuit = () => {
    if (finished) return;
    if (!wavesDisabled) { hud.setObjective('Circuit locked. Disable the shockwaves using the three feeders first.'); return; }
    if (!robotRepair.solved) { hud.setObjective('Repair the robot beside the desk to restore circuit access and recover the routing clue.'); return; }
    coreOverride.open();
  };
  Object.assign(hologramScreen.group.userData, {
    interactable: true,
    label: 'Connect hologram shutdown circuit',
    reach: 3.5,
    onInteract: openCircuit,
  });
  Object.assign(displayTerminal.group.userData, {
    interactable: true,
    label: 'Read circuit access status',
    onInteract: () => hud.setObjective(robotRepair.solved
      ? 'Circuit access restored. Use the large wall hologram to connect the shutdown route through all three relays at 5V.'
      : 'Repair the robot beside this desk after disabling the shockwave feeders. It can restore access to the wall hologram circuit.'),
  });
  const phaseIndex = () => Math.min(progress, PHASES.length - 1);

  // ---------- Breakers ----------
  const breakers = {};
  const leverMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.8, roughness: 0.3 });

  for (const spot_ of BREAKER_SPOTS) {
    const g = new THREE.Group();
    g.position.set(spot_.x, 0, spot_.z);
    g.rotation.y = Math.atan2(-spot_.x, -spot_.z);   // face the core

    const body = buildProp({
      geometry: new THREE.BoxGeometry(0.7, 1.3, 0.4),
      material: new THREE.MeshStandardMaterial({ color: 0x3d4855, metalness: 0.5, roughness: 0.5 }),
      position: [0, 0.65, 0],
    });
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.28),
      new THREE.MeshBasicMaterial({ map: makeReadoutTexture(spot_.id, loadById[spot_.id]) })
    );
    screen.position.set(0, 1.0, 0.201);

    const lampMat = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2020, emissiveIntensity: 1.2 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), lampMat);
    lamp.position.set(0.22, 1.2, 0.21);

    // Lever pivots at its base: the pivot group is a child of the body group
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.62, 0.22);
    pivot.rotation.x = -0.5;
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), leverMat);
    lever.position.y = 0.2;
    pivot.add(lever);

    g.add(body, screen, lamp, pivot);

    const b = { group: g, lampMat, pivot, leverTarget: -0.5, locked: false };
    b.lock = (state) => {
      b.locked = state;
      b.leverTarget = state ? 0.9 : -0.5;
      lampMat.emissive.set(state ? 0x2bff6f : 0xff2020);
    };

    Object.assign(g.userData, {
      interactable: true,
      label: `Isolate feeder ${spot_.id}`,
      getLabel: () => (b.locked ? `Feeder ${spot_.id} isolated` : `Isolate feeder ${spot_.id}`),
      onInteract: () => pull(spot_.id),
    });

    add(g);
    g.updateMatrixWorld(true);
    colliders.push(new THREE.Box3().setFromObject(g));
    breakers[spot_.id] = b;
  }

  // ---------- Overhead feeder conduits ----------
  // Each breaker is fed from a hub above the core, so isolating one kills a
  // visible branch of the grid instead of only flipping a lever. Everything
  // hangs at y 4.75: above the corruption panel (top edge 4.15) and below the
  // ceiling pipes at 5.05, clear of the innermost core ring at 4.15.
  const HUB_Y = 4.75;
  const CONDUIT_RADIUS = 0.05;
  const hardwareMat = new THREE.MeshStandardMaterial({ color: 0x2a3138, metalness: 0.6, roughness: 0.45 });

  function feederTagTexture(id) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#0b1418'; g.fillRect(0, 0, 128, 64);
    g.strokeStyle = '#2bd4ff'; g.lineWidth = 4; g.strokeRect(2, 2, 124, 60);
    g.fillStyle = '#2bd4ff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 30px monospace'; g.fillText(`FDR ${id}`, 64, 34);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function conduitPath(group, mat, points) {
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < points.length - 1; i++) {
      const a = new THREE.Vector3(...points[i]);
      const b = new THREE.Vector3(...points[i + 1]);
      const len = a.distanceTo(b);
      if (len < 1e-4) continue;
      const run = new THREE.Mesh(new THREE.CylinderGeometry(CONDUIT_RADIUS, CONDUIT_RADIUS, len, 8), mat);
      run.position.copy(a).lerp(b, 0.5);
      run.quaternion.setFromUnitVectors(up, b.sub(a).normalize());
      group.add(run);
    }
    for (const p of points.slice(1, -1)) {
      const coupling = new THREE.Mesh(new THREE.SphereGeometry(CONDUIT_RADIUS * 1.8, 10, 8), hardwareMat);
      coupling.position.set(...p);
      group.add(coupling);
    }
  }

  const hub = new THREE.Group();
  hub.position.set(0, HUB_Y, 0);
  hub.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.24, 0.62), hardwareMat));
  for (const [x, z] of [[-0.2, -0.2], [-0.2, 0.2], [0.2, -0.2], [0.2, 0.2]]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.63, 6), hardwareMat);
    rod.position.set(x, 0.43, z);
    hub.add(rod);
  }
  add(hub);

  const feeders = {};
  for (const spot_ of BREAKER_SPOTS) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1b2026, metalness: 0.55, roughness: 0.5,
      emissive: 0xff2a18, emissiveIntensity: 0.55,
    });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2a18, emissiveIntensity: 1.4 });
    const g = new THREE.Group();
    g.name = `Feeder ${spot_.id}`;

    const path = [[0, HUB_Y, 0]];
    if (Math.abs(spot_.x) > 1e-4) path.push([spot_.x, HUB_Y, 0]);
    path.push([spot_.x, HUB_Y, spot_.z]);
    conduitPath(g, mat, path);

    const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.3), hardwareMat);
    box.position.set(spot_.x, HUB_Y - 0.16, spot_.z);
    g.add(box);

    const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 8), mat);
    stub.position.set(spot_.x, HUB_Y - 0.44, spot_.z);
    g.add(stub);

    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), lampMat);
    lamp.position.set(spot_.x, HUB_Y - 0.63, spot_.z);
    g.add(lamp);

    const tag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.11),
      new THREE.MeshBasicMaterial({ map: feederTagTexture(spot_.id) })
    );
    tag.position.set(spot_.x, HUB_Y - 0.16, spot_.z + 0.151);
    g.add(tag);

    add(g);
    const setLive = (live) => {
      mat.emissive.set(live ? 0xff2a18 : 0x101314);
      mat.emissiveIntensity = live ? 0.55 : 0;
      lampMat.emissive.set(live ? 0xff2a18 : 0x2bff6f);
      lampMat.emissiveIntensity = live ? 1.4 : 0.8;
    };
    g.userData.setLive = setLive;
    feeders[spot_.id] = { group: g, setLive };
  }

  // ---------- Maintenance schedule desk (the clue) ----------
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

  const hintProp = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.08, 0.35),   // thicker than before so the crosshair can hit it
    new THREE.MeshStandardMaterial({ color: 0xe8d9a0, roughness: 0.4 })
  );
  hintProp.position.set(4.82, 0.94, 4.08);
  Object.assign(hintProp.userData, {
    interactable: true,
    label: 'Read maintenance schedule',
    onInteract: () => {
      sound.playInteract();
      hud.setObjective('SCHEDULE: isolate feeders from HIGHEST load to LOWEST. Loads are on each breaker. Cut a light feeder early and the grid collapses.');
    },
  });
  add(hintProp);

  // ---------- Perimeter dressing ----------
  // Wall-hugging only: the shockwave ring needs the floor clear to dodge in.
  const roomProps = buildCoreRoomProps();
  add(roomProps.group);
  colliders.push(...roomProps.colliders);

  // ---------- Shockwave state ----------
  const waves = Array.from({ length: MAX_WAVES }, () => ({ active: false, r: 0, gap: 0 }));
  function spawnWave() {
    const w = waves.find(x => !x.active);
    if (!w) return;
    w.active = true;
    w.r = WAVE_START_RADIUS;
    w.gap = (Math.random() * 2 - 1) * Math.PI;   // same convention as Math.atan2
  }

  let t = 0;
  let spin = 0;
  let charge = 0;
  let timeToNext = 8;      // grace before the first surge
  let secondIn = -1;
  let chargeSounded = false;
  let dissolve = 0;
  let ended = false;
  let cctvWarnTimer = 0;

  function applyPhase() {
    waveMat.uniforms.uGapWidth.value = PHASES[phaseIndex()].gap;
  }
  applyPhase();

  function pull(id) {
    if (finished || breakers[id].locked) return;
    sound.playSwitch();

    if (correctOrder[progress] === id) {
      breakers[id].lock(true);
      feeders[id].setLive(false);
      progress++;
      sound.playAccessGranted();
      if (progress === correctOrder.length) {
        wavesDisabled = true;
        waves.forEach(w => { w.active = false; });
        waveMat.uniforms.uRadius.value.fill(-10);
        waveMat.uniforms.uCharge.value = 0;
        secondIn = -1;
        charge = 0;
        hud.setObjective('Shockwaves disabled. The room is safe. Repair the robot beside the left desk to recover the core override clue.');
        return;
      }
      applyPhase();
      hud.setObjective(`Feeder ${id} isolated (${progress}/${correctOrder.length}). The core is escalating — keep moving!`);
    } else {
      for (const b of Object.values(breakers)) b.lock(false);
      for (const f of Object.values(feeders)) f.setLive(true);
      progress = 0;
      applyPhase();
      aiState.raise(30);
      sound.playDetectionWarning(0.9);
      timeToNext = Math.min(timeToNext, CHARGE_TIME);   // immediate retaliation surge
      hud.setObjective('WRONG FEEDER — grid overload! Breakers reset. Check the maintenance schedule: highest load first.');
    }
  }

  function beginIsolation() {
    finished = true;
    waves.forEach(w => { w.active = false; });
    sound.playGlitch();
    hud.setObjective('AI core isolated. Grid stable. Purging core memory...');
    // Do NOT call hud.markLevelComplete(): main.js would trigger the ending
    // after ~1.75 s and cut the dissolve short. We call onEnding() ourselves.
  }

  const lerpK = (delta, rate) => 1 - Math.exp(-delta * rate);   // frame-rate independent smoothing

  function update(delta, camera) {
    earthHologram.update(delta);
    if (robotRepair.isOpen || coreOverride.isOpen) return;
    t += delta;
    const phase = PHASES[phaseIndex()];

    // --- Surge scheduler: charge (telegraph) -> fire ---
    if (!finished && !wavesDisabled) {
      timeToNext -= delta;
      charge = timeToNext < CHARGE_TIME ? 1 - Math.max(timeToNext, 0) / CHARGE_TIME : 0;
      if (charge > 0 && !chargeSounded) { chargeSounded = true; sound.playDetectionWarning(0.35); }
      if (timeToNext <= 0) {
        spawnWave();
        if (phase.burst > 1) secondIn = 0.7;
        timeToNext = phase.interval;
        chargeSounded = false;
        sound.playGlitch();
      }
      if (secondIn > 0) { secondIn -= delta; if (secondIn <= 0) spawnWave(); }
    } else {
      charge = 0;
    }

    // --- Move waves + hit test (the player must be low AND inside the ring, outside the gap) ---
    const px = camera.position.x;
    const pz = camera.position.z;
    const dist = Math.hypot(px, pz);
    const bearing = Math.atan2(pz, px);
    const feet = camera.position.y - (camera.userData.playerHeight ?? PLAYER_HEIGHT);
    const halfGap = waveMat.uniforms.uGapWidth.value / 2;

    for (let i = 0; i < MAX_WAVES; i++) {
      const w = waves[i];
      if (w.active) {
        w.r += phase.speed * delta;
        if (w.r > WAVE_END_RADIUS) {
          w.active = false;
        } else if (
          !finished &&
          feet < JUMP_CLEARANCE &&
          Math.abs(dist - w.r) < WAVE_THICKNESS / 2 &&
          angleDiff(bearing, w.gap) > halfGap
        ) {
          onSurgeHit?.();   // strike + teleport to spawn is handled in main.js (3 s grace)
        }
      }
      waveMat.uniforms.uRadius.value[i] = w.active ? w.r : -10;
      waveMat.uniforms.uGapAngle.value[i] = w.gap;
    }
    waveMat.uniforms.uTime.value = t;
    waveMat.uniforms.uCharge.value = charge;

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

    // --- Breaker levers ease toward their target ---
    for (const b of Object.values(breakers)) {
      b.pivot.rotation.x += (b.leverTarget - b.pivot.rotation.x) * lerpK(delta, 10);
    }

    // CCTV pressure: no strike, just suspicion (and the audio state that follows).
    securitySweep.update(delta);
    if (!finished && securitySweep.sees(camera.position)) {
      aiState.raise(14 * delta);
      cctvWarnTimer += delta;
      if (cctvWarnTimer > 1.1) {
        sound.playDetectionWarning(aiState.suspicion / 100);
        cctvWarnTimer = 0;
      }
    } else {
      cctvWarnTimer = 0;
    }

    aiState.decay(2 * delta);
  }

  function dispose() {
    roomProps.dispose();
    robotRepair.dispose();
    coreOverride.dispose();
    deskBot.dispose();
    displayTerminal.dispose();
    firstAid.dispose();
    extinguisher.dispose();
    toolboxes.dispose();
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
    ready: Promise.all([pedestal.ready, ceiling.ready, ceilingLamps.ready, cornerPillars.ready, rightSupercomputer.ready, leftWorkstation.ready, woodenCrates.ready, earthHologram.ready, workstationChair.ready, toolboxes.ready, extinguisher.ready, firstAid.ready, displayTerminal.ready, deskBot.ready]),
    colliders,
    get panelOpen() { return robotRepair.isOpen || coreOverride.isOpen; },
    cctvCamera: cctvView,
    update,
    dispose,
    spawn: new THREE.Vector3(0, 1.7, 5.5),
    title: 'LEVEL 3 — THE CORE',
    subtitle: 'Isolate the AI without cutting the stabilized municipal grid.',
    objective: 'Disable shockwaves: read the maintenance schedule and isolate feeders from highest load to lowest. Then repair the robot and solve the circuit on the large wall hologram.',
  };
}
