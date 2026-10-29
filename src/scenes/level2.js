import * as THREE from 'three';
import { buildRoom, buildProp, buildHazardStrip } from './roomBuilder.js';
import { sound } from '../systems/audio.js';
import { buildLevel2Design } from './design.js';
import { buildLaserSecurity } from './laserSecurity.js';
import { buildVenatorRoom } from './venatorRoom.js';
import { buildTerminalStation } from './terminalStation.js';
import { buildOfficeChair } from './officeChair.js';
import { buildServerRacks } from './serverRacks.js';
import { buildVenatorSmallDoor } from './venatorSmallDoor.js';
import { createRoutingHologram } from '../shaders/routingHologram.js';
import { createRackDataStream } from '../shaders/rackDataStream.js';

/**
 * LEVEL 2 — CONTROL
 * Environment: Main Power-Grid Control Room & Server Banks
 * Signature Mechanic: Fictional interactive command-line terminal system.
 * Narrative progression: Restore water infrastructure, alerting the AI.
 */
export function buildLevel2({ scene, aiState, hud, terminalUI, onShock, onSecurityHit, onChairSit, isPlayerSeated }) {
  const colliders = [];
  const cleanup = [];

  const { group: room, colliders: wallColliders } = buildRoom({
    width: 14, depth: 16, height: 4.2, wallColor: 0x5a6d80, floorColor: 0x485868,
    includeLeftCabinets: false,
    includeRightCabinets: false,
    includePlinths: false,
    includeRightPlinth: false,
    officeFloor: true,
    officeCeiling: true,
    backDoorOpening: { width: 1.86, height: 2.78 },
  });
  scene.add(room);
  const originalRoomSurfaces = room.children.filter(object => ['Room wall', 'Room ceiling'].includes(object.name));
  const originalLightFixtures = [];
  const venatorRoom = buildVenatorRoom({ scene, onReady: () => {
    [...originalRoomSurfaces, ...originalLightFixtures].forEach(object => { object.visible = false; });
  } });
  cleanup.push(() => venatorRoom.dispose());
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

  const design = buildLevel2Design({ scene, hud, includeRightFurniture: false, includeCeiling: false });
  colliders.push(...design.colliders);
  cleanup.push(() => design.dispose());

  const ceilingLights = [];
  const rackOccluders = [];
  const laserSecurity = buildLaserSecurity({ scene, aiState, hud, sound, rackOccluders, externalOccluders: design.colliders, includeLeftBank: false, onHit: onSecurityHit ?? onShock, onDisabled: () => {
    venatorRoom.setLaserActive(false);
    ceilingLights.forEach(light => light.color.setHex(0xffffff));
    lightPanelMat.color.setHex(0xebf8ff);
  } });
  cleanup.push(() => laserSecurity.dispose());

  // Bright server room illumination
  const hemiLight = new THREE.HemisphereLight(0xe8f4ff, 0x556677, 1.6);
  scene.add(hemiLight);
  cleanup.push(() => scene.remove(hemiLight));

  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambient);
  cleanup.push(() => scene.remove(ambient));

  // Overhead ceiling light fixtures
  const lightPanelGeo = new THREE.BoxGeometry(2.0, 0.08, 0.5);
  const lightPanelMat = new THREE.MeshBasicMaterial({ color: 0x33ff66 });

  const lightPositions = [
    [0, 4.0, 4],
    [0, 4.0, -2],
  ];

  for (const pos of lightPositions) {
    const fixture = new THREE.Mesh(lightPanelGeo, lightPanelMat);
    fixture.position.set(pos[0], pos[1], pos[2]);
    scene.add(fixture);
    originalLightFixtures.push(fixture);
    cleanup.push(() => scene.remove(fixture));

    const pLight = new THREE.PointLight(0x33ff66, 14, 20, 1.0);
    ceilingLights.push(pLight);
    pLight.position.set(pos[0], pos[1] - 0.2, pos[2]);
    scene.add(pLight);
    cleanup.push(() => scene.remove(pLight));
  }

  // Console green ambient glow
  const consoleLight = new THREE.PointLight(0x2bff8f, 12, 16, 1.0);
  consoleLight.position.set(0, 2.4, -5.0);
  scene.add(consoleLight);
  cleanup.push(() => scene.remove(consoleLight));

  const serverRacks = buildServerRacks({ scene, colliders, rackOccluders, onReady: () => laserSecurity.refreshOccluders() });
  cleanup.push(() => serverRacks.dispose());

  // Terminal console desk
  const consoleDesk = buildProp({
    geometry: new THREE.BoxGeometry(2.0, 1.0, 0.8),
    material: new THREE.MeshStandardMaterial({ color: 0x3d4b59 }),
    position: [0, 0.5, -6.0],
  });
  scene.add(consoleDesk);
  const originalDeskCollider = new THREE.Box3().setFromObject(consoleDesk);
  colliders.push(originalDeskCollider);
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
  const terminalStation = buildTerminalStation({
    scene, colliders,
    onInteract: screen.userData.onInteract,
    getLabel: screen.userData.getLabel,
    onReady: () => {
      consoleDesk.visible = false;
      screen.visible = false;
      screen.userData.interactable = false;
      originalDeskCollider.makeEmpty();
    },
  });
  cleanup.push(() => terminalStation.dispose());
  const officeChair = buildOfficeChair({ scene, colliders, hud, onSit: onChairSit, isSeated: isPlayerSeated });
  cleanup.push(() => officeChair.dispose());

  // Floor routing schematic on the open deck beside the walkway.
  const routingHologram = createRoutingHologram({
    position: new THREE.Vector3(-3.4, 0.015, 0.6),
    radius: 1.6,
    color: 0x4fe3ff,
    intensity: 1,
  });
  scene.add(routingHologram.group);
  cleanup.push(() => routingHologram.dispose());

  // Data-traffic monitor on the face of the near server rack.
  const rackStream = createRackDataStream({
    position: new THREE.Vector3(5.33, 1.62, -1.4),
    rotationY: -Math.PI / 2,
    width: 0.82,
    height: 1.5,
    intensity: 1,
  });
  scene.add(rackStream.group);
  cleanup.push(() => rackStream.dispose());

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
  const smallDoor = buildVenatorSmallDoor({ scene, colliders, onReady: () => { doorMesh.visible = false; } });
  cleanup.push(() => smallDoor.dispose());

  function update(delta, camera) {
    laserSecurity.update(delta, camera);
    routingHologram.update(delta);
    rackStream.update(delta);
    smallDoor.update(delta, solved);
    design.update(delta, camera);
    if (solved) {
      doorMesh.visible = false;
      doorCollider.makeEmpty();
    }
    if (!terminalUI.open) aiState.decay(3 * delta);
  }

  return {
    ready: Promise.all([venatorRoom.ready, serverRacks.ready, terminalStation.ready, officeChair.ready, smallDoor.ready]),
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