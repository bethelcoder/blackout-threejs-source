// Implements the fictional command-line puzzle described in the story brief:
// STATUS, SCAN GRID, AUTH <code>, ROUTE <node>, OVERRIDE WATER.
// These are string-matched puzzle commands, not real code execution.

const BOOT_TEXT =
`JHB SUBSTATION 07 — GRID CONTROL TERMINAL
Unauthorized access will be logged.
Type STATUS to begin.`;

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
    const cmd = raw.toUpperCase();
    this._print(`> ${raw}`);

    if (cmd === 'STATUS') {
      this._print('GRID: OFFLINE  |  WATER PUMPS: OFFLINE  |  AI: ACTIVE');
    } else if (cmd === 'SCAN GRID') {
      this._print('NODES FOUND: JHB-01 (locked) JHB-07 (unlocked) JHB-12 (locked)');
      this._print('Hint: check the maintenance office notes for an access code.');
    } else if (cmd.startsWith('AUTH ')) {
      const code = cmd.slice(5).trim();
      if (code === 'X451') { // matches the code found on the notes/access card prop
        this.authed = true;
        this._print('AUTHENTICATION ACCEPTED. Level 2 clearance granted.');
      } else {
        this._print('AUTHENTICATION FAILED.');
      }
    } else if (cmd === 'ROUTE JHB-07') {
      if (!this.authed) { this._print('ERROR: clearance required. Use AUTH <code>.'); }
      else { this.routed = true; this._print('ROUTING JHB-07... complete. Node online.'); }
    } else if (cmd === 'OVERRIDE WATER') {
      if (!this.routed) { this._print('ERROR: route a grid node before overriding water systems.'); }
      else {
        this._print('OVERRIDE ACCEPTED. Water infrastructure restored.');
        this._print('WARNING: intrusion logged. AI awareness increasing.');
        this.onSolved();
      }
    } else if (cmd === 'HELP') {
      this._print('Commands: STATUS, SCAN GRID, AUTH <code>, ROUTE <node>, OVERRIDE WATER');
    } else {
      this._print('UNKNOWN COMMAND. Type HELP for a command list.');
    }
  }
}
