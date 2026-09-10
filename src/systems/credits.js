// Every external resource and architectural component used in the game is listed here, per the
// CGV brief: "everything you did not make yourself is acknowledged in the
// credits screen inside your game: what it is, where it came from, and its
// licence where one applies."

export const CREDITS = [
  { what: 'Three.js 3D WebGL Library', from: 'threejs.org', licence: 'MIT' },
  { what: 'PointerLockControls', from: 'three/examples/jsm/controls/PointerLockControls.js', licence: 'MIT' },
  { what: 'Web Audio API Procedural Synthesizer', from: 'Self-authored procedural synthesis engine', licence: 'Original / MIT' },
  { what: 'Procedural PBR Textures (Bump & Roughness Maps)', from: 'HTML5 Canvas dynamic procedural texture generator', licence: 'Original / MIT' },
  { what: 'Custom GLSL Shader (electricCorruption)', from: 'Custom vertex displacement & procedural vein fragment shader', licence: 'Original / MIT' },
  { what: 'Game Concept & Story Brief (BLACKOUT)', from: 'COMS3006A/COMS3025A Course Materials', licence: 'Wits University' },
];

export function renderCredits(listEl) {
  listEl.innerHTML = '';
  for (const c of CREDITS) {
    const li = document.createElement('li');
    li.innerHTML = `<b>${c.what}</b><br><span style="color:#7fa0b5">${c.from}</span> &middot; <span style="color:#4fd1ff">${c.licence}</span>`;
    listEl.appendChild(li);
  }
}
