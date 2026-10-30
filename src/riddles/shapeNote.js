// The padlock's answer. SHAPE_NAMES (the dial alphabet: square, triangle,
// circle) lives in puzzleItems.js; SHAPE_COMBO lives here and drives both the
// 3D clue texture and the fullscreen padlock UI, so the note and the lock can
// never disagree.
//
// The note is a riddle by T. Mokoena. It points at three things a player can
// find on the substation walls, in the order they appear left to right:
//   1. the triangular warning sign on the HV doors  -> triangle
//   2. the round pressure gauge                     -> circle
//   3. the rectangular face of a fuse compartment   -> square
export const SHAPE_COMBO = ['triangle', 'circle', 'square'];

export const SHAPE_NOTE_LINES = [
  'Forgot the damn code again.',
  '',
  'Think of the warning sign on',
  'the high-voltage door.',
  '',
  'Then check the shape of the',
  'gauge.',
  '',
  'Last comes the outline of the',
  'fuse compartment.',
  '',
  'Same order as you see them on',
  'the wall. Don\u2019t overthink it.',
  '',
  '\u2014 T. Mokoena, night shift',
];

const GLYPH_SVG = {
  square: '<rect x="5" y="5" width="28" height="28"></rect>',
  triangle: '<polygon points="19,4 34,32 4,32"></polygon>',
  circle: '<circle cx="19" cy="19" r="14"></circle>',
};

const SHAPES = ['square', 'triangle', 'circle'];

function glyph(shape, size = 38, stroke = '#26568c') {
  const el = document.createElement('span');
  el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 38 38"
      fill="none" stroke="${stroke}" stroke-width="3.5" stroke-linejoin="round">${GLYPH_SVG[shape]}</svg>`;
  return el.firstChild;
}

// ---------------------------------------------------------------------------
// Plain note overlay. Shown when the player clicks the case 12 tag pinned to
// the notice board.
// ---------------------------------------------------------------------------
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
    width: '380px', maxWidth: 'calc(100vw - 48px)', padding: '26px 26px 22px',
    background: 'linear-gradient(180deg, #e4dcbc 0%, #d5cca8 100%)',
    color: '#2f2a1e', fontSize: '14px', lineHeight: '1.6',
    border: '3px solid #3a3428',
    boxShadow: '0 22px 60px rgba(0,0,0,0.85)',
    transform: 'rotate(-1.4deg)', position: 'relative',
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

  const body = document.createElement('pre');
  body.innerText = SHAPE_NOTE_LINES.join('\n');
  Object.assign(body.style, {
    margin: '0', whiteSpace: 'pre-wrap', fontFamily: 'inherit',
    fontSize: '13px', lineHeight: '1.6',
  });
  card.appendChild(body);

  const hint = document.createElement('div');
  hint.innerText = 'Click outside or press Escape to close';
  Object.assign(hint.style, {
    marginTop: '12px', fontSize: '11px', color: '#7a6a34',
    textAlign: 'right', fontStyle: 'italic',
  });
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

// ---------------------------------------------------------------------------
// Fullscreen combination padlock UI. Opens when the player clicks the padlock
// on the green tool case. Each dial cycles through square / triangle / circle;
// TRY CODE compares the guess against SHAPE_COMBO.
//
//   initial   [i, i, i]  -- starting dial indices (mirror of the 3D state)
//   onChange  fn(indices) -- fired on every dial turn so the 3D padlock can
//                            follow along
//   onResult  fn(solved)  -- called once when the UI closes; solved is true
//                            only if the guess matched SHAPE_COMBO
// ---------------------------------------------------------------------------
export function showShapePadlock({ onResult, onChange, initial = [0, 0, 0] } = {}) {
  if (document.getElementById('shape-padlock-overlay')) return;
  if (document.pointerLockElement) document.exitPointerLock();

  const dials = [0, 1, 2].map((i) => ((initial[i] ?? 0) % 3 + 3) % 3);
  let finished = false;

  const overlay = document.createElement('div');
  overlay.id = 'shape-padlock-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0',
    backgroundColor: 'rgba(3, 6, 10, 0.94)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: '10002', userSelect: 'none', fontFamily: 'monospace',
  });

  const card = document.createElement('div');
  Object.assign(card.style, {
    width: '520px', maxWidth: 'calc(100vw - 48px)',
    padding: '28px 32px 22px',
    background: 'linear-gradient(180deg, #3a2c14 0%, #1a1208 100%)',
    color: '#e8d9a8', border: '3px solid #8a6a1c',
    borderRadius: '8px',
    boxShadow: '0 22px 60px rgba(0,0,0,0.9), inset 0 0 60px rgba(180,140,40,0.15)',
  });

  const title = document.createElement('div');
  title.innerText = 'MERIDIAN SHAPE PADLOCK';
  Object.assign(title.style, {
    textAlign: 'center', fontSize: '17px', fontWeight: 'bold',
    letterSpacing: '3px', color: '#d4a020',
    borderBottom: '2px solid #6a5020',
    paddingBottom: '10px', marginBottom: '6px',
  });
  card.appendChild(title);

  const sub = document.createElement('div');
  sub.innerText = 'CASE 12 \u2014 three dials, left to right';
  Object.assign(sub.style, {
    textAlign: 'center', fontSize: '12px', color: '#a89060',
    fontStyle: 'italic', marginBottom: '24px',
  });
  card.appendChild(sub);

  const dialRow = document.createElement('div');
  Object.assign(dialRow.style, {
    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
    marginBottom: '18px',
  });

  const dialEls = [];
  const buttonStyle = {
    width: '60px', height: '38px', fontSize: '18px', cursor: 'pointer',
    background: '#3a2e1a', color: '#d4a020', border: '1px solid #8a6a1c',
    borderRadius: '4px', fontFamily: 'monospace', lineHeight: '1',
  };

  for (let i = 0; i < 3; i++) {
    const col = document.createElement('div');
    Object.assign(col.style, {
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
    });

    const upBtn = document.createElement('button');
    upBtn.innerText = '\u25b2';
    Object.assign(upBtn.style, buttonStyle);

    const display = document.createElement('div');
    Object.assign(display.style, {
      width: '88px', height: '88px', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#0e0a04', border: '2px solid #8a6a1c', borderRadius: '6px',
      boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)',
    });

    const downBtn = document.createElement('button');
    downBtn.innerText = '\u25bc';
    Object.assign(downBtn.style, buttonStyle);

    col.appendChild(upBtn);
    col.appendChild(display);
    col.appendChild(downBtn);
    dialRow.appendChild(col);
    dialEls.push({ display });

    const change = (delta) => {
      dials[i] = ((dials[i] + delta) % 3 + 3) % 3;
      renderDial(i);
      onChange?.([...dials]);
    };
    upBtn.addEventListener('click', () => change(1));
    downBtn.addEventListener('click', () => change(-1));
  }
  card.appendChild(dialRow);

  function renderDial(i) {
    const d = dialEls[i].display;
    d.innerHTML = '';
    d.appendChild(glyph(SHAPES[dials[i]], 56, '#f0ebd8'));
  }
  for (let i = 0; i < 3; i++) renderDial(i);

  const status = document.createElement('div');
  Object.assign(status.style, {
    textAlign: 'center', marginTop: '6px', fontSize: '13px',
    minHeight: '20px', fontWeight: 'bold', letterSpacing: '1px',
  });
  card.appendChild(status);

  const btnRow = document.createElement('div');
  Object.assign(btnRow.style, {
    display: 'flex', gap: '14px', justifyContent: 'center', marginTop: '14px',
  });

  const tryBtn = document.createElement('button');
  tryBtn.innerText = 'TRY CODE';
  Object.assign(tryBtn.style, {
    padding: '12px 32px', fontSize: '14px', cursor: 'pointer',
    background: '#8a6a1c', color: '#1a1208', border: '1px solid #d4a020',
    borderRadius: '4px', fontFamily: 'monospace', fontWeight: 'bold',
    letterSpacing: '2px',
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.innerText = 'CANCEL';
  Object.assign(cancelBtn.style, {
    padding: '12px 32px', fontSize: '14px', cursor: 'pointer',
    background: '#2a1e10', color: '#a89060', border: '1px solid #6a5020',
    borderRadius: '4px', fontFamily: 'monospace', letterSpacing: '2px',
  });

  btnRow.appendChild(tryBtn);
  btnRow.appendChild(cancelBtn);
  card.appendChild(btnRow);

  const hint = document.createElement('div');
  hint.innerText = 'Click outside or press Escape to close';
  Object.assign(hint.style, {
    marginTop: '16px', fontSize: '11px', color: '#6a5020',
    textAlign: 'right', fontStyle: 'italic',
  });
  card.appendChild(hint);

  tryBtn.addEventListener('click', () => {
    if (finished) return;
    const guess = dials.map((d) => SHAPES[d]);
    const correct = guess.every((s, i) => s === SHAPE_COMBO[i]);
    if (correct) {
      status.innerText = '\u2713 SHACKLE RELEASED';
      status.style.color = '#46e06a';
      tryBtn.disabled = true;
      cancelBtn.disabled = true;
      setTimeout(() => finish(true), 700);
    } else {
      status.innerText = '\u2717 NOTHING MOVED';
      status.style.color = '#e85040';
      card.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' },
         { transform: 'translateX(10px)' }, { transform: 'translateX(-5px)' },
         { transform: 'translateX(0)' }],
        { duration: 260, easing: 'ease-out' }
      );
    }
  });
  cancelBtn.addEventListener('click', () => finish(false));

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  function finish(success) {
    if (finished) return;
    finished = true;
    overlay.remove();
    window.removeEventListener('keydown', onKey);
    onResult?.(success);
  }

  const onKey = (e) => { if (e.key === 'Escape') finish(false); };
  window.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(false); });
}