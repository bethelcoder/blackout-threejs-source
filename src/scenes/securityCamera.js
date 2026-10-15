import * as THREE from 'three';
import model from '../assets/models/security-camera/camera.json' with { type: 'json' };

/** Imported camera with its lens centred at the origin, looking along local +Z. */
export function buildSecurityCamera() {
  const group = new THREE.Group();
  group.name = 'Imported Security_Camera';
  const loader = new THREE.TextureLoader();
  const map = loader.load(new URL('../assets/models/security-camera/None_baseColor.png', import.meta.url).href);
  const normalMap = loader.load(new URL('../assets/models/security-camera/None_normal.jpg', import.meta.url).href);
  const metalnessMap = loader.load(new URL('../assets/models/security-camera/None_metallicRoughness_metal.jpg', import.meta.url).href);
  const roughnessMap = loader.load(new URL('../assets/models/security-camera/None_metallicRoughness_rough.jpg', import.meta.url).href);
  const emissiveMap = loader.load(new URL('../assets/models/security-camera/None_emissive.jpg', import.meta.url).href);
  const aoMap = loader.load(new URL('../assets/models/security-camera/None_metallicRoughness_occl.jpg', import.meta.url).href);
  map.colorSpace = emissiveMap.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map, normalMap, metalnessMap, roughnessMap, emissiveMap, aoMap,
    metalness: 1, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.5, alphaTest: 0.05 });
  const lens = model.parts.find(part => part.name.startsWith('Lense_glass'));
  const lensBox = new THREE.Box3();
  const axis = new THREE.Vector3();
  for (let i = 0; i < lens.positions.length; i += 3) lensBox.expandByPoint(new THREE.Vector3().fromArray(lens.positions, i));
  for (let i = 0; i < lens.normals.length; i += 3) axis.add(new THREE.Vector3().fromArray(lens.normals, i));
  const center = lensBox.getCenter(new THREE.Vector3());
  const align = new THREE.Quaternion().setFromUnitVectors(axis.normalize(), new THREE.Vector3(0, 0, 1));
  for (const part of model.parts) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(part.positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(part.uvs, 2));
    geometry.setAttribute('uv1', geometry.attributes.uv);
    if (part.normals.length) geometry.setAttribute('normal', new THREE.Float32BufferAttribute(part.normals, 3));
    else geometry.computeVertexNormals();
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.applyQuaternion(align);
    geometry.scale(0.006, 0.006, 0.006);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  return {
    group,
    dispose() {
      group.removeFromParent();
      group.children.forEach(mesh => mesh.geometry.dispose());
      material.dispose();
      for (const texture of [map, normalMap, metalnessMap, roughnessMap, emissiveMap, aoMap]) texture.dispose();
    },
  };
}

export function createRoomSecurityView() {
  const camera = new THREE.PerspectiveCamera(128, 16 / 9, 0.25, 40);
  camera.position.set(0, 6.05, -9.0);
  camera.lookAt(0, 0, -0.8);
  camera.updateMatrixWorld(true);
  return camera;
}
