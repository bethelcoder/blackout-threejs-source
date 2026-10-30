import * as THREE from 'three';
import { createFeederMaterials } from './feederMaterials.js';

export function buildCoreFeeders({ enabled, onProgress, onWrong, hud, random = Math.random }) {
  const group = new THREE.Group();
  group.name = 'Core feeder breakers';
  const colliders = [], breakers = [];
  const materials = createFeederMaterials();
  const loads = [34, 58, 91];
  for (let i = loads.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [loads[i], loads[j]] = [loads[j], loads[i]];
  }
  let count = 0;
  const order = [...loads].sort((a, b) => b - a);
  for (const [i, [id, x, z]] of [['A', -5.2, -4.4], ['B', 0, -6], ['C', 5.2, -4.4]].entries()) {
    const station = new THREE.Group(); station.name = `Feeder ${id}`;
    station.position.set(x, 0, z); station.rotation.y = Math.atan2(-x, -z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.3, 0.4),
      materials.casing);
    body.position.y = 0.65;
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 1.25), materials.door);
    door.name = `Feeder ${id} textured service door`;
    door.position.set(0, 0.65, 0.202);
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#061018'; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#80eaff'; ctx.textAlign = 'center';
    ctx.font = 'bold 52px monospace'; ctx.fillText(`FEEDER ${id}`, 256, 65);
    ctx.font = 'bold 70px monospace'; ctx.fillText(`${loads[i]} MW`, 256, 150);
    ctx.font = '24px monospace'; ctx.fillText('HIGHEST LOAD FIRST', 256, 220);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    const display = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshBasicMaterial({ map }));
    display.position.set(0, 1.02, 0.208);
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x221111, emissive: 0xff2020 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), lampMat); lamp.position.set(0.23, 1.23, 0.22);
    const pivot = new THREE.Group(); pivot.position.set(0, 0.56, 0.24); pivot.rotation.x = -0.5;
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.8, roughness: 0.3 }));
    lever.position.y = 0.2; pivot.add(lever);
    const breaker = { locked: false, pivot, lampMat };
    const setLocked = (b, locked) => { b.locked = locked; b.lampMat.emissive.set(locked ? 0x2bff6f : 0xff2020); };
    Object.assign(station.userData, {
      interactable: true,
      label: `Isolate feeder ${id}`,
      getLabel: () => `Feeder ${id} / ${loads[i]} MW${breaker.locked ? ' / ISOLATED' : ''}`,
      onInteract: () => {
        if (!enabled()) { hud.setObjective('Enter the decoded UV answer at the safety notice to unlock the feeders.'); return; }
        if (breaker.locked) return;
        if (loads[i] !== order[count]) {
          count = 0; breakers.forEach(b => setLocked(b, false));
          onWrong?.();
          hud.setObjective('Wrong feeder. Breakers reset. Isolate the HIGHEST remaining MW load first: highest to lowest.');
          return;
        }
        setLocked(breaker, true); count++; onProgress?.(count);
        hud.setObjective(count === 3
          ? 'All feeders isolated. Shockwaves disabled. Talk to the robot, collect the components, then use the hologram.'
          : `Feeder ${id} isolated (${count}/3). Shockwaves are faster. Switch off the highest remaining MW load next.`);
      },
    });
    station.add(body, door, display, lamp, pivot); group.add(station); breakers.push(breaker);
    station.updateMatrixWorld(true); colliders.push(new THREE.Box3().setFromObject(station));
  }
  return { group, colliders, get count() { return count; }, get solved() { return count === 3; },
    update(delta) { breakers.forEach(b => { b.pivot.rotation.x = THREE.MathUtils.damp(b.pivot.rotation.x, b.locked ? 0.9 : -0.5, 8, delta); }); } };
}
