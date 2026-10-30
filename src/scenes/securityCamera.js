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

export function createRoomSecurityView({
  position = new THREE.Vector3(0, 6.05, -9.0),
  target = new THREE.Vector3(0, 0, -0.8),
  fov = 44,
  far = 28,
} = {}) {
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.25, far);
  camera.position.copy(position);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  return camera;
}

/** The visible boundary and detection frustum share the same moving camera. */
export function createSecuritySweep(camera, model, colliders) {
  const group = new THREE.Group();
  group.name = 'Camera detection cone';
  const segments = 96;
  const positions = new Float32Array(segments * 9);
  const outline = new Float32Array(segments * 6);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const outlineGeometry = new THREE.BufferGeometry();
  outlineGeometry.setAttribute('position', new THREE.BufferAttribute(outline, 3));
  const material = new THREE.MeshBasicMaterial({ color: 0xffbe45, transparent: true,
    opacity: 0.065, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  const outlineMaterial = new THREE.LineBasicMaterial({ color: 0xffcf70, transparent: true,
    opacity: 0.55, depthWrite: false, toneMapped: false });
  const mesh = new THREE.Mesh(geometry, material);
  const lines = new THREE.LineSegments(outlineGeometry, outlineMaterial);
  // These are visual aids, so interaction rays must pass through them.
  mesh.raycast = lines.raycast = () => {};
  mesh.frustumCulled = lines.frustumCulled = false;
  group.add(mesh, lines);
  const frustum = new THREE.Frustum();
  const projection = new THREE.Matrix4();
  const ray = new THREE.Ray();
  const direction = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const target = new THREE.Vector3();
  const perimeter = Array.from({ length: segments }, () => new THREE.Vector3());
  let elapsed = 0;

  function update(delta) {
    elapsed += delta;
    // A complete left/right cycle takes 28 seconds, easing at each end.
    const yaw = Math.sin(elapsed * Math.PI * 2 / 28) * THREE.MathUtils.degToRad(55);
    // Aim at deck level directly below the mount, so the cone lands on the
    // floor from any ceiling height instead of assuming level 1's 6.05 m.
    target.set(Math.sin(yaw) * 11, -camera.position.y, Math.cos(yaw) * 11).add(camera.position);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);
    model.position.copy(camera.position);
    model.lookAt(target);
    frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));

    for (let i = 0; i < segments; i++) {
      const side = Math.floor(i / 24);
      const t = (i % 24) / 24 * 2 - 1;
      const x = side === 0 ? t : side === 1 ? 1 : side === 2 ? -t : -1;
      const y = side === 0 ? -1 : side === 1 ? t : side === 2 ? 1 : -t;
      direction.set(x, y, 1).unproject(camera).sub(camera.position).normalize();
      ray.set(camera.position, direction);
      let distance = camera.far;
      if (direction.y < 0) distance = Math.min(distance, (0.025 - camera.position.y) / direction.y);
      for (const box of colliders) {
        if (!box.isEmpty() && ray.intersectBox(box, hit)) distance = Math.min(distance, hit.distanceTo(camera.position));
      }
      perimeter[i].copy(direction).multiplyScalar(Math.max(0, distance - 0.015)).add(camera.position);
    }
    for (let i = 0; i < segments; i++) {
      const a = perimeter[i], b = perimeter[(i + 1) % segments];
      camera.position.toArray(positions, i * 9);
      a.toArray(positions, i * 9 + 3);
      b.toArray(positions, i * 9 + 6);
      a.toArray(outline, i * 6);
      b.toArray(outline, i * 6 + 3);
    }
    geometry.attributes.position.needsUpdate = true;
    outlineGeometry.attributes.position.needsUpdate = true;
  }

  function sees(position) {
    if (!frustum.containsPoint(position)) return false;
    direction.subVectors(position, camera.position);
    const distance = direction.length();
    ray.set(camera.position, direction.normalize());
    return !colliders.some(box => !box.isEmpty() && ray.intersectBox(box, hit)
      && hit.distanceTo(camera.position) < distance - 0.35);
  }

  update(0);
  return { group, update, sees, dispose() {
    group.removeFromParent();
    geometry.dispose();
    outlineGeometry.dispose();
    material.dispose();
    outlineMaterial.dispose();
  } };
}
