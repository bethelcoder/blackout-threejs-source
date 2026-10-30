import * as THREE from 'three';
import { loadModel } from '../systems/modelCache.js';
import { buildCardboardBoxes } from './cardboardBoxes.js';
import { batchStaticModel as batchCabinet } from '../systems/staticGeometry.js';
export { batchStaticModel as batchCabinet } from '../systems/staticGeometry.js';

const CABINET_URL = './models/metal-storage-cabinet.glb';
const CABINET_HEIGHT = 2.1;

// Keep storage against the perimeter and the route to the hologram open.
const CABINETS = [
  { x: 2.35, z: 6.5, yaw: Math.PI },      // south wall bank beside the work area
  { x: 3.55, z: 6.5, yaw: Math.PI },
];

const CRATE_SPOTS = [
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
  const cabinetReady = loadModel(CABINET_URL).then(gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    const template = batchCabinet(gltf.scene);
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

  const officeDrawer = new THREE.Group();
  officeDrawer.name = 'Office drawer beside right supercomputer';
  officeDrawer.position.set(4.95, 0, -6.05);
  group.add(officeDrawer);
  const drawerCollider = new THREE.Box3();
  colliders.push(drawerCollider);
  const drawerReady = loadModel('./models/office-drawer.glb').then(gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    const model = batchCabinet(gltf.scene);
    // The supplied drawer fronts face -X; turn them toward the room (+Z).
    model.rotation.y = Math.PI / 2;
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const centre = bounds.getCenter(new THREE.Vector3());
    const scale = Math.min(1.65 / size.x, 1.65 / size.y, 1.6 / size.z);
    model.scale.setScalar(scale);
    model.position.set(-centre.x * scale, -bounds.min.y * scale, -centre.z * scale);
    model.traverse(object => { if (object.isMesh) object.castShadow = object.receiveShadow = true; });
    officeDrawer.add(model);
    officeDrawer.updateWorldMatrix(true, true);
    drawerCollider.setFromObject(officeDrawer);
  }).catch(error => console.warn('Office drawer model unavailable.', error));
  const cratePile = new THREE.Group();
  cratePile.name = 'Sci-fi crate pile right of display terminal';
  // The terminal faces +X; its right-hand side is toward the rear wall (-Z).
  cratePile.position.set(-6.1, 0, -4.25);
  group.add(cratePile);
  const crateCollider = new THREE.Box3();
  colliders.push(crateCollider);
  const crateReady = loadModel('./models/sci-fi-crate-pile.glb').then(gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    const model = batchCabinet(gltf.scene);
    model.rotation.y = Math.PI / 2;
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const centre = bounds.getCenter(new THREE.Vector3());
    const scale = Math.min(1.25 / size.x, 1.5 / size.y, 1.4 / size.z);
    model.scale.setScalar(scale);
    model.position.set(-centre.x * scale, -bounds.min.y * scale, -centre.z * scale);
    model.traverse(object => { if (object.isMesh) object.castShadow = object.receiveShadow = true; });
    cratePile.add(model);
    cratePile.updateWorldMatrix(true, true);
    crateCollider.setFromObject(cratePile);
  }).catch(error => console.warn('Sci-fi crate pile unavailable.', error));
  const wallSign = new THREE.Group();
  wallSign.name = 'Wall-mounted radiation sign';
  wallSign.position.set(6.94, 2.7, -3.7);
  wallSign.rotation.y = -Math.PI / 2;
  group.add(wallSign);
  const signReady = loadModel('./models/radiation-wall-sign.glb').then(gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    const model = gltf.scene;
    // The pole was removed during conversion; orient the triangular face upright.
    model.rotation.y = -Math.PI / 2;
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const centre = bounds.getCenter(new THREE.Vector3());
    const scale = Math.min(1.1 / size.x, 0.95 / size.y);
    model.scale.setScalar(scale);
    model.position.set(-centre.x * scale, -centre.y * scale, -centre.z * scale);
    model.traverse(object => { if (object.isMesh) { object.receiveShadow = true; object.material.side = THREE.DoubleSide; } });
    wallSign.add(model);
  }).catch(error => console.warn('Wall sign unavailable.', error));
  const ready = Promise.all([cabinetReady, drawerReady, crateReady, signReady]);

  return {
    group,
    colliders,
    ready,
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      disposeModel(group);
      placeholderGeometry.dispose();
      placeholderMaterial.dispose();
    },
  };
}
