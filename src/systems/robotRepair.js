export function createRobotRepair({onSolved}) {
  let overlay=null,solved=false,values=[0,0,0];
  const names=['Memory','Vision','Speech'];
  function close(resume=true){if(!overlay)return;overlay.remove();overlay=null;document.removeEventListener('keydown',keydown,true);document.dispatchEvent(new CustomEvent('robot-repair-close',{detail:{resume}}));}
  function keydown(e){if(e.code==='Escape'){e.stopImmediatePropagation();close();}}
  return {
    get solved(){return solved;},get isOpen(){return !!overlay;},
    open(){
      if(overlay||solved)return;
      overlay=document.createElement('div');overlay.id='robot-repair-overlay';
      overlay.style.cssText='position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:#020b13dd;color:#c9f8ff;font:16px monospace;padding:20px;overflow:auto';
      const panel=document.createElement('section');panel.style.cssText='width:min(540px,100%);background:#091c29;border:1px solid #4edfff;padding:28px;box-sizing:border-box';
      panel.innerHTML='<h2>ROBOT / SERVICE MODE</h2><p>Restore the damaged power controller. Six power units are available.</p><p>Diagnostics: memory has two banks. Vision needs stereo cameras plus a depth sensor. Speech uses one transmitter. Each component requires one unit.</p>';
      const controls=document.createElement('div'),status=document.createElement('p'),buttons=[];
      const draw=()=>{buttons.forEach((b,i)=>{b.textContent=`${names[i]}: ${values[i]} units (+)`;});status.textContent=`Unallocated power: ${6-values.reduce((a,b)=>a+b,0)}`;};
      function button(label,callback){const b=document.createElement('button');b.textContent=label;b.style.cssText='padding:12px;margin:6px;background:#123547;color:#bdf5ff;border:1px solid #4edfff;cursor:pointer;font:inherit';b.addEventListener('click',callback);return b;}
      names.forEach((name,i)=>{const b=button(name,()=>{if(values[i]===4)values[i]=0;else if(values.reduce((a,b)=>a+b,0)<6)values[i]++;else{status.textContent='No power remaining. Reset the allocation to try again.';return;}draw();});buttons.push(b);controls.append(b);});
      panel.append(controls,status);
      panel.append(button('Reset allocation',()=>{values=[0,0,0];draw();}));
      panel.append(button('Run diagnostics',()=>{
        if(values.every((v,i)=>v===[2,3,1][i])){
          solved=true;onSolved();controls.remove();
          status.textContent='REPAIR COMPLETE - Wall hologram access restored. Input: 3V. Required output: 5V. Include R1 (+3V), R2 (-2V), and R3 (+1V). Beware decoy modifiers. Use the large wall hologram to route the shutdown signal.';
          panel.querySelectorAll('button').forEach(b=>{if(b.textContent!=='Return to room')b.disabled=true;});
        }else{values=[0,0,0];draw();status.textContent='Power mismatch. Allocation reset. Count the components in each system and try again.';}
      }));
      panel.append(button('Return to room',()=>close()));draw();overlay.append(panel);document.body.append(overlay);document.addEventListener('keydown',keydown,true);document.exitPointerLock?.();
    },
    dispose(){close(false);},
  };
}
