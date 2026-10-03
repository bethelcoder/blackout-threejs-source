import * as THREE from 'three';
import { createElectrifiedWaterMaterial } from '../shaders/electrifiedWater.js';
import { createSparkParticles } from '../systems/particles.js';
import { sound } from '../systems/audio.js';
import { acquireMaintenanceMaps } from '../systems/maintenanceMaterials.js';
import { touchesPuddle } from '../systems/puddleShape.js';

/** Owns the pipe, cable, puddle and effects; the same phase drives visuals and contact. */
export function buildElectricalHazard({ aiState, onShock }) {
  const group = new THREE.Group();
  group.name = 'Leaking pipe and electrical crossing';
  group.position.set(-5.775, 3.6, 1.4);
  const textures = acquireMaintenanceMaps();
  const metal = new THREE.MeshStandardMaterial({ ...textures.maps, color: 0xa3acaa, metalness: 0.35, roughness: 0.95, normalScale: new THREE.Vector2(0.65, 0.65) });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x161a1b, roughness: 0.95 });
  const copper = new THREE.MeshStandardMaterial({ color: 0xc18450, metalness: 0.75, roughness: 0.4 });
  const pipe = new THREE.Group();
  pipe.name = 'Leaking supply pipe';
  group.add(pipe);
  const pipeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 5.6, 10), metal);
  const pipeUV = pipeMesh.geometry.attributes.uv;
  for (let i = 0; i < pipeUV.count; i++) pipeUV.setXY(i, pipeUV.getX(i) * 0.47, pipeUV.getY(i) * 5.6);
  pipeMesh.rotation.x = Math.PI / 2;
  pipeMesh.position.set(-1, 1.9, 0);
  pipe.add(pipeMesh);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 8), metal);
  nozzle.position.set(-1, 1.76, 0);
  pipe.add(nozzle);

  const cable = new THREE.Group();
  cable.name = 'Damaged hanging cable';
  group.add(cable);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.12, 2.6, -1.3), new THREE.Vector3(-0.85, 1.5, -1),
    new THREE.Vector3(-0.72, 0.65, -0.6), new THREE.Vector3(-0.55, 0.16, -0.3),
  ]);
  cable.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.035, 6, false), rubber));
  for (let i = 0; i < 3; i++) {
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 5), copper);
    wire.position.set(-0.55 + (i - 1) * 0.025, 0.08, -0.3);
    wire.rotation.z = (i - 1) * 0.25;
    cable.add(wire);
  }

  const waterMaterial = createElectrifiedWaterMaterial();
  const water = new THREE.Mesh(new THREE.PlaneGeometry(2.45, 4.8, 16, 32), waterMaterial);
  water.name = 'Electrified wet deck';
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.025;
  group.add(water);

  // Reuse particle buffers; no objects are constructed in update().
  const dropPositions = new Float32Array(18 * 3);
  for (let i = 0; i < 18; i++) {
    dropPositions[i * 3] = -1 + Math.sin(i * 7) * 0.025;
    dropPositions[i * 3 + 1] = (i / 18) * 1.65;
    dropPositions[i * 3 + 2] = Math.cos(i * 5) * 0.025;
  }
  const dropGeometry = new THREE.BufferGeometry();
  dropGeometry.setAttribute('position', new THREE.BufferAttribute(dropPositions, 3));
  const drops = new THREE.Points(dropGeometry, new THREE.PointsMaterial({ color: 0xa4d4e0, size: 0.045 }));
  drops.name = 'Falling leak droplets';
  pipe.add(drops);
  const sparks = createSparkParticles({ count: 24, spread: 0.45, origin: [-0.55, 0.12, -0.3] });
  cable.add(sparks);
  const glow = new THREE.PointLight(0x60cfff, 0, 4, 2);
  glow.position.set(-0.55, 0.4, -0.3);
  cable.add(glow); // Local glow only; no shadow map or extra render pass.

  const status = document.getElementById('hazard-status');
  const flash = document.getElementById('shock-flash');
  const resetPosition = new THREE.Vector3();
  let elapsed = 0;
  let cooldown = 0;
  let flashTime = 0;
  let approachZ = -2.3;
  let previousMessage = '';
  let beepTimer = 0;
  return {
    group,
    update(delta, camera) {
      elapsed += delta;
      cooldown = Math.max(0, cooldown - delta);
      flashTime = Math.max(0, flashTime - delta);
      const phase = elapsed % 8;
      const live = phase >= 5;
      const warning = phase >= 4 && !live;
      waterMaterial.uniforms.uTime.value = elapsed;
      waterMaterial.uniforms.uLive.value = live ? 1 : 0;
      sparks.visible = live;
      if (live) sparks.userData.update(delta);
      glow.color.setHex(warning ? 0xffa34f : 0x60cfff);
      glow.intensity = live ? 4 + Math.sin(elapsed * 43) * 1.5 : warning ? 1 + Math.sin(elapsed * 18) : 0;
      for (let i = 0; i < 18; i++) {
        dropPositions[i * 3 + 1] -= delta * 2.2;
        if (dropPositions[i * 3 + 1] < 0.04) dropPositions[i * 3 + 1] += 1.65;
      }
      dropGeometry.attributes.position.needsUpdate = true;

      const p = camera.position;
      const feet = p.y - 1.7;
      const near = p.x < -3.5 && feet > 3.3 && p.z > -4 && p.z < 6.5;
      if (near && p.z < -1.35) approachZ = -2.3;
      if (near && p.z > 4.15) approachZ = 5.1;
      let message = '';
      if (near) {
        message = live ? `LIVE WATER - WAIT (${Math.ceil(8 - phase)}s)` : warning ? 'POWER RETURNING - KEEP CLEAR' : `POWER OFF - CROSS NOW (${Math.ceil(4 - phase)}s)`;
      }
      // Body footprint must touch the wet deck: jumping above it is not contact.
      if (live && cooldown === 0 && feet >= 3.5 && feet < 3.74 &&
          touchesPuddle(p.x, p.z)) {
        resetPosition.set(-5.775, 5.3, approachZ);
        onShock(resetPosition);
        aiState.raise(25);
        sound.playDetectionWarning(0.9);
        cooldown = 1.5;
        flashTime = 0.5;
      }
      if (cooldown > 0) message = 'SHOCK! Back on dry ground. Wait for power to switch off.';
      if (message !== previousMessage) {
        status.textContent = message;
        status.classList.toggle('hidden', !message);
        previousMessage = message;
      }
      status.dataset.state = cooldown > 0 || live ? 'live' : warning ? 'warning' : 'safe';
      flash.style.opacity = String(flashTime * 1.2);
      beepTimer += delta;
      if (near && (warning || live) && beepTimer >= 0.7) {
        sound.playDetectionWarning(live ? 0.35 : 0.15);
        beepTimer = 0;
      }
    },
    dispose() {
      group.removeFromParent();
      const geometries = new Set();
      const materials = new Set();
      group.traverse(node => {
        if (node.geometry) geometries.add(node.geometry);
        if (node.material) materials.add(node.material);
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      textures.release();
      status.classList.add('hidden');
      flash.style.opacity = '0';
    },
  };
}
