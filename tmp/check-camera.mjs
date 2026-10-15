import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildSecurityCamera, createRoomSecurityView } from '../src/scenes/securityCamera.js';
globalThis.document = { createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, set src(value) {} }) };
const view = createRoomSecurityView();
assert.ok(view.position.y > 5.8, 'Camera mounted near ceiling');
for (const x of [-7, 0, 7]) {
  for (const z of [-10, 0, 10]) {
    const screen = new THREE.Vector3(x, 0, z).project(view);
    assert.ok(Math.abs(screen.x) <= 1 && Math.abs(screen.y) <= 1 && Math.abs(screen.z) <= 1,
      `Room floor (${x}, ${z}) must fit CCTV view: ${screen.toArray()}`);
  }
}
const model = buildSecurityCamera();
assert.equal(model.group.children.length, 12, 'All supplied camera components retained');
assert.ok(model.group.children.every(mesh => mesh.material.map && mesh.material.normalMap && mesh.geometry.attributes.uv));
model.group.position.copy(view.position);
model.group.lookAt(0, 0, -0.8);
model.group.updateMatrixWorld(true);
const bounds = new THREE.Box3().setFromObject(model.group);
assert.ok(bounds.max.y < 6.66, 'Model fits below ceiling tiles');
assert.ok(bounds.min.z > -10, 'Model fits inside the back wall');
const facing = model.group.getWorldDirection(new THREE.Vector3());
assert.ok(facing.z > 0 && facing.y < 0, 'Lens faces down into room');
model.dispose();
console.log('Camera checks passed: imported meshes/textures, ceiling clearance, orientation, full room floor fits CCTV view.');
