import * as THREE from 'three';
import { loadModel } from '../systems/modelCache.js';

export function arrangeCoreBase(model) {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const floor = model.getObjectByName('Floor_005_M_Floor_003_0');
  if (floor) new THREE.Box3().setFromObject(floor).getCenter(center);
  const scale = 2.6 / Math.max(size.x, size.z);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, 0.01 - bounds.min.y * scale, -center.z * scale);
  model.name = 'XB1101 central AI platform';
  model.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = object.receiveShadow = true;
  });
  return model;
}

export function buildCoreBase() {
  const group = new THREE.Group();
  group.name = 'AI core central platform';
  const fallback = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 2.1),
    new THREE.MeshStandardMaterial({ color: 0x303c43, roughness: 0.65, metalness: 0.6 }));
  fallback.position.y = 0.05;
  group.add(fallback);
  group.updateMatrixWorld(true);
  const collider = new THREE.Box3().setFromObject(group);
  let disposed = false;
  function disposeModel(root) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    root.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
        materials.add(material);
        Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
      }
    });
    geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose());
  }
  const ready = loadModel('./models/core-platform.glb').then(gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    fallback.removeFromParent();
    disposeModel(fallback);
    group.add(arrangeCoreBase(gltf.scene));
    group.updateWorldMatrix(true, true);
    collider.setFromObject(group);
  }).catch(error => console.warn('Core platform model unavailable; retaining platform fallback.', error));
  return { group, collider, ready, dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    disposeModel(group);
  } };
}
