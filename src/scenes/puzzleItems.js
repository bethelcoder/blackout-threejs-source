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
// BOLT CUTTERS
// ---------------------------------------------------------------------------
export function buildBoltCutters() {
  const g = new THREE.Group(); g.name = 'Bolt cutters';
  const steel = std(0x9aa3ab, 0.42, 0.45);
  const hard = std(0x2a2f34, 0.35, 0.55);
  const grip = std(0xb3261e, 0.85, 0);
  const L = 0.56, spread = 0.09, a = Math.atan2(spread, L);
  for (const s of [-1, 1]) {
    const tailY = s * (0.016 + spread);
    add(g, new THREE.CylinderGeometry(0.0105, 0.0105, Math.hypot(L, spread), 10), steel,
      -L / 2, s * (0.016 + spread / 2), 0, 0, 0, Math.PI / 2 - s * a);
    add(g, new THREE.CylinderGeometry(0.0165, 0.0165, 0.17, 14), grip,
      -L + 0.085 * Math.cos(a), tailY - s * 0.085 * Math.sin(a), 0, 0, 0, Math.PI / 2 - s * a);
    add(g, new THREE.SphereGeometry(0.0165, 10, 8), grip, -L, tailY, 0);
    add(g, new THREE.BoxGeometry(0.115, 0.032, 0.028), hard, 0.057, s * 0.019, 0, 0, 0, -s * 0.12);
    add(g, new THREE.BoxGeometry(0.06, 0.006, 0.03), steel, 0.095, s * 0.0045, 0, 0, 0, -s * 0.12);
    add(g, new THREE.BoxGeometry(0.12, 0.012, 0.012), steel, -0.06, s * 0.038, 0.016, 0, 0, s * 0.1);
    add(g, new THREE.BoxGeometry(0.12, 0.012, 0.012), steel, -0.06, s * 0.038, -0.016, 0, 0, s * 0.1);
    add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8), steel, -0.12, s * 0.04, 0, Math.PI / 2, 0, 0);
  }
  add(g, new THREE.CylinderGeometry(0.013, 0.013, 0.05, 12), steel, 0.005, 0, 0, Math.PI / 2, 0, 0);
  add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.012, 6), hard, 0.005, 0, 0.03, Math.PI / 2, 0, 0);
  add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.012, 6), hard, 0.005, 0, -0.03, Math.PI / 2, 0, 0);
  return g;
}

// ---------------------------------------------------------------------------
// CROWBAR
// ---------------------------------------------------------------------------
export function buildCrowbar() {
  const g = new THREE.Group(); g.name = 'Crowbar';
  const paint = std(0x9c2f1d, 0.55, 0.2);
  const steel = std(0x8a949c, 0.4, 0.45);
  add(g, new THREE.CylinderGeometry(0.0125, 0.0125, 0.6, 6), paint, -0.08, 0, 0, 0, 0, Math.PI / 2);
  add(g, new THREE.BoxGeometry(0.075, 0.012, 0.042), steel, -0.4, 0, 0, 0, 0, 0.04);
  add(g, new THREE.BoxGeometry(0.03, 0.01, 0.04), steel, -0.43, 0, 0, 0, 0, 0.08);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.21, 0, 0), new THREE.Vector3(0.29, 0.004, 0),
    new THREE.Vector3(0.35, 0.03, 0), new THREE.Vector3(0.375, 0.075, 0),
    new THREE.Vector3(0.368, 0.115, 0),
  ]);
  add(g, new THREE.TubeGeometry(curve, 24, 0.0125, 6, false), paint);
  add(g, new THREE.BoxGeometry(0.012, 0.065, 0.036), steel, 0.362, 0.145, 0, 0, 0, 0.12);
  add(g, new THREE.BoxGeometry(0.014, 0.03, 0.008), std(0x15181b, 0.9), 0.362, 0.16, 0, 0, 0, 0.12);
  return g;
}

// ---------------------------------------------------------------------------
// PADLOCK
// ---------------------------------------------------------------------------
function padlockFaceTexture() {
  return canvasTexture(256, 208, (g, w, h) => {
    const r = rng(11);
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#d7b04a'); grad.addColorStop(0.5, '#b38a27'); grad.addColorStop(1, '#8a6a1c');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(255,240,180,${r() * 0.08})`; g.fillRect(r() * w, 0, 1, h); }
    g.strokeStyle = 'rgba(60,40,5,0.55)'; g.lineWidth = 3;
    for (const y of [60, 100, 140]) { g.beginPath(); g.moveTo(8, y); g.lineTo(w - 8, y); g.stroke(); }
    g.fillStyle = 'rgba(50,30,5,0.8)'; g.font = 'bold 22px monospace'; g.textAlign = 'center';
    g.fillText('MERIDIAN', w / 2, 40);
    g.fillStyle = '#17120a'; g.beginPath(); g.arc(w / 2, 150, 14, 0, 6.28); g.fill();
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
  const R = 0.021, yTop = 0.066;
  const shackleCurve = (bottomLeft) => {
    const pts = [new THREE.Vector3(-R, bottomLeft, 0), new THREE.Vector3(-R, (bottomLeft + yTop) / 2, 0)];
    for (let i = 0; i <= 12; i++) { const t = Math.PI - (i / 12) * Math.PI; pts.push(new THREE.Vector3(Math.cos(t) * R, yTop + Math.sin(t) * R, 0)); }
    pts.push(new THREE.Vector3(R, 0.044, 0), new THREE.Vector3(R, 0.022, 0));
    return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  };
  const intact = add(group, new THREE.TubeGeometry(shackleCurve(0.018), 56, 0.0045, 8, false), steelMat);
  const cutShackle = add(group, new THREE.TubeGeometry(shackleCurve(0.05), 56, 0.0045, 8, false), steelMat);
  cutShackle.visible = false;
  const cutFace = add(group, new THREE.CircleGeometry(0.0045, 8), std(0xf1f3f4, 0.2, 0.7), -R, 0.05, 0, Math.PI / 2, 0, 0);
  cutFace.visible = false;
  group.userData.cut = () => { intact.visible = false; cutShackle.visible = true; cutFace.visible = true; };
  return group;
}

// ---------------------------------------------------------------------------
// TX-CORE MODULE
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
  add(g, new THREE.BoxGeometry(0.012, H + 0.012, W + 0.012), alu, L / 2 + 0.006, 0, 0);
  add(g, new THREE.BoxGeometry(0.014, 0.014, W * 0.78), alu, L / 2 + 0.02, -0.022, 0);
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
// STICKY NOTE
// ---------------------------------------------------------------------------
export function buildStickyNote3D(lines = [
  'TERMINAL 04', 'DOWN - parts', 'missing. TX-CORE', 'failed ESD;', 'spare still', 'crated.', 'Tools off board', '- M.C.',
]) {
  const tex = canvasTexture(256, 256, (g, w, h) => {
    const r = rng(5);
    g.fillStyle = '#f2e27a'; g.fillRect(0, 0, w, h);
    const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, 'rgba(255,255,255,0.18)'); grad.addColorStop(1, 'rgba(120,90,0,0.18)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2b2415'; g.font = 'italic bold 21px "Segoe Print","Comic Sans MS",cursive';
    lines.forEach((l, i) => g.fillText(l, 18 + (r() - 0.5) * 7, 38 + i * 27));
    g.strokeStyle = 'rgba(160,120,20,0.5)'; g.lineWidth = 2; g.strokeRect(2, 2, w - 4, h - 4);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.076, 0.076), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  m.name = 'Sticky note';
  return m;
}

// ---------------------------------------------------------------------------
// TX-03 LOCKER DOOR
// ---------------------------------------------------------------------------
export function paintedDoorTexture({ label = 'TX-03', sub = '\u2605 PRIORITY', seed = 7, w = 512, h = 896 } = {}) {
  const k = h / 896;
  return canvasTexture(w, h, (g, cw, ch) => {
    const r = rng(seed);
    g.fillStyle = '#596168'; g.fillRect(0, 0, cw, ch);
    for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.04})`; g.fillRect(r() * cw, 0, 1, ch); }
    g.strokeStyle = '#23292e'; g.lineWidth = 5; g.strokeRect(5, 5, cw - 10, ch - 10);
    g.beginPath(); g.moveTo(cw / 2, 5); g.lineTo(cw / 2, ch - 5); g.stroke();
    g.fillStyle = '#12161a';
    for (const y0 of [0.05, 0.8]) for (let k2 = 0; k2 < 8; k2++) g.fillRect(cw * 0.12, ch * (y0 + k2 * 0.022), cw * 0.76, ch * 0.011);
    g.fillStyle = '#aab0b5';
    g.fillRect(cw * 0.43, ch * 0.52, cw * 0.03, ch * 0.09);
    g.fillRect(cw * 0.54, ch * 0.52, cw * 0.03, ch * 0.09);
    g.fillStyle = '#d6a900'; g.beginPath();
    g.moveTo(cw * 0.18, ch * 0.34); g.lineTo(cw * 0.30, ch * 0.34); g.lineTo(cw * 0.24, ch * 0.27); g.fill();
    g.textAlign = 'center';
    g.fillStyle = 'rgba(225,225,215,0.82)'; g.font = `bold ${Math.round(cw * 0.105)}px monospace`;
    g.fillText(label, cw / 2, ch * 0.20);
    g.fillStyle = '#d4a000'; g.font = `bold ${Math.round(cw * 0.05)}px monospace`;
    g.fillText(sub, cw / 2, ch * 0.28);
    const rust = g.createLinearGradient(0, ch * 0.8, 0, ch);
    rust.addColorStop(0, 'rgba(110,60,25,0)'); rust.addColorStop(1, 'rgba(110,60,25,0.45)');
    g.fillStyle = rust; g.fillRect(0, ch * 0.8, cw, ch * 0.2);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = `rgba(10,8,5,${0.05 + r() * 0.1})`;
      g.fillRect(r() * cw, r() * ch * 0.6, 2 + r() * 6, ch * 0.2 + r() * ch * 0.5);
    }
  });
}

// ---------------------------------------------------------------------------
// Shared textures
// ---------------------------------------------------------------------------
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
      if (starred) {
        g.strokeStyle = 'rgba(190,20,20,0.75)'; g.lineWidth = 4; g.beginPath(); g.ellipse(w / 2 - 6, y - 8, w / 2 - 24, 28, -0.02, 0, 6.28); g.stroke();
      }
      y += 64;
    }
    g.fillStyle = '#8a7c5e'; g.font = 'italic 18px monospace'; g.fillText('\u2605 priority assignment', 28, h - 40);
  });
}

// ---------------------------------------------------------------------------
// SHAPE GLYPHS
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
  if (shape === 'triangle') m.rotation.z = Math.PI / 2;
  return m;
}

// ---------------------------------------------------------------------------
// CASE 12 RIDDLE NOTE
// ---------------------------------------------------------------------------
export function shapeNoteTexture(shapes = SHAPE_NAMES) {
  return canvasTexture(512, 640, (g, w, h) => {
    const r = rng(37);
    g.fillStyle = '#ded6b4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,100,60,${r() * 0.07})`; g.fillRect(r() * w, r() * h, 2, 2); }
    const fold = g.createLinearGradient(0, 0, w, h);
    fold.addColorStop(0, 'rgba(255,255,255,0.14)'); fold.addColorStop(1, 'rgba(90,75,40,0.20)');
    g.fillStyle = fold; g.fillRect(0, 0, w, h);

    g.textAlign = 'left';
    g.fillStyle = '#3a3527'; g.font = 'bold 36px monospace'; g.fillText('CASE 12 \u2014 COMBO', 30, 58);
    g.fillStyle = '#7a6a4c'; g.fillRect(30, 74, w - 60, 4);

    g.font = '22px "Segoe Print","Comic Sans MS",cursive'; g.fillStyle = '#413b2c';
    const lines = [
      'Forgot the damn code again.',
      '',
      'Think of the warning sign on',
      'the high-voltage door.',
      '',
      'Then check the shape of the',
      'gauge.',
      '',
      'Last comes the outline of the',
      'fuse compartment.',
      '',
      'Same order as you see them on',
      'the wall. Don\u2019t overthink it.',
    ];
    lines.forEach((l, i) => g.fillText(l, 34 + (r() - 0.5) * 4, 128 + i * 32));

    g.textAlign = 'right';
    g.font = 'italic 22px "Segoe Print","Comic Sans MS",cursive';
    g.fillText('\u2014 T. Mokoena, night shift', w - 32, h - 44);

    g.strokeStyle = 'rgba(120,80,35,0.24)'; g.lineWidth = 9;
    g.beginPath(); g.arc(w - 88, 92, 42, 0.4, 5.4); g.stroke();
    g.strokeStyle = 'rgba(20,20,18,0.30)'; g.lineWidth = 3; g.strokeRect(4, 4, w - 8, h - 8);
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
// WRENCH
// ---------------------------------------------------------------------------
export function buildWrench() {
  const g = new THREE.Group(); g.name = 'Wrench';
  const chrome = std(0xb6bec5, 0.3, 0.75);
  const shade = std(0x8b939a, 0.45, 0.6);
  const T = 0.010;
  add(g, new THREE.TorusGeometry(0.0255, 0.0075, 10, 28), chrome, 0, -0.0965, 0);
  add(g, new THREE.BoxGeometry(0.030, 0.034, T), chrome, 0, -0.068, 0);
  add(g, new THREE.BoxGeometry(0.021, 0.088, T * 0.85), chrome, 0, -0.012, 0);
  add(g, new THREE.BoxGeometry(0.0225, 0.013, T * 0.95), shade, 0, 0.012, 0);
  add(g, new THREE.BoxGeometry(0.048, 0.018, T), chrome, 0, 0.040, 0);
  for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(0.0115, 0.080, T), chrome, s * 0.0195, 0.088, 0, 0, 0, -s * 0.05);
  g.userData.size = { h: 0.26 };
  return g;
}

// ---------------------------------------------------------------------------
// GREEN TOOL CASE
// ---------------------------------------------------------------------------
function greenCaseTexture(seed = 4, label = 'CASE 12') {
  const tex = canvasTexture(1024, 1024, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = '#4f5b3b'; g.fillRect(0, 0, w, h);
    for (let x = 100; x < w; x += 200) {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, 0, 3, h);
      g.fillStyle = 'rgba(200,205,180,0.15)'; g.fillRect(x + 3, 0, 1, h);
    }
    for (let i = 0; i < 12000; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '20,25,12' : '120,135,90'},${0.15 + r() * 0.2})`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, h * 0.28, w, 10);
    g.textAlign = 'center';
    g.fillStyle = '#e8e6d0'; g.font = 'bold 96px monospace';
    g.fillText(label, w / 2, h * 0.55);
    g.strokeStyle = '#2a2a1a'; g.lineWidth = 3;
    g.strokeText(label, w / 2, h * 0.55);
    g.fillStyle = 'rgba(212,216,190,0.7)'; g.font = '52px monospace';
    g.fillText('TOOLS / RECOVERY', w / 2, h * 0.72);
    for (let x = 0; x < w; x += 140) {
      g.fillStyle = '#c8a227'; g.fillRect(x, h - 128, 70, 80);
      g.fillStyle = '#1a1c14'; g.fillRect(x + 70, h - 128, 70, 80);
    }
    for (let i = 0; i < 120; i++) {
      g.fillStyle = `rgba(110,60,25,${0.2 + r() * 0.4})`;
      g.fillRect(r() * w, r() * h, 5 + r() * 18, 3 + r() * 12);
    }
    g.strokeStyle = 'rgba(220,225,200,0.35)'; g.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      g.beginPath();
      const x1 = r() * w, y1 = r() * h;
      g.moveTo(x1, y1);
      g.lineTo(x1 + (r() - 0.5) * 200, y1 + (r() - 0.5) * 60);
      g.stroke();
    }
    for (const [cx, cy] of [[0, 0], [w, 0], [0, h], [w, h]]) {
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, 200);
      grad.addColorStop(0, 'rgba(20,15,10,0.5)');
      grad.addColorStop(1, 'rgba(20,15,10,0)');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
    }
  });
  tex.anisotropy = 16;
  return tex;
}

export function buildGreenToolbox({ w = 0.52, d = 0.30, baseH = 0.26, lidH = 0.10, t = 0.012 } = {}) {
  const g = new THREE.Group(); g.name = 'Green tool case';
  const shell = new THREE.MeshStandardMaterial({ map: greenCaseTexture(), roughness: 0.9, metalness: 0.02 });
  const shellInner = std(0x2a3520, 0.95, 0);
  const shellDark = std(0x39422c, 0.85, 0.1);
  const steelMat = std(0xb8c0c8, 0.4, 0.6);
  const haspSlot = std(0x1b1f16, 0.85, 0.2);

  add(g, new THREE.BoxGeometry(w, t, d), shellDark, 0, t / 2, 0);
  add(g, new THREE.BoxGeometry(w - 2 * t, 0.02, d - 2 * t),
    new THREE.MeshStandardMaterial({ map: foamTexture(), roughness: 1 }), 0, t + 0.010, 0);
  add(g, new THREE.BoxGeometry(w, baseH, t), shell, 0, baseH / 2, d / 2 - t / 2);
  add(g, new THREE.BoxGeometry(w, baseH, t), shell, 0, baseH / 2, -d / 2 + t / 2);
  for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(t, baseH, d - 2 * t), shell, s * (w / 2 - t / 2), baseH / 2, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    add(g, new THREE.BoxGeometry(0.032, baseH * 0.82, 0.032), steelMat, sx * (w / 2 - 0.016), baseH * 0.42, sz * (d / 2 - 0.016));

  const lidHinge = new THREE.Group();
  lidHinge.position.set(0, baseH, -d / 2);
  g.add(lidHinge);
  const L = (x, y, z) => [x, y - baseH, z + d / 2];

  const lidMats = [shell, shell, shell, shellInner, shell, shell];
  add(lidHinge, new THREE.BoxGeometry(w, lidH, d), lidMats, ...L(0, baseH + lidH / 2, 0));
  add(lidHinge, new THREE.BoxGeometry(w + 0.012, 0.010, d + 0.012), shellDark, ...L(0, baseH + 0.010, 0));

  for (const dz of [-d * 0.26, d * 0.26]) add(lidHinge, new THREE.BoxGeometry(w * 0.86, 0.016, 0.04), shellDark, ...L(0, baseH + lidH + 0.006, dz));
  for (const sz of [-1, 1]) add(lidHinge, new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8), steelMat, ...L(0, baseH + 0.006, sz * (d / 2 - 0.08)), Math.PI / 2, 0, 0);
  for (const sx of [-1, 1]) add(lidHinge, new THREE.BoxGeometry(0.05, 0.05, 0.014), steelMat, ...L(sx * (w / 2 - 0.07), baseH + 0.006, d / 2 + 0.004));
  add(lidHinge, new THREE.TorusGeometry(0.075, 0.011, 6, 16, Math.PI), steelMat, ...L(0, baseH + lidH + 0.008, 0));

  add(lidHinge, new THREE.BoxGeometry(0.046, 0.11, 0.008), steelMat, ...L(0.10, 0.225, 0.196));
  add(lidHinge, new THREE.BoxGeometry(0.046, 0.030, 0.044), steelMat, ...L(0.10, 0.265, 0.174));
  add(lidHinge, new THREE.BoxGeometry(0.026, 0.026, 0.004), haspSlot, ...L(0.10, 0.225, 0.202));
  add(g, new THREE.BoxGeometry(0.070, 0.070, 0.014), steelMat, 0.10, 0.225, 0.157);

  g.userData.lid = lidHinge;
  g.userData.lidOpenAngle = -1.9;
  g.userData.foamTop = t + 0.020;
  g.userData.haspAnchor = new THREE.Vector3(0.10, 0.145, 0.196);
  g.userData.size = { w, d, baseH, lidH };
  return g;
}

// ---------------------------------------------------------------------------
// SHAPE PADLOCK
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
    for (const x of [55, 160, 265]) {
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
    add(dial, new THREE.TorusGeometry(0.0132, 0.0014, 6, 22), brass, 0, 0, 0.005);
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

  const R = 0.034, arcY = 0.080;
  const pts = [new THREE.Vector3(-R, 0.030, 0), new THREE.Vector3(-R, 0.055, 0)];
  for (let i = 0; i <= 14; i++) { const a = Math.PI - (i / 14) * Math.PI; pts.push(new THREE.Vector3(Math.cos(a) * R, arcY + Math.sin(a) * R, 0)); }
  pts.push(new THREE.Vector3(R, 0.055, 0), new THREE.Vector3(R, 0.030, 0));
  const shacklePivot = new THREE.Group();
  shacklePivot.position.set(-R, 0.030, 0);
  g.add(shacklePivot);
  const shackle = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 60, 0.005, 8, false), steelMat);
  shackle.position.set(R, -0.030, 0);
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
// WORKSTATION BOX
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
  add(lidHinge, new THREE.BoxGeometry(0.05, 0.032, 0.06), steelMat, w - 0.012, -0.014, d / 2 - 0.01);

  g.userData.lid = lidHinge;
  g.userData.lidOpenAngle = 1.95;
  g.userData.floorTop = t + 0.016;
  g.userData.size = { w, d, wallH };
  return g;
}

// ---------------------------------------------------------------------------
// OPEN SUPPLY CRATE  — sits in the front-right corner where the old orange
// toolbox used to be. Holds a plausible workshop spill: a small metal
// toolbox, a coil of black cable, cardboard, paint, loose bolts, a
// screwdriver. The extension lead rests on top of this so it reads as
// "stuffed in the crate" rather than floating above it.
// ---------------------------------------------------------------------------
export function buildOpenSupplyCrate({ w = 0.90, d = 0.90, h = 0.55, t = 0.03 } = {}) {
  const g = new THREE.Group(); g.name = 'Open supply crate';
  const plank = new THREE.MeshStandardMaterial({ map: plankTexture(9), roughness: 0.92 });
  const beam = std(0x6b5236, 0.9, 0);
  const steelMat = std(0x9aa3ab, 0.42, 0.55);
  const rustMat = std(0x8a5a2a, 0.9, 0.3);
  const ragA = std(0x8a7f6a, 0.95, 0);
  const ragB = std(0x6a6045, 0.95, 0);
  const cardboardMat = std(0x9c8050, 0.9, 0);
  const wireMat = std(0x2a2520, 0.85, 0.1);
  const canMat = std(0xb8c0c8, 0.45, 0.6);
  const darkMetalMat = std(0x3a4048, 0.55, 0.5);

  // ---- shell ----
  add(g, new THREE.BoxGeometry(w, t, d), plank, 0, -h / 2 + t / 2, 0);
  for (const s of [-1, 1]) {
    add(g, new THREE.BoxGeometry(w, h, t), plank, 0, 0, s * (d / 2 - t / 2));
    add(g, new THREE.BoxGeometry(t, h, d - 2 * t), plank, s * (w / 2 - t / 2), 0, 0);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    add(g, new THREE.BoxGeometry(0.06, h + 0.02, 0.06), beam, sx * (w / 2 - 0.01), 0, sz * (d / 2 - 0.01));
  add(g, new THREE.BoxGeometry(w + 0.04, 0.04, 0.05), beam, 0, h / 2 - 0.02, -d / 2);
  add(g, new THREE.BoxGeometry(w + 0.04, 0.04, 0.05), beam, 0, h / 2 - 0.02, d / 2);
  add(g, new THREE.BoxGeometry(0.05, 0.04, d + 0.04), beam, -w / 2, h / 2 - 0.02, 0);
  add(g, new THREE.BoxGeometry(0.05, 0.04, d + 0.04), beam, w / 2, h / 2 - 0.02, 0);
  for (const s of [-1, 1]) {
    const brace = add(g, new THREE.BoxGeometry(0.04, h * 0.9, 0.06), beam, s * (w / 2 + 0.01), 0, 0);
    brace.rotation.x = s * 0.5;
  }

  // ---- realistic contents ----
  const floorY = -h / 2 + t;

  // Small metal toolbox, back-left.
  const miniToolbox = new THREE.Group();
  miniToolbox.position.set(-0.24, floorY, -0.22);
  miniToolbox.rotation.y = 0.2;
  g.add(miniToolbox);
  add(miniToolbox, new THREE.BoxGeometry(0.28, 0.14, 0.18), rustMat, 0, 0.07, 0);
  add(miniToolbox, new THREE.BoxGeometry(0.30, 0.03, 0.20), rustMat, 0, 0.155, 0);
  const handle = add(miniToolbox, new THREE.TorusGeometry(0.05, 0.008, 6, 12, Math.PI), steelMat, 0, 0.19, 0);
  handle.rotation.x = Math.PI / 2;
  add(miniToolbox, new THREE.BoxGeometry(0.03, 0.02, 0.05), steelMat, 0, 0.176, 0);

  // Coil of black cable, front-right.
  const cableCoil = new THREE.Group();
  cableCoil.position.set(0.20, floorY + 0.05, 0.20);
  g.add(cableCoil);
  for (let i = 0; i < 4; i++) {
    add(cableCoil, new THREE.TorusGeometry(0.10 - i * 0.005, 0.012, 6, 20), wireMat,
      0, i * 0.02, 0, Math.PI / 2);
  }

  // Rag pile
  add(g, new THREE.BoxGeometry(0.14, 0.06, 0.22), ragA, 0.26, floorY + 0.03, 0.20);
  add(g, new THREE.BoxGeometry(0.12, 0.05, 0.20), ragB, 0.30, floorY + 0.085, 0.19);

  // Cardboard box with a taped lid
  const cbox = add(g, new THREE.BoxGeometry(0.22, 0.14, 0.18), cardboardMat, -0.22, floorY + 0.07, 0.20);
  cbox.rotation.y = -0.15;
  add(g, new THREE.BoxGeometry(0.22, 0.02, 0.18), std(0x6b5838, 0.9, 0), -0.22, floorY + 0.14, 0.20);

  // Tin of loose bolts
  add(g, new THREE.CylinderGeometry(0.05, 0.05, 0.10, 12), canMat, 0.30, floorY + 0.05, -0.22);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.02, 6), darkMetalMat,
      0.30 + Math.cos(a) * 0.025, floorY + 0.105, -0.22 + Math.sin(a) * 0.025);
  }

  // Half-used paint tin
  add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.16, 14), std(0x8a3a1a, 0.75, 0.2), 0.0, floorY + 0.08, -0.24);
  add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.015, 14), steelMat, 0.0, floorY + 0.16, -0.24);
  add(g, new THREE.TorusGeometry(0.06, 0.005, 6, 20), steelMat, 0.0, floorY + 0.12, -0.24, Math.PI / 2);

  // Screwdriver lying across the cardboard box
  const sd = new THREE.Group();
  sd.position.set(-0.05, floorY + 0.16, 0.10);
  sd.rotation.set(0, 0.6, Math.PI / 2);
  g.add(sd);
  add(sd, new THREE.CylinderGeometry(0.008, 0.008, 0.14, 8), std(0x1c1f22, 0.85), 0, 0, 0);
  add(sd, new THREE.CylinderGeometry(0.012, 0.014, 0.07, 8), std(0x8a1f14, 0.7, 0.1), 0, 0.10, 0);
  add(sd, new THREE.BoxGeometry(0.01, 0.02, 0.008), steelMat, 0, -0.08, 0);

  g.userData.size = { w, h, d };
  return g;
}

// ---------------------------------------------------------------------------
// TX-03 LOCKER INTERIOR
// ---------------------------------------------------------------------------
function kraftTexture(seed, label) {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = '#a8834f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = r() < 0.5 ? `rgba(255,225,180,${r() * 0.07})` : `rgba(70,45,20,${r() * 0.08})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 5, 1 + r() * 3);
    }
    g.strokeStyle = 'rgba(60,38,16,0.45)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(0, h * 0.5); g.lineTo(w, h * 0.5); g.stroke();
    g.fillStyle = 'rgba(240,235,218,0.88)'; g.fillRect(w * 0.12, h * 0.60, w * 0.76, h * 0.26);
    g.strokeStyle = 'rgba(40,38,32,0.7)'; g.lineWidth = 2; g.strokeRect(w * 0.12, h * 0.60, w * 0.76, h * 0.26);
    g.fillStyle = '#2c2a24'; g.font = 'bold 30px monospace'; g.textAlign = 'center';
    g.fillText(label, w / 2, h * 0.79);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = `rgba(60,40,18,${0.05 + r() * 0.13})`;
      g.beginPath(); g.arc(r() * w, r() * h, 3 + r() * 16, 0, 6.28); g.fill();
    }
  });
}

function lockerBoardTexture() {
  return canvasTexture(1024, 512, (g, w, h) => {
    const r = rng(64);
    g.fillStyle = '#2b3136'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.035})`; g.fillRect(r() * w, r() * h, 2, 2); }
    g.strokeStyle = 'rgba(18,22,25,0.9)'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
    g.textAlign = 'center';
    g.fillStyle = 'rgba(228,231,222,0.7)'; g.font = 'bold 46px monospace'; g.fillText('TX-03 TOOL BOARD', w / 2, 74);
    g.font = '26px monospace'; g.fillStyle = 'rgba(228,231,222,0.42)'; g.fillText('RETURN BY END OF SHIFT', w / 2, 112);

    g.lineWidth = 6; g.lineJoin = 'round'; g.lineCap = 'round';
    const outline = (fn, text, x, y, color) => {
      g.strokeStyle = 'rgba(238,240,232,0.6)'; g.fillStyle = 'rgba(0,0,0,0.35)'; fn();
      g.font = 'bold 26px monospace'; g.fillStyle = color; g.fillText(text, x, y);
    };
    outline(() => {
      g.beginPath();
      g.moveTo(80, 250); g.lineTo(300, 250); g.quadraticCurveTo(352, 250, 352, 210);
      g.lineTo(340, 182); g.lineTo(322, 214); g.quadraticCurveTo(320, 232, 300, 232);
      g.lineTo(80, 232); g.closePath(); g.fill(); g.stroke();
    }, 'CROWBAR 0.8 m', 216, 320, 'rgba(228,231,222,0.62)');
    outline(() => {
      g.beginPath(); g.moveTo(452, 300); g.lineTo(600, 210); g.stroke();
      g.beginPath(); g.arc(614, 200, 34, 0, 6.28); g.stroke();
      g.beginPath(); g.arc(614, 200, 17, 0, 6.28); g.fill();
      g.beginPath(); g.arc(440, 310, 26, 0.4, 5.6); g.stroke();
    }, 'SIGNED OUT', 540, 372, '#d8564a');
    outline(() => {
      g.beginPath(); g.rect(760, 250, 190, 26); g.fill(); g.stroke();
      g.beginPath(); g.rect(880, 216, 76, 94); g.fill(); g.stroke();
    }, 'M. CHEN', 880, 372, '#d8564a');
    g.font = '22px monospace'; g.fillStyle = 'rgba(228,231,222,0.35)';
    g.fillText('SEE EQUIPMENT REGISTER ON THE DOCUMENT RACK', w / 2, 456);
  });
}

export function buildLockerInterior({ w = 1.32, h = 3.38, d = 0.94 } = {}) {
  const g = new THREE.Group(); g.name = 'TX-03 locker interior';
  const shelfMat = std(0x7c868c, 0.5, 0.5);
  const clip = std(0x2b3034, 0.6, 0.4);
  const steelMat = std(0x9aa3ab, 0.42, 0.5);
  const rubber = std(0x14171a, 0.95, 0);
  const caseMat = std(0x3c4a52, 0.55, 0.4);
  const orangeMat = std(0xc4501c, 0.7, 0.15);
  const whiteMat = std(0xd9d6c9, 0.6, 0.05);
  const kraftA = new THREE.MeshStandardMaterial({ map: kraftTexture(11, 'FUSES 10A'), roughness: 0.95 });
  const kraftB = new THREE.MeshStandardMaterial({ map: kraftTexture(23, 'RAIL CLIPS'), roughness: 0.95 });
  const kraftC = new THREE.MeshStandardMaterial({ map: kraftTexture(37, 'GASKETS'), roughness: 0.95 });

  const shelf = (y) => {
    add(g, new THREE.BoxGeometry(w - 0.03, 0.018, d - 0.05), shelfMat, 0, y, -(d - 0.05) / 2 - 0.02);
    add(g, new THREE.BoxGeometry(w - 0.03, 0.05, 0.014), shelfMat, 0, y + 0.026, -0.028);
    for (const sx of [-1, 1]) for (const z of [-0.07, -d + 0.10]) {
      add(g, new THREE.BoxGeometry(0.014, 0.09, 0.016), clip, sx * (w / 2 - 0.05), y - 0.053, z);
    }
    return y + 0.009;
  };

  for (const [yy, rr] of [[0.05, 0.19], [0.14, 0.155]]) {
    add(g, new THREE.TorusGeometry(rr, 0.042, 8, 22), rubber, -0.34, yy, -0.56, Math.PI / 2);
  }
  add(g, new THREE.BoxGeometry(0.44, 0.20, 0.34), caseMat, 0.30, 0.10, -0.58);
  add(g, new THREE.BoxGeometry(0.46, 0.012, 0.36), std(0x2f3a41, 0.6, 0.35), 0.30, 0.205, -0.58);
  add(g, new THREE.BoxGeometry(0.10, 0.02, 0.03), steelMat, 0.30, 0.14, -0.40);
  add(g, new THREE.BoxGeometry(0.30, 0.26, 0.28), kraftB, 0.02, 0.13, -0.20);
  add(g, new THREE.BoxGeometry(0.26, 0.20, 0.24), kraftC, -0.02, 0.36, -0.24, 0, 0.22, 0);
  add(g, new THREE.CylinderGeometry(0.075, 0.075, 0.15, 14), whiteMat, -0.56, 0.075, -0.20);
  add(g, new THREE.TorusGeometry(0.06, 0.006, 6, 14, Math.PI), steelMat, -0.56, 0.15, -0.20);

  const s1 = shelf(0.95);
  add(g, new THREE.BoxGeometry(0.28, 0.20, 0.24), kraftA, -0.42, s1 + 0.10, -0.55);
  add(g, new THREE.CylinderGeometry(0.024, 0.024, 0.26, 10), std(0x2b2f33, 0.5, 0.3), -0.02, s1 + 0.024, -0.20, 0, 0, Math.PI / 2);
  add(g, new THREE.CylinderGeometry(0.034, 0.024, 0.06, 10), steelMat, 0.13, s1 + 0.024, -0.20, 0, 0, Math.PI / 2);
  add(g, new THREE.TorusGeometry(0.048, 0.018, 8, 18), std(0x1c1f22, 0.9), 0.26, s1 + 0.018, -0.24, Math.PI / 2);
  add(g, new THREE.BoxGeometry(0.11, 0.03, 0.17), orangeMat, 0.44, s1 + 0.016, -0.30, 0, 0.3, 0);
  add(g, new THREE.BoxGeometry(0.11, 0.03, 0.17), orangeMat, 0.48, s1 + 0.048, -0.33, 0, -0.2, 0.06);
  add(g, new THREE.CylinderGeometry(0.038, 0.038, 0.12, 12), std(0x8d9398, 0.45, 0.5), 0.50, s1 + 0.06, -0.62);
  add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.09, 8), std(0x8d9398, 0.45, 0.5), 0.50, s1 + 0.14, -0.62, 0.5, 0, 0);

  const s2 = shelf(2.10);
  add(g, new THREE.SphereGeometry(0.115, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), whiteMat, -0.40, s2, -0.46);
  add(g, new THREE.CylinderGeometry(0.145, 0.145, 0.014, 18), whiteMat, -0.40, s2 + 0.007, -0.46);
  add(g, new THREE.BoxGeometry(0.05, 0.03, 0.10), orangeMat, -0.40, s2 + 0.09, -0.35);
  add(g, new THREE.TorusGeometry(0.075, 0.022, 8, 18), std(0xb3261e, 0.8), -0.06, s2 + 0.09, -0.30, 0, Math.PI / 2, 0);
  add(g, new THREE.TorusGeometry(0.085, 0.010, 6, 16, Math.PI), std(0x22262a, 0.8), -0.06, s2 + 0.09, -0.30, 0, Math.PI / 2, 0);
  add(g, new THREE.CylinderGeometry(0.032, 0.032, 0.19, 12), std(0x2f6b3a, 0.55, 0.2), 0.17, s2 + 0.095, -0.24);
  add(g, new THREE.CylinderGeometry(0.026, 0.030, 0.05, 12), std(0xd8d5c8, 0.6), 0.17, s2 + 0.215, -0.24);
  for (let i = 0; i < 3; i++) {
    add(g, new THREE.BoxGeometry(0.22, 0.028, 0.18), i % 2 ? std(0x6a7b86, 0.9) : std(0x8a7f6a, 0.9),
      0.42, s2 + 0.016 + i * 0.03, -0.56, 0, 0.1 * i, 0);
  }
  add(g, new THREE.TorusGeometry(0.05, 0.011, 8, 18), std(0xb58f2b, 0.4, 0.5), 0.55, s2 + 0.011, -0.22, Math.PI / 2);

  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 0.58),
    new THREE.MeshStandardMaterial({ map: lockerBoardTexture(), roughness: 0.85 }));
  board.position.set(0, 2.85, -d + 0.006);
  board.name = 'TX-03 tool board';
  g.add(board);

  add(g, new THREE.CylinderGeometry(0.010, 0.010, w - 0.10, 10), steelMat, 0, 1.68, -0.20, 0, 0, Math.PI / 2);
  for (const sx of [-1, 1]) {
    add(g, new THREE.BoxGeometry(0.024, 0.07, 0.05), clip, sx * (w / 2 - 0.04), 1.65, -0.20);
    add(g, new THREE.TorusGeometry(0.022, 0.005, 6, 12, Math.PI), steelMat, sx * 0.26, 1.655, -0.20, 0, 0, Math.PI);
  }
  const crowbarAnchor = new THREE.Object3D();
  crowbarAnchor.name = 'Crowbar anchor';
  crowbarAnchor.position.set(0.03, 1.645, -0.20);
  g.add(crowbarAnchor);

  add(g, new THREE.BoxGeometry(0.18, 0.035, 0.05), std(0x2b3034, 0.6, 0.3), 0, h - 0.10, -0.18);
  add(g, new THREE.BoxGeometry(0.15, 0.014, 0.03), new THREE.MeshBasicMaterial({ color: 0xfff0cf }), 0, h - 0.121, -0.18);
  const light = new THREE.PointLight(0xffe6bb, 1.5, 2.6, 1.7);
  light.position.set(0, h - 0.16, -0.24);
  g.add(light);

  g.userData.crowbarAnchor = crowbarAnchor;
  g.userData.light = light;
  g.userData.size = { w, h, d };
  return g;
}

// ---------------------------------------------------------------------------
// MAINS PLUG / SOCKET STRIP / EXTENSION LEAD
// ---------------------------------------------------------------------------
export function buildMainsPlug(color = 0x1c1f22) {
  const g = new THREE.Group(); g.name = 'Mains plug';
  const body = std(color, 0.75, 0.05);
  const brass = std(0xc9a227, 0.32, 0.7);
  add(g, new RoundedBoxGeometry(0.056, 0.072, 0.036, 3, 0.008), body);
  add(g, new THREE.BoxGeometry(0.050, 0.066, 0.006), std(0x2a2e32, 0.7), 0, 0, 0.019);
  add(g, new THREE.BoxGeometry(0.008, 0.022, 0.005), brass, 0, 0.020, 0.023);
  for (const sx of [-1, 1]) add(g, new THREE.BoxGeometry(0.006, 0.018, 0.005), brass, sx * 0.017, -0.014, 0.023);
  add(g, new THREE.CylinderGeometry(0.009, 0.009, 0.05, 8), std(0x14171a, 0.95), 0, -0.058, -0.004);
  add(g, new THREE.BoxGeometry(0.026, 0.008, 0.010), std(0xd8d5c8, 0.8), 0, 0.004, -0.019);
  return g;
}

function socketFaceTexture(label, seed) {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = rng(seed);
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#efece2'); grad.addColorStop(1, '#cfccc2');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(90,85,70,${r() * 0.06})`; g.fillRect(r() * w, r() * h, 2, 2); }
    g.strokeStyle = 'rgba(70,66,58,0.55)'; g.lineWidth = 5; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#15171a';
    g.fillRect(w * 0.45, h * 0.24, w * 0.10, h * 0.13);
    for (const sx of [-1, 1]) g.fillRect(w * (0.5 + sx * 0.20) - w * 0.04, h * 0.52, w * 0.08, h * 0.12);
    g.fillStyle = 'rgba(120,115,100,0.55)'; g.font = '16px monospace'; g.textAlign = 'center';
    g.fillText('13A  230V~', w / 2, h * 0.16);
    g.fillStyle = 'rgba(50,46,40,0.8)'; g.font = 'bold 22px monospace';
    g.fillText(label, w / 2, h * 0.90);
  });
}

export function buildSocketStrip() {
  const g = new THREE.Group(); g.name = 'Mains socket strip';
  const plate = std(0xd5d2c8, 0.7, 0.05);
  const steelMat = std(0x9aa3ab, 0.42, 0.5);
  add(g, new RoundedBoxGeometry(0.36, 0.13, 0.026, 3, 0.006), plate);
  add(g, new THREE.BoxGeometry(0.368, 0.012, 0.030), steelMat, 0, 0.062, -0.002);
  add(g, new THREE.BoxGeometry(0.368, 0.012, 0.030), steelMat, 0, -0.062, -0.002);
  for (const sx of [-1, 1]) add(g, new THREE.CylinderGeometry(0.005, 0.005, 0.006, 8), steelMat, sx * 0.168, 0, 0.014, Math.PI / 2);

  const kinds = [
    { kind: 'dead', label: 'FEEDER 4' },
    { kind: 'live', label: 'FEEDER 2' },
    { kind: 'phase', label: '415V 3PH' },
  ];
  const sockets = kinds.map(({ kind, label }, i) => {
    const socket = new THREE.Group();
    socket.position.set((i - 1) * 0.112, 0, 0.013);
    socket.name = `Socket ${label}`;
    g.add(socket);
    if (kind === 'phase') {
      add(socket, new THREE.CylinderGeometry(0.048, 0.050, 0.040, 18), std(0xa8241c, 0.6, 0.1), 0, 0, 0.020, Math.PI / 2);
      add(socket, new THREE.TorusGeometry(0.049, 0.006, 8, 20), std(0x7d1a13, 0.6, 0.1), 0, 0, 0.040);
      add(socket, new THREE.CircleGeometry(0.042, 18), std(0x2a2e32, 0.8), 0, 0, 0.041);
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k - 2) * 0.62;
        add(socket, new THREE.CylinderGeometry(0.006, 0.006, 0.006, 8), std(0x15171a, 0.9),
          Math.cos(a) * 0.024, Math.sin(a) * 0.024, 0.043, Math.PI / 2);
      }
    } else {
      add(socket, new THREE.BoxGeometry(0.092, 0.092, 0.012),
        new THREE.MeshStandardMaterial({ map: socketFaceTexture(label, i * 7 + 3), roughness: 0.7 }), 0, 0, 0.006);
      add(socket, new THREE.BoxGeometry(0.098, 0.006, 0.014), std(0xb8b4aa, 0.7), 0, 0.049, 0.006);
    }
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x3a2018 });
    add(socket, new THREE.CylinderGeometry(0.006, 0.006, 0.006, 10), ledMat, 0, -0.052, 0.012, Math.PI / 2);
    return { index: i, kind, label, group: socket, ledMat };
  });

  const labelPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.032),
    new THREE.MeshStandardMaterial({
      map: canvasTexture(512, 48, (gg, w, h) => {
        gg.fillStyle = '#e6e2d4'; gg.fillRect(0, 0, w, h);
        gg.fillStyle = '#2c2a24'; gg.font = 'bold 24px monospace'; gg.textAlign = 'center';
        gg.fillText('AUXILIARY SUPPLY \u2014 IT LOADS ON FEEDER 2 ONLY', w / 2, 32);
      }), roughness: 0.8,
    }));
  labelPlate.position.set(0, -0.088, 0.006);
  g.add(labelPlate);

  g.userData.sockets = sockets;
  g.userData.setLive = (on) => {
    const live = sockets.find((s) => s.kind === 'live');
    live.ledMat.color.setHex(on ? 0x46e06a : 0x3a2018);
  };
  return g;
}

export function buildExtensionLead({ radius = 0.17, coils = 6 } = {}) {
  const g = new THREE.Group(); g.name = 'Extension lead';
  const rubber = std(0x16191c, 0.95, 0);
  const orangePlastic = std(0xf0a020, 0.72, 0.05);
  for (let i = 0; i < coils; i++) {
    add(g, new THREE.TorusGeometry(radius - i * 0.004, 0.010, 8, 26), rubber,
      (i - coils / 2) * 0.006, 0.012 + i * 0.004, 0, Math.PI / 2, 0, i * 0.4);
  }
  add(g, new THREE.BoxGeometry(0.05, 0.026, 0.032), std(0x22262a, 0.8), 0, 0.014 + coils * 0.004, radius - 0.012);
  const plug = buildMainsPlug(0xf0a020);
  plug.position.set(radius + 0.05, 0.036, 0.10);
  plug.rotation.set(-Math.PI / 2, 0, 0.5);
  g.add(plug);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(radius - 0.02, 0.03, 0.02),
    new THREE.Vector3(radius + 0.03, 0.03, 0.07),
    new THREE.Vector3(radius + 0.05, 0.036, 0.10),
  ]), 12, 0.008, 8, false), rubber));
  const socketEnd = new THREE.Group();
  socketEnd.position.set(-radius - 0.04, 0.03, -0.08);
  socketEnd.rotation.y = 0.6;
  add(socketEnd, new RoundedBoxGeometry(0.072, 0.072, 0.046, 3, 0.01), orangePlastic);
  add(socketEnd, new THREE.BoxGeometry(0.058, 0.058, 0.006), std(0x2a2e32, 0.8), 0, 0, 0.024);
  g.add(socketEnd);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-radius + 0.02, 0.03, -0.02),
    new THREE.Vector3(-radius - 0.01, 0.03, -0.06),
    new THREE.Vector3(-radius - 0.04, 0.03, -0.08),
  ]), 12, 0.008, 8, false), rubber));
  g.userData.plug = plug;
  g.userData.socketEnd = socketEnd;
  return g;
}

export function buildCableRun(points, { radius = 0.010, color = 0x16191c } = {}) {
  const g = new THREE.Group(); g.name = 'Mains cable run';
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.4);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 12), radius, 8, false), std(color, 0.95, 0));
  cable.castShadow = true;
  g.add(cable);
  g.userData.curve = curve;
  return g;
}