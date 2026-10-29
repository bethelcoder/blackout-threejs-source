import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildCoreRoomProps } from '../src/scenes/coreRoomProps.js';
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1024, height: 1024, close() {} });
const fixtures = {};
for (const name of ['office-drawer','metal-storage-cabinet','sci-fi-crate-pile']) {
 const b=fs.readFileSync(`public/models/${name}.glb`);
 fixtures[name]=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
}
const original=GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync=async url=>({scene:fixtures[url.split('/').at(-1).replace('.glb','')].scene.clone(true)});
try {
 const props=buildCoreRoomProps(); await props.ready;
 const drawer=props.group.getObjectByName('Office drawer beside right supercomputer');
 const bounds=new THREE.Box3().setFromObject(drawer);
 assert.ok(Math.abs(drawer.children[0].rotation.y-Math.PI/2)<1e-6,'Drawer fronts face into the room');
 assert.ok(Math.abs(bounds.min.y)<1e-5,'Drawer rests on floor');
 assert.ok(bounds.max.y<=1.65001 && bounds.max.y>1.25 && bounds.min.z>-7,'Model fits room');
 const computer=new THREE.Box3(new THREE.Vector3(2.65,0,-6.73),new THREE.Vector3(3.85,2.33,-5.97));
 assert.ok(bounds.min.x>computer.max.x,'Drawer is right of right supercomputer');
 assert.ok(!bounds.intersectsBox(computer),'Drawer does not overlap supercomputer');
 const approach=new THREE.Box3(new THREE.Vector3(-.6,0,-6.7),new THREE.Vector3(.6,1.7,-4.5));
 assert.ok(!bounds.intersectsBox(approach),'Hologram approach stays clear');
 assert.ok(props.colliders.some(box=>box.equals(bounds)),'Drawer has collision');
 const pile=props.group.getObjectByName('Sci-fi crate pile right of display terminal');
 const pileBox=new THREE.Box3().setFromObject(pile);
 assert.ok(Math.abs(pileBox.min.y)<1e-5 && pileBox.min.x>-7, 'Crate pile rests on floor inside room');
 const terminalBox=new THREE.Box3(new THREE.Vector3(-6.79,0,-2.88),new THREE.Vector3(-5.71,1.65,-1.42));
 assert.ok(pileBox.max.z<terminalBox.min.z && !pileBox.intersectsBox(terminalBox),'Pile is beside terminal on its right without overlap');
 assert.ok(!pileBox.intersectsBox(approach),'Crates keep hologram route clear');
 assert.ok(props.colliders.some(box=>box.equals(pileBox)),'Crate pile has collision');
 let count=0;drawer.traverse(o=>{if(o.isMesh)count++;});assert.ok(count<=5,'Model batched by material');
 props.dispose();
 const cancelled=buildCoreRoomProps();cancelled.dispose();await cancelled.ready;
 assert.ok(!cancelled.group.getObjectByName('Office drawer beside right supercomputer').children.length,'Cancelled loading cannot restore model');
 console.log('Office drawer checks passed: original model, floor fit, right-side placement, supercomputer/hologram clearance, collision and cleanup.');
} finally { GLTFLoader.prototype.loadAsync=original; }
