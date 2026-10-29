import * as THREE from 'three';
import { loadModel } from '../systems/modelCache.js';

export function arrangeCoreCeiling(model) {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 14 / size.z;
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, 0, -center.z * scale);
  const group = new THREE.Group();
  group.name = 'Imported office ceiling tiles';
  group.position.y = 5.5;
  group.rotation.x = Math.PI;
  group.add(model);
  // Keep the source tile proportions; trim its wider sheet at the room walls.
  const clippingPlanes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 7), new THREE.Plane(new THREE.Vector3(-1, 0, 0), 7),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), 7), new THREE.Plane(new THREE.Vector3(0, 0, -1), 7)];
  model.traverse(object => {
    if (!object.isMesh) return;
    object.receiveShadow = true;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      material.clippingPlanes = clippingPlanes;
      material.clipShadows = true;
      material.needsUpdate = true;
    }
  });
  return group;
}

export function buildCoreCeiling(room) {
  const group = new THREE.Group();
  group.name = 'Level 3 ceiling';
  const original = room.getObjectByName('Room ceiling');
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
  const ready = loadModel('./models/core-ceiling.glb').then(gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    group.add(arrangeCoreCeiling(gltf.scene));
    if (original) original.visible = false;
  }).catch(error => console.warn('Ceiling tiles unavailable; retaining room ceiling.', error));
  return { group, ready, dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    disposeModel(group);
  } };
}
