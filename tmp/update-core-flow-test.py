from pathlib import Path
p=Path('tmp/check-level3.mjs');s=p.read_text();s=s.replace('globalThis.document = {', '''class Element {
  constructor(tag) { this.tag=tag;this.children=[];this.style={};this.events={};this.texts=[];this.value=''; }
  getContext() { return context(this.texts); }
  append(...items) { this.children.push(...items);items.forEach(x=>x.parent=this); }
  remove() { if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this); }
  addEventListener(type,fn) { this.events[type]=fn; }
  querySelectorAll(tag) { return this.children.flatMap(x=>[...(x.tag===tag?[x]:[]),...x.querySelectorAll(tag)]); }
  click() { if(!this.disabled)this.events.click?.(); }
  setAttribute() {} focus() {}
}
globalThis.CustomEvent=class {constructor(type,args){this.type=type;this.detail=args.detail;}};
globalThis.document = {
  body: new Element('body'), addEventListener(){}, removeEventListener(){}, dispatchEvent(){}, exitPointerLock(){},''')
s=s.replace("createElement() { const image = { texts: [] }; image.getContext = () => context(image.texts); return image; },", "createElement(tag) { return new Element(tag); },")
s=s.replace('for (const feeder of feeders) feeder.userData.onInteract();', '''const bot=scene.getObjectByName('Level 3 bot beside left desk');
bot.userData.onInteract();assert.ok(!level.panelOpen,'Robot requires feeders first');
for (const feeder of feeders) feeder.userData.onInteract();
const hitsAfterFeeders=surges;
for (let frame=0;frame<1800;frame++)level.update(1/60,camera);
assert.equal(surges,hitsAfterFeeders,'Waves stay disabled while puzzles remain');
assert.equal(endings,0,'Feeders do not finish the level');
bot.userData.onInteract();assert.ok(level.panelOpen);
let buttons=document.body.querySelectorAll('button');
for(let i=0;i<2;i++)buttons[0].click();
for(let i=0;i<3;i++)buttons[1].click();
buttons[2].click();buttons.find(b=>b.textContent==='Run diagnostics').click();
buttons.find(b=>b.textContent==='Return to room').click();
assert.equal(endings,0,'Robot provides a clue rather than finishing');
scene.getObjectByName('Level 3 display terminal beside left desk').userData.onInteract();
assert.ok(level.panelOpen);
const input=document.body.querySelectorAll('input')[0];
const authorize=document.body.querySelectorAll('button').find(b=>b.textContent==='Authorize shutdown');
input.value='0000';authorize.click();assert.ok(level.panelOpen,'Wrong code does not close override');
input.value='7319';authorize.click();assert.ok(!level.panelOpen);''')
s=s.replace('three feeders, ending and disposal.', 'feeders disable hazards without ending, robot repair, override code, ending and disposal.')
p.write_text(s)
