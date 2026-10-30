export function createSciFiTerminal({ title, subtitle, violet = false }) {
  const overlay = document.createElement('div');
  overlay.className = `facility-terminal${violet ? ' facility-terminal--violet' : ''}`;
  const style = document.createElement('style');
  style.textContent = `
    .facility-terminal{--accent:#68e2ef;--soft:#16333f;--tint:#10313a;position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:radial-gradient(ellipse at 50% 40%,#102534eb,#01050bf5);color:#dbe8ef;font:15px/1.65 'Consolas',monospace}
    .facility-terminal--violet{--accent:#c5a4ff;--soft:#34254c;--tint:#241d38}
    .facility-terminal *{box-sizing:border-box}
    .facility-terminal__shell{position:relative;width:min(760px,100%);max-height:92vh;padding:10px;background:linear-gradient(135deg,#34434e,#101a24 28%,#0c151e 75%,#2b3c49);border:1px solid #506374;border-radius:14px;box-shadow:0 28px 90px #000c,inset 0 1px #b9d6e522}
    .facility-terminal__shell:before{content:'';position:absolute;top:-1px;left:32px;width:90px;height:3px;border-radius:3px;background:var(--accent);box-shadow:0 0 18px var(--accent);pointer-events:none}
    .facility-terminal__screen{max-height:calc(92vh - 22px);overflow:auto;padding:26px 30px;background:radial-gradient(ellipse at top right,var(--tint),#080f18 65%);border:1px solid #34434f;border-radius:8px;scrollbar-color:var(--accent) #09121a}
    .facility-terminal__serial{display:flex;align-items:center;justify-content:space-between;gap:16px;color:#8ca4b5;font-size:10px;letter-spacing:2px;border-bottom:1px solid #30404c;padding-bottom:16px}
    .facility-terminal__link{color:var(--accent);white-space:nowrap;letter-spacing:1px}
    .facility-terminal h2{font:600 clamp(22px,3vw,32px)/1.2 system-ui,sans-serif;letter-spacing:-.6px;color:#f2f7fb;margin:24px 0 9px}
    .facility-terminal__subtitle{margin:0 0 24px;color:#8b9eaf;font-size:11px;letter-spacing:1px}
    .facility-terminal p{overflow-wrap:anywhere}
    .facility-terminal .terminal-prompt{padding:22px;border:1px solid #344654;border-left:3px solid var(--accent);border-radius:6px;background:#07101bc9;margin:14px 0 22px;font:18px/1.65 system-ui,sans-serif;color:#edf3f8}
    .facility-terminal .terminal-fragment{padding:12px 16px;border:1px solid #34404f;border-radius:5px;background:#09111db3;margin:8px 0;font-size:13px;line-height:1.9}
    .facility-terminal .terminal-progress{display:block;padding:9px 12px;color:var(--accent);background:var(--soft);border-radius:4px;letter-spacing:1px;font-size:11px;margin-bottom:14px}
    .facility-terminal input{width:100%;min-height:54px;padding:14px 16px;background:#050b12;color:#f4f8fc;border:1px solid #506174;border-radius:5px;font:18px 'Consolas',monospace;letter-spacing:1px;outline:none}
    .facility-terminal input::placeholder{color:#7a8c9e;font-size:14px;letter-spacing:.5px}
    .facility-terminal input:focus{box-shadow:0 0 0 3px var(--soft);border-color:var(--accent)}
    .facility-terminal input:disabled{opacity:.5}
    .facility-terminal button{padding:12px 20px;margin:6px 10px 6px 0;background:var(--accent);border:1px solid var(--accent);border-radius:5px;color:#07121b;font:600 13px system-ui,sans-serif;cursor:pointer;min-height:44px}
    .facility-terminal button+button{background:transparent;border-color:#4a5d6e;color:#c2d1df}
    .facility-terminal button:hover{filter:brightness(1.15)}
    .facility-terminal button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
    .facility-terminal button:disabled{opacity:.4;cursor:default}
    .facility-terminal [role=status]{color:var(--accent);min-height:24px;font-size:13px;margin:14px 0}
    .facility-terminal__footer{display:flex;justify-content:space-between;gap:12px;margin-top:24px;border-top:1px solid #30404c;padding-top:14px;color:#788e9f;font-size:10px;letter-spacing:1px}
    @media(max-width:600px){.facility-terminal{padding:10px}.facility-terminal__shell{padding:6px}.facility-terminal__screen{padding:20px 16px}.facility-terminal__serial{font-size:9px;letter-spacing:1px}.facility-terminal .terminal-prompt{padding:16px;font-size:16px}.facility-terminal__footer{letter-spacing:0}}
  `;
  const shell = document.createElement('section'); shell.className = 'facility-terminal__shell';
  const panel = document.createElement('div'); panel.className = 'facility-terminal__screen';
  const serial = document.createElement('div'); serial.className = 'facility-terminal__serial';
  const brand = document.createElement('span'); brand.textContent = 'BLACKOUT / FACILITY SYSTEMS';
  const link = document.createElement('span'); link.className = 'facility-terminal__link'; link.textContent = '\u25cf LOCAL LINK';
  serial.append(brand, link);
  const heading = document.createElement('h2'); heading.textContent = title;
  const description = document.createElement('p'); description.className = 'facility-terminal__subtitle'; description.textContent = subtitle;
  const content = document.createElement('div');
  const footer = document.createElement('div'); footer.className = 'facility-terminal__footer'; footer.textContent = 'MANUAL ACCESS TERMINAL / ESC TO DISCONNECT';
  panel.append(serial, heading, description, content, footer); shell.append(panel); overlay.append(style, shell);
  return { overlay, panel: content };
}
