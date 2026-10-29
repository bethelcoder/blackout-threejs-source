import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function buildCoreBot() {
  const group = new THREE.Group();
  group.name = 'Level 3 bot beside left desk';
  group.position.set(-6.15, 0, 2.0);
  // Stand beside the desk, facing into the room.
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
  const ready = new GLTFLoader().loadAsync(new URL('../assets/models/core-kitchen-bot.glb', import.meta.url).href).then(gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    const model = gltf.scene;
    model.name = 'Imported AI Kitchen Bot';
    // The source armature's baked transform puts the standing axis along -Z.
    // Correct it before measuring, scaling and placing the feet on the floor.
    model.rotation.x = Math.PI / 2;
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = Math.min(1.35 / size.y, 1.15 / Math.max(size.x, size.z));
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    model.traverse(object => { if (object.isMesh) object.castShadow = object.receiveShadow = true; });
    group.add(model);
    group.updateWorldMatrix(true, true);
    collider.setFromObject(group);
  }).catch(error => console.warn('Kitchen bot model unavailable.', error));
  return { group, collider, ready, dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    disposeModel(group);
  } };
}
