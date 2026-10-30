import * as THREE from 'three';
import { loadModel } from '../systems/modelCache.js';

export function arrangeVenatorSmallDoor(source) {
  source.updateMatrixWorld(true);
  const frame = source.getObjectByName('Small_DoorFrame');
  const leaf = source.getObjectByName('Venator_Door1');
  const bounds = new THREE.Box3().setFromObject(frame);
  const scale = 3.2 / bounds.getSize(new THREE.Vector3()).y;
  const center = bounds.getCenter(new THREE.Vector3());
  source.scale.setScalar(scale);
  source.position.set(-center.x * scale, -bounds.min.y * scale, -bounds.max.z * scale);
  source.traverse(object => {
    if (object.isMesh) object.castShadow = object.receiveShadow = true;
  });
  // The sliding panel retracts behind the header instead of showing through the wall above it.
  leaf.material = leaf.material.clone();
  leaf.material.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 2.78)];
  const group = new THREE.Group();
  group.name = 'Venator small door in front of desk';
  group.add(source);
  group.position.set(0, 0, -7.6);
  group.updateMatrixWorld(true);
  const worldFrame = new THREE.Box3().setFromObject(frame);
  const frameColliders = [
    new THREE.Box3(worldFrame.min.clone(), new THREE.Vector3(-0.93, worldFrame.max.y, worldFrame.max.z)),
    new THREE.Box3(new THREE.Vector3(0.93, worldFrame.min.y, worldFrame.min.z), worldFrame.max.clone()),
    new THREE.Box3(new THREE.Vector3(-0.93, 2.78, worldFrame.min.z), new THREE.Vector3(0.93, worldFrame.max.y, worldFrame.max.z)),
  ];
  return { group, leaf, scale, frameColliders };
}

export function buildVenatorSmallDoor({ scene, colliders = [], onReady }) {
  let disposed = false;
  let door = null;
  let amount = 0;
  const resources = new Set();
  function collect(source) {
    source.traverse(object => {
      if (object.geometry) resources.add(object.geometry);
      if (object.material) {
        resources.add(object.material);
        for (const value of Object.values(object.material)) if (value?.isTexture) resources.add(value);
      }
    });
  }
  function release() { resources.forEach(resource => resource.dispose()); resources.clear(); }
  function apply() { if (door) door.leaf.position.y = amount * 2.85 / door.scale; }
  const ready = loadModel(new URL('../assets/models/venator-small-door.glb', import.meta.url).href)
    .then(gltf => {
      collect(gltf.scene);
      if (disposed) { release(); return; }
      door = arrangeVenatorSmallDoor(gltf.scene);
      collect(door.group);
      apply();
      scene.add(door.group);
      colliders.push(...door.frameColliders);
      onReady?.();
    }).catch(error => { release(); console.error('Could not load small door; retaining original exit.', error); });
  return {
    ready,
    update(delta, unlocked) {
      if (unlocked) amount = Math.min(1, amount + delta * 1.5);
      apply();
    },
    dispose() {
      disposed = true;
      door?.group.removeFromParent();
      door?.frameColliders.forEach(box => {
        const index = colliders.indexOf(box);
        if (index >= 0) colliders.splice(index, 1);
      });
      release();
    },
  };
}
