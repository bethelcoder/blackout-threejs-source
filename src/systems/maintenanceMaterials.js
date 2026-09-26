import * as THREE from 'three';
import colourUrl from '../assets/textures/rusty_metal_04_diff.jpg';
import normalUrl from '../assets/textures/rusty_metal_04_nor_gl.jpg';
import roughnessUrl from '../assets/textures/rusty_metal_04_rough.jpg';

let shared = null;
let users = 0;

// Only the new maintenance assemblies acquire these maps. Release after their
// materials are disposed; the last owner frees the three shared GPU textures.
export function acquireMaintenanceMaps() {
  if (!shared) {
    const loader = new THREE.TextureLoader();
    const load = (url, colour = false) => {
      const texture = loader.load(url);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      return texture;
    };
    shared = { map: load(colourUrl, true), normalMap: load(normalUrl), roughnessMap: load(roughnessUrl) };
  }
  users++;
  let released = false;
  return {
    maps: shared,
    release() {
      if (released) return;
      released = true;
      if (--users === 0) {
        Object.values(shared).forEach(texture => texture.dispose());
        shared = null;
      }
    },
  };
}

// Each box face repeats once per metre, independent of mesh scale. Equal-sized
// pieces share geometry, so repeated posts do not duplicate vertex buffers.
export function createMetalBoxGeometry(width, height, depth) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const uv = geometry.attributes.uv;
  const normal = geometry.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const xFace = Math.abs(normal.getX(i)) > 0.5;
    const yFace = Math.abs(normal.getY(i)) > 0.5;
    uv.setXY(i, uv.getX(i) * (xFace ? depth : width), uv.getY(i) * (yFace ? depth : height));
  }
  return geometry;
}
