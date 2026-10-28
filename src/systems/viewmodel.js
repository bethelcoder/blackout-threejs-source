import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * First-Person Hands & Held Equipment Viewmodel System.
 * Loads `fps_arms.glb` and `low_poly_torch.glb`, accurately aligning the torch
 * model inside the right hand grip with forward illumination and procedural sway.
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

    // Calibrated position & orientation to sit directly in the right hand palm
    this.torchGroup.position.set(0.135, -0.14, -0.28);
    this.torchGroup.rotation.set(0.05, -0.06, 0.04);

    this.isArmsLoaded = false;
    this.isTorchLoaded = false;
    this.isTorchEquipped = true;
    this.swayTime = 0;

    this._loadArmsModel();
    this._loadTorchModel();
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
      },
      undefined,
      (err) => {
        console.info('fps_arms.glb procedural fallback:', err?.message || err);
        this._createProceduralArmsFallback();
      }
    );
  }

  _loadTorchModel() {
    const loader = new GLTFLoader();
    loader.load(
      './models/low_poly_torch.glb',
      (gltf) => {
        const model = gltf.scene;

        // Auto-scale torch model to fit natural human hand grip (~20cm length)
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetLength = 0.20;
        const scaleFactor = targetLength / maxDim;
        model.scale.set(scaleFactor, scaleFactor, scaleFactor);

        // Center pivot on the torch grip handle
        const center = new THREE.Vector3();
        box.getCenter(center);
        model.position.set(-center.x * scaleFactor, -center.y * scaleFactor, -center.z * scaleFactor);

        // Orient the flashlight horizontally forward facing down -Z
        if (size.y >= size.x && size.y >= size.z) {
          // Model modeled vertically: rotate +Y to -Z
          model.rotation.x = -Math.PI / 2;
        } else if (size.x >= size.y && size.x >= size.z) {
          model.rotation.y = Math.PI / 2;
        }

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
            if (child.material) {
              if (!child.material.map) {
                child.material = new THREE.MeshStandardMaterial({
                  color: 0x222830,
                  roughness: 0.4,
                  metalness: 0.75,
                });
              } else {
                child.material.roughness = 0.45;
                child.material.metalness = 0.5;
              }
            }
          }
        });

        // Add a subtle glowing front lens cap
        const lensGeo = new THREE.CircleGeometry(0.026, 16);
        const lensMat = new THREE.MeshBasicMaterial({ color: 0xe8f4ff });
        const lensMesh = new THREE.Mesh(lensGeo, lensMat);
        lensMesh.position.set(0, 0, -0.102);
        lensMesh.rotation.y = Math.PI;
        model.add(lensMesh);

        this.torchMesh = model;
        this.torchGroup.add(model);
        this.isTorchLoaded = true;
        this.setTorchVisible(this.isTorchEquipped);
      },
      undefined,
      (err) => {
        console.info('low_poly_torch.glb procedural fallback:', err?.message || err);
        this._createProceduralTorchFallback();
      }
    );
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

  _createProceduralTorchFallback() {
    const fallbackTorch = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: 0x1c2228, metalness: 0.8, roughness: 0.25 })
    );
    body.rotation.x = Math.PI / 2;

    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.020, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: 0x364250, metalness: 0.9, roughness: 0.2 })
    );
    head.position.z = -0.09;
    head.rotation.x = Math.PI / 2;

    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.028, 12),
      new THREE.MeshBasicMaterial({ color: 0xe8f4ff })
    );
    lens.position.z = -0.116;
    lens.rotation.y = Math.PI;

    fallbackTorch.add(body, head, lens);
    this.torchMesh = fallbackTorch;
    this.torchGroup.add(fallbackTorch);
    this.isTorchLoaded = true;
    this.setTorchVisible(this.isTorchEquipped);
  }

  setTorchVisible(visible) {
    this.isTorchEquipped = visible;
    this.torchGroup.visible = visible;
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
