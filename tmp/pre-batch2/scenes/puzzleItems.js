import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function canvasTexture(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

export const std = (color, roughness = 0.6, metalness = 0, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

export function disposeTree(root) {
  const seen = new Set();
  root.traverse((o) => {
    if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
    for (const m of [].concat(o.material || [])) {
      if (!m || seen.has(m)) continue;
      seen.add(m);
      for (const v of Object.values(m)) if (v && v.isTexture) v.dispose();
      m.dispose();
    }
  });
}

function add(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

// ---------------------------------------------------------------------------
// BOLT CUTTERS  (long axis = +x toward the jaws, handles splay in the xy plane)
// ---------------------------------------------------------------------------
export function buildBoltCutters() {
  const g = new THREE.Group(); g.name = 'Bolt cutters';
  const steel = std(0x9aa3ab, 0.42, 0.45);
  const hard = std(0x2a2f34, 0.35, 0.55);
  const grip = std(0xb3261e, 0.85, 0);
  const L = 0.56, spread = 0.09, a = Math.atan2(spread, L);
  for (const s of [-1, 1]) {
    const tailY = s * (0.016 + spread);
    // tubular handle
    add(g, new THREE.CylinderGeometry(0.0105, 0.0105, Math.hypot(L, spread), 10), steel,
      -L / 2, s * (0.016 + spread / 2), 0, 0, 0, Math.PI / 2 - s * a);
    // rubber grip near the tail + end cap
    add(g, new THREE.CylinderGeometry(0.0165, 0.0165, 0.17, 14), grip,
      -L + 0.085 * Math.cos(a), tailY - s * 0.085 * Math.sin(a), 0, 0, 0, Math.PI / 2 - s * a);
    add(g, new THREE.SphereGeometry(0.0165, 10, 8), grip, -L, tailY, 0);
    // hardened cutting jaw, beveled edge on the inside
    add(g, new THREE.BoxGeometry(0.115, 0.032, 0.028), hard, 0.057, s * 0.019, 0, 0, 0, -s * 0.12);
    add(g, new THREE.BoxGeometry(0.06, 0.006, 0.03), steel, 0.095, s * 0.0045, 0, 0, 0, -s * 0.12);
    // link bar between handle and jaw
    add(g, new THREE.BoxGeometry(0.12, 0.012, 0.012), steel, -0.06, s * 0.038, 0.016, 0, 0, s * 0.1);
    add(g, new THREE.BoxGeometry(0.12, 0.012, 0.012), steel, -0.06, s * 0.038, -0.016, 0, 0, s * 0.1);
    add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8), steel, -0.12, s * 0.04, 0, Math.PI / 2, 0, 0);
  }
  // centre pivot bolt and hex nut
  add(g, new THREE.CylinderGeometry(0.013, 0.013, 0.05, 12), steel, 0.005, 0, 0, Math.PI / 2, 0, 0);
  add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.012, 6), hard, 0.005, 0, 0.03, Math.PI / 2, 0, 0);
  add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.012, 6), hard, 0.005, 0, -0.03, Math.PI / 2, 0, 0);
  return g;
}

// ---------------------------------------------------------------------------
// CROWBAR  (long axis = +x; +x end is the goose-neck claw, -x end is the flat chisel)
// ---------------------------------------------------------------------------
export function buildCrowbar() {
  const g = new THREE.Group(); g.name = 'Crowbar';
  const paint = std(0x9c2f1d, 0.55, 0.2);
  const steel = std(0x8a949c, 0.4, 0.45);
  add(g, new THREE.CylinderGeometry(0.0125, 0.0125, 0.6, 6), paint, -0.08, 0, 0, 0, 0, Math.PI / 2);
  // flat chisel end
  add(g, new THREE.BoxGeometry(0.075, 0.012, 0.042), steel, -0.4, 0, 0, 0, 0, 0.04);
  add(g, new THREE.BoxGeometry(0.03, 0.01, 0.04), steel, -0.43, 0, 0, 0, 0, 0.08);
  // goose-neck bend
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.21, 0, 0), new THREE.Vector3(0.29, 0.004, 0),
    new THREE.Vector3(0.35, 0.03, 0), new THREE.Vector3(0.375, 0.075, 0),
    new THREE.Vector3(0.368, 0.115, 0),
  ]);
  add(g, new THREE.TubeGeometry(curve, 24, 0.0125, 6, false), paint);
  // claw plate with a nail slot
  add(g, new THREE.BoxGeometry(0.012, 0.065, 0.036), steel, 0.362, 0.145, 0, 0, 0, 0.12);
  add(g, new THREE.BoxGeometry(0.014, 0.03, 0.008), std(0x15181b, 0.9), 0.362, 0.16, 0, 0, 0, 0.12);
  return g;
}

// ---------------------------------------------------------------------------
// PADLOCK  (real size ~6 cm; front faces +z; shackle in the xy plane)
// ---------------------------------------------------------------------------
function padlockFaceTexture() {
  return canvasTexture(256, 208, (g, w, h) => {
    const r = rng(11);
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#d7b04a'); grad.addColorStop(0.5, '#b38a27'); grad.addColorStop(1, '#8a6a1c');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(255,240,180,${r() * 0.08})`; g.fillRect(r() * w, 0, 1, h); }
    g.strokeStyle = 'rgba(60,40,5,0.55)'; g.lineWidth = 3;                       // laminated seams
    for (const y of [60, 100, 140]) { g.beginPath(); g.moveTo(8, y); g.lineTo(w - 8, y); g.stroke(); }
    g.fillStyle = 'rgba(50,30,5,0.8)'; g.font = 'bold 22px monospace'; g.textAlign = 'center';
    g.fillText('MERIDIAN', w / 2, 40);
    g.fillStyle = '#17120a'; g.beginPath(); g.arc(w / 2, 150, 14, 0, 6.28); g.fill();   // keyway
    g.fillRect(w / 2 - 4, 150, 8, 26);
    for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(40,25,5,${0.1 + r() * 0.2})`; g.fillRect(r() * w, r() * h, 2 + r() * 8, 1); }
  });
}

export function buildPadlock() {
  const group = new THREE.Group(); group.name = 'Padlock';
  const brass = std(0xb58f2b, 0.38, 0.5);
  const steelMat = std(0xc7cdd2, 0.3, 0.55);
  add(group, new RoundedBoxGeometry(0.062, 0.052, 0.026, 3, 0.006), brass);
  add(group, new THREE.PlaneGeometry(0.056, 0.046), new THREE.MeshStandardMaterial({ map: padlockFaceTexture(), roughness: 0.4, metalness: 0.35 }), 0, 0, 0.0132);
  // shackle: two legs and a semicircular arc
  const R = 0.021, yTop = 0.066;
  const shackleCurve = (bottomLeft) => {
    const pts = [new THREE.Vector3(-R, bottomLeft, 0), new THREE.Vector3(-R, (bottomLeft + yTop) / 2, 0)];
    for (let i = 0; i <= 12; i++) { const t = Math.PI - (i / 12) * Math.PI; pts.push(new THREE.Vector3(Math.cos(t) * R, yTop + Math.sin(t) * R, 0)); }
    pts.push(new THREE.Vector3(R, 0.044, 0), new THREE.Vector3(R, 0.022, 0));
    return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  };
  const intact = add(group, new THREE.TubeGeometry(shackleCurve(0.018), 56, 0.0045, 8, false), steelMat);
  // after the bolt cutters: the left leg is sheared off higher up, with a bright cut face
  const cutShackle = add(group, new THREE.TubeGeometry(shackleCurve(0.05), 56, 0.0045, 8, false), steelMat);
  cutShackle.visible = false;
  const cutFace = add(group, new THREE.CircleGeometry(0.0045, 8), std(0xf1f3f4, 0.2, 0.7), -R, 0.05, 0, Math.PI / 2, 0, 0);
  cutFace.visible = false;
  group.userData.cut = () => { intact.visible = false; cutShackle.visible = true; cutFace.visible = true; };
  return group;
}

// ---------------------------------------------------------------------------
// TX-CORE MODULE  (hot-swap blade: long axis = x, front plate/handle on +x, gold contacts on -x)
// ---------------------------------------------------------------------------
function moduleLabelTexture() {
  return canvasTexture(320, 96, (g, w, h) => {
    g.fillStyle = '#e7e3d2'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#111'; g.font = 'bold 28px monospace'; g.fillText('TX-CORE  REV.C', 12, 34);
    g.font = '15px monospace'; g.fillText('S/N 4471-09   220V  60Hz', 12, 58);
    g.fillStyle = '#b3261e'; g.fillRect(12, 68, 120, 16);
    g.fillStyle = '#fff'; g.font = 'bold 12px monospace'; g.fillText('ESD SENSITIVE', 18, 80);
    for (let i = 0; i < 28; i++) { g.fillStyle = '#111'; g.fillRect(190 + i * 4, 66, 1 + (i % 3), 20); }
  });
}

export function buildTXModule() {
  const g = new THREE.Group(); g.name = 'TX-CORE module';
  const L = 0.30, H = 0.085, W = 0.24;
  const shell = std(0x2b3036, 0.5, 0.45);
  const alu = std(0xa4abb1, 0.42, 0.5);
  const gold = std(0xd2a640, 0.3, 0.65);
  add(g, new THREE.BoxGeometry(L, H, W), shell);
  for (let i = 0; i < 10; i++) add(g, new THREE.BoxGeometry(L * 0.8, 0.016, 0.008), alu, -0.02, H / 2 + 0.008, -0.09 + i * 0.02);
  add(g, new THREE.BoxGeometry(0.012, H + 0.012, W + 0.012), alu, L / 2 + 0.006, 0, 0);          // front plate
  add(g, new THREE.BoxGeometry(0.014, 0.014, W * 0.78), alu, L / 2 + 0.02, -0.022, 0);            // ejector lever
  for (const z of [-W * 0.39, W * 0.39]) add(g, new THREE.BoxGeometry(0.02, 0.014, 0.014), alu, L / 2 + 0.014, -0.022, z);
  const leds = [];
  for (const z of [-0.06, 0, 0.06]) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xff3322, toneMapped: false });
    add(g, new THREE.BoxGeometry(0.004, 0.008, 0.016), mat, L / 2 + 0.013, 0.02, z);
    leds.push(mat);
  }
  for (let i = 0; i < 16; i++) add(g, new THREE.BoxGeometry(0.012, 0.022, 0.007), gold, -L / 2 - 0.006, -0.004, -0.1 + i * 0.0133);
  add(g, new THREE.PlaneGeometry(0.2, 0.06), new THREE.MeshStandardMaterial({ map: moduleLabelTexture(), roughness: 0.7 }), 0, 0.0, W / 2 + 0.0008);
  g.userData.leds = leds;
  g.userData.setLeds = (hex) => leds.forEach((m) => m.color.setHex(hex));
  g.userData.size = { L, H, W };
  return g;
}

// ---------------------------------------------------------------------------
// STICKY NOTE (real post-it size, 76 mm) -- handwriting-style canvas
// ---------------------------------------------------------------------------
export function buildStickyNote3D() {
  const tex = canvasTexture(256, 256, (g, w, h) => {
    const r = rng(5);
    g.fillStyle = '#f2e27a'; g.fillRect(0, 0, w, h);
    const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, 'rgba(255,255,255,0.18)'); grad.addColorStop(1, 'rgba(120,90,0,0.18)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2b2415'; g.font = 'italic bold 26px "Segoe Print","Comic Sans MS",cursive';
    ['TERMINAL', 'DOWN!!', 'TX-CORE fried', 'spare in crate', '- M.C.'].forEach((l, i) => g.fillText(l, 22 + (r() - 0.5) * 8, 48 + i * 44));
    g.strokeStyle = 'rgba(160,120,20,0.5)'; g.lineWidth = 2; g.strokeRect(2, 2, w - 4, h - 4);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.076, 0.076), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  m.name = 'Sticky note';
  return m;
}

// ---------------------------------------------------------------------------
// TEXTURES for the TX-03 locker, crate and assignment sheet
// ---------------------------------------------------------------------------
export function paintedDoorTexture({ label = 'TX-03', sub = '\u2605 PRIORITY', seed = 7 } = {}) {
  return canvasTexture(512, 896, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = '#56615b'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.05})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 8 + r() * 40); }
    g.strokeStyle = 'rgba(20,24,22,0.7)'; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28);   // pressed border
    g.fillStyle = 'rgba(190,195,190,0.75)'; g.textAlign = 'center';
    g.font = 'bold 118px monospace'; g.fillText(label, w / 2, 170);
    g.fillStyle = '#d4a000'; g.font = 'bold 40px monospace'; g.fillText(sub, w / 2, 235);
    g.fillStyle = 'rgba(190,195,190,0.75)'; g.font = 'bold 30px monospace'; g.fillText('TOOLS / RECOVERY', w / 2, 290);
    g.fillStyle = '#e3d27a'; g.fillRect(70, 330, 150, 96);                                         // LOTO tag
    g.fillStyle = '#1a1a1a'; g.font = 'bold 18px monospace'; g.fillText('DO NOT', 145, 362); g.fillText('REMOVE', 145, 386); g.fillText('LOCK-OUT', 145, 410);
    g.fillStyle = '#111';                                                                           // louvre vents
    for (let i = 0; i < 9; i++) g.fillRect(90, 560 + i * 24, 332, 9);
    for (let x = 0; x < w; x += 44) { g.fillStyle = '#d4a000'; g.fillRect(x, h - 62, 22, 36); }    // hazard band
    g.fillStyle = '#111'; for (let x = 22; x < w; x += 44) g.fillRect(x, h - 62, 22, 36);
    g.fillStyle = 'rgba(190,195,190,0.6)'; g.font = '20px monospace'; g.fillText('AUTHORISED PERSONNEL ONLY', w / 2, 520);
    g.fillStyle = 'rgba(150,150,150,0.6)';
    for (let i = 0; i < 22; i++) {                                                                  // rivets
      const t = i / 22; for (const [x, y] of [[30 + t * (w - 60), 30], [30 + t * (w - 60), h - 30]]) { g.beginPath(); g.arc(x, y, 5, 0, 6.28); g.fill(); }
    }
    for (let i = 0; i < 60; i++) {                                                                  // edge chips + rust
      const edge = r() < 0.5; const x = edge ? (r() < 0.5 ? r() * 24 : w - r() * 24) : r() * w, y = edge ? r() * h : (r() < 0.5 ? r() * 24 : h - r() * 24);
      g.fillStyle = `rgba(${110 + r() * 40},${55 + r() * 25},20,${0.3 + r() * 0.4})`; g.fillRect(x, y, 3 + r() * 9, 3 + r() * 9);
    }
    g.strokeStyle = 'rgba(210,215,210,0.18)'; g.lineWidth = 1;                                     // scratches
    for (let i = 0; i < 40; i++) { g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 120, y + (r() - 0.5) * 40); g.stroke(); }
    const rust = g.createLinearGradient(0, h * 0.8, 0, h); rust.addColorStop(0, 'rgba(110,60,25,0)'); rust.addColorStop(1, 'rgba(110,60,25,0.35)');
    g.fillStyle = rust; g.fillRect(0, h * 0.8, w, h * 0.2);
  });
}

export function shadowBoardTexture() {
  return canvasTexture(512, 896, (g, w, h) => {
    g.fillStyle = '#262b2f'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d9dbd2'; g.lineWidth = 5; g.lineJoin = 'round'; g.fillStyle = 'rgba(0,0,0,0.35)';
    // crowbar outline (horizontal, centre-top)
    g.beginPath(); g.moveTo(70, 330); g.lineTo(440, 330); g.quadraticCurveTo(480, 330, 480, 290); g.lineTo(470, 262); g.lineTo(452, 292); g.quadraticCurveTo(450, 312, 430, 312);
    g.lineTo(70, 312); g.closePath(); g.fill(); g.stroke();
    // bolt cutters outline (empty slot lower down)
    g.beginPath(); g.moveTo(60, 600); g.lineTo(380, 560); g.lineTo(440, 560); g.lineTo(440, 590); g.lineTo(380, 596); g.lineTo(60, 650); g.closePath(); g.fill(); g.stroke();
    // hammer outline
    g.strokeRect(70, 740, 280, 22); g.strokeRect(330, 722, 60, 58);
    g.fillStyle = '#d9dbd2'; g.font = 'bold 26px monospace'; g.textAlign = 'center';
    g.fillText('TOOL SHADOW BOARD', w / 2, 90); g.font = '18px monospace'; g.fillText('RETURN TOOLS AFTER USE', w / 2, 124);
    g.fillText('CROWBAR', w / 2, 220); g.fillText('BOLT CUTTERS', w / 2, 520); g.fillText('HAMMER', w / 2, 690);
  });
}

export function plankTexture(seed = 3) {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = '#8a6a45'; g.fillRect(0, 0, w, h);
    const planks = 5, ph = h / planks;
    for (let i = 0; i < planks; i++) {
      const y = i * ph;
      g.fillStyle = r() < 0.5 ? 'rgba(60,40,20,0.18)' : 'rgba(190,150,100,0.18)'; g.fillRect(0, y, w, ph);
      for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(40,25,10,${0.05 + r() * 0.12})`; g.fillRect(r() * w, y + r() * ph, 20 + r() * 80, 1); }
      g.fillStyle = 'rgba(20,12,5,0.75)'; g.fillRect(0, y, w, 3);
    }
    for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(20,15,10,${0.05 + r() * 0.1})`; g.beginPath(); g.arc(r() * w, r() * h, 6 + r() * 20, 0, 6.28); g.fill(); }
  });
}

export function foamTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#2a2d31'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) for (let y = 0; y < h; y += 32) {
      const grad = g.createRadialGradient(x + 16, y + 16, 1, x + 16, y + 16, 18);
      grad.addColorStop(0, '#454a50'); grad.addColorStop(1, '#1b1d20');
      g.fillStyle = grad; g.fillRect(x, y, 32, 32);
    }
  }, [2, 2]);
}

export function assignmentSheetTexture(rows, starredName) {
  return canvasTexture(512, 640, (g, w, h) => {
    const r = rng(21);
    g.fillStyle = '#e5ddba'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,100,60,${r() * 0.06})`; g.fillRect(r() * w, r() * h, 2, 2); }
    g.fillStyle = '#403b30'; g.font = 'bold 30px monospace'; g.textAlign = 'left'; g.fillText('RACK ASSIGNMENTS', 28, 60);
    g.fillStyle = '#77654e'; g.fillRect(28, 78, w - 56, 3);
    g.font = '18px monospace'; g.fillStyle = '#6b5e44'; g.fillText('Week 43 \u2014 updated by M. Chen', 28, 108);
    let y = 170;
    for (const row of rows) {
      const starred = row.name === starredName;
      g.fillStyle = starred ? '#aa1010' : '#464137'; g.font = `${starred ? 'bold ' : ''}26px monospace`;
      g.fillText((starred ? '\u2605 ' : '') + row.name, 28, y);
      g.fillStyle = '#464137'; g.font = '24px monospace'; g.fillText(row.contents, 230, y);
      if (starred) {                                                                              // red marker circle
        g.strokeStyle = 'rgba(190,20,20,0.75)'; g.lineWidth = 4; g.beginPath(); g.ellipse(w / 2 - 6, y - 8, w / 2 - 24, 28, -0.02, 0, 6.28); g.stroke();
      }
      y += 64;
    }
    g.fillStyle = '#8a7c5e'; g.font = 'italic 18px monospace'; g.fillText('\u2605 priority assignment', 28, h - 40);
  });
}

// ---------------------------------------------------------------------------
// SHAPE GLYPHS -- SHAPE_NAMES is the alphabet the padlock dials cycle through;
// the ANSWER lives in riddles/shapeNote.js, and both the 3D clue note and that
// overlay are driven by it so the note can never disagree with the lock.
// ---------------------------------------------------------------------------
export const SHAPE_NAMES = ['square', 'triangle', 'circle'];

function drawShapeGlyph(g, shape, cx, cy, r, colour, lineW = 4) {
  g.save();
  g.strokeStyle = colour; g.lineWidth = lineW; g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath();
  if (shape === 'square') g.rect(cx - r * 0.84, cy - r * 0.84, r * 1.68, r * 1.68);
  else if (shape === 'triangle') {
    g.moveTo(cx, cy - r); g.lineTo(cx + r * 0.9, cy + r * 0.7); g.lineTo(cx - r * 0.9, cy + r * 0.7); g.closePath();
  } else g.arc(cx, cy, r, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

function shapeMesh(shape, mat) {
  const geo = shape === 'square'
    ? new THREE.PlaneGeometry(0.0145, 0.0145)
    : shape === 'triangle'
      ? new THREE.CircleGeometry(0.0105, 3)
      : new THREE.CircleGeometry(0.0085, 20);
  const m = new THREE.Mesh(geo, mat);
  if (shape === 'triangle') m.rotation.z = Math.PI / 2;   // CircleGeometry(3) starts pointing +x
  return m;
}

// ---------------------------------------------------------------------------
// SHAPE CLUE NOTE -- pinned over the corner of the rack assignment sheet.
// The three marks are drawn in faded blue pencil in the margin beside a very
// ordinary tool list, so it reads as a maintenance tag rather than a puzzle.
// ---------------------------------------------------------------------------
export function shapeNoteTexture(shapes = SHAPE_NAMES) {
  return canvasTexture(512, 512, (g, w, h) => {
    const r = rng(37);
    const items = ['spanner set', 'torque kit', 'cutter tray'];
    g.fillStyle = '#ded6b4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,100,60,${r() * 0.07})`; g.fillRect(r() * w, r() * h, 2, 2); }
    const fold = g.createLinearGradient(0, 0, w, h);
    fold.addColorStop(0, 'rgba(255,255,255,0.14)'); fold.addColorStop(1, 'rgba(90,75,40,0.20)');
    g.fillStyle = fold; g.fillRect(0, 0, w, h);

    g.textAlign = 'left';
    g.fillStyle = '#3a3527'; g.font = 'bold 34px monospace'; g.fillText('CASE 12 \u2014 COMBO', 30, 56);
    g.fillStyle = '#7a6a4c'; g.fillRect(30, 72, w - 60, 4);

    g.font = '25px "Segoe Print","Comic Sans MS",cursive'; g.fillStyle = '#413b2c';
    ['Someone reset the case tag', 'again after Thursday. Marks', 'run 1-2-3 and the dials read', 'LEFT to RIGHT:']
      .forEach((l, i) => g.fillText(l, 34 + (r() - 0.5) * 6, 122 + i * 36));

    // the actual clue: hand-drawn marks in the margin beside each line
    shapes.forEach((shape, i) => {
      const y = 306 + i * 54;
      g.fillStyle = '#413b2c'; g.font = '25px monospace'; g.fillText(`${i + 1}.`, 40, y);
      drawShapeGlyph(g, shape, 108, y - 9, 21, 'rgba(38,86,140,0.85)', 5);
      g.fillStyle = '#5b5340'; g.font = 'italic 23px "Segoe Print","Comic Sans MS",cursive';
      g.fillText(items[i] || '', 154, y);
    });

    g.fillStyle = '#413b2c'; g.font = '25px "Segoe Print","Comic Sans MS",cursive';
    g.fillText('Do NOT shuffle them.', 34, 480);
    g.textAlign = 'right'; g.fillText('\u2014 M.C.', w - 32, 480);

    // decoys: a coffee ring and a crossed-out doodle so it is not blatant
    g.strokeStyle = 'rgba(120,80,35,0.26)'; g.lineWidth = 9;
    g.beginPath(); g.arc(w - 88, 92, 42, 0.4, 5.4); g.stroke();
    drawShapeGlyph(g, 'square', 404, 468, 15, 'rgba(60,55,40,0.32)', 3);
    g.strokeStyle = 'rgba(60,55,40,0.4)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(388, 454); g.lineTo(420, 482); g.stroke();
    g.strokeStyle = 'rgba(20,20,18,0.3)'; g.lineWidth = 3; g.strokeRect(4, 4, w - 8, h - 8);
  });
}

export function buildShapeNote3D(shapes = SHAPE_NAMES) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.16),
    new THREE.MeshStandardMaterial({ map: shapeNoteTexture(shapes), roughness: 1 })
  );
  m.name = 'Case 12 combo note';
  return m;
}

// ---------------------------------------------------------------------------
// WRENCH  (the missing pegboard tool -- procedural, no GLB in the asset set)
// Long axis = +y, open jaw at the top, ring end at the bottom, thickness = z.
// Total height 0.26 so it matches PEGBOARD.slots[wrench].size.h exactly.
// ---------------------------------------------------------------------------
export function buildWrench() {
  const g = new THREE.Group(); g.name = 'Wrench';
  const chrome = std(0xb6bec5, 0.3, 0.75);
  const shade = std(0x8b939a, 0.45, 0.6);
  const T = 0.010;
  add(g, new THREE.TorusGeometry(0.0255, 0.0075, 10, 28), chrome, 0, -0.0965, 0);   // ring end
  add(g, new THREE.BoxGeometry(0.030, 0.034, T), chrome, 0, -0.068, 0);
  add(g, new THREE.BoxGeometry(0.021, 0.088, T * 0.85), chrome, 0, -0.012, 0);      // handle
  add(g, new THREE.BoxGeometry(0.0225, 0.013, T * 0.95), shade, 0, 0.012, 0);        // engraved band
  add(g, new THREE.BoxGeometry(0.048, 0.018, T), chrome, 0, 0.040, 0);               // jaw heel
  for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(0.0115, 0.080, T), chrome, s * 0.0195, 0.088, 0, 0, 0, -s * 0.05);
  g.userData.size = { h: 0.26 };
  return g;
}

// ---------------------------------------------------------------------------
// GREEN TOOL CASE  (the "little green box" family from design.js, but openable)
// Origin is on the FLOOR at the centre of the footprint; the lid is hinged
// along the -z edge and swings about +x to userData.lidOpenAngle.
// ---------------------------------------------------------------------------
function greenCaseTexture(seed = 4, label = 'CASE 12') {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = '#4f5b3b'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '20,25,12' : '120,135,90'},0.12)`; g.fillRect(r() * w, r() * h, 2, 2); }
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, h * 0.28, w, 5);
    g.textAlign = 'center';
    g.fillStyle = 'rgba(212,216,190,0.85)'; g.font = 'bold 27px monospace'; g.fillText(label, w / 2, h * 0.55);
    g.fillStyle = 'rgba(212,216,190,0.6)'; g.font = '15px monospace'; g.fillText('TOOLS / RECOVERY', w / 2, h * 0.70);
    for (let x = 0; x < w; x += 40) { g.fillStyle = '#c8a227'; g.fillRect(x, h - 34, 20, 22); g.fillStyle = '#1a1c14'; g.fillRect(x + 20, h - 34, 20, 22); }
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(110,60,25,${0.1 + r() * 0.3})`; g.fillRect(r() * w, r() * h, 3 + r() * 10, 2 + r() * 5); }
    g.strokeStyle = 'rgba(200,205,180,0.2)'; g.lineWidth = 2;
    for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(r() * w, r() * h); g.lineTo(r() * w, r() * h); g.stroke(); }
  });
}

export function buildGreenToolbox({ w = 0.52, d = 0.30, baseH = 0.26, lidH = 0.10, t = 0.012 } = {}) {
  const g = new THREE.Group(); g.name = 'Green tool case';
  const shell = new THREE.MeshStandardMaterial({ map: greenCaseTexture(), roughness: 0.75, metalness: 0.25 });
  const shellDark = std(0x39422c, 0.8, 0.2);
  const steelMat = std(0xb8c0c8, 0.4, 0.6);
  const haspSlot = std(0x1b1f16, 0.85, 0.2);

  add(g, new THREE.BoxGeometry(w, t, d), shellDark, 0, t / 2, 0);                                   // floor
  add(g, new THREE.BoxGeometry(w - 2 * t, 0.02, d - 2 * t),
    new THREE.MeshStandardMaterial({ map: foamTexture(), roughness: 1 }), 0, t + 0.010, 0);          // foam bed
  add(g, new THREE.BoxGeometry(w, baseH, t), shell, 0, baseH / 2, d / 2 - t / 2);
  add(g, new THREE.BoxGeometry(w, baseH, t), shell, 0, baseH / 2, -d / 2 + t / 2);
  for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(t, baseH, d - 2 * t), shell, s * (w / 2 - t / 2), baseH / 2, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1])                                              // corner protectors
    add(g, new THREE.BoxGeometry(0.032, baseH * 0.82, 0.032), steelMat, sx * (w / 2 - 0.016), baseH * 0.42, sz * (d / 2 - 0.016));

  // lid, hinged along the -z edge
  const lidHinge = new THREE.Group();
  lidHinge.position.set(0, baseH, -d / 2);
  g.add(lidHinge);
  const L = (x, y, z) => [x, y - baseH, z + d / 2];                                                // case space -> lid space
  add(lidHinge, new THREE.BoxGeometry(w, lidH, d), shell, ...L(0, baseH + lidH / 2, 0));
  add(lidHinge, new THREE.BoxGeometry(w + 0.012, 0.014, d + 0.012), shellDark, ...L(0, baseH + 0.007, 0));
  for (const dz of [-d * 0.26, d * 0.26]) add(lidHinge, new THREE.BoxGeometry(w * 0.86, 0.016, 0.04), shellDark, ...L(0, baseH + lidH + 0.006, dz));
  for (const sz of [-1, 1]) add(lidHinge, new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8), steelMat, ...L(0, baseH + 0.006, sz * (d / 2 - 0.08)), Math.PI / 2, 0, 0);
  for (const sx of [-1, 1]) add(lidHinge, new THREE.BoxGeometry(0.05, 0.05, 0.014), steelMat, ...L(sx * (w / 2 - 0.07), baseH + 0.006, d / 2 + 0.004));
  add(lidHinge, new THREE.TorusGeometry(0.075, 0.011, 6, 16, Math.PI), steelMat, ...L(0, baseH + lidH + 0.008, 0));   // carry handle

  // hasp hangs off the lid front and drops over a catch plate on the base;
  // the padlock shackle goes through the tongue (fake hole, same trick as TX-03)
  add(lidHinge, new THREE.BoxGeometry(0.046, 0.11, 0.008), steelMat, ...L(0.10, 0.225, 0.196));
  add(lidHinge, new THREE.BoxGeometry(0.046, 0.030, 0.044), steelMat, ...L(0.10, 0.265, 0.174));
  add(lidHinge, new THREE.BoxGeometry(0.026, 0.026, 0.004), haspSlot, ...L(0.10, 0.225, 0.202));
  add(g, new THREE.BoxGeometry(0.070, 0.070, 0.014), steelMat, 0.10, 0.225, 0.157);

  g.userData.lid = lidHinge;
  g.userData.lidOpenAngle = -1.9;
  g.userData.foamTop = t + 0.020;
  g.userData.haspAnchor = new THREE.Vector3(0.10, 0.145, 0.196);   // padlock origin, not the shackle hole
  g.userData.size = { w, d, baseH, lidH };
  return g;
}

// ---------------------------------------------------------------------------
// SHAPE PADLOCK  (three rotating dials instead of buildPadlock's keyway)
// Body ~11 cm wide so the dials are a fair click target. Front faces +z.
// ---------------------------------------------------------------------------
function shapePadlockFaceTexture() {
  return canvasTexture(320, 248, (g, w, h) => {
    const r = rng(19);
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#d7b04a'); grad.addColorStop(0.5, '#b38a27'); grad.addColorStop(1, '#8a6a1c');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(255,240,180,${r() * 0.08})`; g.fillRect(r() * w, 0, 1, h); }
    g.strokeStyle = 'rgba(60,40,5,0.5)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(8, 48); g.lineTo(w - 8, 48); g.stroke();
    g.textAlign = 'center';
    g.fillStyle = 'rgba(50,30,5,0.85)'; g.font = 'bold 27px monospace'; g.fillText('MERIDIAN', w / 2, 38);
    for (const x of [55, 160, 265]) {                                                              // dial windows + index marks
      g.fillStyle = 'rgba(18,13,4,0.92)'; g.fillRect(x - 40, 112, 80, 88);
      g.strokeStyle = 'rgba(255,235,170,0.25)'; g.lineWidth = 2; g.strokeRect(x - 40, 112, 80, 88);
      g.fillStyle = 'rgba(255,235,170,0.5)';
      g.beginPath(); g.moveTo(x, 108); g.lineTo(x - 8, 94); g.lineTo(x + 8, 94); g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(50,30,5,0.7)'; g.font = '16px monospace'; g.fillText('SET THREE MARKS', w / 2, 226);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(40,25,5,${0.1 + r() * 0.2})`; g.fillRect(r() * w, r() * h, 2 + r() * 9, 1); }
  });
}

export function buildShapePadlock(shapes = SHAPE_NAMES) {
  const g = new THREE.Group(); g.name = 'Shape padlock';
  const brass = std(0xb58f2b, 0.38, 0.5);
  const steelMat = std(0xc7cdd2, 0.3, 0.55);
  const dialMat = std(0x2c3138, 0.5, 0.45);
  const markMat = new THREE.MeshStandardMaterial({ color: 0xf0ebd8, roughness: 0.55, side: THREE.DoubleSide });

  add(g, new RoundedBoxGeometry(0.11, 0.085, 0.032, 3, 0.008), brass);
  add(g, new THREE.PlaneGeometry(0.104, 0.079),
    new THREE.MeshStandardMaterial({ map: shapePadlockFaceTexture(), roughness: 0.4, metalness: 0.35 }), 0, 0, 0.0163);

  const dials = [];
  for (let i = 0; i < 3; i++) {
    const dial = new THREE.Group();
    dial.position.set((i - 1) * 0.034, -0.010, 0.0175);
    g.add(dial);
    add(dial, new THREE.CylinderGeometry(0.0125, 0.0125, 0.010, 22), dialMat, 0, 0, 0, -Math.PI / 2, 0, 0);
    add(dial, new THREE.TorusGeometry(0.0132, 0.0014, 6, 22), brass, 0, 0, 0.005);   // brass bezel around the dial face
    const marks = shapes.map((s) => {
      const m = shapeMesh(s, markMat);
      m.position.set(0, 0, 0.0062);
      m.visible = false;
      dial.add(m);
      return m;
    });
    const entry = {
      group: dial,
      index: 0,
      shape() { return shapes[entry.index]; },
      set(next) {
        entry.index = ((next % shapes.length) + shapes.length) % shapes.length;
        marks.forEach((m, k) => { m.visible = k === entry.index; });
      },
      next() { entry.set(entry.index + 1); },
    };
    entry.set(0);
    dials.push(entry);
  }

  // shackle on a pivot so it can pop up and swing clear when the dials line up
  const R = 0.034, arcY = 0.080;
  const pts = [new THREE.Vector3(-R, 0.030, 0), new THREE.Vector3(-R, 0.055, 0)];
  for (let i = 0; i <= 14; i++) { const a = Math.PI - (i / 14) * Math.PI; pts.push(new THREE.Vector3(Math.cos(a) * R, arcY + Math.sin(a) * R, 0)); }
  pts.push(new THREE.Vector3(R, 0.055, 0), new THREE.Vector3(R, 0.030, 0));
  const shacklePivot = new THREE.Group();
  shacklePivot.position.set(-R, 0.030, 0);
  g.add(shacklePivot);
  const shackle = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 60, 0.005, 8, false), steelMat);
  shackle.position.set(R, -0.030, 0);                                                                // undo the pivot offset
  shacklePivot.add(shackle);

  g.userData.dials = dials;
  g.userData.shapes = shapes;
  g.userData.shacklePivot = shacklePivot;
  g.userData.setOpen = (k) => {
    shacklePivot.position.y = 0.030 + k * 0.026;
    shacklePivot.rotation.z = k * 0.9;
  };
  return g;
}

// ---------------------------------------------------------------------------
// WORKSTATION BOX  (bench-top tool box that hides the bolt cutters)
// Built with the same plank + batten + corner-post recipe as woodCrate() in
// design.js -- deliberately NOT crate_box.glb. Origin is on its base.
// The lid is hinged along the -x (wall side) edge and swings about +z.
// ---------------------------------------------------------------------------
export function buildWorkstationBox({ w = 0.32, d = 0.74, wallH = 0.16, t = 0.012 } = {}) {
  const g = new THREE.Group(); g.name = 'Workstation tool box';
  const plank = new THREE.MeshStandardMaterial({ map: plankTexture(5), roughness: 0.9 });
  const beam = std(0x6b5236, 0.9, 0);
  const steelMat = std(0x9aa1a8, 0.45, 0.55);

  add(g, new THREE.BoxGeometry(w, t, d), plank, 0, t / 2, 0);
  add(g, new THREE.BoxGeometry(w - 2 * t, 0.016, d - 2 * t),
    new THREE.MeshStandardMaterial({ map: foamTexture(), roughness: 1 }), 0, t + 0.008, 0);
  for (const s of [-1, 1]) {
    add(g, new THREE.BoxGeometry(w, wallH, t), plank, 0, wallH / 2, s * (d / 2 - t / 2));
    add(g, new THREE.BoxGeometry(t, wallH, d - 2 * t), plank, s * (w / 2 - t / 2), wallH / 2, 0);
    add(g, new THREE.BoxGeometry(w + 0.014, 0.020, 0.024), beam, 0, 0.014, s * (d / 2 + 0.002));
    add(g, new THREE.BoxGeometry(w + 0.014, 0.020, 0.024), beam, 0, wallH - 0.012, s * (d / 2 + 0.002));
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    add(g, new THREE.BoxGeometry(0.024, wallH, 0.024), beam, sx * (w / 2 - 0.004), wallH / 2, sz * (d / 2 - 0.004));

  const lidHinge = new THREE.Group();
  lidHinge.position.set(-w / 2, wallH, 0);
  g.add(lidHinge);
  const LT = 0.018, braceLen = Math.hypot(w, d);
  add(lidHinge, new THREE.BoxGeometry(w, LT, d), plank, w / 2, LT / 2, 0);
  add(lidHinge, new THREE.BoxGeometry(0.05, 0.016, braceLen * 0.98), beam, w / 2, LT + 0.007, 0, 0, Math.atan2(w, d), 0);
  for (const sz of [-1, 1]) {
    add(lidHinge, new THREE.BoxGeometry(w + 0.012, 0.022, 0.032), beam, w / 2, LT + 0.006, sz * (d / 2 - 0.05));
    add(lidHinge, new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8), steelMat, 0, 0.004, sz * (d / 2 - 0.09), Math.PI / 2, 0, 0);
  }
  add(lidHinge, new THREE.BoxGeometry(0.05, 0.032, 0.06), steelMat, w - 0.012, -0.014, d / 2 - 0.01);   // front catch

  g.userData.lid = lidHinge;
  g.userData.lidOpenAngle = 1.95;
  g.userData.floorTop = t + 0.016;
  g.userData.size = { w, d, wallH };
  return g;
}