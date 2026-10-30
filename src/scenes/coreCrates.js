import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export function buildCoreCrates() {
  const group = new THREE.Group();
  group.name = 'Level 3 wooden crates';
  group.position.set(-5.75, 0, 3.65);
  group.rotation.y = 0.18;
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
  // wooden-crates.glb is meshopt-compressed (12 MB -> 458 KB), so the loader needs the decoder.
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const ready = loader.loadAsync('./models/wooden-crates.glb').then(gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    const model = gltf.scene;
    model.name = 'Imported Wooden Crates';
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 1.5 / Math.max(size.x, size.z);
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    model.traverse(object => { if (object.isMesh) object.castShadow = object.receiveShadow = true; });
    group.add(model);
    group.updateWorldMatrix(true, true);
    collider.setFromObject(group);
  }).catch(error => console.warn('Wooden crates model unavailable.', error));
  return { group, collider, ready, dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    disposeModel(group);
  } };
}