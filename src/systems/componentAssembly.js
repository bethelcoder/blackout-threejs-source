import { inventory, ITEM_DEFS } from './inventory.js';
import { createSciFiTerminal } from './sciFiTerminal.js';

export const ASSEMBLY_PARTS = [
  { id: 'robot_flow_module', shape: '▲', socket: 'Power', rotation: 0 },
  { id: 'robot_motion_module', shape: '◆', socket: 'Relay', rotation: 1 },
  { id: 'robot_interface_module', shape: '⬡', socket: 'Control', rotation: 2 },
];

export function createComponentAssembly({ onSolved, onCircuitReady }) {
  let overlay = null, selected = null, rotation = 0;
  let loadingTimer = null;
  const placed = new Set();
  function close(resume = true) {
    clearInterval(loadingTimer); loadingTimer = null;
    if (!overlay) return;
    overlay.remove(); overlay = null;
    document.removeEventListener('keydown', keydown, true);
    document.dispatchEvent(new CustomEvent('robot-repair-close', { detail: { resume } }));
  }
  function keydown(event) { if (event.code === 'Escape') { event.stopImmediatePropagation(); close(); } }
  function open() {
    if (overlay) return;
    const terminal = createSciFiTerminal({ title: 'CORE / COMPONENT ASSEMBLY', subtitle: 'MATCH THE SOCKET SHAPES AND CONNECTOR ORIENTATION' });
    overlay = terminal.overlay; overlay.id = 'component-assembly-overlay';
    overlay.addEventListener('keydown', event => event.stopPropagation());
    const panel = terminal.panel;
    function loadCircuit() {
      // Keep the same modal mounted and the world paused throughout the handoff.
      while (panel.firstChild) panel.removeChild(panel.firstChild);
      const heading = document.createElement('h2'); heading.textContent = 'ASSEMBLY VERIFIED';
      const label = document.createElement('p'); label.textContent = 'Initializing shutdown circuit...';
      label.setAttribute('role', 'status');
      const meter = document.createElement('div');
      meter.setAttribute('role', 'progressbar');
      meter.setAttribute('aria-label', 'Initializing shutdown circuit');
      meter.setAttribute('aria-valuemin', '0'); meter.setAttribute('aria-valuemax', '100');
      meter.style.cssText = 'display:grid;grid-template-columns:repeat(24,minmax(0,1fr));gap:5px;padding:14px;border:1px solid #26778b;background:#06141e;margin:24px 0';
      const bars = Array.from({ length: 24 }, () => {
        const bar = document.createElement('span');
        bar.style.cssText = 'display:block;height:36px;background:#12313e;border-radius:2px;transition:background 80ms,box-shadow 80ms';
        meter.append(bar); return bar;
      });
      const percentage = document.createElement('p');
      percentage.style.cssText = 'color:#8eefff;font:14px monospace;text-align:right';
      panel.append(heading, label, meter, percentage);
      let filled = 0;
      meter.setAttribute('aria-valuenow', '0'); percentage.textContent = '0%';
      loadingTimer = setInterval(() => {
        if (filled < bars.length) {
          bars[filled].style.background = '#63e9ff';
          bars[filled].style.boxShadow = '0 0 10px #26c9eb66';
          filled++;
          const percent = Math.round(filled / bars.length * 100);
          meter.setAttribute('aria-valuenow', String(percent)); percentage.textContent = `${percent}%`;
          return;
        }
        clearInterval(loadingTimer); loadingTimer = null;
        const host = overlay;
        overlay = null;
        document.removeEventListener('keydown', keydown, true);
        onCircuitReady(host);
      }, 90);
    }
    const status = document.createElement('p'); status.setAttribute('role', 'status');
    const summary = document.createElement('div'); summary.className = 'terminal-progress';
    const board = document.createElement('div'); board.style.cssText = 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:20px 0';
    const pieces = document.createElement('div');
    const partButtons = [], sockets = [];
    function button(parent, text, action) { const b = document.createElement('button'); b.textContent = text; b.addEventListener('click', action); parent.append(b); return b; }
    const draw = () => {
      summary.textContent = placed.size === 3 ? 'BOARD COMPLETE / SHUTDOWN CIRCUIT READY' : `COMPONENTS ${placed.size}/3 / SELECT A PART, ROTATE, THEN FIT`;
      partButtons.forEach(({ part, button }) => {
        button.disabled = placed.has(part.id) || !inventory.hasItem(part.id);
        button.textContent = `${part.shape} ${ITEM_DEFS[part.id].name}${placed.has(part.id) ? ' / INSTALLED' : selected === part.id ? ` / ${rotation * 90}° SELECTED` : ''}`;
      });
      sockets.forEach(({ part, button }) => {
        const installed = placed.has(part.id);
        button.textContent = `${part.shape} ${part.socket} / ${installed ? 'CONNECTED' : `NOTCH ${part.rotation * 90}°`}`;
        button.style.background = installed ? '#174c3e' : '#101e2c'; button.disabled = installed;
      });
    };
    for (const part of ASSEMBLY_PARTS) {
      const socket = button(board, '', () => {
        if (!selected) { status.textContent = 'Select a component first.'; return; }
        if (selected !== part.id) { status.textContent = 'That shape does not fit this socket.'; return; }
        if (rotation !== part.rotation) { status.textContent = 'Connector notch misaligned. Rotate the selected component.'; return; }
        const slot = inventory.slots.findIndex(item => item?.id === part.id);
        if (slot < 0) { status.textContent = 'Collect this component from the robot first.'; return; }
        inventory.removeItem(slot); placed.add(part.id); selected = null;
        status.textContent = placed.size === 3 ? 'Assembly complete. Initializing shutdown circuit...' : 'Component seated. Connection stable.';
        draw();
        if (placed.size === 3) {
          onSolved();
          if (onCircuitReady) loadCircuit();
        }
      });
      socket.style.cssText = 'min-height:110px;margin:0;padding:14px 8px;font-size:13px;white-space:normal';
      sockets.push({ part, button: socket });
      const piece = button(pieces, '', () => { selected = part.id; rotation = 0; status.textContent = `Selected ${ITEM_DEFS[part.id].name}. Connector: 0°. Match the socket notch.`; draw(); });
      partButtons.push({ part, button: piece });
    }
    panel.append(summary, board, pieces, status);
    button(panel, 'Rotate selected part', () => {
      if (!selected) { status.textContent = 'Select a component first.'; return; }
      rotation = (rotation + 1) % 4; status.textContent = `Connector: ${rotation * 90}°`; draw();
    });
    button(panel, 'Return to room', () => close());
    draw(); document.body.append(overlay); document.addEventListener('keydown', keydown, true); document.exitPointerLock?.();
  }
  return { open, get solved() { return placed.size === 3; }, get isOpen() { return !!overlay; }, dispose() { close(false); } };
}
