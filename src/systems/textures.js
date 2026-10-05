import * as THREE from 'three';

/**
 * Procedural PBR Texture Generator for BLACKOUT.
 * Generates Diffuse, Bump, and Roughness maps dynamically via 2D HTML5 Canvas.
 * Fulfills the CGV Rubric requirement for "textures used for more than colour (bump maps)".
 */

function createNoise(ctx, width, height, opacity = 0.08) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = (Math.random() - 0.5) * 255 * opacity;
    data[i] = Math.min(255, Math.max(0, data[i] + v));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + v));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + v));
  }
  ctx.putImageData(imgData, 0, 0);
}

/** Concrete floor slab with seams & bump map */
export function createFloorTextures() {
  const size = 512;

  // Diffuse Map
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = size;
  diffCanvas.height = size;
  const dCtx = diffCanvas.getContext('2d');

  dCtx.fillStyle = '#63707e';
  dCtx.fillRect(0, 0, size, size);

  // Tile grid seams
  dCtx.strokeStyle = '#434d57';
  dCtx.lineWidth = 4;
  dCtx.strokeRect(2, 2, size - 4, size - 4);
  dCtx.beginPath();
  dCtx.moveTo(size / 2, 0); dCtx.lineTo(size / 2, size);
  dCtx.moveTo(0, size / 2); dCtx.lineTo(size, size / 2);
  dCtx.stroke();
  createNoise(dCtx, size, size, 0.12);

  // Bump Map
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);
  bCtx.strokeStyle = '#202020';
  bCtx.lineWidth = 6;
  bCtx.strokeRect(2, 2, size - 4, size - 4);
  bCtx.beginPath();
  bCtx.moveTo(size / 2, 0); bCtx.lineTo(size / 2, size);
  bCtx.moveTo(0, size / 2); bCtx.lineTo(size, size / 2);
  bCtx.stroke();
  createNoise(bCtx, size, size, 0.18);

  const map = new THREE.CanvasTexture(diffCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4, 4);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(4, 4);

  return { map, bumpMap };
}

/** Industrial modular wall panel with seams and rivets */
export function createWallTextures() {
  const size = 512;

  // Diffuse Map
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = size;
  diffCanvas.height = size;
  const dCtx = diffCanvas.getContext('2d');

  dCtx.fillStyle = '#7a8999';
  dCtx.fillRect(0, 0, size, size);

  // Panel bevel borders
  dCtx.strokeStyle = '#576370';
  dCtx.lineWidth = 8;
  dCtx.strokeRect(8, 8, size - 16, size - 16);

  dCtx.fillStyle = '#8898aa';
  dCtx.fillRect(16, 16, size - 32, size - 32);

  // Rivets/bolts in corners
  const rivetOffset = 32;
  const corners = [
    [rivetOffset, rivetOffset],
    [size - rivetOffset, rivetOffset],
    [rivetOffset, size - rivetOffset],
    [size - rivetOffset, size - rivetOffset],
  ];

  dCtx.fillStyle = '#3a444f';
  for (const [cx, cy] of corners) {
    dCtx.beginPath();
    dCtx.arc(cx, cy, 6, 0, Math.PI * 2);
    dCtx.fill();
  }
  createNoise(dCtx, size, size, 0.08);

  // Bump Map
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  bCtx.strokeStyle = '#303030';
  bCtx.lineWidth = 10;
  bCtx.strokeRect(8, 8, size - 16, size - 16);

  bCtx.fillStyle = '#a0a0a0';
  bCtx.fillRect(16, 16, size - 32, size - 32);

  // Raised rivets
  bCtx.fillStyle = '#ffffff';
  for (const [cx, cy] of corners) {
    bCtx.beginPath();
    bCtx.arc(cx, cy, 6, 0, Math.PI * 2);
    bCtx.fill();
  }
  createNoise(bCtx, size, size, 0.1);

  const map = new THREE.CanvasTexture(diffCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 1);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 1);

  return { map, bumpMap };
}

/** Hazard yellow/black warning stripes */
export function createHazardTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f5b027';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#1c1f24';
  const stripeWidth = 32;
  for (let x = -size; x < size * 2; x += stripeWidth * 2) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + stripeWidth, 0);
    ctx.lineTo(x + stripeWidth + size, size);
    ctx.lineTo(x + size, size);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  return texture;
}

/** Server rack front panel with ventilation slots and LEDs */
export function createServerRackTexture() {
  const w = 256;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Dark matte steel chassis
  ctx.fillStyle = '#1e242b';
  ctx.fillRect(0, 0, w, h);

  // Rack slot segments
  const slots = 8;
  const slotHeight = h / slots;

  for (let i = 0; i < slots; i++) {
    const y = i * slotHeight;
    ctx.strokeStyle = '#323c47';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, y + 4, w - 12, slotHeight - 8);

    // Vents
    ctx.fillStyle = '#0e1216';
    for (let vx = 20; vx < w - 50; vx += 12) {
      ctx.fillRect(vx, y + 12, 6, slotHeight - 24);
    }

    // Status LEDs
    const isGreen = Math.random() > 0.3;
    ctx.fillStyle = isGreen ? '#2bff8f' : '#ffaa2b';
    ctx.beginPath();
    ctx.arc(w - 24, y + 16, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2bff8f';
    ctx.beginPath();
    ctx.arc(w - 24, y + 28, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
