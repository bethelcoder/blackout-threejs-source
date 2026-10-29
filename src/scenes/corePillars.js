import * as THREE from 'three';
import { loadModel } from '../systems/modelCache.js';

export function buildCorePillars() {
  const group = new THREE.Group();
  group.name = 'Level 3 corner pillars';
  const colliders = [], holders = [];
  const geometry = new THREE.BoxGeometry(0.805, 5.48, 0.805);
  const material = new THREE.MeshStandardMaterial({ color: 0x465461, metalness: 0.65, roughness: 0.6 });
  // Room walls are at +/-7; columns have a 0.805 m footprint.
  // Leave about 2 cm between the outer edges and each adjoining wall.
  for (const x of [-6.575, 6.575]) for (const z of [-6.575, 6.575]) {
    const holder = new THREE.Group();
    holder.name = `Corner pillar ${x < 0 ? 'left' : 'right'} ${z < 0 ? 'back' : 'front'}`;
    holder.position.set(x, 0, z);
    const fallback = new THREE.Mesh(geometry, material);
    fallback.position.y = 2.74;
    holder.add(fallback);
    group.add(holder);
    holder.updateWorldMatrix(true, true);
    const collider = new THREE.Box3().setFromObject(holder);
    colliders.push(collider); holders.push({ holder, fallback, collider });
  }
  let disposed = false, template = null;
  function disposeModel(root) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    root.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const mat of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
        materials.add(mat);
        Object.values(mat).forEach(value => { if (value?.isTexture) textures.add(value); });
      }
    });
    geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose());
  }
  const ready = loadModel('./models/core-pillar.glb').then(gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    template = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(template);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 5.48 / size.y;
    template.scale.setScalar(scale);
    template.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    template.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = object.receiveShadow = true;
    });
    for (const { holder, fallback, collider } of holders) {
      fallback.removeFromParent();
      holder.add(template.clone(true));
      holder.updateWorldMatrix(true, true);
      collider.setFromObject(holder);
    }
  }).catch(error => console.warn('Corner pillar model unavailable; retaining pillar fallback.', error));
  return { group, colliders, ready, dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    if (template) disposeModel(template);
    geometry.dispose(); material.dispose();
  } };
}
