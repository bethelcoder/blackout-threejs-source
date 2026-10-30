import * as THREE from 'three';

// A repeatable armour-panel pattern, drawn once and shared by all four walls.
// Surface colour and relief are separate so seams catch the room's lighting.
export function applyCoreWalls(room) {
  const canvas = document.createElement('canvas');
  const relief = document.createElement('canvas');
  canvas.width = canvas.height = relief.width = relief.height = 1024;
  const color = canvas.getContext('2d');
  const bump = relief.getContext('2d');
  color.fillStyle = '#161b1f'; color.fillRect(0, 0, 1024, 1024);
  bump.fillStyle = '#303030'; bump.fillRect(0, 0, 1024, 1024);

  function polygon(context, points) {
    context.beginPath();
    points.forEach(([x, y], i) => i ? context.lineTo(x, y) : context.moveTo(x, y));
    context.closePath();
  }
  function bolt(x, y) {
    color.fillStyle = '#111619'; color.beginPath(); color.arc(x, y, 8, 0, Math.PI * 2); color.fill();
    color.strokeStyle = '#62686b'; color.lineWidth = 1.5; color.stroke();
    color.strokeStyle = '#080c0f'; color.lineWidth = 2;
    color.beginPath(); color.moveTo(x - 3, y - 3); color.lineTo(x + 3, y + 3); color.stroke();
    bump.fillStyle = '#454545'; bump.beginPath(); bump.arc(x, y, 8, 0, Math.PI * 2); bump.fill();
  }
  function panel(points, bolts) {
    const gradient = color.createLinearGradient(0, points[0][1], 0, points.at(-1)[1] + 300);
    gradient.addColorStop(0, '#454b50'); gradient.addColorStop(1, '#292f34');
    polygon(color, points); color.fillStyle = gradient; color.fill();
    color.save(); color.clip();
    // Fine diagonal cross-grain, kept subtle enough to avoid shimmering.
    color.lineWidth = 1;
    for (let x = -1024; x < 2048; x += 8) {
      color.strokeStyle = 'rgba(180,190,195,0.065)';
      color.beginPath(); color.moveTo(x, 0); color.lineTo(x - 1024, 1024); color.stroke();
      color.strokeStyle = 'rgba(0,0,0,0.10)';
      color.beginPath(); color.moveTo(x + 2, 0); color.lineTo(x - 1022, 1024); color.stroke();
    }
    color.restore();
    polygon(color, points); color.strokeStyle = '#0b1013'; color.lineWidth = 6; color.stroke();
    polygon(color, points); color.strokeStyle = '#62696d'; color.lineWidth = 1; color.stroke();
    polygon(bump, points); bump.fillStyle = '#b0b0b0'; bump.fill();
    bump.strokeStyle = '#505050'; bump.lineWidth = 6; bump.stroke();
    bolts.forEach(([x, y]) => bolt(x, y));
  }
  const rectangle = (x, y, w, h) => panel([[x, y], [x + w, y], [x + w, y + h], [x, y + h]],
    [[x + 15, y + 15], [x + w - 15, y + 15], [x + 15, y + h - 15], [x + w - 15, y + h - 15]]);
  rectangle(10, 10, 342, 126);
  rectangle(10, 146, 342, 244);
  rectangle(10, 400, 342, 126);
  rectangle(362, 10, 450, 516);
  rectangle(822, 10, 192, 174);
  rectangle(822, 194, 192, 332);
  panel([[36, 540], [302, 540], [324, 560], [686, 560], [708, 540], [1014, 540], [1014, 754], [758, 1014], [10, 1014], [10, 566]],
    [[42, 574], [982, 574], [42, 982], [752, 982]]);
  panel([[1014, 780], [1014, 1014], [782, 1014]], [[982, 982]]);

  const map = new THREE.CanvasTexture(canvas);
  const bumpMap = new THREE.CanvasTexture(relief);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const texture of [map, bumpMap]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(14 / 2.75, 5.5 / 2.75);
  }
  const material = new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: 0.025,
    metalness: 0.65, roughness: 0.64 });
  material.name = 'Core dark metal wall panels';
  const oldMaterials = new Set(), oldTextures = new Set();
  for (const wall of room.children.filter(object => object.name === 'Room wall')) {
    oldMaterials.add(wall.material);
    wall.material = material;
  }
  for (const old of oldMaterials) {
    Object.values(old).forEach(value => { if (value?.isTexture) oldTextures.add(value); });
    old.dispose();
  }
  oldTextures.forEach(texture => texture.dispose());
}
