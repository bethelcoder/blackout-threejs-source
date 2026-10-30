import * as THREE from 'three';
import laserBeam from '../assets/models/laser-beam.json' with { type: 'json' };
import { buildShutdownButton } from './shutdownButton.js';

// Fixed crisscross beams using the imported mesh; no sight/attachment hardware.
export function buildLaserSecurity({ scene, aiState, hud, sound, onHit, onDisabled, rackOccluders = [], externalOccluders = [], includeLeftBank = true }) {
  const group = new THREE.Group();
  group.name = 'AI laser security';
  const beams = new THREE.Group();
  group.add(beams);
  const beamColor = new THREE.Color(...laserBeam.color);
  // Keep the supplied cylinder mesh, but shade it as light scattered in air.
  // Opaque flat-green tubes and solid endpoint balls read as physical rods.
  const beamMaterial = (opacity, hotCore, brightness) => new THREE.ShaderMaterial({
    uniforms: { beamColor: { value: beamColor }, opacity: { value: opacity }, hotCore: { value: hotCore }, brightness: { value: brightness } },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vView;
      void main() {
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        vView = -view.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: `
      uniform vec3 beamColor;
      uniform float opacity;
      uniform float hotCore;
      uniform float brightness;
      varying vec3 vNormalView;
      varying vec3 vView;
      void main() {
        float facing = abs(dot(normalize(vNormalView), normalize(vView)));
        float scatter = pow(facing, 1.1);
        vec3 light = mix(beamColor, vec3(0.8, 1.0, 0.87), hotCore * scatter);
        gl_FragColor = vec4(light * brightness, opacity * scatter);
      }
    `,
    transparent: true, side: THREE.FrontSide, blending: THREE.AdditiveBlending,
    depthWrite: false, toneMapped: false,
  });
  const green = beamMaterial(1.0, 0.65, 1.6);
  const glow = beamMaterial(0.36, 0, 1.4);
  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute('position', new THREE.Float32BufferAttribute(laserBeam.positions, 3));
  // The USD Z-to-Y axis swap reverses winding; restore outward-facing triangles.
  beamGeo.setIndex(Array.from({ length: laserBeam.positions.length / 3 }, (_, i) =>
    Math.floor(i / 3) * 3 + [0, 2, 1][i % 3]));
  beamGeo.computeVertexNormals();
  const spotCanvas = document.createElement('canvas');
  spotCanvas.width = spotCanvas.height = 64;
  const spotContext = spotCanvas.getContext('2d');
  const falloff = spotContext.createRadialGradient(32, 32, 0, 32, 32, 32);
  falloff.addColorStop(0, 'rgba(220,255,230,1)');
  falloff.addColorStop(0.12, 'rgba(75,255,120,0.9)');
  falloff.addColorStop(0.4, 'rgba(0,255,85,0.22)');
  falloff.addColorStop(1, 'rgba(0,255,85,0)');
  spotContext.fillStyle = falloff;
  spotContext.fillRect(0, 0, 64, 64);
  const spotTexture = new THREE.CanvasTexture(spotCanvas);
  const spotMaterial = new THREE.MeshBasicMaterial({
    map: spotTexture, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, toneMapped: false,
  });
  const dotGeo = new THREE.PlaneGeometry(0.16, 0.16);
  const rays = [];
  // Alternate jump and duck lanes, with diagonal overhead strands like the reference.
  // The front two lanes span both entry routes before the shutdown button.
  const layout = [
    [[-6.88, 0.42, 3.7], [6.88, 0.52, 3.3]],
    [[-6.88, 1.45, 1.2], [6.88, 1.28, 1.7]],
    [[-6.88, 0.45, -1.6], [6.88, 0.55, -1.3]],
    [[-6.88, 1.35, -3.5], [6.88, 1.55, -3.7]],
    [[-6.88, 2.85, 5], [6.88, 2.25, -0.8]],
    [[-6.88, 2.25, -0.8], [6.88, 2.85, 5]],
    [[-6.88, 3.25, 1.8], [6.88, 2.5, -5]],
    [[-6.88, 2.5, -5], [6.88, 3.25, 1.8]],
  ];
  for (const [start, end] of layout) {
    const core = new THREE.Mesh(beamGeo, green);
    const halo = new THREE.Mesh(beamGeo, glow);
    const dot = new THREE.Mesh(dotGeo, spotMaterial);
    beams.add(core, halo, dot);
    rays.push({ start: new THREE.Vector3(...start), end: new THREE.Vector3(...end), target: new THREE.Vector3(...end), core, halo, dot });
  }

  // Right wall, facing the open side aisle between the server bank and wall.
  const panel = new THREE.Group();
  panel.name = 'Laser shutdown button';
  panel.position.set(6.84, 1.5, 0);
  panel.rotation.y = -Math.PI / 2;
  group.add(panel);
  const button = buildShutdownButton();
  panel.add(button.group);
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#172128'; ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#efffc8'; ctx.textAlign = 'center';
  ctx.font = 'bold 38px monospace'; ctx.fillText('LASER SHUTDOWN', 256, 53);
  ctx.font = '26px monospace'; ctx.fillText('MANUAL OVERRIDE', 256, 100);
  const labelTexture = new THREE.CanvasTexture(canvas);
  const labelMaterial = new THREE.MeshBasicMaterial({ map: labelTexture });
  const labelGeo = new THREE.PlaneGeometry(0.45, 0.12);
  const label = new THREE.Mesh(labelGeo, labelMaterial);
  label.position.set(0, 0.4, 0.025);
  panel.add(label);
  let active = true;
  let previousHeight = 1.7;
  let grace = 0;
  let previous = null;
  panel.userData.interactable = true;
  panel.userData.reach = 1.5;
  panel.userData.getLabel = () => active ? 'Disable AI laser security' : 'Laser security disabled';
  panel.userData.onInteract = () => {
    if (!active) return;
    active = false;
    beams.visible = false;
    onDisabled?.();
    button.press();
    labelMaterial.color.setHex(0x55ff88);
    sound.playSwitch();
    hud.setObjective('Laser security disabled. Access the grid terminal and restore water routing.');
  };
  scene.add(group);
  const up = new THREE.Vector3(0, 1, 0);
  const direction = new THREE.Vector3();
  const playerBox = new THREE.Box3();
  const player = new THREE.Vector3();
  const ray = new THREE.Ray();
  const hitPoint = new THREE.Vector3();
  const surfaceNormal = new THREE.Vector3();
  const forward = new THREE.Vector3(0, 0, 1);
  // Clip visible light to real room surfaces, the server banks, and any
  // external occluders (lockers, workbench, etc.) passed in from the level.
  const occluders = [];
  for (const x of (includeLeftBank ? [-4.8] : [])) {
    for (let i = -2; i <= 2; i++) {
      occluders.push(new THREE.Box3(
        new THREE.Vector3(x - 0.45, 0, i * 2.2 - 0.35),
        new THREE.Vector3(x + 0.45, 2.6, i * 2.2 + 0.35),
      ));
    }
  }
  for (const box of externalOccluders) {
    if (box && box.isBox3) occluders.push(box);
  }
  function positionBeams() {
    for (const beam of rays) {
      beam.end.copy(beam.target);
      direction.subVectors(beam.end, beam.start);
      let length = direction.length();
      direction.normalize();
      surfaceNormal.set(-1, 0, 0);
      ray.set(beam.start, direction);
      for (const box of [...occluders, ...rackOccluders]) {
        if (!box.containsPoint(beam.start) && ray.intersectBox(box, hitPoint)) {
          const distance = hitPoint.distanceTo(beam.start);
          if (distance < length) {
            length = distance;
            surfaceNormal.set(0, 1, 0);
            if (Math.abs(hitPoint.x - box.min.x) < 0.001) surfaceNormal.set(-1, 0, 0);
            if (Math.abs(hitPoint.x - box.max.x) < 0.001) surfaceNormal.set(1, 0, 0);
            if (Math.abs(hitPoint.z - box.min.z) < 0.001) surfaceNormal.set(0, 0, -1);
            if (Math.abs(hitPoint.z - box.max.z) < 0.001) surfaceNormal.set(0, 0, 1);
          }
        }
      }
      beam.end.copy(beam.start).addScaledVector(direction, length);
      for (const [mesh, radius] of [[beam.core, 0.0028], [beam.halo, 0.03]]) {
        mesh.position.copy(beam.start).add(beam.end).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(up, direction);
        mesh.scale.set(radius, length, radius);
      }
      beam.dot.position.copy(beam.end).addScaledVector(surfaceNormal, 0.008);
      beam.dot.quaternion.setFromUnitVectors(forward, surfaceNormal);
    }
  }
  positionBeams();
  return {
    refreshOccluders: positionBeams,
    isActive: () => active,
    update(delta, camera) {
      if (!active || !camera) return;
      grace = Math.max(0, grace - delta);
      const height = camera.userData.playerHeight ?? 1.7;
      if (!previous) { previous = camera.position.clone(); previousHeight = height; }
      // Sweep the actual standing/crouched body so sprinting cannot skip a beam.
      const steps = Math.max(1, Math.ceil(previous.distanceTo(camera.position) / 0.08), Math.ceil(delta / 0.016));
      for (let step = 1; step <= steps; step++) {
        if (grace > 0) continue;
        player.lerpVectors(previous, camera.position, step / steps);
        const bodyHeight = THREE.MathUtils.lerp(previousHeight, height, step / steps);
        playerBox.min.set(player.x - 0.37, player.y - bodyHeight, player.z - 0.37);
        playerBox.max.set(player.x + 0.37, player.y + 0.03, player.z + 0.37);
        for (const beam of rays) {
          direction.subVectors(beam.end, beam.start);
          const length = direction.length();
          ray.set(beam.start, direction.normalize());
          if (ray.intersectBox(playerBox, hitPoint) && hitPoint.distanceTo(beam.start) <= length) {
            grace = 1.5;
            aiState.raise(22);
            sound.playDetectionWarning(0.8);
            hud.setObjective('Laser alarm! Jump low beams (Space), duck high beams (hold C or Ctrl). Reach the shutdown button midway along the right wall.');
            onHit?.(new THREE.Vector3(0, 1.7, 6));
            previousHeight = camera.userData.playerHeight ?? 1.7;
            previous.copy(camera.position);
            return;
          }
        }
      }
      previous.copy(camera.position);
      previousHeight = height;
    },
    dispose() {
      button.dispose();
      group.removeFromParent();
      for (const resource of [green, glow, beamGeo, dotGeo, spotTexture, spotMaterial, labelTexture, labelMaterial, labelGeo]) resource.dispose();
    },
  };
}