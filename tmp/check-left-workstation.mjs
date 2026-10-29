import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildLeftWorkstation } from '../src/scenes/leftWorkstation.js';
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1024, height: 1024, close() {} });
const fixtures = {};
for (const name of ['left-computer-desk', 'left-personal-computer']) {
  const bytes = fs.readFileSync(`public/models/${name}.glb`);
  fixtures[name] = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}
const original = GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync = async url => ({ scene: fixtures[url.split('/').at(-1).replace('.glb', '')].scene.clone(true) });
try {
  const props = buildLeftWorkstation(); await props.ready;
  const desk = props.group.getObjectByName('Imported Computer Desk');
  const pc = props.group.getObjectByName('Imported Personal Computer');
  assert.ok(desk && pc);
  const deskBox = new THREE.Box3().setFromObject(desk), pcBox = new THREE.Box3().setFromObject(pc);
  assert.ok(Math.abs(deskBox.min.y) < 0.00001);
  assert.ok(Math.abs(pcBox.min.y - deskBox.max.y - 0.005) < 0.00001, 'Computer rests on desktop');
  assert.ok(pcBox.min.x >= deskBox.min.x && pcBox.max.x <= deskBox.max.x && pcBox.min.z >= deskBox.min.z && pcBox.max.z <= deskBox.max.z, 'Computer fits within desktop');
  assert.ok(props.collider.min.x > -7 && props.collider.max.x < -5.5);
  assert.ok(props.collider.min.z > -1.2 && props.collider.max.z < 1.2, 'Feeders and corner pillars stay clear');
  let deskParts = 0, pcParts = 0;
  desk.traverse(object => { if (object.isMesh) deskParts++; }); pc.traverse(object => { if (object.isMesh) pcParts++; });
  assert.equal(deskParts, 9); assert.equal(pcParts, 4);
  props.dispose();
  const cancelled = buildLeftWorkstation(); cancelled.dispose(); await cancelled.ready;
  assert.equal(cancelled.group.children.length, 0);
  console.log('Left workstation checks passed: both supplied models, desktop contact/fit, floor/wall fit, clearances and cancelled loading.');
} finally { GLTFLoader.prototype.loadAsync = original; }
