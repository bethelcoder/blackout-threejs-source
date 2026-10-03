import * as THREE from 'three';
import { acquireMaintenanceMaps, createMetalBoxGeometry } from '../systems/maintenanceMaterials.js';

/** Perimeter balcony with an open stairwell at the front-right corner. */
export function buildMaintenanceWalkway() {
  const group = new THREE.Group();
  group.name = 'Maintenance walkway';
  group.position.x = 5.55;
  const stairs = new THREE.Group();
  stairs.name = 'Stairs';
  const platform = new THREE.Group();
  platform.name = 'Platform and supports';
  const railings = new THREE.Group();
  railings.name = 'Safety railings';
  group.add(stairs, platform, railings);

  const textures = acquireMaintenanceMaps();
  const geometries = new Map();
  const steel = new THREE.MeshStandardMaterial({ ...textures.maps, color: 0xa2adb3, metalness: 0.35, roughness: 0.95, normalScale: new THREE.Vector2(0.7, 0.7) });
  const railingMetal = new THREE.MeshStandardMaterial({ color: 0x202a33, metalness: 0.75, roughness: 0.55 });
  const stepSides = new THREE.MeshStandardMaterial({ color: 0x080808, metalness: 0.15, roughness: 0.95 });
  const treadCanvas = document.createElement('canvas');
  treadCanvas.width = treadCanvas.height = 128;
  const treadContext = treadCanvas.getContext('2d');
  treadContext.fillStyle = '#7e8790';
  treadContext.fillRect(0, 0, 128, 128);
  treadContext.strokeStyle = '#a9b0b5';
  treadContext.lineWidth = 2;
  for (let y = 0; y < 128; y += 16) {
    for (let x = 0; x < 128; x += 16) {
      const offset = (y / 16) % 2 ? 8 : 0;
      treadContext.beginPath();
      treadContext.moveTo(x + offset + 2, y + 4);
      treadContext.lineTo(x + offset + 8, y + 10);
      treadContext.stroke();
    }
  }
  const treadTexture = new THREE.CanvasTexture(treadCanvas);
  treadTexture.colorSpace = THREE.SRGBColorSpace;
  treadTexture.wrapS = treadTexture.wrapT = THREE.RepeatWrapping;
  const treadSteel = new THREE.MeshStandardMaterial({
    map: treadTexture, bumpMap: treadTexture, bumpScale: 0.008,
    color: 0x9da7b2, metalness: 0.65, roughness: 0.65,
  });
  const blueStrip = new THREE.MeshStandardMaterial({
    color: 0x87cedb, emissive: 0x438595, emissiveIntensity: 0.3, roughness: 0.5,
  });
  // Box face order: right, left, top, bottom, front, back.
  const stepMaterials = [railingMetal, railingMetal, treadSteel, railingMetal, railingMetal, railingMetal];
  const solids = [];
  const floors = [];
  function box(parent, name, x, y, z, w, h, d, material = steel, solid = true, walkable = false) {
    const key = `${w},${h},${d}`;
    if (!geometries.has(key)) geometries.set(key, createMetalBoxGeometry(w, h, d));
    const geometry = geometries.get(key);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (solid) solids.push(mesh);
    if (walkable) floors.push(mesh);
    return mesh;
  }

  // Ascend toward the back (-Z): eighteen 20 cm rises, with 40 cm treads.
  for (let i = 0; i < 18; i++) {
    const top = (i + 1) * 0.2;
    const z = 7.8 - i * 0.4;
    if (i < 11) {
      box(stairs, `Step ${i + 1}`, 0, top - 0.05, z, 2, 0.1, 0.34, stepMaterials, true, true);
    } else {
      // Preserve the solid black outline, enclosing a cupboard beneath the treads.
      box(stairs, `Step ${i + 1}`, 0, top - 0.05, z, 2, 0.1, 0.34, stepMaterials, true, true);
      box(stairs, 'Black outer stair casing', 0.95, top / 2, z, 0.1, top, 0.4, stepSides);
      const doorSection = i >= 14 && i <= 16; // Opening spans Z = 1.2 to 2.4.
      const bottom = doorSection ? 2.2 : 0;
      box(stairs, 'Black inner stair casing', -0.95, (top + bottom) / 2, z,
        0.1, top - bottom, 0.4, stepSides);
    }
    box(stairs, 'Steel tread nosing', 0, top + 0.006, z + 0.14, 2, 0.012, 0.035, railingMetal, false);
  }
  // Two continuous stringers carry the open treads.
  for (const x of [-0.88, 0.88]) {
    const stringer = box(stairs, 'Dark stair stringer', x, 1.72, 4.4,
      0.12, 0.16, Math.hypot(7.2, 3.6), railingMetal, false);
    stringer.rotation.x = Math.atan2(3.6, 7.2);
    const strip = box(stairs, 'Blue stringer inset', x, 1.81, 4.4,
      0.025, 0.012, Math.hypot(7.2, 3.6), blueStrip, false);
    strip.rotation.x = stringer.rotation.x;
  }
  box(stairs, 'Black stair end casing' , 0, 1.8, 0.85, 2, 3.6, 0.1, stepSides);
  // Four sides share a continuous walking height. Leave the stairwell uncovered
  // so the front deck never forms a low ceiling over the ascending player.
  // Outer edges meet the room walls at world X = +/-7 and Z = +/-10.
  // Keep the inner edges fixed so railings and the stair landing still align.
  // Real 1.2 m gaps: split both rendered decks and their collision surfaces.
  box(platform, 'Right deck before gap', 0.225, 3.5, -0.8, 2.45, 0.2, 3.2, steel, true, true);
  box(platform, 'Right deck after gap', 0.225, 3.5, -5.65, 2.45, 0.2, 4.1, steel, true, true);
  box(platform, 'Back deck before gap', -1.725, 3.5, -8.85, 6.35, 0.2, 2.3, steel, true, true);
  box(platform, 'Back deck after gap', -9.325, 3.5, -8.85, 6.45, 0.2, 2.3, steel, true, true);
  box(platform, 'Left deck', -11.325, 3.5, 0, 2.45, 0.2, 15.4, steel, true, true);
  box(platform, 'Front deck', -6.875, 3.5, 8.85, 11.35, 0.2, 2.3, steel, true, true);
  const damage = new THREE.Group();
  damage.name = 'Fractured deck edges';
  platform.add(damage);
  // Short metal shards mark the lips without forming a bridge across either gap.
  for (let i = 0; i < 6; i++) {
    for (const z of [-2.4, -3.6]) {
      const shard = box(damage, 'Torn right deck lip', -0.8 + i * 0.4, 3.46, z,
        0.13, 0.07, 0.22, railingMetal, false);
      shard.rotation.x = z > -3 ? 0.3 : -0.3;
    }
    for (const x of [-4.9, -6.1]) {
      const shard = box(damage, 'Torn back deck lip', x, 3.46, -9.8 + i * 0.4,
        0.22, 0.07, 0.13, railingMetal, false);
      shard.rotation.z = x > -5.5 ? 0.3 : -0.3;
    }
  }
  for (const x of [-0.85, -11.95]) {
    for (const z of [-7.5, -4.2, 0.4]) {
      box(platform, 'Support column', x, 1.7, z, 0.14, 3.4, 0.14);
    }
  }
  for (const x of [-9, -3]) {
    for (const z of [-9.3, 9.3]) box(platform, 'End support', x, 1.7, z, 0.14, 3.4, 0.14);
  }

  const barriers = [];
  function railingRun(name, startX, startZ, endX, endZ, brokenPanels = []) {
    // Each run is a child assembly: posts and rails use coordinates along it.
    const run = new THREE.Group();
    run.name = name;
    run.position.set(startX, 3.6, startZ);
    const length = Math.hypot(endX - startX, endZ - startZ);
    run.rotation.y = -Math.atan2(endZ - startZ, endX - startX);
    railings.add(run);
    const count = Math.ceil(length / 1.8);
    const span = length / count;
    for (let i = 0; i <= count; i++) {
      const damaged = brokenPanels.includes(i) || brokenPanels.includes(i - 1);
      const post = box(run, 'Weathered post', i * span, 0.55, 0, 0.065, 1.1, 0.065, railingMetal, false);
      if (damaged) post.rotation.z = i % 2 ? -0.16 : 0.12;
    }
    for (let i = 0; i < count; i++) {
      if (brokenPanels.includes(i)) {
        // Missing rails are real openings, with short bent remnants at the posts.
        for (const side of [0, 1]) {
          const stub = box(run, 'Snapped rail remnant', (i + side) * span + (side ? -0.14 : 0.14), 0.9, 0,
            0.3, 0.065, 0.065, railingMetal, false);
          stub.rotation.z = side ? 0.5 : -0.4;
        }
        continue;
      }
      for (const y of [0.48, 1.08]) {
        box(run, 'Dark crossrail', (i + 0.5) * span, y, 0, span, 0.065, 0.065, railingMetal, false);
      }
      // Solid panels block the player between posts; broken panels have no barrier.
      const a = i / count;
      const b = (i + 1) / count;
      const ax = startX + (endX - startX) * a;
      const az = startZ + (endZ - startZ) * a;
      const bx = startX + (endX - startX) * b;
      const bz = startZ + (endZ - startZ) * b;
      barriers.push(new THREE.Box3(
        new THREE.Vector3(Math.min(ax, bx) - 0.04, 3.6, Math.min(az, bz) - 0.04),
        new THREE.Vector3(Math.max(ax, bx) + 0.04, 4.75, Math.max(az, bz) + 0.04)
      ));
    }
  }
  railingRun('Right railing before gap', -1, 0.8, -1, -2.4);
  railingRun('Right railing after gap', -1, -3.6, -1, -7.7);
  railingRun('Broken railing at right gap', -1, -2.4, -1, -3.6, [0]);
  railingRun('Back railing before gap', -1, -7.7, -4.9, -7.7);
  railingRun('Back railing after gap', -6.1, -7.7, -10.1, -7.7);
  railingRun('Broken railing at back gap', -4.9, -7.7, -6.1, -7.7, [0]);
  railingRun('Left inner railing', -10.1, -7.7, -10.1, 7.7, [4]);
  railingRun('Front inner railing', -10.1, 7.7, -1.2, 7.7, [1]);
  railingRun('Front stairwell end railing', -1.2, 7.7, -1.2, 10);

  // The room walls enclose the outside edges; protect both sides of the stairs.
  for (const x of [-1, 1]) {
    for (let i = 0; i < 18; i++) {
      const top = (i + 1) * 0.2;
      const z = 7.8 - i * 0.4;
      if (i % 3 === 0 || i === 17) {
        box(railings, 'Stair post', x, top + 0.55, z, 0.07, 1.1, 0.07, railingMetal, false);
        box(railings, 'Blue post inset', x - Math.sign(x) * 0.037, top + 0.42, z,
          0.008, 0.6, 0.018, blueStrip, false);
      }
      barriers.push(new THREE.Box3(new THREE.Vector3(x - 0.04, top, z - 0.2), new THREE.Vector3(x + 0.04, top + 1.2, z + 0.2)));
    }
    for (const offset of [0.5, 1.1]) {
      const rail = box(railings, 'Sloped stair handrail', x, 1.8 + offset, 4.4, 0.07, 0.07, Math.hypot(7.2, 3.6), railingMetal, false);
      rail.rotation.x = Math.atan2(3.6, 7.2);
    }
  }

  group.updateMatrixWorld(true);
  const colliders = solids.map(mesh => new THREE.Box3().setFromObject(mesh));
  const walkableSurfaces = floors.map(mesh => new THREE.Box3().setFromObject(mesh));
  for (const barrier of barriers) colliders.push(barrier.translate(group.position));
  return {
    group, colliders, walkableSurfaces,
    dispose() {
      group.removeFromParent();
      geometries.forEach(geometry => geometry.dispose());
      steel.dispose();
      railingMetal.dispose();
      stepSides.dispose();
      treadSteel.dispose();
      treadTexture.dispose();
      blueStrip.dispose();
      textures.release();
    },
  };
}
