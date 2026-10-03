import * as THREE from 'three';
import { CLOCK_CLUE } from '../scenes/noticeBoard.js';
import { buildKeypad } from '../scenes/roomBuilder.js'; // Make sure this path matches your project!

/**
 * Substation Industrial Clock Puzzle System
 */
export function createClockPuzzle({ 
  scene, 
  colliders, 
  cleanup, 
  hud, 
  sound,
  clockPosition = [-6.92, 2.2, 0],
  lockerPosition = [-6.6, 0, 1.8]
}) {
  let puzzleSolved = false;
  let keyDropping = false;
  let hasLockerKey = false;
  let lockerOpened = false;

  // 1. ENLARGED INDUSTRIAL CLOCK CONSOLE
  const clockGroup = new THREE.Group();
  clockGroup.position.set(...clockPosition);
  clockGroup.rotation.y = Math.PI / 2;
  clockGroup.userData.interactable = true;
  clockGroup.userData.label = CLOCK_CLUE;
  clockGroup.userData.onInteract = () => hud.setObjective(`CLOCK CALIBRATION: ${CLOCK_CLUE}`);

  const outerFrame = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 1.5, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x1a222a, metalness: 0.8, roughness: 0.3 })
  );
  clockGroup.add(outerFrame);

  const innerBezel = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 1.15, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x0c1117, metalness: 0.9, roughness: 0.2 })
  );
  innerBezel.position.z = 0.05;
  clockGroup.add(innerBezel);

  const dialFace = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 32),
    new THREE.MeshStandardMaterial({
      color: 0x06111d, emissive: 0x021626, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.8,
    })
  );
  dialFace.position.z = 0.078;
  clockGroup.add(dialFace);

  const ringGeo = new THREE.RingGeometry(0.48, 0.51, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e1ff, side: THREE.DoubleSide });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.position.z = 0.081;
  clockGroup.add(ringMesh);

  // Decorative hands (Static now, since we use the keypad)
  const hourHandMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff9900, emissiveIntensity: 1.5 });
  const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.28, 0.015), hourHandMat);
  hourHand.position.set(0, 0.1, 0.088);
  
  const minHandMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x00e1ff, emissiveIntensity: 1.5 });
  const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.42, 0.015), minHandMat);
  minHand.position.set(0.15, 0, 0.095);
  minHand.rotation.z = -Math.PI / 4;

  const hubCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16),
    new THREE.MeshStandardMaterial({ color: 0x2d3b48, metalness: 0.9 })
  );
  hubCap.rotation.x = Math.PI / 2;
  hubCap.position.z = 0.102;

  clockGroup.add(hourHand, minHand, hubCap);

  // CONTROL PANEL WITH OUR NEW KEYPAD
  const panelConsole = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.22, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x252d36, metalness: 0.7, roughness: 0.4 })
  );
  panelConsole.position.set(0, -0.92, 0.06);
  clockGroup.add(panelConsole);

  // 2. INDICATOR LIGHTS (3D World lights)
  const indicatorLights = [];
  const lightOffsetsZ = [-0.45, 0, 0.45];
  lightOffsetsZ.forEach((zOffset) => {
    const lightMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xff1111, emissive: 0xff0000, emissiveIntensity: 1.5 })
    );
    lightMesh.position.set(clockPosition[0] + 0.06, clockPosition[1] + 0.9, clockPosition[2] + zOffset);
    scene.add(lightMesh);
    indicatorLights.push(lightMesh);
    cleanup.push(() => scene.remove(lightMesh));
  });

  // Attach the interactive keypad to the panel
  const clockKeypad = buildKeypad({
    position: [0, -0.92, 0.11],
    targetCodes: ["0215", "1040", "0600"],
    onSuccess: () => {
      puzzleSolved = true;
      // Turn world lights green
      indicatorLights.forEach(light => {
        light.material.color.setHex(0x00ff44);
        light.material.emissive.setHex(0x00ff44);
      });
      
      keyGroup.visible = true;
      keyDropping = true;
      if (sound.playAccessGranted) sound.playAccessGranted();
      hud.setObjective('All sectors calibrated! Maintenance key released onto the floor.');
    }
  });
  clockGroup.add(clockKeypad.mesh);

  scene.add(clockGroup);
  cleanup.push(() => scene.remove(clockGroup));

  // 3. KEY PROP
  const keyGroup = new THREE.Group();
  keyGroup.position.set(clockPosition[0] + 0.32, clockPosition[1] - 0.5, clockPosition[2]);
  keyGroup.visible = false;

  const keyRing = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 8, 16), new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.9, roughness: 0.2 }));
  const keyStem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.9, roughness: 0.2 }));
  keyStem.position.y = -0.07;
  const keyBit = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.03, 0.03), new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.9, roughness: 0.2 }));
  keyBit.position.set(0.015, -0.11, 0);

  keyGroup.add(keyRing, keyStem, keyBit);
  scene.add(keyGroup);
  cleanup.push(() => scene.remove(keyGroup));

  // Compact steel cabinet on legs, with a hollow interior for the logbook.
  const lockerGroup = new THREE.Group();
  lockerGroup.name = 'Logbook cabinet';
  lockerGroup.position.set(...lockerPosition);
  const lockerMat = new THREE.MeshStandardMaterial({ color: 0x293540, metalness: 0.65, roughness: 0.65 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x18232c, metalness: 0.7, roughness: 0.55 });
  const lockMat = new THREE.MeshStandardMaterial({ color: 0xa9adb0, metalness: 0.9, roughness: 0.3 });
  function cabinetBox(parent, name, x, y, z, width, height, depth, material = lockerMat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  cabinetBox(lockerGroup, 'Cabinet back', -0.33, 1.05, 0, 0.04, 1.4, 0.9);
  for (const z of [-0.43, 0.43]) {
    cabinetBox(lockerGroup, 'Cabinet side', 0, 1.05, z, 0.66, 1.4, 0.04);
  }
  cabinetBox(lockerGroup, 'Overhanging cabinet top', 0.015, 1.77, 0, 0.75, 0.06, 0.96, trimMat);
  cabinetBox(lockerGroup, 'Cabinet base', 0, 0.37, 0, 0.7, 0.06, 0.9, trimMat);
  for (const x of [-0.27, 0.27]) for (const z of [-0.37, 0.37]) {
    cabinetBox(lockerGroup, 'Square cabinet leg', x, 0.175, z, 0.055, 0.35, 0.055, trimMat);
  }
  const lockerBox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(lockerPosition[0] + 0.015, lockerPosition[1] + 0.9, lockerPosition[2]),
    new THREE.Vector3(0.75, 1.8, 0.96)
  );
  colliders.push(lockerBox);

  const hinge = new THREE.Group();
  hinge.position.set(0.35, 1.05, 0.43);
  lockerGroup.add(hinge);
  const lockerDoor = cabinetBox(hinge, 'Inset cabinet door', 0, 0, -0.43, 0.04, 1.32, 0.82);
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.035, 0.3, -0.72),
    new THREE.Vector3(0.08, 0.26, -0.72),
    new THREE.Vector3(0.08, -0.02, -0.72),
    new THREE.Vector3(0.035, -0.06, -0.72),
  ]);
  const handle = new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 16, 0.014, 6, false), trimMat);
  hinge.add(handle);
  const keyhole = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.012, 16), lockMat);
  keyhole.rotation.z = Math.PI / 2;
  keyhole.position.set(0.03, -0.18, -0.72);
  hinge.add(keyhole);
  cabinetBox(hinge, 'Key slot', 0.038, -0.18, -0.72, 0.003, 0.004, 0.025, trimMat);
  for (const y of [-0.36, -0.44, -0.52]) {
    cabinetBox(hinge, 'Lower door ventilation slot', 0.024, y, -0.43, 0.008, 0.025, 0.48, trimMat);
    cabinetBox(hinge, 'Vent louver lip', 0.033, y - 0.017, -0.43, 0.014, 0.012, 0.48);
  }

  hinge.userData.interactable = true;
  hinge.userData.label = 'Locked Maintenance Locker';
  hinge.userData.onInteract = () => {
    if (lockerOpened) return;
    if (!hasLockerKey) {
      if (sound.playDetectionWarning) sound.playDetectionWarning(0.2);
      hud.setObjective('Locker locked. Time will reveal the key.');
      return;
    }
    if (sound.playAccessGranted) sound.playAccessGranted();
    lockerOpened = true;
    hinge.rotation.y = -Math.PI/2;
    hinge.userData.interactable = false;
    hud.setObjective('Locker unlocked! Pick up the Technician Book inside.');
  };

  // Shelves
  const shelfMat = new THREE.MeshStandardMaterial({
    color: 0x68737c,
    metalness: 0.7,
    roughness: 0.45
  });

  const shelf1 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.82), shelfMat);
  shelf1.position.set(0, 0.78, 0);
  lockerGroup.add(shelf1);

  const shelf2 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.82), shelfMat);
  shelf2.position.set(0, 1.22, 0);
  lockerGroup.add(shelf2);

  // Technician Book
  const bookCoverMat = new THREE.MeshStandardMaterial({
    color: 0x1166aa,
    roughness: 0.4,
    metalness: 0.1
  });

  const techBook = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.38), bookCoverMat);
  techBook.position.set(0.1, 1.27, 0);
  lockerGroup.add(techBook);

  techBook.userData.interactable = true;
  techBook.userData.label = 'Read Technician Book';
  techBook.userData.onInteract = () => {
    if (sound.playInteract) sound.playInteract();
    hud.setObjective('Technician Book: "Override Code 0451 confirmed." Head to the blast door!');
  };

  scene.add(lockerGroup);
  cleanup.push(() => scene.remove(lockerGroup));

  // UPDATE LOOP
  function update(delta) {
    if (keyDropping) {
      keyGroup.position.y -= 5.0 * delta;
      keyGroup.rotation.y += 6.0 * delta;
      
      // Changed to 1.0 so it hits the stand, not the absolute floor
      if (keyGroup.position.y <= 0.35) {
        keyGroup.position.y = 0.35; 
        keyGroup.rotation.set(Math.PI / 2, 0, Math.PI / 4);
        keyDropping = false;

        keyGroup.userData.interactable = true;
        keyGroup.userData.label = 'Pick up Maintenance Key';
        keyGroup.userData.onInteract = () => {
          if (sound.playInteract) sound.playInteract();
          hasLockerKey = true;
          scene.remove(keyGroup);
          hud.setObjective('Maintenance Key acquired! Unlock the locker.');
        };
      }
    }
  }

  return { update };
}
