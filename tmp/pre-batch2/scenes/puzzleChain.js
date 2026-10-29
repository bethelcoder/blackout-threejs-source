import * as THREE from 'three';
import {
  buildCrowbar, buildPadlock, buildTXModule, buildStickyNote3D,
  canvasTexture, disposeTree, std, paintedDoorTexture, shadowBoardTexture,
  foamTexture, assignmentSheetTexture,
  SHAPE_NAMES, buildShapeNote3D, buildWrench, buildGreenToolbox,
  buildShapePadlock, buildWorkstationBox,
} from './puzzleItems.js';
import { loadModel } from '../systems/modelCache.js';
import { fitModel } from '../systems/fitModel.js';
import { PEGBOARD } from './design.js';
import { showStickyNote } from '../riddles/stickyNote.js';
import { showAssignmentBoard, RACK_ASSIGNMENTS, STARRED_LOCKER } from '../riddles/rackAssignments.js';
import { showShapeNote, SHAPE_COMBO } from '../riddles/shapeNote.js';

// Level 2 puzzle chain:
//   case tag on the notice board -> three-dial padlock on the green tool case
//   -> wrench -> empty outline on the tool shadow board -> workstation box
//   opens -> bolt cutters (GLB) -> padlock on TX-03 tool locker door -> crowbar
//   -> TX PARTS crate (GLB, front-left corner) -> TX-CORE module
//   -> service bay above the terminal -> terminal boots.
//
// World anchors:
//   TX-03 tall cabinet (from design.js): x = -6.5, z = -4.1, face at x = -6.0
//   TX PARTS crate (collider from design.js): (-5.1, 0.4, 7.2), size 0.8, ry -0.25
//   Notice board on the right wall: centre (6.91, 2.05, 5.8)
//   Tool shadow board (exported PEGBOARD from design.js): west wall, y 1.8

const CAB_FACE_X = -5.985;               // 1.5 cm in front of tall cabinet face (-6.0)
const CAB_Z = -4.1;
const DOOR_W = 1.2;
const DOOR_H = 1.8;
const DOOR_T = 0.022;
const DOOR_Y0 = 0.5;
const CRATE = { x: -5.1, y: 0.4, z: 7.2, size: 0.8, ry: -0.25 };
const BOARD_SHEET = new THREE.Vector3(6.855, 1.7, 5.8);

// Bench-top anchor for the workstation box that now hides the bolt cutters.
// Shifted 6 cm towards the wall from the old loose-cutter spot so a 0.32 m wide
// box still fits the 0.8 m bench top (-6.85 .. -6.05).
const BENCH_BOX = { x: -6.28, y: 0.94, z: 1.43, wallH: 0.16 };

// The case tag is pinned over the blank bottom-right corner of the assignment
// sheet -- BOARD_SHEET itself is already occupied by that sheet, and every other
// slot on the cork board has a printed notice in it.
const SHAPE_NOTE = BOARD_SHEET.clone().add(new THREE.Vector3(-0.017, -0.17, 0.13));

// Green tool case on the floor between the board and the TX PARTS crate.
// Clear of every collider design.js registers.
const GREEN_CASE = { x: -5.60, y: 0, z: 6.05, ry: 0.30 };

const WRENCH_SLOT = PEGBOARD.slots.find((s) => s.tool === 'wrench');

const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

export function buildPuzzleChain({ scene, hud, sound, colliders = [], layout }) {
  const state = {
    hasCutters: false,
    padlockCut: false,
    hasCrowbar: false,
    crateOpened: false,
    carryingModule: false,
    moduleInstalled: false,
    toolboxUnlocked: false,   // shape dials solved, padlock popped
    caseOpened: false,        // green case lid swung open
    hasWrench: false,
    wrenchHung: false,        // wrench back on its outline
    cuttersRevealed: false,   // workstation box open, cutters live
  };
  const root = new THREE.Group(); root.name = 'Level 2 puzzle chain';
  scene.add(root);
  const invisible = new THREE.MeshBasicMaterial({ visible: false });
  let elapsed = 0;

  const box = (parent, w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); parent.add(m); return m;
  };
  const cyl = (parent, r, len, mat, x, y, z, rx = 0, ry = 0, rz = 0, seg = 12) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m); return m;
  };
  const proxy = (parent, w, h, d, x, y, z) => box(parent, w, h, d, invisible, x, y, z);

  // Shared materials
  const steel = std(0xb8c0c8, 0.4, 0.5);
  const dark  = std(0x23272b, 0.6, 0.4);
  const innerMat = std(0x1c2024, 0.85, 0.15);
  const bodyMat  = std(0x4a534e, 0.65, 0.3);

  // ====================================================================
  // WORKSTATION BOX on the bench, with the BOLT CUTTERS (real GLB) inside.
  // The box is sealed until the wrench goes back on its pegboard outline,
  // so the cutters start out neither visible nor interactable.
  // ====================================================================
  const wsBox = buildWorkstationBox({ wallH: BENCH_BOX.wallH });
  wsBox.position.set(BENCH_BOX.x, BENCH_BOX.y, BENCH_BOX.z);
  root.add(wsBox);

  const cutterPivot = new THREE.Group();
  cutterPivot.position.set(BENCH_BOX.x, BENCH_BOX.y + wsBox.userData.floorTop, BENCH_BOX.z);
  cutterPivot.rotation.y = 1.42;
  root.add(cutterPivot);

  proxy(cutterPivot, 0.60, 0.11, 0.16, 0, 0.055, 0);   // fully enclosed by the walls while the lid is down
  cutterPivot.userData.interactable = false;
  cutterPivot.userData.reach = 2.0;
  cutterPivot.userData.getLabel = () => (state.hasCutters ? 'Bolt cutters taken' : 'Take bolt cutters');
  cutterPivot.userData.onInteract = () => {
    if (state.hasCutters) return;
    state.hasCutters = true;
    cutterPivot.visible = false;
    cutterPivot.userData.interactable = false;
    sound.playInteract();
    hud.setObjective(`Bolt cutters acquired. Find the \u2605 locker on the assignment board \u2014 ${STARRED_LOCKER} \u2014 and cut its padlock.`);
  };

  loadModel(new URL('../assets/models/bolt_cutter_low-poly.glb', import.meta.url).href)
    .then(gltf => {
      const cutters = gltf.scene.clone(true);
      fitModel(cutters, { max: 0.6 }, -Math.PI / 2);
      // fitModel parks the pivot on the model's base; shrink it if the GLB is
      // taller than the box interior so the lid still closes over it.
      const h = new THREE.Box3().setFromObject(cutters).max.y;
      const room = BENCH_BOX.wallH - wsBox.userData.floorTop - 0.008;
      if (h > room) cutters.scale.multiplyScalar(room / h);
      // fitModel already parked the base on cutterPivot's origin (the foam top);
      // do NOT .set() the position here or that offset is thrown away.
      cutterPivot.add(cutters);
    })
    .catch(err => console.warn('Bolt cutters failed to load:', err));

  // ====================================================================
  // TX-03 DOOR — hinged flush onto the existing tall cabinet.
  // No protruding mini-cabinet. A flat door + hasp + padlock is the
  // only thing that sticks out from the cabinet face.
  // ====================================================================
  // Dark interior behind the door (visible when open)
  const interior = new THREE.Mesh(
    new THREE.PlaneGeometry(DOOR_W - 0.04, DOOR_H - 0.06),
    innerMat
  );
  interior.position.set(CAB_FACE_X - 0.002, DOOR_Y0 + DOOR_H / 2, CAB_Z);
  interior.rotation.y = Math.PI / 2;
  root.add(interior);

  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(DOOR_W - 0.06, DOOR_H - 0.1),
    new THREE.MeshStandardMaterial({ map: shadowBoardTexture(), roughness: 0.85 })
  );
  board.position.set(CAB_FACE_X, DOOR_Y0 + DOOR_H / 2, CAB_Z);
  board.rotation.y = Math.PI / 2;
  root.add(board);

  // Crowbar hooks
  const hookY = DOOR_Y0 + DOOR_H * 0.6;
  for (const s of [-1, 1]) {
    const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 8), steel);
    hook.position.set(CAB_FACE_X + 0.04, hookY, CAB_Z + s * 0.28);
    hook.rotation.z = Math.PI / 2;
    root.add(hook);
  }

  // Hung crowbar
  const crowbarMount = new THREE.Group();
  crowbarMount.position.set(CAB_FACE_X + 0.05, hookY + 0.02, CAB_Z);
  crowbarMount.rotation.y = -Math.PI / 2;
  const hungCrowbar = buildCrowbar();
  crowbarMount.add(hungCrowbar);
  root.add(crowbarMount);
  proxy(crowbarMount, 0.9, 0.12, 0.12, 0, 0.03, 0);
  crowbarMount.userData.reach = 2.0;
  crowbarMount.userData.label = 'Take crowbar';
  crowbarMount.userData.interactable = false;

  // Hinged door
  const hinge = new THREE.Group();
  hinge.position.set(CAB_FACE_X + DOOR_T + 0.002, DOOR_Y0 + DOOR_H / 2, CAB_Z - DOOR_W / 2 + 0.005);
  root.add(hinge);

  const leafW = DOOR_W - 0.02;
  const leafH = DOOR_H - 0.03;
  const doorFace = new THREE.MeshStandardMaterial({ map: paintedDoorTexture(), roughness: 0.6, metalness: 0.3 });
  const leaf = new THREE.Mesh(
    new THREE.BoxGeometry(DOOR_T, leafH, leafW),
    [doorFace, innerMat, bodyMat, bodyMat, bodyMat, bodyMat]
  );
  leaf.position.set(DOOR_T / 2, 0, leafW / 2);
  hinge.add(leaf);

  for (const y of [-0.7, 0, 0.7]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.1, 10), steel);
    barrel.position.set(0.005, y, 0);
    hinge.add(barrel);
  }

  const slotZ = leafW - 0.05;
  const hStaple = 0.3;
  const haspMat = std(0xb8c0c8, 0.4, 0.5);
  const haspSlot = std(0x23272b, 0.6, 0.4);
  box(hinge, 0.008, 0.18, 0.08, haspMat, DOOR_T + 0.02, hStaple, slotZ);
  box(hinge, 0.009, 0.06, 0.014, haspSlot, DOOR_T + 0.02, hStaple, slotZ);

  const handleStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 10), haspSlot);
  handleStem.position.set(DOOR_T + 0.03, -0.1, slotZ - 0.1);
  handleStem.rotation.z = Math.PI / 2;
  hinge.add(handleStem);
  box(hinge, 0.022, 0.15, 0.026, haspMat, DOOR_T + 0.05, -0.1, slotZ - 0.1);

  // Staple
  const stapleY = DOOR_Y0 + DOOR_H / 2 + hStaple;
  const stapleZ = CAB_Z - DOOR_W / 2 + 0.005 + slotZ;
  const stapleX = CAB_FACE_X + DOOR_T + 0.04;
  const stapleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(stapleX - 0.014, stapleY - 0.016, stapleZ),
    new THREE.Vector3(stapleX + 0.004, stapleY - 0.016, stapleZ),
    new THREE.Vector3(stapleX + 0.016, stapleY, stapleZ),
    new THREE.Vector3(stapleX + 0.004, stapleY + 0.016, stapleZ),
    new THREE.Vector3(stapleX - 0.014, stapleY + 0.016, stapleZ),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(stapleCurve, 16, 0.004, 8, false), steel));

  // Padlock
  const padlock = buildPadlock();
  padlock.position.set(stapleX + 0.02, stapleY - 0.087, stapleZ);
  padlock.rotation.y = Math.PI / 2;
  root.add(padlock);
  const padlockHit = proxy(root, 0.12, 0.2, 0.16, stapleX + 0.02, stapleY - 0.06, stapleZ);
  padlockHit.userData.interactable = true;
  padlockHit.userData.reach = 2.0;

  colliders.push(new THREE.Box3(
    new THREE.Vector3(CAB_FACE_X, DOOR_Y0, CAB_Z - DOOR_W / 2),
    new THREE.Vector3(CAB_FACE_X + DOOR_T + 0.05, DOOR_Y0 + DOOR_H, CAB_Z + DOOR_W / 2)
  ));

  const doorHit = leaf;
  doorHit.userData.interactable = true;
  doorHit.userData.reach = 2.0;
  doorHit.userData.getLabel = () => {
    if (state.hasCrowbar) return `${STARRED_LOCKER} locker (empty)`;
    if (!state.padlockCut) return state.hasCutters ? `${STARRED_LOCKER} locker \u2014 cut the padlock` : `${STARRED_LOCKER} locker \u2014 padlocked (need bolt cutters)`;
    return `${STARRED_LOCKER} locker \u2014 open`;
  };
  doorHit.userData.onInteract = () => {
    if (state.padlockCut) return;
    sound.playDetectionWarning(0.3);
    hud.setObjective(state.hasCutters
      ? 'Cut the brass padlock hanging on the TX-03 door hasp.'
      : 'The padlock is hardened steel. Bolt cutters from the workbench could shear it.');
  };

  padlockHit.userData.getLabel = () => {
    if (state.padlockCut) return 'Padlock (cut)';
    return state.hasCutters ? 'Cut padlock with bolt cutters' : 'Padlock \u2014 need bolt cutters';
  };
  padlockHit.userData.onInteract = () => {
    if (state.padlockCut) return;
    if (!state.hasCutters) {
      sound.playDetectionWarning(0.3);
      hud.setObjective('The padlock is hardened steel. Find bolt cutters on the workbench (left wall).');
      return;
    }
    state.padlockCut = true;
    padlockHit.userData.interactable = false;
    padlock.userData.cut();
    root.attach(padlock);
    falling.push({ obj: padlock, vy: 0, vx: 0.35, vz: 0.1, floorY: 0.027, bounces: 0, target: new THREE.Euler(-Math.PI / 2, 0.6, 0.2) });
    sound.playAccessGranted();
    hud.setObjective('Padlock cut. The TX-03 door swings open \u2014 take the crowbar.');
  };

  crowbarMount.userData.onInteract = () => {
    if (state.hasCrowbar || doorAngle < 0.9) return;
    state.hasCrowbar = true;
    crowbarMount.visible = false;
    crowbarMount.userData.interactable = false;
    sound.playInteract();
    hud.setObjective('Crowbar acquired. Pry open the TX PARTS crate on the floor in the front-left corner.');
  };

  // ====================================================================
  // ASSIGNMENT SHEET
  // ====================================================================
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5),
    new THREE.MeshStandardMaterial({ map: assignmentSheetTexture(RACK_ASSIGNMENTS, STARRED_LOCKER), roughness: 1 }));
  sheet.position.copy(BOARD_SHEET); sheet.rotation.y = -Math.PI / 2; sheet.rotation.z = 0.04;
  const pinMat = std(0xb3261e, 0.4, 0.2);
  const pin = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), pinMat); pin.position.set(0, 0.2, 0.012); sheet.add(pin);
  sheet.userData.interactable = true;
  sheet.userData.reach = 2.0;
  sheet.userData.label = 'Read rack assignment board';
  sheet.userData.onInteract = () => {
    sound.playInteract();
    showAssignmentBoard();
    hud.setObjective(`Assignment board: \u2605 ${STARRED_LOCKER} holds the crowbar. Find its padlock and cut it with the workbench bolt cutters.`);
  };
  root.add(sheet);

  // ====================================================================
  // CASE 12 TAG — the discreet clue for the three-dial padlock, pinned over
  // the corner of the assignment sheet on the same cork board.
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
  shapeNoteHit.userData.onInteract = () => {
    sound.playInteract();
    showShapeNote();
  };
  root.add(shapeNote);

  // ====================================================================
  // GREEN TOOL CASE — shape padlock on the hasp, wrench inside on the foam
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
    hud.setObjective('Three dials, three marks. The case tag pinned to the notice board lists them in order.');
  };

  const casePadlock = buildShapePadlock(SHAPE_NAMES);
  casePadlock.position.copy(toolCase.userData.haspAnchor);
  toolCase.add(casePadlock);
  casePadlock.userData.interactable = true;
  casePadlock.userData.reach = 2.2;
  casePadlock.userData.getLabel = () => (state.toolboxUnlocked ? 'Padlock (open)' : 'Shape padlock \u2014 three dials');
  casePadlock.userData.onInteract = () => {
    if (state.toolboxUnlocked) return;
    sound.playDetectionWarning(0.3);
    hud.setObjective('Turn the dials to the three marks on the case 12 tag. Left dial first.');
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

  casePadlock.userData.dials.forEach((dial, i) => {
    proxy(dial.group, 0.028, 0.030, 0.020, 0, 0, 0.008);   // generous click target, still clear of its neighbours
    dial.group.userData.interactable = true;
    dial.group.userData.reach = 2.2;
    dial.group.userData.getLabel = () => (state.toolboxUnlocked ? `Dial ${i + 1} (set)` : `Dial ${i + 1} \u2014 ${dial.shape()}`);
    dial.group.userData.onInteract = () => {
      if (state.toolboxUnlocked) return;
      dial.next();
      sound.playKeypadBeep();
      hud.setObjective(`Dial ${i + 1}: ${dial.shape()}.`);
      if (casePadlock.userData.dials.every((d, k) => d.shape() === SHAPE_COMBO[k])) unlockCase();
    };
  });

  const caseWrench = buildWrench();
  caseWrench.rotation.set(-Math.PI / 2, 0, Math.PI / 2);   // laid flat, long axis along the case
  caseWrench.position.set(0, toolCase.userData.foamTop + 0.008, 0);
  toolCase.add(caseWrench);
  const wrenchHit = proxy(caseWrench, 0.06, 0.30, 0.11, 0, 0, 0);
  wrenchHit.userData.interactable = false;                  // buried under the lid until it opens
  wrenchHit.userData.reach = 2.2;
  wrenchHit.userData.label = 'Take the wrench';
  wrenchHit.userData.onInteract = () => {
    if (state.hasWrench) return;
    state.hasWrench = true;
    caseWrench.visible = false;
    wrenchHit.userData.interactable = false;
    sound.playInteract();
    hud.setObjective('Wrench acquired. The tool shadow board on the left wall has an empty outline waiting for it.');
  };

  // ====================================================================
  // PEGBOARD WRENCH SLOT — proxy over the one outline with no tool on it.
  // Snapping the wrench home is what unlatches the workstation box.
  // ====================================================================
  const wrenchAnchor = new THREE.Group();
  wrenchAnchor.position.set(PEGBOARD.toolX, PEGBOARD.centreY, WRENCH_SLOT.z);
  root.add(wrenchAnchor);
  const slotHit = proxy(wrenchAnchor, 0.12, 0.32, 0.18, 0.04, 0, 0);
  slotHit.userData.interactable = true;
  slotHit.userData.reach = 2.2;
  slotHit.userData.getLabel = () => {
    if (state.wrenchHung) return 'Wrench (back on the board)';
    return state.hasWrench ? 'Hang the wrench on its outline' : 'Empty tool outline \u2014 wrench missing';
  };
  slotHit.userData.onInteract = () => {
    if (state.wrenchHung) return;
    if (!state.hasWrench) {
      sound.playDetectionWarning(0.3);
      hud.setObjective('Four outlines, three tools. The wrench is not on the board \u2014 check the tool cases on the floor.');
      return;
    }
    state.wrenchHung = true;
    state.hasWrench = false;
    slotHit.userData.interactable = false;
    slotHit.visible = false;

    const hung = buildWrench();
    hung.name = 'Hung wrench';
    hung.rotation.y = Math.PI / 2;                          // thickness into the board
    hung.position.set(PEGBOARD.toolX, PEGBOARD.centreY, WRENCH_SLOT.z);
    root.add(hung);

    sound.playInteract();
    boxAnim.phase = 'open'; boxAnim.t = 0;
    hud.setObjective('The wrench seats on its outline. A latch let go in the tool box on the workbench \u2014 go and look.');
  };

  // ====================================================================
  // TX PARTS CRATE — crate_box.glb visual + puzzleChain rim/foam/lid/module
  // ====================================================================
  const half = CRATE.size / 2, rimH = 0.16;
  const crate = new THREE.Group();
  crate.position.set(CRATE.x, CRATE.y, CRATE.z);
  crate.rotation.y = CRATE.ry;
  root.add(crate);

  // Visual shell: crate_box.glb, fitted to 0.8, base at crate group's local y=-half
  loadModel(new URL('../assets/models/crate_box.glb', import.meta.url).href)
    .then(gltf => {
      const crateVis = gltf.scene.clone(true);
      fitModel(crateVis, { max: CRATE.size });
      crateVis.position.set(0, -half, 0);
      crate.add(crateVis);
    })
    .catch(err => console.warn('Crate visual failed:', err));

  // Rim (raised wooden lip)
  const woodMat = std(0x8a6a45, 0.9, 0);
  const rimCenter = half + rimH / 2, rimOuter = CRATE.size - 0.04, tb = 0.03;
  box(crate, rimOuter, rimH, tb, woodMat, 0, rimCenter, rimOuter / 2 - tb / 2);
  box(crate, rimOuter, rimH, tb, woodMat, 0, rimCenter, -(rimOuter / 2 - tb / 2));
  box(crate, tb, rimH, rimOuter - 2 * tb, woodMat, rimOuter / 2 - tb / 2, rimCenter, 0);
  box(crate, tb, rimH, rimOuter - 2 * tb, woodMat, -(rimOuter / 2 - tb / 2), rimCenter, 0);

  // Foam
  const foam = new THREE.MeshStandardMaterial({ map: foamTexture(), roughness: 1 });
  const pit = rimOuter - 2 * tb, pocketX = 0.33, pocketZ = 0.27, foamBase = half + 0.025, foamTop = half + 0.05 + 0.05;
  box(crate, pit, 0.05, pit, foam, 0, foamBase, 0);
  for (const s of [-1, 1]) {
    box(crate, (pit - pocketX) / 2, 0.1, pit, foam, s * (pocketX / 2 + (pit - pocketX) / 4), foamTop, 0);
    box(crate, pocketX, 0.1, (pit - pocketZ) / 2, foam, 0, foamTop, s * (pocketZ / 2 + (pit - pocketZ) / 4));
  }

  // TX-CORE module inside foam
  const module = buildTXModule();
  module.position.set(0, half + 0.05 + 0.0425, 0);
  crate.add(module);
  proxy(module, 0.4, 0.2, 0.3, 0, 0.03, 0);
  module.userData.interactable = false;
  module.userData.reach = 2.0;
  module.userData.label = 'Take TX-CORE module';

  // Lid
  const lidHinge = new THREE.Group(); lidHinge.position.set(0, half + rimH + 0.02, 0.43); crate.add(lidHinge);
  const lid = new THREE.Group(); lid.position.set(0, 0, -0.43); lidHinge.add(lid);
  box(lid, 0.86, 0.04, 0.86, woodMat, 0, 0, 0);
  for (const x of [-0.3, 0.3]) {
    box(lid, 0.09, 0.025, 0.86, woodMat, x, 0.032, 0);
    for (let i = 0; i < 6; i++) cyl(lid, 0.006, 0.008, std(0x6a6f74, 0.5, 0.5), x, 0.047, -0.36 + i * 0.144, 0, 0, 0, 6);
  }

  // Pry wedge (visual crowbar used to open the lid)
  const wedge = new THREE.Group(); wedge.visible = false; root.add(wedge);
  const wedgeBar = buildCrowbar(); wedgeBar.rotation.y = -Math.PI / 2; wedge.add(wedgeBar);

  const crateHit = proxy(crate, 0.95, 0.95, 0.95, 0, 0, 0);
  crateHit.userData.interactable = true;
  crateHit.userData.reach = 2.0;
  crateHit.userData.getLabel = () => {
    if (state.crateOpened) return 'TX PARTS crate (open)';
    return state.hasCrowbar ? 'Pry open TX PARTS crate' : 'Sealed TX PARTS crate \u2014 need crowbar';
  };
  crateHit.userData.onInteract = () => {
    if (state.crateOpened) return;
    if (!state.hasCrowbar) {
      sound.playDetectionWarning(0.3);
      hud.setObjective('The lid is nailed shut. A crowbar would pry it open.');
      return;
    }
    state.crateOpened = true;
    crateHit.userData.interactable = false;
    crateAnim.phase = 'pry'; crateAnim.t = 0;
    wedge.visible = true;
    const p = crate.localToWorld(new THREE.Vector3(0.2, half + rimH + 0.2, -1.0));
    wedge.position.copy(p);
    wedge.rotation.set(0.61, CRATE.ry, 0);
    sound.playSwitch();
    hud.setObjective('Prying the lid...');
  };

  module.userData.onInteract = () => {
    if (!module.userData.interactable || state.carryingModule) return;
    state.carryingModule = true;
    module.visible = false;
    module.userData.interactable = false;
    sound.playInteract();
    hud.setObjective('TX-CORE module in hand. Seat it in the service bay on the wall above the terminal.');
  };

  // ====================================================================
  // SERVICE BAY + STICKY NOTE
  // ====================================================================
  const bay = new THREE.Group(); bay.position.copy(layout.bay.position); bay.rotation.y = layout.bay.yaw; root.add(bay);
  const bayMat = std(0x6d7782, 0.55, 0.35);
  const bw = 0.5, bh = 0.30, bd = 0.34;
  box(bay, bw, 0.02, bd, bayMat, 0, bh / 2 - 0.01, bd / 2);
  box(bay, bw, 0.02, bd, bayMat, 0, -bh / 2 + 0.01, bd / 2);
  for (const s of [-1, 1]) box(bay, 0.02, bh, bd, bayMat, s * (bw / 2 - 0.01), 0, bd / 2);
  box(bay, bw, bh, 0.02, innerMat, 0, 0, 0.01);
  const slotW = 0.27, slotH = 0.1, slotY = -0.02;
  box(bay, bw, (bh / 2 + slotY) - slotH / 2, 0.012, bayMat, 0, (bh / 2 + slotY + slotH / 2) / 2 + slotH / 2 * 0 + (bh / 2 - (bh / 2 + slotY - slotH / 2)) / 2 * 0 + ((slotY + slotH / 2 + bh / 2) / 2), bd + 0.006);
  box(bay, bw, (bh / 2 - (slotY + slotH / 2)) * 0 + (-bh / 2 + (slotY - slotH / 2)) * -1, 0.012, bayMat, 0, (-bh / 2 + (slotY - slotH / 2)) / 2, bd + 0.006);
  for (const s of [-1, 1]) box(bay, (bw - slotW) / 2, slotH, 0.012, bayMat, s * (slotW / 2 + (bw - slotW) / 4), slotY, bd + 0.006);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, toneMapped: false });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), ledMat); led.position.set(bw / 2 - 0.05, bh / 2 - 0.04, bd + 0.016); bay.add(led);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.05), new THREE.MeshStandardMaterial({
    map: canvasTexture(256, 44, (g, w, h) => { g.fillStyle = '#1b2025'; g.fillRect(0, 0, w, h); g.fillStyle = '#d8dcd6'; g.font = 'bold 20px monospace'; g.textAlign = 'center'; g.fillText('TX-CORE SERVICE BAY', w / 2, 29); }),
    roughness: 0.6 }));
  plate.position.set(-0.05, bh / 2 - 0.04, bd + 0.0125); bay.add(plate);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) cyl(bay, 0.008, 0.01, steel, sx * (bw / 2 - 0.02), sy * (bh / 2 - 0.02), bd + 0.012, Math.PI / 2, 0, 0, 8);
  proxy(bay, 0.56, 0.36, 0.5, 0, 0, 0.2);
  const bayHit = bay.children[bay.children.length - 1];
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
      hud.setObjective('The TX-CORE bay is empty. The terminal needs a replacement module \u2014 see the sticky note.');
      return;
    }
    state.carryingModule = false;
    module.visible = true;
    bay.attach(module);
    module.position.set(0, slotY, bd + 0.35);
    module.rotation.set(0, -Math.PI / 2, 0);
    bayAnim.active = true; bayAnim.t = 0;
    sound.playSwitch();
  };

  const note = buildStickyNote3D();
  note.position.copy(layout.note.position); note.rotation.set(0, layout.note.yaw, 0.06);
  const noteHit = proxy(note, 0.16, 0.16, 0.06, 0, 0, 0.02);
  noteHit.userData.interactable = true; noteHit.userData.reach = 2.6; noteHit.userData.label = 'Read sticky note';
  noteHit.userData.onInteract = () => { sound.playInteract(); showStickyNote(); };
  root.add(note);

  // ====================================================================
  // PER-FRAME ANIMATION
  // ====================================================================
  let doorAngle = 0;
  const falling = [];
  const crateAnim = { phase: 'idle', t: 0 };
  const caseAnim = { phase: 'idle', t: 0 };   // green tool case: pop the shackle, then swing the lid
  const boxAnim = { phase: 'idle', t: 0 };    // workstation box: swing the lid, then arm the cutters
  const bayAnim = { active: false, t: 0 };
  const lidFall = { from: new THREE.Vector3(), to: new THREE.Vector3(), q0: new THREE.Quaternion(), q1: new THREE.Quaternion() };

  function update(delta) {
    elapsed += delta;

    if (state.padlockCut) {
      doorAngle = THREE.MathUtils.damp(doorAngle, 1.95, 3.2, delta);
      hinge.rotation.y = doorAngle;
      if (doorAngle > 0.9 && !state.hasCrowbar && !crowbarMount.userData.interactable) crowbarMount.userData.interactable = true;
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

    if (crateAnim.phase === 'pry') {
      crateAnim.t += delta;
      lidHinge.rotation.x = ease(crateAnim.t / 0.9) * 0.6;
      if (crateAnim.t > 0.9) {
        crateAnim.phase = 'fall'; crateAnim.t = 0;
        root.attach(lid);
        lidFall.from.copy(lid.position); lidFall.q0.copy(lid.quaternion);
        lidFall.to.copy(crate.localToWorld(new THREE.Vector3(1.05, -0.38, -0.2)));
        lidFall.q1.setFromEuler(new THREE.Euler(0, CRATE.ry + 0.7, 0));
        sound.playSwitch();
      }
    } else if (crateAnim.phase === 'fall') {
      crateAnim.t += delta;
      const k = Math.min(1, crateAnim.t / 0.65);
      lid.position.x = THREE.MathUtils.lerp(lidFall.from.x, lidFall.to.x, ease(k));
      lid.position.z = THREE.MathUtils.lerp(lidFall.from.z, lidFall.to.z, ease(k));
      lid.position.y = THREE.MathUtils.lerp(lidFall.from.y, lidFall.to.y, k * k) + Math.sin(k * Math.PI) * 0.08 * (1 - k);
      lid.quaternion.slerpQuaternions(lidFall.q0, lidFall.q1, ease(k));
      if (k >= 1) {
        crateAnim.phase = 'done';
        wedge.position.copy(crate.localToWorld(new THREE.Vector3(-0.7, -0.38, -0.55)));
        wedge.rotation.set(0, CRATE.ry + 1.1, 0); wedgeBar.rotation.set(0, 0, 0);
        module.userData.interactable = true;
        hud.setObjective('Lid off. Take the TX-CORE module from the foam.');
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
        hud.setObjective('Case open. Take the wrench and hang it on the empty outline on the tool shadow board.');
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
        ledMat.color.setHex(0x33ff66);
        sound.playAccessGranted();
        hud.setObjective('TX-CORE module seated. The terminal is online \u2014 sit at the desk and use the retro computer.');
      }
    }
    if (!state.moduleInstalled) ledMat.color.setHex(Math.sin(elapsed * 5) > 0 ? 0xff2a1a : 0x4a0d08);
  }

  function getTerminalLabel(laserSecurity) {
    if (laserSecurity.isActive()) return 'Terminal locked - disable laser security';
    if (!state.moduleInstalled) return state.carryingModule ? 'Terminal offline - seat the module in the bay above' : 'Terminal offline - see sticky note';
    return 'Use grid terminal';
  }

  function handleTerminalUse(laserSecurity, terminalUI) {
    if (laserSecurity.isActive()) {
      hud.setObjective('AI security interlock active. Press the laser shutdown button midway along the right wall.');
      return;
    }
    if (state.moduleInstalled) { terminalUI.show(); return; }
    sound.playDetectionWarning(0.3);
    showStickyNote();
    if (state.carryingModule) hud.setObjective('Seat the TX-CORE module in the service bay on the wall above the terminal.');
    else if (state.crateOpened) hud.setObjective('Terminal won\'t boot without the TX-CORE module. Take it from the TX PARTS crate.');
    else if (state.hasCrowbar) hud.setObjective('Terminal won\'t boot without the TX-CORE module. Pry open the TX PARTS crate.');
    else if (state.padlockCut) hud.setObjective('Terminal won\'t boot without the TX-CORE module. Take the crowbar from TX-03.');
    else if (state.hasCutters) hud.setObjective(`Terminal won\'t boot without the TX-CORE module. Cut the padlock on ${STARRED_LOCKER} (\u2605 on the assignment board).`);
    else if (state.cuttersRevealed) hud.setObjective('Terminal won\'t boot without the TX-CORE module. Take the bolt cutters out of the open box on the workbench.');
    else if (state.wrenchHung) hud.setObjective('Terminal won\'t boot without the TX-CORE module. Something unlatched in the tool box on the workbench.');
    else if (state.hasWrench) hud.setObjective('Terminal won\'t boot without the TX-CORE module. Hang the wrench on the empty outline on the tool shadow board.');
    else if (state.caseOpened || state.toolboxUnlocked) hud.setObjective('Terminal won\'t boot without the TX-CORE module. Take the wrench out of the green tool case.');
    else hud.setObjective('Terminal offline \u2014 the sticky note mentions a TX-CORE module. Start with the assignment board on the right wall; there is a case tag pinned to its corner.');
  }

  return {
    state,
    update,
    handleTerminalUse,
    getTerminalLabel,
    dispose() {
      root.removeFromParent();
      disposeTree(root);
      invisible.dispose();
    },
  };
}