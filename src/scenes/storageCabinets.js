import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { batchStaticModel } from '../systems/staticGeometry.js';

// Both copies share one download, their geometry, and their PBR textures.
export function buildStorageCabinets() {
  const group = new THREE.Group();
  group.name = 'Imported metal storage cabinets';
  const colliders = [];
  const cabinets = [];
  const placeholderGeometry = new THREE.BoxGeometry(1.183, 2.1, 0.7);
  const placeholderMaterial = new THREE.MeshStandardMaterial({ color: 0x71776c, roughness: 0.85 });
  for (const [name, x, z, yaw] of [
    ['Right wall cabinet near Level 2', 6.56, -7.3, -Math.PI / 2],
    ['Left wall cabinet near clock', -6.56, 4.4, Math.PI / 2],
  ]) {
    const cabinet = new THREE.Group();
    cabinet.name = name;
    cabinet.position.set(x, 0, z);
    cabinet.rotation.y = yaw;
    const placeholder = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
    placeholder.position.y = 1.05;
    cabinet.add(placeholder);
    group.add(cabinet);
    cabinet.updateWorldMatrix(true, true);
    const collider = new THREE.Box3().setFromObject(cabinet);
    colliders.push(collider);
    cabinets.push({ cabinet, placeholder, collider });
  }
  let disposed = false;
  let template = null;
  function disposeModel(model) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
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
  const ready = new GLTFLoader().loadAsync('./models/metal-storage-cabinet.glb').then(gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    template = batchStaticModel(gltf.scene);
    const bounds = new THREE.Box3().setFromObject(template);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 2.1 / size.y;
    for (const { cabinet, placeholder, collider } of cabinets) {
      const model = template.clone(true);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      model.traverse(object => { if (object.isMesh) object.castShadow = object.receiveShadow = true; });
      placeholder.removeFromParent();
      cabinet.add(model);
      cabinet.updateWorldMatrix(true, true);
      collider.setFromObject(cabinet);
    }
  }).catch(error => console.warn('Storage cabinet model unavailable; retaining cabinet fallback.', error));
  return { group, colliders, ready, dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    if (template) disposeModel(template);
    placeholderGeometry.dispose();
    placeholderMaterial.dispose();
  } };
}
