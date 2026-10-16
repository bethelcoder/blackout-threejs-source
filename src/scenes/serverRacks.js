import * as THREE from 'three';
import { loadModel } from '../systems/modelCache.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function arrangeServerRack(source, name, z) {
  // Collapse the many individual screws/handles by material, retaining every triangle.
  const materials = new Map();
  source.updateMatrixWorld(true);
  source.traverse(object => {
    if (!object.isMesh) return;
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    if (!materials.has(object.material)) materials.set(object.material, []);
    materials.get(object.material).push(geometry);
  });
  const body = new THREE.Group();
  for (const [material, parts] of materials) {
    const geometry = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
    if (parts.length > 1) parts.forEach(part => part.dispose());
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    body.add(mesh);
  }
  body.rotation.y = -Math.PI / 2; // Both supplied rack fronts face +Z; aim them into the room.
  body.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(body);
  body.scale.setScalar(2.8 / bounds.getSize(new THREE.Vector3()).y);
  body.updateMatrixWorld(true);
  bounds.setFromObject(body);
  const center = bounds.getCenter(new THREE.Vector3());
  body.position.set(-center.x, -bounds.min.y, -center.z);
  const group = new THREE.Group();
  group.name = name;
  group.add(body);
  group.position.set(6.88 - bounds.getSize(new THREE.Vector3()).x / 2, 0, z);
  group.updateMatrixWorld(true);
  return { group, collider: new THREE.Box3().setFromObject(group) };
}

export function buildServerRacks({ scene, colliders, rackOccluders, onReady }) {
  let disposed = false;
  const racks = [];
  const resources = new Set();
  function collect(source) {
    source.traverse(object => {
      if (object.geometry) resources.add(object.geometry);
      if (object.material) {
        resources.add(object.material);
        for (const value of Object.values(object.material)) if (value?.isTexture) resources.add(value);
      }
    });
  }
  function release() { resources.forEach(resource => resource.dispose()); resources.clear(); }

  const ready = Promise.all([
    [new URL('../assets/models/data-center-server-rack.glb', import.meta.url).href, 'Data Center Server Rack', [1.06, 1.88, 2.7, 3.52, 4.34]],
    [new URL('../assets/models/server-racking-system.glb', import.meta.url).href, 'Server Racking System', [-1.4, -2.7, -4, -5.3, -6.6]],
  ].map(async ([url, name, positions]) => {
    const gltf = await loadModel(url);
    collect(gltf.scene);
    if (disposed) { release(); return; }
    const template = arrangeServerRack(gltf.scene, name, positions[0]);
    collect(template.group);
    positions.forEach((z, index) => {
      // Share merged geometry and materials across copies; load each asset once.
      const group = index === 0 ? template.group : template.group.clone(true);
      group.name = index === 0 ? name : `${name} ${index + 1}`;
      group.position.z = z;
      group.updateMatrixWorld(true);
      const rack = { group, collider: new THREE.Box3().setFromObject(group) };
      racks.push(rack);
      scene.add(group);
      colliders.push(rack.collider);
      rackOccluders.push(rack.collider);
    });
    onReady?.();
  })).catch(error => console.error('Could not load imported server rack.', error));
  return {
    ready,
    dispose() {
      disposed = true;
      for (const rack of racks) {
        rack.group.removeFromParent();
        for (const boxes of [colliders, rackOccluders]) {
          const index = boxes.indexOf(rack.collider);
          if (index >= 0) boxes.splice(index, 1);
        }
      }
      release();
    },
  };
}
