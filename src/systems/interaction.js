import * as THREE from 'three';

const REACH = 3.2;

/**
 * Casts a ray from the centre of the screen each frame and finds the
 * nearest object tagged .userData.interactable within reach.
 * Objects register a callback: obj.userData.onInteract = () => {...}
 */
export class InteractionSystem {
  constructor(camera, scene, promptEl) {
    this.camera = camera;
    this.scene = scene;
    this.promptEl = promptEl;
    this.raycaster = new THREE.Raycaster();
    this.center = new THREE.Vector2(0, 0);
    this.current = null;

    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE' && this.current) {
        this.current.userData.onInteract?.(this.current);
      }
    });
  }

  update() {
    this.raycaster.setFromCamera(this.center, this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    const hit = hits.find(h => h.distance <= REACH && this._interactableAncestor(h.object));

    const target = hit ? this._interactableAncestor(hit.object) : null;

    if (target !== this.current) {
      this.current = target;
      if (this.promptEl) {
        this.promptEl.classList.toggle('hidden', !target);
        if (target?.userData.label) {
          this.promptEl.textContent = `[E] ${target.userData.label}`;
        }
      }
    }
  }

  _interactableAncestor(obj) {
    let o = obj;
    while (o) {
      if (o.userData?.interactable) return o;
      o = o.parent;
    }
    return null;
  }
}
