import * as THREE from 'three';
import { loadModel } from '../systems/modelCache.js';

/** Fit the supplied square vent to the existing hinged grille, facing local +Z. */
export function arrangeVentCover(source) {
  source.rotation.y = -Math.PI / 2;
  source.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  source.scale.setScalar(1.3 / Math.max(size.x, size.y));
  source.updateMatrixWorld(true);
  bounds.setFromObject(source);
  const center = bounds.getCenter(new THREE.Vector3());
  source.position.set(-center.x, -center.y, 0.015 - bounds.min.z);
  source.traverse(object => {
    if (object.isMesh) object.castShadow = object.receiveShadow = true;
  });
  const group = new THREE.Group();
  group.name = 'Imported Vent.usdz door';
  group.position.x = 0.65;
  group.add(source);
  return group;
}

export function buildVentCover({ parent, onReady }) {
  let disposed = false;
  let cover = null;
  const resources = new Set();
  function release() { resources.forEach(resource => resource.dispose()); resources.clear(); }
  const ready = loadModel(new URL('../assets/models/maintenance-vent-cover.glb', import.meta.url).href).then(gltf => {
    gltf.scene.traverse(object => {
      if (object.geometry) resources.add(object.geometry);
      if (object.material) {
        resources.add(object.material);
        for (const value of Object.values(object.material)) if (value?.isTexture) resources.add(value);
      }
    });
    if (disposed) { release(); return; }
    cover = arrangeVentCover(gltf.scene);
    parent.add(cover);
    onReady?.();
  }).catch(error => { release(); console.error('Could not load vent door; retaining original grille.', error); });
  return {
    ready,
    dispose() {
      disposed = true;
      cover?.removeFromParent();
      release();
    },
  };
}
