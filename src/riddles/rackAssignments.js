export const STARRED_LOCKER = 'TX-03';
export const CROWBAR_LOCKER_LABEL = 'TX-03';

// Deliberately mundane equipment register. The inference chain is:
// sticky note -> "Tools signed to TX-03" -> register shows TX-03 = tool loan
// out to M. Chen. Nothing on this sheet names a crowbar directly.
export const RACK_ASSIGNMENTS = [
  { name: 'TX-01', contents: 'RAIL SPARES (24)',    starred: false, holder: 'DEPOT' },
  { name: 'TX-02', contents: 'HV FUSES 10A/20A',    starred: false, holder: 'DEPOT' },
  { name: 'TX-03', contents: 'TOOL LOAN',           starred: true,  holder: 'M. CHEN' },
  { name: 'TX-04', contents: 'CABLE LUGS & CRIMPS', starred: false, holder: 'DEPOT' },
  { name: 'DB-7',  contents: 'SEAL KIT & GASKETS',  starred: false, holder: 'DEPOT' },
];

export function showAssignmentBoard() {
  if (document.getElementById('assignment-overlay')) return;
  if (document.pointerLockElement) document.exitPointerLock();

  const overlay = document.createElement('div');
  overlay.id = 'assignment-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0',
    backgroundColor: 'rgba(5, 10, 15, 0.88)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: '10002', userSelect: 'none', fontFamily: 'monospace',
  });

  const sheet = document.createElement('div');
  Object.assign(sheet.style, {
    width: '520px', maxWidth: 'calc(100vw - 64px)', padding: '26px 30px',
    background: 'linear-gradient(180deg, #e8e2c8 0%, #d9d2b0 100%)',
    color: '#2a2620', fontSize: '15px', lineHeight: '1.5',
    border: '4px solid #3a3428', borderRadius: '3px',
    boxShadow: '0 22px 70px rgba(0,0,0,0.9)',
  });

  const head = document.createElement('div');
  head.innerText = 'EQUIPMENT REGISTER';
  Object.assign(head.style, {
    fontWeight: 'bold', fontSize: '17px', letterSpacing: '1px',
    borderBottom: '2px solid #7a6c48', paddingBottom: '8px',
    marginBottom: '6px',
  });
  sheet.appendChild(head);

  const sub = document.createElement('div');
  sub.innerText = 'Week 43 — M. Chen, updated Mon. ★ = priority loan';
  Object.assign(sub.style, {
    fontStyle: 'italic', fontSize: '12px', color: '#6b5e44',
    marginBottom: '16px',
  });
  sheet.appendChild(sub);

  const table = document.createElement('table');
  Object.assign(table.style, { width: '100%', borderCollapse: 'collapse', fontSize: '14px' });

  const tHead = document.createElement('tr');
  for (const label of ['RACK', 'CONTENTS', 'HOLDER']) {
    const th = document.createElement('th');
    th.innerText = label;
    Object.assign(th.style, {
      textAlign: 'left', borderBottom: '1px solid #7a6c48',
      padding: '6px 8px', fontSize: '11px', letterSpacing: '1px',
    });
    tHead.appendChild(th);
  }
  table.appendChild(tHead);

  for (const row of RACK_ASSIGNMENTS) {
    const tr = document.createElement('tr');
    if (row.starred) Object.assign(tr.style, { background: 'rgba(200,170,40,0.22)' });

    const tdName = document.createElement('td');
    tdName.innerText = row.starred ? `★ ${row.name}` : row.name;
    Object.assign(tdName.style, {
      padding: '6px 8px', borderBottom: '1px dotted #a89c78',
      color: row.starred ? '#7a1c10' : '#2a2620',
      fontWeight: row.starred ? 'bold' : 'normal',
    });

    const tdContents = document.createElement('td');
    tdContents.innerText = row.contents;
    Object.assign(tdContents.style, {
      padding: '6px 8px', borderBottom: '1px dotted #a89c78',
    });

    const tdHolder = document.createElement('td');
    tdHolder.innerText = row.holder || '—';
    Object.assign(tdHolder.style, {
      padding: '6px 8px', borderBottom: '1px dotted #a89c78',
      color: row.holder === 'M. CHEN' ? '#7a1c10' : '#464137',
      fontWeight: row.holder === 'M. CHEN' ? 'bold' : 'normal',
    });

    tr.appendChild(tdName);
    tr.appendChild(tdContents);
    tr.appendChild(tdHolder);
    table.appendChild(tr);
  }
  sheet.appendChild(table);

  const note = document.createElement('div');
  note.innerText = 'Items returned by end of shift. Report damage to the supervisor.';
  Object.assign(note.style, {
    marginTop: '14px', fontStyle: 'italic', fontSize: '11px',
    color: '#6b5e44',
  });
  sheet.appendChild(note);

  const hint = document.createElement('div');
  hint.innerText = 'Click outside or press Escape to close';
  Object.assign(hint.style, {
    marginTop: '10px', fontSize: '11px', textAlign: 'right',
    color: '#8a7c5e',
  });
  sheet.appendChild(hint);

  overlay.appendChild(sheet);
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