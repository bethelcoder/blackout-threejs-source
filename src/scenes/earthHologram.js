import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function buildEarthHologram() {
  const group = new THREE.Group();
  group.name = 'Earth hologram display';
  group.position.set(6.1, 0, 5.25);
  group.scale.setScalar(0.72);
  group.userData.ignoreInteraction = true;
  const metal = new THREE.MeshStandardMaterial({ color: 0x253644, metalness: 0.75, roughness: 0.45 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.36, 32), metal);
  base.name = 'Earth hologram projector'; base.position.y = 0.18; base.receiveShadow = true; group.add(base);
  const glowMaterial = new THREE.MeshBasicMaterial({ color: 0x54ddff, toneMapped: false });
  const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.016, 32), glowMaterial);
  emitter.position.y = 0.365; group.add(emitter);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.015, 6, 64), glowMaterial);
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.37; group.add(rim);
  const globe = new THREE.Group(); globe.position.y = 2.4; group.add(globe);
  const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x78e8ff, transparent: true, opacity: 0.42,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const orbitGeometry = new THREE.TorusGeometry(0.86, 0.007, 4, 96);
  const orbits = [new THREE.Mesh(orbitGeometry, orbitMaterial), new THREE.Mesh(orbitGeometry, orbitMaterial)];
  orbits[0].rotation.x = Math.PI / 2;
  orbits[1].rotation.set(0.6, 0, 0.8);
  globe.add(...orbits);
  const grid = new THREE.Mesh(new THREE.SphereGeometry(0.675, 24, 12), new THREE.MeshBasicMaterial({ color: 0x56dfff,
    wireframe: true, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false }));
  globe.add(grid);
  const light = new THREE.PointLight(0x57dcff, 0.8, 4, 2);
  light.position.y = 1.4; group.add(light);
  group.updateMatrixWorld(true);
  const collider = new THREE.Box3().setFromObject(base);
  let disposed = false, earth = null, elapsed = 0;
  const projectionMaterials = new Set();
  function disposeModel(root) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    root.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const mat of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
        materials.add(mat); Object.values(mat).forEach(value => { if (value?.isTexture) textures.add(value); });
      }
    });
    geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose());
  }
  const ready = new GLTFLoader().loadAsync('./models/earth-hologram.glb').then(gltf => {
    if (disposed) { disposeModel(gltf.scene); return; }
    const model = gltf.scene;
    earth = model.getObjectByName('Earth_2_Earth_Surface_002_0');
    const bounds = new THREE.Box3().setFromObject(earth || model);
    const size = bounds.getSize(new THREE.Vector3());
    model.scale.setScalar(1.3 / Math.max(size.x, size.y, size.z));
    model.traverse(object => {
      if (!object.isMesh) return;
      const projection = object.name.includes('Earth_rays');
      if (projection) object.rotation.x = -Math.PI / 2;
      for (const mat of Array.isArray(object.material) ? object.material : [object.material]) {
        mat.transparent = true; mat.depthWrite = false; mat.blending = THREE.AdditiveBlending;
        mat.metalness = 0; mat.roughness = 1;
        mat.emissive.setHex(0x65dfff); mat.color.setHex(0x8defff);
        if (!mat.emissiveMap) mat.emissiveMap = mat.map;
        mat.emissiveIntensity = projection ? 0.6 : 1.5;
        mat.opacity = projection ? 0.13 : 0.9;
        if (projection) { mat.side = THREE.DoubleSide; projectionMaterials.add(mat); }
        mat.needsUpdate = true;
      }
    });
    globe.add(model);
  }).catch(error => console.warn('Earth hologram model unavailable; retaining projector and orbital display.', error));
  return { group, collider, ready, update(delta) {
    if (disposed) return;
    elapsed += delta;
    if (earth) earth.rotation.y += delta * 0.22;
    grid.rotation.y += delta * 0.07;
    orbits[1].rotation.y += delta * 0.12;
    globe.position.y = 2.4 + Math.sin(elapsed * 0.8) * 0.025;
    projectionMaterials.forEach(mat => { mat.opacity = 0.12 + Math.sin(elapsed * 2) * 0.025; });
    light.intensity = 0.8 + Math.sin(elapsed * 1.6) * 0.08;
  }, dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    disposeModel(group);
  } };
}
