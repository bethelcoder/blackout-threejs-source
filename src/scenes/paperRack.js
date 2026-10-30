import * as THREE from 'three';
import { canvasTexture, std } from './puzzleItems.js';
import { PAPER_RACK } from './level2Layout.js';

// ---------------------------------------------------------------------------
// PAPERWORK RACK beside the workbench.
//
// Four tilted trays of realistic substation paperwork: dot-matrix printouts,
// ruled logbooks, manila folders, cloth ring binders and rolled drawings. The
// equipment register (the sheet that names TX-03) is clipped to a board propped
// in the third bay -- puzzleChain.js owns that mesh and drops it onto
// rack.sheetAnchor, so the clue and its overlay can never disagree.
//
// Sized up from 0.72 x 0.34 x 1.42 to 0.84 x 0.44 x 1.58 so the A4-height
// ring binders in the second bay have real tray depth to sit in, and the tray
// tilt dropped from 0.22 rad to 0.12 rad with a taller front lip so they stand
// upright instead of falling out the front of the tray.
// ---------------------------------------------------------------------------

const W = 0.84;          // across the rack (local x)
const D = 0.44;          // deep (local z, back at -D/2)
const H = 1.58;
const TRAY_Y = [0.24, 0.58, 0.92, 1.26];
const TRAY_TILT = 0.12;  // trays tip down towards the room so paper leans back
const FRONT_LIP_H = 0.12;

function paperEdges(seed = 3, tint = '#efe9d6') {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = seeded(seed);
    g.fillStyle = tint; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      g.fillStyle = `rgba(120,105,75,${0.16 + r() * 0.24})`;
      g.fillRect(0, y, w, 1);
      g.fillStyle = `rgba(255,255,250,${0.25 + r() * 0.4})`;
      g.fillRect(r() * 6, y + 1, w - r() * 12, 1);
    }
    for (let i = 0; i < 26; i++) {
      const x = r() < 0.5 ? r() * 26 : w - r() * 26, y = r() * h;
      g.fillStyle = 'rgba(150,132,96,0.35)';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14, y + 4); g.lineTo(x, y + 8); g.closePath(); g.fill();
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(${130 + r() * 60},${100 + r() * 40},${50 + r() * 30},${0.05 + r() * 0.16})`;
      g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 7, 0, 6.28); g.fill();
    }
    const shade = g.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, 'rgba(60,50,30,0.20)'); shade.addColorStop(0.35, 'rgba(60,50,30,0)');
    shade.addColorStop(1, 'rgba(60,50,30,0.28)');
    g.fillStyle = shade; g.fillRect(0, 0, w, h);
  });
}

function pageTop(kind = 'printout', seed = 9) {
  return canvasTexture(512, 640, (g, w, h) => {
    const r = seeded(seed);
    g.fillStyle = kind === 'blue' ? '#e3e8ee' : '#ece6d2'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(120,105,75,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 2, 2); }
    if (kind === 'printout') {
      g.fillStyle = 'rgba(90,80,60,0.5)';
      for (let y = 18; y < h; y += 22) g.fillRect(0, y, w, 1);
      for (const x of [10, w - 26]) { g.fillStyle = 'rgba(150,140,110,0.55)'; g.fillRect(x, 0, 16, h); }
      for (let y = 12; y < h; y += 24) {
        g.fillStyle = '#cfc7ac'; g.beginPath(); g.arc(18, y, 5, 0, 6.28); g.fill();
        g.beginPath(); g.arc(w - 18, y, 5, 0, 6.28); g.fill();
      }
      g.fillStyle = '#2c3a48'; g.font = '17px monospace';
      for (let i = 0; i < 24; i++) {
        let line = '';
        for (let k = 0; k < 34; k++) line += r() < 0.18 ? ' ' : String.fromCharCode(48 + Math.floor(r() * 42));
        g.fillText(line, 40, 60 + i * 22);
      }
    } else if (kind === 'ruled') {
      g.strokeStyle = 'rgba(90,120,160,0.42)'; g.lineWidth = 1.5;
      for (let y = 96; y < h - 40; y += 34) { g.beginPath(); g.moveTo(40, y); g.lineTo(w - 40, y); g.stroke(); }
      g.strokeStyle = 'rgba(190,60,50,0.5)'; g.beginPath(); g.moveTo(78, 60); g.lineTo(78, h - 40); g.stroke();
      g.fillStyle = '#3b3527'; g.font = 'italic 24px "Segoe Print","Comic Sans MS",cursive';
      for (let i = 0; i < 12; i++) {
        let line = '';
        const n = 14 + Math.floor(r() * 20);
        for (let k = 0; k < n; k++) line += r() < 0.16 ? ' ' : String.fromCharCode(97 + Math.floor(r() * 26));
        g.fillText(line, 92 + (r() - 0.5) * 4, 90 + i * 34);
      }
      g.fillStyle = '#7a1c10'; g.font = 'bold 20px monospace'; g.fillText('FEEDER 4 TRIPPED  06:12', 92, 90 + 5 * 34);
    } else {
      g.fillStyle = '#2b2b26'; g.font = 'bold 26px monospace'; g.fillText('INSPECTION REPORT', 44, 74);
      g.fillStyle = '#6b6350'; g.fillRect(44, 90, w - 88, 3);
      g.font = '19px monospace'; g.fillStyle = '#3a382e';
      ['Substation 4 - quarterly', 'Earth continuity  OK', 'Insulation  250 M-ohm', 'Oil sample  DUE', '', 'Signed: ____________']
        .forEach((l, i) => g.fillText(l, 44, 146 + i * 44));
      g.strokeStyle = 'rgba(30,60,160,0.35)'; g.lineWidth = 5; g.beginPath();
      g.moveTo(300, 420); g.bezierCurveTo(360, 380, 380, 470, 440, 420); g.stroke();
      g.strokeStyle = 'rgba(150,30,25,0.55)'; g.lineWidth = 6;
      g.beginPath(); g.arc(w - 110, 170, 62, 0, 6.28); g.stroke();
      g.fillStyle = 'rgba(150,30,25,0.5)'; g.font = 'bold 19px monospace'; g.textAlign = 'center';
      g.fillText('MERIDIAN', w - 110, 166); g.fillText('POWER', w - 110, 190); g.textAlign = 'left';
    }
    const fold = g.createLinearGradient(0, 0, w, h);
    fold.addColorStop(0, 'rgba(255,255,255,0.10)'); fold.addColorStop(1, 'rgba(90,75,40,0.16)');
    g.fillStyle = fold; g.fillRect(0, 0, w, h);
  });
}

function binderSpine(title, cloth, seed = 5) {
  return canvasTexture(128, 512, (g, w, h) => {
    const r = seeded(seed);
    g.fillStyle = cloth; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 2, 3); }
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h);
    g.fillStyle = '#eee9dc'; g.fillRect(18, 60, w - 36, 128);
    g.strokeStyle = 'rgba(40,40,40,0.6)'; g.lineWidth = 3; g.strokeRect(18, 60, w - 36, 128);
    g.fillStyle = '#23231e'; g.font = 'bold 21px monospace'; g.textAlign = 'center';
    title.split(' ').slice(0, 3).forEach((word, i) => g.fillText(word, w / 2, 96 + i * 32));
    g.fillStyle = 'rgba(238,233,220,0.85)'; g.fillRect(18, h - 150, w - 36, 58);
    g.fillStyle = '#23231e'; g.font = 'bold 24px monospace'; g.fillText(`B${2 + seed % 7}`, w / 2, h - 110);
    for (const y of [h - 60, h - 44]) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(w / 2, y, 7, 0, 6.28); g.fill(); }
    g.textAlign = 'left';
  });
}

function manilaTexture(seed = 12) {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = seeded(seed);
    g.fillStyle = '#cbb377'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,70,35' : '240,225,180'},${r() * 0.09})`; g.fillRect(r() * w, r() * h, 2, 2); }
    g.strokeStyle = 'rgba(90,70,35,0.35)'; g.lineWidth = 2; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = 'rgba(60,45,20,0.7)'; g.font = 'bold 20px monospace';
    g.fillText(['FUSE RECORDS', 'CABLE TESTS', 'WORK ORDERS', 'SPARES LIST'][seed % 4], 18, 46);
    g.fillStyle = 'rgba(60,45,20,0.45)'; g.font = '15px monospace'; g.fillText('DO NOT REMOVE FROM SITE', 18, h - 24);
  });
}

function clipboardTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = seeded(31);
    g.fillStyle = '#6b4a2b'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 130; i++) { g.fillStyle = i % 2 ? 'rgba(35,20,8,0.22)' : 'rgba(190,145,95,0.18)'; g.fillRect(0, r() * h, w, 1 + r() * 3); }
    g.strokeStyle = 'rgba(30,18,8,0.5)'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
  });
}

function cardLabel(text) {
  return canvasTexture(256, 96, (g, w, h) => {
    g.fillStyle = '#e7e1cd'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(60,55,40,0.6)'; g.lineWidth = 3; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#2f2c22'; g.font = 'bold 30px monospace'; g.textAlign = 'center';
    g.fillText(text, w / 2, 58);
  });
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function buildPaperRack({ scene, colliders = [], hud = null } = {}) {
  const group = new THREE.Group();
  group.name = 'Paperwork rack';
  group.position.set(PAPER_RACK.x, 0, PAPER_RACK.z);
  group.rotation.y = PAPER_RACK.yaw;
  scene.add(group);

  const textures = [];
  const T = (t) => { textures.push(t); return t; };
  const r = seeded(77);
  const frame = std(0x3d444a, 0.7, 0.35);
  const board = new THREE.MeshStandardMaterial({ map: T(clipboardTexture()), roughness: 0.85 });
  const paperMats = [0, 1, 2, 3].map((i) => new THREE.MeshStandardMaterial({ map: T(paperEdges(i * 5 + 2, i === 2 ? '#e6e2cf' : '#efe9d6')), roughness: 0.95 }));
  const tops = {
    printout: new THREE.MeshStandardMaterial({ map: T(pageTop('printout', 4)), roughness: 0.95 }),
    ruled: new THREE.MeshStandardMaterial({ map: T(pageTop('ruled', 8)), roughness: 0.95 }),
    typed: new THREE.MeshStandardMaterial({ map: T(pageTop('typed', 15)), roughness: 0.95 }),
  };
  const manila = [0, 1, 2].map((i) => new THREE.MeshStandardMaterial({ map: T(manilaTexture(i + 1)), roughness: 0.95 }));
  const binders = [
    ['HV TEST LOG', '#2b4a72', 3], ['WORK ORDERS', '#7a2418', 5], ['EARTH RECORDS', '#2f5a35', 7],
    ['SPARES', '#4a4238', 9], ['PERMITS', '#6a5a1c', 11],
  ].map(([title, cloth, seed]) => new THREE.MeshStandardMaterial({ map: T(binderSpine(title, cloth, seed)), roughness: 0.85 }));
  const steel = std(0xb0b7bd, 0.42, 0.6);

  const put = (geo, mat, x, y, z, parent = group) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  };

  // ---- carcass ----
  for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.022, H, D), frame, s * (W / 2 - 0.011), H / 2, 0);
  put(new THREE.BoxGeometry(W, H, 0.012), frame, 0, H / 2, -D / 2 + 0.006);
  put(new THREE.BoxGeometry(W + 0.02, 0.026, D + 0.02), frame, 0, H - 0.013, 0);
  put(new THREE.BoxGeometry(W - 0.03, 0.07, D - 0.03), std(0x22262a, 0.8, 0.2), 0, 0.035, 0);
  for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.05, 0.02, D - 0.06), std(0x1b1e21, 0.9), s * (W / 2 - 0.06), 0.01, 0);

  // ---- trays ----
  // Front lip raised to FRONT_LIP_H so the ring binders in bay 1 stay
  // upright even on the tilted tray. Tilt dropped to 0.12 rad to reduce the
  // forward slide that used to let tall binders fall out.
  const trays = TRAY_Y.map((y) => {
    const tray = new THREE.Group();
    tray.position.set(0, y, 0);
    tray.rotation.x = TRAY_TILT;
    group.add(tray);
    put(new THREE.BoxGeometry(W - 0.05, 0.014, D - 0.06), frame, 0, 0, 0, tray);
    put(new THREE.BoxGeometry(W - 0.05, FRONT_LIP_H, 0.012), frame, 0, 0.007 + FRONT_LIP_H / 2, (D - 0.06) / 2 - 0.006, tray);
    for (const s of [-1, 1]) put(new THREE.CylinderGeometry(0.006, 0.006, 0.10, 8), steel, s * (W / 2 - 0.04), -0.05, -0.06, tray);
    return tray;
  });

  function stack(parent, x, z, w, h, d, ry, topMat, edgeMat) {
    const g = new THREE.Group(); g.position.set(x, 0.007 + h / 2, z); g.rotation.y = ry; parent.add(g);
    put(new THREE.BoxGeometry(w, h, d), edgeMat, 0, 0, 0, g);
    put(new THREE.PlaneGeometry(w * 0.98, d * 0.98), topMat, 0, h / 2 + 0.0015, 0, g).rotation.x = -Math.PI / 2;
    return g;
  }

  // Bay 0: two printout stacks and a fanned manila folder bundle.
  stack(trays[0], -0.22, -0.02, 0.24, 0.055, 0.34, 0.03, tops.printout, paperMats[0]);
  stack(trays[0], 0.07, 0.02, 0.22, 0.035, 0.33, -0.07, tops.ruled, paperMats[1]);
  for (let i = 0; i < 4; i++) {
    const f = put(new THREE.BoxGeometry(0.28, 0.006, 0.38), manila[i % 3], 0.28 - i * 0.014, 0.012 + i * 0.007, -0.01 + i * 0.008, trays[0]);
    f.rotation.set(0, 0.05 + i * 0.035, 0);
  }

  // Bay 1: cloth ring binders leaning in a row, plus a pamphlet.
  // 0.072 spacing (up from 0.062) gives each A4 binder breathing room; the
  // taller front lip of the tray keeps them from falling over.
  const binderRow = new THREE.Group();
  binderRow.position.set(-0.22, 0.007, -0.02);
  binderRow.rotation.z = 0.08;
  trays[1].add(binderRow);
  binders.forEach((mat, i) => {
    const b = put(new THREE.BoxGeometry(0.055, 0.29, 0.30), mat, i * 0.072, 0.145, 0, binderRow);
    b.rotation.x = -0.02;
  });
  stack(trays[1], 0.24, 0.01, 0.22, 0.045, 0.33, -0.12, tops.typed, paperMats[2]);
  put(new THREE.BoxGeometry(0.18, 0.012, 0.27), manila[1], 0.28, 0.055, 0.02, trays[1]).rotation.y = 0.22;

  // Bay 2: rolled drawings in a tube rack, a notebook and loose sheets.
  for (let i = 0; i < 5; i++) {
    const roll = put(new THREE.CylinderGeometry(0.019 + r() * 0.006, 0.019 + r() * 0.006, 0.34, 10),
      i % 2 ? paperMats[3] : manila[2], -0.27 + i * 0.058, 0.165, -0.04, trays[2]);
    roll.rotation.set(-0.10 - r() * 0.06, r() * 0.4, 0.05 + r() * 0.05);
  }
  stack(trays[2], 0.18, 0.00, 0.23, 0.050, 0.33, 0.05, tops.printout, paperMats[0]);
  const note = put(new THREE.BoxGeometry(0.17, 0.022, 0.26), std(0x24303c, 0.8, 0.1), 0.18, 0.066, 0.01, trays[2]);
  note.rotation.y = -0.18;

  // Bay 3 (top): a jumble of folders and the rack's own label card.
  for (let i = 0; i < 5; i++) {
    const f = put(new THREE.BoxGeometry(0.30, 0.007, 0.36), manila[i % 3], -0.12 + i * 0.058, 0.014 + i * 0.008, -0.01 + (r() - 0.5) * 0.02, trays[3]);
    f.rotation.set(0, (r() - 0.5) * 0.5, 0);
  }
  stack(trays[3], 0.26, 0.00, 0.21, 0.040, 0.32, 0.09, tops.ruled, paperMats[1]);
  put(new THREE.PlaneGeometry(0.20, 0.075),
    new THREE.MeshStandardMaterial({ map: T(cardLabel('PAPERWORK')), roughness: 0.9 }),
    0, H - 0.055, D / 2 + 0.001, group);

  // ---- the register clipboard, propped in bay 2 ----
  const clip = new THREE.Group();
  clip.position.set(0.18, TRAY_Y[2] + 0.149, 0.028);
  clip.rotation.x = -0.45;
  group.add(clip);
  put(new THREE.BoxGeometry(0.245, 0.335, 0.010), board, 0, 0, 0, clip);
  put(new THREE.BoxGeometry(0.075, 0.026, 0.022), steel, 0, 0.163, 0.012, clip);
  put(new THREE.CylinderGeometry(0.006, 0.006, 0.085, 10), steel, 0, 0.150, 0.016, clip).rotation.z = Math.PI / 2;
  const sheetAnchor = new THREE.Object3D();
  sheetAnchor.name = 'Equipment register anchor';
  sheetAnchor.position.set(0, -0.006, 0.0062);
  clip.add(sheetAnchor);

  // One loose page tucked under the clip so the stack looks lived-in.
  const loose = put(new THREE.PlaneGeometry(0.21, 0.297), tops.typed, -0.10, 0.010, 0.00, trays[2]);
  loose.rotation.set(-Math.PI / 2, 0, 0.14);

  const collider = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(PAPER_RACK.x, H / 2, PAPER_RACK.z),
    new THREE.Vector3(D + 0.04, H, W + 0.04)
  );
  colliders.push(collider);

  return {
    group,
    colliders: [collider],
    sheetAnchor,
    hud,
    dispose() {
      group.removeFromParent();
      const seen = new Set();
      group.traverse((o) => {
        if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
      });
      textures.forEach((t) => t.dispose());
      for (const m of [frame, board, steel, ...paperMats, ...manila, ...binders, ...Object.values(tops)]) m.dispose?.();
      const index = colliders.indexOf(collider);
      if (index >= 0) colliders.splice(index, 1);
    },
  };
}