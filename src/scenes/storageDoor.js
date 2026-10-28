import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const STORAGE_DOOR_HEIGHT = 2.65;

export function arrangeStorageDoor(model) {
  const meshes = [];
  model.traverse(object => { if (object.isMesh) meshes.push(object); });
  // Converted source order: outer frame, leaf, window, handle, lock.
  const frame = meshes[0], leaf = meshes[1];
  frame.geometry.computeBoundingBox();
  leaf.geometry.computeBoundingBox();
  const bounds = frame.geometry.boundingBox;
  const scale = STORAGE_DOOR_HEIGHT / (bounds.max.y - bounds.min.y);
  const hinge = new THREE.Group();
  hinge.name = 'Imported storage door hinge';
  hinge.position.x = leaf.geometry.boundingBox.max.x;
  model.add(hinge);
  for (const mesh of meshes.slice(1)) {
    hinge.add(mesh);
    mesh.position.x -= hinge.position.x;
  }
  model.scale.setScalar(scale);
  model.position.y = -bounds.min.y * scale;
  model.name = 'Imported Metal Door 2';
  meshes.forEach(mesh => { mesh.castShadow = mesh.receiveShadow = true; });
  return { model, hinge };
}

function buildStorageSign() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 620;
  const context = canvas.getContext('2d');
  context.fillStyle = '#f5f5ed';
  context.fillRect(0, 0, 1024, 620);
  context.strokeStyle = '#101010';
  context.lineWidth = 24;
  context.beginPath(); context.roundRect(34, 34, 956, 552, 42); context.stroke();
  context.fillStyle = '#080808';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '900 172px "Arial Black", sans-serif';
  context.fillText('STORAGE', 512, 205, 870);
  context.fillText('ROOM', 512, 425, 870);
  for (const [x, y] of [[62, 66], [962, 66], [62, 554], [962, 554]]) {
    context.fillStyle = '#95958e'; context.beginPath(); context.arc(x, y, 8, 0, Math.PI * 2); context.fill();
    context.strokeStyle = '#454541'; context.lineWidth = 2; context.beginPath(); context.moveTo(x - 5, y); context.lineTo(x + 5, y); context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.727, 0.025), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, metalness: 0 }));
  sign.name = 'STORAGE ROOM sign';
  sign.position.set(0, 3.03, 0.17);
  return { sign, texture };
}

export function buildStorageDoor({ isUnlocked, hud, sound }) {
  const group = new THREE.Group();
  group.name = 'Storage room entrance';
  group.position.set(0, 0, -9.85);
  const collider = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 1.325, -9.85), new THREE.Vector3(1.58, 2.65, 0.24));
  const fallback = new THREE.Group();
  const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0x68716c, roughness: 0.7 });
  const fallbackLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.34, 2.53, 0.1), fallbackMaterial);
  let hinge = new THREE.Group();
  hinge.position.x = 0.67;
  fallbackLeaf.position.set(-0.67, 1.265, 0);
  hinge.add(fallbackLeaf); fallback.add(hinge); group.add(fallback);
  const { sign, texture } = buildStorageSign();
  group.add(sign);
  let opened = false, disposed = false, imported = null;
  function disposeModel(model) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    model.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
        materials.add(material);
        Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
      }
    });
    geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose());
  }
  const ready = new GLTFLoader().loadAsync('./models/storage-door.glb').then(gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    const arranged = arrangeStorageDoor(gltf.scene);
    imported = arranged.model;
    const angle = hinge.rotation.y;
    hinge = arranged.hinge;
    hinge.rotation.y = angle;
    fallback.removeFromParent();
    group.add(imported);
  }).catch(error => console.warn('Storage door model unavailable; retaining door fallback.', error));
  group.userData.interactable = true;
  group.userData.getLabel = () => opened ? 'Entering Level 2...' : isUnlocked() ? 'Open storage room door - Level 2' : 'Storage room locked - use access keypad';
  group.userData.onInteract = () => {
    if (opened || disposed) return;
    if (!isUnlocked()) { hud.setObjective('Find the code in the technician logbook and enter it on the access keypad.'); return; }
    opened = true;
    collider.makeEmpty();
    sound.playSwitch();
    hud.setObjective('Entering the storage room: Level 2.');
    hud.markLevelComplete();
  };
  return { group, collider, ready, update(delta) {
    if (opened) hinge.rotation.y = THREE.MathUtils.damp(hinge.rotation.y, 1.4, 6, delta);
  }, dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    if (imported) disposeModel(imported);
    fallbackLeaf.geometry.dispose(); fallbackMaterial.dispose();
    sign.geometry.dispose(); sign.material.dispose(); texture.dispose();
  } };
}
