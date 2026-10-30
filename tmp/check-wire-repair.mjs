import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createWireRepair } from '../src/systems/wireRepair.js';
import { createRoomPower } from '../src/systems/roomPower.js';

let repairs = 0, blocked = 0, switched = 0;
const repair = createWireRepair(() => repairs++);
const light = { intensity: 4 };
const power = createRoomPower({ lights: [{ light, off: 0, on: 4 }], onBrightness() {},
  onSwitch: () => switched++, onSecurityOnline() {}, canActivate: () => repair.repaired, onBlocked: () => blocked++ });
power.activate();
assert.equal(blocked, 1);
assert.equal(power.activated, false, 'Switch is locked before repair');
assert.equal(light.intensity, 0);
assert.equal(repair.connect('unknown', 'socket-0'), false, 'Unknown cable rejected');
assert.equal(repair.connect('wire-0', 'unknown'), false, 'Unknown socket rejected');
assert.equal(repair.test(), false, 'Incomplete circuit cannot pass test');
repair.connect('wire-0', 'socket-0'); repair.connect('wire-0', 'socket-0');
assert.equal(repair.count, 1, 'Duplicate connections do not advance progress');
repair.connect('wire-1', 'socket-0');
assert.equal(repair.connect('wire-2', 'socket-0'), false, 'A socket holds only two cables');
repair.reset();
for (let i = 0; i < 6; i++) repair.connect(`wire-${i}`, `socket-${(Math.floor(i / 2) + 1) % 3}`);
assert.equal(repair.test(), false, 'Full circuit with wrong sums fails');
assert.equal(repair.repaired, false);
assert.equal(repair.disconnect('wire-0'), true, 'Wrong connections can be removed');
assert.equal(repair.count, 5);
repair.reset();
for (let i = 0; i < 6; i++) assert.equal(repair.connect(`wire-${i}`, `socket-${Math.floor(i / 2)}`), true);
assert.equal(repair.repaired, false, 'All wires must be tested before switch unlocks');
power.activate();
assert.equal(power.activated, false);
assert.equal(repair.test(), true);
repair.test();
assert.equal(repairs, 1, 'Repair callback fires only once');
power.activate(); power.update(3.1);
assert.equal(switched, 1);
assert.equal(light.intensity, 4);
assert.equal(power.securityOnline, true);
assert.equal(createWireRepair().count, 0, 'New level resets repair progress');
assert.equal(repair.disconnect('wire-0'), false, 'Successful repair stays complete');
for (let attempt = 0; attempt < 200; attempt++) {
  const puzzle = createWireRepair();
  assert.equal(new Set(puzzle.wires.map(wire => wire.value)).size, 6);
  assert.equal(new Set(puzzle.sockets.map(socket => socket.target)).size, 3);
  for (let i = 0; i < 6; i++) puzzle.connect(`wire-${i}`, `socket-${Math.floor(i / 2)}`);
  assert.equal(puzzle.test(), true, 'Generated puzzle always has a valid solution');
}

const bytes = fs.readFileSync('public/models/electric-box.glb');
assert.equal(bytes.readUInt32LE(0), 0x46546c67);
assert.equal(bytes.readUInt32LE(8), bytes.length);
const length = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.subarray(20, 20 + length).toString());
assert.equal(gltf.meshes.length, 21, 'All supplied model parts retained');
for (const accessor of gltf.accessors) assert.ok(accessor.count > 0);
for (const view of gltf.bufferViews) assert.ok(view.byteOffset + view.byteLength <= gltf.buffers[0].byteLength);
assert.ok(gltf.images.length > 0);
console.log('Number wiring checks passed: two-port limits, wrong sums, corrections, 200 solvable puzzles, switch/CCTV gating and imported GLB.');
