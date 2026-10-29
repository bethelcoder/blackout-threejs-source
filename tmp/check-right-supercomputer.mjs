import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildRightSupercomputer } from '../src/scenes/rightSupercomputer.js';
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1024, height: 1024, close() {} });
const bytes = fs.readFileSync('public/models/right-supercomputer.glb');
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const original = GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync = async () => ({ scene: gltf.scene.clone(true) });
try {
  const computer = buildRightSupercomputer(); await computer.ready;
  const box = computer.collider;
  assert.ok(Math.abs(box.min.y) < 0.00001 && Math.abs(box.max.y - 2.1) < 0.00001);
  assert.ok(box.min.x > 3.8 && box.max.x < 7, 'Fits along right wall');
  assert.ok(box.min.z > -2.8 && box.max.z < 2.8, 'Clears corner pillars and right feeder');
  for (const [x, z] of [[5.2, -4.4], [5, 4], [0, 5.5], [0, 0]]) {
    assert.ok(!box.containsPoint(new THREE.Vector3(x, 1, z)), 'Puzzle areas and spawn stay clear');
  }
  let meshes = 0;
  computer.group.traverse(object => { if (object.isMesh) { meshes++; assert.ok(object.material.map); } });
  assert.equal(meshes, 2, 'Both supplied model components retained');
  computer.dispose();
  const cancelled = buildRightSupercomputer(); cancelled.dispose(); await cancelled.ready;
  assert.ok(cancelled.group.children[0].isMesh, 'Cancelled loading does not restore imported model');
  console.log('Right supercomputer checks passed: original parts/textures, floor/wall fit, puzzle clearances and cancellation.');
} finally { GLTFLoader.prototype.loadAsync = original; }
