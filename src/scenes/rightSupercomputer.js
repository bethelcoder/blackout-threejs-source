import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function buildRightSupercomputer() {
  const group = new THREE.Group();
  group.name = 'Level 3 right-wall supercomputer';
  group.position.set(5.4, 0, 0);
  group.rotation.y = -Math.PI / 2;
  const fallback = new THREE.Mesh(new THREE.BoxGeometry(5.53, 2.1, 2.97), new THREE.MeshStandardMaterial({ color: 0x3c4850, roughness: 0.7 }));
  fallback.position.y = 1.05; group.add(fallback);
  group.updateMatrixWorld(true);
  const collider = new THREE.Box3().setFromObject(group);
  let disposed = false, imported = null;
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
  const ready = new GLTFLoader().loadAsync('./models/right-supercomputer.glb').then(gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    imported = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(imported);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 2.1 / size.y;
    imported.scale.setScalar(scale);
    imported.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    imported.traverse(object => { if (object.isMesh) object.castShadow = object.receiveShadow = true; });
    fallback.removeFromParent(); group.add(imported);
    group.updateWorldMatrix(true, true);
    collider.setFromObject(group);
  }).catch(error => console.warn('Right-wall supercomputer unavailable; retaining fallback.', error));
  return { group, collider, ready, dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    if (imported) disposeModel(imported);
    fallback.geometry.dispose(); fallback.material.dispose();
  } };
}
