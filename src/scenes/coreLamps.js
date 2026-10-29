import * as THREE from 'three';
import { loadModel } from '../systems/modelCache.js';

export function arrangeCoreLamp(model) {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 1.2 / Math.max(size.x, size.z);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  model.traverse(object => {
    if (!object.isMesh) return;
    object.receiveShadow = true;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material.emissiveMap) material.emissiveIntensity = 1.4;
      else { material.metalness = 0.6; material.roughness = 0.55; }
    }
  });
  const mounted = new THREE.Group();
  mounted.name = 'Imported fluorescent ceiling fixture';
  mounted.rotation.x = Math.PI;
  mounted.add(model);
  return mounted;
}

export function buildCoreLamps() {
  const group = new THREE.Group();
  group.name = 'Level 3 fluorescent ceiling lights';
  const holders = [];
  for (const x of [-3.2, 3.2]) for (const z of [-3, 3]) {
    const holder = new THREE.Group();
    holder.position.set(x, 5.48, z);
    group.add(holder);
    holders.push(holder);
    const light = new THREE.PointLight(0xe2edff, 4, 11, 1.5);
    light.name = 'Fluorescent room illumination';
    light.position.set(x, 5.15, z);
    group.add(light);
  }
  let disposed = false, template = null;
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
  const ready = loadModel('./models/core-lamp.glb').then(gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    template = arrangeCoreLamp(gltf.scene);
    for (const holder of holders) holder.add(template.clone(true));
  }).catch(error => console.warn('Ceiling fixture model unavailable; retaining room illumination.', error));
  return { group, ready, dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    if (template) disposeModel(template);
  } };
}
