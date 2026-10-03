import * as THREE from 'three';
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

  // 4. MAINTENANCE LOCKER (Hollow version)
  const lockerGroup = new THREE.Group();
  lockerGroup.position.set(...lockerPosition);

  const lockerMat = new THREE.MeshStandardMaterial({ color: 0x4a5560, metalness: 0.7, roughness: 0.4 });

  // Back Wall (Facing the wall of the room)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.6, 0.7), lockerMat);
  backWall.position.set(-0.33, 1.3, 0);
  lockerGroup.add(backWall);

  // Left & Right Walls
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.66, 2.6, 0.04), lockerMat);
  leftWall.position.set(0, 1.3, -0.33);
  lockerGroup.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.66, 2.6, 0.04), lockerMat);
  rightWall.position.set(0, 1.3, 0.33);
  lockerGroup.add(rightWall);

  // Top & Bottom Walls
  const topWall = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.04, 0.62), lockerMat);
  topWall.position.set(0, 2.58, 0);
  lockerGroup.add(topWall);

  const bottomWall = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.04, 0.62), lockerMat);
  bottomWall.position.set(0, 0.02, 0);
  lockerGroup.add(bottomWall);

  const lockerBox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(lockerPosition[0], lockerPosition[1] + 1.3, lockerPosition[2]),
    new THREE.Vector3(0.7, 2.6, 0.7)
  );
  colliders.push(lockerBox);

  // Hinge and Door
  const hinge = new THREE.Group();
  hinge.position.set(0.35, 1.3, 0.35); 
  lockerGroup.add(hinge);

  const lockerDoor = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.5, 0.68), new THREE.MeshStandardMaterial({ color: 0x5a6570, metalness: 0.8, roughness: 0.3 }));
  lockerDoor.position.set(0, 0, -0.34); 
  hinge.add(lockerDoor);

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.04), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 }));
  handle.position.set(0.04, 0, -0.25);
  lockerDoor.add(handle);

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

  const shelf1 = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.04, 0.62), shelfMat);
  shelf1.position.set(0, 0.85, 0);
  lockerGroup.add(shelf1);

  const shelf2 = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.04, 0.62), shelfMat);
  shelf2.position.set(0, 1.65, 0);
  lockerGroup.add(shelf2);

  // Technician Book
  const bookCoverMat = new THREE.MeshStandardMaterial({
    color: 0x1166aa,
    roughness: 0.4,
    metalness: 0.1
  });

  const techBook = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.38), bookCoverMat);
  techBook.position.set(0.1, 1.70, 0); 
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