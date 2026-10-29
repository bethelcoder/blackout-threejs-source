import { inventory } from './inventory.js';
import { createSciFiTerminal } from './sciFiTerminal.js';

const RIDDLES = [
  { text: 'I have a mouth but never eat, a bed but never sleep, I run but never walk.', answer: 'river', part: 'robot_flow_module' },
  { text: 'The more you take, the more you leave behind.', answer: 'footsteps', part: 'robot_motion_module' },
  { text: 'I have keys but no locks, space but no room.', answer: 'keyboard', part: 'robot_interface_module' },
];

export function createRobotRepair({ onSolved }) {
  let overlay = null, progress = 0, awake = false;
  function close(resume = true) {
    if (!overlay) return;
    overlay.remove(); overlay = null;
    document.removeEventListener('keydown', keydown, true);
    document.dispatchEvent(new CustomEvent('robot-repair-close', { detail: { resume } }));
  }
  function keydown(event) {
    if (event.code === 'Escape') { event.stopImmediatePropagation(); close(); }
  }
  return {
    get solved() { return progress === RIDDLES.length; },
    get isOpen() { return !!overlay; },
    get parts() { return RIDDLES.slice(0, progress).map(riddle => riddle.part); },
    open() {
      if (overlay) return;
      const terminal = createSciFiTerminal({ title: 'ROBOT / COMMUNICATION', subtitle: 'SERVICE UNIT 03 / CHALLENGE–RESPONSE INTERFACE' });
      overlay = terminal.overlay; overlay.id = 'robot-repair-overlay';
      overlay.addEventListener('keydown', event => event.stopPropagation());
      const panel = terminal.panel;
      const progressLabel = document.createElement('div'); progressLabel.className = 'terminal-progress';
      const prompt = document.createElement('p'), status = document.createElement('p'); status.setAttribute('role', 'status');
      prompt.className = 'terminal-prompt';
      const input = document.createElement('input'); input.type = 'text'; input.maxLength = 40; input.setAttribute('aria-label', 'Robot message or riddle answer');
      panel.append(progressLabel, prompt, input, status);
      function button(label, action) { const b = document.createElement('button'); b.textContent = label; b.addEventListener('click', action); panel.append(b); return b; }
      const draw = () => {
        progressLabel.textContent = `${awake ? 'LINK ACTIVE' : 'AWAITING HANDSHAKE'} // PARTS RELEASED ${progress}/3`;
        if (progress === RIDDLES.length) {
          prompt.textContent = 'All three parts released: Flow Module, Motion Module, Interface Module. Robot record: circuit input 3V, output 5V; include R1 (+3V), R2 (-2V), R3 (+1V).';
          input.disabled = true; send.disabled = true; return;
        }
        prompt.textContent = awake ? `RIDDLE ${progress + 1} / 3: ${RIDDLES[progress].text}` : 'Robot dormant. Talk to it: type HELLO on the communication keypad to wake it.';
        input.placeholder = awake ? 'Enter your answer' : 'Type HELLO';
      };
      function submit() {
        const answer = input.value.trim().toLowerCase().replace(/[.!?]+$/g, '');
        if (progress === RIDDLES.length) return;
        if (!awake) {
          if (answer !== 'hello') { status.textContent = 'No response. Send HELLO to establish communication.'; return; }
          awake = true; input.value = ''; status.textContent = 'Robot awake. Answer three riddles to release the parts.'; draw(); return;
        }
        const riddle = RIDDLES[progress];
        if (answer !== riddle.answer) { status.textContent = 'Incorrect. Think it over and try again; your earned parts are safe.'; return; }
        if (!inventory.hasItem(riddle.part) && !inventory.addItem(riddle.part)) { status.textContent = 'Backpack full. Free a slot, then submit this answer again to collect the part.'; return; }
        progress++; input.value = ''; status.textContent = `Correct. Part ${progress}/3 collected: ${inventory.slots.find(item => item?.id === riddle.part)?.name}.`;
        if (progress === RIDDLES.length) onSolved();
        draw();
      }
      const send = button('Send message', submit);
      input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); submit(); } });
      button('Return to room', () => close()); draw();
      document.body.append(overlay); document.addEventListener('keydown', keydown, true); document.exitPointerLock?.();
    },
    dispose() { close(false); },
  };
}
