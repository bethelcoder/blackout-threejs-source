import * as THREE from 'three';
import { sound } from './audio.js';

/**
 * Equipment System for BLACKOUT.
 * Manages in-hand tools, flashlight illumination states, and viewmodel attachments.
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
  }

  setViewmodel(viewmodel) {
    this.viewmodel = viewmodel;
    if (this.viewmodel) {
      this.viewmodel.setTorchVisible(['torch', 'uv_flashlight'].includes(this.equippedTool) && this.torchOn);
    }
  }

  toggleTorch() {
    this.torchOn = !this.torchOn;
    sound.playSwitch();
    if (this.flashlight) {
      this.flashlight.intensity = this.torchOn ? (this.equippedTool === 'uv_flashlight' ? this.uvIntensity : this.torchIntensity) : 0;
    }
    if (this.viewmodel) {
      this.viewmodel.setTorchVisible(['torch', 'uv_flashlight'].includes(this.equippedTool) && this.torchOn);
    }
    return this.torchOn;
  }

  equipTool(itemId) {
    this.equippedTool = itemId;
    if (itemId === 'torch' || itemId === 'uv_flashlight') {
      this.torchOn = true;
      if (this.flashlight) {
        this.flashlight.color.set(itemId === 'uv_flashlight' ? 0xc38aff : 0xffffff);
        this.flashlight.intensity = itemId === 'uv_flashlight' ? this.uvIntensity : this.torchIntensity;
      }
      if (this.viewmodel) {
        this.viewmodel.setTorchVisible(true);
      }
      sound.playSwitch();
    }
  }

  unequipTool() {
    this.equippedTool = null;
    this.torchOn = false;
    if (this.flashlight) {
      this.flashlight.intensity = 0;
    }
    if (this.viewmodel) {
      this.viewmodel.setTorchVisible(false);
    }
  }
}
