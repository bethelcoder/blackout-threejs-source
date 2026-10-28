import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildStorageCabinets } from '../src/scenes/storageCabinets.js';

globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1024, height: 1024, close() {} });
const bytes = fs.readFileSync('public/models/metal-storage-cabinet.glb');
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
let count = 0;
gltf.scene.traverse(object => { if (object.isMesh) count++; });
assert.equal(count, 189, 'Every imported cabinet part retained');
const original = GLTFLoader.prototype.loadAsync;
let loads = 0;
GLTFLoader.prototype.loadAsync = async () => { loads++; return gltf; };
try {
  const props = buildStorageCabinets();
  await props.ready;
  assert.equal(loads, 1, 'One download for both cabinets');
  assert.equal(props.group.children.length, 2);
  props.colliders.forEach(box => {
    assert.ok(Math.abs(box.min.y) < 0.00001, 'Cabinet rests on floor');
    assert.ok(Math.abs(box.max.y - 2.1) < 0.00001);
    assert.ok(box.min.x > -7 && box.max.x < 7, 'Cabinet stays within room walls');
  });
  const [right, left] = props.colliders;
  assert.ok(right.min.z > -8, 'Leaves space before the exit wall');
  assert.ok(left.max.z < 5.1, 'Leaves over two metres to the clock');
  assert.ok(!right.intersectsBox(left));
  const a = props.group.children[0].children[0];
  const b = props.group.children[1].children[0];
  const meshesA = [], meshesB = [];
  a.traverse(object => { if (object.isMesh) meshesA.push(object); });
  b.traverse(object => { if (object.isMesh) meshesB.push(object); });
  assert.equal(meshesA.length, 189);
  meshesA.forEach((mesh, index) => assert.equal(mesh.geometry, meshesB[index].geometry, 'Copies share geometry'));
  props.dispose();
  const cancelled = buildStorageCabinets();
  cancelled.dispose();
  await cancelled.ready;
  assert.equal(cancelled.group.children[0].children.length, 1, 'Cancelled model load does not restore stale geometry');
  console.log('Storage cabinet checks passed: imported model, one load, floor contact, placement clearances, shared geometry and cancelled loading.');
} finally { GLTFLoader.prototype.loadAsync = original; }
