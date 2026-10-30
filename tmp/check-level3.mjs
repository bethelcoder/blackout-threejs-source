import assert from 'node:assert/strict';
import { inventory } from '../src/systems/inventory.js';
import { CIRCUIT_PATH } from '../src/systems/circuitPuzzle.js';
import * as THREE from 'three';
import { buildLevel3 } from '../src/scenes/level3.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const context = texts => new Proxy({}, { get: (_, key) => key === 'fillText' ? text => texts.push(text)
  : key.startsWith('create') ? () => ({ addColorStop() {} }) : () => {} });
class Element {
  get firstChild() { return this.children[0] ?? null; }
  constructor(tag) { this.tag=tag;this.children=[];this.style={};this.events={};this.texts=[];this.value=''; }
  getContext() { return context(this.texts); }
  append(...items) { this.children.push(...items);items.forEach(x=>x.parent=this); }
  appendChild(item) { this.append(item); return item; }
  contains(item) { return this.children.includes(item); }
  removeChild(item) { item.remove(); }
  remove() { if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this); }
  addEventListener(type,fn) { this.events[type]=fn; }
  querySelectorAll(tag) { return this.children.flatMap(x=>[...(x.tag===tag?[x]:[]),...x.querySelectorAll(tag)]); }
  click() { if(!this.disabled)this.events.click?.(); }
  setAttribute(name, value) { this[name] = value; } focus() {}
  getBoundingClientRect() { return { width: 340, height: 486 }; }
}
globalThis.CustomEvent=class {constructor(type,args){this.type=type;this.detail=args.detail;}};
globalThis.document = {
  getElementById(id) { return this.body.children.find(item => item.id === id); },
  body: new Element('body'), addEventListener(){}, removeEventListener(){}, dispatchEvent(){}, exitPointerLock(){},
  createElement(tag) { return new Element(tag); },
  createElementNS() {
    const events = new Map();
    return { width: 2048, height: 2048,
      addEventListener(name, handler) { events.set(name, handler); }, removeEventListener(name) { events.delete(name); },
      set src(_) { queueMicrotask(() => events.get('load')?.call(this)); } };
  },
};
const keypadListeners = new Map();
globalThis.window = { addEventListener(name, handler) { keypadListeners.set(name, handler); }, removeEventListener(name) { keypadListeners.delete(name); } };
const pressKeypad = key => keypadListeners.get('keydown')?.({ key, preventDefault() {}, stopImmediatePropagation() {} });
let endings = 0, surges = 0;
const originalLoad = GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync = async url => {
  const model = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.6), new THREE.MeshStandardMaterial());
  if (url.includes('sci-fi-office-desk')) mesh.name = 'Desk_Drawer1';
  mesh.position.y = 0.6; model.add(mesh); return { scene: model };
};
const scene = new THREE.Scene();
const hud = { setObjective() {} };
const aiState = { suspicion: 0, raise() {}, decay() {} };
const buildRandom = Math.random;
Math.random = () => 0.5;
const equipment = { equippedTool: 'torch', torchOn: true };
const level = buildLevel3({ scene, aiState, hud, equipment, createKeypadRenderer: () => ({ setPixelRatio() {}, setSize() {}, render() {}, dispose() {}, forceContextLoss() {} }), onEnding: () => endings++, onSurgeHit: () => surges++ });
await level.ready;
Math.random = buildRandom;
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
assert.equal(scene.getObjectByName('Hologram guidance glow').visible, false, 'Hologram cue starts off');
camera.position.y += 0.5;
for (let frame = 0; frame < 1200; frame++) level.update(1 / 60, camera);
camera.position.y -= 0.5;
assert.equal(surges, 0, 'No shockwaves before UV answer');
assert.ok(scene.getObjectByName('Core shockwave floor'), 'Core shockwave shader is present');
assert.equal(scene.getObjectByName('Core shockwave floor').visible, false, 'Shockwaves hidden until UV solved');
scene.getObjectByName('Feeder A').userData.onInteract();
assert.ok(!scene.getObjectByName('Feeder A').userData.getLabel().includes('ISOLATED'), 'Feeders locked before UV answer');
const startingHologram = scene.getObjectByName('Core holographic wall screen');
startingHologram.userData.onInteract(); assert.ok(!level.panelOpen, 'Final puzzles locked before logbook and UV clues');
scene.getObjectByName('Engineer logbook').userData.onInteract();
assert.equal(document.body.querySelectorAll('strong').length, 4, 'Exactly four red stamped entries');
document.body.querySelectorAll('button').find(b => b.textContent === 'Return to room [Esc]').click();
const drawer = scene.getObjectByName('Engineer upper locking drawer');
const uvPickup = scene.getObjectByName('UV flashlight pickup');
assert.equal(uvPickup.visible, false);
uvPickup.userData.onInteract();
assert.ok(!inventory.hasItem('uv_flashlight'), 'Locked drawer cannot award world pickup');
drawer.userData.onInteract();
const clickDigit = digit => document.body.querySelectorAll('button').find(button => button['aria-label'] === `Digit ${digit}`).click();
clickDigit('7');
document.body.querySelectorAll('button').find(button => button['aria-label'] === 'Clear code').click();
for (const digit of '0000') clickDigit(digit);
document.body.querySelectorAll('button').find(button => button['aria-label'] === 'Submit code').click();
assert.ok(!inventory.hasItem('uv_flashlight'), 'Wrong code cannot grant reward');
assert.equal(drawer.position.z, 0, 'Wrong code leaves drawer shut');
await new Promise(resolve => setTimeout(resolve, 950));
for (const digit of '7382') pressKeypad(digit);
pressKeypad('Enter');
assert.ok(!inventory.hasItem('uv_flashlight'), 'Unlocking exposes reward for collection');
assert.ok(level.panelOpen, 'Correct code shows access granted with Continue');
pressKeypad('Enter');
assert.ok(!level.panelOpen, 'Continue returns to the drawer');
drawer.userData.onInteract();
assert.ok(!level.panelOpen, 'Unlocked drawer does not open a collection panel');
for (let frame = 0; frame < 120; frame++) level.update(1 / 60, camera);
assert.ok(drawer.position.z > 0, 'Correct code slides the drawer open');
assert.equal(uvPickup.visible, true, 'Unlock reveals flashlight');
const savedSlots = [...inventory.slots];
inventory.slots.fill({ id: 'torch' });
uvPickup.userData.onInteract();
assert.equal(uvPickup.visible, true, 'Full inventory leaves pickup in drawer');
inventory.slots = savedSlots;
uvPickup.userData.onInteract();
assert.ok(inventory.hasItem('uv_flashlight'), 'Drawer awards UV flashlight');
assert.equal(uvPickup.visible, false, 'Collected flashlight disappears');
uvPickup.userData.onInteract();
assert.equal(inventory.slots.filter(item => item?.id === 'uv_flashlight').length, 1, 'Pickup cannot duplicate');
assert.ok(!level.panelOpen, 'Collecting reward resumes room');
drawer.userData.onInteract();
assert.ok(!document.body.querySelectorAll('button').some(b => b.textContent === 'Collect UV flashlight'), 'Reward cannot be duplicated');
assert.ok(!level.panelOpen, 'Empty drawer does not open a panel');
const originalRandom = Math.random;
const aimAtInk = id => {
  const clue = scene.getObjectByName(`UV clue ${id}`);
  scene.updateMatrixWorld(true);
  const point = clue.getWorldPosition(new THREE.Vector3());
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(clue.getWorldQuaternion(new THREE.Quaternion()));
  camera.position.copy(point).addScaledVector(normal, 2);
  camera.lookAt(point); camera.updateMatrixWorld(true); level.update(1 / 60, camera);
  return clue;
};
let key = aimAtInk('key');
assert.equal(key.children[2].visible, false, 'Ordinary torch cannot reveal invisible ink');
equipment.equippedTool = 'uv_flashlight'; equipment.torchOn = false;
level.update(1 / 60, camera);
assert.equal(key.children[2].visible, false, 'Switched-off UV cannot reveal ink');
equipment.torchOn = true; level.update(1 / 60, camera);
assert.equal(key.children[2].visible, true, 'Aimed UV reveals wall key');
key.userData.onInteract();
document.body.querySelectorAll('input')[0].value = 'RELAY';
document.body.querySelectorAll('button').find(b => b.textContent === 'Decode keyword').click();
assert.equal(level.accessKeyword, null, 'Cannot skip recording fragments');
document.body.querySelectorAll('button').find(b => b.textContent === 'Return to room [Esc]').click();
for (const id of ['poster', 'label', 'tile']) aimAtInk(id).userData.onInteract();
key = aimAtInk('key'); key.userData.onInteract();
document.body.querySelectorAll('input')[0].value = 'WRONG';
document.body.querySelectorAll('button').find(b => b.textContent === 'Decode keyword').click();
assert.equal(level.accessKeyword, null, 'Incorrect keyword does not solve');
document.body.querySelectorAll('input')[0].value = 'relay';
document.body.querySelectorAll('button').find(b => b.textContent === 'Decode keyword').click();
assert.equal(level.accessKeyword, 'RELAY', 'Decoding records keyword for assembly puzzle');
document.body.querySelectorAll('button').find(b => b.textContent === 'Return to room [Esc]').click();
const bot = scene.getObjectByName('Level 3 bot beside left desk');
const feederStations = ['A', 'B', 'C'].map(id => scene.getObjectByName(`Feeder ${id}`));
const sortedFeeders = [...feederStations].sort((a,b) => Number(b.userData.getLabel().match(/(\d+) MW/)[1]) - Number(a.userData.getLabel().match(/(\d+) MW/)[1]));
sortedFeeders[0].userData.onInteract();
assert.ok(sortedFeeders[0].userData.getLabel().includes('ISOLATED'));
sortedFeeders[2].userData.onInteract();
assert.ok(feederStations.every(f => !f.userData.getLabel().includes('ISOLATED')), 'Wrong order resets feeder progress');
for (const feeder of sortedFeeders) feeder.userData.onInteract();
assert.ok(feederStations.every(f => f.userData.getLabel().includes('ISOLATED')), 'Highest-to-lowest order isolates all feeders');
camera.position.y += 0.5;
for(let frame=0;frame<120;frame++)level.update(1/60,camera);
camera.position.y -= 0.5;
assert.equal(scene.getObjectByName('Core shockwave floor').visible, false, 'All feeders isolated disables shockwaves');
assert.ok(scene.getObjectByName('Core shockwave floor').material.uniforms.uRadius.value.every(r => r === -10), 'No lingering rings after feeder isolation');
bot.userData.onInteract(); assert.ok(level.panelOpen, 'Robot is available immediately after Invisible Ink');
function message(value) {
  document.body.querySelectorAll('input')[0].value = value;
  document.body.querySelectorAll('button').find(b => b.textContent === 'Send message').click();
}
message('river');
assert.ok(!inventory.hasItem('robot_flow_module'), 'Dormant robot cannot release parts');
message('HELLO'); message('wrong');
assert.ok(!inventory.hasItem('robot_flow_module'), 'Wrong answer cannot release part');
message(' River ');
assert.ok(inventory.hasItem('robot_flow_module'));
document.body.querySelectorAll('button').find(b => b.textContent === 'Return to room').click();
bot.userData.onInteract(); message('Footsteps');
assert.ok(inventory.hasItem('robot_motion_module'), 'Progress survives reopening');
const slotsBeforeFull = [...inventory.slots]; inventory.slots.fill({ id: 'torch' });
message('Keyboard'); assert.ok(!inventory.hasItem('robot_interface_module'), 'Full inventory prevents lost reward');
inventory.slots = slotsBeforeFull; message('KEYBOARD');
assert.ok(inventory.hasItem('robot_interface_module'));
assert.equal(scene.getObjectByName('Hologram guidance glow').visible, true, 'Completing robot riddles highlights hologram');
assert.equal(inventory.slots.filter(item => item?.type === 'part').length, 3);
document.body.querySelectorAll('button').find(b => b.textContent === 'Return to room').click();
const hologram = scene.getObjectByName('Core holographic wall screen');
hologram.userData.onInteract(); assert.ok(level.panelOpen);
assert.ok(document.getElementById('component-assembly-overlay'), 'Hologram opens assembly before circuit');
const clickText = text => document.body.querySelectorAll('button').find(b => b.textContent.includes(text)).click();
clickText('Power Module'); clickText('Relay / NOTCH');
assert.ok(inventory.hasItem('robot_flow_module'), 'Wrong socket keeps part in backpack');
clickText('Power / NOTCH');
assert.ok(!inventory.hasItem('robot_flow_module'), 'Correct fit installs component');
document.body.querySelectorAll('button').find(b => b.textContent.includes('Relay') && !b.textContent.includes('NOTCH') && !b.textContent.includes('CONNECTED')).click(); clickText('Control / NOTCH');
assert.ok(inventory.hasItem('robot_motion_module'), 'Wrong shape rejected');
clickText('Relay / NOTCH');
assert.ok(inventory.hasItem('robot_motion_module'), 'Wrong rotation rejected');
clickText('Rotate selected part'); clickText('Relay / NOTCH');
clickText('Return to room'); hologram.userData.onInteract();
clickText('Control Chip'); clickText('Rotate selected part'); clickText('Rotate selected part'); clickText('Control / NOTCH');
assert.equal(level.assemblyComplete,true,'All parts assembled');
assert.equal(inventory.slots.filter(item => item?.type === 'part').length,0,'Components consumed only on correct fit');
assert.equal(scene.getObjectByName('Hologram guidance glow').visible,false,'Assembly continues inside the hologram');
const assemblyHost = document.getElementById('component-assembly-overlay');
assert.ok(assemblyHost, 'Assembly overlay stays mounted while loading');
assert.equal(assemblyHost.querySelectorAll('div').find(node => node.role === 'progressbar').children.length,24,'Loading indicator uses discrete bars');
assert.ok(level.panelOpen, 'Loading keeps gameplay paused');
assert.equal(endings,0,'Assembly alone does not shut down the AI');
await new Promise(resolve => setTimeout(resolve, 2500));
assert.ok(document.getElementById('core-circuit-overlay'),'Existing circuit remains final puzzle');
assert.equal(document.getElementById('core-circuit-overlay'),assemblyHost,'Circuit reuses the same overlay without exiting');
assert.equal(scene.getObjectByName('Hologram guidance glow').visible,false);
let buttons;
buttons=document.body.querySelectorAll('button');
const authorize=buttons.find(b=>b.textContent==='Authorize shutdown');
authorize.click();assert.ok(level.panelOpen,'Broken circuit cannot finish level');
for(const id of CIRCUIT_PATH){if(id===12||id===3)continue;buttons[id].click();buttons[id].click();}
authorize.click();assert.ok(!level.panelOpen,'Correct route closes circuit');
for (let frame = 0; frame < 200; frame++) level.update(1 / 60, camera);
assert.equal(endings, 1, 'Core puzzle reaches ending without stopping animation');
level.dispose();
GLTFLoader.prototype.loadAsync = originalLoad;
assert.equal(scene.children.length, 0);
console.log('Level 3 checks passed: drawer, UV RELAY cipher, robot components, assembly matching/rotation/persistence, final circuit, ending and disposal.');
