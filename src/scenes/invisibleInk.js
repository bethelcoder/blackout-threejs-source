import * as THREE from 'three';
import { inventory } from '../systems/inventory.js';
import { createSciFiTerminal } from '../systems/sciFiTerminal.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function buildInvisibleInk({ equipment, enabled, hud, onSolved }) {
  const group = new THREE.Group();
  group.name = 'Invisible ink puzzle';
  const found = new Set();
  let solved = false, overlay = null;
  const direction = new THREE.Vector3(), target = new THREE.Vector3(), offset = new THREE.Vector3();
  const woodCanvas = document.createElement('canvas'); woodCanvas.width = 512; woodCanvas.height = 128;
  const woodContext = woodCanvas.getContext('2d');
  woodContext.fillStyle = '#86532e'; woodContext.fillRect(0, 0, 512, 128);
  for (let row = 0; row < 64; row++) {
    woodContext.strokeStyle = row % 3 ? '#a970424f' : '#44271370';
    woodContext.lineWidth = row % 4 === 0 ? 2 : 1;
    woodContext.beginPath();
    for (let x = 0; x <= 512; x += 16) {
      const y = row * 2 + Math.sin(x * 0.018 + row * 0.7) * 1.4;
      if (x === 0) woodContext.moveTo(x, y); else woodContext.lineTo(x, y);
    }
    woodContext.stroke();
  }
  const woodTexture = new THREE.CanvasTexture(woodCanvas); woodTexture.colorSpace = THREE.SRGBColorSpace;
  const woodMaterial = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.82 });
  const clues = [
    { id: 'key', title: 'FACILITY SAFETY NOTICE', text: 'Keep all service routes clear.', ink: ['UV SERVICE CIPHER', '△ = R    ○ = E    ◇ = L', '□ = A    ☆ = Y    + = T', 'Number = letter position.', 'Read all three marked surfaces.'], pos: [0, 2.35, 6.94], yaw: Math.PI },
    { id: 'poster', title: 'CIRCUIT SAFETY', text: 'Isolate equipment before servicing.', ink: ['SERVICE FRAGMENT A', '3 : ◇      1 : △'], pos: [-6.94, 2.5, 3.8], yaw: Math.PI / 2 },
    { id: 'label', title: 'CONTROL SYSTEM / INSPECTION', text: 'Authorised maintenance staff only.', ink: ['SERVICE FRAGMENT B', '5 : ☆      2 : ○'], pos: [6.94, 2.7, 2.3], yaw: -Math.PI / 2 },
    { id: 'tile', title: 'MAINTENANCE TILE 04', text: 'Keep access clear.', ink: ['SERVICE FRAGMENT C', '4 : □'], pos: [3, 0.045, 4.8], floor: true },
  ];
  function texture(lines, hidden) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!hidden) { ctx.fillStyle = '#b2b8ac'; ctx.fillRect(0, 0, 1024, 512); }
    ctx.fillStyle = hidden ? '#f8e0ff' : '#202f36'; ctx.textAlign = 'center';
    if (hidden) { ctx.shadowColor = '#be65ff'; ctx.shadowBlur = 18; }
    ctx.font = 'bold 48px sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, 512, 95 + i * 85));
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }
  function close(resume = true) {
    if (!overlay) return;
    overlay.remove(); overlay = null;
    document.removeEventListener('keydown', keydown, true);
    document.dispatchEvent(new CustomEvent('robot-repair-close', { detail: { resume } }));
  }
  function keydown(event) {
    if (event.code === 'Escape') { event.stopImmediatePropagation(); close(); }
  }
  function openDecoder() {
    if (overlay) return;
    const terminal = createSciFiTerminal({ title: 'UV / CIPHER DECODER', subtitle: 'CORE SYSTEMS / SPECTRAL FIELD ANALYSIS', violet: true });
    overlay = terminal.overlay;
    overlay.addEventListener('keydown', event => event.stopPropagation());
    const panel = terminal.panel;
    const progressLabel = document.createElement('div'); progressLabel.className = 'terminal-progress'; progressLabel.textContent = `SPECTRAL RECORDS ${found.size}/4 // FIVE-LETTER ACCESS WORD`; panel.append(progressLabel);
    for (const clue of clues) {
      const row = document.createElement('p'); row.className = 'terminal-fragment'; row.textContent = found.has(clue.id) ? clue.ink.join(' | ') : `${clue.title}: not recorded`; panel.append(row);
    }
    const input = document.createElement('input'); input.maxLength = 5; input.placeholder = 'ENTER DECODED KEYWORD'; input.setAttribute('aria-label', 'Decoded assembly access word');
    const status = document.createElement('p'); status.setAttribute('role', 'status');
    const button = (label, action) => { const b = document.createElement('button'); b.textContent = label; b.addEventListener('click', action); panel.append(b); return b; };
    panel.append(input, status);
    const decode = button('Decode keyword', () => {
      // If player already knows or decoded RELAY, accept it directly
      clues.forEach(c => found.add(c.id));
      if (input.value.trim().toUpperCase() !== 'RELAY') { status.textContent = 'Incorrect. Translate each symbol, then order the letters by their numbers.'; return; }
      if (!solved) { solved = true; onSolved('RELAY'); }
      status.textContent = 'DECODED: RELAY. Assembly access restored. Talk to the robot to recover the circuit components.';
    });
    input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); decode.click(); } });
    button('Return to room [Esc]', () => close());
    document.body.append(overlay); document.addEventListener('keydown', keydown, true); document.exitPointerLock?.();
  }
  for (const clue of clues) {
    const surface = new THREE.Group(); surface.name = `UV clue ${clue.id}`; surface.position.set(...clue.pos);
    if (clue.floor) surface.rotation.x = -Math.PI / 2; else surface.rotation.y = clue.yaw;
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.85), new THREE.MeshBasicMaterial({ map: texture([clue.title, clue.text], false) }));
    const ink = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.85), new THREE.MeshBasicMaterial({ map: texture(clue.ink, true), transparent: true, depthWrite: false, toneMapped: false }));
    ink.position.z = 0.004; ink.visible = false;
    // A dark backing keeps the ordinary print from competing with glowing writing.
    const backing = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.85), new THREE.MeshBasicMaterial({ color: 0x21142e }));
    backing.position.z = 0.002; backing.visible = false;
    surface.add(paper, backing, ink); group.add(surface);
    if (!clue.floor) {
      const pieces = [];
      for (const y of [-0.465, 0.465]) pieces.push(new THREE.BoxGeometry(1.81, 0.08, 0.045).translate(0, y, 0.012));
      for (const x of [-0.865, 0.865]) pieces.push(new THREE.BoxGeometry(0.85, 0.08, 0.045).rotateZ(Math.PI / 2).translate(x, 0, 0.012));
      const frame = new THREE.Mesh(mergeGeometries(pieces, false), woodMaterial);
      pieces.forEach(geometry => geometry.dispose());
      frame.name = 'Wooden safety-poster frame'; frame.receiveShadow = true;
      surface.add(frame);
    }
    clue.surface = surface; clue.inkMesh = ink; clue.backing = backing;
    Object.assign(surface.userData, { interactable: true, label: clue.title,
      getLabel: () => ink.visible ? clue.id === 'key' ? 'Record cipher key / decode keyword' : 'Record UV fragment' : `Inspect ${clue.title.toLowerCase()}`,
      onInteract: () => {
        if (!enabled()) { hud.setObjective('Find the engineer’s logbook and collect the UV flashlight first.'); return; }
        if (!ink.visible) { hud.setObjective('Ordinary print. Equip the UV flashlight in your backpack, switch it on, and shine it directly at this surface.'); return; }
        found.add(clue.id);
        hud.setObjective(`UV NOTES (${found.size}/4): ${clue.ink.join(' | ')}. Record all fragments, then return to the safety notice to decode the assembly access word.`);
        if (clue.id === 'key') openDecoder();
      },
    });
  }
  return { group, get solved() { return solved; }, get isOpen() { return !!overlay; }, get accessKeyword() { return solved ? 'RELAY' : null; },
    update(camera) {
      const active = enabled() && inventory.hasItem('uv_flashlight') && equipment?.equippedTool === 'uv_flashlight' && equipment.torchOn;
      camera.getWorldDirection(direction);
      for (const clue of clues) {
        clue.surface.getWorldPosition(target); offset.copy(target).sub(camera.position);
        const distance = offset.length();
        const visible = active && distance < 4.5 && offset.normalize().dot(direction) > 0.94;
        clue.inkMesh.visible = visible; clue.backing.visible = visible;
      }
    }, dispose() { close(false); },
  };
}
