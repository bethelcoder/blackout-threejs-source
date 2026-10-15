import * as THREE from 'three';
import { loadModel } from '../systems/modelCache.js';

/** Fit extracted wall panels and overhead strips to the existing 14 x 16 room. */
export function arrangeVenatorRoom(source) {
  const group = new THREE.Group();
  group.name = 'Venator walls and ceiling';
  const panels = ['WallPanel6', 'WallPanel8'].map(name => source.getObjectByName(name));
  const light = source.getObjectByName('VenatorLight7');
  const buckets = panels.map(() => []);
  const transform = new THREE.Object3D();
  const placePanel = (index, position, rotation, scale) => {
    transform.position.set(...position);
    transform.rotation.set(...rotation);
    transform.scale.set(...scale);
    transform.updateMatrix();
    buckets[index % panels.length].push(transform.matrix.clone());
  };
  // Front and back walls.
  for (const side of [-1, 1]) {
    const count = 12;
    const width = 14 / count;
    for (let i = 0; i < count; i++) {
      const aboveDoor = side < 0 && (i === 5 || i === 6);
      placePanel(i, [-7 + (i + 0.5) * width, aboveDoor ? 2.78 : 0, side * 7.98], [0, side < 0 ? 0 : Math.PI, 0], [width, aboveDoor ? 1.42 : 4.2, 1]);
    }
  }
  // Left and right walls. Their relief stays behind the wall face, clear of the switch.
  for (const side of [-1, 1]) {
    const count = 14;
    const width = 16 / count;
    for (let i = 0; i < count; i++) {
      placePanel(i, [side * 6.98, 0, -8 + (i + 0.5) * width], [0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0], [width, 4.2, 1]);
    }
  }
  // The prefab has no separate roof: its original panel modules form the ceiling.
  for (let x = 0; x < 7; x++) {
    for (let z = 0; z < 4; z++) {
      placePanel(x + z, [-6 + x * 2, 4.18, -8 + z * 4], [Math.PI / 2, 0, 0], [2, 4, 1]);
    }
  }
  panels.forEach((panel, i) => {
    panel.material.side = THREE.DoubleSide;
    const instances = new THREE.InstancedMesh(panel.geometry, panel.material, buckets[i].length);
    instances.name = `Imported ${panel.name} wall and ceiling modules`;
    instances.receiveShadow = true;
    buckets[i].forEach((matrix, index) => instances.setMatrixAt(index, matrix));
    instances.instanceMatrix.needsUpdate = true;
    instances.computeBoundingBox();
    instances.computeBoundingSphere();
    group.add(instances);
  });
  light.material.side = THREE.DoubleSide;
  light.material.emissiveIntensity = 1.8;
  // Six continuous parallel runs, assembled from the prefab's original strip module.
  const strips = new THREE.InstancedMesh(light.geometry, light.material, 24);
  strips.name = 'Imported Venator overhead light strips';
  let index = 0;
  for (const x of [-5, -3, -1, 1, 3, 5]) {
    for (const z of [-6, -2, 2, 6]) {
      transform.position.set(x, 4.01, z);
      transform.rotation.set(0, 0, 0);
      transform.scale.set(0.65, 1, 3.96);
      transform.updateMatrix();
      strips.setMatrixAt(index++, transform.matrix);
    }
  }
  strips.instanceMatrix.needsUpdate = true;
  strips.computeBoundingBox();
  strips.computeBoundingSphere();
  group.add(strips);
  return group;
}

export function buildVenatorRoom({ scene, onReady }) {
  let disposed = false;
  let room = null;
  let lasersActive = true;
  function setLaserActive(active) {
    lasersActive = active;
    const strips = room?.getObjectByName('Imported Venator overhead light strips');
    if (strips) {
      strips.material.color.setHex(active ? 0x33ff66 : 0xffffff);
      strips.material.emissive.setHex(active ? 0x33ff66 : 0xffffff);
    }
  }
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
  const ready = loadModel(new URL('../assets/models/venator-room-modules.glb', import.meta.url).href)
    .then(async gltf => {
      collect(gltf.scene);
      const materials = new Set();
      gltf.scene.traverse(object => { if (object.material) materials.add(object.material); });
      await Promise.all([...materials].map(async material => {
        const [metalnessMap, roughnessMap] = await Promise.all([
          gltf.parser.getDependency('texture', material.userData.metalnessTexture),
          gltf.parser.getDependency('texture', material.userData.roughnessTexture),
        ]);
        material.metalnessMap = metalnessMap;
        material.roughnessMap = roughnessMap;
        material.needsUpdate = true;
      }));
      collect(gltf.scene);
      if (disposed) { release(); return; }
      room = arrangeVenatorRoom(gltf.scene);
      setLaserActive(lasersActive);
      scene.add(room);
      onReady?.();
    }).catch(error => { release(); console.error('Could not load Venator walls and ceiling; retaining existing room.', error); });
  return {
    ready,
    setLaserActive,
    dispose() {
      disposed = true;
      room?.removeFromParent();
      release();
    },
  };
}
