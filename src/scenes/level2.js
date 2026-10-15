import * as THREE from 'three';
import { buildRoom, buildProp, buildHazardStrip } from './roomBuilder.js';
import { sound } from '../systems/audio.js';
import { buildLaserSecurity } from './laserSecurity.js';
import { buildLevel2Design } from './design.js';

export function buildLevel2({ scene, aiState, hud, terminalUI, onShock }) {
  const colliders = [];
  const cleanup = [];

  const { group: room, colliders: wallColliders } = buildRoom({
    width: 14, depth: 16, height: 4.2, wallColor: 0x5a6d80, floorColor: 0x485868,
    includeLeftCabinets: false,
    includeRightCabinets: false,
    includePlinths: false,
    officeFloor: true,
  });
  scene.add(room);

  // Alternate-route arrival beside the right-hand server bank.
  const serviceGrilleGeometry = new THREE.BoxGeometry(0.06, 1.1, 1.3);
  const serviceGrilleMaterial = new THREE.MeshStandardMaterial({ color: 0x283235, roughness: 0.85 });
  const serviceGrille = new THREE.Mesh(serviceGrilleGeometry, serviceGrilleMaterial);
  serviceGrille.name = 'Maintenance duct exit';
  serviceGrille.position.set(6.85, 0.7, 5.8);
  scene.add(serviceGrille);
  cleanup.push(() => {
    scene.remove(serviceGrille);
    serviceGrilleGeometry.dispose();
    serviceGrilleMaterial.dispose();
  });
  colliders.push(...wallColliders);

  // Build the new industrial dressing
  const design = buildLevel2Design({ scene, hud });
  cleanup.push(() => design.dispose());
  colliders.push(...design.colliders);

  // Pass the design colliders to laser security so beams clip against lockers
  const laserSecurity = buildLaserSecurity({ 
    scene, aiState, hud, sound, onHit: onShock,
    externalOccluders: design.colliders 
  });
  cleanup.push(() => laserSecurity.dispose());

  // Console green ambient glow
  const consoleLight = new THREE.PointLight(0x2bff8f, 12, 16, 1.0);
  consoleLight.position.set(0, 2.4, -5.0);
  scene.add(consoleLight);
  cleanup.push(() => scene.remove(consoleLight));

  // Terminal console desk
  const consoleDesk = buildProp({
    geometry: new THREE.BoxGeometry(2.0, 1.0, 0.8),
    material: new THREE.MeshStandardMaterial({ color: 0x3d4b59 }),
    position: [0, 0.5, -6.0],
  });
  scene.add(consoleDesk);
  colliders.push(new THREE.Box3().setFromObject(consoleDesk));
  cleanup.push(() => scene.remove(consoleDesk));

  // Glowing green CRT terminal monitor
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.6),
    new THREE.MeshBasicMaterial({ color: 0x1aff75 })
  );
  screen.position.set(0, 1.7, -6.38);
  screen.userData.interactable = true;
  screen.userData.label = 'Use grid terminal';
  screen.userData.getLabel = () => laserSecurity.isActive() ? 'Terminal locked - disable laser security' : 'Use grid terminal';
  screen.userData.onInteract = () => {
    if (laserSecurity.isActive()) {
      hud.setObjective('AI security interlock active. Press the laser shutdown button midway along the right wall.');
      return;
    }
    terminalUI.show();
  };
  scene.add(screen);
  cleanup.push(() => scene.remove(screen));

  let solved = false;
  terminalUI.onSolved = () => {
    if (solved || laserSecurity.isActive()) return;
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

  function update(delta, camera) {
    laserSecurity.update(delta, camera);
    design.update(delta, camera);
    if (solved && doorMesh.visible) {
      doorMesh.visible = false;
      doorCollider.min.set(1000, 1000, 1000);
      doorCollider.max.set(1001, 1001, 1001);
    }
    if (!terminalUI.open) aiState.decay(3 * delta);
  }

  return {
    colliders,
    serviceSpawn: new THREE.Vector3(5.95, 1.7, 5.8),
    update,
    dispose: () => {
      terminalUI.onSolved = null;
      cleanup.forEach(fn => fn());
    },
    spawn: new THREE.Vector3(0, 1.7, 6.0),
    title: 'LEVEL 2 — CONTROL',
    subtitle: 'Restore municipal power & water routing from the central terminal.',
    objective: 'Jump low lasers (Space), duck high lasers (hold C or Ctrl). Reach the shutdown button midway along the right wall (E).',
  };
}