import * as THREE from 'three';
import { sound } from './audio.js';

// The hotspots use the button centres in the supplied CC0 keypad's model space.
const BUTTONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
export function createDrawerKeypad({ getModel, correctCode, onUnlock,
  createRenderer = options => new THREE.WebGLRenderer(options) }) {
  let overlay = null, renderer = null, input = '', granted = false;
  let display, status, enter, resize;
  function close(resume = true) {
    if (!overlay) return;
    overlay.remove(); overlay = null;
    window.removeEventListener('keydown', keydown, true);
    window.removeEventListener('resize', resize);
    renderer?.dispose(); renderer?.forceContextLoss(); renderer = null;
    document.dispatchEvent(new CustomEvent('robot-repair-close', { detail: { resume } }));
  }
  function press(key) {
    if (key === 'Escape') { close(); return; }
    if (granted) { if (key === 'Enter' || key === '#') close(); return; }
    if (/^[0-9]$/.test(key) && input.length < 4) {
      input += key; sound.playKeypadBeep(); status.textContent = 'Enter four digits, then press #.';
    } else if (key === '*' || key === 'Backspace' || key === 'Delete') {
      input = key === '*' || key === 'Delete' ? '' : input.slice(0, -1);
      sound.playKeypadBeep();
    } else if (key === '#' || key === 'Enter') {
      if (input === correctCode) {
        granted = true; onUnlock(); display.textContent = 'OPEN';
        display.style.color = '#6dff93'; status.textContent = 'Access granted. Continue to see the drawer open.';
        enter.textContent = 'CONTINUE'; return;
      }
      sound.playDetectionWarning(0.3);
      status.textContent = input.length === 4 ? 'Incorrect code. Check the four stamped logbook entries.' : 'Enter all four digits first.';
      input = '';
    }
    display.textContent = input.padEnd(4, '_');
  }
  function keydown(event) {
    event.preventDefault(); event.stopImmediatePropagation();
    if (!event.repeat) press(event.key);
  }
  function open() {
    if (overlay) return;
    const source = getModel();
    if (!source) return;
    input = ''; granted = false;
    overlay = document.createElement('div'); overlay.id = 'drawer-keypad-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:#02060de8;color:#d2e4e9;font:15px monospace;padding:16px;box-sizing:border-box';
    const panel = document.createElement('section');
    panel.style.cssText = 'display:flex;flex-direction:column;align-items:center;max-height:95vh;overflow:auto;width:min(420px,100%)';
    const title = document.createElement('h2'); title.textContent = 'ENGINEER / DRAWER LOCK'; title.style.cssText = 'font-size:17px;margin:0 0 10px';
    const stage = document.createElement('div');
    stage.style.cssText = 'position:relative;width:min(340px,60vh,100%);aspect-ratio:0.7;flex-shrink:0';
    const canvas = document.createElement('canvas'); canvas.style.cssText = 'display:block;width:100%;height:100%';
    stage.append(canvas);
    const scene = new THREE.Scene();
    const model = source.clone(true);
    model.position.set(0, 0, 0); model.rotation.set(0, 0, 0); model.scale.setScalar(1);
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    model.position.copy(center).negate(); scene.add(model);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x576077, 2.5));
    const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(-5, 8, 15); scene.add(light);
    const height = bounds.getSize(new THREE.Vector3()).y * 1.07;
    const camera = new THREE.OrthographicCamera(-height * 0.7 / 2, height * 0.7 / 2, height / 2, -height / 2, 0.1, 100);
    camera.position.set(0, 0, 30); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
    const position = (element, x, y, width, buttonHeight) => {
      const point = new THREE.Vector3(x - center.x, y - center.y, 2).project(camera);
      element.style.position = 'absolute'; element.style.left = `${(point.x + 1) * 50}%`; element.style.top = `${(1 - point.y) * 50}%`;
      element.style.width = `${width / (height * 0.7) * 100}%`; element.style.height = `${buttonHeight / height * 100}%`;
      element.style.transform = 'translate(-50%,-50%)';
    };
    for (let i = 0; i < BUTTONS.length; i++) {
      const key = BUTTONS[i]; const button = document.createElement('button');
      button.setAttribute('aria-label', key === '*' ? 'Clear code' : key === '#' ? 'Submit code' : `Digit ${key}`);
      button.title = key === '*' ? 'Clear' : key === '#' ? 'Enter' : key;
      button.style.cssText = 'background:transparent;border:1px solid transparent;border-radius:3px;cursor:pointer;color:transparent';
      button.addEventListener('mouseenter', () => { button.style.background = '#9ce4ff35'; button.style.borderColor = '#d8f4ff'; });
      button.addEventListener('mouseleave', () => { button.style.background = 'transparent'; button.style.borderColor = 'transparent'; });
      button.addEventListener('click', () => press(key));
      position(button, (i % 3 - 1) * 1.82225, 2.2129 - Math.floor(i / 3) * 1.86496, 1.5, 1.5);
      stage.append(button);
    }
    display = document.createElement('div'); display.textContent = '____'; display.setAttribute('aria-label', 'Drawer code display'); display.setAttribute('role', 'status');
    display.style.cssText = 'padding:8px 24px;margin-bottom:8px;background:#08100ded;color:#68ef8c;font:bold 24px monospace;letter-spacing:6px;pointer-events:none;border:1px solid #394b41';
    status = document.createElement('p'); status.textContent = 'Enter the stamped code. * clears; # submits. Keyboard supported.'; status.setAttribute('role', 'status'); status.style.cssText = 'min-height:40px;text-align:center;margin:10px 0';
    const controls = document.createElement('div');
    enter = document.createElement('button'); enter.textContent = 'ENTER'; enter.addEventListener('click', () => press('Enter'));
    const exit = document.createElement('button'); exit.textContent = 'Return to room [Esc]'; exit.addEventListener('click', () => close());
    for (const button of [enter, exit]) button.style.cssText = 'padding:12px;margin:4px;background:#24333b;border:1px solid #71909d;color:#eefaff;cursor:pointer;font:inherit';
    controls.append(enter, exit); panel.append(title, display, stage, status, controls); overlay.append(panel); document.body.append(overlay);
    try {
      renderer = createRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      resize = () => { const rect = stage.getBoundingClientRect(); renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false); renderer.render(scene, camera); };
      resize();
    } catch (error) { close(false); throw error; }
    // Render on open and resize only; no additional animation loop during play.
    window.addEventListener('resize', resize); window.addEventListener('keydown', keydown, true);
    document.exitPointerLock?.();
  }
  return { open, get isOpen() { return !!overlay; }, dispose() { close(false); } };
}
