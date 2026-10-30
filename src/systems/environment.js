import * as THREE from 'three';

// Reflections for the PBR materials in every level (3D Effects rubric: reflections, environment lighting).
//
// Three modes, switchable from the Options menu:
//   off      - no environment lighting at all
//   static   - a procedural "substation interior" (dark room, white strip lights, a cyan strip and a
//              red AI-warning strip) is baked once into a PMREM environment map. Every metallic or
//              glossy material picks up glints from it, with no per-frame cost.
//   dynamic  - a live reflection probe: a cube render target is re-captured from the player's position,
//              ONE face every few frames, and used as scene.environment. Metal therefore reflects the
//              real room (lit screens, lamps, the AI core) and changes as the player moves and the
//              room's power state changes.
//
// Notes for the demo / devlog:
//   * Shadow maps are frozen while the probe renders (shadowMap.autoUpdate = false) so a probe face
//     costs one extra scene draw, not an extra shadow pass.
//   * The probe is HalfFloat so bright emissive parts stay bright instead of clamping at 1.0.
//   * The CCTV picture-in-picture uses a second WebGLRenderer, which cannot sample textures that belong
//     to the main renderer. main.js therefore clears scene.environment around that one render.
const FACES = 6;

export class Environment {
  constructor(renderer, scene, { probeSize = 128, framesPerFace = 4 } = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.mode = 'off';
    this.strength = 0.4;
    this.framesPerFace = framesPerFace;

    this.staticTarget = this._buildStatic();

    this.probeTarget = new THREE.WebGLCubeRenderTarget(probeSize, {
      type: THREE.HalfFloatType,
      generateMipmaps: false,
    });
    this.probeCamera = new THREE.CubeCamera(0.15, 60, this.probeTarget);
    // CubeCamera normally configures its six cameras inside update(); we render the faces one at a
    // time ourselves, so do that set-up once here.
    this.probeCamera.coordinateSystem = renderer.coordinateSystem;
    this.probeCamera.updateCoordinateSystem();

    this.probeReady = false;
    this.nextFace = 0;
    this.frameCounter = 0;
  }

  // ---------------------------------------------------------------- public API

  setMode(mode) {
    this.mode = mode === 'static' || mode === 'dynamic' ? mode : 'off';
    if (this.mode !== 'dynamic') { this.probeReady = false; this.nextFace = 0; }
    this._apply();
  }

  setStrength(value) {
    this.strength = THREE.MathUtils.clamp(value, 0, 2);
    this._apply();
  }

  /** Call once per frame, before the main render, while the game is running. */
  update(position) {
    if (this.mode !== 'dynamic') return;
    this.frameCounter++;
    if (this.frameCounter % this.framesPerFace !== 0) return;

    this.probeCamera.position.copy(position);
    this.probeCamera.updateMatrixWorld(true);
    this._renderFace(this.nextFace);
    this.nextFace = (this.nextFace + 1) % FACES;

    // A full cycle of six faces is done: tell three to re-filter the probe into a PMREM map.
    if (this.nextFace === 0) {
      this.probeTarget.texture.needsPMREMUpdate = true;
      if (!this.probeReady) { this.probeReady = true; this._apply(); }
    }
  }

  dispose() {
    this.scene.environment = null;
    this.staticTarget.dispose();
    this.probeTarget.dispose();
  }

  // ---------------------------------------------------------------- internals

  _apply() {
    const scene = this.scene;
    if (this.mode === 'off') {
      scene.environment = null;
      return;
    }
    scene.environmentIntensity = this.strength;
    scene.environment = this.mode === 'dynamic' && this.probeReady
      ? this.probeTarget.texture
      : this.staticTarget.texture;
  }

  _renderFace(index) {
    const renderer = this.renderer;
    const previousTarget = renderer.getRenderTarget();
    const previousFace = renderer.getActiveCubeFace();
    const previousMip = renderer.getActiveMipmapLevel();
    const previousXr = renderer.xr.enabled;
    const previousShadowUpdate = renderer.shadowMap.autoUpdate;

    renderer.xr.enabled = false;
    renderer.shadowMap.autoUpdate = false;

    renderer.setRenderTarget(this.probeTarget, index);
    renderer.render(this.scene, this.probeCamera.children[index]);

    renderer.setRenderTarget(previousTarget, previousFace, previousMip);
    renderer.shadowMap.autoUpdate = previousShadowUpdate;
    renderer.xr.enabled = previousXr;
  }

  _buildStatic() {
    const room = new THREE.Scene();
    const disposables = [];

    const emissive = (hex, power) => {
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(hex).multiplyScalar(power),
        side: THREE.DoubleSide,
      });
      disposables.push(material);
      return material;
    };
    const addPanel = (width, height, material, position, rotation) => {
      const geometry = new THREE.PlaneGeometry(width, height);
      disposables.push(geometry);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      room.add(mesh);
    };

    // Dark enclosing shell.
    const shellGeometry = new THREE.BoxGeometry(24, 12, 24);
    const shellMaterial = new THREE.MeshBasicMaterial({ color: 0x06090e, side: THREE.BackSide });
    disposables.push(shellGeometry, shellMaterial);
    room.add(new THREE.Mesh(shellGeometry, shellMaterial));

    // Three cool-white fluorescent bars on the ceiling, facing down.
    const lamp = emissive(0xdfeeff, 7);
    for (const x of [-6, 0, 6]) addPanel(0.6, 9, lamp, [x, 5.9, 0], [Math.PI / 2, 0, 0]);

    // Cyan strip down the left wall, red AI-warning strip down the right wall.
    addPanel(8, 0.45, emissive(0x20d8ff, 4), [-11.9, 1.5, 0], [0, Math.PI / 2, 0]);
    addPanel(8, 0.45, emissive(0xff2a1a, 3), [11.9, 2.4, 0], [0, Math.PI / 2, 0]);

    // A faint cool wash from below so downward-facing surfaces are not pure black.
    addPanel(20, 20, emissive(0x0e1b2a, 0.8), [0, -5.9, 0], [Math.PI / 2, 0, 0]);

    const generator = new THREE.PMREMGenerator(this.renderer);
    const target = generator.fromScene(room, 0.04);
    generator.dispose();
    disposables.forEach((item) => item.dispose());
    return target;
  }
}