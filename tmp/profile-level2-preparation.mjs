import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { arrangeServerRack } from '../src/scenes/serverRacks.js';
import { DetailLod } from '../src/systems/detailLod.js';
import { RACK_GAPS } from '../src/scenes/level2Layout.js';
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1024, height: 1024, close() {} });
const scene = new THREE.Scene();
for (const [file, name, spots] of [
  ['data-center-server-rack', 'Data Center Server Rack', [1.06, 1.88, 2.7, 3.52, 4.34]],
  ['server-racking-system', 'Server Racking System', [-1.4, -2.7, -4, -5.3, -6.6]],
]) {
  const bytes = fs.readFileSync(`src/assets/models/${file}.glb`);
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const start = performance.now();
  const kept = spots.filter(z => !RACK_GAPS.includes(z));
  const template = arrangeServerRack(gltf.scene, name, kept[0]);
  for (const z of kept) {
    const copy = template.group.clone(true); copy.position.z = z; scene.add(copy);
  }
  console.log(`${file}: ${kept.length} copies, arrangement ${(performance.now() - start).toFixed(0)}ms`);
}
const lod = new DetailLod();
const start = performance.now();
lod.addByName(scene, ['Data Center Server Rack', 'Server Racking System']);
console.log(`Rack LOD preparation: ${(performance.now() - start).toFixed(0)}ms`);
console.log(JSON.stringify(lod.stats(), null, 2));
