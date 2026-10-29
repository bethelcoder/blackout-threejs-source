import * as THREE from 'three';

/**
 * Shared geometry for the items the player can hold.
 * Both the first-person viewmodel and the character's right hand use these, so an
 * item reads the same in either view. Every item is built with its working end
 * pointing down -Z and the fist closed around the local origin.
 */

// Held items need to stay legible at the character's hip, where no lamp reaches:
// the small emissive floor keeps metal from going fully black in dark rooms.
const METAL = () => new THREE.MeshStandardMaterial({
  color: 0xb9c6d2,
  metalness: 0.45,
  roughness: 0.38,
  emissive: 0x141c24,
});
const DARK = () => new THREE.MeshStandardMaterial({ color: 0x2b343d, metalness: 0.4, roughness: 0.5, emissive: 0x0c1116 });
const RUBBER = () => new THREE.MeshStandardMaterial({ color: 0xc25a1e, roughness: 0.85, emissive: 0x241006 });
const WOOD = () => new THREE.MeshStandardMaterial({ color: 0x9a7048, roughness: 0.9, emissive: 0x14100a });
const DIPPED = () => new THREE.MeshStandardMaterial({ color: 0x27527d, roughness: 0.95, emissive: 0x0a1420 });

const box = (w, h, d, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
};

const rod = (radius, length, material, x, y, z, axis = 'z') => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 12), material);
  mesh.position.set(x, y, z);
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  return mesh;
};

function buildTorch() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 12), DARK());
  body.rotation.x = Math.PI / 2;
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.020, 0.05, 12), METAL());
  head.position.z = -0.09;
  head.rotation.x = Math.PI / 2;
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.028, 12), new THREE.MeshBasicMaterial({ color: 0xe8f4ff }));
  lens.position.z = -0.116;
  lens.rotation.y = Math.PI;
  group.add(body, head, lens);
  return group;
}

function buildWrench() {
  const group = new THREE.Group();
  const steel = METAL();
  const grip = RUBBER();
  group.add(box(0.022, 0.026, 0.15, steel, 0, 0, -0.045));
  group.add(box(0.028, 0.034, 0.075, grip, 0, 0, 0.002));
  group.add(box(0.032, 0.03, 0.03, steel, 0, 0, -0.128));
  for (const x of [-0.016, 0.016]) group.add(box(0.015, 0.028, 0.045, steel, x, 0, -0.158));
  return group;
}

function buildMultimeter() {
  const group = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0x2f363d, metalness: 0.35, roughness: 0.6 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xc9a13c, roughness: 0.7 });
  const steel = METAL();
  // Body runs along Z so the leads come out the working end, not the wrist.
  // The fist closes around the middle of the case, so the screen sits just
  // above the knuckles and the leads clear the little finger.
  group.add(box(0.07, 0.03, 0.115, shell, 0, 0, 0));
  group.add(box(0.074, 0.032, 0.02, trim, 0, 0, 0.048));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.032), new THREE.MeshBasicMaterial({ color: 0x86e7c0 }));
  screen.position.set(0, 0.0165, -0.005);
  screen.rotation.x = -Math.PI / 2;
  group.add(screen);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.008, 16), trim);
  dial.position.set(0, 0.019, 0.04);
  group.add(dial);
  for (const x of [-0.02, 0.02]) group.add(rod(0.0025, 0.07, steel, x, 0, -0.075, 'z'));
  return group;
}

/**
 * A book gripped by its spine: the cover runs forward down -Z, so the fist sits
 * on the binding and the pages face up in both camera views.
 */
function buildBook(coverColor) {
  const group = new THREE.Group();
  const cover = new THREE.MeshStandardMaterial({ color: coverColor, roughness: 0.6, emissive: 0x0b0d10 });
  const pages = new THREE.MeshStandardMaterial({ color: 0xf0e5cb, roughness: 0.45, emissive: 0x1a1712 });
  const label = new THREE.MeshStandardMaterial({ color: 0xe9edf1, roughness: 0.5, emissive: 0x101317 });

  group.add(box(0.2, 0.032, 0.26, cover, 0, 0, -0.14));
  group.add(box(0.188, 0.024, 0.248, pages, 0.004, 0, -0.142));
  group.add(box(0.203, 0.034, 0.04, label, 0, 0, -0.212));
  return group;
}

function buildScrewdriver() {
  const group = new THREE.Group();
  const handle = RUBBER();
  const steel = METAL();
  // Handle behind the fist, shaft and flat tip forward past the knuckles.
  group.add(rod(0.016, 0.105, handle, 0, 0, 0.05));
  group.add(rod(0.019, 0.014, handle, 0, 0, 0.108));
  for (const z of [0.078, 0.058, 0.038]) group.add(rod(0.0175, 0.006, DARK(), 0, 0, z));
  group.add(rod(0.0095, 0.03, steel, 0, 0, -0.014));
  group.add(rod(0.0048, 0.13, steel, 0, 0, -0.094));
  group.add(box(0.022, 0.007, 0.024, steel, 0, 0, -0.164));
  return group;
}

function buildHammer() {
  const group = new THREE.Group();
  const steel = METAL();
  // Head sits across the handle, face forward on +X and claw trailing on -X.
  group.add(rod(0.013, 0.24, WOOD(), 0, 0, 0.075));
  group.add(rod(0.017, 0.032, DARK(), 0, 0, 0.2));
  group.add(box(0.07, 0.06, 0.075, steel, 0, 0, -0.07));
  group.add(rod(0.03, 0.045, steel, 0.055, 0, -0.07, 'x'));
  const claw = box(0.07, 0.034, 0.05, steel, -0.058, 0, -0.07);
  claw.rotation.z = -0.18;
  group.add(claw);
  return group;
}

function buildOpenWrench() {
  const group = new THREE.Group();
  const steel = METAL();
  // Flat forged bar with the open jaw splayed across X at the working end.
  group.add(box(0.02, 0.026, 0.2, steel, 0, 0, -0.02));
  group.add(box(0.03, 0.03, 0.045, steel, 0, 0, 0.082));
  group.add(box(0.06, 0.026, 0.045, steel, 0, 0, -0.145));
  for (const x of [-0.028, 0.028]) group.add(box(0.026, 0.026, 0.065, steel, x, 0, -0.19));
  return group;
}

function buildPliers() {
  const group = new THREE.Group();
  const steel = METAL();
  const grips = DIPPED();
  // Handles cross at the rivet and splay back toward the wrist.
  for (const side of [-1, 1]) {
    const grip = box(0.026, 0.032, 0.14, grips, side * 0.019, 0, 0.085);
    grip.rotation.y = side * 0.1;
    const jaw = box(0.022, 0.03, 0.125, steel, side * 0.011, 0, -0.08);
    jaw.rotation.y = -side * 0.06;
    group.add(grip, jaw);
  }
  group.add(rod(0.013, 0.042, steel, 0, 0, 0, 'y'));
  group.add(rod(0.007, 0.05, DARK(), 0, 0, 0, 'y'));
  return group;
}

function buildBoltCutters() {
  const group = new THREE.Group();
  const steel = METAL();
  const grips = DIPPED();
  // Short jaws forward of the pivot, long handles tucked behind the fist.
  for (const side of [-1, 1]) {
    const handle = box(0.02, 0.026, 0.22, grips, side * 0.016, 0, 0.09);
    handle.rotation.y = -side * 0.07;
    const jaw = box(0.018, 0.03, 0.13, steel, side * 0.012, 0, -0.11);
    jaw.rotation.y = side * 0.05;
    group.add(handle, jaw);
  }
  group.add(rod(0.019, 0.05, steel, 0, 0, 0, 'y'));
  group.add(rod(0.012, 0.055, DARK(), 0, 0, 0, 'y'));
  return group;
}

function buildCrowbar() {
  const group = new THREE.Group();
  const steel = METAL();
  group.add(rod(0.011, 0.32, steel, 0, 0, -0.08));
  group.add(rod(0.014, 0.036, DARK(), 0, 0, 0.09));
  // Flattened chisel tip, angled off the shaft so the pry end reads at a glance.
  const tip = box(0.034, 0.008, 0.065, steel, 0, 0, -0.255);
  tip.rotation.x = -0.22;
  group.add(tip);
  return group;
}

function buildExtensionLead() {
  const group = new THREE.Group();
  const cable = new THREE.MeshStandardMaterial({ color: 0xf0a020, roughness: 0.85, emissive: 0x1a1002 });
  const plug = new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.6, emissive: 0x14171a });
  // Coil hangs flat beside the fist, thin through Z so it stays on screen.
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 20), cable);
  coil.position.set(0, -0.04, -0.03);
  group.add(coil);
  group.add(box(0.05, 0.03, 0.026, plug, 0, -0.135, -0.03));
  for (const x of [-0.011, 0.011]) group.add(rod(0.0035, 0.026, METAL(), x, -0.16, -0.03, 'y'));
  return group;
}

function buildTxCore() {
  const group = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0x2a3138, metalness: 0.55, roughness: 0.45, emissive: 0x0b1013 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xc9a13c, roughness: 0.6, emissive: 0x1a1405 });
  const core = new THREE.MeshBasicMaterial({ color: 0x63e8ff });
  group.add(box(0.16, 0.1, 0.06, shell, 0, 0, -0.055));
  group.add(box(0.17, 0.11, 0.014, trim, 0, 0, -0.018));
  group.add(box(0.11, 0.012, 0.068, core, 0, 0, -0.055));
  return group;
}

const BUILDERS = {
  torch: buildTorch,
  insulated_wrench: buildWrench,
  multimeter: buildMultimeter,
  technical_guide: () => buildBook(0x1d374a),
  maintenance_manual: () => buildBook(0xd47a24),
  screwdriver: buildScrewdriver,
  hammer: buildHammer,
  wrench: buildOpenWrench,
  pliers: buildPliers,
  bolt_cutters: buildBoltCutters,
  crowbar: buildCrowbar,
  extension_lead: buildExtensionLead,
  tx_core: buildTxCore,
};

export const HOLDABLE = Object.keys(BUILDERS);

/** Returns a fresh group (the caller owns it) or null for items that are never held. */
export function buildHeldTool(itemId) {
  const build = BUILDERS[itemId];
  return build ? build() : null;
}
