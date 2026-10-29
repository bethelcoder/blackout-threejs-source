import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function buildLeftWorkstation() {
  const group = new THREE.Group();
  group.name = 'Level 3 left-wall computer desk';
  group.position.set(-6.25, 0, 0);
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
  const loader = new GLTFLoader();
  const load = url => loader.loadAsync(url).then(gltf => gltf.scene).catch(error => { console.warn('Workstation asset unavailable.', url, error); return null; });
  const ready = Promise.all([load('./models/left-computer-desk.glb'), load('./models/left-personal-computer.glb')]).then(([desk, computer]) => {
    if (disposed || !desk) { if (desk) disposeModel(desk); if (computer) disposeModel(computer); return; }
    const bounds = new THREE.Box3().setFromObject(desk);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 2.2 / size.x;
    const tabletop = size.y * scale;
    desk.name = 'Imported Computer Desk';
    desk.scale.setScalar(scale);
    desk.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    group.add(desk);
    if (computer) {
      const pcBounds = new THREE.Box3().setFromObject(computer);
      const pcSize = pcBounds.getSize(new THREE.Vector3());
      const pcCenter = pcBounds.getCenter(new THREE.Vector3());
      const pcScale = Math.min(1.1 / pcSize.x, 0.9 / pcSize.z);
      computer.name = 'Imported Personal Computer';
      computer.scale.setScalar(pcScale);
      computer.position.set(-pcCenter.x * pcScale, tabletop + 0.005 - pcBounds.min.y * pcScale, -pcCenter.z * pcScale);
      group.add(computer);
    }
    group.traverse(object => { if (object.isMesh) object.castShadow = object.receiveShadow = true; });
    group.updateWorldMatrix(true, true);
    collider.setFromObject(group);
  });
  return { group, collider, ready, dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    disposeModel(group);
  } };
}
