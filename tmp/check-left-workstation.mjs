import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildLeftWorkstation } from '../src/scenes/leftWorkstation.js';
globalThis.self = globalThis;
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) };
globalThis.createImageBitmap = async () => ({ width: 1024, height: 1024, close() {} });
const fixtures = {};
for (const name of ['sci-fi-office-desk', 'left-personal-computer', 'drawer-keypad', 'engineer-logbook', 'monitor-sticky-note', 'uv-flashlight']) {
  const bytes = fs.readFileSync(`public/models/${name}.glb`);
  fixtures[name] = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}
const original = GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync = async url => ({ scene: fixtures[url.split('/').at(-1).replace('.glb', '')].scene.clone(true) });
try {
  const props = buildLeftWorkstation(); await props.ready;
  const desk = props.group.getObjectByName('Sci-Fi Office Desk');
  const pc = props.group.getObjectByName('Imported Personal Computer');
  assert.ok(desk && pc);
  const book = props.group.getObjectByName('Imported Book');
  assert.ok(book && book.parent === props.bookAnchor, 'Supplied book uses the logbook interaction anchor');
  const deskBox = new THREE.Box3().setFromObject(desk), pcBox = new THREE.Box3().setFromObject(pc);
  assert.ok(Math.abs(deskBox.min.y) < 0.00001);
  const bookBox = new THREE.Box3().setFromObject(book);
  assert.ok(Math.abs(bookBox.min.y - deskBox.max.y - 0.006) < 0.00001, 'Book rests flat on desktop');
  assert.ok(bookBox.min.x >= deskBox.min.x && bookBox.max.x <= deskBox.max.x && bookBox.min.z >= deskBox.min.z && bookBox.max.z <= deskBox.max.z, 'Book fits on desktop');
  assert.ok(Math.abs(pcBox.min.y - deskBox.max.y - 0.005) < 0.00001, 'Computer rests on desktop');
  assert.ok(pcBox.min.x >= deskBox.min.x && pcBox.max.x <= deskBox.max.x && pcBox.min.z >= deskBox.min.z && pcBox.max.z <= deskBox.max.z, 'Computer fits within desktop');
  assert.ok(props.collider.min.x > -7 && props.collider.max.x < -5.5);
  assert.ok(props.collider.min.z > -1.5 && props.collider.max.z < 1.5, 'Feeders and corner pillars stay clear');
  assert.equal(props.drawer.children.filter(object => object.isMesh).length, 2, 'Upper drawer retains its original material meshes');
  const keypad = props.group.getObjectByName('Upper drawer code keypad');
  assert.equal(keypad.parent, props.drawer, 'Keypad mounts to the interactive upper drawer');
  const keypadBox = new THREE.Box3().setFromObject(keypad);
  assert.ok(Math.abs(keypadBox.getSize(new THREE.Vector3()).y - 0.22) < 0.00001, 'Keypad fits the drawer height');
  const keypadCenter = keypadBox.getCenter(new THREE.Vector3());
  const ray = new THREE.Raycaster(keypadCenter.clone().add(new THREE.Vector3(1, 0, 0)), new THREE.Vector3(-1, 0, 0));
  const hit = ray.intersectObject(props.group, true)[0];
  assert.ok(hit && keypad.getObjectById(hit.object.id), 'Mounted keypad is exposed and faces the room');
  assert.ok(hit.object.material.map && hit.object.material.normalMap && hit.object.material.emissiveMap, 'Original keypad textures preserved');
  assert.ok(props.monitorNoteAnchor.position.y > deskBox.max.y, 'Sticky note sits on monitor above desk');
  const sticky = props.group.getObjectByName('Imported sticky note');
  assert.ok(sticky && sticky.parent === props.monitorNoteAnchor, 'Supplied paper model mounts to the monitor interaction');
  const stickyBox = new THREE.Box3().setFromObject(sticky);
  const stickySize = stickyBox.getSize(new THREE.Vector3());
  assert.ok(stickySize.y > 0.2 && stickySize.y < 0.26 && stickySize.z > 0.2, 'Paper stands upright at sticky-note size');
  let deskParts = 0, pcParts = 0;
  desk.traverse(object => { if (object.isMesh) deskParts++; }); pc.traverse(object => { if (object.isMesh) pcParts++; });
  assert.equal(deskParts, 11); assert.equal(pcParts, 4);
  assert.equal(props.uvPickup.visible, false, 'Flashlight is hidden while drawer is locked');
  const uv = props.group.getObjectByName('Imported UV flashlight');
  assert.ok(uv && uv.parent === props.uvPickup && props.uvPickup.parent === props.drawer, 'Supplied flashlight travels inside drawer');
  const uvBox = new THREE.Box3().setFromObject(uv);
  assert.ok(Math.abs(uvBox.getSize(new THREE.Vector3()).x - 0.22) < 0.00001, 'UV flashlight is 22 cm long');
  const closedKeypadCenter = keypadBox.getCenter(new THREE.Vector3());
  const closedDeskBox = new THREE.Box3().setFromObject(desk);
  const closedCollider = props.collider.clone();
  props.openDrawer();
  assert.equal(props.uvPickup.visible, true, 'Opening drawer reveals pickup');
  props.update(0.1);
  const partialCenter = new THREE.Box3().setFromObject(keypad).getCenter(new THREE.Vector3());
  assert.ok(partialCenter.x > closedKeypadCenter.x && partialCenter.x < closedKeypadCenter.x + 0.32, 'Drawer and mounted keypad slide smoothly toward room');
  for (let i = 0; i < 180; i++) props.update(1 / 60);
  const openCenter = new THREE.Box3().setFromObject(keypad).getCenter(new THREE.Vector3());
  assert.ok(Math.abs(openCenter.x - closedKeypadCenter.x - 0.32) < 0.00001, 'Drawer opens by 32 cm');
  assert.ok(props.collider.equals(closedCollider), 'Opening drawer does not expand the desk collision box into the player');
  const standingPlayer = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(closedCollider.max.x + 0.4, 0.85, closedCollider.getCenter(new THREE.Vector3()).z),
    new THREE.Vector3(0.7, 1.7, 0.7),
  );
  assert.ok(!standingPlayer.intersectsBox(props.collider), 'Player standing in front stays clear after drawer opens');
  standingPlayer.translate(new THREE.Vector3(0, 0, 0.1));
  assert.ok(!standingPlayer.intersectsBox(props.collider), 'Player can move along the desk after opening it');
  props.dispose();
  const cancelled = buildLeftWorkstation(); cancelled.dispose(); await cancelled.ready;
  assert.equal(cancelled.group.children.length, 0);
  console.log('Left workstation checks passed: both supplied models, desktop contact/fit, floor/wall fit, clearances and cancelled loading.');
} finally { GLTFLoader.prototype.loadAsync = original; }
