import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Repeat the supplied USDZ's four square module variants across the room. */
export function tileFloorModules(source, width = 14, depth = 16) {
  const group = new THREE.Group();
  group.name = 'Modular sci-fi floor';
  const variants = [];
  source.traverse(object => { if (object.isMesh) variants.push(object); });
  const placements = variants.map(() => []);
  const matrix = new THREE.Matrix4();
  for (let x = 0; x < width / 2; x++) {
    for (let z = 0; z < depth / 2; z++) {
      placements[(x + z * 3) % variants.length].push([-width / 2 + 1 + x * 2, -depth / 2 + 1 + z * 2]);
    }
  }
  variants.forEach((variant, index) => {
    // The source metal texture is separate from its constant roughness value.
    variant.material.roughnessMap = null;
    variant.material.roughness = 0.7;
    variant.material.emissiveIntensity = 0.6;
    const tiles = new THREE.InstancedMesh(variant.geometry, variant.material, placements[index].length);
    tiles.name = variant.name;
    tiles.receiveShadow = true;
    placements[index].forEach(([x, z], i) => tiles.setMatrixAt(i, matrix.makeTranslation(x, 0, z)));
    tiles.instanceMatrix.needsUpdate = true;
    tiles.computeBoundingBox();
    tiles.computeBoundingSphere();
    group.add(tiles);
  });
  return group;
}

export function buildModularFloor({ scene, onReady }) {
  let disposed = false;
  let floor = null;
  function release(source) {
    const resources = new Set();
    source.traverse(object => {
      if (object.geometry) resources.add(object.geometry);
      if (object.material) {
        resources.add(object.material);
        for (const value of Object.values(object.material)) if (value?.isTexture) resources.add(value);
      }
    });
    resources.forEach(resource => resource.dispose());
  }
  const ready = new GLTFLoader().loadAsync(new URL('../assets/models/modular-sci-fi-floor.glb', import.meta.url).href)
    .then(gltf => {
      if (disposed) { release(gltf.scene); return; }
      floor = tileFloorModules(gltf.scene);
      scene.add(floor);
      onReady?.();
    }).catch(error => console.error('Could not load modular floor; retaining original floor.', error));
  return {
    ready,
    dispose() {
      disposed = true;
      if (floor) { floor.removeFromParent(); release(floor); }
    },
  };
}
