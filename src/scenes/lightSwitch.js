import * as THREE from 'three';
import model from '../assets/models/light-switch/switch.json' with { type: 'json' };

export function buildLightSwitch({ onActivate, isOn, isReady = () => true }) {
  const group = new THREE.Group();
  group.name = 'Light Switch - Avot';
  const loader = new THREE.TextureLoader();
  const map = loader.load(new URL('../assets/models/light-switch/lightswitch_baseColor.jpg', import.meta.url).href);
  map.colorSpace = THREE.SRGBColorSpace;
  const normalMap = loader.load(new URL('../assets/models/light-switch/lightswitch_normal.jpg', import.meta.url).href);
  const roughnessMap = loader.load(new URL('../assets/models/light-switch/lightswitch_metallicRoughness_rough.jpg', import.meta.url).href);
  const metalnessMap = loader.load(new URL('../assets/models/light-switch/lightswitch_metallicRoughness_metal.jpg', import.meta.url).href);
  const aoMap = loader.load(new URL('../assets/models/light-switch/lightswitch_metallicRoughness_occl.jpg', import.meta.url).href);
  const material = new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap, metalnessMap, aoMap, roughness: 1, metalness: 1 });
  for (const part of model.parts) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(part.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(part.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(part.uvs, 2));
    geometry.setAttribute('uv1', geometry.attributes.uv);
    // Source faces +X; the mounted switch faces local +Z, at 32 cm tall.
    geometry.rotateY(-Math.PI / 2);
    geometry.scale(0.028, 0.028, 0.028);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;
    group.add(mesh);
  }
  const indicatorMaterial = new THREE.MeshBasicMaterial({ color: 0x80e6ac, toneMapped: false });
  const indicator = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), indicatorMaterial);
  indicator.position.set(0, 0.115, 0.025);
  group.add(indicator);
  const glow = new THREE.PointLight(0x80e6ac, 0.025, 0.8);
  glow.position.set(0, 0.115, 0.07);
  group.add(glow);
  group.userData.interactable = true;
  group.userData.getLabel = () => isOn() ? 'Room lights are on' : isReady() ? 'Turn on room lights' : 'No power - repair the electric box first';
  group.userData.onInteract = () => { if (!isOn()) onActivate(); };
  return { group, dispose() {
    group.removeFromParent();
    group.traverse(object => object.geometry?.dispose());
    material.dispose();
    indicatorMaterial.dispose();
    for (const texture of [map, normalMap, roughnessMap, metalnessMap, aoMap]) texture.dispose();
  } };
}
