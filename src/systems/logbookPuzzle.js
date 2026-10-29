import { inventory } from './inventory.js';
import { createDrawerKeypad } from './drawerKeypad.js';

// Read the hour digit of the stamped entries in entry order: 7, 3, 8, 2.
const STAMPED_HOURS = new Map([[4, 7], [11, 3], [19, 8], [26, 2]]);
const CODE = [...STAMPED_HOURS.values()].join('');
const NOTES = ['Pressure sensor drifting; recalibrate.', 'AI rejected manual access request.', 'Checked intake valve seals.', 'Backup battery test complete.', 'Monitor flicker reported.', 'Water supply isolated by central control.', 'Power feed held by AI lockdown.'];

export function createLogbookPuzzle({ onSolved, onUnlock, getKeypadModel, createKeypadRenderer }) {
  let overlay = null;
  let solved = false;
  let unlocked = false;
  let keypad = null;
  function collect() {
    if (!unlocked || solved) return false;
    if (!inventory.hasItem('uv_flashlight') && !inventory.addItem('uv_flashlight')) return false;
    solved = true;
    onSolved();
    close();
    return true;
  }
  function close(resume = true) {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.removeEventListener('keydown', keydown, true);
    document.dispatchEvent(new CustomEvent('robot-repair-close', { detail: { resume } }));
  }
  function keydown(event) {
    event.stopPropagation();
    if (event.code === 'Escape') { event.stopImmediatePropagation(); close(); }
  }
  function open(drawer = false) {
    if (overlay || keypad?.isOpen) return;
    if (drawer) {
      if (unlocked) return;
      keypad ??= createDrawerKeypad({
        getModel: getKeypadModel, createRenderer: createKeypadRenderer,
        correctCode: CODE,
        onUnlock: () => { unlocked = true; onUnlock?.(); },
      });
      keypad.open();
      return;
    }
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:#02080eea;display:grid;place-items:center;padding:24px;color:#eee5cb;font:16px monospace;box-sizing:border-box';
    const panel = document.createElement('section');
    panel.style.cssText = 'width:min(760px,100%);max-height:85vh;overflow:auto;background:#25251f;border:1px solid #b49e6b;padding:24px;box-sizing:border-box';
    const heading = document.createElement('h2');
    heading.textContent = 'ENGINEER’S LOGBOOK / SHIFT RECORD';
    panel.append(heading);
    const button = (text, action) => {
      const element = document.createElement('button');
      element.textContent = text;
      element.style.cssText = 'padding:12px;margin:8px 8px 8px 0;background:#343f44;color:#fff;border:1px solid #a5c5cf;cursor:pointer;font:inherit';
      element.addEventListener('click', action);
      panel.append(element);
      return element;
    };
    if (!drawer) {
      const note = document.createElement('p');
      note.textContent = 'Margin note: Drawer combination = hour digits from approved entries, in entry-number order. Ignore the minutes. Each shift hour is a single digit.';
      panel.append(note);
      for (let i = 1; i <= 28; i++) {
        const row = document.createElement('p');
        const hour = STAMPED_HOURS.get(i) ?? ((i * 3) % 9 + 1);
        row.style.cssText = `padding:9px;border-bottom:1px dashed #77705b;transform:rotate(${(i % 3 - 1) * 0.3}deg)`;
        row.textContent = `#${String(i).padStart(2, '0')} | 0${hour}:${String(i * 7 % 60).padStart(2, '0')} — ${NOTES[(i - 1) % NOTES.length]} `;
        if (STAMPED_HOURS.has(i)) {
          const stamp = document.createElement('strong');
          stamp.textContent = 'APPROVED';
          stamp.style.cssText = 'display:inline-block;color:#ff6659;border:3px double #ff6659;padding:3px 8px;transform:rotate(-7deg)';
          row.append(stamp);
        }
        panel.append(row);
      }
    }
    button('Return to room [Esc]', () => close());
    overlay.append(panel);
    document.body.append(overlay);
    document.addEventListener('keydown', keydown, true);
    document.exitPointerLock?.();
  }
  return { open, collect, get solved() { return solved; }, get unlocked() { return unlocked; }, get isOpen() { return !!overlay || !!keypad?.isOpen; }, dispose() { close(false); keypad?.dispose(); } };
}
