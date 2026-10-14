import * as THREE from 'three';
import model from '../assets/models/stacked-cardboard-boxes.json';

/** The user's USDZ stack, converted into world-space mesh data. */
export function buildCardboardBoxes() {
  const group = new THREE.Group();
  group.name = 'Stacked Cardboard Boxes — Crafted by jerovdl';
  for (const part of model.parts) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(part.positions, 3));
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(...part.color), roughness: 0.95,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  if (model.upAxis === 'Z') group.rotation.x = -Math.PI / 2;
  group.rotation.y = Math.PI / 8;
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  // Fit the whole stack into the storage bay and sit it flush on the floor.
  group.scale.setScalar(Math.min(1.7 / size.x, 1.8 / size.y, 1.5 / size.z));
  group.updateMatrixWorld(true);
  bounds.setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
  group.position.set(-3.5 - center.x, -bounds.min.y, -3 - center.z);
  group.updateMatrixWorld(true);
  const colliders = group.children.map(mesh => new THREE.Box3().setFromObject(mesh));
  return {
    group, colliders,
    dispose() {
      group.removeFromParent();
      group.traverse(object => {
        object.geometry?.dispose();
        object.material?.dispose();
      });
    },
  };
}
