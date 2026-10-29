// Directions: north, east, south, west. Each tile carries one unbranched wire.
const steps = [[0,-1],[1,0],[0,1],[-1,0]];
export const CIRCUIT_PATH = [12,13,9,8,4,5,6,10,11,7,3];
const direction = (from,to) => steps.findIndex(([x,y]) => from%4+x===to%4 && Math.floor(from/4)+y===Math.floor(to/4));
export const ports = tile => tile.ports.map(p=>(p+tile.rotation)%4);
export function buildCircuitTiles(random = Math.random) {
  const locked = new Set([0,1,14,15]);
  const tiles = Array.from({length:16},(_,i)=>({ ports: i%3 ? [0,1] : [0,2], rotation:Math.floor(random()*4), locked:locked.has(i), relay:0, delta:0 }));
  CIRCUIT_PATH.forEach((id,i)=>{
    const prev = i ? direction(id,CIRCUIT_PATH[i-1]) : 3;
    const next = i<CIRCUIT_PATH.length-1 ? direction(id,CIRCUIT_PATH[i+1]) : 0;
    tiles[id]={ports:[prev,next],rotation:Math.floor(random()*4),locked:false,relay:0,delta:0};
  });
  for (const [id,relay,delta] of [[13,1,3],[4,2,-2],[6,3,1]]) Object.assign(tiles[id],{relay,delta});
  // Optional modifiers create tempting routes that do not meet the shutdown requirements.
  tiles[2].delta=-3;
  tiles[12].rotation=0;tiles[12].locked=true;
  tiles[3].rotation=0;tiles[3].locked=true;
  if(evaluateCircuit(tiles).solved)tiles[13].rotation=(tiles[13].rotation+1)%4;
  return tiles;
}
export function evaluateCircuit(tiles) {
  const active = new Set(); const relays = new Set();
  let voltage=3,id=12,incoming=3;
  while(true){
    if(active.has(id))return {active,voltage,relays,solved:false,reason:'Loop detected. Redirect the signal toward the output.'};
    const tile=tiles[id], connections=ports(tile);
    if(tile.locked && ![3,12].includes(id))return {active,voltage,relays,solved:false,reason:'Signal reached a blocked tile.'};
    if(!connections.includes(incoming))break;
    active.add(id);voltage+=tile.delta;if(tile.relay)relays.add(tile.relay);
    const outgoing=connections.find(p=>p!==incoming);
    if(id===3 && outgoing===0){
      const solved=relays.size===3 && voltage===5;
      return {active,voltage,relays,solved,reason:solved?'Circuit stable. Shutdown authorized.':relays.size!==3?'Output connected, but all three relays must be included.':'Output connected, but voltage must equal 5V.'};
    }
    const [dx,dy]=steps[outgoing];const x=id%4+dx,y=Math.floor(id/4)+dy;
    if(x<0||x>3||y<0||y>3)break;
    const next=y*4+x;
    if(!ports(tiles[next]).includes((outgoing+2)%4))break;
    incoming=(outgoing+2)%4;id=next;
  }
  return {active,voltage,relays,solved:false,reason:'Signal interrupted. Rotate the next tile to extend the live connection.'};
}

export function createCircuitPuzzle({onSolved}) {
  const initial=buildCircuitTiles();
  let tiles=initial.map(t=>({...t})),overlay=null,solved=false;
  function close(resume=true){
    if(!overlay)return;
    overlay.remove();overlay=null;document.removeEventListener('keydown',keydown,true);
    document.dispatchEvent(new CustomEvent('robot-repair-close',{detail:{resume}}));
  }
  function keydown(e){if(e.code==='Escape'){e.stopImmediatePropagation();close();}}
  return {
    get isOpen(){return !!overlay;},
    open(){
      if(overlay||solved)return;
      overlay=document.createElement('div');overlay.id='core-circuit-overlay';
      overlay.style.cssText='position:fixed;inset:0;z-index:10000;overflow:auto;background:#020c14f5;color:#b8f4ff;display:grid;place-items:center;padding:16px;font:15px monospace;box-sizing:border-box';
      const panel=document.createElement('section');panel.style.cssText='width:min(500px,100%);padding:20px;border:1px solid #27bdd7;background:#061c28;box-sizing:border-box';
      panel.innerHTML='<h2 style="margin:0;color:#5eeaff">NEURAL LINK / CIRCUIT OVERRIDE</h2><p>Rotate tiles to connect IN → OUT through relays R1, R2 and R3. Start: 3V. Required output: 5V. Modifiers add or subtract voltage along the live wire.</p><p>Click / Enter: rotate clockwise · Right-click: counterclockwise · Padlocks cannot rotate. No timer.</p>';
      const status=document.createElement('p');status.setAttribute('aria-live','polite');
      const board=document.createElement('div');board.style.cssText='display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px';
      const buttons=[];
      function draw(){
        const state=evaluateCircuit(tiles);
        status.textContent=`SIGNAL ${state.voltage}V / TARGET 5V  ·  RELAYS ${state.relays.size}/3 — ${state.reason}`;
        tiles.forEach((tile,i)=>{
          const b=buttons[i],live=state.active.has(i),blocked=tile.locked&&![3,12].includes(i);
          const color=live?'#75ffb3':tile.relay?'#ffc875':'#32899e';
          b.style.background=live?'#123d37':blocked?'#101e27':'#0b2938';b.style.borderColor=live?'#75ffb3':'#246274';
          const endpoints=[[50,7],[93,50],[50,93],[7,50]];
          const ends=ports(tile).map(p=>endpoints[p]);
          const label=i===12?'IN · 3V':i===3?'OUT · 5V':blocked?'LOCK':`${tile.relay?'R'+tile.relay+' ':''}${tile.delta?(tile.delta>0?'+':'')+tile.delta+'V':''}`;
          b.innerHTML=`<svg viewBox="0 0 100 100" style="display:block;width:100%;height:100%" aria-hidden="true"><path d="M${ends[0]} L50,50 L${ends[1]}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"/><circle cx="50" cy="50" r="8" fill="#071820" stroke="${color}" stroke-width="3"/><text x="50" y="84" text-anchor="middle" fill="${color}" font-size="13" font-family="monospace">${label}</text></svg>`;
          b.setAttribute('aria-label',`Row ${Math.floor(i/4)+1}, column ${i%4+1}. ${label}. ${live?'Powered. ':''}${tile.locked?'Fixed.':'Rotate tile.'}`);
        });
      }
      tiles.forEach((tile,i)=>{
        const b=document.createElement('button');b.type='button';
        b.style.cssText='aspect-ratio:1;padding:0;min-width:0;border:1px solid;border-radius:12px;cursor:pointer;touch-action:manipulation';
        const rotate=amount=>{if(tile.locked)return;tile.rotation=(tile.rotation+amount+4)%4;draw();};
        b.addEventListener('click',()=>rotate(1));b.addEventListener('contextmenu',e=>{e.preventDefault();rotate(-1);});
        buttons.push(b);board.append(b);
      });
      const actions=document.createElement('div');
      function action(text,callback){const b=document.createElement('button');b.textContent=text;b.style.cssText='padding:12px;margin:12px 8px 0 0;background:#123c4a;color:#c8faff;border:1px solid #38bed6;cursor:pointer;font:inherit';b.addEventListener('click',callback);actions.append(b);}
      action('Reset circuit',()=>{tiles.forEach((t,i)=>{t.rotation=initial[i].rotation;});draw();});
      action('Authorize shutdown',()=>{const state=evaluateCircuit(tiles);if(!state.solved){status.textContent=state.reason;return;}solved=true;close();onSolved();});
      action('Return to room',()=>close());
      panel.append(status,board,actions);overlay.append(panel);document.body.append(overlay);
      document.addEventListener('keydown',keydown,true);document.exitPointerLock?.();draw();
    },
    dispose(){close(false);},
  };
}
