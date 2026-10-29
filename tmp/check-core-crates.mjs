import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildCoreCrates } from '../src/scenes/coreCrates.js';
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1024, height: 1024, close() {} });
const bytes = fs.readFileSync('public/models/wooden-crates.glb');
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const original = GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync = async () => ({ scene: gltf.scene.clone(true) });
try {
  const crates = buildCoreCrates(); await crates.ready;
  assert.ok(Math.abs(crates.collider.min.y) < 0.00001);
  assert.ok(crates.collider.max.y > 0.5 && crates.collider.max.y < 0.75);
  assert.ok(crates.collider.min.x > -6.6 && crates.collider.max.x < -4.9);
  assert.ok(crates.collider.min.z > 2.7 && crates.collider.max.z < 4.7);
  for (const [x, z] of [[0, 5.5], [-5.2, -4.4], [0, -6], [5.2, -4.4], [0, 0]]) {
    assert.ok(!crates.collider.containsPoint(new THREE.Vector3(x, 0.5, z)), 'Core, spawn and feeders clear');
  }
  const workstation = new THREE.Box3(new THREE.Vector3(-6.8, 0, -1.2), new THREE.Vector3(-5.5, 2, 1.2));
  assert.ok(!crates.collider.intersectsBox(workstation));
  let parts = 0; crates.group.traverse(object => { if (object.isMesh) parts++; });
  assert.equal(parts, 7, 'All supplied model components retained');
  crates.dispose();
  const cancelled = buildCoreCrates(); cancelled.dispose(); await cancelled.ready;
  assert.equal(cancelled.group.children.length, 0);
  console.log('Crate checks passed: supplied model, floor contact, front-left placement, workstation/puzzle clearances and cancellation.');
} finally { GLTFLoader.prototype.loadAsync = original; }
