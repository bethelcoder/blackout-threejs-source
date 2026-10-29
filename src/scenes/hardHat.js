import * as THREE from 'three';

// Landmarks measured from public/models/player.glb (metres, model space):
// the Wolf3D_Head skull spans y 1.519-1.834 with the eyes near y 1.73, and the
// head faces +Z, so the brim sits just above the brows with a small suspension gap.
const BROW_Y = 1.792;
const SKULL_Z = 0.02;
const TILT = 0.05; // front of the brim dips a few degrees, as worn
const SHELL_COLOR = 0xf2f1ec; // site white; 0xf2c400 for a yellow shell

// Dome half-section, crown first.
const DOME_PROFILE = [
  [0.0, 0.120],
  [0.040, 0.116],
  [0.070, 0.105],
  [0.092, 0.084],
  [0.106, 0.053],
  [0.114, 0.024],
  [0.116, 0.012],
  [0.117, 0.002],
  [0.113, -0.010],
];

// Brim ring: top face, rolled outer edge, underside. The inner radius stays
// under the dome so the join is hidden.
const BRIM_PROFILE = [
  [0.088, 0.002],
  [0.115, 0.005],
  [0.128, 0.004],
  [0.134, -0.003],
  [0.138, -0.010],
  [0.131, -0.016],
  [0.115, -0.011],
  [0.088, -0.004],
];

export function buildHardHat() {
  const group = new THREE.Group();
  group.name = 'Hard hat';

  const material = new THREE.MeshStandardMaterial({
    color: SHELL_COLOR,
    roughness: 0.42,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const domePoints = DOME_PROFILE.map(([radius, y]) => new THREE.Vector2(radius, y));
  const shell = new THREE.Mesh(new THREE.LatheGeometry(domePoints, 56), material);
  shell.castShadow = true;
  group.add(shell);

  const brimPoints = BRIM_PROFILE.map(([radius, y]) => new THREE.Vector2(radius, y));
  const brim = new THREE.Mesh(new THREE.LatheGeometry(brimPoints, 56), material);
  // Oval brim, pushed forward: a longer front peak and a shorter back, the
  // silhouette a construction helmet has instead of a level bowler brim.
  brim.scale.z = 1.06;
  brim.position.z = 0.004;
  brim.castShadow = true;
  group.add(brim);

  return group;
}

/**
 * Rigid attach to the skull: the offset is authored in model space, then the
 * hat is reparented to the Head bone so it follows every animation.
 */
export function attachHardHat(model) {
  const hat = buildHardHat();
  const head = model.getObjectByName('Head');

  hat.position.set(0, BROW_Y, SKULL_Z);
  hat.rotation.x = TILT;

  if (!head) {
    model.add(hat);
    return hat;
  }

  model.add(hat);
  model.updateMatrixWorld(true);
  head.attach(hat);
  return hat;
}
