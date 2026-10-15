import * as THREE from 'three';
import model from '../assets/models/button/button.json' with { type: 'json' };

/** Original Button_ru2 meshes, UVs and PBR textures, facing local +Z. */
export function buildShutdownButton() {
  const group = new THREE.Group();
  group.name = 'Button_ru2 imported shutdown switch';
  const loader = new THREE.TextureLoader();
  const map = loader.load(new URL('../assets/models/button/Scene_-_Root_baseColor.jpg', import.meta.url).href);
  map.colorSpace = THREE.SRGBColorSpace;
  const metalnessMap = loader.load(new URL('../assets/models/button/Scene_-_Root_metallicRoughness_metal.jpg', import.meta.url).href);
  const roughnessMap = loader.load(new URL('../assets/models/button/Scene_-_Root_metallicRoughness_rough.jpg', import.meta.url).href);
  const normalMap = loader.load(new URL('../assets/models/button/Scene_-_Root_normal.jpg', import.meta.url).href);
  const material = new THREE.MeshStandardMaterial({ map, metalnessMap, roughnessMap, normalMap, metalness: 1, roughness: 1 });
  const caps = [];
  const scale = 0.0006;
  for (const part of model.parts) {
    const positions = [];
    const normals = [];
    // USD's front is +Y. Rotate it toward +Z, retaining the original proportions.
    for (let i = 0; i < part.positions.length; i += 3) {
      positions.push(part.positions[i] * scale, -part.positions[i + 2] * scale, part.positions[i + 1] * scale + 0.015);
    }
    for (let i = 0; i < part.normals.length; i += 3) {
      normals.push(part.normals[i], -part.normals[i + 2], part.normals[i + 1]);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(part.uvs, 2));
    if (normals.length) geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    else geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    if (part.pressable) caps.push(mesh);
  }
  let pressed = false;
  return {
    group,
    press() {
      if (pressed) return;
      pressed = true;
      for (const cap of caps) cap.position.z -= 0.015;
    },
    dispose() {
      group.removeFromParent();
      group.children.forEach(mesh => mesh.geometry.dispose());
      material.dispose();
      for (const texture of [map, metalnessMap, roughnessMap, normalMap]) texture.dispose();
    },
  };
}
