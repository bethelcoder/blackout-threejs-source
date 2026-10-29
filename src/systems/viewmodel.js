import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildHeldTool } from './heldTools.js';

/**
 * First-Person Hands & Held Equipment Viewmodel System.
 * Loads `fps_arms.glb` and seats the shared held-tool meshes inside the right
 * hand grip, with forward illumination and procedural sway.
 */
export class Viewmodel {
  constructor(camera, flashlight) {
    this.camera = camera;
    this.flashlight = flashlight;
    this.group = new THREE.Group();
    this.camera.add(this.group);

    // Camera-space base offset for first-person viewmodel
    this.basePosition = new THREE.Vector3(0.0, -0.28, -0.42);
    this.group.position.copy(this.basePosition);

    this.armsMesh = null;
    this.torchMesh = null;
    this.torchGroup = new THREE.Group();
    this.group.add(this.torchGroup);

    // Palm centre measured from the rig's right-hand bones, so grips sit inside
    // the fist rather than floating below it.
    this.torchGroup.position.set(0.165, -0.05, -0.255);
    this.torchGroup.rotation.set(0.05, -0.55, 0.10);
    this.torchGroup.scale.setScalar(1.15);

    this.isArmsLoaded = false;
    this.isTorchLoaded = false;
    this.torchLit = true;
    this.equippedTool = 'torch';

    // Non-torch tools share one grip transform so equipping never shifts the hand.
    this.toolGroup = new THREE.Group();
    this.toolGroup.position.copy(this.torchGroup.position);
    this.toolGroup.rotation.copy(this.torchGroup.rotation);
    this.toolGroup.scale.copy(this.torchGroup.scale);
    this.group.add(this.toolGroup);
    this.heldTools = new Map();

    // Right-hand finger joints captured once the arms load; null until then.
    this.fingers = null;

    this.swayTime = 0;

    this._loadArmsModel();
    this._buildTorch();
  }

  _loadArmsModel() {
    const loader = new GLTFLoader();
    loader.load(
      './models/fps_arms.glb',
      (gltf) => {
        const model = gltf.scene;

        // Apply scale x0.01 (cm to meters) and 180 deg Y rotation to face forward (-Z)
        model.scale.set(0.01, 0.01, 0.01);
        model.rotation.y = Math.PI;

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;

            // Ensure arms have realistic PBR shading rather than blinding flat white
            if (child.material) {
              child.material.depthTest = true;
              if (child.material.map) {
                child.material.roughness = 0.65;
                child.material.metalness = 0.15;
              } else {
                // If untextured, apply realistic tactical engineer sleeve & glove tones
                child.material = new THREE.MeshStandardMaterial({
                  color: 0x36414d,
                  roughness: 0.6,
                  metalness: 0.2,
                });
              }
            }
          }
        });

        this.armsMesh = model;
        this.group.add(model);
        this.isArmsLoaded = true;
        this._captureGripPose(model);
        this._updateGrip();
      },
      undefined,
      (err) => {
        console.info('fps_arms.glb procedural fallback:', err?.message || err);
        this._createProceduralArmsFallback();
      }
    );
  }

  /**
   * The torch is the same mesh the character's hand holds in third person, so
   * the grip transform below is the only one that has to stay correct.
   */
  _buildTorch() {
    const torch = buildHeldTool('torch');
    this.torchMesh = torch;
    this.torchGroup.add(torch);
    this.isTorchLoaded = true;
    this.setTool(this.equippedTool, this.torchLit);
  }

  _createProceduralArmsFallback() {
    const fallbackGroup = new THREE.Group();

    const sleeveMat = new THREE.MeshStandardMaterial({
      color: 0x2d3844,
      roughness: 0.6,
      metalness: 0.2,
    });
    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0x182028,
      roughness: 0.45,
      metalness: 0.3,
    });

    // Right Arm / Forearm positioned toward hand grip
    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.35, 12), sleeveMat);
    rForearm.position.set(0.18, -0.22, 0.05);
    rForearm.rotation.set(Math.PI / 3, 0.15, -0.25);
    fallbackGroup.add(rForearm);

    const rGlove = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 0.11), gloveMat);
    rGlove.position.set(0.14, -0.15, -0.22);
    rGlove.rotation.set(Math.PI / 4, 0.08, -0.15);
    fallbackGroup.add(rGlove);

    // Left Arm / Forearm
    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.35, 12), sleeveMat);
    lForearm.position.set(-0.18, -0.22, 0.05);
    lForearm.rotation.set(Math.PI / 3, -0.2, 0.3);
    fallbackGroup.add(lForearm);

    const lGlove = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 0.11), gloveMat);
    lGlove.position.set(-0.14, -0.15, -0.22);
    lGlove.rotation.set(Math.PI / 4, -0.1, 0.2);
    fallbackGroup.add(lGlove);

    this.armsMesh = fallbackGroup;
    this.group.add(fallbackGroup);
    this.isArmsLoaded = true;
  }

  /** Show the equipped tool in the first-person hand; null leaves the hand empty. */
  setTool(itemId, torchLit = this.torchLit) {
    this.equippedTool = itemId;
    this.torchLit = torchLit;
    if (itemId && itemId !== 'torch' && !this.heldTools.has(itemId)) {
      const mesh = buildHeldTool(itemId);
      if (mesh) {
        this.heldTools.set(itemId, mesh);
        this.toolGroup.add(mesh);
      }
    }
    this._applyToolVisibility();
  }

  _applyToolVisibility() {
    this.torchGroup.visible = this.equippedTool === 'torch' && this.torchLit;
    for (const [id, mesh] of this.heldTools) mesh.visible = id === this.equippedTool;
    this.toolGroup.visible = this.equippedTool !== 'torch';
    this._updateGrip();
  }

  /**
   * Cache each right-hand finger joint's bind rotation and the axis it curls
   * about. The axis runs along the knuckle line (index knuckle minus pinky
   * knuckle), so every finger folds toward the palm regardless of camera view.
   */
  _captureGripPose(model) {
    const bones = {};
    model.traverse((child) => {
      if (child.isBone) bones[child.name] = child;
    });
    model.updateWorldMatrix(true, true);

    const point = bones.R_point1_030;
    const pinky = bones.R_pink1_042;
    if (!point || !pinky) {
      this.fingers = null;
      return;
    }

    const modelQuat = model.getWorldQuaternion(new THREE.Quaternion());
    const pointPos = point.getWorldPosition(new THREE.Vector3());
    const pinkyPos = pinky.getWorldPosition(new THREE.Vector3());
    const axisModel = pointPos
      .sub(pinkyPos)
      .normalize()
      .applyQuaternion(modelQuat.clone().invert());
    const axisWorld = axisModel.applyQuaternion(modelQuat);

    // Joint 1 is the knuckle and stays put; 2-4 fold the fingers into the palm.
    const curlAngles = [0, 0.45, 0.7, 0.45];
    const chains = [
      ['point', 30],
      ['middle', 34],
      ['ring', 38],
      ['pink', 42],
    ];

    const fingers = [];
    for (const [name, base] of chains) {
      for (let i = 0; i < 4; i += 1) {
        const bone = bones[`R_${name}${i + 1}_${String(base + i).padStart(3, '0')}`];
        if (!bone) continue;
        const worldQuat = bone.getWorldQuaternion(new THREE.Quaternion());
        const axis = axisWorld.clone().applyQuaternion(worldQuat.invert()).normalize();
        fingers.push({
          bone,
          bind: bone.quaternion.clone(),
          curl: new THREE.Quaternion().setFromAxisAngle(axis, curlAngles[i]),
        });
      }
    }
    this.fingers = fingers;
  }

  _isHoldingModel() {
    if (!this.equippedTool) return false;
    if (this.equippedTool === 'torch') return this.torchGroup.visible;
    const mesh = this.heldTools.get(this.equippedTool);
    return Boolean(mesh && mesh.visible);
  }

  _updateGrip() {
    if (!this.fingers) return;
    const holding = this._isHoldingModel();
    for (const finger of this.fingers) {
      finger.bone.quaternion.copy(finger.bind);
      if (holding) finger.bone.quaternion.multiply(finger.curl);
    }
  }

  update(delta, isMoving = false, isSprinting = false, isFirstPerson = true) {
    if (!this.group) return;

    this.group.visible = isFirstPerson;
    if (!isFirstPerson) return;

    this.swayTime += delta * (isMoving ? (isSprinting ? 12 : 8) : 2.5);

    // Idle breathing vs walking bobbing
    if (isMoving) {
      const bobX = Math.cos(this.swayTime * 0.5) * (isSprinting ? 0.022 : 0.012);
      const bobY = Math.abs(Math.sin(this.swayTime)) * (isSprinting ? 0.018 : 0.010);
      this.group.position.set(
        this.basePosition.x + bobX,
        this.basePosition.y - bobY,
        this.basePosition.z
      );
    } else {
      const breath = Math.sin(this.swayTime) * 0.003;
      this.group.position.set(
        this.basePosition.x,
        this.basePosition.y + breath,
        this.basePosition.z
      );
    }
  }
}
