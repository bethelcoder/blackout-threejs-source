import * as THREE from 'three';
import { buildRoom, buildProp, buildHazardStrip } from './roomBuilder.js';
import { createServerRackTexture } from '../systems/textures.js';
import { sound } from '../systems/audio.js';

/**
 * LEVEL 2 — CONTROL
 * Environment: Main Power-Grid Control Room & Server Banks
 * Signature Mechanic: Fictional interactive command-line terminal system.
 * Narrative progression: Restore water infrastructure, alerting the AI.
 */
export function buildLevel2({ scene, aiState, hud, terminalUI }) {
  const colliders = [];
  const cleanup = [];

  const { group: room, colliders: wallColliders } = buildRoom({
    width: 14, depth: 16, height: 4.2, wallColor: 0x5a6d80, floorColor: 0x485868,
  });
  scene.add(room);
  colliders.push(...wallColliders);

  // Bright server room illumination
  const hemiLight = new THREE.HemisphereLight(0xe8f4ff, 0x556677, 1.6);
  scene.add(hemiLight);
  cleanup.push(() => scene.remove(hemiLight));

  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambient);
  cleanup.push(() => scene.remove(ambient));

  // Overhead ceiling light fixtures
  const lightPanelGeo = new THREE.BoxGeometry(2.0, 0.08, 0.5);
  const lightPanelMat = new THREE.MeshBasicMaterial({ color: 0xebf8ff });

  const lightPositions = [
    [0, 4.0, 4],
    [0, 4.0, -2],
  ];

  for (const pos of lightPositions) {
    const fixture = new THREE.Mesh(lightPanelGeo, lightPanelMat);
    fixture.position.set(pos[0], pos[1], pos[2]);
    scene.add(fixture);
    cleanup.push(() => scene.remove(fixture));

    const pLight = new THREE.PointLight(0x6be0ff, 14, 20, 1.0);
    pLight.position.set(pos[0], pos[1] - 0.2, pos[2]);
    scene.add(pLight);
    cleanup.push(() => scene.remove(pLight));
  }

  // Console green ambient glow
  const consoleLight = new THREE.PointLight(0x2bff8f, 12, 16, 1.0);
  consoleLight.position.set(0, 2.4, -5.0);
  scene.add(consoleLight);
  cleanup.push(() => scene.remove(consoleLight));

  // Server rack texture & material
  const rackTex = createServerRackTexture();
  const rackMat = new THREE.MeshStandardMaterial({
    map: rackTex,
    roughness: 0.4,
    metalness: 0.6,
  });

  // Banks of server racks on left and right sides
  const rackLeds = [];
  for (let i = -2; i <= 2; i++) {
    // Left bank
    const rackL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.6, 0.7), rackMat);
    rackL.position.set(-4.8, 1.3, i * 2.2);
    rackL.castShadow = true;
    rackL.receiveShadow = true;
    scene.add(rackL);
    colliders.push(new THREE.Box3().setFromObject(rackL));
    cleanup.push(() => scene.remove(rackL));

    // Right bank
    const rackR = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.6, 0.7), rackMat);
    rackR.position.set(4.8, 1.3, i * 2.2);
    rackR.castShadow = true;
    rackR.receiveShadow = true;
    scene.add(rackR);
    colliders.push(new THREE.Box3().setFromObject(rackR));
    cleanup.push(() => scene.remove(rackR));
  }

  // Terminal console desk
  const consoleDesk = buildProp({ width: 2.0, height: 1.0, depth: 0.8, color: 0x3d4b59, position: [0, 0, -6.0] });
  scene.add(consoleDesk.mesh);
  colliders.push(consoleDesk.box);
  cleanup.push(() => scene.remove(consoleDesk.mesh));

  // Glowing green CRT terminal monitor
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.6),
    new THREE.MeshBasicMaterial({ color: 0x1aff75 })
  );
  screen.position.set(0, 1.7, -6.38);
  screen.userData.interactable = true;
  screen.userData.label = 'Use grid terminal';
  screen.userData.onInteract = () => terminalUI.show();
  scene.add(screen);
  cleanup.push(() => scene.remove(screen));

  let solved = false;
  terminalUI.onSolved = () => {
    if (solved) return;
    solved = true;
    hud.setObjective('Water infrastructure restored! AI alert triggered — proceed to the Core.');
    hud.markLevelComplete();
    aiState.raise(40);
  };

  // Hazard stripe in front of exit door
  const hazardStrip = buildHazardStrip({ width: 3.0, depth: 0.8, position: [0, 0.01, -7.0] });
  scene.add(hazardStrip);
  cleanup.push(() => scene.remove(hazardStrip));

  // Blast door forward
  const doorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 3.2, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x485868, metalness: 0.6, roughness: 0.35 })
  );
  doorMesh.position.set(0, 1.6, -7.88);
  scene.add(doorMesh);
  const doorCollider = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0, 1.6, -7.88), new THREE.Vector3(2.4, 3.2, 0.2)
  );
  colliders.push(doorCollider);
  cleanup.push(() => scene.remove(doorMesh));

  function update(delta) {
    if (solved && doorMesh.visible) {
      doorMesh.visible = false;
      doorCollider.min.set(1000, 1000, 1000);
      doorCollider.max.set(1001, 1001, 1001);
    }
    // Ambient suspicion decay while working quietly
    if (!terminalUI.open) aiState.decay(3 * delta);
  }

  return {
    colliders,
    update,
    dispose: () => {
      terminalUI.onSolved = null;
      cleanup.forEach(fn => fn());
    },
    spawn: new THREE.Vector3(0, 1.7, 6.0),
    title: 'LEVEL 2 — CONTROL',
    subtitle: 'Restore municipal power & water routing from the central terminal.',
    objective: 'Access the terminal and authenticate using technician credentials.',
  };
}
