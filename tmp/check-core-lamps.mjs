import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { arrangeCoreLamp, buildCoreLamps } from '../src/scenes/coreLamps.js';
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1024, height: 1024, close() {} });
const bytes = fs.readFileSync('public/models/core-lamp.glb');
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const fixture = arrangeCoreLamp(gltf.scene.clone(true));
const bounds = new THREE.Box3().setFromObject(fixture);
assert.ok(Math.abs(bounds.getSize(new THREE.Vector3()).x - 1.2) < 0.00001);
assert.ok(bounds.min.y > -0.15 && bounds.max.y < 0.00001, 'Fixture extends down from ceiling');
let emissive = 0;
fixture.traverse(object => { if (object.material?.emissiveMap) emissive++; });
assert.equal(emissive, 1, 'Lit diffuser and original emission map retained');
const original = GLTFLoader.prototype.loadAsync;
let loads = 0;
GLTFLoader.prototype.loadAsync = async () => { loads++; return { scene: gltf.scene.clone(true) }; };
try {
  const lamps = buildCoreLamps(); await lamps.ready;
  lamps.group.updateMatrixWorld(true);
  assert.equal(loads, 1, 'Four copies share one download');
  const fixtures = [], lights = [];
  lamps.group.traverse(object => {
    if (object.name === 'Imported fluorescent ceiling fixture') fixtures.push(object);
    if (object.isPointLight) lights.push(object);
  });
  assert.equal(fixtures.length, 4); assert.equal(lights.length, 4);
  assert.ok(lights.every(light => !light.castShadow && light.intensity > 0));
  for (const mounted of fixtures) {
    const box = new THREE.Box3().setFromObject(mounted);
    assert.ok(box.min.y > 5.3 && box.max.y < 5.49, 'Lamp mounted below ceiling tiles');
  }
  const a = [], b = [];
  fixtures[0].traverse(object => { if (object.isMesh) a.push(object); });
  fixtures[1].traverse(object => { if (object.isMesh) b.push(object); });
  assert.equal(a.length, 2);
  a.forEach((mesh, i) => assert.equal(mesh.geometry, b[i].geometry, 'Fixture geometry shared'));
  lamps.dispose();
  const cancelled = buildCoreLamps(); cancelled.dispose(); await cancelled.ready;
  assert.ok(cancelled.group.children.every(child => !child.children.length), 'Cancelled load cannot restore fixtures');
  console.log('Ceiling lamp checks passed: supplied lit fixture, diffuser emission, four mounts, shared geometry, room lights and cancellation.');
} finally { GLTFLoader.prototype.loadAsync = original; }
