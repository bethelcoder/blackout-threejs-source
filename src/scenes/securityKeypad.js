import * as THREE from 'three';

/**
 * Creates the canvas texture for the 3D security keypad faceplate.
 */
function createKeypadFaceplateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');

  // Brushed steel background
  const grad = ctx.createLinearGradient(0, 0, 512, 768);
  grad.addColorStop(0, '#77786a');
  grad.addColorStop(0.3, '#484a40');
  grad.addColorStop(0.7, '#626458');
  grad.addColorStop(1, '#36382f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 768);

  // Brushed metal noise streaks
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let y = 0; y < 768; y += 2) {
    if (Math.random() > 0.4) {
      ctx.fillRect(0, y, 512, 1);
    }
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
  for (let y = 1; y < 768; y += 3) {
    if (Math.random() > 0.5) {
      ctx.fillRect(0, y, 512, 1);
    }
  }

  // Scratches & grunge
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 30; i++) {
    const sx = Math.random() * 512;
    const sy = Math.random() * 768;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (Math.random() - 0.5) * 60, sy + (Math.random() - 0.5) * 30);
    ctx.stroke();
  }

  // Vertical dividing channel
  ctx.fillStyle = '#44484d';
  ctx.fillRect(360, 40, 10, 680);
  ctx.fillStyle = '#222528';
  ctx.fillRect(363, 40, 4, 680);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(370, 40, 2, 680);

  // Screws at corners
  function drawScrew(x, y) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#dcdfe3';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#555';
    ctx.stroke();

    // Screw slot cross
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 11, y);
    ctx.lineTo(x + 11, y);
    ctx.moveTo(x, y - 11);
    ctx.lineTo(x, y + 11);
    ctx.stroke();
    ctx.restore();
  }

  drawScrew(32, 32);
  drawScrew(340, 32);
  drawScrew(32, 736);
  drawScrew(480, 736);

  // Yellow warning logo & text on the right
  ctx.save();
  ctx.fillStyle = '#ffcc00';
  ctx.strokeStyle = '#cca000';
  ctx.lineWidth = 4;

  // Stencil emblem
  ctx.beginPath();
  ctx.arc(436, 170, 36, 0.4 * Math.PI, 1.8 * Math.PI);
  ctx.stroke();
  ctx.font = 'bold 38px "Impact", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('K', 436, 183);

  // Yellow warning text
  ctx.font = 'bold 15px monospace';
  ctx.fillText('AUTHORIZED', 436, 230);
  ctx.fillText('PERSONNEL', 436, 248);
  ctx.fillText('ONLY', 436, 266);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Creates the LCD screen texture with cracked glass and digital readout.
 */
function createScreenTexture(displayText = '0000', isGranted = false, isError = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // LCD background
  ctx.fillStyle = isError ? '#3a0808' : (isGranted ? '#083315' : '#142517');
  ctx.fillRect(0, 0, 384, 128);

  // Bezel border
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 378, 122);

  // Digital digits
  ctx.fillStyle = isError ? '#ff3b30' : (isGranted ? '#2bff6f' : '#45e05a');
  ctx.font = 'bold 54px monospace';
  ctx.textAlign = 'right';
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 12;
  ctx.fillText(displayText, 360, 84);
  ctx.shadowBlur = 0;

  // Cracked glass web pattern overlay
  ctx.strokeStyle = 'rgba(160, 255, 190, 0.25)';
  ctx.lineWidth = 1.5;
  const crackPoints = [
    [40, 20], [80, 50], [60, 90], [120, 60], [150, 20],
    [170, 70], [210, 40], [230, 90], [280, 50], [330, 75]
  ];
  ctx.beginPath();
  ctx.moveTo(10, 30);
  crackPoints.forEach(([x, y]) => {
    ctx.lineTo(x, y);
    ctx.lineTo(x + 15, y - 10);
    ctx.moveTo(x, y);
  });
  ctx.stroke();

  // Fine fracture splinters
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.moveTo(60, 10); ctx.lineTo(130, 110);
  ctx.moveTo(180, 20); ctx.lineTo(260, 120);
  ctx.moveTo(90, 80); ctx.lineTo(240, 30);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

/**
 * Builds the 3D Security Keypad prop and interactive modal overlay.
 */
export function buildSecurityKeypad({
  position = [2.0, 1.4, -9.85],
  rotation = [0, 0, 0],
  correctCode = '0451',
  sound,
  hud,
  onSuccess
}) {
  const group = new THREE.Group();
  group.position.set(...position);
  group.rotation.set(...rotation);

  let unlocked = false;
  let disposeModal = null;
  let feedbackTimer = null;

  // 1. Chamfered Faceplate Geometry
  const shape = new THREE.Shape();
  const w = 0.32;
  const h = 0.48;
  const chamfer = 0.08;
  const hw = w / 2;
  const hh = h / 2;

  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh - chamfer);
  shape.lineTo(hw - chamfer, hh);
  shape.lineTo(-hw, hh);
  shape.closePath();

  const faceplateGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.025,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.006,
    bevelThickness: 0.006
  });

  const faceTex = createKeypadFaceplateTexture();
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    metalness: 0.8,
    roughness: 0.35
  });
  const faceplateMesh = new THREE.Mesh(faceplateGeo, faceMat);
  group.add(faceplateMesh);

  // 2. LCD Display Mesh
  const screenGeo = new THREE.BoxGeometry(0.18, 0.065, 0.01);
  const screenTex = createScreenTexture('____');
  const screenMat = new THREE.MeshStandardMaterial({
    map: screenTex,
    emissive: 0x113318,
    emissiveIntensity: 0.8,
    roughness: 0.2
  });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(-0.045, 0.165, 0.032);
  group.add(screenMesh);

  // 3. 3D Keypad Buttons (visual representation on mesh)
  const buttonGeo = new THREE.BoxGeometry(0.032, 0.032, 0.015);
  const buttonMat = new THREE.MeshStandardMaterial({
    color: 0x686a5a,
    metalness: 0.6,
    roughness: 0.3
  });

  const buttonLabels = [];
  function labelButton(button, text) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#33352d';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#e2dfca';
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, 32, 47);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const geometry = new THREE.PlaneGeometry(0.026, 0.026);
    const label = new THREE.Mesh(geometry, material);
    label.position.z = 0.008;
    button.add(label);
    buttonLabels.push({ texture, material, geometry });
  }
  const startY = 0.08;
  const startX = -0.095;
  const spacingX = 0.05;
  const spacingY = 0.055;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const btn = new THREE.Mesh(buttonGeo, buttonMat);
      btn.position.set(startX + c * spacingX, startY - r * spacingY, 0.032);
      labelButton(btn, String(r * 3 + c + 1));
      group.add(btn);
    }
  }

  // 0 Button
  const btn0 = new THREE.Mesh(buttonGeo, buttonMat);
  btn0.position.set(startX + spacingX, startY - 3 * spacingY, 0.032);
  labelButton(btn0, '0');
  group.add(btn0);

  // Tall ENTER Button
  const enterGeo = new THREE.BoxGeometry(0.038, 0.09, 0.015);
  const enterMat = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    metalness: 0.7,
    roughness: 0.3
  });
  const enterMesh = new THREE.Mesh(enterGeo, enterMat);
  enterMesh.position.set(0.09, -0.015, 0.032);
  group.add(enterMesh);

  // Status indicator LED
  const ledGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.01, 16);
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xff2222,
    emissive: 0xff0000,
    emissiveIntensity: 1.0
  });
  const ledMesh = new THREE.Mesh(ledGeo, ledMat);
  ledMesh.rotation.x = Math.PI / 2;
  ledMesh.position.set(0.09, 0.165, 0.032);
  group.add(ledMesh);

  // 4. Interaction & UI Modal
  group.userData.interactable = true;
  group.userData.label = 'Use Access Keypad';
  group.userData.getLabel = () => unlocked ? 'Access Keypad (Unlocked)' : 'Use Access Keypad';

  function updateMeshState(isUnlocked) {
    if (isUnlocked) {
      ledMat.color.setHex(0x00ff44);
      ledMat.emissive.setHex(0x00ff44);
      ledMat.emissiveIntensity = 2.0;
      screenMat.emissive.setHex(0x2bff6f);
      screenMat.emissiveIntensity = 1.5;
      screenMat.map.dispose();
      screenMat.map = createScreenTexture('OPEN', true, false);
      screenMat.map.needsUpdate = true;
    }
  }

  group.userData.onInteract = () => {
    if (unlocked) {
      if (hud) hud.setObjective('Access already granted. Push the double doors to enter Level 2.');
      return;
    }

    if (document.getElementById('security-keypad-overlay')) return;

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    openKeypadModal();
  };

  function openKeypadModal() {
    let currentInput = '';
    let isProcessing = false;

    // Overlay backdrop
    const overlay = document.createElement('div');
    overlay.id = 'security-keypad-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(5, 10, 15, 0.82)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: '10000',
      userSelect: 'none',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    });

    // Keypad Frame styled like the user reference photo
    const frame = document.createElement('div');
    Object.assign(frame.style, {
      position: 'relative',
      width: 'min(420px, calc(100vw - 64px))',
      padding: '30px 24px 24px 24px',
      background: 'linear-gradient(135deg, #77786a 0%, #484a40 35%, #626458 70%, #36382f 100%)',
      clipPath: 'polygon(0 0, calc(100% - 65px) 0, 100% 65px, 100% 100%, 0 100%)',
      boxShadow: '0 25px 60px rgba(0,0,0,0.9), inset 2px 2px 4px rgba(255,255,255,0.7), inset -3px -3px 6px rgba(0,0,0,0.6)',
      border: '1px solid #5a5f64',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px'
    });

    // Corner Screw decorations
    function makeScrew(top, left, right, bottom) {
      const screw = document.createElement('div');
      Object.assign(screw.style, {
        position: 'absolute',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, #e6e9ec 40%, #7c8186 100%)',
        boxShadow: '1px 1px 3px rgba(0,0,0,0.6), inset 1px 1px 1px #fff',
        border: '1px solid #4a4e52',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      });
      if (top) screw.style.top = top;
      if (left) screw.style.left = left;
      if (right) screw.style.right = right;
      if (bottom) screw.style.bottom = bottom;

      const slot = document.createElement('div');
      Object.assign(slot.style, {
        width: '14px',
        height: '2.5px',
        backgroundColor: '#2e3135',
        transform: 'rotate(' + (Math.floor(Math.random() * 180)) + 'deg)'
      });
      screw.appendChild(slot);
      return screw;
    }

    frame.appendChild(makeScrew('10px', '10px'));
    frame.appendChild(makeScrew('10px', null, '78px')); // left of chamfer
    frame.appendChild(makeScrew(null, '10px', null, '10px'));
    frame.appendChild(makeScrew(null, null, '10px', '10px'));

    // Top Header: Cracked Screen Display
    const displayContainer = document.createElement('div');
    Object.assign(displayContainer.style, {
      position: 'relative',
      width: '270px',
      height: '68px',
      backgroundColor: '#122416',
      border: '4px solid #32373c',
      borderRadius: '4px',
      boxShadow: 'inset 3px 3px 8px rgba(0,0,0,0.9), 1px 1px 2px rgba(255,255,255,0.4)',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 16px',
      boxSizing: 'border-box'
    });

    // Cracked glass SVG overlay
    const crackSvg = document.createElement('div');
    crackSvg.innerHTML = `
      <svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;opacity:0.35;" viewBox="0 0 270 68">
        <path d="M 20,10 L 60,35 L 45,60 L 95,40 L 130,15 L 145,45 L 180,25 L 200,60 L 240,30" fill="none" stroke="#7eff9c" stroke-width="1.2"/>
        <path d="M 60,35 L 85,20 L 110,35 L 100,55" fill="none" stroke="#ffffff" stroke-width="0.8"/>
        <path d="M 145,45 L 165,65 L 190,40" fill="none" stroke="#ffffff" stroke-width="0.8"/>
        <path d="M 30,5 L 110,65" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="0.5"/>
        <path d="M 160,5 L 250,60" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="0.5"/>
      </svg>
    `;
    displayContainer.appendChild(crackSvg);

    // Glowing LCD Text
    const displayText = document.createElement('div');
    Object.assign(displayText.style, {
      color: '#49f268',
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '36px',
      fontWeight: 'bold',
      letterSpacing: '6px',
      textShadow: '0 0 10px #3bf05d, 0 0 20px rgba(59,240,93,0.6)',
      position: 'relative',
      zIndex: '2'
    });
    displayText.innerText = '____';
    displayContainer.appendChild(displayText);

    // Status LED light next to display
    const headerRow = document.createElement('div');
    Object.assign(headerRow.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px'
    });
    headerRow.appendChild(displayContainer);

    const statusPill = document.createElement('div');
    Object.assign(statusPill.style, {
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px'
    });
    const statusLight = document.createElement('div');
    Object.assign(statusLight.style, {
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      backgroundColor: '#cc1111',
      boxShadow: '0 0 8px #ff2222, inset 1px 1px 2px #fff',
      border: '2px solid #333'
    });
    const statusLabel = document.createElement('div');
    Object.assign(statusLabel.style, {
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#2a2e33',
      letterSpacing: '1px'
    });
    statusLabel.innerText = 'SECURE';
    statusPill.appendChild(statusLight);
    statusPill.appendChild(statusLabel);
    headerRow.appendChild(statusPill);

    frame.appendChild(headerRow);

    // Main Control Row: Left = 3x4 Button Matrix, Right = Stencil Logo & ENTER key
    const mainControlRow = document.createElement('div');
    Object.assign(mainControlRow.style, {
      display: 'flex',
      gap: '16px'
    });

    // Left Matrix
    const keyMatrix = document.createElement('div');
    Object.assign(keyMatrix.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      flex: '1',
      gap: '12px'
    });

    const keyDefinitions = [
      { num: '1', sub: '' },
      { num: '2', sub: 'ABC' },
      { num: '3', sub: 'DEF' },
      { num: '4', num2: '4', sub: 'GHI' },
      { num: '5', sub: 'JKL' },
      { num: '6', sub: 'MNO' },
      { num: '7', sub: 'PQRS' },
      { num: '8', sub: 'TUV' },
      { num: '9', sub: 'WXYZ' },
      { num: 'CLR', sub: '', isAction: true },
      { num: '0', sub: '' },
      { num: 'DEL', sub: '', isAction: true }
    ];

    function renderDisplay() {
      if (currentInput.length === 0) {
        displayText.innerText = '____';
      } else {
        displayText.innerText = currentInput.padEnd(4, '_');
      }
    }

    keyDefinitions.forEach(keyDef => {
      const btn = document.createElement('button');
      Object.assign(btn.style, {
        height: '64px',
        background: 'linear-gradient(145deg, #686a5a, #33352d)',
        border: '2px solid #5a5f64',
        borderRadius: '5px',
        boxShadow: '3px 3px 6px rgba(0,0,0,0.5), inset 1px 1px 2px #ffffff',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        transition: 'transform 0.06s, box-shadow 0.06s, filter 0.06s',
        outline: 'none'
      });

      const numSpan = document.createElement('div');
      Object.assign(numSpan.style, {
        fontSize: keyDef.isAction ? '16px' : '26px',
        fontWeight: 'bold',
        color: keyDef.isAction ? '#efb78c' : '#e2dfca',
        fontFamily: '"Impact", "Arial Black", sans-serif',
        lineHeight: '1'
      });
      numSpan.innerText = keyDef.num;
      btn.appendChild(numSpan);

      if (keyDef.sub) {
        const subSpan = document.createElement('div');
        Object.assign(subSpan.style, {
          fontSize: '9px',
          fontWeight: 'bold',
          color: '#c5c2ae',
          letterSpacing: '1px',
          marginTop: '2px'
        });
        subSpan.innerText = keyDef.sub;
        btn.appendChild(subSpan);
      }

      btn.onmouseenter = () => btn.style.filter = 'brightness(1.1)';
      btn.onmouseleave = () => btn.style.filter = 'brightness(1)';
      btn.onmousedown = () => {
        btn.style.transform = 'scale(0.96)';
        btn.style.boxShadow = '1px 1px 2px rgba(0,0,0,0.6), inset 2px 2px 3px rgba(0,0,0,0.4)';
      };
      btn.onmouseup = () => {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = '3px 3px 6px rgba(0,0,0,0.5), inset 1px 1px 2px #ffffff';
      };

      btn.onclick = (e) => {
        e.stopPropagation();
        if (isProcessing) return;

        if (keyDef.num === 'CLR') {
          if (sound && sound.playKeypadBeep) sound.playKeypadBeep();
          currentInput = '';
          renderDisplay();
        } else if (keyDef.num === 'DEL') {
          if (sound && sound.playKeypadBeep) sound.playKeypadBeep();
          currentInput = currentInput.slice(0, -1);
          renderDisplay();
        } else {
          if (currentInput.length < 4) {
            if (sound && sound.playKeypadBeep) sound.playKeypadBeep();
            currentInput += keyDef.num;
            renderDisplay();
          }
        }
      };

      keyMatrix.appendChild(btn);
    });

    mainControlRow.appendChild(keyMatrix);

    // Right Side: Hazard Warning Stencil & Tall ENTER Button
    const rightPanel = document.createElement('div');
    Object.assign(rightPanel.style, {
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingLeft: '10px',
      borderLeft: '3px solid #5a5f64'
    });

    // Warning decal
    const decalBox = document.createElement('div');
    Object.assign(decalBox.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      color: '#d4a000',
      textShadow: '1px 1px 1px rgba(0,0,0,0.4)'
    });
    decalBox.innerHTML = `
      <div style="width:48px;height:48px;border-radius:50%;border:4px solid #d4a000;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;font-family:'Impact',sans-serif;margin-bottom:6px;">
        K
      </div>
      <div style="font-size:11px;font-weight:900;letter-spacing:1px;font-family:monospace;line-height:1.2;">
        AUTHORIZED<br>PERSONNEL<br>ONLY
      </div>
    `;
    rightPanel.appendChild(decalBox);

    // Tall L-Shaped ENTER Button
    const enterBtn = document.createElement('button');
    Object.assign(enterBtn.style, {
      width: '84px',
      height: '110px',
      background: 'linear-gradient(145deg, #f5f6f8, #c8ccd0)',
      border: '2px solid #555a60',
      borderRadius: '6px',
      boxShadow: '3px 4px 8px rgba(0,0,0,0.6), inset 1px 1px 2px #fff',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      marginTop: '10px',
      transition: 'transform 0.06s, box-shadow 0.06s, filter 0.06s',
      outline: 'none'
    });

    const enterArrow = document.createElement('div');
    enterArrow.innerText = '▶';
    Object.assign(enterArrow.style, {
      fontSize: '22px',
      color: '#226622',
      lineHeight: '1'
    });

    const enterText = document.createElement('div');
    enterText.innerText = 'ENTER';
    Object.assign(enterText.style, {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#1e2226',
      letterSpacing: '1px'
    });

    enterBtn.appendChild(enterArrow);
    enterBtn.appendChild(enterText);

    enterBtn.onmouseenter = () => enterBtn.style.filter = 'brightness(1.1)';
    enterBtn.onmouseleave = () => enterBtn.style.filter = 'brightness(1)';
    enterBtn.onmousedown = () => {
      enterBtn.style.transform = 'scale(0.96)';
      enterBtn.style.boxShadow = '1px 1px 2px rgba(0,0,0,0.6), inset 2px 2px 3px rgba(0,0,0,0.4)';
    };
    enterBtn.onmouseup = () => {
      enterBtn.style.transform = 'scale(1)';
      enterBtn.style.boxShadow = '3px 4px 8px rgba(0,0,0,0.6), inset 1px 1px 2px #fff';
    };

    function validateCode() {
      if (isProcessing) return;
      isProcessing = true;

      if (currentInput === correctCode) {
        // Access Granted!
        if (sound && sound.playAccessGranted) sound.playAccessGranted();
        statusLight.style.backgroundColor = '#00ff44';
        statusLight.style.boxShadow = '0 0 12px #00ff44';
        statusLabel.innerText = 'GRANTED';
        statusLabel.style.color = '#008822';

        displayText.style.color = '#2bff6f';
        displayText.innerText = 'OPEN';

        unlocked = true;
        updateMeshState(true);
        onSuccess?.();

        if (hud) {
          hud.setObjective('Access granted! Level 2 double doors unlocked.');
        }

        feedbackTimer = setTimeout(closeModal, 1200);
      } else {
        // Access Denied!
        if (sound && sound.playDetectionWarning) sound.playDetectionWarning(0.6);
        statusLight.style.backgroundColor = '#ff1111';
        statusLight.style.boxShadow = '0 0 14px #ff0000';
        statusLabel.innerText = 'DENIED';
        statusLabel.style.color = '#aa0000';

        displayText.style.color = '#ff3b30';
        displayText.style.textShadow = '0 0 12px #ff3b30';
        displayText.innerText = 'ERR!';

        feedbackTimer = setTimeout(() => {
          currentInput = '';
          renderDisplay();
          displayText.style.color = '#49f268';
          displayText.style.textShadow = '0 0 10px #3bf05d';
          statusLight.style.backgroundColor = '#cc1111';
          statusLight.style.boxShadow = '0 0 8px #ff2222';
          statusLabel.innerText = 'SECURE';
          statusLabel.style.color = '#2a2e33';
          isProcessing = false;
        }, 900);
      }
    }

    enterBtn.onclick = (e) => {
      e.stopPropagation();
      validateCode();
    };

    rightPanel.appendChild(enterBtn);
    mainControlRow.appendChild(rightPanel);
    frame.appendChild(mainControlRow);

    // Hint text below frame
    const hint = document.createElement('div');
    hint.innerText = 'Enter the 4-digit code from the logbook. Escape to close.';
    Object.assign(hint.style, {
      color: '#adb5bd',
      fontSize: '14px',
      marginTop: '14px',
      fontFamily: 'monospace',
      letterSpacing: '0.5px'
    });

    overlay.appendChild(frame);
    overlay.appendChild(hint);
    document.body.appendChild(overlay);

    disposeModal = closeModal;
    function closeModal() {
      clearTimeout(feedbackTimer);
      disposeModal = null;
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      window.removeEventListener('keydown', handleKeyDown, true);
      document.dispatchEvent(new Event('security-keypad-close'));
    }

    function handleKeyDown(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat) return;
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key >= '0' && e.key <= '9') {
        if (!isProcessing && currentInput.length < 4) {
          if (sound && sound.playKeypadBeep) sound.playKeypadBeep();
          currentInput += e.key;
          renderDisplay();
        }
      } else if (e.key === 'Enter') {
        validateCode();
      } else if (e.key === 'Backspace') {
        if (!isProcessing) {
          if (sound && sound.playKeypadBeep) sound.playKeypadBeep();
          currentInput = currentInput.slice(0, -1);
          renderDisplay();
        }
      }
    }

    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };

    window.addEventListener('keydown', handleKeyDown, true);
  }

  return {
    mesh: group,
    isUnlocked: () => unlocked,
    dispose: () => {
      disposeModal?.();
      clearTimeout(feedbackTimer);
      group.removeFromParent();
      faceplateGeo.dispose();
      faceMat.dispose();
      faceTex.dispose();
      screenGeo.dispose();
      screenMat.dispose();
      screenMat.map.dispose();
      buttonGeo.dispose();
      buttonMat.dispose();
      buttonLabels.forEach(({ texture, material, geometry }) => {
        texture.dispose();
        material.dispose();
        geometry.dispose();
      });
      enterGeo.dispose();
      enterMat.dispose();
      ledGeo.dispose();
      ledMat.dispose();
    }
  };
}
