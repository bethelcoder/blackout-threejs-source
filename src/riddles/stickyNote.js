export const STICKY_NOTE = {
  title: 'MAINTENANCE TAG — TERMINAL 04',
  lines: [
    'TX-CORE pulled for ESD test 06/11,',
    'came back FAILED. Spares in the',
    'Thursday delivery, still crated.',
    '',
    'Bay cover removed — do NOT power',
    'up until module refitted.',
    '',
    '— M. Chen',
  ],
};

export function showStickyNote() {
  if (document.getElementById('sticky-note-overlay')) return;
  if (document.pointerLockElement) document.exitPointerLock();

  const overlay = document.createElement('div');
  overlay.id = 'sticky-note-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0',
    backgroundColor: 'rgba(5, 10, 15, 0.85)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: '10002', userSelect: 'none', fontFamily: 'monospace',
  });

  const note = document.createElement('div');
  Object.assign(note.style, {
    width: '320px', padding: '26px 24px',
    background: 'linear-gradient(180deg, #f5e88a 0%, #ecd66a 100%)',
    color: '#2a2418', fontSize: '14px', lineHeight: '1.6',
    boxShadow: '0 22px 60px rgba(0,0,0,0.85), inset 0 0 0 1px #c9b74a',
    transform: 'rotate(-1.2deg)',
    borderBottom: '6px solid #d9c96a',
    position: 'relative',
  });

  const tape = document.createElement('div');
  Object.assign(tape.style, {
    position: 'absolute', top: '-14px', left: '50%',
    transform: 'translateX(-50%) rotate(-3deg)',
    width: '90px', height: '26px',
    background: 'rgba(220,220,200,0.55)',
    border: '1px solid rgba(150,150,130,0.4)',
  });
  note.appendChild(tape);

  const title = document.createElement('div');
  title.innerText = STICKY_NOTE.title;
  Object.assign(title.style, {
    fontWeight: 'bold', fontSize: '13px', letterSpacing: '1px',
    borderBottom: '1px solid rgba(90,70,30,0.4)',
    paddingBottom: '8px', marginBottom: '12px',
  });
  note.appendChild(title);

  const body = document.createElement('pre');
  body.innerText = STICKY_NOTE.lines.join('\n');
  Object.assign(body.style, {
    margin: '0', whiteSpace: 'pre-wrap', fontFamily: 'monospace',
    fontSize: '13px', lineHeight: '1.55',
  });
  note.appendChild(body);

  const hint = document.createElement('div');
  hint.innerText = 'Click outside or press Escape to close';
  Object.assign(hint.style, {
    marginTop: '14px', fontSize: '11px',
    color: '#7a6a34', textAlign: 'right', fontStyle: 'italic',
  });
  note.appendChild(hint);

  overlay.appendChild(note);
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