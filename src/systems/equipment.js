import { sound } from './audio.js';

/**
 * Equipment System for BLACKOUT.
 * Owns which tool is in the player's hand. The bag is the inventory; equipping
 * only changes what is visible in the hand, never what the player owns.
 */
export class EquipmentSystem {
  constructor(camera, flashlight) {
    this.camera = camera;
    this.flashlight = flashlight;
    this.viewmodel = null;
    this.equippedTool = 'torch'; // Torch equipped in hand by default
    this.torchOn = true;
    this.torchIntensity = 3.5;
    this.uvIntensity = 12;
    this.listeners = [];
  }

  /** Subscribe to hand changes; the listener also runs once with the current tool. */
  onEquipChange(listener) {
    this.listeners.push(listener);
    listener(this.equippedTool);
  }

  _notify() {
    for (const fn of this.listeners) fn(this.equippedTool);
  }

  _applyTorchLight() {
    if (this.flashlight) {
      const uv = this.equippedTool === 'uv_flashlight';
      this.flashlight.color.set(uv ? 0xc38aff : 0xfff1db);
      this.flashlight.intensity = this.torchOn ? (uv ? this.uvIntensity : this.torchIntensity) : 0;
    }
    this.viewmodel?.setTool(this.equippedTool, this.torchOn);
  }

  setViewmodel(viewmodel) {
    this.viewmodel = viewmodel;
    this._applyTorchLight();
  }

  toggleTorch() {
    if (!['torch', 'uv_flashlight'].includes(this.equippedTool)) {
      this.equipTool('torch');
      return true;
    }
    this.torchOn = !this.torchOn;
    sound.playSwitch();
    this._applyTorchLight();
    this._notify();
    return this.torchOn;
  }

  equipTool(itemId) {
    this.equippedTool = itemId ?? null;
    // The beam is a camera-mounted headlamp, so drawing another tool must not
    // douse it - the player would be left in the dark mid-room.
    if (itemId === 'torch' || itemId === 'uv_flashlight') this.torchOn = true;
    sound.playSwitch();
    this._applyTorchLight();
    this._notify();
  }

  unequipTool() {
    // Stowing a tool must not douse the headlamp: the beam is what keeps the
    // room navigable, so it stays exactly as the player left it.
    this.equippedTool = null;
    this._applyTorchLight();
    this._notify();
  }

  isEquipped(itemId) {
    return this.equippedTool === itemId;
  }
}
