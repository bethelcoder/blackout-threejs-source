import * as THREE from 'three';

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

// ---------------------------------------------------------------------------
// MAIN ROOM BUILDER
// ---------------------------------------------------------------------------
export function buildRoom({ width = 14, depth = 20, height = 4.2, wallColor = 0x505c68 }) {
  const group = new THREE.Group();
  const colliders = [];
  const { wall: wTex, grate: gTex } = getSharedTextures();

  // 1. FLOOR & CATWALK GRATING
  gTex.repeat.set(width * 0.8, depth * 0.8);
  const floorMat = new THREE.MeshStandardMaterial({ map: gTex, roughness: 0.3, metalness: 0.85 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Side Concrete Plinths
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x2e3740, roughness: 0.7, metalness: 0.2 });
  const leftPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, depth), plinthMat);
  leftPlinth.position.set(-width / 2 + 0.8, 0.175, 0);
  const rightPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, depth), plinthMat);
  rightPlinth.position.set(width / 2 - 0.8, 0.175, 0);
  group.add(leftPlinth, rightPlinth);

  // 2. WALLS & CEILING
  const wallMat = new THREE.MeshStandardMaterial({
    color: wallColor, map: wTex.map, bumpMap: wTex.bumpMap, bumpScale: 0.04, roughness: 0.5, metalness: 0.2,
  });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x1a2128, roughness: 0.6, metalness: 0.4 });
  
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
    group.add(mesh);

    const isZWall = w.rot[1] === 0 || Math.abs(w.rot[1]) === Math.PI;
    const box = new THREE.Box3();
    if (isZWall) {
      box.setFromCenterAndSize(new THREE.Vector3(w.pos[0], height / 2, w.pos[2]), new THREE.Vector3(width, height, wallThickness));
    } else {
      box.setFromCenterAndSize(new THREE.Vector3(w.pos[0], height / 2, w.pos[2]), new THREE.Vector3(wallThickness, height, depth));
    }
    colliders.push(box);
  }

  // 3. OVERHEAD RED I-BEAMS & PIPE STRUCTURE
  const redBeamMat = new THREE.MeshStandardMaterial({ color: 0x8b1a1a, metalness: 0.7, roughness: 0.3 });
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x3d4853, metalness: 0.8, roughness: 0.2 });

  for (let z = -depth / 2 + 2; z <= depth / 2 - 2; z += 2.8) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(width - 0.4, 0.18, 0.18), redBeamMat);
    beam.position.set(0, height - 0.2, z);
    group.add(beam);
    for (const x of [-width / 2 + 1.2, width / 2 - 1.2]) {
      const dropRod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8), redBeamMat);
      dropRod.position.set(x, height - 0.6, z);
      group.add(dropRod);
    }
  }

  for (const x of [-width / 2 + 1.4, -width / 2 + 1.8, width / 2 - 1.8, width / 2 - 1.4]) {
    const longPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, depth, 12), pipeMat);
    longPipe.rotation.x = Math.PI / 2;
    longPipe.position.set(x, height - 0.45, 0);
    group.add(longPipe);
  }

  // 4. SWITCHGEAR RACKS
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x3b4752, metalness: 0.75, roughness: 0.3 });
  const panelDetailMat = new THREE.MeshStandardMaterial({ color: 0x1f262d, metalness: 0.8, roughness: 0.2 });
  const breakerMat = new THREE.MeshStandardMaterial({ color: 0xd2d7dc, metalness: 0.9, roughness: 0.1 });

  for (let z = -depth / 2 + 1.8; z <= depth / 2 - 1.8; z += 1.3) {
    [-width / 2 + 0.8, width / 2 - 0.8].forEach((xPos, sideIdx) => {
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

  return { group, colliders };
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
export function buildKeypad({ position = [0, 1.5, 0], rotationY = 0, targetCodes = ["0215", "1040", "0600"], onSuccess }) {
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
        backgroundColor: i < currentStage ? '#00ff00' : '#440000', // Green if already passed
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