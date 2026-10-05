import * as THREE from 'three';
import { sound } from '../systems/audio.js';
import { buildRolledUpSchedule} from './roomBuilder.js';
export function buildMaintenanceVent({ aiState, hud, onEnter, onExit }) {
  const group = new THREE.Group();
  group.name = 'Maintenance vent route';
  const metal = new THREE.MeshStandardMaterial({ color: 0x8d9aa5, roughness: 0.6, metalness: 0.7 });
  const black = new THREE.MeshStandardMaterial({ color: 0x202a33, roughness: 0.65, metalness: 0.65 });
  const toolboxPaint = new THREE.MeshStandardMaterial({ color: 0x995c43, metalness: 0.35, roughness: 0.75 });
  const blueGrip = new THREE.MeshStandardMaterial({ color: 0x22619a, roughness: 0.85 });
  const handle = new THREE.MeshStandardMaterial({ color: 0xa64627, roughness: 0.7 });
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

  // The open stair frame leaves the toolbox accessible from the room.
  const toolbox = new THREE.Group();
  toolbox.name = 'Under-stair toolbox';
  toolbox.position.set(5.55, 0.35, 1.8);
  toolbox.rotation.y = -Math.PI / 2;
  group.add(toolbox);
  box(toolbox, 'Tool chest base', 0, 0.05, 0, 1.5, 0.1, 0.8, toolboxPaint, true);
  for (const x of [-0.72, 0.72]) box(toolbox, 'Tool chest side', x, 0.47, 0, 0.06, 0.84, 0.8, toolboxPaint, true);
  for (const z of [-0.37, 0.37]) box(toolbox, 'Tool chest wall', 0, 0.47, z, 1.4, 0.84, 0.06, toolboxPaint, true);
  for (const y of [0.2, 0.42, 0.64]) {
    box(toolbox, 'Dark drawer front', 0, y, 0.405, 1.32, 0.19, 0.035, black);
    box(toolbox, 'Silver drawer pull', 0, y + 0.045, 0.435, 1.18, 0.035, 0.035);
  }
  box(toolbox, 'Tool tray', 0, 0.83, 0, 1.38, 0.04, 0.68, black);
  const lidHinge = new THREE.Group();
  lidHinge.name = 'Toolbox lid hinge';
  lidHinge.position.set(0, 0.94, -0.4);
  toolbox.add(lidHinge);
  box(lidHinge, 'Brown toolbox lid', 0, 0.055, 0.4, 1.52, 0.11, 0.82, toolboxPaint);
  box(lidHinge, 'Carry handle grip', 0, 0.22, 0.4, 0.4, 0.055, 0.065, black);
  for (const x of [-0.2, 0.2]) box(lidHinge, 'Carry handle mount', x, 0.165, 0.4, 0.045, 0.12, 0.065);
  for (const x of [-0.52, 0.52]) box(lidHinge, 'Toolbox latch', x, 0, 0.825, 0.065, 0.14, 0.035);

  const inventory = document.getElementById('tool-inventory');
  inventory.textContent = 'TOOL: None';
  inventory.classList.remove('hidden');
  let heldTool = null;
  let toolboxOpen = false;
  const tools = [];
  const toolsExposed = () => toolboxOpen && lidHinge.rotation.x < -1.1;
  function refreshTools() {
    inventory.textContent = `TOOL: ${heldTool ?? 'None'}`;
    for (const tool of tools) {
      tool.visible = toolsExposed() && heldTool !== tool.name;
      tool.userData.interactable = tool.visible;
    }
  }
  toolbox.userData.interactable = true;
  toolbox.userData.getLabel = () => !toolboxOpen ? 'Open toolbox' :
    !toolsExposed() ? 'Opening toolbox...' : heldTool ? `Return ${heldTool} to toolbox` : 'Choose a tool from the tray';
  toolbox.userData.onInteract = () => {
    if (!toolboxOpen) { toolboxOpen = true; sound.playSwitch(); return; }
    if (!toolsExposed()) return;
    if (heldTool) { heldTool = null; refreshTools(); sound.playInteract(); }
  };
  function toolModel(name, z) {
    const tool = new THREE.Group();
    tool.name = name;
    tool.position.set(0, 0.9, z);
    toolbox.add(tool);
    tools.push(tool);
    tool.visible = false;
    tool.userData.getLabel = () => heldTool ? `Return ${heldTool} before taking ${name}` : `Take ${name}`;
    tool.userData.onInteract = () => {
      if (!toolsExposed()) return;
      if (heldTool) {
        hud.setObjective(`You can carry one tool. Return the ${heldTool.toLowerCase()} to the toolbox first.`);
        return;
      }
      heldTool = name;
      refreshTools();
      sound.playInteract();
      hud.setObjective(`${name} equipped. Try it on the vent, or return it to choose another tool.`);
    };
    return tool;
  }
  const screwdriver = toolModel('Screwdriver', -0.25);
  box(screwdriver, 'Red screwdriver grip', -0.2, 0, 0, 0.25, 0.075, 0.075, handle);
  box(screwdriver, 'Screwdriver shaft', 0.075, 0, 0, 0.3, 0.022, 0.022);
  box(screwdriver, 'Flat screwdriver tip', 0.245, 0, 0, 0.05, 0.012, 0.035);
  const hammer = toolModel('Hammer', -0.08);
  box(hammer, 'Hammer grip', -0.15, 0, 0, 0.3, 0.065, 0.065, black);
  box(hammer, 'Hammer shaft', 0.08, 0, 0, 0.17, 0.035, 0.035);
  box(hammer, 'Hammer head', 0.2, 0, 0, 0.095, 0.07, 0.15);
  const wrench = toolModel('Wrench', 0.1);
  box(wrench, 'Wrench shaft', -0.04, 0, 0, 0.45, 0.025, 0.055);
  box(wrench, 'Wrench jaw base', 0.2, 0, 0, 0.06, 0.03, 0.14);
  for (const z of [-0.055, 0.055]) box(wrench, 'Open wrench jaw', 0.255, 0, z, 0.075, 0.03, 0.03);
  const pliers = toolModel('Pliers', 0.27);
  for (const side of [-1, 1]) {
    const grip = box(pliers, 'Blue pliers grip', -0.14, 0, side * 0.045, 0.27, 0.04, 0.035, blueGrip);
    grip.rotation.y = side * 0.18;
    const jaw = box(pliers, 'Pliers jaw', 0.12, 0, side * 0.023, 0.19, 0.035, 0.027);
    jaw.rotation.y = -side * 0.1;
  }
  box(pliers, 'Pliers pivot', 0.015, 0.012, 0, 0.045, 0.04, 0.065);

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
  // Local +Z faces the room. Keep the compartment in front of the room wall,
  // with its back behind the grille so opening it reveals a square recess.
  const cavityDepth = 0.5;
  const cavityZ = 0.27;
  box(vent, 'Compartment back', 0, 0, 0.02, 1.3, 1.3, 0.04, black, true);
  for (const x of [-0.63, 0.63]) {
    box(vent, 'Compartment side', x, 0, cavityZ, 0.06, 1.3, cavityDepth, metal, true);
  }
  for (const y of [-0.63, 0.63]) {
    box(vent, 'Compartment shelf', 0, y, cavityZ, 1.2, 0.06, cavityDepth, metal, true);
  }
  for (const x of [-0.7, 0.7]) box(vent, 'Vertical frame', x, 0, 0.54, 0.1, 1.5, 0.1);
  for (const y of [-0.7, 0.7]) box(vent, 'Horizontal frame', 0, y, 0.54, 1.5, 0.1, 0.1);

  const hinge = new THREE.Group();
  hinge.name = 'Grille hinge';
  hinge.position.set(-0.65, 0, 0.61);
  vent.add(hinge);
  const grille = new THREE.Group();
  grille.name = 'Screw-fastened grille';
  hinge.add(grille);
  // A solid dark backing hides the paper behind ordinary horizontal louvers.
  box(grille, 'Grille backing', 0.65, 0, -0.025, 1.3, 1.3, 0.035, black);
  for (const x of [0.035, 1.265]) box(grille, 'Grille side rim', x, 0, 0, 0.07, 1.3, 0.06);
  for (const y of [-0.615, 0.615]) box(grille, 'Grille rim', 0.65, y, 0, 1.3, 0.07, 0.06);
  for (let i = 0; i < 9; i++) {
    const slat = box(grille, 'Grille slat', 0.65, -0.52 + i * 0.13, 0.025, 1.16, 0.075, 0.07);
    slat.rotation.x = -0.3;
  }
  const screws = [];
  for (const x of [0.07, 1.23]) for (const y of [-0.5, 0.5]) {
    screws.push(box(grille, 'Retaining screw', x, y, 0.06, 0.07, 0.07, 0.035, black));
  }

    // Rolled technician schedule, tucked just inside the duct — only reachable
  // once the grille has been fully unscrewed.
  const schedule = buildRolledUpSchedule({
    position: [0.15, -0.56, 0.3],
    rotation: [0 , 0.15, Math.PI / 2],
  });
  schedule.mesh.userData.label = 'Read Schedule';
  schedule.mesh.userData.interactable = false; // toggled on once grille opens
  vent.add(schedule.mesh);

  schedule.mesh.visible = false;
  let scheduleTaken = false;
  const showScheduleOverlay = schedule.mesh.userData.onInteract;
  schedule.mesh.userData.onInteract = () => {
    showScheduleOverlay();
    if (!scheduleTaken) {
      scheduleTaken = true;
      sound.playInteract();
      hud.setObjective('Technician shift schedule recovered. Cross-reference the times for the clock panel.');
    }
  };
  let progress = 0;
  let open = false;
  let lastScrew = 0;
  let scrapeTime = 0;
  vent.userData.interactable = true;
  vent.userData.getLabel = () => open ? (scheduleTaken ? 'Schedule recovered' : 'Read the rolled paper inside') :
    heldTool === 'Screwdriver' ? `Hold E to unscrew grille - ${Math.floor(progress / 4 * 100)}%` :
    heldTool ? `Try ${heldTool} on vent` : 'Maintenance duct - screws require a tool';
  vent.userData.onInteract = () => {
    if (open || !heldTool || heldTool === 'Screwdriver') return;
    sound.playInteract();
    hud.setObjective(`The ${heldTool.toLowerCase()} cannot loosen these screws. Return it to the toolbox and try another tool.`);
  };
  vent.userData.onHold = delta => {
    if (heldTool !== 'Screwdriver' || open) return;
    progress = Math.min(4, progress + delta);
    aiState.raise(delta * 18);
    scrapeTime += delta;
    if (scrapeTime >= 0.3) { sound.playVentScrape(); scrapeTime = 0; }
    const removed = Math.floor(progress);
    while (removed > lastScrew) {
      screws[lastScrew].visible = false;
      lastScrew = removed;
      sound.playSwitch();
    }
    if (progress === 4) { open = true; sound.playAccessGranted(); }
  };


  // Collect collision bounds after all assemblies have their world transforms.
  
  group.updateMatrixWorld(true);
  const colliders = solidMeshes.map(mesh => new THREE.Box3().setFromObject(mesh));
  return {
    group, colliders,
    
    update(delta, camera) {
      if (toolboxOpen) lidHinge.rotation.x = THREE.MathUtils.damp(lidHinge.rotation.x, -1.85, 6, delta);
      refreshTools();
      if (open) hinge.rotation.y = THREE.MathUtils.damp(hinge.rotation.y, -1.6, 7, delta);
      const paperExposed = open && hinge.rotation.y < -1.2;
      schedule.mesh.visible = paperExposed;
      schedule.mesh.userData.interactable = paperExposed;
    },
    dispose() {
      group.removeFromParent();
      schedule.dispose();
      unitBox.dispose();
      for (const material of [metal, black, toolboxPaint, handle, blueGrip]) material.dispose();
      inventory.classList.add('hidden');
    },
  };
}
