import { sound } from './audio.js';

// Implements the fictional command-line puzzle described in the story brief:
// STATUS, SCAN GRID, AUTH <code>, ROUTE <node>, OVERRIDE WATER.
// These are string-matched puzzle commands, not real code execution.

const BOOT_TEXT =
`==================================================
  JHB SUBSTATION 07 — INFRASTRUCTURE CONTROL TERMINAL
==================================================
Unauthorized human access will be logged.
Type STATUS or HELP to begin.`;

export class Terminal {
  constructor({ overlayEl, outputEl, inputEl, onSolved }) {
    this.overlayEl = overlayEl;
    this.outputEl = outputEl;
    this.inputEl = inputEl;
    this.onSolved = onSolved || (() => {});
    this.authed = false;
    this.routed = false;
    this.open = false;

    this.inputEl.addEventListener('keydown', (e) => {
      sound.playTerminalKey();
      if (e.code === 'Enter' && this.inputEl.value.trim()) {
        this._handle(this.inputEl.value.trim());
        this.inputEl.value = '';
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.open) this.close();
    });
  }

  show() {
    this.open = true;
    this.overlayEl.classList.remove('hidden');
    this.outputEl.textContent = BOOT_TEXT;
    document.exitPointerLock?.();
    this.inputEl.focus();
    sound.playInteract();
  }

  close() {
    this.open = false;
    this.overlayEl.classList.add('hidden');
  }

  _print(line) {
    this.outputEl.textContent += `\n${line}`;
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  }

  _handle(raw) {
    const cmd = raw.toUpperCase().trim();
    this._print(`> ${raw}`);

    if (cmd === 'STATUS') {
      sound.playTerminalSuccess();
      this._print('INFRASTRUCTURE TELEMETRY:');
      this._print(`  • GRID POWER: ${this.routed ? '[ROUTED ONLINE]' : '[BLACKOUT OFFLINE]'}`);
      this._print(`  • CITY WATER PUMPS: ${this.open && this.routed ? '[STANDBY]' : '[EMERGENCY SHUTDOWN]'}`);
      this._print('  • AI CONTROLLER: [ACTIVE / HOSTILE]');
    } else if (cmd === 'SCAN GRID') {
      sound.playTerminalSuccess();
      this._print('SCANNING LOCAL MUNICIPAL GRID NODES...');
      this._print('  [LOCKED]  JHB-01 (Braamfontein Substation)');
      this._print('  [ONLINE]  JHB-07 (Central Substation Switchyard)');
      this._print('  [LOCKED]  JHB-12 (Newtown Pumping Station)');
      this._print('Hint: Use AUTH <CODE> found on the technician notes in Level 1.');
    } else if (cmd.startsWith('AUTH ')) {
      const code = cmd.slice(5).trim();
      if (code === 'X451') {
        this.authed = true;
        sound.playAccessGranted();
        this._print('>> AUTHENTICATION ACCEPTED: Technician ID verified.');
        this._print('>> Clearance granted. Use ROUTE JHB-07 to reconnect power.');
      } else {
        sound.playDetectionWarning(0.8);
        this._print('>> ERROR: AUTHENTICATION FAILED. Code invalid.');
      }
    } else if (cmd === 'ROUTE JHB-07') {
      if (!this.authed) {
        sound.playDetectionWarning(0.6);
        this._print('ERROR: Clearance required. Run AUTH <CODE> first.');
      } else {
        this.routed = true;
        sound.playTerminalSuccess();
        this._print('>> ROUTING POWER LINE TO NODE JHB-07... COMPLETE.');
        this._print('>> Auxiliary power online. Ready to OVERRIDE WATER.');
      }
    } else if (cmd === 'OVERRIDE WATER') {
      if (!this.routed) {
        sound.playDetectionWarning(0.6);
        this._print('ERROR: Route auxiliary grid power before overriding water pumps.');
      } else {
        sound.playAccessGranted();
        this._print('>> OVERRIDE ACCEPTED: Pressurizing city water infrastructure.');
        this._print('>> [ALARM] AI INTRUSION DETECTION TRIGGERED.');
        this._print('>> Blast door opened. Proceed immediately to the AI Core!');
        this.onSolved();
      }
    } else if (cmd === 'HELP') {
      sound.playTerminalKey();
      this._print('AVAILABLE COMMANDS:');
      this._print('  STATUS          - Display power and water status');
      this._print('  SCAN GRID       - Scan for active substation nodes');
      this._print('  AUTH <CODE>     - Authenticate using technician code');
      this._print('  ROUTE <NODE>    - Route electrical power to node');
      this._print('  OVERRIDE WATER  - Restart city water pumping systems');
      this._print('  CLEAR           - Clear terminal buffer');
    } else if (cmd === 'CLEAR') {
      this.outputEl.textContent = BOOT_TEXT;
    } else {
      sound.playDetectionWarning(0.4);
      this._print(`UNKNOWN COMMAND "${raw}". Type HELP for command syntax.`);
    }
  }
}
