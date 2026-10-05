import * as THREE from 'three';

const REACH = 3.2;

/**
 * Casts a ray from the centre of the screen each frame and finds the
 * nearest object tagged .userData.interactable within reach.
 * Objects register a callback: obj.userData.onInteract = () => {...}
 */
export class InteractionSystem {
  constructor(camera, scene, promptEl, isEnabled = () => true) {
    this.camera = camera;
    this.scene = scene;
    this.promptEl = promptEl;
    this.raycaster = new THREE.Raycaster();
    this.center = new THREE.Vector2(0, 0);
    this.current = null;
    this.isEnabled = isEnabled;
    this.held = false;
    this.hits = [];

    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE' && !e.repeat && this.isEnabled() && this.current) {
        this.held = true;
        this.current.userData.onInteract?.(this.current);
      }
    });
    document.addEventListener('keyup', e => { if (e.code === 'KeyE') this.held = false; });
    document.addEventListener('pointerlockchange', () => this.reset());
  }

  reset() {
    this.current = null;
    this.held = false;
    this.promptEl?.classList.add('hidden');
  }

  update(delta = 0) {
    if (!this.isEnabled()) { this.reset(); return; }
    this.raycaster.setFromCamera(this.center, this.camera);
    this.hits.length = 0;
    this.raycaster.intersectObjects(this.scene.children, true, this.hits);
    const hit = this.hits.find(h => h.distance <= REACH && h.object.isMesh && this._visible(h.object));

    let target = hit ? this._interactableAncestor(hit.object) : null;
    if (target && hit.distance > (target.userData.reach ?? REACH)) target = null;

    if (target !== this.current) {
      this.held = false;
      this.current = target;
      if (this.promptEl) {
        this.promptEl.classList.toggle('hidden', !target);
        if (target?.userData.label) {
          this.promptEl.textContent = `[E] ${target.userData.label}`;
        }
      }
    }
    if (this.current && this.held) this.current.userData.onHold?.(delta);
    if (this.current && this.promptEl) {
      const label = this.current.userData.getLabel?.() || this.current.userData.label;
      this.promptEl.textContent = `[E] ${label}`;
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

  _visible(obj) {
    for (let node = obj; node; node = node.parent) if (!node.visible) return false;
    return true;
  }
}
