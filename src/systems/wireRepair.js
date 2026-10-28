const COLORS = ['#ffb454', '#6dd7ff', '#ef8fba', '#9ce6ad', '#c6a0ff', '#f4e07b'];
function shuffle(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createWireRepair(onRepaired = () => {}, random = Math.random) {
  // Generate from valid pairs, then hide the solution by shuffling both banks.
  let values = [12, 20, 9, 17, 13, 16];
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = shuffle(Array.from({ length: 17 }, (_, i) => i + 5), random).slice(0, 6);
    if (new Set([candidate[0] + candidate[1], candidate[2] + candidate[3], candidate[4] + candidate[5]]).size === 3) {
      values = candidate; break;
    }
  }
  const wires = Object.freeze(shuffle(values.map((value, i) => Object.freeze({ id: `wire-${i}`, value, color: COLORS[i] })), random));
  const sockets = Object.freeze(shuffle([0, 1, 2].map(i => Object.freeze({ id: `socket-${i}`, target: values[i * 2] + values[i * 2 + 1] })), random));
  const connected = new Map();
  let repaired = false;
  return {
    wires, sockets,
    get repaired() { return repaired; },
    get count() { return connected.size; },
    isConnected(id) { return connected.has(id); },
    connection(id) { return connected.get(id) ?? null; },
    cablesFor(socket) { return wires.filter(wire => connected.get(wire.id) === socket); },
    connect(wire, socket) {
      if (repaired || !wires.some(item => item.id === wire) || !sockets.some(item => item.id === socket)) return false;
      if (connected.get(wire) === socket) return true;
      if ([...connected.values()].filter(value => value === socket).length >= 2) return false;
      connected.set(wire, socket);
      return true;
    },
    disconnect(wire) { return !repaired && connected.delete(wire); },
    reset() { if (!repaired) connected.clear(); },
    test() {
      if (connected.size !== wires.length || !sockets.every(socket => {
        const cables = wires.filter(wire => connected.get(wire.id) === socket.id);
        return cables.length === 2 && cables[0].value + cables[1].value === socket.target;
      })) return false;
      if (!repaired) { repaired = true; onRepaired(); }
      return true;
    },
  };
}

export function openWireRepair(repair, onClose) {
  const overlay = document.createElement('div');
  overlay.id = 'wiring-panel-overlay';
  overlay.className = 'wiring-overlay';
  overlay.innerHTML = `
    <section class="wiring-panel" role="dialog" aria-modal="true" aria-labelledby="wiring-title">
      <div class="wiring-eyebrow">MAINTENANCE // ROOM POWER</div>
      <h2 id="wiring-title">Balance the power feeds</h2>
      <p>Each socket needs <strong>two cables</strong>. Their numbers must add up to its target. Use all six cables once, then test the circuit. Colours only help you trace the cables.</p>
      <div class="wiring-board"><div class="wire-sources" aria-label="Numbered cables"></div>
        <svg class="wire-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>
        <div class="wire-terminals" aria-label="Target sockets"></div></div>
      <p class="wiring-status" role="status" aria-live="polite"></p>
      <div class="wiring-actions"><button type="button" class="wiring-close">Close panel</button>
        <button type="button" class="wiring-reset">Disconnect all</button>
        <button type="button" class="wiring-test">Test circuit</button></div>
      <small>Select a connected cable to unplug it. Progress is saved when you close the panel. Escape returns to the room.</small>
    </section>`;
  document.body.appendChild(overlay);
  let selected = null;
  let closed = false;
  const status = overlay.querySelector('.wiring-status');
  const test = overlay.querySelector('.wiring-test');
  const sources = overlay.querySelector('.wire-sources');
  const terminals = overlay.querySelector('.wire-terminals');
  const lines = overlay.querySelector('.wire-lines');
  const reset = overlay.querySelector('.wiring-reset');
  function render(message) {
    sources.replaceChildren(); terminals.replaceChildren(); lines.replaceChildren();
    function button(wire) {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'wire-terminal';
      element.style.setProperty('--wire-color', wire.color);
      element.textContent = `${wire.value}${repair.isConnected(wire.id) ? ' · unplug' : ' · cable'}`;
      element.setAttribute('aria-label', `Cable ${wire.value}${repair.isConnected(wire.id) ? ', connected, select to unplug' : ''}`);
      element.setAttribute('aria-pressed', String(selected === wire.id));
      element.disabled = repair.repaired;
      element.onclick = () => {
        repair.disconnect(wire.id);
        selected = wire.id;
        render(`Cable ${wire.value} selected. Choose a socket with a free port.`);
        terminals.querySelector('button:not(:disabled)')?.focus();
      };
      return element;
    }
    repair.wires.forEach((wire, index) => {
      sources.appendChild(button(wire));
      if (repair.isConnected(wire.id)) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const socketIndex = repair.sockets.findIndex(socket => socket.id === repair.connection(wire.id));
        const cables = repair.cablesFor(repair.connection(wire.id));
        const port = cables.findIndex(cable => cable.id === wire.id);
        const from = (22 + index * 52) / 304 * 100;
        const to = (48 + socketIndex * 104 + (port ? 10 : -10)) / 304 * 100;
        line.setAttribute('d', `M 0 ${from} C 40 ${from}, 60 ${to}, 100 ${to}`);
        line.setAttribute('stroke', wire.color);
        lines.appendChild(line);
      }
    });
    repair.sockets.forEach(socket => {
      const cables = repair.cablesFor(socket.id);
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'wire-socket';
      element.textContent = `TARGET ${socket.target}\n${cables.map(cable => cable.value).join(' + ')}${cables.length === 0 ? '? + ?' : cables.length === 1 ? ' + ?' : ''}\n${cables.length}/2 ports`;
      element.setAttribute('aria-label', `Target ${socket.target}, ${cables.length} of 2 ports used`);
      element.disabled = repair.repaired || cables.length === 2;
      element.onclick = () => {
        if (!selected) { render('Select a numbered cable on the left first.'); return; }
        if (repair.connect(selected, socket.id)) {
          selected = null; render('Cable attached. Check the numbers before testing.');
          sources.querySelector('button:not(:disabled)')?.focus();
        }
      };
      terminals.appendChild(element);
    });
    status.textContent = repair.repaired ? 'Circuit repaired. Return to the wall switch to turn on the lights.'
      : `${repair.count}/6 cables connected. ${message || 'Fill each socket with two cables.'}`;
    test.disabled = !repair.repaired && repair.count < 6;
    test.textContent = repair.repaired ? 'Continue' : 'Test circuit';
    reset.disabled = repair.repaired || repair.count === 0;
  }
  function close(resume = true, notify = true) {
    if (closed) return;
    closed = true;
    window.removeEventListener('keydown', keydown, true);
    overlay.remove();
    onClose();
    if (notify) document.dispatchEvent(new CustomEvent('wiring-panel-close', { detail: { resume } }));
  }
  function keydown(event) {
    event.stopImmediatePropagation();
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if (event.key === 'Tab') {
      const buttons = [...overlay.querySelectorAll('button:not(:disabled)')];
      const index = buttons.indexOf(document.activeElement);
      event.preventDefault();
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
    }
    else if (!['Tab', 'Enter', ' '].includes(event.key)) event.preventDefault();
  }
  overlay.querySelector('.wiring-close').onclick = () => close();
  reset.onclick = () => { repair.reset(); selected = null; render('All cables disconnected.'); sources.querySelector('button')?.focus(); };
  test.onclick = () => {
    if (repair.repaired) { close(); return; }
    const passed = repair.test();
    render(passed ? '' : 'Test failed: at least one pair has the wrong total. Unplug cables and try again.');
    test.focus();
  };
  window.addEventListener('keydown', keydown, true);
  render();
  overlay.querySelector('.wiring-close').focus();
  if (document.pointerLockElement) document.exitPointerLock();
  return () => close(false, false);
}
