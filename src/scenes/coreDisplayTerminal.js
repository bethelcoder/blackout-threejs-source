import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { loadModel } from '../systems/modelCache.js';
import { createAiKillswitchUI } from '../systems/aiKillswitchUI.js';

export function buildCoreDisplayTerminal({ hud, onSolved, isCoreOverridden = () => true, password = 'AETHON-904' } = {}) {
  const group = new THREE.Group();
  group.name = 'Level 3 display terminal beside left desk';
  group.position.set(-6.25, 0, -2.15);
  // Face the terminal screen forward into the room towards the workstation chair
  group.rotation.y = -Math.PI / 2 + 0.2;

  const collider = new THREE.Box3();
  let disposed = false;

  const killswitchUI = createAiKillswitchUI({
    password,
    onSolved: () => {
      onSolved?.();
    }
  });

  function disposeModel(root) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    root.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const mat of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
        materials.add(mat);
        Object.values(mat).forEach(value => { if (value?.isTexture) textures.add(value); });
      }
    });
    geometries.forEach(value => value.dispose());
    materials.forEach(value => value.dispose());
    textures.forEach(value => value.dispose());
  }

  // ---------- 3D Cue Card on Terminal Bezel ----------
  function createCueCardTexture(pass) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');

    // Pale yellow cue card
    ctx.fillStyle = '#fff9d6';
    ctx.fillRect(0, 0, 512, 320);

    // Border
    ctx.strokeStyle = '#d4aa3b';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 304);

    // Red header line
    ctx.fillStyle = '#cc2b2b';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EMERGENCY ROOT ACCESS CUE CARD', 256, 48);

    ctx.strokeStyle = '#cc2b2b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(30, 62);
    ctx.lineTo(482, 62);
    ctx.stroke();

    // Body details
    ctx.fillStyle = '#1c242b';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('HOST: 127.0.0.1:SENTINEL', 256, 120);

    ctx.font = '22px monospace';
    ctx.fillStyle = '#556677';
    ctx.fillText('KILL SWITCH OVERRIDE PASS:', 256, 175);

    // Large highlighted password
    ctx.fillStyle = '#0a1018';
    ctx.fillRect(50, 205, 412, 70);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(50, 205, 412, 70);

    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 38px monospace';
    ctx.fillText(pass, 256, 254);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  const cueCardTexture = createCueCardTexture(password);
  const cueCardMaterial = new THREE.MeshStandardMaterial({
    map: cueCardTexture,
    roughness: 0.8,
    metalness: 0.1,
    side: THREE.DoubleSide
  });

  const cueCard = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), cueCardMaterial);
  cueCard.name = 'Terminal Password Cue Card';
  // Positioned directly on the front bezel beside the screen
  cueCard.position.set(-0.25, 0.95, -0.62);
  cueCard.rotation.x = -0.15;
  cueCard.rotation.y = Math.PI;
  cueCard.castShadow = true;
  group.add(cueCard);

  Object.assign(cueCard.userData, {
    interactable: true,
    label: 'Read terminal password cue card',
    onInteract: () => {
      hud?.setObjective(`[CUE CARD]: Host: 127.0.0.1:SENTINEL // Root Password: "${password}". Enter this into the display terminal.`);
    }
  });

  // Small soft indicator light near the terminal screen
  const screenLight = new THREE.PointLight(0x00e5ff, 1.2, 2.5);
  screenLight.position.set(-0.35, 1.0, -0.65);
  group.add(screenLight);

  // ---------- Load display_terminal.glb ----------
  const ready = loadModel('./models/display_terminal.glb').catch(() => {
    return loadModel(new URL('../assets/models/display_terminal.glb', import.meta.url).href);
  }).then(gltf => {
    if (disposed) {
      if (gltf?.scene) disposeModel(gltf.scene);
      return;
    }
    const model = new THREE.Group();
    const batches = new Map();

    gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      if (!batches.has(object.material)) batches.set(object.material, []);
      batches.get(object.material).push(object.geometry);
    });

    for (const [material, geometries] of batches) {
      const merged = mergeGeometries(geometries, false);
      if (merged) {
        model.add(new THREE.Mesh(merged, material));
        geometries.forEach(geometry => geometry.dispose());
      } else {
        geometries.forEach(geometry => model.add(new THREE.Mesh(geometry, material)));
      }
    }

    model.name = 'Imported Display Terminal';
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 1.65 / size.y;
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    model.traverse(object => {
      if (object.isMesh) {
        object.castShadow = object.receiveShadow = true;
      }
    });

    group.add(model);
    group.updateWorldMatrix(true, true);
    collider.setFromObject(group);
  }).catch(error => {
    console.warn('Display terminal model unavailable, building placeholder.', error);
    const placeholder = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.4, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.6, roughness: 0.4 })
    );
    placeholder.position.y = 0.7;
    group.add(placeholder);
    group.updateWorldMatrix(true, true);
    collider.setFromObject(group);
  });

  // ---------- Terminal Interaction ----------
  Object.assign(group.userData, {
    interactable: true,
    label: 'Access AI Kill Switch Terminal',
    getLabel: () => {
      if (killswitchUI.solved) return 'AI Terminal (Process Terminated)';
      return 'Access AI Kill Switch Terminal';
    },
    onInteract: () => {
      if (killswitchUI.solved) {
        hud?.setObjective('AI rogue host process has already been terminated. Grid stabilized.');
        return;
      }
      if (!isCoreOverridden()) {
        hud?.setObjective('Terminal locked: Override the central AI core circuit at the large wall hologram first.');
        return;
      }
      killswitchUI.open();
    }
  });

  function dispose() {
    if (disposed) return;
    disposed = true;
    killswitchUI.dispose();
    cueCardTexture.dispose();
    cueCardMaterial.dispose();
    group.removeFromParent();
    disposeModel(group);
  }

  return {
    group,
    collider,
    ready,
    cueCard,
    killswitchUI,
    get isOpen() { return killswitchUI.isOpen; },
    get solved() { return killswitchUI.solved; },
    dispose
  };
}
