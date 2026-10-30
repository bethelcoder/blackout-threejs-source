import * as THREE from 'three';
import { loadModel } from '../systems/modelCache.js';

export function buildCoreExtinguisher() {
  const group = new THREE.Group();
  group.name = 'Level 3 wall-mounted fire extinguisher';
  group.position.set(-6.75, 0.85, 5.8);
  // Face into the room from the left wall.
  group.rotation.y = Math.PI / 2;
  const collider = new THREE.Box3();
  let disposed = false;
  function disposeModel(root) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    root.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const mat of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
        materials.add(mat); Object.values(mat).forEach(value => { if (value?.isTexture) textures.add(value); });
      }
    });
    geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose());
  }
  const ready = loadModel(new URL('../assets/models/core-fire-extinguisher.glb', import.meta.url).href).then(gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    const model = gltf.scene;
    model.name = 'Imported Fire Extinguisher';
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 0.75 / size.y;
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    model.traverse(object => { if (object.isMesh) object.castShadow = object.receiveShadow = true; });
    group.add(model);
    group.updateWorldMatrix(true, true);
    collider.setFromObject(group);
    // Place its back against the wall, without burying any model parts.
    group.position.x += -6.94 - collider.min.x;
    group.updateWorldMatrix(true, true);
    collider.setFromObject(group);
  }).catch(error => console.warn('Fire extinguisher model unavailable.', error));
  return { group, collider, ready, dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    disposeModel(group);
  } };
}
