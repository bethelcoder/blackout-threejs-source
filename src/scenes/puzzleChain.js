import * as THREE from 'three';
import {
  buildCrowbar, buildPadlock, buildTXModule, buildStickyNote3D,
  canvasTexture, disposeTree, std, paintedDoorTexture,
  foamTexture, plankTexture, assignmentSheetTexture,
  SHAPE_NAMES, buildShapeNote3D, buildWrench, buildGreenToolbox,
  buildShapePadlock, buildWorkstationBox, buildLockerInterior,
  buildSocketStrip, buildExtensionLead, buildCableRun, buildMainsPlug,
  buildOpenSupplyCrate,
} from './puzzleItems.js';
import { loadModel } from '../systems/modelCache.js';
import { fitModel } from '../systems/fitModel.js';
import { PEGBOARD } from './design.js';
import {
  BENCH, BENCH_TOOLS, COMPUTER, ROOM,
  SERVICE_BAY, SOCKET_STRIP, STICKY_FALLBACK, SUPPLY_CRATE, TX03,
} from './level2Layout.js';
import { showStickyNote } from '../riddles/stickyNote.js';
import { showAssignmentBoard, RACK_ASSIGNMENTS, STARRED_LOCKER } from '../riddles/rackAssignments.js';
import { showShapeNote, showShapePadlock, SHAPE_COMBO } from '../riddles/shapeNote.js';

const DOOR_T = TX03.door.t;
const DOOR_W = TX03.door.w;
const DOOR_H = TX03.door.h;
const DOOR_Y0 = TX03.door.y0;
const HINGE_X = TX03.faceX - 0.002;

const CRATE = { x: -5.1, y: 0.4, z: 7.2, size: 0.8, ry: -0.25 };
const BENCH_BOX = { x: -6.28, y: 0.94, z: 1.43, wallH: 0.16 };
const GREEN_CASE = { x: -5.60, y: 0, z: 6.05, ry: 0.30 };

const SHAPE_NOTE = new THREE.Vector3(6.855, 1.77, 6.58);
const WALL_X = ROOM.wallX - 0.08;

const WRENCH_SLOT = PEGBOARD.slots.find((s) => s.tool === 'wrench');
const TOOL_SLOTS = PEGBOARD.slots.filter((s) => s.file);

const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Used for tools that don't need a hang flip.
const IDENTITY_Q = new THREE.Quaternion();

function localBox(object) {
  object.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(object.matrixWorld).invert();
  const toLocal = new THREE.Matrix4();
  const box = new THREE.Box3();
  const scratch = new THREE.Box3();
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    child.geometry.computeBoundingBox();
    if (!child.geometry.boundingBox) return;
    toLocal.multiplyMatrices(inv, child.matrixWorld);
    scratch.copy(child.geometry.boundingBox).applyMatrix4(toLocal);
    box.union(scratch);
  });
  return box.isEmpty() ? null : box;
}

export function buildPuzzleChain({ scene, hud, sound, colliders = [], layout = {} }) {
  const bayPlacement = layout.bay ?? SERVICE_BAY;
  const notePlacement = layout.note ?? STICKY_FALLBACK;

  const state = {
    toolsHung: 0,
    hasCutters: false,
    padlockCut: false,
    hasCrowbar: false,
    crateOpened: false,
    carryingModule: false,
    moduleInstalled: false,
    toolboxUnlocked: false,
    caseOpened: false,
    hasWrench: false,
    wrenchHung: false,
    cuttersRevealed: false,
    hasLead: false,
    powerConnected: false,
  };
  const root = new THREE.Group(); root.name = 'Level 2 puzzle chain';
  scene.add(root);
  const invisible = new THREE.MeshBasicMaterial({ visible: false });
  const pending = [];
  let elapsed = 0;

  // Single-handed pickup slot. Picking B while A is in hand returns A first.
  let heldReturn = null;
  function holdItem(restore) { if (heldReturn) heldReturn(); heldReturn = restore; }
  function releaseHeld() { heldReturn = null; }

  const box = (parent, w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); parent.add(m); return m;
  };
  const cyl = (parent, r, len, mat, x, y, z, rx = 0, ry = 0, rz = 0, seg = 12) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m); return m;
  };
  const proxy = (parent, w, h, d, x, y, z) => box(parent, w, h, d, invisible, x, y, z);

  const steel = std(0xb8c0c8, 0.4, 0.5);
  const innerMat = std(0x1c2024, 0.85, 0.15);
  const bodyMat  = std(0x4a534e, 0.65, 0.3);

  // ====================================================================
  // WORKSTATION BOX + BOLT CUTTERS
  // ====================================================================
  const wsBox = buildWorkstationBox({ wallH: BENCH_BOX.wallH });
  wsBox.position.set(BENCH_BOX.x, BENCH_BOX.y, BENCH_BOX.z);
  root.add(wsBox);

  const cutterPivot = new THREE.Group();
  cutterPivot.position.set(BENCH_BOX.x, BENCH_BOX.y + wsBox.userData.floorTop, BENCH_BOX.z);
  cutterPivot.rotation.y = 0.18;
  root.add(cutterPivot);

  proxy(cutterPivot, 0.16, 0.11, 0.60, 0, 0.055, 0);
  cutterPivot.userData.interactable = false;
  cutterPivot.userData.reach = 2.0;
  cutterPivot.userData.getLabel = () => (state.hasCutters ? 'Bolt cutters taken' : 'Take bolt cutters');
  cutterPivot.userData.onInteract = () => {
    if (state.hasCutters) return;
    state.hasCutters = true;
    cutterPivot.visible = false;
    cutterPivot.userData.interactable = false;
    holdItem(() => {
      state.hasCutters = false;
      cutterPivot.visible = true;
      cutterPivot.userData.interactable = true;
    });
    sound.playInteract();
    hud.setObjective(`Bolt cutters acquired.It will come in handy in locked items`);
  };

  pending.push(loadModel(new URL('../assets/models/bolt_cutter_low-poly.glb', import.meta.url).href)
    .then(gltf => {
      const cutters = gltf.scene.clone(true);
      fitModel(cutters, { max: 0.6 }, -Math.PI / 2);
      const h = new THREE.Box3().setFromObject(cutters).max.y;
      const room = BENCH_BOX.wallH - wsBox.userData.floorTop - 0.008;
      if (h > room) cutters.scale.multiplyScalar(room / h);
      cutterPivot.add(cutters);
    })
    .catch(err => console.warn('Bolt cutters failed to load:', err)));

  // ====================================================================
  // TX-03 TOOL LOCKER
  // ====================================================================
  const txInterior = buildLockerInterior({
    w: TX03.cavity.z1 - TX03.cavity.z0,
    h: TX03.cavity.topY - TX03.cavity.bottomY,
    d: TX03.faceX - TX03.cavity.backX,
  });
  txInterior.position.set(TX03.faceX, TX03.cavity.bottomY, TX03.z);
  txInterior.rotation.y = Math.PI / 2;
  root.add(txInterior);
  const interiorLight = txInterior.userData.light;
  interiorLight.visible = false;

  const crowbarMount = new THREE.Group();
  crowbarMount.name = 'TX-03 crowbar';
  const hungCrowbar = buildCrowbar();
  hungCrowbar.rotation.z = Math.PI;
  hungCrowbar.position.set(-0.03, 0.005, 0);
  crowbarMount.add(hungCrowbar);
  txInterior.userData.crowbarAnchor.add(crowbarMount);
  const crowbarHit = proxy(crowbarMount, 0.90, 0.26, 0.10, 0, -0.07, 0);
  crowbarHit.userData.interactable = false;
  crowbarHit.userData.reach = 2.4;
  crowbarHit.userData.label = 'Take crowbar';
  crowbarHit.userData.onInteract = () => {
    if (state.hasCrowbar || doorAngle < 0.9) return;
    state.hasCrowbar = true;
    crowbarMount.visible = false;
    crowbarHit.userData.interactable = false;
    holdItem(() => {
      state.hasCrowbar = false;
      crowbarMount.visible = true;
      crowbarHit.userData.interactable = true;
    });
    sound.playInteract();
    hud.setObjective('Crowbar acquired.');
  };

  // ---- full-height door ----
  const doorFace = new THREE.MeshStandardMaterial({
    map: paintedDoorTexture({
      label: STARRED_LOCKER,
      sub: '\u2605 PRIORITY',
      h: Math.round(512 * DOOR_H / DOOR_W),
    }),
    roughness: 0.6, metalness: 0.3,
  });
  const hinge = new THREE.Group();
  hinge.position.set(HINGE_X, DOOR_Y0 + DOOR_H / 2, TX03.z - DOOR_W / 2);
  root.add(hinge);

  const leaf = new THREE.Mesh(
    new THREE.BoxGeometry(DOOR_T, DOOR_H, DOOR_W),
    [doorFace, innerMat, bodyMat, bodyMat, bodyMat, bodyMat]
  );
  leaf.name = 'TX-03 door';
  leaf.position.set(DOOR_T / 2, 0, DOOR_W / 2);
  hinge.add(leaf);

  for (const y of [-1.25, -0.42, 0.42, 1.25]) cyl(hinge, 0.013, 0.11, steel, 0.004, y, 0.004, 0, 0, 0, 10);

  const haspMat = std(0xb8c0c8, 0.4, 0.5);
  const haspDark = std(0x23272b, 0.6, 0.4);
  const slotZ = DOOR_W - 0.07;
  // Hasp aligned with design.js's lockerHasp: 0.565 * (cabinet height 3.5).
  // Also stores padlockHit + falling references so nothing else changes.
  const haspY = 3.5 * 0.565 - (DOOR_Y0 + DOOR_H / 2);
  box(hinge, 0.008, 0.13, 0.065, haspMat, DOOR_T + 0.004, haspY - 0.005, slotZ);
  box(hinge, 0.008, 0.10, 0.058, haspDark, DOOR_T + 0.013, haspY + 0.004, slotZ + 0.004);
  box(hinge, 0.012, 0.042, 0.014, std(0x0b0d0f, 0.9, 0.1), DOOR_T + 0.013, haspY - 0.004, slotZ + 0.004);
  for (const s of [-1, 1]) cyl(hinge, 0.005, 0.007, haspMat, DOOR_T + 0.006, haspY - 0.05, slotZ + s * 0.024, 0, 0, Math.PI / 2, 8);
  const stapleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(DOOR_T + 0.006, haspY - 0.030, slotZ),
    new THREE.Vector3(DOOR_T + 0.024, haspY - 0.030, slotZ),
    new THREE.Vector3(DOOR_T + 0.031, haspY - 0.014, slotZ),
    new THREE.Vector3(DOOR_T + 0.024, haspY + 0.002, slotZ),
    new THREE.Vector3(DOOR_T + 0.006, haspY + 0.002, slotZ),
  ]);
  hinge.add(new THREE.Mesh(new THREE.TubeGeometry(stapleCurve, 20, 0.004, 8, false), steel));

  cyl(hinge, 0.012, 0.05, haspDark, DOOR_T + 0.03, -0.55, slotZ - 0.10, 0, 0, Math.PI / 2, 10);
  box(hinge, 0.022, 0.17, 0.028, haspMat, DOOR_T + 0.05, -0.55, slotZ - 0.10);

  const padlock = buildPadlock();
  padlock.position.set(DOOR_T + 0.020, haspY - 0.101, slotZ);
  padlock.rotation.y = Math.PI / 2;
  hinge.add(padlock);
  const padlockHit = proxy(hinge, 0.07, 0.15, 0.10, DOOR_T + 0.022, haspY - 0.068, slotZ);
  padlockHit.userData.interactable = true;
  padlockHit.userData.reach = 2.2;

  const doorCollider = new THREE.Box3(
    new THREE.Vector3(HINGE_X - 0.004, DOOR_Y0, TX03.z - DOOR_W / 2),
    new THREE.Vector3(HINGE_X + DOOR_T + 0.06, DOOR_Y0 + DOOR_H, TX03.z + DOOR_W / 2)
  );
  colliders.push(doorCollider);
  let doorColliderLive = true;

  leaf.userData.interactable = true;
  leaf.userData.reach = 2.2;
  leaf.userData.getLabel = () => {
    if (state.hasCrowbar) return `${STARRED_LOCKER} tool locker (empty)`;
    if (!state.padlockCut) {
      return state.hasCutters
        ? `${STARRED_LOCKER} tool locker \u2014 cut the padlock`
        : `${STARRED_LOCKER} tool locker \u2014 padlocked (need bolt cutters)`;
    }
    return `${STARRED_LOCKER} tool locker \u2014 open`;
  };
  leaf.userData.onInteract = () => {
    if (state.padlockCut) return;
    sound.playDetectionWarning(0.3);
    hud.setObjective(state.hasCutters
      ?''
      : `The ${STARRED_LOCKER} padlock is hardened steel. Bolt cutters would shear it.`);
  };

  padlockHit.userData.getLabel = () => {
    if (state.padlockCut) return 'Padlock (cut)';
    return state.hasCutters ? 'Cut padlock with bolt cutters' : 'Padlock \u2014 need bolt cutters';
  };
  padlockHit.userData.onInteract = () => {
    if (state.padlockCut) return;
    if (!state.hasCutters) {
      sound.playDetectionWarning(0.3);
      hud.setObjective('The padlock is hardened steel.Find bolt cutters first.');
      return;
    }
    state.padlockCut = true;
    releaseHeld();
    padlockHit.userData.interactable = false;
    padlockHit.visible = false;
    padlock.userData.cut();
    root.attach(padlock);
    falling.push({ obj: padlock, vy: 0, vx: 0.35, vz: 0.1, floorY: 0.027, bounces: 0, target: new THREE.Euler(-Math.PI / 2, 0.6, 0.2) });
    sound.playAccessGranted();
    hud.setObjective(`Padlock cut. The ${STARRED_LOCKER} door swings open \u2014 the crowbar is on the rail inside.`);
  };

  // ====================================================================
  // SHADOW-BOARD TOOLS
  // ====================================================================
  const tools = [];
  const boardTidy = () => tools.length === TOOL_SLOTS.length && tools.every((t) => t.hung);

  TOOL_SLOTS.forEach((slot, i) => {
    const spot = BENCH_TOOLS[i % BENCH_TOOLS.length];
    const lay = new THREE.Group();
    lay.name = `Bench ${slot.tool}`;
    root.add(lay);
    const holder = new THREE.Group();
    lay.add(holder);
    const entry = { slot, lay, holder, hung: false, taken: false, anim: null, pick: null, hangQ: new THREE.Quaternion() };

    // The hammer's inner spin (0, PI/2, PI) is what makes it look right on
    // the bench (head at the wall, claw down). That same PI flip makes it
    // hang upside-down when the lay group slerps back to identity on the
    // pegboard. Rx(PI) cancels the flip for the hang pose while keeping the
    // wide face pointing at the player.
    if (slot.tool === 'hammer') {
      entry.hangQ.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
    }

    tools.push(entry);

    pending.push(loadModel(new URL(`../assets/models/${slot.file}`, import.meta.url).href)
      .then(gltf => {
        const inner = gltf.scene.clone(true);
        inner.rotation.set(slot.spin?.x || 0, slot.spin?.y || 0, slot.spin?.z || 0);
        holder.add(inner);
        fitModel(holder, slot.size, 0);
        const size = new THREE.Box3().setFromObject(holder).getSize(new THREE.Vector3());
        entry.pick = proxy(holder, Math.max(size.x, 0.16), size.y + 0.06, Math.max(size.z, 0.16), 0, size.y / 2, 0);

        const take = () => {
          if (entry.taken) return;
          entry.taken = true;
          lay.visible = false;
          holder.userData.interactable = false;
          entry.pick.userData.interactable = false;
          holdItem(() => {
            entry.taken = false;
            lay.visible = true;
            holder.userData.interactable = true;
            entry.pick.userData.interactable = true;
          });
          sound.playInteract();
          hud.setObjective(`Hang the ${slot.tool} on its painted outline on the tool shadow board.`);
        };
        holder.userData.interactable = true;
        holder.userData.reach = 2.4;
        holder.userData.getLabel = () => (entry.taken ? `${cap(slot.tool)} (in hand)` : `Take the ${slot.tool}`);
        holder.userData.onInteract = take;
        entry.pick.userData.interactable = true;
        entry.pick.userData.reach = 2.4;
        entry.pick.userData.getLabel = holder.userData.getLabel;
        entry.pick.userData.onInteract = take;

        const upright = size.y >= size.x && size.y >= size.z;
        lay.rotation.set(0, spot.ry, upright ? -Math.PI / 2 : 0);

        root.updateMatrixWorld(true);
        const world = new THREE.Box3().setFromObject(holder);
        const c = world.getCenter(new THREE.Vector3());
        lay.position.set(spot.x - c.x, BENCH.topY - world.min.y, spot.z - c.z);
        lay.updateMatrixWorld(true);
      })
      .catch(err => console.warn(`Bench tool ${slot.file} failed:`, err)));
  });

  TOOL_SLOTS.forEach((slot, i) => {
    const anchor = new THREE.Group();
    anchor.position.set(PEGBOARD.toolX, PEGBOARD.centreY - slot.size.h / 2, slot.z);
    root.add(anchor);
    const hit = proxy(anchor, 0.16, slot.size.h + 0.08, 0.20, 0.06, slot.size.h / 2, 0);
    hit.userData.interactable = true;
    hit.userData.reach = 2.4;
    const entry = tools[i];
    hit.userData.getLabel = () => {
      if (entry.hung) return `${cap(slot.tool)} (on its outline)`;
      if (entry.taken) return `Hang the ${slot.tool} here`;
      return `${cap(slot.tool)} outline \u2014 tool missing`;
    };
    hit.userData.onInteract = () => {
      if (entry.hung) return;
      if (!entry.taken) {
        sound.playDetectionWarning(0.3);
        hud.setObjective(`The tools would look better on the wall.`);
        return;
      }
      entry.hung = true;
      entry.anim = {
        t: 0, dur: 0.8,
        p0: entry.lay.position.clone(),
        p1: anchor.position.clone(),
        q0: entry.lay.quaternion.clone(),
        q1: entry.hangQ.clone(),
      };
      state.toolsHung = tools.filter((t) => t.hung).length;
      hit.userData.interactable = false;
      hit.visible = false;
      entry.lay.visible = true;
      releaseHeld();
      entry.holder.userData.interactable = false;
      if (entry.pick) entry.pick.userData.interactable = false;
      sound.playSwitch();
      const left = TOOL_SLOTS.length - state.toolsHung;
      hud.setObjective(left > 0
        ? `${cap(slot.tool)} hung. ${left} outline${left === 1 ? '' : 's'} still empty.`
        : `${cap(slot.tool)} hung and the board is complete \u2014 except for one outline. The wrench is missing.`);
    };
  });

  // ====================================================================
  // WRENCH OUTLINE
  // ====================================================================
  const wrenchAnchor = new THREE.Group();
  wrenchAnchor.position.set(PEGBOARD.toolX, PEGBOARD.centreY, WRENCH_SLOT.z);
  root.add(wrenchAnchor);
  const slotHit = proxy(wrenchAnchor, 0.12, 0.32, 0.18, 0.04, 0, 0);
  slotHit.userData.interactable = true;
  slotHit.userData.reach = 2.2;
  slotHit.userData.getLabel = () => {
    if (state.wrenchHung) return 'Wrench (back on the board)';
    if (!boardTidy()) return `Tool shadow board \u2014 ${TOOL_SLOTS.length} tools off their outlines`;
    return state.hasWrench ? 'Hang the wrench on its outline' : 'Empty tool outline \u2014 wrench missing';
  };
  slotHit.userData.onInteract = () => {
    if (state.wrenchHung) return;
    if (!boardTidy()) {
      sound.playDetectionWarning(0.3);
      hud.setObjective('The board doubles as the sign-out sheet and three tools are still lying on the workbench. Hang each one on its own outline first.');
      return;
    }
    if (!state.hasWrench) {
      sound.playDetectionWarning(0.3);
      hud.setObjective('Four outlines, three tools. The wrench is signed out \u2014 the case 12 tag on the notice board lists three shapes, and there is a green tool case on the floor.');
      return;
    }
    state.wrenchHung = true;
    state.hasWrench = false;
    releaseHeld();
    slotHit.userData.interactable = false;
    slotHit.visible = false;

    const hung = buildWrench();
    hung.name = 'Hung wrench';
    hung.rotation.y = Math.PI / 2;
    hung.position.set(PEGBOARD.toolX, PEGBOARD.centreY, WRENCH_SLOT.z);
    root.add(hung);

    sound.playInteract();
    boxAnim.phase = 'open'; boxAnim.t = 0;
    hud.setObjective('The wrench seats on its outline and the board is complete. A latch let go in the tool box on the workbench \u2014 go and look.');
  };

  // ====================================================================
  // EQUIPMENT REGISTER
  // ====================================================================
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297),
    new THREE.MeshStandardMaterial({ map: assignmentSheetTexture(RACK_ASSIGNMENTS, STARRED_LOCKER), roughness: 1 }));
  sheet.name = 'Equipment register';
  if (layout.sheetAnchor) {
    layout.sheetAnchor.add(sheet);
  } else {
    sheet.position.set(-6.62, 1.02, 3.18);
    sheet.rotation.set(-0.45, Math.PI / 2, 0, 'YXZ');
    root.add(sheet);
  }
  sheet.userData.interactable = true;
  sheet.userData.reach = 2.2;
  sheet.userData.label = 'Read the equipment register';
  sheet.userData.onInteract = () => {
    sound.playInteract();
    showAssignmentBoard();
    hud.setObjective(`Equipment register: the 0.8 m crowbar is signed out to \u2605 ${STARRED_LOCKER}.`);
  };

  // ====================================================================
  // CASE 12 TAG
  // ====================================================================
  const shapeNote = buildShapeNote3D(SHAPE_COMBO);
  shapeNote.position.copy(SHAPE_NOTE);
  shapeNote.rotation.y = -Math.PI / 2;
  shapeNote.rotation.z = -0.06;
  const shapePin = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), std(0x2f6fb3, 0.4, 0.2));
  shapePin.position.set(0, 0.062, 0.006);
  shapeNote.add(shapePin);
  const shapeNoteHit = proxy(shapeNote, 0.20, 0.20, 0.05, 0, 0, 0.008);
  shapeNoteHit.userData.interactable = true;
  shapeNoteHit.userData.reach = 2.0;
  shapeNoteHit.userData.label = 'Read the case 12 tag';
  shapeNoteHit.userData.onInteract = () => { sound.playInteract(); showShapeNote(); };
  root.add(shapeNote);

  // ====================================================================
  // GREEN TOOL CASE
  // ====================================================================
  const toolCase = buildGreenToolbox();
  toolCase.position.set(GREEN_CASE.x, GREEN_CASE.y, GREEN_CASE.z);
  toolCase.rotation.y = GREEN_CASE.ry;
  root.add(toolCase);
  colliders.push(new THREE.Box3(
    new THREE.Vector3(GREEN_CASE.x - 0.32, 0, GREEN_CASE.z - 0.24),
    new THREE.Vector3(GREEN_CASE.x + 0.32, 0.40, GREEN_CASE.z + 0.24)
  ));

  toolCase.userData.interactable = true;
  toolCase.userData.reach = 2.4;
  toolCase.userData.getLabel = () => {
    if (state.hasWrench) return 'Tool case (empty)';
    if (state.toolboxUnlocked) return 'Open the tool case';
    return 'Green tool case \u2014 padlocked';
  };
  toolCase.userData.onInteract = () => {
    if (state.toolboxUnlocked || state.hasWrench) return;
    sound.playDetectionWarning(0.3);
    hud.setObjective('Three dials on the padlock. The case 12 tag pinned to the notice board has the code.');
  };

  const casePadlock = buildShapePadlock(SHAPE_NAMES);
  casePadlock.position.copy(toolCase.userData.haspAnchor);
  toolCase.add(casePadlock);
  casePadlock.userData.interactable = true;
  casePadlock.userData.reach = 2.2;
  casePadlock.userData.getLabel = () => (state.toolboxUnlocked ? 'Padlock (open)' : 'Shape padlock \u2014 enter the code');
  casePadlock.userData.onInteract = () => {
    if (state.toolboxUnlocked) return;
    sound.playInteract();
    const currentIndices = casePadlock.userData.dials.map((d) => d.index);
    showShapePadlock({
      initial: currentIndices,
      onChange: (indices) => {
        indices.forEach((idx, i) => {
          const dial = casePadlock.userData.dials[i];
          if (dial) dial.set(idx);
        });
      },
      onResult: (solved) => {
        if (solved) unlockCase();
      },
    });
  };

  function unlockCase() {
    state.toolboxUnlocked = true;
    casePadlock.userData.interactable = false;
    toolCase.userData.interactable = false;
    for (const dial of casePadlock.userData.dials) dial.group.userData.interactable = false;
    caseAnim.phase = 'pop'; caseAnim.t = 0;
    sound.playAccessGranted();
    hud.setObjective('The marks line up and the shackle pops free. Open the case and take the wrench.');
  }

  const caseWrench = buildWrench();
  caseWrench.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  caseWrench.position.set(0, toolCase.userData.foamTop + 0.008, 0);
  toolCase.add(caseWrench);
  const wrenchHit = proxy(caseWrench, 0.06, 0.30, 0.11, 0, 0, 0);
  wrenchHit.userData.interactable = false;
  wrenchHit.userData.reach = 2.2;
  wrenchHit.userData.label = 'Take the wrench';
  wrenchHit.userData.onInteract = () => {
    if (state.hasWrench) return;
    state.hasWrench = true;
    caseWrench.visible = false;
    wrenchHit.userData.interactable = false;
    wrenchHit.visible = false;
    holdItem(() => {
      state.hasWrench = false;
      caseWrench.visible = true;
      wrenchHit.userData.interactable = true;
      wrenchHit.visible = true;
    });
    sound.playInteract();
    hud.setObjective('Wrench acquired. Hang it on the one outline still empty on the tool shadow board.');
  };

  // ====================================================================
  // SEALED CRATE (holds the TX-CORE module)
  // ====================================================================
  const S = CRATE.size, half = S / 2, wallT = 0.035;
  const crate = new THREE.Group();
  crate.name = 'Sealed crate';
  crate.position.set(CRATE.x, CRATE.y, CRATE.z);
  crate.rotation.y = CRATE.ry;
  root.add(crate);

  const plankMat = new THREE.MeshStandardMaterial({ map: plankTexture(5), roughness: 0.95 });
  const battenMat = std(0x6b5133, 0.9, 0);
  const screwMat = std(0x6a6f74, 0.5, 0.5);

  box(crate, S, wallT, S, plankMat, 0, -half + wallT / 2, 0);
  for (const s of [-1, 1]) {
    box(crate, wallT, S - wallT, S - 2 * wallT, plankMat, s * (S / 2 - wallT / 2), wallT / 2, 0);
    box(crate, S, S - wallT, wallT, plankMat, 0, wallT / 2, s * (S / 2 - wallT / 2));
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(crate, 0.09, S, 0.09, battenMat, sx * S / 2, 0, sz * S / 2);
  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) box(crate, S + 0.09, 0.08, 0.08, battenMat, 0, sy * (S / 2 - 0.04), sz * S / 2);
    for (const sx of [-1, 1]) box(crate, 0.08, 0.08, S + 0.09, battenMat, sx * S / 2, sy * (S / 2 - 0.04), 0);
  }
  for (const sx of [-1, 1]) {
    const brace = box(crate, 0.03, S * 1.25, 0.07, battenMat, sx * (S / 2 + 0.015), 0, 0);
    brace.rotation.x = sx * 0.75;
  }

  const foam = new THREE.MeshStandardMaterial({ map: foamTexture(), roughness: 1 });
  const pit = S - 2 * wallT - 0.02;
  const pocketX = 0.33, pocketZ = 0.27;
  const foamBase = -half + wallT + 0.06;
  const foamTop = foamBase + 0.06;
  box(crate, pit, 0.12, pit, foam, 0, foamBase, 0);
  const sideW = (pit - pocketX) / 2, endD = (pit - pocketZ) / 2;
  for (const s of [-1, 1]) {
    box(crate, sideW, 0.09, pit, foam, s * (pocketX / 2 + sideW / 2), foamTop + 0.045, 0);
    box(crate, pocketX, 0.09, endD, foam, 0, foamTop + 0.045, s * (pocketZ / 2 + endD / 2));
  }

  const module = buildTXModule();
  module.position.set(0, foamTop + module.userData.size.H / 2, 0);
  crate.add(module);
  const moduleHit = proxy(module, 0.4, 0.2, 0.3, 0, 0.03, 0);
  moduleHit.userData.interactable = false;
  moduleHit.userData.reach = 2.2;
  moduleHit.userData.label = 'Take TX-CORE module';

  const lidHinge = new THREE.Group();
  lidHinge.name = 'Crate lid';
  lidHinge.position.set(0, half + 0.03, S / 2 - 0.02);
  crate.add(lidHinge);
  const lid = new THREE.Group();
  lid.position.set(0, 0, -(S / 2 - 0.02));
  lidHinge.add(lid);
  box(lid, S + 0.06, 0.04, S + 0.06, plankMat, 0, 0.02, 0);
  for (const x of [-0.3, 0.3]) {
    box(lid, 0.09, 0.025, S + 0.06, battenMat, x, 0.052, 0);
    for (let i = 0; i < 6; i++) cyl(lid, 0.006, 0.008, screwMat, x, 0.067, -0.36 + i * 0.144, 0, 0, 0, 6);
  }
  for (const x of [-0.32, 0.32]) cyl(lidHinge, 0.013, 0.11, steel, x, 0, 0, 0, 0, Math.PI / 2, 10);

  const crateHit = proxy(crate, 0.95, 0.95, 0.95, 0, 0, 0);
  crateHit.userData.interactable = true;
  crateHit.userData.reach = 2.2;
  crateHit.userData.getLabel = () => {
    if (state.crateOpened) return 'Crate (open)';
    return state.hasCrowbar ? 'Pry open the sealed crate' : 'Sealed crate \u2014 need a crowbar';
  };
  crateHit.userData.onInteract = () => {
    if (state.crateOpened) return;
    if (!state.hasCrowbar) {
      sound.playDetectionWarning(0.3);
      hud.setObjective('The lid is screwed and battened shut. A crowbar would lift it \u2014 the equipment register says where one is signed out.');
      return;
    }
    state.crateOpened = true;
    crateHit.userData.interactable = false;
    crateHit.visible = false;
    crateAnim.phase = 'open'; crateAnim.t = 0;
    sound.playSwitch();
    hud.setObjective('The lid swings back on its hinges. Lift the TX-CORE module out of the foam.');
  };

  moduleHit.userData.onInteract = () => {
    if (!moduleHit.userData.interactable || state.carryingModule) return;
    state.carryingModule = true;
    module.visible = false;
    moduleHit.userData.interactable = false;
    moduleHit.visible = false;
    holdItem(() => {
      state.carryingModule = false;
      module.visible = true;
      moduleHit.userData.interactable = true;
      moduleHit.visible = true;
    });
    sound.playInteract();
    hud.setObjective('TX-CORE module in hand. Seat it in the service bay on the wall above the terminal.');
  };

  // ====================================================================
  // SERVICE BAY + MAINTENANCE TAG
  // ====================================================================
  const bay = new THREE.Group();
  bay.position.copy(bayPlacement.position);
  bay.rotation.y = bayPlacement.yaw;
  root.add(bay);
  const bayMat = std(0x6d7782, 0.55, 0.35);
  const bw = 0.5, bh = 0.30, bd = 0.34;
  box(bay, bw, 0.02, bd, bayMat, 0, bh / 2 - 0.01, bd / 2);
  box(bay, bw, 0.02, bd, bayMat, 0, -bh / 2 + 0.01, bd / 2);
  for (const s of [-1, 1]) box(bay, 0.02, bh, bd, bayMat, s * (bw / 2 - 0.01), 0, bd / 2);
  box(bay, bw, bh, 0.02, innerMat, 0, 0, 0.01);
  const slotW = 0.27, slotH = 0.1, slotY = -0.02;
  box(bay, bw, bh / 2 - (slotY + slotH / 2), 0.012, bayMat, 0, (slotY + slotH / 2 + bh / 2) / 2, bd + 0.006);
  box(bay, bw, (slotY - slotH / 2) + bh / 2, 0.012, bayMat, 0, (-bh / 2 + slotY - slotH / 2) / 2, bd + 0.006);
  for (const s of [-1, 1]) box(bay, (bw - slotW) / 2, slotH, 0.012, bayMat, s * (slotW / 2 + (bw - slotW) / 4), slotY, bd + 0.006);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, toneMapped: false });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), ledMat);
  led.position.set(bw / 2 - 0.05, bh / 2 - 0.04, bd + 0.016);
  bay.add(led);
  const bayPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.05), new THREE.MeshStandardMaterial({
    map: canvasTexture(256, 44, (g, w, h) => {
      g.fillStyle = '#1b2025'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#d8dcd6'; g.font = 'bold 20px monospace'; g.textAlign = 'center';
      g.fillText('TX-CORE SERVICE BAY', w / 2, 29);
    }), roughness: 0.6,
  }));
  bayPlate.position.set(-0.05, bh / 2 - 0.04, bd + 0.0125);
  bay.add(bayPlate);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) cyl(bay, 0.008, 0.01, steel, sx * (bw / 2 - 0.02), sy * (bh / 2 - 0.02), bd + 0.012, Math.PI / 2, 0, 0, 8);
  const bayHit = proxy(bay, 0.56, 0.36, 0.5, 0, 0, 0.2);
  bayHit.userData.interactable = true;
  bayHit.userData.reach = 2.6;
  bayHit.userData.getLabel = () => {
    if (state.moduleInstalled) return 'TX-CORE bay (module seated)';
    return state.carryingModule ? 'Install TX-CORE module' : 'TX-CORE bay \u2014 module missing';
  };
  bayHit.userData.onInteract = () => {
    if (state.moduleInstalled) return;
    if (!state.carryingModule) {
      sound.playDetectionWarning(0.3);
      hud.setObjective('The TX-CORE bay is empty. The maintenance tag on the terminal says the spare came in the Thursday delivery, still crated.');
      return;
    }
    state.carryingModule = false;
    releaseHeld();
    module.visible = true;
    bay.attach(module);
    module.position.set(0, slotY, bd + 0.35);
    module.rotation.set(0, -Math.PI / 2, 0);
    bayAnim.active = true; bayAnim.t = 0;
    sound.playSwitch();
  };

  const note = buildStickyNote3D();
  note.position.copy(notePlacement.position);
  note.rotation.set(0, notePlacement.yaw, 0.06);
  const noteHit = proxy(note, 0.16, 0.16, 0.06, 0, 0, 0.02);
  noteHit.userData.interactable = true;
  noteHit.userData.reach = 2.6;
  noteHit.userData.label = 'Read the maintenance tag';
  noteHit.userData.onInteract = () => { sound.playInteract(); showStickyNote(); };
  root.add(note);

  let computerBox = null;
  function attachStickyNote(computer) {
    if (computerBox || !computer) return false;
    const lb = localBox(computer);
    if (!lb) return false;
    computerBox = new THREE.Box3().setFromObject(computer);
    const at = new THREE.Vector3(lb.max.x + 0.006, lb.min.y + 0.055, (lb.min.z + lb.max.z) / 2);
    computer.localToWorld(at);
    note.position.copy(at);
    note.quaternion.setFromRotationMatrix(computer.matrixWorld);
    note.rotateY(Math.PI / 2);
    note.rotateZ(0.06);
    note.updateMatrixWorld(true);
    return true;
  }

  // ====================================================================
  // OPEN SUPPLY CRATE + ROLLED LEAD
  // Replaces the old orange toolbox in the front-right corner. The lead
  // sits inside the crate on top of a small pile of workshop gear, so it
  // never looks like it's floating in the air.
  // ====================================================================
  const supplyCrate = buildOpenSupplyCrate({ w: 0.90, d: 0.90, h: 0.55 });
  supplyCrate.position.set(SUPPLY_CRATE.x, 0.275, SUPPLY_CRATE.z);
  supplyCrate.rotation.y = SUPPLY_CRATE.ry;
  root.add(supplyCrate);
  colliders.push(new THREE.Box3(
    new THREE.Vector3(SUPPLY_CRATE.x - 0.48, 0, SUPPLY_CRATE.z - 0.48),
    new THREE.Vector3(SUPPLY_CRATE.x + 0.48, 0.55, SUPPLY_CRATE.z + 0.48)
  ));

  const lead = buildExtensionLead({ radius: 0.16, coils: 5 });
  // Crate interior top rim is at local +0.275 (world 0.55). Local y = 0.04
  // puts the coil near the middle of the crate — resting on the toolbox /
  // cardboard pile, well below the rim, no longer floating above the crate.
  lead.position.set(0.02, 0.04, 0.02);
  lead.rotation.y = 0.4;
  supplyCrate.add(lead);

  const leadHit = proxy(supplyCrate, 0.52, 0.30, 0.52, 0, 0.18, 0);
  leadHit.userData.interactable = true;
  leadHit.userData.reach = 2.4;
  leadHit.userData.getLabel = () => (state.hasLead ? 'Extension lead (in hand)' : 'Take the rolled extension lead');
  leadHit.userData.onInteract = () => {
    if (state.hasLead || state.powerConnected) return;
    state.hasLead = true;
    lead.visible = false;
    leadHit.visible = false;
    leadHit.userData.interactable = false;
    holdItem(() => {
      state.hasLead = false;
      lead.visible = true;
      leadHit.visible = true;
      leadHit.userData.interactable = true;
    });
    sound.playInteract();
    hud.setObjective('Feeder 2 extension lead in hand.');
  };

  // ====================================================================
  // MAINS POWER
  // ====================================================================
  const socketStrip = buildSocketStrip();
  socketStrip.position.copy(SOCKET_STRIP.position);
  socketStrip.rotation.y = SOCKET_STRIP.yaw;
  root.add(socketStrip);
  const socketHits = [];

  socketStrip.userData.sockets.forEach((socket) => {
    const hit = proxy(socket.group, 0.105, 0.105, 0.12, 0, 0, 0.02);
    hit.userData.interactable = true;
    hit.userData.reach = 2.2;
    hit.userData.getLabel = () => {
      if (state.powerConnected && socket.kind === 'live') return `Terminal supply (${socket.label}) \u2014 connected`;
      return `${socket.label} outlet${socket.kind === 'phase' ? ' \u2014 415 V three-phase' : ''}`;
    };
    hit.userData.onInteract = () => {
      if (state.powerConnected) {
        sound.playInteract();
        hud.setObjective('The terminal is already feeding off FEEDER 2.');
        return;
      }
      if (socket.kind === 'phase') {
        sound.playDetectionWarning(0.3);
        hud.setObjective('That is a 415 V three-phase commando outlet. The terminal takes a 13 A plug \u2014 use one of the 230 V sockets.');
        return;
      }
      if (socket.kind === 'dead') {
        sound.playDetectionWarning(0.3);
        hud.setObjective('Nothing on FEEDER 4. The earth-fault report on the notice board says it tripped twice and must not be re-energised.');
        return;
      }
      if (!state.hasLead) {
        sound.playDetectionWarning(0.3);
        hud.setObjective('FEEDER 2 is live, but there is nothing to plug in. Pull the lead from the supply crate in the front-right corner.');
        return;
      }
      connectPower(socket);
    };
    socketHits.push(hit);
  });

  function connectPower(socket) {
    state.powerConnected = true;
    state.hasLead = false;
    releaseHeld();
    for (const hit of socketHits) { hit.userData.interactable = false; hit.visible = false; }
    socketStrip.userData.setLive(true);

    const atSocket = new THREE.Vector3(0, 0, 0.030);
    socket.group.localToWorld(atSocket);
    const wallPlug = buildMainsPlug(0xf0a020);
    wallPlug.quaternion.setFromRotationMatrix(socket.group.matrixWorld);
    wallPlug.rotateY(Math.PI);
    wallPlug.position.copy(atSocket);
    root.add(wallPlug);

    const back = computerBox
      ? new THREE.Vector3(computerBox.max.x + 0.03, computerBox.min.y + 0.10, (computerBox.min.z + computerBox.max.z) / 2)
      : new THREE.Vector3(COMPUTER.x + 0.30, COMPUTER.y + 0.10, COMPUTER.z);
    const psuPlug = buildMainsPlug(0x1c1f22);
    psuPlug.position.copy(back);
    psuPlug.rotation.y = Math.PI / 2;
    root.add(psuPlug);

    root.add(buildCableRun([
      new THREE.Vector3(atSocket.x, atSocket.y - 0.06, atSocket.z),
      new THREE.Vector3(WALL_X, atSocket.y - 0.30, atSocket.z + 0.07),
      new THREE.Vector3(WALL_X, 0.08, atSocket.z + 0.32),
      new THREE.Vector3(WALL_X - 0.03, 0.05, (atSocket.z + back.z) / 2 + 0.15),
      new THREE.Vector3(WALL_X - 0.04, 0.05, back.z + 0.30),
      new THREE.Vector3(WALL_X - 0.03, 0.38, back.z + 0.14),
      new THREE.Vector3(back.x + 0.05, back.y - 0.22, back.z + 0.02),
      back.clone(),
    ], { radius: 0.011 }));

    if (state.moduleInstalled) {
      sound.playAccessGranted();
      hud.setObjective('The terminal powers up on FEEDER 2. Sit at the desk and use the retro computer.');
    } else {
      sound.playDetectionWarning(0.6);
      hud.setObjective('\u26a0 PARTS MISSING \u2014 screen flashes a TX-CORE fault. The maintenance tag says the spare module was still crated.');
      setTimeout(() => { try { showStickyNote(); } catch (e) { /* overlay may be blocked */ } }, 420);
    }
  }

  // ====================================================================
  // PER-FRAME ANIMATION
  // ====================================================================
  let doorAngle = 0;
  const falling = [];
  const crateAnim = { phase: 'idle', t: 0 };
  const caseAnim = { phase: 'idle', t: 0 };
  const boxAnim = { phase: 'idle', t: 0 };
  const bayAnim = { active: false, t: 0 };

  function update(delta) {
    elapsed += delta;

    if (state.padlockCut) {
      doorAngle = THREE.MathUtils.damp(doorAngle, 1.95, 3.2, delta);
      hinge.rotation.y = doorAngle;
      interiorLight.visible = doorAngle > 0.05;
      if (doorAngle > 0.9 && !state.hasCrowbar && !crowbarHit.userData.interactable) crowbarHit.userData.interactable = true;
      if (doorColliderLive && doorAngle > 0.5) {
        doorColliderLive = false;
        const i = colliders.indexOf(doorCollider);
        if (i >= 0) colliders.splice(i, 1);
      }
    }

    for (const f of falling) {
      if (f.rest) continue;
      f.vy -= 9.8 * delta;
      f.obj.position.x += f.vx * delta; f.obj.position.z += f.vz * delta; f.obj.position.y += f.vy * delta;
      f.obj.rotation.x = THREE.MathUtils.damp(f.obj.rotation.x, f.target.x, 6, delta);
      f.obj.rotation.y = THREE.MathUtils.damp(f.obj.rotation.y, f.target.y, 6, delta);
      f.obj.rotation.z = THREE.MathUtils.damp(f.obj.rotation.z, f.target.z, 6, delta);
      if (f.obj.position.y <= f.floorY) {
        f.obj.position.y = f.floorY; f.vx *= 0.4; f.vz *= 0.4;
        if (++f.bounces >= 3 || Math.abs(f.vy) < 0.5) { f.rest = true; f.vy = 0; } else f.vy = -f.vy * 0.3;
      }
    }

    for (const entry of tools) {
      const anim = entry.anim;
      if (!anim) continue;
      anim.t += delta;
      const k = ease(anim.t / anim.dur);
      entry.lay.position.lerpVectors(anim.p0, anim.p1, k);
      entry.lay.quaternion.slerpQuaternions(anim.q0, anim.q1, k);
      if (k >= 1) {
        entry.anim = null;
        entry.lay.position.copy(anim.p1);
        entry.lay.quaternion.copy(anim.q1);
        sound.playInteract();
      }
    }

    if (crateAnim.phase === 'open') {
      crateAnim.t += delta;
      const k = Math.min(1, crateAnim.t / 1.1);
      lidHinge.rotation.x = ease(k) * 1.9;
      if (k >= 1) {
        crateAnim.phase = 'done';
        moduleHit.userData.interactable = true;
        sound.playInteract();
        hud.setObjective('Crate open. Take the TX-CORE module out of the foam.');
      }
    }

    if (caseAnim.phase === 'pop') {
      caseAnim.t += delta;
      const k = Math.min(1, caseAnim.t / 0.45);
      casePadlock.userData.setOpen(ease(k));
      if (k >= 1) {
        caseAnim.phase = 'open'; caseAnim.t = 0;
        root.attach(casePadlock);
        falling.push({ obj: casePadlock, vy: 0, vx: 0.2, vz: 0.3, floorY: 0.045, bounces: 0, target: new THREE.Euler(-Math.PI / 2, 0.5, 0.15) });
        sound.playSwitch();
      }
    } else if (caseAnim.phase === 'open') {
      caseAnim.t += delta;
      const k = Math.min(1, caseAnim.t / 1.1);
      toolCase.userData.lid.rotation.x = ease(k) * toolCase.userData.lidOpenAngle;
      if (k >= 1) {
        caseAnim.phase = 'done';
        state.caseOpened = true;
        wrenchHit.userData.interactable = true;
        sound.playInteract();
        hud.setObjective('Case open.Place it where it belongs.');
      }
    }

    if (boxAnim.phase === 'open') {
      boxAnim.t += delta;
      const k = Math.min(1, boxAnim.t / 1.0);
      wsBox.userData.lid.rotation.z = ease(k) * wsBox.userData.lidOpenAngle;
      if (k >= 1) {
        boxAnim.phase = 'done';
        state.cuttersRevealed = true;
        cutterPivot.userData.interactable = true;
        sound.playSwitch();
        hud.setObjective('The workstation box is open. Take the bolt cutters.');
      }
    }

    if (bayAnim.active) {
      bayAnim.t += delta;
      const k = Math.min(1, bayAnim.t / 0.9);
      module.position.z = THREE.MathUtils.lerp(bd + 0.35, bd - 0.12, ease(k));
      if (k >= 1) {
        bayAnim.active = false;
        state.moduleInstalled = true;
        module.userData.setLeds(0x33ff66);
        if (state.powerConnected) {
          sound.playAccessGranted();
          hud.setObjective('TX-CORE module seated and FEEDER 2 live. The terminal is online \u2014 sit at the desk and use the retro computer.');
        } else {
          sound.playSwitch();
          hud.setObjective('TX-CORE module seated, but the terminal is still dark.Find the lead for the power supply.');
        }
      }
    }

    if (!state.moduleInstalled) {
      const rate = state.powerConnected ? 10 : 5;
      ledMat.color.setHex(Math.sin(elapsed * rate) > 0 ? 0xff2a1a : 0x4a0d08);
    } else if (!state.powerConnected) {
      ledMat.color.setHex(Math.sin(elapsed * 2.5) > 0 ? 0xffa51a : 0x4a2c06);
    } else {
      ledMat.color.setHex(0x33ff66);
    }
  }

  function getTerminalLabel(laserSecurity) {
    if (laserSecurity.isActive()) return 'Terminal locked - disable laser security';
    if (!state.powerConnected && !state.moduleInstalled) return 'Terminal offline - read the maintenance tag';
    if (!state.powerConnected) return 'Terminal dead - no mains supply';
    if (!state.moduleInstalled) return '\u26a0 Terminal online - PARTS MISSING (TX-CORE)';
    return 'Use grid terminal';
  }

  function handleTerminalUse(laserSecurity, terminalUI) {
    if (laserSecurity.isActive()) {
      hud.setObjective('AI security interlock active. Press the laser shutdown button midway along the right wall.');
      return;
    }
    if (!state.powerConnected && !state.moduleInstalled) {
      sound.playDetectionWarning(0.3);
      showStickyNote();
      if (state.hasLead && state.crateOpened) hud.setObjective('Plug the lead into FEEDER 2, and take the TX-CORE module out of the crate.');
      else if (state.hasLead) hud.setObjective('Plug the lead into FEEDER 2. The maintenance tag says the spare TX-CORE module is still crated \u2014 find it first.');
      else if (state.crateOpened) hud.setObjective('Pull the lead from the supply crate in the front-right corner, then take the TX-CORE module.');
      else if (state.hasCrowbar) hud.setObjective('Pry the sealed crate open with the crowbar; the maintenance tag says the spare module is still crated.');
      else if (state.padlockCut) hud.setObjective(`The ${STARRED_LOCKER} door is open. Take the crowbar off the rail inside.`);
      else if (state.hasCutters) hud.setObjective(`Cut the padlock on ${STARRED_LOCKER} \u2014 the equipment register on the document rack says the crowbar is signed out to it.`);
      else if (state.cuttersRevealed) hud.setObjective('Take the bolt cutters out of the open box on the workbench.');
      else if (state.wrenchHung) hud.setObjective('Something unlatched in the tool box on the workbench.');
      else if (state.hasWrench) hud.setObjective('Hang the wrench on the one outline still empty on the tool shadow board.');
      else if (state.caseOpened || state.toolboxUnlocked) hud.setObjective('Take the wrench out of the green tool case.');
      else if (boardTidy()) hud.setObjective('The board is complete except for the wrench.');
      else hud.setObjective('The shadow board is a sign-out sheet and three tools are still lying on the workbench. Hang each one on its own outline.');
      return;
    }
    if (!state.powerConnected) {
      sound.playDetectionWarning(0.3);
      hud.setObjective(state.hasLead
        ? 'The module is seated but the terminal has no supply. Plug the lead into the FEEDER 2 outlet on the wall strip behind the desk.'
        : 'The module is seated but the terminal has no supply. Pull the lead from the supply crate in the front-right corner.');
      return;
    }
    if (!state.moduleInstalled) {
      sound.playDetectionWarning(0.3);
      showStickyNote();
      if (state.carryingModule) hud.setObjective('Power is on but the screen flashes PARTS MISSING. Seat the TX-CORE module in the service bay on the wall above the terminal.');
      else if (state.crateOpened) hud.setObjective('Power is on but the screen flashes PARTS MISSING. Take the TX-CORE module out of the foam in the crate.');
      else if (state.hasCrowbar) hud.setObjective('Power is on but the screen flashes PARTS MISSING. Pry the sealed crate open with the crowbar.');
      else hud.setObjective('Power is on but the screen flashes PARTS MISSING. Follow the maintenance tag \u2014 the module is in a crate.');
      return;
    }
    terminalUI.show();
  }

  return {
    state,
    ready: Promise.all(pending).then(() => {}),
    update,
    handleTerminalUse,
    getTerminalLabel,
    attachStickyNote,
    dispose() {
      if (doorColliderLive) {
        const i = colliders.indexOf(doorCollider);
        if (i >= 0) colliders.splice(i, 1);
      }
      note.removeFromParent();
      sheet.removeFromParent();
      root.removeFromParent();
      disposeTree(root);
      for (const mesh of [note, sheet]) {
        mesh.geometry.dispose();
        if (mesh.material.map) mesh.material.map.dispose();
        mesh.material.dispose();
      }
      invisible.dispose();
    },
  };
}