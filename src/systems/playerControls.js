import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

const PLAYER_HEIGHT = 1.7;
const MOVE_SPEED = 4.2;
const SPRINT_MULT = 1.6;

/**
 * Wraps PointerLockControls with WASD movement and a simple
 * "push out of colliders" resolution against a flat list of Box3 colliders.
 * Kept intentionally simple (no physics engine) so it's easy to explain
 * in the demo, per the CGV brief's emphasis on being able to justify design choices.
 */
export class PlayerControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.controls = new PointerLockControls(camera, domElement);
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    this.move = { forward: false, back: false, left: false, right: false, sprint: false };
    this.colliders = []; // array of THREE.Box3
    this.enabled = true;

    document.addEventListener('keydown', (e) => this._onKey(e, true));
    document.addEventListener('keyup', (e) => this._onKey(e, false));

    this.camera.position.set(0, PLAYER_HEIGHT, 0);
  }

  setColliders(boxes) {
    this.colliders = boxes;
  }

  _onKey(e, isDown) {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': this.move.forward = isDown; break;
      case 'KeyS': case 'ArrowDown': this.move.back = isDown; break;
      case 'KeyA': case 'ArrowLeft': this.move.left = isDown; break;
      case 'KeyD': case 'ArrowRight': this.move.right = isDown; break;
      case 'ShiftLeft': case 'ShiftRight': this.move.sprint = isDown; break;
    }
  }

  lock() { this.controls.lock(); }
  unlock() { this.controls.unlock(); }
  get isLocked() { return this.controls.isLocked; }

  update(delta) {
    if (!this.enabled || !this.controls.isLocked) return;

    const damping = Math.min(10 * delta, 1);
    this.velocity.x -= this.velocity.x * damping;
    this.velocity.z -= this.velocity.z * damping;

    this.direction.z = Number(this.move.forward) - Number(this.move.back);
    this.direction.x = Number(this.move.right) - Number(this.move.left);
    this.direction.normalize();

    const speed = MOVE_SPEED * (this.move.sprint ? SPRINT_MULT : 1);
    if (this.move.forward || this.move.back) this.velocity.z -= this.direction.z * speed * delta;
    if (this.move.left || this.move.right) this.velocity.x -= this.direction.x * speed * delta;

    const prevPos = this.camera.position.clone();

    this.controls.moveRight(-this.velocity.x);
    this.controls.moveForward(-this.velocity.z);
    this.camera.position.y = PLAYER_HEIGHT;

    if (this._collides(this.camera.position)) {
      this.camera.position.copy(prevPos);
      this.velocity.set(0, 0, 0);
    }
  }

  _collides(pos) {
    const r = 0.35;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(pos.x - r, 0, pos.z - r),
      new THREE.Vector3(pos.x + r, PLAYER_HEIGHT, pos.z + r)
    );
    for (const box of this.colliders) {
      if (playerBox.intersectsBox(box)) return true;
    }
    return false;
  }
}
