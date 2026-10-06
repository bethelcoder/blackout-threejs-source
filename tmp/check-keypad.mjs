import assert from 'node:assert/strict';
import { buildSecurityKeypad } from '../src/scenes/securityKeypad.js';
const listeners = new Map();
const context = new Proxy({}, { get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {} });
class Element {
  constructor(tag) { this.tag = tag; this.style = {}; this.children = []; }
  appendChild(child) { this.children.push(child); return child; }
  contains(child) { return this.children.includes(child); }
  removeChild(child) { this.children = this.children.filter(c => c !== child); }
  getContext() { return context; }
}
const body = new Element('body');
globalThis.document = {
  body, createElement: tag => new Element(tag),
  getElementById: id => body.children.find(c => c.id === id),
  dispatchEvent() {},
};
globalThis.window = {
  addEventListener: (name, handler) => listeners.set(name, handler),
  removeEventListener: name => listeners.delete(name),
};
let successes = 0;
const keypad = buildSecurityKeypad({ onSuccess: () => successes++ });
const press = key => listeners.get('keydown')?.({ key, preventDefault() {}, stopImmediatePropagation() {} });
keypad.mesh.userData.onInteract();
press('E');
assert.ok(document.getElementById('security-keypad-overlay'), 'Opening E must leave keypad visible');
press('Enter');
assert.equal(keypad.isUnlocked(), false, 'Blank entry must stay locked');
await new Promise(resolve => setTimeout(resolve, 950));
for (const digit of '1234') press(digit);
press('Enter');
assert.equal(successes, 0, 'Wrong code must not grant access');
await new Promise(resolve => setTimeout(resolve, 950));
for (const digit of '0451') press(digit);
press('Enter');
assert.equal(keypad.isUnlocked(), true);
assert.equal(successes, 1, 'Correct logbook code grants access once');
press('Enter');
assert.equal(successes, 1);
keypad.dispose();
assert.equal(body.children.length, 0, 'Disposal removes overlay');
assert.equal(listeners.size, 0, 'Disposal removes keyboard handler');
console.log('Keypad checks passed: opening E, blank/wrong/correct codes, duplicate submit, cleanup.');
