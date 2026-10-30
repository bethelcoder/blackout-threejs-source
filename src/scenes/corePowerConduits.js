import * as THREE from 'three';
import { createPowerFlowMaterial } from '../shaders/powerFlow.js';

// Flat floor inlays use mitred corners and continuous distance UVs, so packets
// travel around bends without restarting. They add no collision obstacles.
function ribbon(points, width, height) {
  const positions = [], uvs = [], indices = [];
  let length = 0;
  points.forEach((point, i) => {
    if (i) length += point.distanceTo(points[i - 1]);
    const previous = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const incoming = point.clone().sub(previous).normalize();
    const outgoing = next.clone().sub(point).normalize();
    if (i === 0) incoming.copy(outgoing);
    if (i === points.length - 1) outgoing.copy(incoming);
    const side = new THREE.Vector2(-incoming.y, incoming.x);
    const miter = side.clone().add(new THREE.Vector2(-outgoing.y, outgoing.x)).normalize();
    miter.multiplyScalar(width * 0.5 / Math.max(0.25, miter.dot(side)));
    positions.push(point.x + miter.x, height, point.y + miter.y,
      point.x - miter.x, height, point.y - miter.y);
    uvs.push(length, 0, length, 1);
    if (i) {
      const a = (i - 1) * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });
  for (let i = 0; i < uvs.length; i += 2) uvs[i] /= length;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return { geometry, length };
}

export function buildCorePowerConduits() {
  const group = new THREE.Group();
  group.name = 'Core puzzle power conduits';
  const routes = [
    { name: 'UV access power conduit', points: [[-5.6, 0], [-4.7, 0], [-4.7, -4.8], [-3.6, -5.9], [-0.16, -5.9]] },
    { name: 'Recovered components power conduit', points: [[5.1, 0], [4.3, 0], [4.3, -4.8], [3.2, -5.9], [0.16, -5.9]] },
    { name: 'Assembled circuit core conduit', points: [[0, -5.9], [0, -2.0]] },
  ].map(({ name, points }) => {
    const path = points.map(([x, z]) => new THREE.Vector2(x, z));
    const backing = ribbon(path, 0.16, 0.018);
    const channel = new THREE.Mesh(backing.geometry,
      new THREE.MeshStandardMaterial({ color: 0x111d24, metalness: 0.65, roughness: 0.6 }));
    channel.name = `${name} floor channel`;
    group.add(channel);
    const strip = ribbon(path, 0.085, 0.022);
    const material = createPowerFlowMaterial(strip.length);
    const flow = new THREE.Mesh(strip.geometry, material);
    flow.name = name;
    group.add(flow);
    return material;
  });
  return {
    group,
    update(delta, time, accessSolved, robotSolved, assemblySolved, isolated) {
      const stages = [accessSolved, robotSolved, assemblySolved];
      const k = 1 - Math.exp(-delta * 4);
      routes.forEach((material, i) => {
        const u = material.uniforms;
        u.uTime.value = time;
        u.uPower.value += (Number(stages[i]) - u.uPower.value) * k;
        u.uStable.value += (Number(isolated) - u.uStable.value) * k;
      });
    },
    // Level 3 owns this group's geometry and materials through disposeTree().
  };
}
