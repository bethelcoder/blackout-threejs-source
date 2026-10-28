import * as THREE from 'three';

/**
 * Backroom industrial furnishings for Level 1:
 * - Tall heavy storage shelves with parts bins and archive boxes (full standing cover)
 * - Industrial utility workbenches (crouch cover) with diagnostic gear and schematics
 * - Tall double-door utility cupboards / metal supply cabinets (full standing cover)
 * - Scattered papers, facility blueprints, and maintenance logs on floor and tables
 *
 * Strategically placed to break camera line-of-sight without obstructing navigation paths.
 * Highly optimized: shared geometries, shared canvas textures, unified Box3 colliders.
 */
export function buildBackroomProps({ scene, colliders }) {
  const group = new THREE.Group();
  group.name = 'Backroom Props & Furniture';

  const cleanupGeometries = [];
  const cleanupMaterials = [];
  const cleanupTextures = [];
  const propColliders = [];

  // =========================================================================
  // 1. SHARED CANVAS TEXTURES & MATERIALS
  // =========================================================================

  // Paper texture sheet (512x512) divided into 4 quadrants:
  // (0,0): Technical Blueprint | (1,0): Maintenance Work Order
  // (0,1): Confidential Facility Memo | (1,1): Handwritten Inspection Notes
  const paperCanvas = document.createElement('canvas');
  paperCanvas.width = 512;
  paperCanvas.height = 512;
  const pCtx = paperCanvas.getContext('2d');

  // Backgrounds
  pCtx.fillStyle = '#e8e6da'; // Aged paper
  pCtx.fillRect(0, 0, 512, 512);

  // Quadrant 1 (top-left, 0-256, 0-256): Blueprint
  pCtx.fillStyle = '#1e3852';
  pCtx.fillRect(10, 10, 236, 236);
  pCtx.strokeStyle = 'rgba(100, 180, 255, 0.4)';
  pCtx.lineWidth = 1;
  for (let x = 20; x < 240; x += 16) {
    pCtx.beginPath(); pCtx.moveTo(x, 15); pCtx.lineTo(x, 240); pCtx.stroke();
  }
  for (let y = 20; y < 240; y += 16) {
    pCtx.beginPath(); pCtx.moveTo(15, y); pCtx.lineTo(240, y); pCtx.stroke();
  }
  pCtx.strokeStyle = '#a6d4ff';
  pCtx.lineWidth = 2;
  pCtx.strokeRect(40, 50, 175, 150);
  pCtx.beginPath();
  pCtx.arc(128, 128, 36, 0, Math.PI * 2);
  pCtx.moveTo(40, 128); pCtx.lineTo(215, 128);
  pCtx.moveTo(128, 50); pCtx.lineTo(128, 200);
  pCtx.stroke();
  pCtx.fillStyle = '#ffffff';
  pCtx.font = 'bold 10px monospace';
  pCtx.fillText('SUBSTATION BUSBAR 11kV', 45, 42);

  // Quadrant 2 (top-right, 256-512, 0-256): Maintenance Work Order
  pCtx.fillStyle = '#f3f1e7';
  pCtx.fillRect(266, 10, 236, 236);
  pCtx.fillStyle = '#333333';
  pCtx.font = 'bold 11px monospace';
  pCtx.fillText('ESKOM MUNICIPAL - WORK ORDER', 275, 30);
  pCtx.fillStyle = '#aa2211';
  pCtx.fillRect(275, 36, 218, 2);
  pCtx.fillStyle = '#555555';
  pCtx.font = '8px monospace';
  for (let y = 52; y < 220; y += 14) {
    pCtx.fillText(`ITEM #${(y * 13) % 99 + 10} - TRANSFORMER OIL LEAK`, 278, y);
    pCtx.fillRect(278, y + 3, 212, 1);
  }
  // Red stamped seal
  pCtx.strokeStyle = '#cc2211';
  pCtx.lineWidth = 2;
  pCtx.strokeRect(360, 170, 100, 32);
  pCtx.fillStyle = '#cc2211';
  pCtx.font = 'bold 10px monospace';
  pCtx.fillText('STATUS: PENDING', 368, 190);

  // Quadrant 3 (bottom-left, 0-256, 256-512): Facility Directive Memo
  pCtx.fillStyle = '#ece8d8';
  pCtx.fillRect(10, 266, 236, 236);
  pCtx.fillStyle = '#111111';
  pCtx.font = 'bold 10px monospace';
  pCtx.fillText('STATION LOG - SECTOR 7', 20, 286);
  pCtx.fillStyle = '#666666';
  for (let y = 304; y < 480; y += 12) {
    const width = 160 + ((y * 7) % 55);
    pCtx.fillRect(20, y, width, 5);
  }
  pCtx.fillStyle = '#991111';
  pCtx.font = 'bold 12px monospace';
  pCtx.fillText('AI LOCKDOWN ACTIVE', 20, 480);

  // Quadrant 4 (bottom-right, 256-512, 256-512): Handwritten Checklist
  pCtx.fillStyle = '#f8f5ea';
  pCtx.fillRect(266, 266, 236, 236);
  pCtx.strokeStyle = '#c5d8ea';
  pCtx.lineWidth = 1;
  for (let y = 290; y < 490; y += 16) {
    pCtx.beginPath(); pCtx.moveTo(275, y); pCtx.lineTo(490, y); pCtx.stroke();
  }
  pCtx.strokeStyle = '#224488';
  pCtx.lineWidth = 1.5;
  for (let y = 302; y < 480; y += 32) {
    // Checkboxes and checkmarks
    pCtx.strokeRect(280, y - 8, 10, 10);
    pCtx.beginPath();
    pCtx.moveTo(281, y - 3); pCtx.lineTo(285, y + 1); pCtx.lineTo(293, y - 7);
    pCtx.stroke();
  }
  pCtx.fillStyle = '#223366';
  pCtx.font = '9px sans-serif';
  pCtx.fillText('Feeder Circuit A: NORMAL', 300, 304);
  pCtx.fillText('Battery Backup Cells: CHECKED', 300, 336);
  pCtx.fillText('Auxiliary Breakers: TESTED', 300, 368);
  pCtx.fillText('Emergency Bypass: KEY REQUIRED', 300, 400);

  const paperTexture = new THREE.CanvasTexture(paperCanvas);
  paperTexture.colorSpace = THREE.SRGBColorSpace;
  cleanupTextures.push(paperTexture);

  // Cabinet warning decal canvas (256x128)
  const decalCanvas = document.createElement('canvas');
  decalCanvas.width = 256;
  decalCanvas.height = 128;
  const dCtx = decalCanvas.getContext('2d');
  dCtx.fillStyle = '#d48a12';
  dCtx.fillRect(0, 0, 256, 128);
  dCtx.fillStyle = '#1a1a1a';
  dCtx.fillRect(8, 8, 240, 112);
  dCtx.fillStyle = '#ffaa00';
  dCtx.font = 'bold 22px monospace';
  dCtx.textAlign = 'center';
  dCtx.fillText('DANGER', 128, 42);
  dCtx.fillStyle = '#ffffff';
  dCtx.font = 'bold 13px monospace';
  dCtx.fillText('HIGH VOLTAGE SUPPLY', 128, 70);
  dCtx.font = '10px monospace';
  dCtx.fillText('AUTHORIZED PERSONNEL ONLY', 128, 92);
  const decalTexture = new THREE.CanvasTexture(decalCanvas);
  decalTexture.colorSpace = THREE.SRGBColorSpace;
  cleanupTextures.push(decalTexture);

  // Standard Materials
  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: 0x343c44,
    roughness: 0.65,
    metalness: 0.72,
  });
  const paintedMetalMat = new THREE.MeshStandardMaterial({
    color: 0x56626d,
    roughness: 0.72,
    metalness: 0.55,
  });
  const cupboardPaintMat = new THREE.MeshStandardMaterial({
    color: 0x47515a,
    roughness: 0.68,
    metalness: 0.58,
  });
  const woodTableMat = new THREE.MeshStandardMaterial({
    color: 0x5a4d3f,
    roughness: 0.88,
    metalness: 0.12,
  });
  const chromeHardwareMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.35,
    metalness: 0.85,
  });
  const binOrangeMat = new THREE.MeshStandardMaterial({
    color: 0xc86422,
    roughness: 0.6,
    metalness: 0.2,
  });
  const binBlueMat = new THREE.MeshStandardMaterial({
    color: 0x245582,
    roughness: 0.6,
    metalness: 0.2,
  });
  const binDarkMat = new THREE.MeshStandardMaterial({
    color: 0x22262a,
    roughness: 0.7,
    metalness: 0.4,
  });
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x0c251c,
    emissive: 0x187a55,
    emissiveIntensity: 0.8,
    roughness: 0.4,
    metalness: 0.5,
  });
  const paperMat = new THREE.MeshStandardMaterial({
    map: paperTexture,
    roughness: 0.95,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const decalMat = new THREE.MeshStandardMaterial({
    map: decalTexture,
    roughness: 0.6,
    metalness: 0.2,
  });

  cleanupMaterials.push(
    darkSteelMat, paintedMetalMat, cupboardPaintMat, woodTableMat,
    chromeHardwareMat, binOrangeMat, binBlueMat, binDarkMat, screenMat, paperMat, decalMat
  );

  // Common Unit Geometries for Instantiating
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
  cleanupGeometries.push(boxGeo, cylinderGeo);

  function addBox(parent, material, x, y, z, sx, sy, sz) {
    const mesh = new THREE.Mesh(boxGeo, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // =========================================================================
  // 2. INDUSTRIAL STORAGE SHELVES BUILDER (Full Standing Height Cover: ~2.85m)
  // =========================================================================
  function createStorageShelf({ x, z, rotationY = 0, width = 2.2, depth = 0.7, height = 2.85, theme = 'mixed' }) {
    const shelfGroup = new THREE.Group();
    shelfGroup.position.set(x, 0, z);
    shelfGroup.rotation.y = rotationY;

    const postSize = 0.06;
    const halfW = width / 2;
    const halfD = depth / 2;

    // 4 Corner Upright Posts
    for (const px of [-halfW + postSize / 2, halfW - postSize / 2]) {
      for (const pz of [-halfD + postSize / 2, halfD - postSize / 2]) {
        addBox(shelfGroup, darkSteelMat, px, height / 2, pz, postSize, height, postSize);
      }
    }

    // Horizontal Shelves (5 tiers)
    const shelfTiers = 5;
    const shelfThickness = 0.04;
    for (let i = 0; i < shelfTiers; i++) {
      const shelfY = 0.15 + (i / (shelfTiers - 1)) * (height - 0.35);
      // Main shelf plank
      addBox(shelfGroup, paintedMetalMat, 0, shelfY, 0, width - 0.02, shelfThickness, depth - 0.02);
      // Front and rear support lip
      for (const pz of [-halfD + 0.02, halfD - 0.02]) {
        addBox(shelfGroup, darkSteelMat, 0, shelfY - 0.02, pz, width, 0.04, 0.02);
      }
    }

    // Rear Cross-Bracing Struts (Visual fidelity & realism)
    const braceGeo = new THREE.BoxGeometry(0.025, Math.hypot(width, height * 0.7), 0.01);
    cleanupGeometries.push(braceGeo);
    const brace1 = new THREE.Mesh(braceGeo, darkSteelMat);
    brace1.position.set(0, height * 0.45, -halfD + 0.015);
    brace1.rotation.z = Math.atan2(height * 0.7, width);
    shelfGroup.add(brace1);
    const brace2 = new THREE.Mesh(braceGeo, darkSteelMat);
    brace2.position.set(0, height * 0.45, -halfD + 0.015);
    brace2.rotation.z = -Math.atan2(height * 0.7, width);
    shelfGroup.add(brace2);

    // Shelf Clutter Items
    // Tier 1 (bottom): Heavy battery packs & dark crates
    addBox(shelfGroup, binDarkMat, -halfW + 0.45, 0.35, 0, 0.65, 0.36, depth - 0.15);
    addBox(shelfGroup, binOrangeMat, halfW - 0.4, 0.32, 0, 0.55, 0.30, depth - 0.18);

    // Tier 2: Storage bins & parts containers
    addBox(shelfGroup, binBlueMat, -0.3, 0.85, -0.05, 0.5, 0.28, depth - 0.2);
    addBox(shelfGroup, binOrangeMat, 0.35, 0.83, 0.02, 0.45, 0.24, depth - 0.22);
    addBox(shelfGroup, binDarkMat, halfW - 0.3, 0.82, 0, 0.35, 0.22, depth - 0.24);

    // Tier 3: Technical archive file binders & document storage boxes
    for (let f = 0; f < 5; f++) {
      addBox(shelfGroup, f % 2 ? binBlueMat : paintedMetalMat, -halfW + 0.25 + f * 0.12, 1.48, 0, 0.09, 0.32, depth - 0.3);
    }
    addBox(shelfGroup, binDarkMat, 0.2, 1.46, 0, 0.52, 0.28, depth - 0.2);

    // Tier 4: Spare component coils / conduit boxes
    addBox(shelfGroup, paintedMetalMat, -0.4, 2.10, 0, 0.45, 0.18, depth - 0.25);
    addBox(shelfGroup, binOrangeMat, 0.35, 2.12, 0, 0.38, 0.22, depth - 0.22);

    // Tier 5 (top): Extra storage box
    addBox(shelfGroup, binBlueMat, -0.15, 2.70, 0, 0.55, 0.22, depth - 0.25);

    group.add(shelfGroup);

    // Solid Collider (Blocks player movement and camera raycasts completely)
    const shelfCollider = new THREE.Box3();
    const isRot = Math.abs(Math.sin(rotationY)) > 0.5;
    shelfCollider.setFromCenterAndSize(
      new THREE.Vector3(x, height / 2, z),
      new THREE.Vector3(
        isRot ? depth : width,
        height,
        isRot ? width : depth
      )
    );
    colliders.push(shelfCollider);
    propColliders.push(shelfCollider);
  }

  // =========================================================================
  // 3. TALL DOUBLE-DOOR UTILITY CUPBOARDS (Full Standing Cover: ~2.55m)
  // =========================================================================
  function createUtilityCupboard({ x, z, rotationY = 0, width = 1.4, depth = 0.65, height = 2.55 }) {
    const cupboardGroup = new THREE.Group();
    cupboardGroup.position.set(x, 0, z);
    cupboardGroup.rotation.y = rotationY;

    // Recessed Base / Plinth
    addBox(cupboardGroup, darkSteelMat, 0, 0.06, 0, width - 0.06, 0.12, depth - 0.06);

    // Main Cabinet Body
    addBox(cupboardGroup, cupboardPaintMat, 0, height / 2 + 0.06, 0, width, height - 0.12, depth);

    // Top Header Lip
    addBox(cupboardGroup, darkSteelMat, 0, height + 0.015, 0, width + 0.04, 0.03, depth + 0.04);

    // Double Doors Division & Seams
    const doorHalfW = (width - 0.06) / 2;
    for (const side of [-1, 1]) {
      const doorX = side * (doorHalfW / 2 + 0.01);
      // Inset door panel
      addBox(cupboardGroup, paintedMetalMat, doorX, height / 2 + 0.06, depth / 2 + 0.012, doorHalfW - 0.02, height - 0.22, 0.024);
      // Chrome Handle / Latch
      addBox(cupboardGroup, chromeHardwareMat, side * 0.08, 1.25, depth / 2 + 0.04, 0.03, 0.18, 0.035);
      // Ventilation Louver Slats (Upper door ventilation)
      for (let s = 0; s < 5; s++) {
        addBox(cupboardGroup, darkSteelMat, doorX, 1.95 + s * 0.05, depth / 2 + 0.025, doorHalfW - 0.16, 0.018, 0.012);
      }
    }

    // High Voltage Warning Decal Placard
    const decalMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.21), decalMat);
    decalMesh.position.set(0, 1.65, depth / 2 + 0.026);
    cupboardGroup.add(decalMesh);

    group.add(cupboardGroup);

    // Solid Collider
    const cupboardCollider = new THREE.Box3();
    const isRot = Math.abs(Math.sin(rotationY)) > 0.5;
    cupboardCollider.setFromCenterAndSize(
      new THREE.Vector3(x, height / 2, z),
      new THREE.Vector3(
        isRot ? depth : width,
        height,
        isRot ? width : depth
      )
    );
    colliders.push(cupboardCollider);
    propColliders.push(cupboardCollider);
  }

  // =========================================================================
  // 4. INDUSTRIAL WORKBENCH TABLES (Crouch Cover: ~0.95m - 1.05m)
  // =========================================================================
  function createWorkbenchTable({ x, z, rotationY = 0, width = 2.2, depth = 1.0, height = 0.92 }) {
    const tableGroup = new THREE.Group();
    tableGroup.position.set(x, 0, z);
    tableGroup.rotation.y = rotationY;

    const legSize = 0.07;
    const halfW = width / 2;
    const halfD = depth / 2;
    const tableTopThickness = 0.06;

    // Heavy Top Slab
    addBox(tableGroup, woodTableMat, 0, height - tableTopThickness / 2, 0, width, tableTopThickness, depth);

    // Steel Table Apron / Perimeter Frame
    for (const pz of [-halfD + 0.04, halfD - 0.04]) {
      addBox(tableGroup, darkSteelMat, 0, height - tableTopThickness - 0.04, pz, width - 0.14, 0.08, 0.03);
    }
    for (const px of [-halfW + 0.04, halfW - 0.04]) {
      addBox(tableGroup, darkSteelMat, px, height - tableTopThickness - 0.04, 0, 0.03, 0.08, depth - 0.14);
    }

    // 4 Heavy Tubular Steel Legs
    for (const lx of [-halfW + legSize / 2 + 0.03, halfW - legSize / 2 - 0.03]) {
      for (const lz of [-halfD + legSize / 2 + 0.03, halfD - legSize / 2 - 0.03]) {
        addBox(tableGroup, darkSteelMat, lx, (height - tableTopThickness) / 2, lz, legSize, height - tableTopThickness, legSize);
      }
    }

    // Bottom Stiffener H-Frame Rail (Acts as footrest & camera vision blocker)
    addBox(tableGroup, darkSteelMat, 0, 0.16, 0, width - 0.16, 0.05, 0.05);
    for (const lx of [-halfW + 0.06, halfW - 0.06]) {
      addBox(tableGroup, darkSteelMat, lx, 0.16, 0, 0.05, 0.05, depth - 0.16);
    }

    // --- Tabletop Equipment & Clutter ---
    // 1. Diagnostic Oscilloscope / Test Terminal Unit
    const scopeX = -halfW + 0.45;
    const scopeZ = -0.15;
    const scopeY = height + 0.14;
    addBox(tableGroup, darkSteelMat, scopeX, scopeY, scopeZ, 0.48, 0.28, 0.38);
    // Bezel screen
    const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.18), screenMat);
    screenMesh.position.set(scopeX, scopeY + 0.02, scopeZ + 0.191);
    tableGroup.add(screenMesh);
    // Control knobs & dials
    for (let k = 0; k < 3; k++) {
      addBox(tableGroup, chromeHardwareMat, scopeX - 0.12 + k * 0.12, scopeY - 0.09, scopeZ + 0.195, 0.04, 0.04, 0.02);
    }

    // 2. Blueprint Spread Out on the Tabletop
    createPaperSheet(tableGroup, 0.15, height + 0.002, 0.05, 0.65, 0.45, 0.12, 0, 0); // Quadrant 1 (blueprint)

    // 3. Technical Log Clipboard
    addBox(tableGroup, woodTableMat, halfW - 0.42, height + 0.015, -0.15, 0.24, 0.02, 0.34);
    createPaperSheet(tableGroup, halfW - 0.42, height + 0.026, -0.15, 0.20, 0.28, 0.0, 1, 0); // Quadrant 2 (work order)
    addBox(tableGroup, chromeHardwareMat, halfW - 0.42, height + 0.035, -0.28, 0.08, 0.015, 0.04); // Clip

    // 4. Overturned Small Parts Cup / Tool Tray
    addBox(tableGroup, binDarkMat, 0.55, height + 0.04, 0.25, 0.22, 0.08, 0.16);

    group.add(tableGroup);

    // Solid Collider (Blocks player movement and camera raycasts)
    const tableCollider = new THREE.Box3();
    const isRot = Math.abs(Math.sin(rotationY)) > 0.5;
    tableCollider.setFromCenterAndSize(
      new THREE.Vector3(x, height / 2, z),
      new THREE.Vector3(
        isRot ? depth : width,
        height,
        isRot ? width : depth
      )
    );
    colliders.push(tableCollider);
    propColliders.push(tableCollider);
  }

  // Helper: create a paper sheet with quadrant UV mapping
  function createPaperSheet(parent, px, py, pz, width, height, rotY, quadX = 0, quadY = 0) {
    const geo = new THREE.PlaneGeometry(width, height);
    // Custom UVs to select 1 of 4 quadrants from paperCanvas
    const uvs = geo.attributes.uv;
    const uMin = quadX * 0.5;
    const uMax = uMin + 0.5;
    const vMin = (1 - quadY) * 0.5 - 0.5;
    const vMax = vMin + 0.5;
    // PlaneGeometry vertices: top-left, top-right, bottom-left, bottom-right
    uvs.setXY(0, uMin, vMax);
    uvs.setXY(1, uMax, vMax);
    uvs.setXY(2, uMin, vMin);
    uvs.setXY(3, uMax, vMin);
    uvs.needsUpdate = true;
    cleanupGeometries.push(geo);

    const mesh = new THREE.Mesh(geo, paperMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rotY;
    mesh.position.set(px, py, pz);
    mesh.receiveShadow = true;
    // Visual aid only: do not block interaction raycasts
    mesh.raycast = () => {};
    parent.add(mesh);
    return mesh;
  }

  // =========================================================================
  // 5. SCATTERED PAPERS ON THE FLOOR
  // =========================================================================
  function scatterPapers(count, centerX, centerZ, spreadX, spreadZ) {
    let seed = 371 + centerX * 11 + centerZ * 17;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    for (let i = 0; i < count; i++) {
      const offsetX = (rand() - 0.5) * spreadX * 2;
      const offsetZ = (rand() - 0.5) * spreadZ * 2;
      const px = centerX + offsetX;
      const pz = centerZ + offsetZ;
      const py = 0.015 + (i * 0.001); // Avoid z-fighting

      const pWidth = 0.28 + rand() * 0.08;
      const pHeight = 0.38 + rand() * 0.08;
      const rot = (rand() - 0.5) * Math.PI * 1.8;

      const qX = rand() > 0.5 ? 1 : 0;
      const qY = rand() > 0.5 ? 1 : 0;

      createPaperSheet(group, px, py, pz, pWidth, pHeight, rot, qX, qY);
    }
  }

  // =========================================================================
  // 6. STRATEGIC PLACEMENT ACROSS LEVEL 1
  // =========================================================================

  // ZONE 1: Mid-Room Left Cover Station (Records & Diagnostics Bay)
  // -------------------------------------------------------------------------
  // Heavy workbench table providing crouch cover
  createWorkbenchTable({ x: -2.8, z: 3.8, rotationY: 0, width: 2.2, depth: 1.0 });
  // Tall industrial storage shelf providing full standing cover
  createStorageShelf({ x: -3.2, z: 1.0, rotationY: 0, width: 2.2, depth: 0.7, height: 2.45 });
  // Scattered papers around the table and shelf
  scatterPapers(14, -2.9, 2.5, 1.4, 1.6);

  // ZONE 2: Mid-Room Right Cover Bay (Maintenance Supplies in front of Stairs)
  // -------------------------------------------------------------------------
  // Tall double-door utility cupboard (full standing cover from camera sweep)
  createUtilityCupboard({ x: 2.4, z: 1.8, rotationY: 0, width: 1.4, depth: 0.65, height: 2.35 });
  // Secondary storage shelf along the right bay
  createStorageShelf({ x: 3.1, z: -1.6, rotationY: Math.PI / 2, width: 2.0, depth: 0.65, height: 2.4 });
  // Scattered papers in the right supply area
  scatterPapers(10, 2.7, 0.4, 0.9, 1.3);

  // ZONE 3: Forward Approach Cover (Near Exit Double Doors & Security Keypad)
  // -------------------------------------------------------------------------
  // Tall utility cupboard protecting the left approach to the exit
  createUtilityCupboard({ x: -2.7, z: -6.2, rotationY: 0, width: 1.4, depth: 0.65, height: 2.4 });
  // Workbench table on the right approach before the exit
  createWorkbenchTable({ x: 2.5, z: -6.0, rotationY: 0, width: 2.0, depth: 0.95 });
  // Additional high shelf on the left wall to form an archive nook
  createStorageShelf({ x: -4.5, z: -6.2, rotationY: 0, width: 1.8, depth: 0.65, height: 2.4 });
  // Scattered blueprints and work orders near the exit staging area
  scatterPapers(16, -2.8, -5.2, 1.5, 1.5);
  scatterPapers(8, 2.4, -5.0, 1.0, 1.0);

  // ZONE 4: Entrance Corridor Trails (Atmospheric storytelling)
  // -------------------------------------------------------------------------
  scatterPapers(6, 0.4, 6.2, 0.8, 0.8);

  return {
    group,
    colliders: propColliders,
    dispose() {
      group.removeFromParent();
      cleanupGeometries.forEach((g) => g.dispose());
      cleanupMaterials.forEach((m) => m.dispose());
      cleanupTextures.forEach((t) => t.dispose());
    },
  };
}
