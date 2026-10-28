import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ---------------------------------------------------------------------------
// TEXTURE HELPERS
// ---------------------------------------------------------------------------
function getSharedTextures() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Simple Grate Texture
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 4;
  for (let i = 0; i < 256; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
  }
  const grateTex = new THREE.CanvasTexture(canvas);
  grateTex.wrapS = THREE.RepeatWrapping;
  grateTex.wrapT = THREE.RepeatWrapping;

  // Simple Wall Texture
  ctx.fillStyle = '#444';
  ctx.fillRect(0, 0, 256, 256);
  const wallTex = new THREE.CanvasTexture(canvas);
  wallTex.wrapS = THREE.RepeatWrapping;
  wallTex.wrapT = THREE.RepeatWrapping;

  return { wall: { map: wallTex, bumpMap: wallTex }, grate: grateTex };
}

// Painted plaster and terrazzo tiles for the worn office finish.
function createOfficeTextures(height) {
  let seed = 731;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const makeCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    return canvas;
  };
  const floorCanvas = makeCanvas();
  const floor = floorCanvas.getContext('2d');
  floor.fillStyle = '#aaa99a';
  floor.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 22000; i++) {
    floor.fillStyle = ['#737b70', '#c4c1aa', '#8f7564', '#555e55', '#d2ceba'][Math.floor(random() * 5)];
    floor.globalAlpha = 0.25 + random() * 0.4;
    floor.fillRect(random() * 512, random() * 512, 1 + random() * 3, 1 + random() * 2);
  }
  floor.globalAlpha = 1;
  for (let i = 0; i < 512; i += 128) {
    floor.fillStyle = '#626458';
    floor.fillRect(i, 0, 2, 512);
    floor.fillRect(0, i, 512, 2);
    floor.fillStyle = 'rgba(224,220,196,0.3)';
    floor.fillRect(i + 2, 0, 1, 512);
    floor.fillRect(0, i + 2, 512, 1);
  }
  const wallCanvas = makeCanvas();
  const wall = wallCanvas.getContext('2d');
  wall.fillStyle = '#a4a697';
  wall.fillRect(0, 0, 512, 512);
  const stripeTop = (1 - 1.65 / height) * 512;
  wall.fillStyle = '#7b857b';
  wall.fillRect(0, stripeTop, 512, 512 - stripeTop);
  wall.fillStyle = '#713327';
  wall.fillRect(0, stripeTop, 512, 0.18 / height * 512);
  for (let i = 0; i < 18000; i++) {
    wall.fillStyle = random() > 0.5 ? 'rgba(45,48,35,0.07)' : 'rgba(235,232,210,0.06)';
    wall.fillRect(random() * 512, random() * 512, 1 + random() * 2, 1 + random() * 5);
  }
  for (let i = 0; i < 65; i++) {
    const x = random() * 512;
    const y = random() * 512;
    const stain = wall.createRadialGradient(x, y, 0, x, y, 20 + random() * 60);
    stain.addColorStop(0, 'rgba(42,45,29,0.09)');
    stain.addColorStop(1, 'rgba(42,45,29,0)');
    wall.fillStyle = stain;
    wall.fillRect(0, 0, 512, 512);
  }
  const floorMap = new THREE.CanvasTexture(floorCanvas);
  const wallMap = new THREE.CanvasTexture(wallCanvas);
  for (const map of [floorMap, wallMap]) {
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 4;
  }
  return { floorMap, wallMap };
}

// ---------------------------------------------------------------------------
// MAIN ROOM BUILDER
// ---------------------------------------------------------------------------
export function buildRoom({ width = 14, depth = 20, height = 4.2, wallColor = 0x505c68, includeLeftCabinets = true, includeRightCabinets = true, includePlinths = true, includeRightPlinth = true, officeCeiling = false, officeFinishes = false, officeFloor = officeFinishes, leftCabinetMaxZ = Infinity, backDoorOpening = null }) {
  const group = new THREE.Group();
  const colliders = [];
  const { wall: wTex, grate: gTex } = getSharedTextures();

  const officeTextures = officeFinishes || officeFloor ? createOfficeTextures(height) : null;

  // 1. FLOOR & CATWALK GRATING
  gTex.repeat.set(width * 0.8, depth * 0.8);
  if (officeFloor) officeTextures.floorMap.repeat.set(width / 3.2, depth / 3.2);
  const floorMat = new THREE.MeshStandardMaterial({
    map: officeFloor ? officeTextures.floorMap : gTex,
    roughness: officeFloor ? 0.92 : 0.3,
    metalness: officeFloor ? 0 : 0.85,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Side Concrete Plinths
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x2e3740, roughness: 0.7, metalness: 0.2 });
  const leftPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, depth), plinthMat);
  leftPlinth.position.set(-width / 2 + 0.8, 0.175, 0);
  if (includePlinths) group.add(leftPlinth);
  if (includePlinths && includeRightPlinth) {
    const rightPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, depth), plinthMat);
    rightPlinth.position.set(width / 2 - 0.8, 0.175, 0);
    group.add(rightPlinth);
  }

  // 2. WALLS & CEILING
  const wallMat = new THREE.MeshStandardMaterial({
    color: officeFinishes ? 0xffffff : wallColor,
    map: officeFinishes ? officeTextures.wallMap : wTex.map,
    bumpMap: officeFinishes ? null : wTex.bumpMap,
    bumpScale: 0.04, roughness: officeFinishes ? 0.96 : 0.5, metalness: officeFinishes ? 0 : 0.2,
  });
  const ceilMat = new THREE.MeshStandardMaterial({ color: officeCeiling ? 0x777b7c : 0x1a2128, roughness: 0.6, metalness: 0.4 });

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), ceilMat);
  ceiling.name = 'Room ceiling';
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = height;
  group.add(ceiling);

  const wallDefs = [
    { pos: [0, height / 2, -depth / 2], rot: [0, 0, 0], size: [width, height] },
    { pos: [0, height / 2, depth / 2], rot: [0, Math.PI, 0], size: [width, height] },
    { pos: [-width / 2, height / 2, 0], rot: [0, Math.PI / 2, 0], size: [depth, height] },
    { pos: [width / 2, height / 2, 0], rot: [0, -Math.PI / 2, 0], size: [depth, height] },
  ];

  // Leave a genuine doorway behind the exit doors, including in wall collision.
  if (backDoorOpening) {
    const openingWidth = backDoorOpening.width;
    const openingHeight = backDoorOpening.height;
    const sideWidth = (width - openingWidth) / 2;
    wallDefs.splice(0, 1,
      { pos: [-(openingWidth + sideWidth) / 2, height / 2, -depth / 2], rot: [0, 0, 0], size: [sideWidth, height] },
      { pos: [(openingWidth + sideWidth) / 2, height / 2, -depth / 2], rot: [0, 0, 0], size: [sideWidth, height] },
      { pos: [0, (height + openingHeight) / 2, -depth / 2], rot: [0, 0, 0], size: [openingWidth, height - openingHeight] },
    );
  }

  const wallThickness = 0.2;
  for (const w of wallDefs) {
    let material = wallMat;
    if (officeFinishes) {
      material = wallMat.clone();
      material.map = officeTextures.wallMap.clone();
      material.map.repeat.set(w.size[0] / 3.2, w.size[1] / height);
      material.map.offset.y = (w.pos[1] - w.size[1] / 2) / height;
      material.map.needsUpdate = true;
    }
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w.size[0], w.size[1]), material);
    mesh.name = 'Room wall';
    mesh.position.set(...w.pos);
    mesh.rotation.set(...w.rot);
    mesh.receiveShadow = true;
    group.add(mesh);

    const isZWall = w.rot[1] === 0 || Math.abs(w.rot[1]) === Math.PI;
    const box = new THREE.Box3();
    if (isZWall) {
      box.setFromCenterAndSize(new THREE.Vector3(...w.pos), new THREE.Vector3(w.size[0], w.size[1], wallThickness));
    } else {
      box.setFromCenterAndSize(new THREE.Vector3(...w.pos), new THREE.Vector3(wallThickness, w.size[1], w.size[0]));
    }
    colliders.push(box);
  }

  // 3. OVERHEAD RED I-BEAMS & PIPE STRUCTURE
  const redBeamMat = new THREE.MeshStandardMaterial({ color: 0x8b1a1a, metalness: 0.7, roughness: 0.3 });
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x3d4853, metalness: 0.8, roughness: 0.2 });

  for (let z = -depth / 2 + 2; !officeCeiling && z <= depth / 2 - 2; z += 2.8) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(width - 0.4, 0.18, 0.18), redBeamMat);
    beam.position.set(0, height - 0.2, z);
    group.add(beam);
    for (const x of [-width / 2 + 1.2, width / 2 - 1.2]) {
      const dropRod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8), redBeamMat);
      dropRod.position.set(x, height - 0.6, z);
      group.add(dropRod);
    }
  }

  for (const x of (officeCeiling ? [] : [-width / 2 + 1.4, -width / 2 + 1.8, width / 2 - 1.8, width / 2 - 1.4])) {
    const longPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, depth, 12), pipeMat);
    longPipe.rotation.x = Math.PI / 2;
    longPipe.position.set(x, height - 0.45, 0);
    group.add(longPipe);
  }

  // 4. SWITCHGEAR RACKS (optional)
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x3b4752, metalness: 0.75, roughness: 0.3 });
  const panelDetailMat = new THREE.MeshStandardMaterial({ color: 0x1f262d, metalness: 0.8, roughness: 0.2 });
  const breakerMat = new THREE.MeshStandardMaterial({ color: 0xd2d7dc, metalness: 0.9, roughness: 0.1 });

  for (let z = -depth / 2 + 1.8; z <= depth / 2 - 1.8; z += 1.3) {
    [-width / 2 + 0.8, width / 2 - 0.8].forEach((xPos, sideIdx) => {
      if (sideIdx === 0 && !includeLeftCabinets) return;
      if (sideIdx === 1 && !includeRightCabinets) return;
      if (sideIdx === 0 && z > leftCabinetMaxZ) return;
      if (sideIdx === 0 && z > -1.2 && z < 2.5) return;
      if (sideIdx === 1 && z > 6.0 && z < 8.5) return;

      const rackGroup = new THREE.Group();
      rackGroup.position.set(xPos, 0.35, z);

      const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.2, 1.1), rackMat);
      body.position.y = 1.6;
      body.castShadow = true;
      rackGroup.add(body);

      const insetPanel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.6, 0.85), panelDetailMat);
      insetPanel.position.set(sideIdx === 0 ? 0.54 : -0.54, 1.6, 0);
      rackGroup.add(insetPanel);

      for (let h = 0.8; h <= 2.4; h += 0.5) {
        const breaker = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.25), breakerMat);
        breaker.position.set(sideIdx === 0 ? 0.57 : -0.57, h, 0);
        rackGroup.add(breaker);
      }

      group.add(rackGroup);
      const rackBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(xPos, 1.95, z),
        new THREE.Vector3(1.1, 3.2, 1.1)
      );
      colliders.push(rackBox);
    });
  }

  return { group, colliders, floor };
}

// ---------------------------------------------------------------------------
// PROP BUILDERS
// ---------------------------------------------------------------------------

export function buildHazardStrip({ width = 4.0, depth = 0.8, position = [0, 0.01, 0] }) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#111';
  for (let i = -128; i < 512; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 64, 0); ctx.lineTo(i + 128, 128); ctx.lineTo(i + 64, 128); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(width / 2, 1);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(...position);
  return mesh;
}

function createScheduleCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#eeeeee';
  ctx.fillRect(0, 0, 512, 1024);

  ctx.fillStyle = '#222222';
  ctx.font = 'bold 42px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FACILITY MAINTENANCE', 256, 70);
  ctx.fillText('SHIFT SCHEDULE', 256, 120);

  ctx.beginPath(); ctx.moveTo(30, 150); ctx.lineTo(482, 150);
  ctx.strokeStyle = '#aa0000'; ctx.lineWidth = 8; ctx.stroke();

  ctx.fillStyle = '#444444';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('OPERATOR', 40, 220);
  ctx.fillText('SECTOR', 260, 220);
  ctx.fillText('TIME', 380, 220);

  ctx.beginPath(); ctx.moveTo(30, 240); ctx.lineTo(482, 240);
  ctx.strokeStyle = '#999999'; ctx.lineWidth = 2; ctx.stroke();

  const shifts = [
    { name: "DOE, J.",   sec: "SEC-8", time: "08:30" },
    { name: "TIM, E.",   sec: "SEC-1", time: "02:15" },
    { name: "JONES, B.", sec: "SEC-4", time: "11:00" },
    { name: "TIM, E.",   sec: "SEC-2", time: "10:40" },
    { name: "CHEN, M.",  sec: "SEC-5", time: "23:15" },
    { name: "CROSS, E.", sec: "SEC-9", time: "13:20" },
    { name: "TIM, E.",   sec: "SEC-3", time: "06:00" },
    { name: "GOMEZ, L.", sec: "SEC-6", time: "09:45" },
    { name: "WITT, S.",  sec: "SEC-7", time: "16:30" },
  ];

  ctx.fillStyle = '#111111';
  ctx.font = '26px monospace';

  let yPos = 300;
  shifts.forEach(shift => {
    ctx.fillText(shift.name, 40, yPos);
    ctx.fillText(shift.sec, 260, yPos);
    ctx.font = 'bold 26px monospace';
    ctx.fillText(shift.time, 380, yPos);
    ctx.font = '26px monospace';

    ctx.beginPath(); ctx.moveTo(30, yPos + 20); ctx.lineTo(482, yPos + 20);
    ctx.strokeStyle = '#cccccc'; ctx.lineWidth = 1; ctx.stroke();
    yPos += 75;
  });

  ctx.fillStyle = '#aa0000';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('** CONFIDENTIAL **', 256, 980);
  return canvas;
}

function addScheduleInteraction(group, canvas) {
  group.userData.interactable = true;
  group.userData.label = 'Read Shift Schedule';
  group.userData.onInteract = () => {
    if (document.getElementById('schedule-overlay')) return;

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    const overlay = document.createElement('div');
    overlay.id = 'schedule-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', zIndex: '9999'
    });

    const img = document.createElement('img');
    img.src = canvas.toDataURL();
    Object.assign(img.style, { maxHeight: '90vh', border: '4px solid #444', borderRadius: '5px' });

    const hint = document.createElement('div');
    hint.innerText = "Click or press 'E' / 'Escape' to close";
    Object.assign(hint.style, { color: '#ffffff', fontFamily: 'monospace', fontSize: '20px', marginTop: '20px' });

    overlay.appendChild(img);
    overlay.appendChild(hint);
    document.body.appendChild(overlay);

    const closeOverlay = (e) => {
      if (e.type === 'click' || (e.type === 'keydown' && ['e', 'E', 'Escape'].includes(e.key))) {
        overlay.remove();
        document.removeEventListener('keydown', closeOverlay);
      }
    };
    overlay.addEventListener('click', closeOverlay);
    document.addEventListener('keydown', closeOverlay);
  };
}

export function buildRolledUpSchedule({ position = [0, 0, 0], rotation = [0, 0, 0] }) {
  const group = new THREE.Group();
  group.position.set(...position);
  group.rotation.set(...rotation);

  const canvas = createScheduleCanvas();
  const tex = new THREE.CanvasTexture(canvas);

  const paper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.4, 12),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, color: 0xddddcc })
  );
  group.add(paper);

  addScheduleInteraction(group, canvas);

  return { mesh: group, dispose: () => tex.dispose() };
}

export function buildClockPoster({ position = [0, 2, 0], rotationY = 0 }) {
  const group = new THREE.Group();
  group.position.set(...position);
  group.rotation.y = rotationY;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#eeeeee';
  ctx.fillRect(0, 0, 512, 1024);

  ctx.fillStyle = '#222222';
  ctx.font = 'bold 42px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FACILITY MAINTENANCE', 256, 70);
  ctx.fillText('SHIFT SCHEDULE', 256, 120);

  ctx.beginPath(); ctx.moveTo(30, 150); ctx.lineTo(482, 150);
  ctx.strokeStyle = '#aa0000'; ctx.lineWidth = 8; ctx.stroke();

  ctx.fillStyle = '#444444';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('OPERATOR', 40, 220);
  ctx.fillText('SECTOR', 260, 220);
  ctx.fillText('TIME', 380, 220);

  ctx.beginPath(); ctx.moveTo(30, 240); ctx.lineTo(482, 240);
  ctx.strokeStyle = '#999999'; ctx.lineWidth = 2; ctx.stroke();

  const shifts = [
    { name: "DOE, J.",   sec: "SEC-8", time: "08:30" },
    { name: "TIM, E.",   sec: "SEC-1", time: "02:15" },
    { name: "JONES, B.", sec: "SEC-4", time: "11:00" },
    { name: "TIM, E.",   sec: "SEC-2", time: "10:40" },
    { name: "CHEN, M.",  sec: "SEC-5", time: "23:15" },
    { name: "CROSS, E.", sec: "SEC-9", time: "13:20" },
    { name: "TIM, E.",   sec: "SEC-3", time: "06:00" },
    { name: "GOMEZ, L.", sec: "SEC-6", time: "09:45" },
    { name: "WITT, S.",  sec: "SEC-7", time: "16:30" },
  ];

  ctx.fillStyle = '#111111';
  ctx.font = '26px monospace';

  let yPos = 300;
  shifts.forEach(shift => {
    ctx.fillText(shift.name, 40, yPos);
    ctx.fillText(shift.sec, 260, yPos);
    ctx.font = 'bold 26px monospace';
    ctx.fillText(shift.time, 380, yPos);
    ctx.font = '26px monospace';

    ctx.beginPath(); ctx.moveTo(30, yPos + 20); ctx.lineTo(482, yPos + 20);
    ctx.strokeStyle = '#cccccc'; ctx.lineWidth = 1; ctx.stroke();
    yPos += 75;
  });

  ctx.fillStyle = '#aa0000';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('** CONFIDENTIAL **', 256, 980);

  const tex = new THREE.CanvasTexture(canvas);
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 1.6),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })
  );
  paper.position.z = 0.01;
  group.add(paper);

  group.userData.interactable = true;
  group.userData.label = 'Read Shift Schedule';
  group.userData.onInteract = () => {
    if (document.getElementById('schedule-overlay')) return;

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    const overlay = document.createElement('div');
    overlay.id = 'schedule-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', zIndex: '9999'
    });

    const img = document.createElement('img');
    img.src = canvas.toDataURL();
    Object.assign(img.style, { maxHeight: '90vh', border: '4px solid #444', borderRadius: '5px' });

    const hint = document.createElement('div');
    hint.innerText = "Click or press 'E' / 'Escape' to close";
    Object.assign(hint.style, { color: '#ffffff', fontFamily: 'monospace', fontSize: '20px', marginTop: '20px' });

    overlay.appendChild(img);
    overlay.appendChild(hint);
    document.body.appendChild(overlay);

    const closeOverlay = (e) => {
      if (e.type === 'click' || (e.type === 'keydown' && ['e', 'E', 'Escape'].includes(e.key))) {
        overlay.remove();
        document.removeEventListener('keydown', closeOverlay);
      }
    };
    overlay.addEventListener('click', closeOverlay);
    document.addEventListener('keydown', closeOverlay);
  };

  return { mesh: group, dispose: () => tex.dispose() };
}

// ---------------------------------------------------------------------------
// MULTI-STAGE KEYPAD BUILDER
// ---------------------------------------------------------------------------
export function buildKeypad({ position = [0, 1.5, 0], rotationY = 0, targetCodes = ["0215", "1040", "0600"], onSuccess, onWrongCode }) {
  const group = new THREE.Group();
  group.position.set(...position);
  group.rotation.y = rotationY;

  // 1. 3D Keypad Base
  const baseGeo = new THREE.BoxGeometry(0.3, 0.4, 0.05);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  group.add(base);

  // 2. 3D Screen
  const screenGeo = new THREE.BoxGeometry(0.2, 0.1, 0.06);
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x113311 });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(0, 0.1, 0);
  group.add(screenMesh);

  // 3. UI Interaction Logic
  let currentStage = 0; // Tracks which code we are on
  let wrongAttempts = 0;

  group.userData.interactable = true;
  group.userData.label = 'Use Keypad';
  group.userData.onInteract = () => {
    if (document.getElementById('keypad-overlay')) return;

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    const overlay = document.createElement('div');
    overlay.id = 'keypad-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: '9999',
      fontFamily: 'monospace'
    });

    const keypadBox = document.createElement('div');
    Object.assign(keypadBox.style, {
      backgroundColor: '#2a2a2a', padding: '25px', borderRadius: '10px',
      border: '4px solid #444', display: 'flex', flexDirection: 'column', gap: '15px',
      boxShadow: '0px 0px 20px rgba(0,0,0,0.8)'
    });

    // LEDs for stages
    const ledContainer = document.createElement('div');
    Object.assign(ledContainer.style, { display: 'flex', justifyContent: 'center', gap: '15px' });

    const leds = [];
    for (let i = 0; i < targetCodes.length; i++) {
      const led = document.createElement('div');
      Object.assign(led.style, {
        width: '15px', height: '15px', borderRadius: '50%',
        backgroundColor: i < currentStage ? '#00ff00' : '#440000',
        boxShadow: i < currentStage ? '0px 0px 10px #00ff00' : 'inset 0px 0px 5px rgba(0,0,0,0.8)',
        transition: 'background-color 0.3s, box-shadow 0.3s'
      });
      leds.push(led);
      ledContainer.appendChild(led);
    }
    keypadBox.appendChild(ledContainer);

    // Digital Screen
    const display = document.createElement('div');
    Object.assign(display.style, {
      backgroundColor: '#0a1a0a', color: '#55ff55', fontSize: '36px',
      padding: '10px 15px', textAlign: 'right', borderRadius: '5px',
      height: '45px', lineHeight: '45px', letterSpacing: '4px',
      boxShadow: 'inset 0px 0px 10px rgba(0,0,0,0.5)'
    });

    if (currentStage >= targetCodes.length) {
      display.innerText = "UNLOCKED";
      display.style.color = '#00ff00';
    } else {
      display.innerText = "";
    }

    keypadBox.appendChild(display);

    // Number Grid
    const grid = document.createElement('div');
    Object.assign(grid.style, { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' });

    let currentInput = "";
    let isProcessing = false;

    const buttons = ['1','2','3','4','5','6','7','8','9','C','0','E'];
    buttons.forEach(btn => {
      const btnEl = document.createElement('button');
      btnEl.innerText = btn;
      Object.assign(btnEl.style, {
        padding: '20px', fontSize: '28px', cursor: 'pointer', fontWeight: 'bold',
        backgroundColor: btn === 'E' ? '#226622' : (btn === 'C' ? '#662222' : '#555'),
        color: 'white', border: 'none', borderRadius: '5px',
        transition: 'background 0.1s, transform 0.1s'
      });

      btnEl.onmouseover = () => btnEl.style.filter = 'brightness(1.2)';
      btnEl.onmouseout = () => btnEl.style.filter = 'brightness(1)';
      btnEl.onmousedown = () => btnEl.style.transform = 'scale(0.95)';
      btnEl.onmouseup = () => btnEl.style.transform = 'scale(1)';

      btnEl.onclick = (e) => {
        e.stopPropagation();
        if (isProcessing || currentStage >= targetCodes.length) return;

        if (btn === 'C') {
          currentInput = "";
          display.innerText = currentInput;
        } else if (btn === 'E') {
          if (!currentInput.length) return;
          isProcessing = true;
          if (currentInput === targetCodes[currentStage]) {
            // Correct Code
            leds[currentStage].style.backgroundColor = '#00ff00';
            leds[currentStage].style.boxShadow = '0px 0px 10px #00ff00';
            currentStage++;

            display.style.color = '#ffffff';
            display.style.backgroundColor = '#00aa00';

            if (currentStage >= targetCodes.length) {
              display.innerText = "UNLOCKED";
              setTimeout(() => {
                closeKeypad();
                if (onSuccess) onSuccess();
              }, 1500);
            } else {
              display.innerText = "ACCEPTED";
              setTimeout(() => {
                currentInput = "";
                display.innerText = currentInput;
                display.style.color = '#55ff55';
                display.style.backgroundColor = '#0a1a0a';
                isProcessing = false;
              }, 1000);
            }
          } else {
            // Wrong Code
            wrongAttempts++;
            const strike = wrongAttempts > 3;
            if (strike) {
              wrongAttempts = 0;
              closeKeypad();
            }
            onWrongCode?.({ attempts: wrongAttempts, strike });
            if (strike) return;
            display.style.color = '#ffffff';
            display.style.backgroundColor = '#aa0000';
            display.innerText = "ERROR";
            setTimeout(() => {
              currentInput = "";
              display.innerText = currentInput;
              display.style.color = '#55ff55';
              display.style.backgroundColor = '#0a1a0a';
              isProcessing = false;
            }, 1000);
          }
        } else {
          // Standard number entry
          if (currentInput.length < targetCodes[currentStage].length) {
            currentInput += btn;
            display.innerText = currentInput;
          }
        }
      };
      grid.appendChild(btnEl);
    });

    keypadBox.appendChild(grid);

    const hint = document.createElement('div');
    hint.innerText = "Click outside or press Escape to close";
    if (onWrongCode) hint.innerText += '. Four wrong PINs cause a security strike.';
    Object.assign(hint.style, { color: '#888', textAlign: 'center', marginTop: '5px', fontSize: '14px' });
    keypadBox.appendChild(hint);

    overlay.appendChild(keypadBox);
    document.body.appendChild(overlay);

    const closeKeypad = () => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      document.removeEventListener('keydown', handleKeydown);
    };

    const handleKeydown = (e) => {
      if (e.key === 'Escape') closeKeypad();
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) closeKeypad();
    }
    document.addEventListener('keydown', handleKeydown);
  };

  return { mesh: group };
}

// ---------------------------------------------------------------------------
// GENERIC PROP BUILDER
// ---------------------------------------------------------------------------
export function buildProp({ geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], castShadow = true }) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}
// ---------------------------------------------------------------------------
// 3D BACKPACK PROP (Photogrammetry GLB with procedural fallback)
// ---------------------------------------------------------------------------
export function buildBackpackProp({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, isPickup = false } = {}) {
  const wrapperGroup = new THREE.Group();
  wrapperGroup.position.set(...position);
  wrapperGroup.rotation.set(...rotation);

  if (isPickup) {
    wrapperGroup.userData.pickupable = true;
    wrapperGroup.userData.itemId = 'backpack';
    wrapperGroup.userData.label = 'Field Backpack';
  }

  const loader = new GLTFLoader();
  loader.load(
    './models/backpack_photogrammetry.glb',
    (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const targetHeight = 0.52 * scale;
      const scaleFactor = targetHeight / (size.y || 1);
      model.scale.set(scaleFactor, scaleFactor, scaleFactor);

      // Re-center model inside wrapper group
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.set(-center.x * scaleFactor, -box.min.y * scaleFactor, -center.z * scaleFactor);

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (isPickup) {
            child.userData.pickupable = true;
            child.userData.itemId = 'backpack';
          }
          if (child.material && (child.material.type === 'MeshBasicMaterial' || child.material.isMeshBasicMaterial)) {
            const oldMat = child.material;
            child.material = new THREE.MeshStandardMaterial({
              map: oldMat.map,
              color: oldMat.color || 0xffffff,
              roughness: 0.7,
              metalness: 0.1,
            });
          }
        }
      });

      wrapperGroup.add(model);
    },
    undefined,
    () => {
      // Procedural photogrammetry backpack fallback
      const bagMat = new THREE.MeshStandardMaterial({ color: 0x47392b, roughness: 0.7, metalness: 0.15 });
      const strapMat = new THREE.MeshStandardMaterial({ color: 0x1f1812, roughness: 0.5 });

      // Main compartment
      const mainBag = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, 0.46 * scale, 0.22 * scale), bagMat);
      mainBag.position.y = 0.23 * scale;
      mainBag.castShadow = true;
      wrapperGroup.add(mainBag);

      // Front pocket
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.25 * scale, 0.22 * scale, 0.08 * scale), bagMat);
      pocket.position.set(0, 0.18 * scale, 0.14 * scale);
      pocket.castShadow = true;
      wrapperGroup.add(pocket);

      // Top handle
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06 * scale, 0.015 * scale, 6, 12, Math.PI), strapMat);
      handle.position.set(0, 0.46 * scale, 0);
      handle.rotation.x = Math.PI / 2;
      wrapperGroup.add(handle);

      if (isPickup) {
        mainBag.userData.pickupable = true;
        mainBag.userData.itemId = 'backpack';
        pocket.userData.pickupable = true;
        pocket.userData.itemId = 'backpack';
      }
    }
  );

  return wrapperGroup;
}

// ---------------------------------------------------------------------------
// IN-WORLD PICKUP ITEMS (Torch, Books, Tools, Cards)
// ---------------------------------------------------------------------------
export function buildItemPickupProp({ itemId, position = [0, 0, 0], rotation = [0, 0, 0] }) {
  const group = new THREE.Group();
  group.position.set(...position);
  group.rotation.set(...rotation);

  group.userData.pickupable = true;
  group.userData.itemId = itemId;

  if (itemId === 'torch') {
    group.userData.label = 'Inspection Torch';
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.18, 12),
      new THREE.MeshStandardMaterial({ color: 0x1c232a, metalness: 0.85, roughness: 0.2 })
    );
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;

    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.024, 0.06, 12),
      new THREE.MeshStandardMaterial({ color: 0x3d4855, metalness: 0.9, roughness: 0.2 })
    );
    head.position.z = 0.11;
    head.rotation.x = Math.PI / 2;
    head.castShadow = true;

    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.034, 12),
      new THREE.MeshBasicMaterial({ color: 0xebf8ff })
    );
    lens.position.z = 0.141;

    group.add(body, head, lens);
    body.userData.pickupable = true;
    body.userData.itemId = itemId;
    head.userData.pickupable = true;
    head.userData.itemId = itemId;
  } else if (itemId === 'technical_guide' || itemId === 'maintenance_manual') {
    const isManual = itemId === 'maintenance_manual';
    group.userData.label = isManual ? 'Substation Manual Vol. 2' : 'Technician Logbook';

    const coverColor = isManual ? 0xd47a24 : 0x1d374a;
    const book = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.035, 0.34),
      new THREE.MeshStandardMaterial({ color: coverColor, roughness: 0.6 })
    );
    book.position.y = 0.0175;
    book.castShadow = true;

    const pages = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.026, 0.32),
      new THREE.MeshStandardMaterial({ color: 0xf0e5cb, roughness: 0.4 })
    );
    pages.position.set(0.01, 0.0175, 0);

    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(0.26, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.036, 0.02);

    group.add(book, pages, stripe);
    book.userData.pickupable = true;
    book.userData.itemId = itemId;
  } else if (itemId === 'insulated_wrench') {
    group.userData.label = 'Insulated Wrench';

    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.22, 10),
      new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.5, metalness: 0.1 })
    );
    handle.rotation.x = Math.PI / 2;
    handle.castShadow = true;

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.02, 0.065),
      new THREE.MeshStandardMaterial({ color: 0x747d8c, metalness: 0.9, roughness: 0.2 })
    );
    head.position.z = 0.13;
    head.castShadow = true;

    group.add(handle, head);
    handle.userData.pickupable = true;
    handle.userData.itemId = itemId;
    head.userData.pickupable = true;
    head.userData.itemId = itemId;
  } else if (itemId === 'multimeter') {
    group.userData.label = 'Digital Multimeter';

    const caseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.035, 0.20),
      new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.5 })
    );
    caseMesh.position.y = 0.0175;
    caseMesh.castShadow = true;

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.08, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x223528, roughness: 0.1 })
    );
    screen.rotation.x = -Math.PI / 2;
    screen.position.set(0, 0.036, 0.04);

    const dial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.008, 12),
      new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.3 })
    );
    dial.position.set(0, 0.037, -0.03);

    group.add(caseMesh, screen, dial);
    caseMesh.userData.pickupable = true;
    caseMesh.userData.itemId = itemId;
  } else if (itemId === 'access_card') {
    group.userData.label = 'Security Access Card';
    const card = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.005, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x1e90ff, roughness: 0.3, metalness: 0.4 })
    );
    card.position.y = 0.003;
    card.castShadow = true;

    const chip = new THREE.Mesh(
      new THREE.PlaneGeometry(0.03, 0.025),
      new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 })
    );
    chip.rotation.x = -Math.PI / 2;
    chip.position.set(-0.025, 0.006, 0);

    group.add(card, chip);
    card.userData.pickupable = true;
    card.userData.itemId = itemId;
  }

  return group;
}
