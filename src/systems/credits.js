// Every external resource used in the game must be listed here, per the
// CGV brief: "everything you did not make yourself is acknowledged in the
// credits screen inside your game: what it is, where it came from, and its
// licence where one applies."
//
// Add an entry every time you drop in a texture, model, sound, font,
// tutorial-derived code snippet, or library beyond what's already listed.
export const CREDITS = [
  { what: 'Three.js', from: 'threejs.org', licence: 'MIT' },
  { what: 'PointerLockControls (three/examples)', from: 'Three.js examples', licence: 'MIT' },
  // { what: 'Rusty metal texture', from: 'polyhaven.com/a/rusty_metal_02', licence: 'CC0' },
  // { what: 'Substation hum ambience', from: 'freesound.org/...', licence: 'CC-BY 4.0' },
];

export function renderCredits(listEl) {
  listEl.innerHTML = '';
  for (const c of CREDITS) {
    const li = document.createElement('li');
    li.innerHTML = `<b>${c.what}</b><br>${c.from} &middot; ${c.licence}`;
    listEl.appendChild(li);
  }
}
