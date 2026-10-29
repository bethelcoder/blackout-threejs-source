import * as THREE from 'three';

/**
 * Closes the character's right hand around a held tool.
 *
 * The Mixamo clips set the finger bones once when the action binds and then stop
 * writing them, so the fist has to be re-applied every frame. It is written from
 * the bind pose rather than multiplied onto the current one: a multiply would
 * compound frame after frame and the fingers would keep curling on their own.
 */

// The knuckle stays put; the other three joints fold the finger into the palm.
const CURL_ANGLES = [0, 0.45, 0.7, 0.45];
const CHAINS = ['Index', 'Middle', 'Ring', 'Pinky'];

export class CharacterGrip {
  constructor(model) {
    this.bones = [];
    this._capture(model);
  }

  _capture(model) {
    const bones = {};
    model.traverse((child) => {
      if (child.isBone) bones[child.name] = child;
    });
    model.updateWorldMatrix(true, true);

    const index = bones.RightHandIndex1;
    const pinky = bones.RightHandPinky1;
    if (!index || !pinky) return;

    // Curl axis runs along the knuckle line, so every finger folds toward the
    // palm regardless of where the arm is pointing.
    const axisWorld = index
      .getWorldPosition(new THREE.Vector3())
      .sub(pinky.getWorldPosition(new THREE.Vector3()))
      .normalize();

    for (const chain of CHAINS) {
      for (let i = 0; i < 4; i += 1) {
        const bone = bones[`RightHand${chain}${i + 1}`];
        if (!bone) continue;
        const worldQuat = bone.getWorldQuaternion(new THREE.Quaternion());
        const axis = axisWorld.clone().applyQuaternion(worldQuat.invert()).normalize();
        this.bones.push({
          bone,
          bind: bone.quaternion.clone(),
          curl: new THREE.Quaternion().setFromAxisAngle(axis, CURL_ANGLES[i]),
        });
      }
    }
  }

  update(holding) {
    for (const { bone, bind, curl } of this.bones) {
      bone.quaternion.copy(bind);
      if (holding) bone.quaternion.multiply(curl);
    }
  }
}
