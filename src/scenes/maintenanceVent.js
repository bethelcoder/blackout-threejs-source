import * as THREE from 'three';
import { sound } from '../systems/audio.js';
import { buildRolledUpSchedule} from './roomBuilder.js';
import { buildVentCover } from './ventCover.js';

// Soft procedural noise used as a bump map so flat colours read as real
// powder-coated / brushed metal instead of smooth plastic.
function makeNoiseTexture(kind, repeat) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (kind === 'brushed') {
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      const row = (Math.random() - 0.5) * 70;
      for (let x = 0; x < size; x++) {
        const v = 128 + row + (Math.random() - 0.5) * 24;
        const i = (y * size + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  } else {
    // "Orange peel" texture of powder coat: tiny noise upscaled with smoothing.
    const small = document.createElement('canvas');
    small.width = small.height = 40;
    const sctx = small.getContext('2d');
    const img = sctx.createImageData(40, 40);
    for (let i = 0; i < 40 * 40; i++) {
      const v = 128 + (Math.random() - 0.5) * 110;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    sctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(small, 0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  return texture;
}

export function buildMaintenanceVent({ aiState, hud, onEnter, onExit, onToolTaken = () => {}, getHeldToolId = () => null }) {
  const group = new THREE.Group();
  group.name = 'Maintenance vent route';

  const peelBump = makeNoiseTexture('peel', 5);
  const brushedBump = makeNoiseTexture('brushed', 4);
  const textures = [peelBump, brushedBump];

  // All materials are matte: high roughness, low metalness (painted steel is
  // not a true mirror-like metal), with bump maps for surface grain.
  const metal = new THREE.MeshStandardMaterial({ color: 0x9ba1a3, roughness: 0.78, metalness: 0.35, bumpMap: brushedBump, bumpScale: 0.25 }); // galvanised duct steel
  const black = new THREE.MeshStandardMaterial({ color: 0x1d2024, roughness: 0.92, metalness: 0.05 }); // rubber / matte plastic
  const steel = new THREE.MeshStandardMaterial({ color: 0x8f9498, roughness: 0.6, metalness: 0.55, bumpMap: brushedBump, bumpScale: 0.2 }); // satin tool steel
  const toolboxPaint = new THREE.MeshStandardMaterial({ color: 0x8a2c25, roughness: 0.82, metalness: 0.06, bumpMap: peelBump, bumpScale: 0.5 }); // powder-coated red (dielectric paint)
  const cabinetPaint = new THREE.MeshStandardMaterial({ color: 0x6d7876, roughness: 0.75, metalness: 0.08, bumpMap: peelBump, bumpScale: 0.4 });
  // The one shiny element per piece of furniture: hardware against matte bodies.
  const chrome = new THREE.MeshStandardMaterial({ color: 0xc4c8cc, roughness: 0.3, metalness: 0.9 });
  const blueGrip = new THREE.MeshStandardMaterial({ color: 0x27527d, roughness: 0.95 }); // dipped rubber
  const handle = new THREE.MeshStandardMaterial({ color: 0xb04f2a, roughness: 0.78 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x9a7048, roughness: 0.92, bumpMap: brushedBump, bumpScale: 0.3 });
  const materials = [chrome, metal, black, steel, toolboxPaint, cabinetPaint, blueGrip, handle, wood];

  // Geometry cache. Boxes get small bevelled edges because no real manufactured
  // object has razor-sharp 90 degree corners.
  const geometries = new Map();
  function bevelBoxGeometry(w, h, d) {
    const key = `b${w.toFixed(4)}_${h.toFixed(4)}_${d.toFixed(4)}`;
    if (geometries.has(key)) return geometries.get(key);
    const r = Math.min(0.012, Math.min(w, h, d) * 0.25);
    const hw = (w - 2 * r) / 2;
    const hh = (h - 2 * r) / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-hw, -hh);
    shape.lineTo(hw, -hh);
    shape.lineTo(hw, hh);
    shape.lineTo(-hw, hh);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: d - 2 * r,
      bevelEnabled: true,
      bevelThickness: r,
      bevelSize: r,
      bevelOffset: 0,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 1,
    });
    geo.translate(0, 0, -(d - 2 * r) / 2);
    geometries.set(key, geo);
    return geo;
  }
  function cylinderGeometry(radius, length) {
    const key = `c${radius.toFixed(4)}_${length.toFixed(4)}`;
    if (geometries.has(key)) return geometries.get(key);
    const geo = new THREE.CylinderGeometry(radius, radius, length, 18);
    geometries.set(key, geo);
    return geo;
  }

  const solidMeshes = [];
  function box(parent, name, x, y, z, w, h, d, material = metal, solid = false) {
    const mesh = new THREE.Mesh(bevelBoxGeometry(w, h, d), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (solid) solidMeshes.push(mesh);
    return mesh;
  }
  // Cylinder whose length runs along the given local axis ('x', 'y' or 'z').
  function cyl(parent, name, x, y, z, radius, length, material = steel, axis = 'x') {
    const mesh = new THREE.Mesh(cylinderGeometry(radius, length), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // The open stair frame leaves the toolbox accessible from the room.
  const toolbox = new THREE.Group();
  toolbox.name = 'Under-stair toolbox';
  toolbox.position.set(5.55, 0, 1.8);
  toolbox.rotation.y = -Math.PI / 2;
  group.add(toolbox);
  box(toolbox, 'Tool chest base', 0, 0.05, 0, 1.5, 0.1, 0.8, toolboxPaint, true);
  for (const x of [-0.72, 0.72]) box(toolbox, 'Tool chest side', x, 0.47, 0, 0.06, 0.84, 0.8, toolboxPaint, true);
  for (const z of [-0.37, 0.37]) box(toolbox, 'Tool chest wall', 0, 0.47, z, 1.4, 0.84, 0.06, toolboxPaint, true);

  // Dark recess behind the drawers so the gaps between them read as real seams.
  box(toolbox, 'Drawer recess', 0, 0.42, 0.402, 1.36, 0.68, 0.01, black);
  for (const y of [0.2, 0.42, 0.64]) {
    box(toolbox, 'Drawer front', 0, y, 0.412, 1.32, 0.19, 0.035, toolboxPaint);
    // Bar-style pull: a round rod held off the face by two end brackets.
    for (const x of [-0.5, 0.5]) box(toolbox, 'Drawer pull bracket', x, y + 0.045, 0.445, 0.035, 0.03, 0.05, chrome);
    cyl(toolbox, 'Drawer pull', 0, y + 0.045, 0.47, 0.011, 1.04, chrome, 'x');
    // Small label-card holder, as on real tool chests.
    box(toolbox, 'Label holder', -0.5, y - 0.04, 0.434, 0.14, 0.04, 0.008, steel);
  }

  // Side carry handles.
  for (const side of [-1, 1]) {
    for (const z of [-0.2, 0.2]) box(toolbox, 'Side handle mount', side * 0.77, 0.72, z, 0.05, 0.035, 0.04, steel);
    cyl(toolbox, 'Side carry handle', side * 0.8, 0.72, 0, 0.014, 0.44, black, 'z');
  }

  // Tool tray with a raised rim and compartments for each tool.
  box(toolbox, 'Tool tray', 0, 0.83, 0, 1.38, 0.04, 0.68, black);
  for (const z of [-0.33, 0.33]) box(toolbox, 'Tray rim', 0, 0.875, z, 1.38, 0.06, 0.03, black);
  for (const x of [-0.675, 0.675]) box(toolbox, 'Tray rim', x, 0.875, 0, 0.03, 0.06, 0.68, black);
  for (const z of [-0.165, 0.01, 0.185]) box(toolbox, 'Tray divider', 0, 0.865, z, 1.3, 0.04, 0.012, black);

  const lidHinge = new THREE.Group();
  lidHinge.name = 'Toolbox lid hinge';
  lidHinge.position.set(0, 0.94, -0.4);
  toolbox.add(lidHinge);
  box(lidHinge, 'Toolbox lid', 0, 0.055, 0.4, 1.52, 0.11, 0.82, toolboxPaint);
  // Rolled lid skirt that drops over the body when closed.
  box(lidHinge, 'Lid skirt front', 0, -0.03, 0.8, 1.52, 0.07, 0.025, toolboxPaint);
  for (const x of [-0.755, 0.755]) box(lidHinge, 'Lid skirt side', x, -0.03, 0.4, 0.025, 0.07, 0.82, toolboxPaint);
  // Moulded grip handle on top.
  for (const x of [-0.2, 0.2]) box(lidHinge, 'Carry handle mount', x, 0.145, 0.4, 0.045, 0.06, 0.06, steel);
  cyl(lidHinge, 'Carry handle grip', 0, 0.185, 0.4, 0.022, 0.46, black, 'x');
  // Steel latches.
  for (const x of [-0.52, 0.52]) {
    box(lidHinge, 'Toolbox latch', x, -0.01, 0.825, 0.065, 0.14, 0.02, chrome);
    box(lidHinge, 'Latch catch', x, -0.075, 0.838, 0.05, 0.03, 0.02, chrome);
  }
  // Piano-style rear hinge.
  cyl(lidHinge, 'Lid hinge pin', 0, 0, -0.005, 0.012, 1.46, chrome, 'x');

  let toolboxOpen = false;
  const tools = [];
  const toolsExposed = () => toolboxOpen && lidHinge.rotation.x < -1.1;
  function refreshTools() {
    for (const tool of tools) {
      tool.visible = toolsExposed() && !tool.userData.taken;
      tool.userData.interactable = tool.visible;
    }
  }
  toolbox.userData.interactable = true;
  toolbox.userData.getLabel = () => !toolboxOpen ? 'Open toolbox' :
    !toolsExposed() ? 'Opening toolbox...' : 'Choose a tool from the tray';
  toolbox.userData.onInteract = () => {
    if (toolboxOpen) return;
    toolboxOpen = true;
    sound.playSwitch();
  };
  function toolModel(itemId, label, z) {
    const tool = new THREE.Group();
    tool.name = label;
    tool.position.set(0, 0.9, z);
    tool.userData.taken = false;
    toolbox.add(tool);
    tools.push(tool);
    tool.visible = false;
    tool.userData.getLabel = () => `Take ${label}`;
    tool.userData.onInteract = () => {
      if (!toolsExposed() || tool.userData.taken) return;
      // Taking is permanent for this level: the tray slot empties and the tool
      // lives in the backpack from here on, so it can be re-held with [B].
      tool.userData.taken = true;
      refreshTools();
      sound.playInteract();
      onToolTaken(itemId);
      hud.setObjective(itemId === 'screwdriver'
        ? `${label} equipped. Hold E on the maintenance vent to unscrew the grille.`
        : `${label} equipped. It will not fit the vent screws - open the backpack [B] to switch tools.`);
    };
    return tool;
  }

  // Screwdriver: ribbed plastic handle, round steel shaft, flat tip.
  const screwdriver = toolModel('screwdriver', 'Screwdriver', -0.25);
  cyl(screwdriver, 'Screwdriver grip', -0.2, 0, 0, 0.034, 0.25, handle, 'x');
  cyl(screwdriver, 'Screwdriver grip end', -0.335, 0, 0, 0.038, 0.03, handle, 'x');
  for (const x of [-0.27, -0.2, -0.13]) cyl(screwdriver, 'Screwdriver grip rib', x, 0, 0, 0.037, 0.02, black, 'x');
  cyl(screwdriver, 'Screwdriver ferrule', -0.065, 0, 0, 0.022, 0.04, steel, 'x');
  cyl(screwdriver, 'Screwdriver shaft', 0.09, 0, 0, 0.0095, 0.27, steel, 'x');
  box(screwdriver, 'Flat screwdriver tip', 0.235, 0, 0, 0.04, 0.012, 0.03, steel);

  // Hammer: wooden handle, forged head with face and claw.
  const hammer = toolModel('hammer', 'Hammer', -0.08);
  cyl(hammer, 'Hammer handle', -0.03, 0, 0, 0.02, 0.4, wood, 'x');
  cyl(hammer, 'Hammer handle end', -0.235, 0, 0, 0.026, 0.04, black, 'x');
  box(hammer, 'Hammer head', 0.19, 0, 0, 0.075, 0.07, 0.11, steel);
  cyl(hammer, 'Hammer face', 0.19, 0, 0.085, 0.036, 0.06, steel, 'z');
  const claw = box(hammer, 'Hammer claw', 0.19, 0, -0.105, 0.06, 0.04, 0.09, steel);
  claw.rotation.x = 0.0;

  // Wrench: flat forged shaft with open jaw.
  const wrench = toolModel('wrench', 'Wrench', 0.1);
  box(wrench, 'Wrench shaft', -0.04, 0, 0, 0.45, 0.022, 0.05, steel);
  box(wrench, 'Wrench jaw base', 0.2, 0, 0, 0.07, 0.024, 0.14, steel);
  for (const z of [-0.055, 0.055]) box(wrench, 'Open wrench jaw', 0.255, 0, z, 0.075, 0.024, 0.03, steel);
  cyl(wrench, 'Wrench hang hole boss', -0.27, 0, 0, 0.032, 0.022, steel, 'y');

  // Pliers: steel jaws with dipped rubber grips and a riveted pivot.
  const pliers = toolModel('pliers', 'Pliers', 0.27);
  for (const side of [-1, 1]) {
    const grip = box(pliers, 'Blue pliers grip', -0.14, 0, side * 0.045, 0.27, 0.04, 0.035, blueGrip);
    grip.rotation.y = side * 0.18;
    const jaw = box(pliers, 'Pliers jaw', 0.12, 0, side * 0.023, 0.19, 0.035, 0.027, steel);
    jaw.rotation.y = -side * 0.1;
  }
  box(pliers, 'Pliers pivot', 0.015, 0, 0, 0.05, 0.045, 0.07, steel);
  cyl(pliers, 'Pliers rivet', 0.015, 0.025, 0, 0.012, 0.01, steel, 'y');

  // Cabinets frame a narrow discovery space without blocking the balcony path.
  const cabinets = new THREE.Group();
  cabinets.name = 'Vent concealment cabinets';
  group.add(cabinets);
  for (const x of [0.35, 3.55]) {
    box(cabinets, 'Electrical cabinet', x, 4.65, 9.48, 1.05, 2.1, 0.8, cabinetPaint, true);
    for (const y of [4.2, 4.4, 4.6, 4.8, 5]) {
      box(cabinets, 'Cabinet louvre', x, y, 9.065, 0.75, 0.025, 0.02, black);
    }
    // Door seam, hinge and a recessed lever handle.
    const edge = x < 2 ? 1 : -1;
    box(cabinets, 'Cabinet door seam', x, 4.65, 9.078, 0.012, 2.0, 0.006, black);
    box(cabinets, 'Cabinet handle plate', x + edge * 0.44, 4.35, 9.06, 0.06, 0.2, 0.02, steel);
    box(cabinets, 'Cabinet handle', x + edge * 0.44, 4.35, 9.035, 0.03, 0.14, 0.03, black);
    for (const y of [3.75, 5.55]) box(cabinets, 'Cabinet hinge', x - edge * 0.51, y, 9.07, 0.03, 0.14, 0.03, chrome);
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
  for (const x of [-0.7, 0.7]) box(vent, 'Vertical frame', x, 0, 0.54, 0.1, 1.5, 0.1, cabinetPaint);
  for (const y of [-0.7, 0.7]) box(vent, 'Horizontal frame', 0, y, 0.54, 1.5, 0.1, 0.1, cabinetPaint);

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
  const originalGrille = grille.children.filter(mesh => mesh.name !== 'Grille backing');
  // Pan-head screws with a slot, instead of plain black cubes.
  for (const x of [0.07, 1.23]) for (const y of [-0.5, 0.5]) {
    const screw = cyl(grille, 'Retaining screw', x, y, 0.07, 0.04, 0.03, steel, 'z');
    const slot = box(screw, 'Screw slot', 0, 0.016, 0, 0.012, 0.004, 0.07, black);
    slot.rotation.y = Math.PI / 2;
    screws.push(screw);
  }
  const ventCover = buildVentCover({ parent: grille, onReady: () => {
    originalGrille.forEach(mesh => { mesh.visible = false; });
  } });

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
    getHeldToolId() === 'screwdriver' ? `Hold E to unscrew grille - ${Math.floor(progress / 4 * 100)}%` :
    getHeldToolId() ? 'Screws need a flat-head screwdriver' : 'Maintenance duct - screws require a tool';
  vent.userData.onInteract = () => {
    if (open || getHeldToolId() === 'screwdriver') return;
    sound.playInteract();
    hud.setObjective('Only a flat-head screwdriver fits these screws. Open the backpack [B] and pick the one from the toolbox.');
  };
  vent.userData.onHold = delta => {
    if (getHeldToolId() !== 'screwdriver' || open) return;
    progress = Math.min(4, progress + delta);
    aiState.raise(delta * 18);
    scrapeTime += delta;
    if (scrapeTime >= 0.3) { sound.playVentScrape(); scrapeTime = 0; }
    const removed = Math.floor(progress);
    while (removed > lastScrew) {
      screws[lastScrew].visible = false;
      lastScrew++;
      sound.playSwitch();
    }
    if (progress === 4) { open = true; sound.playAccessGranted(); }
  };


  // Collect collision bounds after all assemblies have their world transforms.
  
  group.updateMatrixWorld(true);
  const colliders = solidMeshes.map(mesh => new THREE.Box3().setFromObject(mesh));
  return {
    ready: ventCover.ready,
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
      ventCover.dispose();
      group.removeFromParent();
      schedule.dispose();
      for (const geometry of geometries.values()) geometry.dispose();
      geometries.clear();
      for (const texture of textures) texture.dispose();
      for (const material of materials) material.dispose();
    },
  };
}