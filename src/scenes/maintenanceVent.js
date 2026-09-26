import * as THREE from 'three';
import { acquireMaintenanceMaps } from '../systems/maintenanceMaterials.js';
import { sound } from '../systems/audio.js';

export function buildMaintenanceVent({ aiState, onEnter, onExit }) {
  const group = new THREE.Group();
  group.name = 'Maintenance vent route';
  const textures = acquireMaintenanceMaps();
  const metal = new THREE.MeshStandardMaterial({ ...textures.maps, color: 0x969b9e, roughness: 0.9, metalness: 0.3 });
  const black = new THREE.MeshStandardMaterial({ color: 0x101719, roughness: 0.85 });
  const stairBlack = new THREE.MeshStandardMaterial({ color: 0x080808, metalness: 0.15, roughness: 0.95 });
  const handle = new THREE.MeshStandardMaterial({ color: 0xa64627, roughness: 0.7 });
  const lightMaterial = new THREE.MeshBasicMaterial({ color: 0x88b4a7 });
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const solidMeshes = [];
  function box(parent, name, x, y, z, w, h, d, material = metal, solid = false) {
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    parent.add(mesh);
    if (solid) solidMeshes.push(mesh);
    return mesh;
  }

  // The stair casing supplies the walls and ceiling of this concealed cupboard.
  const storage = new THREE.Group();
  storage.name = 'Storage inside black staircase';
  group.add(storage);
  const doorFrame = new THREE.Group();
  doorFrame.name = 'Flush staircase door frame';
  doorFrame.position.set(4.56, 0, 1.2);
  doorFrame.rotation.y = -Math.PI / 2;
  storage.add(doorFrame);
  const storageHinge = new THREE.Group();
  storageHinge.name = 'Storage entrance hinge';
  doorFrame.add(storageHinge);
  const storageDoor = box(storageHinge, 'Flush black staircase door', 0.6, 1.1, 0, 1.19, 2.19, 0.06, stairBlack);
  box(storageHinge, 'Recessed door latch', 1.02, 1.1, 0.035, 0.025, 0.1, 0.015, black);
  let storageOpen = false;
  const storageDoorBox = new THREE.Box3();
  storageHinge.userData.interactable = true;
  storageHinge.userData.reach = 1.4;
  storageHinge.userData.getLabel = () => storageOpen ? 'Close storage door' : 'Open unmarked door';
  storageHinge.userData.onInteract = () => { storageOpen = !storageOpen; sound.playSwitch(); };
  const storageLight = new THREE.PointLight(0xa8b9a3, 1.8, 3.5);
  storageLight.position.set(5.55, 2.6, 1.8);
  storage.add(storageLight);
  box(storage, 'Storage light fixture', 5.55, 2.85, 1.8, 0.35, 0.04, 0.12, lightMaterial);

  const toolCabinet = new THREE.Group();
  toolCabinet.name = 'Searchable maintenance cabinet';
  toolCabinet.position.set(5.55, 0, 3);
  toolCabinet.rotation.y = Math.PI;
  storage.add(toolCabinet);
  box(toolCabinet, 'Cabinet back', 0, 1.1, -0.3, 1.2, 2.2, 0.08, black, true);
  for (const x of [-0.6, 0.6]) box(toolCabinet, 'Cabinet side', x, 1.1, 0, 0.08, 2.2, 0.65, black, true);
  for (const y of [0.05, 1.05, 2.15]) box(toolCabinet, 'Cabinet shelf', 0, y, 0, 1.2, 0.08, 0.65, metal, true);
  const cabinetHinge = new THREE.Group();
  cabinetHinge.name = 'Cabinet door hinge';
  cabinetHinge.position.set(-0.6, 0, 0.36);
  toolCabinet.add(cabinetHinge);
  box(cabinetHinge, 'Unmarked dark access panel', 0.6, 1.1, 0, 1.2, 2.2, 0.06, black);
  box(cabinetHinge, 'Small flush latch', 1.05, 1.1, 0.034, 0.035, 0.09, 0.015, black);
  let cabinetOpen = false;
  const screwdriver = new THREE.Group();
  screwdriver.name = 'Collectable screwdriver';
  screwdriver.position.set(0, 1.13, 0.13);
  screwdriver.visible = false;
  toolCabinet.add(screwdriver);
  box(screwdriver, 'Red grip', -0.15, 0.01, 0, 0.24, 0.07, 0.075, handle);
  box(screwdriver, 'Steel shaft', 0.08, 0.01, 0, 0.23, 0.025, 0.025);
  box(screwdriver, 'Flat tip', 0.21, 0.01, 0, 0.05, 0.012, 0.035);
  // Search the cabinet first, then collect the revealed tool from its shelf.
  const inventory = document.getElementById('tool-inventory');
  inventory.textContent = 'TOOL: None';
  inventory.classList.remove('hidden');
  let hasTool = false;
  toolCabinet.userData.interactable = true;
  toolCabinet.userData.reach = 1.25;
  toolCabinet.userData.getLabel = () => !cabinetOpen ? 'Open access panel' :
    hasTool ? 'Cabinet empty' : cabinetHinge.rotation.y > -1 ? 'Opening cabinet...' : 'Take screwdriver from shelf';
  toolCabinet.userData.onInteract = () => {
    if (!cabinetOpen) { cabinetOpen = true; sound.playSwitch(); return; }
    if (cabinetHinge.rotation.y > -1) return;
    if (hasTool) return;
    hasTool = true;
    screwdriver.visible = false;
    inventory.textContent = 'TOOL: Screwdriver';
    sound.playInteract();
  };

  // Cabinets frame a narrow discovery space without blocking the balcony path.
  const cabinets = new THREE.Group();
  cabinets.name = 'Vent concealment cabinets';
  group.add(cabinets);
  for (const x of [0.35, 3.55]) {
    box(cabinets, 'Electrical cabinet', x, 4.65, 9.48, 1.05, 2.1, 0.8, metal, true);
    for (const y of [4.2, 4.4, 4.6, 4.8, 5]) {
      box(cabinets, 'Cabinet louvre', x, y, 9.065, 0.75, 0.025, 0.02, black);
    }
  }
  const vent = new THREE.Group();
  vent.name = 'Vent assembly';
  vent.position.set(1.95, 4.3, 9.8);
  vent.rotation.y = Math.PI;
  group.add(vent);
  box(vent, 'Dark duct opening', 0, 0, 0, 1.3, 1.1, 0.04, black);
  for (const x of [-0.7, 0.7]) box(vent, 'Vertical frame', x, 0, 0.12, 0.1, 1.3, 0.15);
  for (const y of [-0.6, 0.6]) box(vent, 'Horizontal frame', 0, y, 0.12, 1.5, 0.1, 0.15);
  box(vent, 'Faint light inside duct', 0, 0, 0.04, 1.2, 0.05, 0.02, lightMaterial);
  const hinge = new THREE.Group();
  hinge.name = 'Grille hinge';
  hinge.position.set(-0.65, 0, 0.22);
  vent.add(hinge);
  const grille = new THREE.Group();
  grille.name = 'Screw-fastened grille';
  hinge.add(grille);
  for (let i = 0; i < 8; i++) box(grille, 'Grille slat', 0.65, -0.46 + i * 0.13, 0, 1.3, 0.055, 0.08);
  const screws = [];
  for (const x of [0.07, 1.23]) for (const y of [-0.5, 0.5]) {
    screws.push(box(grille, 'Retaining screw', x, y, 0.06, 0.07, 0.07, 0.035, black));
  }
  let progress = 0;
  let open = false;
  let travelling = false;
  let travelTime = 0;
  let lastScrew = 0;
  let scrapeTime = 0;
  vent.userData.interactable = true;
  vent.userData.getLabel = () => travelling ? 'Crawling through service duct...' : open ? 'Enter service duct' :
    hasTool ? `Hold E to unscrew grille - ${Math.floor(progress / 4 * 100)}%` : 'Maintenance duct - screws require a screwdriver';
  vent.userData.onHold = delta => {
    if (!hasTool || open || travelling) return;
    progress = Math.min(4, progress + delta);
    aiState.raise(delta * 18);
    scrapeTime += delta;
    if (scrapeTime >= 0.3) { sound.playVentScrape(); scrapeTime = 0; }
    const removed = Math.floor(progress);
    if (removed > lastScrew) {
      screws[lastScrew].visible = false;
      lastScrew = removed;
      sound.playSwitch();
    }
    if (progress === 4) { open = true; sound.playAccessGranted(); }
  };
  vent.userData.onInteract = () => {
    if (!open || travelling) return;
    travelling = true;
    onEnter();
    inventory.textContent = 'SERVICE DUCT - Crawling to control room';
  };

  // A separate, enclosed passage supports a short scripted crawl without cutting
  // holes into the existing room walls or changing normal player collision height.
  const duct = new THREE.Group();
  duct.name = 'Service duct interior';
  duct.position.set(30, 0, 0);
  group.add(duct);
  box(duct, 'Duct floor', 0, 0, 0, 1.6, 0.1, 6);
  box(duct, 'Duct ceiling', 0, 1.5, 0, 1.6, 0.1, 6);
  for (const x of [-0.8, 0.8]) box(duct, 'Duct side', x, 0.75, 0, 0.1, 1.5, 6);
  for (const z of [-2, -1, 0, 1, 2]) {
    box(duct, 'Duct seam', 0, 0.07, z, 1.6, 0.035, 0.06, black);
  }
  box(duct, 'Exit light', 0, 0.75, -3, 1.5, 1.4, 0.05, lightMaterial);
  const ductLight = new THREE.PointLight(0x91c9b6, 3, 8);
  ductLight.position.set(0, 1.1, -2);
  duct.add(ductLight);
  group.updateMatrixWorld(true);
  const colliders = solidMeshes.map(mesh => new THREE.Box3().setFromObject(mesh));
  storageDoorBox.setFromObject(storageDoor);
  colliders.push(storageDoorBox);
  return {
    group, colliders,
    get travelling() { return travelling; },
    update(delta, camera) {
      // Do not close the door through someone standing in the doorway.
      if (!storageOpen && camera.position.z > 0.85 && camera.position.z < 2.75 &&
          Math.abs(camera.position.x - 4.56) < 0.4 && camera.position.y < 3.9) storageOpen = true;
      const doorAngle = storageOpen ? -1.8 : 0;
      if (storageHinge.rotation.y !== doorAngle) {
        storageHinge.rotation.y = doorAngle;
        storageHinge.updateMatrixWorld(true);
        storageDoorBox.setFromObject(storageDoor);
      }
      if (cabinetOpen) cabinetHinge.rotation.y = THREE.MathUtils.damp(cabinetHinge.rotation.y, -1.85, 6, delta);
      screwdriver.visible = cabinetOpen && cabinetHinge.rotation.y < -0.7 && !hasTool;
      if (open) hinge.rotation.y = THREE.MathUtils.damp(hinge.rotation.y, -1.6, 7, delta);
      if (travelling) {
        travelTime += delta;
        camera.position.set(30, 0.8 + Math.sin(travelTime * 8) * 0.015, 2 - Math.min(travelTime / 3, 1) * 4);
        camera.rotation.set(0, 0, 0);
        if (travelTime >= 3) { travelling = false; onExit(); }
      }
    },
    dispose() {
      group.removeFromParent();
      unitBox.dispose();
      for (const material of [metal, black, stairBlack, handle, lightMaterial]) material.dispose();
      textures.release();
      inventory.classList.add('hidden');
    },
  };
}
