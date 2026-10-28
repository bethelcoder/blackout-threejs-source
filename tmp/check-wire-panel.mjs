import assert from 'node:assert/strict';
import { createWireRepair, openWireRepair } from '../src/systems/wireRepair.js';

class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.style = { setProperty() {} }; this.attributes = {}; }
  appendChild(child) { child.parent = this; this.children.push(child); return child; }
  replaceChildren() { this.children = []; }
  remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
  setAttribute(key, value) { this.attributes[key] = value; }
  focus() { document.activeElement = this; }
  set innerHTML(value) {
    for (const match of value.matchAll(/<(\w+)[^>]*class="([^"]+)"[^>]*>/g)) {
      const child = new Element(match[1]); child.className = match[2]; this.appendChild(child);
    }
  }
  querySelectorAll(selector) {
    const matches = child => selector.startsWith('.') ? child.className?.split(' ').includes(selector.slice(1))
      : selector === 'button:not(:disabled)' && child.tag === 'button' && !child.disabled;
    return this.children.flatMap(child => [...(matches(child) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0]; }
}
const listeners = new Map(), events = [];
let exits = 0, closes = 0;
globalThis.document = { body: new Element('body'), pointerLockElement: {}, activeElement: null,
  createElement: tag => new Element(tag), createElementNS: (_, tag) => new Element(tag),
  exitPointerLock() { exits++; }, dispatchEvent(event) { events.push(event); } };
globalThis.window = { addEventListener: (name, callback) => listeners.set(name, callback),
  removeEventListener: (name, callback) => { if (listeners.get(name) === callback) listeners.delete(name); } };
const repair = createWireRepair();
let dispose = openWireRepair(repair, () => closes++);
assert.equal(exits, 1);
let overlay = document.body.children[0];
const connect = (id, socketId) => {
  const wire = repair.wires.find(wire => wire.id === id);
  const socket = repair.sockets.find(socket => socket.id === socketId);
  overlay.querySelector('.wire-sources').children.find(button => button.textContent.startsWith(`${wire.value} ·`)).onclick();
  overlay.querySelector('.wire-terminals').children.find(button => button.textContent.startsWith(`TARGET ${socket.target}\n`)).onclick();
};
connect('wire-0', 'socket-0');
listeners.get('keydown')({ key: 'Escape', preventDefault() {}, stopImmediatePropagation() {} });
assert.equal(document.body.children.length, 0);
assert.equal(listeners.size, 0);
assert.equal(events.at(-1).detail.resume, true, 'Escape supplies a gesture to resume');
dispose = openWireRepair(repair, () => closes++);
overlay = document.body.children[0];
assert.equal(repair.count, 1, 'Closing and reopening retains completed wire');
const test = overlay.querySelector('.wiring-test');
overlay.querySelector('.wiring-reset').onclick();
assert.equal(repair.count, 0, 'Disconnect all clears the board');
for (let i = 0; i < 6; i++) connect(`wire-${i}`, `socket-${(Math.floor(i / 2) + 1) % 3}`);
test.onclick();
assert.equal(repair.repaired, false);
assert.match(overlay.querySelector('.wiring-status').textContent, /Test failed/);
const first = repair.wires.find(wire => wire.id === 'wire-0');
overlay.querySelector('.wire-sources').children.find(button => button.textContent.startsWith(`${first.value} ·`)).onclick();
assert.equal(repair.count, 5, 'Selecting a plugged cable removes it for correction');
assert.equal(test.disabled, true);
overlay.querySelector('.wiring-reset').onclick();
for (let i = 0; i < 6; i++) connect(`wire-${i}`, `socket-${Math.floor(i / 2)}`);
assert.equal(test.disabled, false);
test.onclick();
assert.equal(repair.repaired, true);
assert.equal(test.textContent, 'Continue');
test.onclick();
assert.equal(document.body.children.length, 0);
assert.equal(closes, 2);
dispose();
assert.equal(closes, 2, 'Closing is idempotent');
dispose = openWireRepair(repair, () => closes++);
const count = events.length;
dispose();
assert.equal(events.length, count, 'Level disposal cannot recapture the mouse or open a pause menu');
assert.equal(listeners.size, 0);
console.log('Wire panel UI checks passed: connection clicks, reopen persistence, circuit test, Continue/Escape resume and disposal.');
