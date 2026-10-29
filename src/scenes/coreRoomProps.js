import * as THREE from 'three';
import { loadModel } from '../systems/modelCache.js';
import { buildCardboardBoxes } from './cardboardBoxes.js';

const CABINET_URL = './models/metal-storage-cabinet.glb';
const CABINET_HEIGHT = 2.1;

// Level 3's shockwave ring sweeps out to r=10.2, so the floor between the core
// and the walls has to stay runnable: every prop below hugs a wall, clear of the
// breaker plinths and the switchgear racks that line x = +-6.2.
const CABINETS = [
  { x: -3.45, z: -6.5, yaw: 0 },          // north wall, flanking the corrupted panel
  { x: 3.45, z: -6.5, yaw: 0 },
  { x: 2.35, z: 6.5, yaw: Math.PI },      // south wall bank beside the work area
  { x: 3.55, z: 6.5, yaw: Math.PI },
];

const CRATE_SPOTS = [
  { x: -4.85, z: -6.1 },
  { x: 3.55, z: 5.05 },
];

const CRATE_SCALE = 0.8; // 1.7 m wide stack is too wide for the corner gaps

function disposeModel(model) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  model.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
      materials.add(material);
      Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
    }
  });
  geometries.forEach(value => value.dispose());
  materials.forEach(value => value.dispose());
  textures.forEach(value => value.dispose());
}

/**
 * Perimeter dressing for the core room. Colliders are pushed straight into the
 * level's list, so they also become occluders for the CCTV sweep.
 */
export function buildCoreRoomProps() {
  const group = new THREE.Group();
  group.name = 'Core room perimeter dressing';
  const colliders = [];
  const slots = [];

  const placeholderGeometry = new THREE.BoxGeometry(1.18, CABINET_HEIGHT, 0.7);
  const placeholderMaterial = new THREE.MeshStandardMaterial({ color: 0x71776c, roughness: 0.85 });

  for (const spot of CABINETS) {
    const cabinet = new THREE.Group();
    cabinet.position.set(spot.x, 0, spot.z);
    cabinet.rotation.y = spot.yaw;
    const placeholder = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
    placeholder.position.y = CABINET_HEIGHT / 2;
    placeholder.castShadow = placeholder.receiveShadow = true;
    cabinet.add(placeholder);
    group.add(cabinet);
    cabinet.updateWorldMatrix(true, true);
    const collider = new THREE.Box3().setFromObject(cabinet);
    colliders.push(collider);
    slots.push({ cabinet, placeholder, collider });
  }

  for (const spot of CRATE_SPOTS) {
    const stack = buildCardboardBoxes();
    stack.group.scale.multiplyScalar(CRATE_SCALE);
    stack.group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(stack.group);
    const centre = bounds.getCenter(new THREE.Vector3());
    stack.group.position.x += spot.x - centre.x;
    stack.group.position.z += spot.z - centre.z;
    stack.group.position.y -= bounds.min.y;
    stack.group.updateMatrixWorld(true);
    group.add(stack.group);
    colliders.push(new THREE.Box3().setFromObject(stack.group));
  }

  let disposed = false;
  const ready = loadModel(CABINET_URL).then(gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    const template = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(template);
    const size = bounds.getSize(new THREE.Vector3());
    const centre = bounds.getCenter(new THREE.Vector3());
    const scale = CABINET_HEIGHT / size.y;
    for (const { cabinet, placeholder, collider } of slots) {
      const model = template.clone(true);
      model.scale.setScalar(scale);
      model.position.set(-centre.x * scale, -bounds.min.y * scale, -centre.z * scale);
      model.traverse(object => { if (object.isMesh) object.castShadow = object.receiveShadow = true; });
      placeholder.removeFromParent();
      cabinet.add(model);
      cabinet.updateWorldMatrix(true, true);
      collider.setFromObject(cabinet);
    }
  }).catch(error => console.warn('Storage cabinet model unavailable; keeping blockout.', error));

  return {
    group,
    colliders,
    ready,
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      group.traverse(object => {
        if (object.geometry && object.geometry !== placeholderGeometry) object.geometry.dispose();
        if (object.material && object.material !== placeholderMaterial) object.material.dispose();
      });
      placeholderGeometry.dispose();
      placeholderMaterial.dispose();
    },
  };
}
