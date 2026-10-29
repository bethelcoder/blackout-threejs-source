import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildCoreFurnishings } from '../src/scenes/coreFurnishings.js';
const context = new Proxy({}, { get: (_, key) => key.startsWith('create') ? () => ({ addColorStop() {} }) : () => {} });
globalThis.document = { createElement: () => ({ getContext: () => context }) };
const props = buildCoreFurnishings();
props.group.updateMatrixWorld(true);
assert.equal(props.colliders.length, 3, 'Supercomputers and maintenance bench retain collision');
assert.ok(props.group.getObjectByName('NODE ARRAY / 01') && props.group.getObjectByName('NODE ARRAY / 02'), 'Both supercomputers restored');
let meshes = 0;
props.group.traverse(object => { if (object.isMesh) meshes++; });
assert.ok(meshes <= 16, 'Static detailing merged into a small number of draw calls');
assert.ok(props.group.getObjectByName('OPERATIONS / CORE SYSTEMS'));
assert.ok(props.group.getObjectByName('COMPUTE ARRAY / TELEMETRY'));

const box = (x0, z0, x1, z1) => new THREE.Box3(new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x1, 3, z1));
// Include the footprints of the imported furniture and core already in Level 3.
const obstacles = [...props.colliders,
  box(-1.4, -1.4, 1.4, 1.4), box(3.9, -2.8, 6.9, 2.8), box(-6.8, -1.2, -5.5, 1.2),
  box(-4.5, 2.2, -2.3, 5), box(2.4, 5.35, 3.6, 6.55), box(4.5, 3.75, 5.5, 4.25),
  box(-5.55, -4.65, -4.85, -4.15), box(-0.35, -6.25, 0.35, -5.75), box(4.85, -4.65, 5.55, -4.15),
];
for (const x of [-6.575, 6.575]) for (const z of [-6.575, 6.575]) obstacles.push(box(x - 0.403, z - 0.403, x + 0.403, z + 0.403));
const expanded = obstacles.map(obstacle => obstacle.clone().expandByVector(new THREE.Vector3(0.28, 0, 0.28)));
const blocked = (x, z) => expanded.some(obstacle => obstacle.containsPoint(new THREE.Vector3(x, 0.5, z)));
const key = (x, z) => `${x},${z}`;
const queue = [[0, 27]], visited = new Set([key(0, 27)]);
for (let cursor = 0; cursor < queue.length; cursor++) {
  const [x, z] = queue[cursor];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, nz = z + dz, id = key(nx, nz);
    if (Math.abs(nx) > 33 || Math.abs(nz) > 33 || visited.has(id) || blocked(nx * 0.2, nz * 0.2)) continue;
    visited.add(id); queue.push([nx, nz]);
  }
}
for (const [x, z] of [[-26, -18], [0, -26], [26, -18], [25, 23]]) {
  assert.ok(visited.has(key(x, z)), 'Player-sized route from spawn reaches each feeder and schedule desk');
}
const scene = new THREE.Scene(); scene.add(props.group); props.dispose();
assert.equal(scene.children.length, 0);
console.log('Furnishing checks passed: organised bays, low draw-call count, player-sized routes to all feeders and schedule, cleanup.');
