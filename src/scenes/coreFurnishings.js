import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function buildCoreFurnishings() {
  const group = new THREE.Group();
  group.name = 'Level 3 organised equipment bays';
  const colliders = [];
  const batches = new Map();
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const steel = new THREE.MeshStandardMaterial({ color: 0x3d505b, metalness: 0.7, roughness: 0.58 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x141f28, metalness: 0.45, roughness: 0.7 });
  const silver = new THREE.MeshStandardMaterial({ color: 0x879a9f, metalness: 0.7, roughness: 0.45 });
  const cyan = new THREE.MeshStandardMaterial({ color: 0x61cdda, emissive: 0x238d9f, emissiveIntensity: 0.65, roughness: 0.5 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xe4b568, emissive: 0x72551c, emissiveIntensity: 0.35 });
  const paint = new THREE.MeshStandardMaterial({ color: 0x9faeaa, roughness: 0.9 });
  const materials = [steel, dark, silver, cyan, amber, paint];

  // Merge static boxes by material so all these details add only a few draw calls.
  function box(x, y, z, w, h, d, material = steel, yaw = 0) {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(w, h, d));
    const geometry = unit.clone().applyMatrix4(matrix);
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(geometry);
  }
  function solid(x, z, w, d, h) {
    colliders.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, h / 2, z), new THREE.Vector3(w, h, d)));
  }
  function screen(name, lines, x, y, z, width, height, yaw = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = 320;
    const context = canvas.getContext('2d');
    context.fillStyle = '#091923'; context.fillRect(0, 0, 768, 320);
    context.strokeStyle = '#316776'; context.lineWidth = 2;
    for (let i = 0; i < 7; i++) { context.beginPath(); context.moveTo(24, 90 + i * 31); context.lineTo(744, 90 + i * 31); context.stroke(); }
    context.fillStyle = '#95e5e9'; context.font = 'bold 30px monospace'; context.fillText(name, 28, 49);
    context.font = '22px monospace';
    lines.forEach((line, i) => context.fillText(line, 30, 110 + i * 48));
    for (let i = 0; i < 20; i++) {
      context.fillStyle = i % 5 === 0 ? '#cfa567' : '#326b77';
      context.fillRect(32 + i * 35, 266 - (i * 17 % 61), 22, 24 + (i * 17 % 61));
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
    mesh.name = name; mesh.position.set(x, y, z); mesh.rotation.y = yaw;
    group.add(mesh);
    // Slim metal housing stays behind its display surface.
    box(x - Math.sin(yaw) * 0.025, y, z - Math.cos(yaw) * 0.025, width + 0.1, height + 0.1, 0.04, dark, yaw);
  }

  // Symmetric rear equipment bays flank the central feeder and corruption panel.
  for (const x of [-3.25, 3.25]) {
    const z = -6.35;
    box(x, 0.06, z, 1.2, 0.12, 0.76, dark);
    box(x, 1.17, z - 0.3, 1.08, 2.2, 0.08, dark);
    for (const side of [-1, 1]) box(x + side * 0.53, 1.17, z, 0.08, 2.2, 0.68, steel);
    box(x, 2.29, z, 1.2, 0.08, 0.76, steel);
    for (let row = 0; row < 6; row++) {
      const y = 0.28 + row * 0.28;
      box(x, y, z, 0.98, 0.21, 0.58, steel);
      box(x, y, z + 0.3, 0.84, 0.145, 0.025, dark);
      for (let slot = 0; slot < 5; slot++) box(x - 0.3 + slot * 0.11, y, z + 0.317, 0.055, 0.065, 0.008, silver);
      box(x + 0.34, y, z + 0.322, 0.028, 0.045, 0.012, row % 3 ? cyan : amber);
    }
    screen(x < 0 ? 'NODE ARRAY / 01' : 'NODE ARRAY / 02', ['CORE LINK  //  ACTIVE', 'THERMAL LOAD  //  NOMINAL'], x, 2.02, z + 0.345, 0.85, 0.3);
    solid(x, z, 1.2, 0.76, 2.33);
  }

  screen('OPERATIONS / CORE SYSTEMS', ['FEEDER BANKS  A / B / C', 'MANUAL ISOLATION ENABLED', 'CONSULT MAINTENANCE SCHEDULE'], -6.96, 2.65, 0, 2.4, 1.0, Math.PI / 2);
  screen('COMPUTE ARRAY / TELEMETRY', ['PROCESSORS  //  DISTRIBUTED', 'SECURITY BUS //  CONNECTED', 'CORE STATUS //  AUTONOMOUS'], 6.96, 3.2, 0, 3, 1.0, -Math.PI / 2);

  // Front-left maintenance bench, with packed diagnostic cases and a tool board.
  const bx = -3.8, bz = 6.3;
  box(bx, 0.96, bz, 2.2, 0.12, 0.8, steel);
  box(bx, 0.89, bz + 0.4, 2.05, 0.045, 0.025, cyan);
  for (const dx of [-0.96, 0.96]) for (const dz of [-0.29, 0.29]) box(bx + dx, 0.45, bz + dz, 0.08, 0.9, 0.08, dark);
  box(bx, 0.27, bz, 1.95, 0.06, 0.62, dark);
  for (const dx of [-0.55, 0.43]) {
    box(bx + dx, 1.15, bz, 0.65, 0.26, 0.43, dark);
    box(bx + dx, 1.285, bz, 0.68, 0.035, 0.46, silver);
    for (const strap of [-0.2, 0.2]) box(bx + dx + strap, 1.15, bz - 0.22, 0.035, 0.22, 0.02, cyan);
  }
  box(bx, 1.95, 6.94, 2.2, 0.8, 0.06, dark);
  for (let i = 0; i < 7; i++) {
    const x = bx - 0.85 + i * 0.28;
    box(x, 1.97, 6.89, 0.025, 0.45, 0.025, silver);
    box(x, 1.73, 6.89, 0.065, 0.14, 0.055, i % 2 ? cyan : amber);
  }
  screen('SERVICE / DIAGNOSTICS', ['SPARES  //  SEALED', 'MAINTENANCE ACCESS'], bx, 2.73, 6.955, 1.9, 0.45, Math.PI);
  solid(bx, bz, 2.2, 0.8, 1.31);

  // Make the existing schedule desk feel like a deliberate briefing station.
  for (const x of [4.48, 5.52]) box(x, 0.5, 4, 0.045, 1, 0.56, silver);
  box(5, 0.92, 4.3, 1.1, 0.035, 0.025, cyan);
  box(5, 1.06, 3.82, 0.07, 0.3, 0.07, silver);
  screen('FEEDER MAINTENANCE', ['READ THE SCHEDULE', 'VERIFY LOAD ORDER'], 5, 1.4, 3.84, 0.85, 0.5);

  // Neat overhead cable trays link equipment bays without floor-level obstacles.
  for (const x of [-6.88, 6.88]) {
    box(x, 3.9, 0, 0.2, 0.09, 10.2, steel);
    for (let z = -4.5; z <= 4.5; z += 0.75) box(x, 3.98, z, 0.27, 0.13, 0.055, dark);
    box(x + (x < 0 ? 0.12 : -0.12), 3.9, 0, 0.015, 0.02, 10, cyan);
  }
  // Low-contrast floor markings define the bench bays; no coloured safe lanes.
  for (const x of [-5.35, -2.25]) for (let z = 5.5; z < 6.9; z += 0.36) box(x, 0.006, z, 0.035, 0.008, 0.18, paint);

  for (const [material, geometries] of batches) {
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach(part => part.dispose());
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'Equipment bay structural details';
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  unit.dispose();
  return { group, colliders, dispose() {
    group.removeFromParent();
    const textures = new Set(), usedMaterials = new Set(materials);
    group.traverse(object => {
      object.geometry?.dispose();
      if (object.material) usedMaterials.add(object.material);
    });
    for (const material of usedMaterials) {
      Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
      material.dispose();
    }
    textures.forEach(texture => texture.dispose());
  } };
}
