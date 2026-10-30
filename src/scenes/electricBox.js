import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createWireRepair, openWireRepair } from '../systems/wireRepair.js';

export function buildElectricBox({ hud, sound }) {
  const group = new THREE.Group();
  group.name = 'Electric Box - Payam Tavakoli';
  let disposed = false, closePanel = null;
  const repair = createWireRepair(() => {
    sound.playAccessGranted?.();
    hud.setObjective('Electric box repaired. Use the light switch on the entrance-side right wall [E].');
    indicator.material.color.setHex(0x9ce6ad);
  });
  const placeholder = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.8, 0.34), new THREE.MeshStandardMaterial({ color: 0x48564e, roughness: 0.85 }));
  group.add(placeholder);
  const indicator = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb454, toneMapped: false }));
  indicator.position.set(0.23, 0.32, 0.19);
  group.add(indicator);
  function disposeModel(model) {
    const textures = new Set(), materials = new Set(), geometries = new Set();
    model.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
        materials.add(material);
        Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
      }
    });
    geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose());
  }
  new GLTFLoader().load('./models/electric-box.glb', gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    placeholder.removeFromParent();
    disposeModel(placeholder);
    // Cabinet body is about 100 source units high. Preserve its attached wiring.
    gltf.scene.scale.setScalar(0.008);
    gltf.scene.position.y = -0.4;
    group.add(gltf.scene);
  }, undefined, error => console.warn('Electric box model unavailable; using cabinet fallback.', error));
  group.userData.interactable = true;
  group.userData.getLabel = () => repair.repaired ? 'Inspect repaired electric box' : 'Repair electric box wiring';
  group.userData.onInteract = () => {
    if (disposed || closePanel || document.getElementById('wiring-panel-overlay')) return;
    closePanel = openWireRepair(repair, () => { closePanel = null; });
  };
  return { group, get repaired() { return repair.repaired; }, dispose() {
    disposed = true;
    closePanel?.();
    group.removeFromParent();
    disposeModel(group);
  } };
}
