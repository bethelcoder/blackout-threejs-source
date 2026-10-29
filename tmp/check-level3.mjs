import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildLevel3 } from '../src/scenes/level3.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const context = texts => new Proxy({}, { get: (_, key) => key === 'fillText' ? text => texts.push(text)
  : key.startsWith('create') ? () => ({ addColorStop() {} }) : () => {} });
globalThis.document = {
  createElement() { const image = { texts: [] }; image.getContext = () => context(image.texts); return image; },
  createElementNS() {
    const events = new Map();
    return { width: 2048, height: 2048,
      addEventListener(name, handler) { events.set(name, handler); }, removeEventListener(name) { events.delete(name); },
      set src(_) { queueMicrotask(() => events.get('load')?.call(this)); } };
  },
};
let endings = 0, surges = 0;
const originalLoad = GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync = async () => {
  const model = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.6), new THREE.MeshStandardMaterial());
  mesh.position.y = 0.6; model.add(mesh); return { scene: model };
};
const scene = new THREE.Scene();
const hud = { setObjective() {} };
const aiState = { suspicion: 0, raise() {}, decay() {} };
const level = buildLevel3({ scene, aiState, hud, onEnding: () => endings++, onSurgeHit: () => surges++ });
await level.ready;
const floor = scene.getObjectByName('Level 3 office floor');
assert.ok(floor.material.map.image, 'Shared office floor texture is generated');
assert.deepEqual(floor.material.map.repeat.toArray(), [14 / 3.2, 14 / 3.2]);
assert.equal(floor.material.roughness, 0.92, 'Matches Level 2 office-floor material');
const walls = [];
scene.traverse(object => { if (object.name === 'Room wall') walls.push(object); });
assert.equal(walls.length, 4);
assert.ok(walls.every(wall => wall.material.name === 'Core dark metal wall panels'));
assert.ok(walls.every(wall => wall.material === walls[0].material), 'Four walls share one panel material');
assert.ok(walls[0].material.bumpMap, 'Panel seams have surface relief');
const camera = new THREE.PerspectiveCamera(); camera.position.copy(level.spawn);
const originalRandom = Math.random;
Math.random = () => 0.5; // Fix safe-lane direction so hit coverage is deterministic.
for (let frame = 0; frame < 1200; frame++) level.update(1 / 60, camera);
Math.random = originalRandom;
assert.ok(surges > 0, 'Shockwave scheduler continues updating');
const feeders = scene.children.filter(object => object.userData.label?.startsWith('Isolate feeder'));
assert.equal(feeders.length, 3);
const load = object => Number.parseInt(object.children.find(child => child.material?.map?.image?.texts)?.material.map.image.texts[1]);
feeders.sort((a, b) => load(b) - load(a));
for (const feeder of feeders) feeder.userData.onInteract();
for (let frame = 0; frame < 200; frame++) level.update(1 / 60, camera);
assert.equal(endings, 1, 'Core puzzle reaches ending without stopping animation');
level.dispose();
GLTFLoader.prototype.loadAsync = originalLoad;
assert.equal(scene.children.length, 0);
console.log('Level 3 checks passed: floor texture readiness, 20 seconds of updates, shockwaves, three feeders, ending and disposal.');
