import * as THREE from 'three';
import { inventory, ITEM_DEFS } from './inventory.js';
import { sound } from './audio.js';

/**
 * Raycast Pickup System bound to [F] key.
 * Detects world meshes with `userData.pickupable = true` and `userData.itemId`.
 */
export class PickupSystem {
  constructor(getCamera, scene, promptEl, toastEl) {
    // getCamera can be a Camera instance or a function returning the active camera
    this.getCamera = typeof getCamera === 'function' ? getCamera : () => getCamera;
    this.scene = scene;
    this.promptEl = promptEl;
    this.toastEl = toastEl;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 3.8; // Pickup range

    this.currentTarget = null;
    this.toastTimer = null;

    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyF' && this.currentTarget) {
        this._pickup(this.currentTarget);
      }
    });
  }

  update() {
    const camera = this.getCamera();
    if (!camera) return;

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    let foundTarget = null;
    for (const hit of intersects) {
      let obj = hit.object;
      while (obj && obj !== this.scene) {
        if (obj.userData?.pickupable && obj.userData?.itemId) {
          foundTarget = obj;
          break;
        }
        obj = obj.parent;
      }
      if (foundTarget) break;
    }

    if (foundTarget) {
      this.currentTarget = foundTarget;
      const def = ITEM_DEFS[foundTarget.userData.itemId];
      const name = def?.name || foundTarget.userData.label || 'Item';
      if (this.promptEl) {
        this.promptEl.textContent = `[F] Pick up ${name}`;
        this.promptEl.classList.remove('hidden');
      }
    } else {
      if (this.currentTarget && this.promptEl) {
        this.promptEl.classList.add('hidden');
      }
      this.currentTarget = null;
    }
  }

  _pickup(obj) {
    const itemId = obj.userData.itemId;
    const added = inventory.addItem(itemId);

    if (added) {
      sound.playInteract();
      const def = ITEM_DEFS[itemId];
      const name = def?.name || 'Item';
      this.showToast(`🎒 Placed ${name} into backpack`);

      if (obj.userData.onPickup) {
        obj.userData.onPickup();
      }

      // Remove from scene and parent
      if (obj.parent) {
        obj.parent.remove(obj);
      } else {
        this.scene.remove(obj);
      }

      if (this.promptEl) {
        this.promptEl.classList.add('hidden');
      }
      this.currentTarget = null;
    } else {
      sound.playDetectionWarning(0.4);
      this.showToast('Backpack is full!');
    }
  }

  showToast(message) {
    if (!this.toastEl) return;
    this.toastEl.textContent = message;
    this.toastEl.classList.remove('hidden');
    this.toastEl.style.opacity = '1';

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastEl.style.opacity = '0';
      setTimeout(() => this.toastEl.classList.add('hidden'), 400);
    }, 2400);
  }
}
