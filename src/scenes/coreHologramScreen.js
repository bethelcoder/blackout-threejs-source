import * as THREE from 'three';

/** Floating HUD: one cached canvas and lightweight animated geometry. */
export function buildCoreHologramScreen() {
  const group = new THREE.Group();
  group.name = 'Core holographic wall screen';
  group.position.set(0, 3.1, -6.78);
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 640;
  const g = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
    side: THREE.DoubleSide,
  });
  group.add(new THREE.Mesh(new THREE.PlaneGeometry(5, 2.5), material));
  let lastProgress = -1;
  function paint(progress) {
    g.clearRect(0, 0, 1280, 640);
    g.fillStyle = 'rgba(5, 90, 120, 0.12)';
    g.fillRect(20, 20, 1240, 600);
    g.strokeStyle = '#38dcff'; g.lineWidth = 3;
    function path(points) {
      g.beginPath();
      points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
      g.stroke();
    }
    path([[22, 235], [22, 65], [70, 22], [395, 22], [445, 75], [835, 75], [885, 22], [1258, 22], [1258, 240]]);
    path([[22, 405], [22, 618], [395, 618], [445, 565], [835, 565], [885, 618], [1210, 618], [1258, 575], [1258, 405]]);
    path([[470, 100], [405, 100], [350, 155], [350, 485], [405, 540], [470, 540]]);
    path([[810, 100], [875, 100], [930, 155], [930, 485], [875, 540], [810, 540]]);
    g.font = '18px monospace'; g.fillStyle = '#8eefff';
    g.fillText('NEURAL CORE / LIVE TELEMETRY', 82, 57);
    g.fillText('GRID LINK // ONLINE', 915, 57);
    for (let i = 0; i < 3; i++) {
      const y = 150 + i * 138;
      path([[65, y + 70], [65, y], [85, y - 16], [285, y - 16], [305, y], [305, y + 80], [65, y + 80]]);
      g.fillText(['NEURAL ARRAY', 'POWER NETWORK', 'SECURITY BUS'][i], 85, y + 16);
      // Aggregate progress only; the puzzle's shuffled solution stays on its own readouts.
      g.fillText(['TELEMETRY LIVE', 'GRID STABILIZED', 'MONITORING'][i], 85, y + 51);
    }
    g.fillText('NETWORK ACTIVITY', 975, 150);
    for (let i = 0; i < 12; i++) {
      g.fillStyle = i % 3 === 0 ? '#89efff' : '#159fce';
      g.fillRect(980 + i * 19, 290 - (30 + (i * 37) % 100), 11, 30 + (i * 37) % 100);
    }
    g.fillStyle = '#8eefff';
    g.fillText('COMPONENTS', 985, 380);
    g.font = 'bold 46px monospace'; g.fillText(`${progress} / 3`, 1000, 438);
    g.font = '16px monospace'; g.fillText('MUNICIPAL GRID STABLE', 960, 515);
    g.fillText('SYNAPSE // CONTROL ARRAY', 490, 607);
    g.fillStyle = 'rgba(65, 200, 255, 0.09)';
    for (let y = 0; y < 640; y += 5) g.fillRect(0, y, 1280, 1);
    texture.needsUpdate = true;
  }
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x36dbff,
    transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending,
    depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const rings = [];
  for (let layer = 0; layer < 4; layer++) {
    const ring = new THREE.Group();
    const radius = 0.32 + layer * 0.18;
    for (let segment = 0; segment < 6; segment++) {
      const arc = new THREE.Mesh(new THREE.RingGeometry(radius, radius + (layer % 2 ? 0.035 : 0.012), 32, 1,
        segment * Math.PI / 3, Math.PI / 3 * 0.78), ringMaterial);
      ring.add(arc);
    }
    ring.position.z = 0.025 + layer * 0.008;
    group.add(ring); rings.push(ring);
  }
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.009), ringMaterial);
  scan.position.z = 0.065;
  group.add(scan);
  const guidanceMaterial = new THREE.MeshBasicMaterial({ color: 0x69edff, transparent: true,
    opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const guidanceGlow = new THREE.Mesh(new THREE.PlaneGeometry(5.35, 2.85), guidanceMaterial);
  guidanceGlow.name = 'Hologram guidance glow'; guidanceGlow.position.z = -0.012; guidanceGlow.visible = false;
  group.add(guidanceGlow);
  const frameGeometry = new THREE.PlaneGeometry(5.15, 2.65);
  const guidanceFrame = new THREE.LineSegments(new THREE.EdgesGeometry(frameGeometry),
    new THREE.LineBasicMaterial({ color: 0x9affed, transparent: true, depthWrite: false, toneMapped: false }));
  frameGeometry.dispose();
  guidanceFrame.name = 'Hologram guidance frame'; guidanceFrame.position.z = 0.075; guidanceFrame.visible = false;
  group.add(guidanceFrame);
  let guidance = false;
  paint(0); lastProgress = 0;
  return {
    group,
    setGuidance(active) {
      guidance = active; guidanceGlow.visible = active; guidanceFrame.visible = active;
    },
    update(time, progress, charge) {
      if (progress !== lastProgress) { paint(progress); lastProgress = progress; }
      rings.forEach((ring, i) => { ring.rotation.z = time * (i % 2 ? -1 : 1) * (0.12 + i * 0.035); });
      scan.position.y = 1.18 - (time * 0.28 % 2.36);
      ringMaterial.opacity = 0.65 + Math.sin(time * 2) * 0.08 + charge * 0.15;
      if (guidance) {
        const pulse = 0.5 + Math.sin(time * 3) * 0.5;
        guidanceMaterial.opacity = 0.18 + pulse * 0.24;
        guidanceFrame.material.opacity = 0.8 + pulse * 0.2;
        ringMaterial.opacity = 0.8 + pulse * 0.2;
        material.color.setRGB(1.8 + pulse * 1.2, 1.8 + pulse * 1.2, 1.8 + pulse * 1.2);
      } else {
        material.color.setRGB(1, 1, 1);
      }
    },
    // Geometry, material and map are owned by level3's root disposal.
  };
}
