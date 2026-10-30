import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildCorePillars } from '../src/scenes/corePillars.js';
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1024, height: 1024, close() {} });
const bytes = fs.readFileSync('public/models/core-pillar.glb');
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const original = GLTFLoader.prototype.loadAsync;
let downloads = 0;
GLTFLoader.prototype.loadAsync = async () => { downloads++; return { scene: gltf.scene.clone(true) }; };
try {
  const pillars = buildCorePillars(); await pillars.ready;
  assert.equal(downloads, 1);
  assert.equal(pillars.group.children.length, 4);
  assert.equal(pillars.colliders.length, 4);
  for (const box of pillars.colliders) {
    assert.ok(Math.abs(box.min.y) < 0.000001, 'Pillar rests on floor');
    assert.ok(Math.abs(box.max.y - 5.48) < 0.000001, 'Pillar reaches just below ceiling');
    assert.ok(box.min.x > -7 && box.max.x < 7 && box.min.z > -7 && box.max.z < 7);
    for (const [x, z] of [[-5.2, -4.4], [0, -6], [5.2, -4.4], [0, 5.5]]) {
      assert.ok(!box.containsPoint(new THREE.Vector3(x, 1.7, z)), 'Feeders and spawn stay clear');
    }
  }
  const copies = pillars.group.children.map(holder => {
    const meshes = []; holder.traverse(object => { if (object.isMesh) meshes.push(object); }); return meshes;
  });
  assert.ok(copies.every(meshes => meshes.length === 1), 'Each corner uses the new column model');
  copies[0].forEach((mesh, i) => assert.equal(mesh.geometry, copies[1][i].geometry));
  assert.ok(copies[0][0].material.map && copies[0][0].material.normalMap, 'Original column textures retained');
  assert.ok(pillars.colliders.every(box => box.getSize(new THREE.Vector3()).x < 0.81), 'Collision fits slimmer replacement columns');
  pillars.dispose();
  const cancelled = buildCorePillars(); cancelled.dispose(); await cancelled.ready;
  assert.ok(cancelled.group.children.every(holder => holder.children[0].isMesh), 'Disposed level does not restore imported copies');
  console.log('Corner pillar checks passed: four imported copies, floor/ceiling fit, room bounds, feeder/spawn clearances, shared geometry and cancellation.');
} finally { GLTFLoader.prototype.loadAsync = original; }
