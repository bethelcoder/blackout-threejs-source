import * as THREE from 'three';

export const CLOCK_CLUE = 'Find TIM, E. on the hidden shift schedule. Enter his times in sector order: 1, 2, 3. Use four digits for each time.';
const VENT_CLUE = 'Where footsteps rise to meet the sky,A breath of iron waits nearby.Behind its ribs, kept out of sight,A twisted plan awaits the light. One servant only may leave its chest;Before another wakes, the first must rest.';

export function buildNoticeBoard({ hud }) {
  const group = new THREE.Group();
  group.name = 'Maintenance notice board';
  group.position.set(6.91, 1.95, -0.8);
  group.rotation.y = -Math.PI / 2;
  const textures = [];
  let seed = 431;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const canvasTexture = (draw, width = 512, height = 512) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    draw(canvas.getContext('2d'), width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    return texture;
  };
  const cork = canvasTexture(ctx => {
    ctx.fillStyle = '#ab8050';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 35000; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(62,38,18,0.25)' : 'rgba(233,197,140,0.3)';
      ctx.fillRect(random() * 512, random() * 512, 1 + random() * 3, 1 + random() * 3);
    }
  });
  const wood = canvasTexture(ctx => {
    ctx.fillStyle = '#75452c';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 180; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(34,17,9,0.2)' : 'rgba(205,141,83,0.15)';
      ctx.fillRect(0, random() * 512, 512, 1 + random() * 3);
    }
  });
  const woodMat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.85 });
  const corkMat = new THREE.MeshStandardMaterial({ map: cork, roughness: 1 });
  function box(name, x, y, z, w, h, d, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    group.add(mesh);
  }
  box('Cork backing', 0, 0, 0, 2.7, 1.75, 0.055, corkMat);
  for (const x of [-1.38, 1.38]) box('Wood side frame', x, 0, 0.035, 0.1, 1.95, 0.1, woodMat);
  for (const y of [-0.925, 0.925]) box('Wood frame', 0, y, 0.035, 2.86, 0.1, 0.1, woodMat);
  const notices = [
    { title: 'CLOCK CALIBRATION', text: CLOCK_CLUE, x: -0.83, y: 0.29, angle: 0.035, color: '#e5ddba', clue: true },
    { title: 'VENT MAINTENANCE', text: VENT_CLUE, x: 0.02, y: 0.23, angle: -0.055, color: '#e8e7db', clue: true },
    { title: 'SAFETY REMINDER', text: 'Keep walkways clear. Report damaged rails to maintenance. Use caution near electrical equipment.', x: 0.83, y: 0.38, angle: 0.07, color: '#dddccf' },
    { title: 'STAFF NOTICE', text: 'Return borrowed equipment after each shift. Leave the work area clean for the next team.', x: -0.7, y: -0.49, angle: -0.04, color: '#e6e2d3' },
    { title: 'INSPECTION RECORD', text: 'Routine inspection completed. Replacement parts requested. Supervisor signature on file.', x: 0.66, y: -0.4, angle: 0.025, color: '#d9c68c' },
  ];
  const pinMat = new THREE.MeshStandardMaterial({ color: 0x813d31, roughness: 0.55 });
  for (const notice of notices) {
    const map = canvasTexture((ctx, width, height) => {
      ctx.fillStyle = notice.color;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#403b30';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(notice.title, 24, 54);
      ctx.fillStyle = '#77654e';
      ctx.fillRect(24, 69, width - 48, 2);
      ctx.fillStyle = '#464137';
      ctx.font = '20px monospace';
      let line = '';
      let y = 110;
      for (const word of notice.text.split(' ')) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width > width - 48 && line) {
          ctx.fillText(line, 24, y);
          y += 29;
          line = word;
        } else line = next;
      }
      ctx.fillText(line, 24, y);
      ctx.strokeStyle = 'rgba(93,75,45,0.12)';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.58);
      ctx.lineTo(width, height * 0.58 + 6);
      ctx.stroke();
    }, 384, 512);
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.63, 0.72), new THREE.MeshStandardMaterial({ map, roughness: 1 }));
    paper.name = notice.title;
    paper.position.set(notice.x, notice.y, 0.075);
    paper.rotation.z = notice.angle;
    paper.userData.interactable = true;
    paper.userData.label = `Read ${notice.title.toLowerCase()}${notice.clue ? ' clue' : ''}`;
    paper.userData.onInteract = () => hud.setObjective(`${notice.title}: ${notice.text}`);
    group.add(paper);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), pinMat);
    pin.position.set(0, 0.32, 0.012);
    paper.add(pin);
  }
  return {
    group,
    dispose() {
      group.removeFromParent();
      const geometries = new Set();
      const materials = new Set();
      group.traverse(object => {
        if (!object.isMesh) return;
        geometries.add(object.geometry);
        materials.add(object.material);
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
    },
  };
}
