import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { arrangeVenatorRoom, buildVenatorRoom } from '../src/scenes/venatorRoom.js';
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1024, height: 1024, close() {} });
const file = fs.readFileSync('src/assets/models/venator-room-modules.glb');
const gltf = await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '');
const room = arrangeVenatorRoom(gltf.scene);
assert.equal(room.children.length, 3, 'Two original panel designs and original overhead light');
assert.equal(room.children[0].count + room.children[1].count, 80, '52 wall panels and 28 ceiling panels');
assert.equal(room.children[2].count, 24, 'Six ceiling light runs with four modules each');
const m = new THREE.Matrix4();
const p = new THREE.Vector3();
const q = new THREE.Quaternion();
const s = new THREE.Vector3();
let ceilingCount = 0;
let wallCount = 0;
for (const mesh of room.children.slice(0, 2)) {
  assert.ok(mesh.material.map && mesh.material.normalMap, 'Original UV textures present');
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, m);
    m.decompose(p, q, s);
    if (Math.abs(p.y - 4.18) < 0.001) ceilingCount++;
    else {
      wallCount++;
      assert.ok(Math.abs(Math.abs(p.x) - 6.98) < 0.001 || Math.abs(Math.abs(p.z) - 7.98) < 0.001, 'Walls stay at existing perimeter');
      assert.ok((Math.abs(p.y) < 0.001 && Math.abs(s.y - 4.2) < 0.001) || (Math.abs(p.y - 2.78) < 0.001 && Math.abs(s.y - 1.42) < 0.001), 'Walls span room height or leave exit opening');
    }
  }
}
assert.equal(ceilingCount, 28);
assert.equal(wallCount, 52);
const bounds = new THREE.Box3().setFromObject(room);
assert.ok(bounds.min.y > -0.001 && bounds.max.y < 4.4, 'Room shell fits existing room');
assert.ok(room.children[2].material.emissiveMap, 'Original illuminated light strip retained');
const originalLoad = GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync = async () => gltf;
let readyCount = 0;
const scene = new THREE.Scene();
const loaded = buildVenatorRoom({ scene, onReady: () => readyCount++ });
await loaded.ready;
assert.equal(readyCount, 1);
assert.ok(scene.getObjectByName('Venator walls and ceiling'));
const strips = scene.getObjectByName('Imported Venator overhead light strips');
assert.equal(strips.material.emissive.getHex(), 0x33ff66, 'Ceiling starts green with lasers on');
loaded.setLaserActive(false);
assert.equal(strips.material.emissive.getHex(), 0xffffff, 'Shutdown restores white strips');
assert.equal(strips.material.color.getHex(), 0xffffff);
const material = scene.children[0].children[0].material;
assert.ok(material.metalnessMap && material.roughnessMap, 'Separate original PBR maps restored');
loaded.dispose();
assert.equal(scene.children.length, 0, 'Scene cleanup');
const earlyShutdown = buildVenatorRoom({ scene });
earlyShutdown.setLaserActive(false);
await earlyShutdown.ready;
assert.equal(scene.getObjectByName('Imported Venator overhead light strips').material.emissive.getHex(), 0xffffff, 'Shutdown before model loads is remembered');
earlyShutdown.dispose();
let lateReady = false;
const cancelled = buildVenatorRoom({ scene, onReady: () => { lateReady = true; } });
cancelled.dispose();
await cancelled.ready;
assert.equal(lateReady, false, 'Disposed level cannot add late-loaded shell');
assert.equal(scene.children.length, 0);
GLTFLoader.prototype.loadAsync = originalLoad;
console.log('Venator checks passed: original modules/textures, wall/ceiling fit, overhead lighting, loading, cleanup and cancelled loads.');
