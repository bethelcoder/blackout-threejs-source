import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function buildFrontDoor() {
  const group = new THREE.Group();
  group.name = 'Front wall metal door';
  group.position.set(0, 0, 9.82);
  const material = new THREE.MeshStandardMaterial({ color: 0x596167, roughness: 0.8 });
  const placeholder = new THREE.Mesh(new THREE.BoxGeometry(1.312, 2.65, 0.17), material);
  placeholder.position.y = 1.325;
  group.add(placeholder);
  group.updateMatrixWorld(true);
  const collider = new THREE.Box3().setFromObject(group);
  let disposed = false, imported = null;
  function disposeModel(model) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    model.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const mat of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
        materials.add(mat);
        Object.values(mat).forEach(value => { if (value?.isTexture) textures.add(value); });
      }
    });
    geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose());
  }
  const ready = new GLTFLoader().loadAsync('./models/front-door.glb').then(gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    imported = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(imported);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 2.65 / size.y;
    imported.scale.setScalar(scale);
    imported.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    // The source's front faces -Z, into the room from the entrance wall.
    imported.traverse(object => { if (object.isMesh) object.castShadow = object.receiveShadow = true; });
    placeholder.removeFromParent();
    group.add(imported);
    group.updateWorldMatrix(true, true);
    collider.setFromObject(group);
  }).catch(error => console.warn('Front door model unavailable; retaining door fallback.', error));
  return { group, collider, ready, dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    if (imported) disposeModel(imported);
    placeholder.geometry.dispose(); material.dispose();
  } };
}
