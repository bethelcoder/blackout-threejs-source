import * as THREE from 'three';

/**
 * A small drifting spark/dust particle system, reused (not recreated per
 * frame — see CGV brief 6.1) around exposed electrical props.
 */
export function createSparkParticles({ count = 60, spread = 1.2, color = 0x4fd1ff, origin = [0, 1.2, 0] } = {}) {
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = origin[0] + (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = origin[1] + Math.random() * spread;
    positions[i * 3 + 2] = origin[2] + (Math.random() - 0.5) * spread;
    speeds[i] = 0.2 + Math.random() * 0.6;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color, size: 0.03, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  points.userData.update = (delta) => {
    const pos = geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      let y = pos.getY(i) + speeds[i] * delta;
      if (y > origin[1] + spread) y = origin[1];
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  };

  return points;
}
