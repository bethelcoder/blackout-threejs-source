import { InteractionTarget } from './interactionTarget.js';

const REACH = 3.2;

/**
 * Finds visible interactable objects within reach, with a small aiming
 * tolerance around the centre of the screen.
 * Objects register a callback: obj.userData.onInteract = () => {...}
 */
export class InteractionSystem {
  constructor(camera, scene, promptEl, isEnabled = () => true) {
    this.camera = camera;
    this.scene = scene;
    this.promptEl = promptEl;
    this.targeting = new InteractionTarget();
    this.current = null;
    this.isEnabled = isEnabled;
    this.held = false;
    this.scanDelay = 0;

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
    this.scanDelay = 0;
    this.promptEl?.classList.add('hidden');
  }

  update(delta = 0) {
    if (!this.isEnabled()) { this.reset(); return; }
    this.scanDelay -= delta;
    let target = this.current;
    if (this.scanDelay <= 0) {
      this.scanDelay = 0.08;
      target = this.targeting.find(this.camera, this.scene, REACH, object => object.userData?.interactable);
    }

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
      const action = this.current.userData.promptAction ?? '[E]';
      this.promptEl.textContent = `${action} ${label}`;
    }
  }

}
