/**
 * Inventory System Data Model for BLACKOUT.
 * Pure data model managing items, capacity, and slot arrays.
 */

export const ITEM_DEFS = {
  torch: {
    id: 'torch',
    name: 'Inspection Torch',
    type: 'tool',
    icon: '🔦',
    desc: 'Tactical high-intensity LED torch. Click to equip in hand / toggle flashlight beam.',
  },
  technical_guide: {
    id: 'technical_guide',
    name: 'Technician Logbook',
    type: 'document',
    icon: '📋',
    desc: 'Facility operational logbook containing substation notes and clock diagnostics.',
    content: `SUBSTATION 07 — MAINTENANCE LOG
=========================================
• Clock diagnostic shift sequence: 02:15, 10:40, 06:00
• Primary blast door override code: X451
• Grid terminal auxiliary routing node: JHB-07
• CAUTION: AI security escalates upon human detection.`
  },
  maintenance_manual: {
    id: 'maintenance_manual',
    name: 'Substation Manual Vol. 2',
    type: 'document',
    icon: '📖',
    desc: 'Emergency protocols for high-voltage transformers and maintenance walkway vents.',
    content: `FACILITY PROTOCOL GUIDE — SECTION 4
=========================================
• High-voltage water discharge must be drained or isolated before transit.
• Maintenance crawlspace ventilation bypasses locked blast gates.
• Backup terminal commands: STATUS, ROUTE, OVERRIDE, DECRYPT.`
  },
  insulated_wrench: {
    id: 'insulated_wrench',
    name: 'Insulated Wrench',
    type: 'tool',
    icon: '🔧',
    desc: '1000V rated industrial ratchet wrench for breaker maintenance and conduit panels.',
  },
  multimeter: {
    id: 'multimeter',
    name: 'Digital Multimeter',
    type: 'tool',
    icon: '📟',
    desc: 'Diagnostic probe for testing circuit breaker resistance and electrical continuity.',
  },
  access_card: {
    id: 'access_card',
    name: 'Security Access Card',
    type: 'key',
    icon: '💳',
    desc: 'Encrypted municipal magnetic keycard granting Level 1 clearance.',
  },
  screwdriver: {
    id: 'screwdriver',
    name: 'Flat Screwdriver',
    type: 'tool',
    icon: '🪛',
    desc: 'Insulated flat-head driver for vent grilles and panel screws.',
  },
  hammer: {
    id: 'hammer',
    name: 'Claw Hammer',
    type: 'tool',
    icon: '🔨',
    desc: 'Forged claw hammer. Too blunt for the vent screws.',
  },
  wrench: {
    id: 'wrench',
    name: 'Open-End Wrench',
    type: 'tool',
    icon: '🔧',
    desc: 'Flat forged wrench with an open jaw. Wrong fit for vent screws.',
  },
  pliers: {
    id: 'pliers',
    name: 'Pliers',
    type: 'tool',
    icon: '🗜️',
    desc: 'Riveted pliers with dipped grips. Cannot grip the vent screws.',
  },
};

export class Inventory {
  constructor(capacity = 8) {
    this.capacity = capacity;
    this.slots = new Array(capacity).fill(null);
    this.listeners = [];

    // The engineer starts with the inspection torch already in their backpack
    this.initDefaultItems();
  }

  initDefaultItems() {
    this.slots.fill(null);
    this.slots[0] = { ...ITEM_DEFS.torch };
    this._notify();
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  _notify() {
    this.listeners.forEach((fn) => fn(this.slots));
  }

  addItem(itemId, customData = {}) {
    const def = ITEM_DEFS[itemId];
    if (!def) {
      console.warn(`Unknown itemId: ${itemId}`);
      return false;
    }

    // Find first empty slot
    const emptyIdx = this.slots.findIndex((slot) => slot === null);
    if (emptyIdx === -1) {
      return false; // Inventory full
    }

    this.slots[emptyIdx] = {
      ...def,
      ...customData,
    };
    this._notify();
    return true;
  }

  removeItem(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.capacity) return null;
    const item = this.slots[slotIndex];
    this.slots[slotIndex] = null;
    this._notify();
    return item;
  }

  hasItem(itemId) {
    return this.slots.some((slot) => slot && slot.id === itemId);
  }

  getItem(slotIndex) {
    return this.slots[slotIndex] || null;
  }

  clear() {
    this.initDefaultItems();
  }
}

export const inventory = new Inventory(8);
