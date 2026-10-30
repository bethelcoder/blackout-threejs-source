import * as THREE from 'three';
import { loadModel } from '../systems/modelCache.js';

export function arrangeOfficeChair(source) {
  const group = new THREE.Group();
  group.name = 'Office chair in front of terminal desk';
  // The supplied chair faces +X; turn the seat toward the desk at -Z.
  source.rotation.y = Math.PI / 2;
  source.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(source);
  source.scale.setScalar(1.25 / bounds.getSize(new THREE.Vector3()).y);
  source.updateMatrixWorld(true);
  bounds.setFromObject(source);
  const center = bounds.getCenter(new THREE.Vector3());
  source.position.add(new THREE.Vector3(-center.x, -bounds.min.y, -center.z));
  source.traverse(object => {
    if (object.isMesh) object.castShadow = object.receiveShadow = true;
  });
  group.add(source);
  group.position.set(0.4, 0, -4.8);
  group.updateMatrixWorld(true);
  return { group, collider: new THREE.Box3().setFromObject(group) };
}

export function buildOfficeChair({ scene, colliders, hud, onSit, isSeated }) {
  let disposed = false;
  let chair = null;
  const resources = new Set();
  function release() { resources.forEach(resource => resource.dispose()); resources.clear(); }
  const ready = loadModel(new URL('../assets/models/office-chair.glb', import.meta.url).href)
    .then(gltf => {
      gltf.scene.traverse(object => {
        if (object.geometry) resources.add(object.geometry);
        if (object.material) {
          resources.add(object.material);
          for (const value of Object.values(object.material)) if (value?.isTexture) resources.add(value);
        }
      });
      if (disposed) { release(); return; }
      chair = arrangeOfficeChair(gltf.scene);
      chair.group.userData.interactable = true;
      chair.group.userData.label = 'Sit at desk';
      chair.group.userData.reach = 1.8;
      chair.group.userData.getLabel = () => isSeated?.() ? 'Seated - Space to stand' : 'Sit at desk';
      chair.group.userData.onInteract = () => {
        if (isSeated?.()) return;
        const position = new THREE.Vector3(0.4, 1.32, -4.88);
        const target = new THREE.Vector3(0.4, 1.3, -6);
        const seated = onSit?.({ position, target, onStand: () => {
          hud?.setObjective('Standing. Use the retro computer to access the grid terminal.');
        } });
        if (seated) hud?.setObjective('Seated at desk. Look at the retro computer and press E to use it. Press Space to stand.');
      };
      scene.add(chair.group);
      colliders.push(chair.collider);
    }).catch(error => { release(); console.error('Could not load office chair.', error); });
  return {
    ready,
    dispose() {
      disposed = true;
      chair?.group.removeFromParent();
      if (chair) {
        const index = colliders.indexOf(chair.collider);
        if (index >= 0) colliders.splice(index, 1);
      }
      release();
    },
  };
}
