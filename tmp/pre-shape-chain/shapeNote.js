// The answer to the green tool case's three-dial padlock.
// puzzleItems.js owns SHAPE_NAMES (the alphabet the dials cycle through);
// this module owns the ORDER, and both the 3D clue note and this overlay are
// drawn from it so the note can never disagree with the lock.
export const SHAPE_COMBO = ['triangle', 'circle', 'square'];

const ITEMS = ['spanner set', 'torque kit', 'cutter tray'];

const GLYPH_SVG = {
  square: '<rect x="4" y="4" width="30" height="30"></rect>',
  triangle: '<polygon points="19,3 35,33 3,33"></polygon>',
  circle: '<circle cx="19" cy="19" r="15"></circle>',
};

function glyph(shape, size = 38) {
  const el = document.createElement('span');
  el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 38 38"
      fill="none" stroke="#26568c" stroke-width="4" stroke-linejoin="round">${GLYPH_SVG[shape]}</svg>`;
  return el.firstChild;
}

export function showShapeNote() {
  if (document.getElementById('shape-note-overlay')) return;
  if (document.pointerLockElement) document.exitPointerLock();

  const overlay = document.createElement('div');
  overlay.id = 'shape-note-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0',
    backgroundColor: 'rgba(5, 10, 15, 0.85)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: '10002', userSelect: 'none', fontFamily: 'monospace',
  });

  const card = document.createElement('div');
  Object.assign(card.style, {
    width: '360px', maxWidth: 'calc(100vw - 48px)', padding: '26px 26px 22px',
    background: 'linear-gradient(180deg, #e4dcbc 0%, #d5cca8 100%)',
    color: '#2f2a1e', fontSize: '14px', lineHeight: '1.6',
    border: '3px solid #3a3428',
    boxShadow: '0 22px 60px rgba(0,0,0,0.85)',
    transform: 'rotate(-1.4deg)',
    position: 'relative',
  });

  const tape = document.createElement('div');
  Object.assign(tape.style, {
    position: 'absolute', top: '-14px', left: '50%',
    transform: 'translateX(-50%) rotate(-3deg)',
    width: '92px', height: '26px',
    background: 'rgba(220,220,200,0.55)',
    border: '1px solid rgba(150,150,130,0.4)',
  });
  card.appendChild(tape);

  const title = document.createElement('div');
  title.innerText = 'CASE 12 \u2014 COMBO';
  Object.assign(title.style, {
    fontWeight: 'bold', fontSize: '15px', letterSpacing: '1px',
    borderBottom: '2px solid rgba(90,70,30,0.4)',
    paddingBottom: '8px', marginBottom: '12px',
  });
  card.appendChild(title);

  const intro = document.createElement('div');
  intro.innerText = 'Someone reset the case tag again after Thursday. '
    + 'Marks run 1-2-3 and the dials read LEFT to RIGHT:';
  Object.assign(intro.style, { fontStyle: 'italic', marginBottom: '14px' });
  card.appendChild(intro);

  SHAPE_COMBO.forEach((shape, i) => {
    const row = document.createElement('div');
    Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' });

    const num = document.createElement('span');
    num.innerText = `${i + 1}.`;
    Object.assign(num.style, { width: '22px', fontWeight: 'bold' });

    const item = document.createElement('span');
    item.innerText = ITEMS[i];
    Object.assign(item.style, { color: '#5b5340', fontStyle: 'italic' });

    row.appendChild(num); row.appendChild(glyph(shape)); row.appendChild(item);
    card.appendChild(row);
  });

  const foot = document.createElement('div');
  foot.innerText = 'Do NOT shuffle them.   \u2014 M.C.';
  Object.assign(foot.style, {
    marginTop: '16px', paddingTop: '10px',
    borderTop: '1px solid rgba(90,70,30,0.35)',
    fontStyle: 'italic', textAlign: 'right', fontSize: '13px',
  });
  card.appendChild(foot);

  const hint = document.createElement('div');
  hint.innerText = 'Click outside or press Escape to close';
  Object.assign(hint.style, { marginTop: '12px', fontSize: '11px', color: '#7a6a34', textAlign: 'right' });
  card.appendChild(hint);

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const close = (e) => {
    if (e.type === 'click' && e.target !== overlay) return;
    if (e.type === 'keydown' && e.key !== 'Escape') return;
    overlay.remove();
    window.removeEventListener('keydown', close);
  };
  overlay.addEventListener('click', close);
  window.addEventListener('keydown', close);
}
