import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
const model = JSON.parse(fs.readFileSync('src/assets/models/stacked-cardboard-boxes.json', 'utf8'));
let source = fs.readFileSync('src/scenes/cardboardBoxes.js', 'utf8');
source = source.replace("import model from '../assets/models/stacked-cardboard-boxes.json';", `const model = ${JSON.stringify(model)};`);
source = source.replace("import * as THREE from 'three';", 'const THREE = globalThis.boxTestThree;');
globalThis.boxTestThree = THREE;
const { buildCardboardBoxes } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const boxes = buildCardboardBoxes();
const bounds = new THREE.Box3().setFromObject(boxes.group);
const size = bounds.getSize(new THREE.Vector3());
assert.equal(boxes.group.children.length, 8);
assert.ok(Math.abs(bounds.min.y) < 0.00001, 'Boxes rest on the floor');
assert.ok(size.x <= 1.70001 && size.y <= 1.80001 && size.z <= 1.50001, 'Stack fits storage bay');
assert.ok(boxes.colliders.every(box => !box.isEmpty()), 'Every mesh has collision');
for (const part of model.parts) {
  assert.equal(part.positions.length % 9, 0);
  assert.ok(part.positions.every(Number.isFinite));
}
boxes.dispose();
console.log('Box checks passed: 8 meshes, floor placement, storage bay dimensions, collision, valid geometry.');
