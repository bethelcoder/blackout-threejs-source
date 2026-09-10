import * as THREE from 'three';

/**
 * Builds a rectangular room (floor, ceiling, 4 walls) and returns
 * { group, colliders } so the caller can register wall collisions
 * with PlayerControls without hand-writing geometry every time.
 */
export function buildRoom({ width, depth, height = 4, floorColor = 0x546270, wallColor = 0x728294 }) {
  const group = new THREE.Group();
  const colliders = [];

  const floorMat = new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.5, metalness: 0.15 });
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.5, metalness: 0.1 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x424f5c, roughness: 0.6 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = height;
  group.add(ceiling);

  const wallDefs = [
    { pos: [0, height / 2, -depth / 2], rot: [0, 0, 0], size: [width, height] },
    { pos: [0, height / 2, depth / 2], rot: [0, Math.PI, 0], size: [width, height] },
    { pos: [-width / 2, height / 2, 0], rot: [0, Math.PI / 2, 0], size: [depth, height] },
    { pos: [width / 2, height / 2, 0], rot: [0, -Math.PI / 2, 0], size: [depth, height] },
  ];

  const wallThickness = 0.2;
  for (const w of wallDefs) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w.size[0], w.size[1]), wallMat);
    mesh.position.set(...w.pos);
    mesh.rotation.set(...w.rot);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    group.add(mesh);

    // Approximate collider as a thin box aligned to the wall's facing axis
    const isZWall = w.rot[1] === 0 || Math.abs(w.rot[1]) === Math.PI;
    const box = new THREE.Box3();
    if (isZWall) {
      box.setFromCenterAndSize(
        new THREE.Vector3(w.pos[0], height / 2, w.pos[2]),
        new THREE.Vector3(width, height, wallThickness)
      );
    } else {
      box.setFromCenterAndSize(
        new THREE.Vector3(w.pos[0], height / 2, w.pos[2]),
        new THREE.Vector3(wallThickness, height, depth)
      );
    }
    colliders.push(box);
  }

  return { group, colliders };
}

/** A simple crate/prop box, used for clutter, cover, and puzzle objects. */
export function buildProp({ width, height, depth, color = 0x58687a, position = [0, 0, 0] }) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.25 })
  );
  mesh.position.set(position[0], height / 2, position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const box = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(position[0], height / 2, position[2]),
    new THREE.Vector3(width, height, depth)
  );

  return { mesh, box };
}
