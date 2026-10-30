import * as THREE from 'three';

// Painted steel and a separate service-door texture, shared by all three feeders.
// Relief is linear data; only the colour textures use sRGB.
export function createFeederMaterials() {
  function surface(width, height) {
    const color = document.createElement('canvas'), relief = document.createElement('canvas');
    color.width = relief.width = width; color.height = relief.height = height;
    const c = color.getContext('2d'), b = relief.getContext('2d');
    c.fillStyle = '#46545d'; c.fillRect(0, 0, width, height);
    b.fillStyle = '#808080'; b.fillRect(0, 0, width, height);
    // Deterministic grain leaves the feeder-load shuffle independent of decoration.
    const noise = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    for (let i = 0; i < width * height / 20; i++) {
      const x = noise(i * 3) * width, y = noise(i * 3 + 1) * height;
      c.fillStyle = i % 2 ? 'rgba(210,220,225,0.08)' : 'rgba(5,12,18,0.13)';
      c.fillRect(x, y, 1 + noise(i * 3 + 2) * 4, 1);
      b.fillStyle = i % 2 ? '#959595' : '#6e6e6e'; b.fillRect(x, y, 2, 1);
    }
    return { color, relief, c, b, width, height };
  }
  function material(surface, name) {
    const map = new THREE.CanvasTexture(surface.color); map.colorSpace = THREE.SRGBColorSpace;
    const bumpMap = new THREE.CanvasTexture(surface.relief);
    const result = new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: 0.003,
      metalness: 0.55, roughness: 0.74 });
    result.name = name; return result;
  }
  const casing = surface(256, 256);
  const door = surface(512, 1024), { c, b } = door;
  // Recessed service-door seam with chipped paint around the exposed edge.
  c.strokeStyle = '#101b22'; c.lineWidth = 9; c.strokeRect(12, 12, 488, 1000);
  c.strokeStyle = '#7d898d'; c.lineWidth = 2; c.strokeRect(20, 20, 472, 984);
  b.strokeStyle = '#252525'; b.lineWidth = 8; b.strokeRect(12, 12, 488, 1000);
  for (const x of [38, 474]) for (const y of [42, 982]) {
    c.fillStyle = '#17232b'; c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#9ba6ac'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = '#0a1015'; c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x + 6, y); c.stroke();
    b.fillStyle = '#bbbbbb'; b.beginPath(); b.arc(x, y, 12, 0, Math.PI * 2); b.fill();
  }
  // Lower ventilation slots and an industrial warning band below the handle.
  for (let y = 735; y < 860; y += 24) {
    c.fillStyle = '#17232a'; c.fillRect(85, y, 342, 9);
    c.fillStyle = '#687780'; c.fillRect(85, y + 9, 342, 2);
    b.fillStyle = '#303030'; b.fillRect(85, y, 342, 9);
  }
  c.save(); c.beginPath(); c.rect(64, 900, 384, 43); c.clip();
  c.fillStyle = '#c8a13d'; c.fillRect(64, 900, 384, 43);
  c.strokeStyle = '#182027'; c.lineWidth = 25;
  for (let x = 30; x < 500; x += 52) { c.beginPath(); c.moveTo(x, 952); c.lineTo(x + 60, 890); c.stroke(); }
  c.restore();
  c.fillStyle = '#c3cbd0'; c.font = 'bold 23px monospace'; c.textAlign = 'center';
  c.fillText('HIGH VOLTAGE', 256, 700);
  c.fillStyle = 'rgba(195,203,207,0.45)';
  for (let i = 0; i < 24; i++) c.fillRect(20 + (i * 37) % 470, 30 + (i * 83) % 960, 3 + i % 9, 2);
  return { casing: material(casing, 'Feeder worn painted steel'),
    door: material(door, 'Feeder bolted service door') };
}
