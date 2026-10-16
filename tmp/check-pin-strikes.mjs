import assert from 'node:assert/strict';
import { buildKeypad } from '../src/scenes/roomBuilder.js';
import { SecurityRun } from '../src/systems/securityRun.js';
class Element {
  constructor() { this.style = {}; this.children = []; }
  appendChild(child) { this.children.push(child); }
  contains(child) { return this.children.includes(child); }
  removeChild(child) { this.children = this.children.filter(item => item !== child); }
}
const body = new Element();
const listeners = new Map();
globalThis.document = { body, createElement: () => new Element(),
  getElementById: id => body.children.find(child => child.id === id),
  addEventListener: (name, handler) => listeners.set(name, handler),
  removeEventListener: name => listeners.delete(name) };
const timers = [];
globalThis.setTimeout = callback => timers.push(callback);
const run = new SecurityRun();
const attempts = [];
let solved = 0;
const keypad = buildKeypad({ targetCodes: ['0215', '1040'], onSuccess: () => solved++,
  onWrongCode: result => { attempts.push(result); if (result.strike) run.strike('clock-pin'); } });
function open() { keypad.mesh.userData.onInteract(); }
function press(label) {
  const find = root => root.innerText === label && typeof root.onclick === 'function' ? root : root.children.map(find).find(Boolean);
  find(body).onclick({ stopPropagation() {} });
}
function submit(code) { for (const digit of code) press(digit); press('E'); }
function flush() { while (timers.length) timers.shift()(); }
open();
press('E');
assert.equal(attempts.length, 0, 'Empty submit does not count');
for (let i = 1; i <= 3; i++) {
  submit('9999'); flush();
  assert.equal(run.strikes, 0, 'Three mistakes allowed');
  listeners.get('keydown')({ key: 'Escape' }); open();
}
submit('9999');
assert.equal(run.strikes, 1, 'Fourth mistake causes one strike across modal reopenings');
assert.equal(body.children.length, 0, 'Strike closes keypad so loss screen remains accessible');
open();
submit('0215'); flush();
assert.equal(attempts.length, 4, 'Correct stage does not count as a mistake');
for (let i = 0; i < 4; i++) { submit('9999'); flush(); }
assert.equal(run.strikes, 2, 'Four further mistakes cause another strike even with paused recovery time');
open(); submit('1040'); flush();
assert.equal(solved, 1, 'Correct remaining stage still solves puzzle');
assert.equal(run.strikes, 2);
console.log('PIN checks passed: fourth failure strikes, counters survive closing, counters reset after strike, blank/correct entries safe, progression preserved.');
