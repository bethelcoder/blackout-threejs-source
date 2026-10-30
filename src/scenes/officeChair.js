import * as THREE from 'three';
import { loadModel } from '../systems/modelCache.js';
import { CHAIR } from './level2Layout.js';
import { batchStaticModel } from '../systems/staticGeometry.js';

export function arrangeOfficeChair(source, placement = CHAIR) {
  const group = new THREE.Group();
  group.name = 'Office chair in front of terminal desk';
  // The supplied chair faces +X, which is what the moved workstation needs;
  // any extra yaw goes on the group so the fit below stays axis-aligned.
  source.rotation.y = 0;
  // The chair is rigid: combine its screws, wheels and cushions by material.
  source = batchStaticModel(source);
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
  group.position.set(placement.x, 0, placement.z);
  group.rotation.y = placement.rotationY;
  group.updateMatrixWorld(true);
  return { group, collider: new THREE.Box3().setFromObject(group) };
}

export function buildOfficeChair({ scene, colliders, hud, onSit, isSeated, placement = CHAIR }) {
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
      chair = arrangeOfficeChair(gltf.scene, placement);
      chair.group.traverse(object => { if (object.geometry) resources.add(object.geometry); });
      chair.group.userData.interactable = true;
      chair.group.userData.label = 'Sit at desk';
      chair.group.userData.reach = 1.8;
      chair.group.userData.getLabel = () => isSeated?.() ? 'Seated - Space to stand' : 'Sit at desk';
      chair.group.userData.onInteract = () => {
        if (isSeated?.()) return;
        const seated = onSit?.({
          position: placement.seatPosition.clone(),
          target: placement.seatTarget.clone(),
          onStand: () => {
            hud?.setObjective('Standing. Use the retro computer to access the grid terminal.');
          },
        });
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
