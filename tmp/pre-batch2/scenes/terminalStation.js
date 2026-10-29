import * as THREE from 'three';
import { loadModel } from '../systems/modelCache.js';

/** Retain the complete L-shaped workstation; put the usable computer on its clear wing. */
export function arrangeTerminalStation(deskSource, computerSource, { onInteract, getLabel }) {
  const group = new THREE.Group();
  group.name = 'Imported terminal workstation';
  function fit(source, scale, rotation = 0) {
    source.rotation.y = rotation;
    source.scale.setScalar(scale);
    source.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(source);
    const center = box.getCenter(new THREE.Vector3());
    source.position.add(new THREE.Vector3(-center.x, -box.min.y, -center.z));
    source.traverse(object => {
      if (object.isMesh) { object.castShadow = object.receiveShadow = true; }
    });
  }
  const desk = new THREE.Group();
  desk.name = 'Complete Desk_design_1 workstation';
  fit(deskSource, 0.005);
  desk.add(deskSource);
  desk.position.set(0, 0, -5.7);
  desk.rotation.y = -Math.PI / 2;
  group.add(desk);

  const computer = new THREE.Group();
  computer.name = 'Retro computer grid terminal';
  // Source keyboard faces +X: the right-hand side of the room.
  fit(computerSource, 0.0035);
  computer.add(computerSource);
  const desktopHeight = 208.74721 * 0.005;
  const wingCenter = (234.84064 - 78.28023) * 0.005;
  // Keep the right-facing computer centred on the rotated side wing.
  computer.position.set(-wingCenter, desktopHeight, -5.7);
  computer.userData.interactable = true;
  computer.userData.label = 'Use grid terminal';
  computer.userData.getLabel = getLabel;
  computer.userData.onInteract = onInteract;
  group.add(computer);
  group.updateMatrixWorld(true);

  // Two separate footprints leave the inside of the L accessible.
  const colliders = [
    new THREE.Box3(new THREE.Vector3(-0.78281, 0, -1.17421), new THREE.Vector3(0, 1.5, 0.39141)).applyMatrix4(desk.matrixWorld),
    new THREE.Box3(new THREE.Vector3(-0.78281, 0, 0.39141), new THREE.Vector3(0.78281, desktopHeight, 1.17421)).applyMatrix4(desk.matrixWorld),
    new THREE.Box3().setFromObject(computer),
  ];
  return { group, colliders, computer };
}

export function buildTerminalStation({ scene, colliders, onInteract, getLabel, onReady }) {
  let disposed = false;
  let station = null;
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

  async function load(url) {
    const gltf = await loadModel(url);
    collect(gltf.scene);
    if (disposed) { release(); return null; }
    return gltf.scene;
  }
  const ready = Promise.all([
    load(new URL('../assets/models/terminal-desk.glb', import.meta.url).href),
    load(new URL('../assets/models/retro-computer.glb', import.meta.url).href),
  ]).then(([desk, computer]) => {
    if (disposed) return;
    station = arrangeTerminalStation(desk, computer, { onInteract, getLabel });
    scene.add(station.group);
    colliders.push(...station.colliders);
    onReady?.();
  }).catch(error => {
    disposed = true;
    release();
    console.error('Could not load the desk/computer; retaining the original terminal.', error);
  });
  return {
    ready,
    dispose() {
      disposed = true;
      station?.group.removeFromParent();
      station?.colliders.forEach(box => {
        const index = colliders.indexOf(box);
        if (index >= 0) colliders.splice(index, 1);
      });
      release();
    },
  };
}
