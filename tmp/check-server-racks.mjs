import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { arrangeServerRack, buildServerRacks } from '../src/scenes/serverRacks.js';
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1024, height: 1024, close() {} });
async function parse(name) {
  const file = fs.readFileSync(`src/assets/models/${name}.glb`);
  return new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '');
}
const [data, system] = await Promise.all([parse('data-center-server-rack'), parse('server-racking-system')]);
function triangles(source) {
  let count = 0;
  source.traverse(object => { if (object.isMesh) count += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3; });
  return count;
}
const first = arrangeServerRack(data.scene, 'Data Center Server Rack', 2.7);
const second = arrangeServerRack(system.scene, 'Server Racking System', -2.7);
for (const [rack, source] of [[first, data.scene], [second, system.scene]]) {
  assert.ok(Math.abs(rack.collider.min.y) < 0.00001, 'Rack rests on floor');
  assert.ok(Math.abs(rack.collider.max.y - 2.8) < 0.00001, 'Rack fits room height');
  assert.ok(Math.abs(rack.collider.max.x - 6.88) < 0.00001, 'Back aligns to right wall');
  assert.ok(rack.collider.min.x > 5, 'Room aisle stays clear');
  assert.equal(triangles(rack.group), triangles(source), 'Merging preserves all original geometry');
  assert.ok(rack.group.children[0].children.length <= 8, 'Small parts merged by material');
}
assert.ok(first.collider.min.z > 1.5 && second.collider.max.z < -1.5, 'Models flank button with clear interaction gap');
const glass = first.group.children[0].children.find(mesh => mesh.material.name === 'StingrayPBS5');
assert.ok(glass.material.transparent && glass.material.opacity < 0.1, 'Original glass door remains transparent');
const originalLoad = GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync = async url => url.includes('data-center') ? data : system;
const scene = new THREE.Scene();
const colliders = [];
const rackOccluders = [];
let refreshes = 0;
const loaded = buildServerRacks({ scene, colliders, rackOccluders, onReady: () => refreshes++ });
await loaded.ready;
assert.equal(scene.children.length, 10, 'Five of each rack model');
assert.equal(colliders.length, 10);
assert.equal(rackOccluders.length, 10);
const dataCopies = scene.children.filter(group => group.name.startsWith('Data Center'));
const systemCopies = scene.children.filter(group => group.name.startsWith('Server Racking'));
assert.equal(dataCopies.length, 5);
assert.equal(systemCopies.length, 5);
assert.ok(dataCopies.every(group => group.children[0].children[0].geometry === dataCopies[0].children[0].children[0].geometry), 'Copies share geometry');
for (let i = 0; i < colliders.length; i++) {
  for (let j = i + 1; j < colliders.length; j++) assert.equal(colliders[i].intersectsBox(colliders[j]), false, 'Racks do not overlap');
}
const buttonApproach = new THREE.Box3(new THREE.Vector3(5.7, 0, -0.35), new THREE.Vector3(6.6, 1.7, 0.35));
const ductArrival = new THREE.Box3(new THREE.Vector3(5.6, 0, 5.45), new THREE.Vector3(6.3, 1.7, 6.15));
assert.ok(colliders.every(box => !box.intersectsBox(buttonApproach)), 'Button remains accessible');
assert.ok(colliders.every(box => !box.intersectsBox(ductArrival)), 'Duct arrival stays clear');
assert.equal(refreshes, 2, 'Laser occlusion refreshed as each model loads');
loaded.dispose();
assert.equal(scene.children.length, 0);
assert.equal(colliders.length, 0);
assert.equal(rackOccluders.length, 0);
const late = buildServerRacks({ scene, colliders, rackOccluders });
late.dispose();
await late.ready;
assert.equal(scene.children.length, 0);
GLTFLoader.prototype.loadAsync = originalLoad;
console.log('Rack checks passed: complete geometry, material batching, original glass, wall placement, button gap, collision, laser occlusion, cleanup and cancellation.');
