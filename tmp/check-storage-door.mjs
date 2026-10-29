import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { arrangeStorageDoor, buildStorageDoor } from '../src/scenes/storageDoor.js';
import { buildRoom } from '../src/scenes/roomBuilder.js';

globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1024, height: 1024, close() {} });
const words = [];
const context = new Proxy({}, { get: (_, name) => name === 'fillText' ? text => words.push(text)
  : name.startsWith('create') ? () => ({ addColorStop() {} }) : () => {} });
globalThis.document = { createElement: () => ({ getContext: () => context }) };
const bytes = fs.readFileSync('public/models/storage-door.glb');
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const { model, hinge } = arrangeStorageDoor(gltf.scene.clone(true));
assert.equal(hinge.children.length, 4, 'Leaf, window, handle and lock move together');
model.updateMatrixWorld(true);
const bounds = new THREE.Box3().setFromObject(model);
assert.ok(Math.abs(bounds.min.y) < 0.000001, 'Door frame rests on floor');
assert.ok(Math.abs(bounds.max.y - 2.65) < 0.000001);
const frame = model.children.find(child => child.isMesh);
const frameMatrix = frame.matrixWorld.clone();
hinge.rotation.y = 1.4;
model.updateMatrixWorld(true);
assert.deepEqual(frame.matrixWorld.elements, frameMatrix.elements, 'Frame stays stationary when leaf opens');

const original = GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync = async () => ({ scene: gltf.scene.clone(true) });
try {
  let unlocked = false, completions = 0, switches = 0, objective = '';
  const door = buildStorageDoor({ isUnlocked: () => unlocked, hud: { setObjective(text) { objective = text; }, markLevelComplete() { completions++; } }, sound: { playSwitch() { switches++; } } });
  await door.ready;
  door.group.userData.onInteract();
  assert.equal(completions, 0, 'Keypad lock still blocks entry');
  assert.ok(!door.collider.isEmpty());
  assert.match(objective, /code/);
  unlocked = true;
  door.group.userData.onInteract(); door.group.userData.onInteract();
  assert.equal(completions, 1, 'Transition fires once');
  assert.equal(switches, 1);
  assert.equal(door.collider.isEmpty(), true, 'Open door no longer blocks movement');
  door.update(0.5);
  assert.ok(door.group.getObjectByName('Imported storage door hinge').rotation.y > 1);
  assert.deepEqual(words.slice(-2), ['STORAGE', 'ROOM']);
  const sign = door.group.getObjectByName('STORAGE ROOM sign');
  assert.ok(sign.position.y - 0.727 / 2 > 2.65, 'Sign above the frame');
  assert.ok(sign.position.y + 0.727 / 2 < 3.4, 'Sign below overhead walkway');
  const room = buildRoom({ includePlinths: false, includeLeftCabinets: false, includeRightCabinets: false, backDoorOpening: { width: 1.55, height: 2.62 } });
  assert.ok(!room.colliders.some(box => box.containsPoint(new THREE.Vector3(0, 1.7, -10))), 'No wall blocking new door');
  assert.ok(room.colliders.some(box => box.containsPoint(new THREE.Vector3(1, 1.7, -10))), 'Wall closes gaps beside narrower frame');
  door.dispose();
  const cancelled = buildStorageDoor({ isUnlocked: () => false, hud: {}, sound: {} });
  cancelled.dispose(); await cancelled.ready;
  assert.equal(cancelled.group.getObjectByName('Imported Metal Door 2'), undefined);
  console.log('Storage door checks passed: imported parts, hinged opening, keypad lock, transition/collision, sign text and clearance, wall fit and cancelled loading.');
} finally { GLTFLoader.prototype.loadAsync = original; }
