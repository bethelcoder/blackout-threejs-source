import { inventory } from './inventory.js';
import { sound } from './audio.js';

/**
 * Backpack UI Inventory Overlay for BLACKOUT.
 * Bound to [B] key. Real-time menu allowing players to inspect tools, books, and torches.
 */
export class BackpackUI {
  constructor({ overlayEl, slotsContainerEl, docReaderEl, docContentEl, equipment, playerControls }) {
    this.overlayEl = overlayEl;
    this.slotsContainerEl = slotsContainerEl;
    this.docReaderEl = docReaderEl;
    this.docContentEl = docContentEl;
    this.equipment = equipment;
    this.playerControls = playerControls;

    this.isOpen = false;

    // Listen for inventory updates
    inventory.onChange(() => this.render());

    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyB') {
        if (this.docReaderEl && !this.docReaderEl.classList.contains('hidden')) {
          this.closeDocReader();
        } else {
          this.toggle();
        }
      } else if (e.code === 'Escape' && this.isOpen) {
        if (this.docReaderEl && !this.docReaderEl.classList.contains('hidden')) {
          this.closeDocReader();
        } else {
          this.close();
        }
      }
    });

    this.render();
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    if (this.overlayEl) {
      this.overlayEl.classList.remove('hidden');
    }
    sound.playInteract();
    this.render();

    // Release mouse cursor for interaction
    document.exitPointerLock?.();
  }

  close() {
    this.isOpen = false;
    if (this.overlayEl) {
      this.overlayEl.classList.add('hidden');
    }
    if (this.docReaderEl) {
      this.docReaderEl.classList.add('hidden');
    }

    // Re-engage first/third-person pointer lock if game is active
    if (this.playerControls && this.playerControls.enabled) {
      this.playerControls.lock();
    }
  }

  render() {
    if (!this.slotsContainerEl) return;
    this.slotsContainerEl.innerHTML = '';

    const filledCount = inventory.slots.filter(Boolean).length;
    const headerTitle = this.overlayEl?.querySelector('.backpack-header h2');
    if (headerTitle) {
      headerTitle.textContent = `FIELD BACKPACK (${filledCount} / ${inventory.capacity})`;
    }

    const meterFill = this.overlayEl?.querySelector('#backpack-meter-fill');
    if (meterFill) {
      const pct = (filledCount / inventory.capacity) * 100;
      meterFill.style.width = `${pct}%`;
    }

    inventory.slots.forEach((item, index) => {
      const slotDiv = document.createElement('div');
      slotDiv.className = `backpack-slot ${item ? 'filled' : 'empty'}`;
      const slotNum = String(index + 1).padStart(2, '0');

      if (item) {
        let statusBadge = item.type.toUpperCase();
        let badgeClass = 'tool';
        if (item.id === 'torch' || item.id === 'uv_flashlight') {
          const isTorchActive = this.equipment?.equippedTool === item.id && this.equipment?.torchOn;
          statusBadge = isTorchActive ? 'EQUIPPED [ACTIVE BEAM]' : 'IN RIG [BEAM OFF]';
          badgeClass = isTorchActive ? 'active-torch' : 'idle-torch';
        } else if (item.type === 'document') {
          statusBadge = 'CLASSIFIED [READ]';
          badgeClass = 'doc';
        } else if (item.type === 'tool') {
          statusBadge = 'OPERATIVE TOOL';
          badgeClass = 'tool';
        }

        slotDiv.innerHTML = `
          <div class="slot-corner tl"></div>
          <div class="slot-corner tr"></div>
          <div class="slot-corner bl"></div>
          <div class="slot-corner br"></div>
          <div class="slot-index">${slotNum}</div>
          <div class="item-hologram-aura"></div>
          <div class="item-icon">${item.icon || '📦'}</div>
          <div class="item-info">
            <div class="item-name">${item.name}</div>
            <div class="item-badge ${badgeClass}">${statusBadge}</div>
          </div>
        `;

        slotDiv.addEventListener('click', () => {
          this._handleItemClick(item, index);
        });
      } else {
        slotDiv.innerHTML = `
          <div class="slot-corner tl"></div>
          <div class="slot-corner tr"></div>
          <div class="slot-corner bl"></div>
          <div class="slot-corner br"></div>
          <div class="slot-index">${slotNum}</div>
          <div class="slot-hatch-pattern"></div>
          <div class="empty-label">STANDBY // EMPTY</div>
        `;
      }

      this.slotsContainerEl.appendChild(slotDiv);
    });
  }

  _handleItemClick(item, index) {
    sound.playKeypadBeep();

    if (item.id === 'torch' || item.id === 'uv_flashlight') {
      let isOn;
      if (this.equipment?.equippedTool !== item.id) {
        this.equipment?.equipTool(item.id);
        isOn = this.equipment?.torchOn;
      } else {
        isOn = this.equipment?.toggleTorch();
      }
      const statusText = isOn ? 'ENABLED (BEAM ON)' : 'DISABLED (BEAM OFF)';
      const promptEl = document.getElementById('interact-prompt');
      if (promptEl) {
        promptEl.textContent = `${item.name} ${statusText}`;
        promptEl.classList.remove('hidden');
        setTimeout(() => promptEl.classList.add('hidden'), 1600);
      }
      this.render();
    } else if (item.type === 'document') {
      this.showDocReader(item.name, item.content || item.desc);
    } else {
      const promptEl = document.getElementById('interact-prompt');
      if (promptEl) {
        promptEl.textContent = `${item.name}: ${item.desc}`;
        promptEl.classList.remove('hidden');
        setTimeout(() => promptEl.classList.add('hidden'), 2500);
      }
    }
  }

  showDocReader(title, content) {
    if (!this.docReaderEl) return;
    const titleSpan = this.docReaderEl.querySelector('.doc-title span:last-child');
    if (titleSpan) {
      titleSpan.textContent = title;
    } else {
      const titleEl = this.docReaderEl.querySelector('.doc-title');
      if (titleEl) titleEl.textContent = title;
    }
    if (this.docContentEl) this.docContentEl.textContent = content;
    this.docReaderEl.classList.remove('hidden');
    sound.playInteract();
  }

  closeDocReader() {
    if (this.docReaderEl) this.docReaderEl.classList.add('hidden');
    sound.playInteract();
  }
}
