import * as THREE from 'three';
import { createFloorTextures, createWallTextures, createHazardTexture } from '../systems/textures.js';

let sharedFloorTex = null;
let sharedWallTex = null;
let sharedHazardTex = null;

function getSharedTextures() {
  if (!sharedFloorTex) {
    sharedFloorTex = createFloorTextures();
    sharedWallTex = createWallTextures();
    sharedHazardTex = createHazardTexture();
  }
  return { floor: sharedFloorTex, wall: sharedWallTex, hazard: sharedHazardTex };
}

/**
 * Builds a rectangular substation room (floor, ceiling, 4 walls) with procedural
 * PBR textures (diffuse + bump maps) and architectural conduit details.
 */
export function buildRoom({ width, depth, height = 4, floorColor = 0x5a6878, wallColor = 0x768798 }) {
  const group = new THREE.Group();
  const colliders = [];
  const { floor: fTex, wall: wTex } = getSharedTextures();

  const floorMat = new THREE.MeshStandardMaterial({
    color: floorColor,
    map: fTex.map,
    bumpMap: fTex.bumpMap,
    bumpScale: 0.05,
    roughness: 0.45,
    metalness: 0.15,
  });

  const wallMat = new THREE.MeshStandardMaterial({
    color: wallColor,
    map: wTex.map,
    bumpMap: wTex.bumpMap,
    bumpScale: 0.06,
    roughness: 0.45,
    metalness: 0.1,
  });

  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x3e4a57,
    roughness: 0.6,
    metalness: 0.2,
  });

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

  // Add architectural conduit pipes running along the ceiling
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x2e3640, roughness: 0.3, metalness: 0.8 });
  const pipeGeo = new THREE.CylinderGeometry(0.06, 0.06, depth, 8);
  const pipeL = new THREE.Mesh(pipeGeo, pipeMat);
  pipeL.position.set(-width / 2 + 0.4, height - 0.15, 0);
  pipeL.rotation.x = Math.PI / 2;
  group.add(pipeL);

  const pipeR = new THREE.Mesh(pipeGeo, pipeMat);
  pipeR.position.set(width / 2 - 0.4, height - 0.15, 0);
  pipeR.rotation.x = Math.PI / 2;
  group.add(pipeR);

  return { group, colliders };
}

/** A prop box (crates, benches, desks) */
export function buildProp({ width, height, depth, color = 0x58687a, position = [0, 0, 0] }) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.25 })
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

/** Hazard yellow/black warning floor strip */
export function buildHazardStrip({ width = 3, depth = 0.5, position = [0, 0.01, 0] }) {
  const { hazard } = getSharedTextures();
  const mat = new THREE.MeshBasicMaterial({ map: hazard });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(...position);
  return mesh;
}

/** Electrical breaker cabinet prop */
export function buildBreakerCabinet({ position = [0, 0, 0], label = 'SUB-STATION TRANSFORMER 07' }) {
  const group = new THREE.Group();
  group.position.set(...position);

  // Main cabinet body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 2.2, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x3d4855, roughness: 0.4, metalness: 0.5 })
  );
  body.position.y = 1.1;
  body.castShadow = true;
  group.add(body);

  // Glass meter / panel
  const meter = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.4),
    new THREE.MeshBasicMaterial({ color: 0x0a1a24 })
  );
  meter.position.set(0, 1.5, 0.21);
  group.add(meter);

  // Status LED
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x2bff8f })
  );
  led.position.set(0.25, 1.8, 0.22);
  group.add(led);

  const box = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(position[0], position[1] + 1.1, position[2]),
    new THREE.Vector3(1.2, 2.2, 0.4)
  );

  return { group, box, led };
}
