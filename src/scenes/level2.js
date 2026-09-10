import * as THREE from 'three';
import { buildRoom, buildProp } from './roomBuilder.js';
import { Terminal } from '../systems/terminal.js';

// Level 2 purpose: this level's own thing is the fictional command-line
// terminal mechanic and a story/progression beat (restoring the water system).
export function buildLevel2({ scene, aiState, hud, terminalUI }) {
  const colliders = [];
  const cleanup = [];

  const { group: room, colliders: wallColliders } = buildRoom({
    width: 12, depth: 14, height: 4.2, wallColor: 0x18202a,
  });
  scene.add(room);
  colliders.push(...wallColliders);

  // Bright, clean server room lighting
  const hemiLight = new THREE.HemisphereLight(0xe8f4ff, 0x6a7b8c, 1.6);
  scene.add(hemiLight);
  cleanup.push(() => scene.remove(hemiLight));

  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambient);
  cleanup.push(() => scene.remove(ambient));

  // Overhead ceiling light
  const ceilingLight = new THREE.PointLight(0x7fe3ff, 14, 22, 1.0);
  ceilingLight.position.set(0, 3.8, 0);
  scene.add(ceilingLight);
  cleanup.push(() => scene.remove(ceilingLight));

  // Terminal console green glow
  const consoleLight = new THREE.PointLight(0x2bff8f, 10, 16, 1.0);
  consoleLight.position.set(0, 2.4, -4.5);
  scene.add(consoleLight);
  cleanup.push(() => scene.remove(consoleLight));

  // Bank of server racks as clutter/cover
  for (let i = -2; i <= 2; i++) {
    const rack = buildProp({ width: 0.8, height: 2.2, depth: 0.6, color: 0x20262c, position: [i * 1.6, 0, 5] });
    scene.add(rack.mesh);
    colliders.push(rack.box);
    cleanup.push(() => scene.remove(rack.mesh));
  }

  // Terminal console prop
  const consoleDesk = buildProp({ width: 1.4, height: 1.0, depth: 0.6, color: 0x2a3038, position: [0, 0, -5.5] });
  scene.add(consoleDesk.mesh);
  colliders.push(consoleDesk.box);
  cleanup.push(() => scene.remove(consoleDesk.mesh));

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.5),
    new THREE.MeshBasicMaterial({ color: 0x0a2a15 })
  );
  screen.position.set(0, 1.7, -5.75);
  screen.userData.interactable = true;
  screen.userData.label = 'Use terminal';
  screen.userData.onInteract = () => terminalUI.show();
  scene.add(screen);
  cleanup.push(() => scene.remove(screen));

  let solved = false;
  terminalUI.onSolved = () => {
    if (solved) return;
    solved = true;
    hud.setObjective('Water infrastructure restored. AI is now aware — proceed to the core.');
    hud.markLevelComplete();
    aiState.raise(35);
  };

  // Door forward blocked until terminal solved
  const doorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2, 3, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x3a4652 })
  );
  doorMesh.position.set(0, 1.5, -6.9);
  scene.add(doorMesh);
  const doorCollider = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0, 1.5, -6.9), new THREE.Vector3(2, 3, 0.2)
  );
  colliders.push(doorCollider);
  cleanup.push(() => scene.remove(doorMesh));

  function update(delta) {
    if (solved && doorMesh.visible) {
      doorMesh.visible = false;
      doorCollider.min.set(1000, 1000, 1000);
      doorCollider.max.set(1001, 1001, 1001);
    }
    // Ambient suspicion decay while working the terminal quietly
    if (!terminalUI.open) aiState.decay(4 * delta);
  }

  return {
    colliders,
    update,
    dispose: () => { terminalUI.onSolved = null; cleanup.forEach(fn => fn()); },
    spawn: new THREE.Vector3(0, 1.7, 6),
    title: 'LEVEL 2 — CONTROL',
    subtitle: 'Restore the water infrastructure from the grid terminal.',
    objective: 'Reach the terminal and authenticate.',
  };
}
