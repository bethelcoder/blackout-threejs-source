import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { arrangeCoreCeiling, buildCoreCeiling } from '../src/scenes/coreCeiling.js';
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1024, height: 1024, close() {} });
const bytes = fs.readFileSync('public/models/core-ceiling.glb');
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const group = arrangeCoreCeiling(gltf.scene.clone(true));
group.updateMatrixWorld(true);
const bounds = new THREE.Box3().setFromObject(group);
assert.ok(bounds.min.y > 5.48 && bounds.max.y <= 5.500001, 'Ceiling mounted above room');
assert.ok(Math.abs(bounds.getSize(new THREE.Vector3()).z - 14) < 0.00001);
let parts = 0;
group.traverse(object => {
  if (!object.isMesh) return;
  parts++;
  for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
    assert.ok(material.clippingPlanes.every(plane => plane.distanceToPoint(new THREE.Vector3(0, 5.5, 0)) > 0));
    assert.ok(material.clippingPlanes.some(plane => plane.distanceToPoint(new THREE.Vector3(8, 5.5, 0)) < 0), 'Sheet trimmed at room walls');
  }
});
assert.equal(parts, 2, 'Original grid and tile surface retained');
const originalLoad = GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync = async () => ({ scene: gltf.scene.clone(true) });
try {
  const room = new THREE.Group();
  const fallback = new THREE.Object3D(); fallback.name = 'Room ceiling'; room.add(fallback);
  const ceiling = buildCoreCeiling(room); await ceiling.ready;
  assert.equal(fallback.visible, false, 'Flat ceiling replaced after model loads');
  ceiling.dispose();
  const cancelled = buildCoreCeiling(room); cancelled.dispose(); await cancelled.ready;
  assert.equal(cancelled.group.children.length, 0);
  console.log('Core ceiling checks passed: original grid/tiles, height, proportions, wall trimming, replacement and cancellation.');
} finally { GLTFLoader.prototype.loadAsync = originalLoad; }
