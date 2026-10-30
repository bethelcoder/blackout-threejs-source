import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Cabinets are static scenery: keep their materials but batch the small parts.
export function batchStaticModel(source) {
  source.updateMatrixWorld(true);
  const batches = new Map();
  const originals = new Set();
  source.traverse(object => {
    if (!object.isMesh) return;
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    originals.add(object.geometry);
    if (!batches.has(object.material)) batches.set(object.material, []);
    batches.get(object.material).push(geometry);
  });
  const group = new THREE.Group();
  group.name = 'Batched static storage cabinet';
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries, false);
    if (!merged) throw new Error('Cabinet geometry attributes do not match');
    group.add(new THREE.Mesh(merged, material));
    geometries.forEach(geometry => geometry.dispose());
  }
  originals.forEach(geometry => geometry.dispose());
  return group;
}

