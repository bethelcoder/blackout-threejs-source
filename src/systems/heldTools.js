import * as THREE from 'three';

/**
 * Shared geometry for tools the player can hold.
 * Both the first-person viewmodel and the character's right hand use these, so a
 * tool reads the same in either view. Every tool is built with its working end
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

const BUILDERS = {
  torch: buildTorch,
  insulated_wrench: buildWrench,
  multimeter: buildMultimeter,
};

export const HOLDABLE = Object.keys(BUILDERS);

/** Returns a fresh group (the caller owns it) or null for items that are never held. */
export function buildHeldTool(itemId) {
  const build = BUILDERS[itemId];
  return build ? build() : null;
}
