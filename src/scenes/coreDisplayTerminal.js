import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function buildCoreDisplayTerminal() {
  const group = new THREE.Group();
  group.name = 'Level 3 display terminal beside left desk';
  group.position.set(-6.25, 0, -2.15);
  // Face the terminal into the room beside the workstation.
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
  const ready = new GLTFLoader().loadAsync(new URL('../assets/models/core-display-terminal.glb', import.meta.url).href).then(gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    const model = new THREE.Group();
    // The converter bakes transforms into vertices. Batch matching materials
    // so the many cable details do not each require their own draw call.
    const batches = new Map();
    gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      if (!batches.has(object.material)) batches.set(object.material, []);
      batches.get(object.material).push(object.geometry);
    });
    for (const [material, geometries] of batches) {
      const merged = mergeGeometries(geometries, false);
      if (merged) {
        model.add(new THREE.Mesh(merged, material));
        geometries.forEach(geometry => geometry.dispose());
      } else {
        geometries.forEach(geometry => model.add(new THREE.Mesh(geometry, material)));
      }
    }
    model.name = 'Imported Display Terminal';
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 1.65 / size.y;
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    model.traverse(object => { if (object.isMesh) object.castShadow = object.receiveShadow = true; });
    group.add(model);
    group.updateWorldMatrix(true, true);
    collider.setFromObject(group);
  }).catch(error => console.warn('Display terminal model unavailable.', error));
  return { group, collider, ready, dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    disposeModel(group);
  } };
}
