import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function buildCoreWetFloorSign() {
  const group = new THREE.Group();
  group.name = 'Level 3 wet-floor sign left of stacked toolboxes';
  // Left of the stack when facing the maintenance wall from inside the room.
  group.position.set(-5.65, 0, 6.1);
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
  const ready = new GLTFLoader().loadAsync('/models/core-wet-floor-sign.glb').then(gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    const model = gltf.scene;
    model.name = 'Imported Wet Floor Sign';
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 0.85 / size.y;
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    model.traverse(object => { if (object.isMesh) object.castShadow = object.receiveShadow = true; });
    group.add(model);
    group.updateWorldMatrix(true, true);
    collider.setFromObject(group);
    // Keep the freestanding sign beside the toolboxes.

    group.updateWorldMatrix(true, true);
    collider.setFromObject(group);
  }).catch(error => console.warn('Wet-floor sign model unavailable.', error));
  return { group, collider, ready, dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    disposeModel(group);
  } };
}

