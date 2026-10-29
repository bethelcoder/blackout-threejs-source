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
  }

  setViewmodel(viewmodel) {
    this.viewmodel = viewmodel;
    if (this.viewmodel) {
      this.viewmodel.setTorchVisible(this.equippedTool === 'torch' && this.torchOn);
    }
  }

  toggleTorch() {
    this.torchOn = !this.torchOn;
    sound.playSwitch();
    if (this.flashlight) {
      this.flashlight.intensity = this.torchOn ? this.torchIntensity : 0;
    }
    if (this.viewmodel) {
      this.viewmodel.setTorchVisible(this.equippedTool === 'torch' && this.torchOn);
    }
    return this.torchOn;
  }

  equipTool(itemId) {
    this.equippedTool = itemId;
    if (itemId === 'torch') {
      this.torchOn = true;
      if (this.flashlight) {
        this.flashlight.intensity = this.torchIntensity;
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
