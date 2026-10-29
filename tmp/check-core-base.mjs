import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { arrangeCoreBase, buildCoreBase } from '../src/scenes/coreBase.js';
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1024, height: 1024, close() {} });
const bytes = fs.readFileSync('public/models/core-platform.glb');
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const parts = [];
gltf.scene.traverse(object => { if (object.isMesh) parts.push(object.name); });
assert.equal(parts.length, 4, 'Central floor and three control panels retained');
assert.ok(parts.every(name => name.startsWith('ControlPanel') || name === 'Floor_005_M_Floor_003_0'), 'Corridor, planet and purple glow cones excluded');
const model = arrangeCoreBase(gltf.scene);
const bounds = new THREE.Box3().setFromObject(model);
assert.ok(Math.abs(bounds.min.y - 0.01) < 0.000001, 'Platform sits just above room floor without z-fighting');
assert.ok(bounds.max.y < 1.2, 'Control panels fit below the red AI orb');
assert.ok(Math.abs(bounds.getSize(new THREE.Vector3()).x - 2.6) < 0.00001);
const center = new THREE.Box3().setFromObject(model.getObjectByName('Floor_005_M_Floor_003_0')).getCenter(new THREE.Vector3());
assert.ok(Math.abs(center.x) < 0.00001 && Math.abs(center.z) < 0.00001, 'Platform centred below AI orb');
model.traverse(object => {
  if (!object.isMesh) return;
  assert.ok(object.material.map && object.material.normalMap, 'Original surface detail retained');
});
const original = GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync = async () => {
  const copy = gltf.scene.clone(true); copy.scale.setScalar(1); copy.position.set(0, 0, 0); return { scene: copy };
};
try {
  const base = buildCoreBase(); await base.ready;
  assert.ok(base.group.getObjectByName('XB1101 central AI platform'));
  assert.ok(Math.abs(base.collider.min.y - 0.01) < 0.000001);
  assert.ok(base.collider.max.y < 1.2);
  base.dispose();
  const cancelled = buildCoreBase(); cancelled.dispose(); await cancelled.ready;
  assert.equal(cancelled.group.getObjectByName('XB1101 central AI platform'), undefined);
  console.log('Core platform checks passed: extracted floor/consoles, purple hologram excluded, centred placement, original textures, collision and cancellation.');
} finally { GLTFLoader.prototype.loadAsync = original; }
