import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { sound } from './audio.js';

const PLAYER_HEIGHT = 1.7;
const MOVE_SPEED = 4.2;
const SPRINT_MULT = 1.6;

/**
 * Wraps PointerLockControls with WASD movement, procedural footstep audio,
 * and robust AABB collision resolution against level geometry.
 */
export class PlayerControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.controls = new PointerLockControls(camera, domElement);
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.previousPosition = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
    this.playerBox = new THREE.Box3();
    this.walkableSurfaces = [];
    this.fallSpeed = 0;
    this.grounded = true;
    this.jumpQueued = false;

    this.move = { forward: false, back: false, left: false, right: false, sprint: false };
    this.colliders = []; // array of THREE.Box3
    this.enabled = true;

    this.stepTimer = 0;

    document.addEventListener('keydown', (e) => this._onKey(e, true));
    document.addEventListener('keyup', (e) => this._onKey(e, false));
    this.controls.addEventListener('unlock', () => {
      for (const key in this.move) this.move[key] = false;
      this.jumpQueued = false;
      this.velocity.set(0, 0, 0);
    });

    this.camera.position.set(0, PLAYER_HEIGHT, 0);
  }

  setColliders(boxes, walkableSurfaces = []) {
    this.colliders = boxes;
    this.walkableSurfaces = walkableSurfaces;
    this.velocity.set(0, 0, 0);
    this.fallSpeed = 0;
    this.grounded = true;
    this.jumpQueued = false;
  }

  _onKey(e, isDown) {
    sound.resume();
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': this.move.forward = isDown; break;
      case 'KeyS': case 'ArrowDown': this.move.back = isDown; break;
      case 'KeyA': case 'ArrowLeft': this.move.left = isDown; break;
      case 'KeyD': case 'ArrowRight': this.move.right = isDown; break;
      case 'ShiftLeft': case 'ShiftRight': this.move.sprint = isDown; break;
      case 'Space':
        if (this.isLocked) {
          e.preventDefault();
          if (isDown && !e.repeat && this.grounded) this.jumpQueued = true;
        }
        break;
    }
  }

  lock() {
    sound.resume();
    this.controls.lock();
  }

  unlock() { this.controls.unlock(); }
  get isLocked() { return this.controls.isLocked; }

  update(delta) {
    if (!this.enabled || !this.controls.isLocked) return;

    const damping = Math.min(10 * delta, 1);

    this.direction.z = Number(this.move.forward) - Number(this.move.back);
    this.direction.x = Number(this.move.right) - Number(this.move.left);
    this.direction.normalize();

    const isMoving = this.move.forward || this.move.back || this.move.left || this.move.right;
    const speed = MOVE_SPEED * (this.move.sprint ? SPRINT_MULT : 1);

    // Velocity is in metres/second, so jump distance is consistent across frame rates.
    this.velocity.x += (this.direction.x * speed - this.velocity.x) * damping;
    this.velocity.z += (this.direction.z * speed - this.velocity.z) * damping;
    if (this.jumpQueued && this.grounded) {
      this.fallSpeed = -6;
      this.grounded = false;
    }
    this.jumpQueued = false;

    this.previousPosition.copy(this.camera.position);
    this.controls.moveRight(this.velocity.x * delta);
    this.controls.moveForward(this.velocity.z * delta);
    this.targetPosition.copy(this.camera.position);
    this.camera.position.copy(this.previousPosition);
    const dx = this.targetPosition.x - this.previousPosition.x;
    const dz = this.targetPosition.z - this.previousPosition.z;
    // Small steps keep sprinting from skipping a stair or a thin railing.
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.08));
    for (let i = 0; i < steps; i++) {
      this._moveAxis('x', dx / steps);
      this._moveAxis('z', dz / steps);
    }
    this._moveVertical(delta);

    // Trigger procedural footstep sound on cadence
    if (isMoving && this.grounded) {
      const stepInterval = this.move.sprint ? 0.32 : 0.48;
      this.stepTimer += delta;
      if (this.stepTimer >= stepInterval) {
        sound.playFootstep(this.move.sprint);
        this.stepTimer = 0;
      }
    } else {
      this.stepTimer = 0.2;
    }
  }

  _collides(pos) {
    const r = 0.35;
    const playerBox = this.playerBox;
    playerBox.min.set(pos.x - r, pos.y - PLAYER_HEIGHT + 0.01, pos.z - r);
    playerBox.max.set(pos.x + r, pos.y, pos.z + r);
    for (const box of this.colliders) {
      if (playerBox.intersectsBox(box)) return true;
    }
    return false;
  }

  teleport(position) {
    this.camera.position.copy(position);
    this.velocity.set(0, 0, 0);
    this.fallSpeed = 0;
    this.grounded = true;
    this.jumpQueued = false;
    for (const key in this.move) this.move[key] = false;
  }

  _supportHeight(pos, feet, stepAllowance = 0.21) {
    let height = 0;
    for (const box of this.walkableSurfaces) {
      if (pos.x + 0.35 > box.min.x && pos.x - 0.35 < box.max.x &&
          pos.z + 0.35 > box.min.z && pos.z - 0.35 < box.max.z &&
          box.max.y <= feet + stepAllowance) height = Math.max(height, box.max.y);
    }
    return height;
  }

  _moveAxis(axis, distance) {
    const pos = this.camera.position;
    const oldAxis = pos[axis];
    const oldY = pos.y;
    pos[axis] += distance;
    const feet = oldY - PLAYER_HEIGHT;
    const support = this._supportHeight(pos, feet);
    if (this.grounded && (support > feet || feet - support <= 0.21)) pos.y = support + PLAYER_HEIGHT;
    if (this._collides(pos)) {
      pos[axis] = oldAxis;
      pos.y = oldY;
      this.velocity[axis] = 0;
    }
  }

  _moveVertical(delta) {
    const pos = this.camera.position;
    const feet = pos.y - PLAYER_HEIGHT;
    this.fallSpeed += 18 * delta;
    let nextFeet = feet - this.fallSpeed * delta;
    let landed = false;
    // Sweep vertically against solids: land on decks/props and stop at undersides.
    for (const box of this.colliders) {
      if (pos.x + 0.35 <= box.min.x || pos.x - 0.35 >= box.max.x ||
          pos.z + 0.35 <= box.min.z || pos.z - 0.35 >= box.max.z) continue;
      if (this.fallSpeed >= 0 && box.max.y <= feet + 0.01 && box.max.y >= nextFeet) {
        nextFeet = box.max.y;
        landed = true;
      } else if (this.fallSpeed < 0 && box.min.y >= pos.y - 0.001 &&
                 box.min.y <= nextFeet + PLAYER_HEIGHT) {
        nextFeet = box.min.y - PLAYER_HEIGHT - 0.01;
      }
    }
    if (nextFeet <= 0) { nextFeet = 0; landed = true; }
    if (landed || (this.fallSpeed < 0 && nextFeet < feet - this.fallSpeed * delta)) this.fallSpeed = 0;
    pos.y = nextFeet + PLAYER_HEIGHT;
    this.grounded = landed;
  }
}
