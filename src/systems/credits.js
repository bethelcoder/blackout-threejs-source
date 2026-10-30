// Every external resource and architectural component used in the game is listed here, per the
// CGV brief: "everything you did not make yourself is acknowledged in the
// credits screen inside your game: what it is, where it came from, and its
// licence where one applies."

export const CREDITS = [
  { what: 'Earth globe hologram - Level 3 (converted, cyan projection and custom rotation)', from: 'IZ.MdVerz - https://sketchfab.com/3d-models/earth-globe-hologram-2mb-looping-animation-37cac2803bbd4e9cad150a772215c343', licence: 'CC BY 4.0' },
  { what: 'Wooden Crates - Level 3 (converted and scaled)', from: 'RudiH - https://sketchfab.com/3d-models/wooden-crates-89a193b33bdb4a5597a6b5ea0b08739d', licence: 'Sketchfab Standard' },
  { what: 'Computer Desk - Level 3 left wall (converted, textures resized and scaled)', from: 'draakon_4d - https://sketchfab.com/3d-models/computer-desk-98c5bd86d7bb4ca98dbc26dabb5e7196', licence: 'CC BY 4.0' },
  { what: 'Personal Computer - on left-wall desk (converted, textures resized and scaled)', from: 'CommunicationNode - https://sketchfab.com/3d-models/personal-computer-aa398650fe6e4baa8771c71266d842f4', licence: 'CC BY-SA 4.0' },
  { what: 'Super computer - Level 3 right wall (converted and scaled)', from: 'ARComputerFundamentals - https://sketchfab.com/3d-models/super-computer-c7626bef858b44cea1c12851e7d8956f', licence: 'CC BY 4.0' },
  { what: 'Column - Level 3 corners (converted and scaled)', from: 'Ted Mebratu - https://sketchfab.com/3d-models/column-100b0055fc554285bb52b574cf45f2fd', licence: 'CC BY 4.0' },
  { what: 'Ceiling lowpoly fluorescent lamps with diffuser (lit fixture converted and mounted)', from: 'Metallerz - https://sketchfab.com/3d-models/ceiling-lowpoly-fluorescent-lamps-with-diffuser-95cdcff49c484b66a966269d84143615', licence: 'Sketchfab Standard' },
  { what: 'Office Ceiling Tiles - Level 3 (converted, fitted and trimmed)', from: 'joaoantoniolucon2 - https://sketchfab.com/3d-models/office-ceiling-tiles-c89b6a06ac884271816791af6d28c5ec', licence: 'CC BY 4.0' },
  { what: 'Module XB1101 - central AI platform (corridor and purple hologram removed)', from: 'KainHunter1997 - https://sketchfab.com/3d-models/module-xb1101-sci-fi-corridor-halo-inspired-5c66489569294dac93215877dcda0b83', licence: 'CC BY 4.0' },
  { what: 'door door metal (converted and scaled from USDZ)', from: 'ahmagh2e - https://sketchfab.com/3d-models/door-door-metal-b21ec273c1a342568ab9f9ac14291c5b', licence: 'CC BY 4.0' },
  { what: 'Metal Door 2 (converted and scaled from USDZ)', from: 'tboiston - https://sketchfab.com/3d-models/metal-door-2-4da6b538427244aaababe36d3e228a40', licence: 'CC BY 4.0' },
  { what: 'Metal Storage Cabinet (converted and scaled from USDZ)', from: 'jimbogies - https://sketchfab.com/3d-models/metal-storage-cabinet-4d49691a269745cabe0e1d5c1c3bef9b', licence: 'CC BY 4.0' },
  { what: 'Electric Box (converted and scaled from USDZ)', from: 'Payam Tavakoli - https://sketchfab.com/3d-models/electric-box-fe0c923107b545dfac7e65062701feef', licence: 'CC BY 4.0' },
  { what: 'Light Switch (converted and scaled from USDZ)', from: 'Avot - https://sketchfab.com/3d-models/light-switch-808c3de4dd874fc1b67ff15cd2645555', licence: 'CC BY 4.0' },
  { what: 'Rusty Metal 04 - maintenance structures (1K colour, OpenGL normal, roughness)', from: 'Poly Haven - https://polyhaven.com/a/rusty_metal_04', licence: 'CC0' },
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
