// design.js — Level 2 industrial substation dressing (built from the reference image).
//
// Layout (room is 14 x 16 x 4.2; x = left/right, z = back(-8)/front(+8)):
//   LEFT WALL   4 tall cabinets (back), workbench + pegboard + lamp + tool trolley, shelving, cabinet, crates
//   BACK WALL   server rack bank, clock, first-aid signs, fire cabinet + extinguisher
//   RIGHT WALL  two full-height lockers around the laser button, second workstation (left of LK-A), steel ladder,
//               cork notice board, drum reels, transport cases + toolbox
//   FLOOR       drain grate, cross trench, rubber mat, hazard tape, grime and wet patches
// Deliberately NOT built (red-lined in the reference): the back-wall workstation and the right-side
// desk / chair / computer / filing cabinets / middle tall cabinet. The existing console desk stays in level2.js.
//
// NOTE: furniture on the left wall sits where the laser beams start (x = -6.88). laserSecurity.js needs the
// one-line patch that skips occluders containing a beam's start point (see reply).

import * as THREE from 'three';

// ------------------------------------------------------------------ helpers
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// ------------------------------------------------------------------ procedural textures
function cabinetTexture(seed, panel, label, cw, ch) {
  return canvasTex(cw, ch, (g, w, h) => {
    const r = seeded(seed);
    g.fillStyle = '#596168'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.04})`; g.fillRect(r() * w, 0, 1, h); }
    g.strokeStyle = '#23292e'; g.lineWidth = 5; g.strokeRect(5, 5, w - 10, h - 10);
    g.beginPath(); g.moveTo(w / 2, 5); g.lineTo(w / 2, h - 5); g.stroke();
    g.fillStyle = '#12161a';                                              // louvre vents, top + bottom
    for (const y0 of [0.05, 0.8]) for (let k = 0; k < 8; k++) g.fillRect(w * 0.12, h * (y0 + k * 0.022), w * 0.76, h * 0.011);
    g.fillStyle = '#aab0b5';
    g.fillRect(w * 0.43, h * 0.52, w * 0.03, h * 0.09); g.fillRect(w * 0.54, h * 0.52, w * 0.03, h * 0.09);
    g.fillStyle = '#d6a900'; g.beginPath();                               // warning triangle
    g.moveTo(w * 0.18, h * 0.34); g.lineTo(w * 0.3, h * 0.34); g.lineTo(w * 0.24, h * 0.27); g.fill();
    g.fillStyle = 'rgba(225,225,215,0.8)'; g.textAlign = 'center';
    g.font = `bold ${Math.round(w * 0.11)}px monospace`; g.fillText(label, w / 2, h * 0.2);
    if (panel) {
      g.fillStyle = '#08262e'; g.fillRect(w * 0.18, h * 0.38, w * 0.64, h * 0.12);
      g.fillStyle = '#4fe3ff'; g.font = `${Math.round(w * 0.06)}px monospace`; g.textAlign = 'left';
      ['TEMP 61C', 'LOAD 78%', 'STATUS OK'].forEach((l, i) => g.fillText(l, w * 0.21, h * 0.415 + i * h * 0.03));
      ['#d33', '#3d3', '#fa2'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(w * (0.3 + i * 0.2), h * 0.66, w * 0.04, 0, 6.28); g.fill(); });
    }
    for (let i = 0; i < 30; i++) {
      g.fillStyle = `rgba(10,8,5,${0.05 + r() * 0.1})`;
      g.fillRect(r() * w, r() * h * 0.6, 2 + r() * 6, h * 0.2 + r() * h * 0.5);
    }
    const rust = g.createLinearGradient(0, h * 0.8, 0, h);
    rust.addColorStop(0, 'rgba(110,60,25,0)'); rust.addColorStop(1, 'rgba(110,60,25,0.45)');
    g.fillStyle = rust; g.fillRect(0, h * 0.8, w, h * 0.2);
  });
}

function rackTexture(seed, cw, ch) {
  return canvasTex(cw, ch, (g, w, h) => {
    const r = seeded(seed);
    g.fillStyle = '#0f1316'; g.fillRect(0, 0, w, h);
    const units = 14, uh = h / units;
    for (let i = 0; i < units; i++) {
      const y = i * uh, kind = r();
      g.fillStyle = '#1b2227'; g.fillRect(6, y + 3, w - 12, uh - 6);
      if (kind < 0.5) {
        for (let k = 0; k < 10; k++) {
          g.fillStyle = r() < 0.7 ? '#39a0ff' : (r() < 0.5 ? '#bfe8ff' : '#2a3a46');
          g.fillRect(14 + k * ((w - 40) / 10), y + uh * 0.35, 5, 5);
        }
      } else if (kind < 0.8) {
        g.fillStyle = '#0a0d10';
        for (let k = 0; k < 5; k++) g.fillRect(12, y + 6 + k * (uh - 12) / 5, w - 24, 2);
      } else {
        g.fillStyle = '#103a52'; g.fillRect(12, y + 6, w - 24, uh - 12);
        g.fillStyle = '#5ccfff'; g.fillRect(16, y + 9, r() * (w - 40), 3);
      }
    }
    g.fillStyle = '#2a3238'; g.fillRect(0, 0, 5, h); g.fillRect(w - 5, 0, 5, h);
  });
}

function metalTexture(base, rust, seed) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = seeded(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(255,255,255,${r() * 0.05})`; g.fillRect(r() * w, 0, 1, h);
      g.fillStyle = `rgba(0,0,0,${r() * 0.08})`; g.fillRect(r() * w, 0, 1, h);
    }
    for (let i = 0; i < 1200 * rust; i++) {
      g.fillStyle = `rgba(${150 + r() * 50},${70 + r() * 40},${20 + r() * 20},${r() * 0.4})`;
      g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 4, 0, 6.28); g.fill();
    }
  });
}

function grateTexture(rx, ry) {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#0b0b0b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2b2d2f';
    for (let i = 0; i < w; i += 16) { g.fillRect(i, 0, 3, h); g.fillRect(0, i, w, 3); }
  }, [rx, ry]);
}

function floorGrimeTexture() {
  return canvasTex(512, 512, (g, w, h) => {
    const r = seeded(77);
    for (let i = 0; i < 70; i++) {
      const x = r() * w, y = r() * h, rad = 25 + r() * 90;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, `rgba(0,0,0,${0.12 + r() * 0.18})`); grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
    }
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y);
      for (let j = 0; j < 9; j++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; g.lineTo(x, y); }
      g.stroke();
    }
  });
}

function pegboardTexture() {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#5f5240'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let x = 8; x < w; x += 16) for (let y = 8; y < h; y += 16) g.fillRect(x, y, 3, 3);
    g.lineCap = 'round';
    g.strokeStyle = '#b5bcc2'; g.lineWidth = 6;                                   // wrenches
    [[40, 30, 40, 150], [80, 40, 80, 170], [120, 30, 120, 140]].forEach(([a, b, c, d]) => {
      g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke();
      g.beginPath(); g.arc(a, b, 10, 0, 6.28); g.stroke();
    });
    g.strokeStyle = '#7a4a22'; g.lineWidth = 8; g.beginPath(); g.moveTo(190, 150); g.lineTo(190, 50); g.stroke(); // hammer
    g.fillStyle = '#8c949a'; g.fillRect(168, 30, 44, 18);
    g.strokeStyle = '#cc2222'; g.lineWidth = 7;                                    // coils + pliers
    g.beginPath(); g.arc(290, 80, 36, 0, 6.28); g.stroke();
    g.beginPath(); g.arc(380, 100, 26, 0, 6.28); g.stroke();
    g.strokeStyle = '#d97a1a'; g.lineWidth = 8;
    g.beginPath(); g.moveTo(450, 40); g.lineTo(430, 160); g.moveTo(470, 40); g.lineTo(490, 160); g.stroke();
    g.strokeStyle = '#d9d9d9'; g.lineWidth = 4;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(230 + i * 22, 170); g.lineTo(230 + i * 22, 230); g.stroke(); }
  });
}

function corkTexture() {
  return canvasTex(512, 512, (g) => {
    const r = seeded(431);
    g.fillStyle = '#ab8050'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 35000; i++) {
      g.fillStyle = i % 2 ? 'rgba(62,38,18,0.25)' : 'rgba(233,197,140,0.3)';
      g.fillRect(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 3);
    }
  });
}

function woodGrainTexture() {
  return canvasTex(512, 512, (g) => {
    const r = seeded(57);
    g.fillStyle = '#75452c'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 180; i++) {
      g.fillStyle = i % 2 ? 'rgba(34,17,9,0.2)' : 'rgba(205,141,83,0.15)';
      g.fillRect(0, r() * 512, 512, 1 + r() * 3);
    }
  });
}

function paperTexture(title, text, color, kind, seed) {
  return canvasTex(256, 320, (g, w, h) => {
    const r = seeded(seed);
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.fillStyle = '#403b30'; g.font = 'bold 16px monospace'; g.fillText(title, 14, 32);
    g.fillStyle = '#77654e'; g.fillRect(14, 42, w - 28, 2);
    if (kind === 'diagram') {                                              // hand-drawn single line sketch
      g.strokeStyle = '#2a2a2a'; g.lineWidth = 2; g.beginPath();
      g.moveTo(18, 84); g.lineTo(w - 18, 84);
      for (const x of [45, 105, 165, 220]) { g.moveTo(x, 84); g.lineTo(x, 150); g.moveTo(x, 164); g.lineTo(x, 200); }
      g.stroke();
      for (const x of [45, 105, 165, 220]) { g.strokeRect(x - 7, 150, 14, 14); g.beginPath(); g.arc(x, 214, 13, 0, 6.28); g.stroke(); }
      g.fillStyle = '#464137'; g.font = '12px monospace';
      g.fillText('BUS A  11 kV', 18, 72); ['F1', 'F2', 'F3', 'F4'].forEach((l, i) => g.fillText(l, 36 + i * 58, 250));
    } else {
      g.fillStyle = '#464137'; g.font = '14px monospace';
      let line = '', y = 74;
      for (const word of text.split(' ')) {
        const next = line ? `${line} ${word}` : word;
        if (g.measureText(next).width > w - 28 && line) { g.fillText(line, 14, y); y += 21; line = word; } else line = next;
      }
      g.fillText(line, 14, y);
    }
    g.strokeStyle = 'rgba(93,75,45,0.14)';
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(0, h * (0.3 + r() * 0.5)); g.lineTo(w, h * (0.3 + r() * 0.5)); g.stroke(); }
  });
}

function plankTexture(seed) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = seeded(seed);
    g.fillStyle = '#8a6a45'; g.fillRect(0, 0, w, h);
    const planks = 5, ph = h / planks;
    for (let i = 0; i < planks; i++) {
      const y = i * ph;
      g.fillStyle = r() < 0.5 ? 'rgba(60,40,20,0.18)' : 'rgba(190,150,100,0.18)'; g.fillRect(0, y, w, ph);
      for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(40,25,10,${0.05 + r() * 0.12})`; g.fillRect(r() * w, y + r() * ph, 20 + r() * 80, 1); }
      if (r() < 0.6) { g.fillStyle = 'rgba(40,25,10,0.5)'; g.beginPath(); g.ellipse(r() * w, y + ph / 2, 6, 3.5, 0, 0, 6.28); g.fill(); }
      g.fillStyle = 'rgba(20,12,5,0.75)'; g.fillRect(0, y, w, 3);
    }
    g.fillStyle = 'rgba(30,30,30,0.7)'; g.font = 'bold 24px monospace'; g.textAlign = 'center';
    g.fillText(['FRAGILE', 'TX PARTS', 'HV GEAR'][seed % 3], w / 2, h * 0.58);
  });
}

function caseTexture(seed) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = seeded(seed);
    g.fillStyle = '#4f5b3b'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '20,25,12' : '120,135,90'},0.12)`; g.fillRect(r() * w, r() * h, 2, 2); }
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, h * 0.3, w, 4);                        // lid seam
    g.fillStyle = 'rgba(210,215,190,0.8)'; g.font = 'bold 22px monospace'; g.textAlign = 'center';
    g.fillText(['FUSE KIT 12', 'SPARE RELAYS', 'CABLE LUGS'][seed % 3], w / 2, h * 0.62);
    g.font = '14px monospace'; g.fillText(`NO. ${400 + seed * 7}`, w / 2, h * 0.78);
    g.strokeStyle = 'rgba(200,205,180,0.25)'; g.lineWidth = 2;
    for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(r() * w, r() * h); g.lineTo(r() * w, r() * h); g.stroke(); }
  });
}

function monitorTexture() {
  return canvasTex(256, 200, (g, w, h) => {
    g.fillStyle = '#031418'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#4fe3ff'; g.font = '13px monospace'; g.textAlign = 'left';
    ['SCADA  BUS-A 11.2kV', 'FEEDER 4  TRIPPED', 'T1 61C   T2 58C', 'ALARMS: 3 UNACK'].forEach((l, i) => g.fillText(l, 10, 22 + i * 18));
    g.strokeStyle = '#4fe3ff'; g.beginPath();
    for (let x = 0; x < w - 20; x += 5) { const y = 150 + Math.sin(x * 0.07) * 18 + Math.sin(x * 0.31) * 5; x ? g.lineTo(10 + x, y) : g.moveTo(10 + x, y); }
    g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
  });
}

function clockTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#1b1b1b'; g.beginPath(); g.arc(64, 64, 62, 0, 6.28); g.fill();
    g.fillStyle = '#d9d6c8'; g.beginPath(); g.arc(64, 64, 55, 0, 6.28); g.fill();
    g.strokeStyle = '#222'; g.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * 6.283; g.beginPath();
      g.moveTo(64 + Math.sin(a) * 46, 64 - Math.cos(a) * 46); g.lineTo(64 + Math.sin(a) * 54, 64 - Math.cos(a) * 54); g.stroke();
    }
    g.lineWidth = 5; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.sin(0.34) * 28, 64 - Math.cos(0.34) * 28); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.sin(1.0) * 42, 64 - Math.cos(1.0) * 42); g.stroke();
  });
}

function signTexture(kind) {
  return canvasTex(128, 128, (g, w, h) => {
    if (kind === 'aid') {
      g.fillStyle = '#1f8f4a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.fillRect(50, 20, 28, 88); g.fillRect(20, 50, 88, 28);
    } else {
      g.fillStyle = '#a3201a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.font = 'bold 34px monospace'; g.textAlign = 'center'; g.fillText('FIRE', 64, 52);
      g.font = '14px monospace'; g.fillText('EXTINGUISHER', 64, 80);
    }
  });
}

// ================================================================== builder
export function buildLevel2Design({ scene, hud, includeRightFurniture = true, includeCeiling = true }) {
  const group = new THREE.Group();
  group.name = 'Level 2 — Industrial Substation';
  scene.add(group);

  const colliders = [], textures = [], updaters = [];
  const T = (t) => { textures.push(t); return t; };
  const R = seeded(2024);
  const put = (geo, mat, x, y, z, parent = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const block = (w, h, d, mat, x, y, z, parent) => put(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  const solid = (w, h, d, x, y, z) => colliders.push(
    new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, y, z), new THREE.Vector3(w, h, d)));
  const flat = (w, d, mat, x, y, z) => { const m = put(new THREE.PlaneGeometry(w, d), mat, x, y, z); m.rotation.x = -Math.PI / 2; return m; };

  // ---- materials ----
  const darkMetal = new THREE.MeshStandardMaterial({ map: T(metalTexture('#2a2a2a', 0.4, 456)), roughness: 0.6, metalness: 0.7 });
  const lightMetal = new THREE.MeshStandardMaterial({ map: T(metalTexture('#4a4a4a', 0.1, 789)), roughness: 0.5, metalness: 0.6 });
  const cabSide = new THREE.MeshStandardMaterial({ color: 0x4b5258, roughness: 0.7, metalness: 0.5 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.95 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.9 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x5f4a30, roughness: 0.95 });
  const greenCrate = new THREE.MeshStandardMaterial({ color: 0x4d5a3a, roughness: 0.8, metalness: 0.2 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xc4501c, roughness: 0.7, metalness: 0.2 });
  const paper = new THREE.MeshStandardMaterial({ color: 0xd8d2bd, roughness: 0.95 });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.95 });

  // ---- lighting: cold ambient, flickering overhead, warm bench lamp, red emergency wash, blue rack glow ----
  group.add(new THREE.AmbientLight(0x404858, 0.45));
  group.add(new THREE.HemisphereLight(0x8fa8b8, 0x1a1a1a, 0.55));
  const flicker = new THREE.PointLight(0xffeedd, 8, 15, 1.2); flicker.position.set(0, 3.5, 0); group.add(flicker);
  const benchLight = new THREE.PointLight(0xffcc88, 6, 8, 1.5); benchLight.position.set(-6.0, 2.5, 1.1); group.add(benchLight);
  const emergency = new THREE.PointLight(0xff3a1a, 4, 10, 1.4); emergency.position.set(3.5, 3.0, -6.5); group.add(emergency);
  const rackGlow = new THREE.PointLight(0x3a8cff, 4, 6, 1.6); rackGlow.position.set(-3.9, 1.8, -6.6); group.add(rackGlow);
  let tAcc = 0;
  updaters.push((delta) => {
    tAcc += delta;
    const wobble = 0.8 + 0.2 * Math.sin(tAcc * 15.3) + 0.1 * Math.sin(tAcc * 31.7);
    flicker.intensity = Math.random() < 0.02 ? 2 : 8 * wobble;
    benchLight.intensity = Math.random() < 0.01 ? 3 : 6;
    emergency.intensity = 3.5 + 0.8 * Math.sin(tAcc * 2.5);
  });

  // ---- tall cabinet (left wall faces +x, right wall faces -x) ----
  function cabinet({ x, z, w, h, d, dir, label, panel, seed }) {
    const cw = 256, ch = Math.round(256 * h / w);
    const face = new THREE.MeshStandardMaterial({ map: T(cabinetTexture(seed, panel, label, cw, ch)), roughness: 0.65, metalness: 0.5 });
    const mats = [cabSide, cabSide, cabSide, cabSide, cabSide, cabSide];
    mats[dir > 0 ? 0 : 1] = face;
    const m = put(new THREE.BoxGeometry(d, h, w), mats, x, h / 2, z);
    m.castShadow = true;
    solid(d, h, w, x, h / 2, z);
  }

  // ---- shared prop helpers: axis-aligned colliders for rotated boxes, transport cases, wooden crates ----
  const solidRot = (w, h, d, x, y, z, ry) => solid(
    Math.abs(w * Math.cos(ry)) + Math.abs(d * Math.sin(ry)), h,
    Math.abs(w * Math.sin(ry)) + Math.abs(d * Math.cos(ry)), x, y, z);
  const steel = new THREE.MeshStandardMaterial({ color: 0xb8c0c8, roughness: 0.4, metalness: 0.7 });
  const caseMats = [0, 1, 2].map((i) => new THREE.MeshStandardMaterial({ map: T(caseTexture(i + 1)), roughness: 0.75, metalness: 0.25 }));
  const plankMats = [0, 1, 2].map((i) => new THREE.MeshStandardMaterial({ map: T(plankTexture(i + 3)), roughness: 0.9 }));
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x6b5236, roughness: 0.9 });

  // Olive transport case: w along x, d along z. Latches on the long sides, handles on the ends, ribbed lid.
  function transportCase(x, y, z, w, h, d, ry = 0, parent = group, collide = true, variant = 0) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
    const mat = caseMats[variant % 3];
    block(w, h, d, mat, 0, 0, 0, g);
    block(w + 0.02, h * 0.1, d + 0.02, mat, 0, h * 0.2, 0, g);
    for (const dz of [-d * 0.25, d * 0.25]) block(w * 0.9, 0.02, 0.05, mat, 0, h / 2 + 0.01, dz, g);
    for (const sx of [-1, 1]) for (const dz of [-d * 0.28, d * 0.28]) block(0.03, h * 0.22, 0.07, steel, sx * (w / 2 + 0.012), h * 0.2, dz, g);
    for (const sz of [-1, 1]) block(w * 0.4, 0.03, 0.04, steel, 0, h * 0.1, sz * (d / 2 + 0.022), g);
    if (collide) solidRot(w, h, d, x, y, z, ry);
    return g;
  }

  // Wooden shipping crate: plank faces, corner posts, frame battens and a diagonal brace.
  function woodCrate(x, y, z, s, ry = 0, collide = true, variant = 0) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; group.add(g);
    block(s, s, s, plankMats[variant % 3], 0, 0, 0, g);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) block(0.09, s, 0.09, beamMat, sx * s / 2, 0, sz * s / 2, g);
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) block(s + 0.09, 0.08, 0.08, beamMat, 0, sy * (s / 2 - 0.04), sz * s / 2, g);
      for (const sx of [-1, 1]) block(0.08, 0.08, s + 0.09, beamMat, sx * s / 2, sy * (s / 2 - 0.04), 0, g);
    }
    for (const sz of [-1, 1]) { const brace = block(0.07, s * 1.25, 0.03, beamMat, 0, 0, sz * (s / 2 + 0.015), g); brace.rotation.z = 0.75; }
    if (collide) solidRot(s, s, s, x, y, z, ry);
    return g;
  }

  // =========================== LEFT WALL ===========================
  // Four tall cabinets against the back half of the wall (beam starts at z -5 and -3.5 sit inside them).
  [-7.0, -5.55, -4.1, -2.65].forEach((z, i) =>
    cabinet({ x: -6.5, z, w: 1.4, h: 3.5, d: 1.0, dir: 1, label: `TX-0${i + 1}`, panel: i === 3, seed: 100 + i }));

  // Workbench running along the wall, pegboard above, wall lamp, trolley, mat, stool.
  const bench = new THREE.Group(); bench.position.set(-6.45, 0, 1.1); group.add(bench);
  block(0.8, 0.08, 2.6, lightMetal, 0, 0.9, 0, bench);
  for (const dz of [-1.2, 1.2]) for (const dx of [-0.35, 0.35]) block(0.07, 0.9, 0.07, darkMetal, dx, 0.45, dz, bench);
  block(0.7, 0.05, 2.4, darkMetal, 0, 0.3, 0, bench);
  for (let i = 0; i < 7; i++) {                                                  // tools on the bench
    const tool = new THREE.Group();
    tool.position.set((R() - 0.5) * 0.4, 0.97, -1.0 + i * 0.33); tool.rotation.y = R() * Math.PI;
    const shaft = put(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.3 }), 0, 0, 0, tool);
    shaft.rotation.x = Math.PI / 2;
    const handle = put(new THREE.CylinderGeometry(0.025, 0.025, 0.09, 6), new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 0.8 }), 0, 0, -0.15, tool);
    handle.rotation.x = Math.PI / 2;
    bench.add(tool);
  }
  block(0.3, 0.02, 0.22, paper, 0.1, 0.95, 0.4, bench);
  solid(0.8, 1.0, 2.6, -6.45, 0.5, 1.1);

  const peg = put(new THREE.PlaneGeometry(2.4, 1.1), new THREE.MeshStandardMaterial({ map: T(pegboardTexture()), roughness: 0.9 }), -6.96, 1.8, 1.1);
  peg.rotation.y = Math.PI / 2;

  const lamp = new THREE.Group(); lamp.position.set(-6.82, 2.6, 1.1); group.add(lamp);
  const arm = block(0.4, 0.03, 0.03, darkMetal, 0.2, 0, 0, lamp);
  const head = put(new THREE.ConeGeometry(0.12, 0.18, 10), darkMetal, 0.42, -0.06, 0, lamp); head.rotation.z = Math.PI;
  put(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffdd88 }), 0.42, -0.12, 0, lamp);

  const trolley = new THREE.Group(); trolley.position.set(-5.3, 0, -0.9); group.add(trolley);
  block(0.55, 0.95, 0.7, new THREE.MeshStandardMaterial({ color: 0x23282c, roughness: 0.6, metalness: 0.6 }), 0, 0.5, 0, trolley);
  for (let i = 0; i < 5; i++) block(0.02, 0.1, 0.62, lightMetal, 0.285, 0.2 + i * 0.16, 0, trolley);
  solid(0.55, 1.0, 0.7, -5.3, 0.5, -0.9);

  flat(1.3, 2.2, rubber, -5.35, 0.006, 1.1);
  const stool = new THREE.Group(); stool.position.set(-5.5, 0, 1.6); group.add(stool);
  put(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12), rubber, 0, 0.65, 0, stool);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2;
    put(new THREE.CylinderGeometry(0.015, 0.015, 0.65, 6), darkMetal, Math.cos(a) * 0.15, 0.325, Math.sin(a) * 0.15, stool);
  }

  // Shelving unit with green crates, orange cable coils and paperwork.
  const shelf = new THREE.Group(); shelf.position.set(-6.55, 0, 5.0); group.add(shelf);
  for (const dz of [-0.85, 0.85]) for (const dx of [-0.3, 0.3]) block(0.05, 2.0, 0.05, darkMetal, dx, 1.0, dz, shelf);
  [0.3, 0.8, 1.3, 1.8].forEach((y) => {
    block(0.7, 0.04, 1.8, lightMetal, 0, y, 0, shelf);
    for (let k = 0; k < 3; k++) {
      const dz = -0.6 + k * 0.6 + (R() - 0.5) * 0.15, kind = R();
      if (kind < 0.4) transportCase((R() - 0.5) * 0.1, y + 0.13, dz, 0.3, 0.22, 0.42, (R() - 0.5) * 0.2, shelf, false, Math.floor(R() * 3));
      else if (kind < 0.7) { const c = put(new THREE.TorusGeometry(0.12, 0.04, 8, 16), orange, 0, y + 0.06, dz, shelf); c.rotation.x = Math.PI / 2; }
      else block(0.3, 0.03, 0.22, paper, 0, y + 0.03, dz, shelf);
    }
  });
  solid(0.7, 2.0, 1.8, -6.55, 1.0, 5.0);

  // Gray cabinet against the wall, between TX-04 and the workbench (the beam start at z -1.6 sits inside it).
  cabinet({ x: -6.5, z: -1.075, w: 1.3, h: 2.2, d: 0.8, dir: 1, label: 'DB-7', panel: false, seed: 150 });

  woodCrate(-6.3, 0.5, 6.9, 1.0, 0.05, false, 0);
  woodCrate(-6.3, 1.425, 6.9, 0.85, 0.15, false, 1);
  solid(1.0, 1.85, 1.0, -6.3, 0.925, 6.9);
  woodCrate(-5.1, 0.4, 7.2, 0.8, -0.25, true, 2);

  // Conduits + junction box on the left wall.
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.6, metalness: 0.7 });
  for (const y of [3.85, 3.62]) { const p = put(new THREE.CylinderGeometry(0.06, 0.06, 15.6, 8), pipeMat, -6.92, y, 0); p.rotation.x = Math.PI / 2; }
  put(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8), pipeMat, -6.92, 3.1, -1.3);
  block(0.15, 0.4, 0.3, darkMetal, -6.9, 2.5, -1.3);

  // =========================== BACK WALL ===========================
  const rackFaceMats = [0, 1, 2, 3].map((i) => new THREE.MeshStandardMaterial({ map: T(rackTexture(300 + i, 160, 460)), roughness: 0.5, metalness: 0.6 }));
  [-5.3, -4.4, -3.5, -2.6].forEach((x, i) => {
    const mats = [cabSide, cabSide, cabSide, cabSide, rackFaceMats[i], cabSide];
    put(new THREE.BoxGeometry(0.85, 2.3, 0.8), mats, x, 1.15, -7.55).castShadow = true;
  });
  solid(3.65, 2.3, 0.8, -3.95, 1.15, -7.55);

  const clock = put(new THREE.CircleGeometry(0.28, 24), new THREE.MeshBasicMaterial({ map: T(clockTexture()) }), 3.6, 3.4, -7.97);
  put(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: T(signTexture('aid')) }), 4.5, 3.3, -7.97);
  put(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: T(signTexture('aid')) }), 4.5, 2.85, -7.97);
  block(0.55, 0.75, 0.15, darkMetal, 3.2, 1.5, -7.9);
  put(new THREE.PlaneGeometry(0.46, 0.66), new THREE.MeshBasicMaterial({ map: T(signTexture('fire')) }), 3.2, 1.5, -7.82);
  put(new THREE.CylinderGeometry(0.09, 0.09, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.5, metalness: 0.3 }), 4.0, 0.3, -7.7);
  const bp = put(new THREE.CylinderGeometry(0.06, 0.06, 15.6, 8), pipeMat, 0, 3.9, -7.9); bp.rotation.z = Math.PI / 2; bp.scale.y = 0.9;

  // =========================== RIGHT WALL ===========================
  if (includeRightFurniture) {
  // Two full-height lockers (same 3.5 m as the left cabinets) flank the laser shutdown button at z = 0.
  cabinet({ x: 6.6, z: -1.7, w: 1.3, h: 3.5, d: 0.8, dir: -1, label: 'LK-A', panel: false, seed: 200 });
  cabinet({ x: 6.6, z: 1.7, w: 1.3, h: 3.5, d: 0.8, dir: -1, label: 'LK-B', panel: true, seed: 201 });

  // ---- second workstation, to the left of LK-A (toward the back wall) ----
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x6f6b61, roughness: 0.7, metalness: 0.3 });
  const plastic = new THREE.MeshStandardMaterial({ color: 0x8a8f94, roughness: 0.6, metalness: 0.2 });
  const darkPlastic = new THREE.MeshStandardMaterial({ color: 0x1e2226, roughness: 0.7 });
  const fileMat = new THREE.MeshStandardMaterial({ color: 0x6a7077, roughness: 0.6, metalness: 0.5 });
  const desk = new THREE.Group(); desk.position.set(6.5, 0, -3.7); group.add(desk);
  block(0.8, 0.05, 1.8, deskMat, 0, 0.76, 0, desk);
  for (const dz of [-0.88, 0.88]) block(0.75, 0.74, 0.04, deskMat, 0, 0.37, dz, desk);
  block(0.03, 0.55, 1.7, deskMat, 0.37, 0.45, 0, desk);
  block(0.6, 0.7, 0.45, darkMetal, 0.05, 0.36, 0.6, desk);
  for (let i = 0; i < 3; i++) { block(0.02, 0.18, 0.4, lightMetal, -0.255, 0.15 + i * 0.22, 0.6, desk); block(0.02, 0.02, 0.1, steel, -0.27, 0.15 + i * 0.22, 0.6, desk); }
  const mon = new THREE.Group(); mon.position.set(0.12, 0.785, -0.3); desk.add(mon);
  block(0.22, 0.04, 0.26, plastic, 0, 0.02, 0, mon); block(0.1, 0.08, 0.1, plastic, 0, 0.08, 0, mon);
  block(0.4, 0.34, 0.44, plastic, 0, 0.29, 0, mon);
  const scr = put(new THREE.PlaneGeometry(0.38, 0.28), new THREE.MeshBasicMaterial({ map: T(monitorTexture()), toneMapped: false }), -0.202, 0.29, 0, mon);
  scr.rotation.y = -Math.PI / 2;
  block(0.16, 0.02, 0.46, darkPlastic, -0.2, 0.8, 0.1, desk);               // keyboard
  block(0.06, 0.03, 0.09, darkPlastic, -0.2, 0.8, 0.5, desk);               // mouse
  put(new THREE.CylinderGeometry(0.04, 0.04, 0.09, 10), orange, 0.15, 0.83, 0.38, desk);   // mug
  const sheets = block(0.3, 0.015, 0.22, paper, 0.1, 0.795, 0.62, desk); sheets.rotation.y = 0.3;
  const glow = new THREE.PointLight(0x4fe3ff, 2.5, 4, 1.8); glow.position.set(6.0, 1.1, -3.7); group.add(glow);
  solid(0.8, 0.8, 1.8, 6.5, 0.4, -3.7);

  const chair = new THREE.Group(); chair.position.set(5.35, 0, -3.7); chair.rotation.y = 0.35; group.add(chair);
  put(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), darkPlastic, 0, 0.25, 0, chair);
  block(0.5, 0.08, 0.5, darkPlastic, 0, 0.5, 0, chair);
  block(0.06, 0.5, 0.46, darkPlastic, -0.22, 0.8, 0, chair);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const leg = block(0.3, 0.03, 0.04, darkPlastic, Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15, chair); leg.rotation.y = -a;
    put(new THREE.SphereGeometry(0.03, 6, 6), rubber, Math.cos(a) * 0.3, 0.03, Math.sin(a) * 0.3, chair);
  }
  solid(0.55, 0.95, 0.55, 5.35, 0.475, -3.7);

  function filing(z, h, drawers) {
    block(0.6, h, 0.5, fileMat, 6.62, h / 2, z);
    const dh = (h - 0.2) / drawers;
    for (let i = 0; i < drawers; i++) {
      const y = 0.12 + i * dh + dh / 2;
      block(0.02, dh - 0.04, 0.44, lightMetal, 6.31, y, z); block(0.03, 0.025, 0.16, steel, 6.295, y, z);
    }
    solid(0.6, h, 0.5, 6.62, h / 2, z);
  }
  filing(-5.0, 1.3, 4); filing(-5.55, 0.72, 2);

  }

  // ---- steel ladder leaning on the wall ----
  if (includeRightFurniture) {
  const ladder = new THREE.Group(); ladder.position.set(6.1, 0, 3.9); ladder.rotation.z = -0.29; group.add(ladder);
  for (const dz of [-0.25, 0.25]) { block(0.05, 2.5, 0.05, steel, 0, 1.25, dz, ladder); block(0.08, 0.03, 0.08, rubber, 0, 0.015, dz, ladder); }
  for (let i = 0; i < 8; i++) { const rung = put(new THREE.CylinderGeometry(0.016, 0.016, 0.5, 8), steel, 0, 0.3 + i * 0.3, 0, ladder); rung.rotation.x = Math.PI / 2; }
  solid(0.5, 2.4, 0.6, 6.5, 1.2, 3.9);

  }

  // ---- cork notice board (cork + wooden frame), random substation notices ----
  const nb = new THREE.Group(); nb.position.set(6.91, 2.0, 5.8); nb.rotation.y = -Math.PI / 2; group.add(nb);
  const corkMat = new THREE.MeshStandardMaterial({ map: T(corkTexture()), roughness: 1 });
  const frameWood = new THREE.MeshStandardMaterial({ map: T(woodGrainTexture()), roughness: 0.85 });
  block(1.9, 1.3, 0.05, corkMat, 0, 0, 0, nb);
  for (const x of [-0.975, 0.975]) block(0.1, 1.5, 0.1, frameWood, x, 0, 0.03, nb);
  for (const y of [-0.7, 0.7]) block(2.08, 0.1, 0.1, frameWood, 0, y, 0.03, nb);
  const pinMat = new THREE.MeshStandardMaterial({ color: 0x813d31, roughness: 0.55 });
  [
    ['LOCKOUT / TAGOUT', 'Isolate, lock and tag every supply before work. One lock, one key, one person.', '#e5ddba', 'text', -0.72, 0.3, 0.04],
    ['TRANSFORMER LOG', 'T1 oil 61C. T2 oil 58C. T3 under repair. Next oil sample due end of month.', '#e8e7db', 'text', -0.24, 0.25, -0.05],
    ['ARC FLASH', 'Boundary 1.2 m. Class 2 gloves and face shield required past the yellow line.', '#dddccf', 'text', 0.24, 0.32, 0.06],
    ['SINGLE LINE SKETCH', '', '#e6e2d3', 'diagram', 0.72, 0.26, -0.03],
    ['BATTERY BANK TEST', '48 V DC bank. Check cell voltage and electrolyte. Log results in the red book.', '#d9c68c', 'text', -0.5, -0.3, -0.04],
    ['EARTH FAULT REPORT', 'Feeder 4 tripped twice. Insulation test pending. Do not re-energise.', '#e9cfc6', 'text', 0.0, -0.32, 0.05],
    ['SF6 GAS CHECK', 'Pressure gauge in the green. Report any drop on the same shift.', '#dfe3d6', 'text', 0.5, -0.28, -0.06],
  ].forEach(([title, text, color, kind, x, y, rot], i) => {
    const sheet = put(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ map: T(paperTexture(title, text, color, kind, 70 + i)), roughness: 1 }), x, y, 0.04, nb);
    sheet.rotation.z = rot;
    put(new THREE.SphereGeometry(0.016, 8, 6), pinMat, 0, 0.22, 0.012, sheet);
  });

  // ---- cable drums ----
  function reel(x, z, s) {
    const g = new THREE.Group(); g.position.set(x, 0.6 * s, z); g.scale.setScalar(s); group.add(g);
    for (const dx of [-0.22, 0.22]) { const d = put(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 20), wood, dx, 0, 0, g); d.rotation.z = Math.PI / 2; }
    const wound = put(new THREE.CylinderGeometry(0.46, 0.46, 0.4, 16), cableMat, 0, 0, 0, g); wound.rotation.z = Math.PI / 2;
    const core = put(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 10), woodDark, 0, 0, 0, g); core.rotation.z = Math.PI / 2;
    solid(0.6 * s, 1.2 * s, 1.2 * s, x, 0.6 * s, z);
  }
  reel(4.6, 7.0, 1.0); reel(3.1, 7.3, 0.6);

  // ---- bigger, detailed boxes: steel toolbox + stacked olive transport cases ----
  function toolbox(x, z, ry) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; group.add(g);
    block(0.5, 0.3, 1.0, orange, 0, 0.15, 0, g);
    block(0.54, 0.05, 1.04, new THREE.MeshStandardMaterial({ color: 0x9c3d12, roughness: 0.6, metalness: 0.3 }), 0, 0.325, 0, g);
    const handle = put(new THREE.TorusGeometry(0.14, 0.014, 6, 14, Math.PI), steel, 0, 0.35, 0, g); handle.rotation.y = Math.PI / 2;
    for (const sx of [-1, 1]) for (const dz of [-0.3, 0.3]) block(0.03, 0.12, 0.07, steel, sx * 0.265, 0.25, dz, g);
    solidRot(0.5, 0.4, 1.0, x, 0.2, z, ry);
  }
  toolbox(5.7, 7.35, 0.1);
  transportCase(6.55, 0.27, 7.2, 0.6, 0.54, 0.95, 0.05, group, false, 0);
  transportCase(6.5, 0.74, 7.2, 0.55, 0.4, 0.85, -0.1, group, false, 1);
  solid(0.62, 0.95, 0.98, 6.55, 0.475, 7.2);

  for (const y of [3.85, 3.62]) { const p = put(new THREE.CylinderGeometry(0.06, 0.06, 15.6, 8), pipeMat, 6.92, y, 0); p.rotation.x = Math.PI / 2; }

  // =========================== CEILING ===========================
  if (includeCeiling) {
  const tubeMat = new THREE.MeshBasicMaterial({ color: 0xe6f2ff });
  [[-2.5, 2.0], [2.5, -2.0], [0, 6.0]].forEach(([x, z]) => {
    block(0.22, 0.08, 2.4, darkMetal, x, 4.1, z); block(0.1, 0.03, 2.2, tubeMat, x, 4.05, z);
  });
  for (const z of [-6, -2, 2, 6]) block(13.8, 0.2, 0.25, darkMetal, 0, 4.05, z);

  }

  // =========================== FLOOR ===========================
  const grime = new THREE.MeshBasicMaterial({ map: T(floorGrimeTexture()), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  flat(14, 16, grime, 0, 0.004, 0);

  const grateMat1 = new THREE.MeshStandardMaterial({ map: T(grateTexture(10, 26)), roughness: 0.8, metalness: 0.5 });
  const grateMat2 = new THREE.MeshStandardMaterial({ map: T(grateTexture(46, 2)), roughness: 0.8, metalness: 0.5 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.9, metalness: 0.4 });
  block(2.8, 0.03, 7.2, trimMat, 0.8, 0.012, -1.0); flat(2.6, 7.0, grateMat1, 0.8, 0.03, -1.0);       // drain grate
  block(12.6, 0.03, 0.6, trimMat, 0, 0.012, 3.0); flat(12.4, 0.45, grateMat2, 0, 0.03, 3.0);          // cross trench

  const tape = new THREE.MeshBasicMaterial({ color: 0xb59500, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const strip = (w, d, x, z) => flat(w, d, tape, x, 0.008, z);
  strip(0.12, 5.6, -5.6, -4.7); strip(0.12, 3.0, -4.4, -0.5);

  // =========================== DISPOSE ===========================
  return {
    colliders,
    update(delta, camera) { for (const fn of updaters) fn(delta, camera); },
    dispose() {
      const seen = new Set();
      group.traverse((o) => {
        if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
        for (const m of [].concat(o.material || [])) if (m && !seen.has(m)) { seen.add(m); m.dispose(); }
      });
      textures.forEach((t) => t.dispose());
      group.removeFromParent();
    },
  };
}