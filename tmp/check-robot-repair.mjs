import assert from 'node:assert/strict';
import { createRobotRepair } from '../src/systems/robotRepair.js';
class Element {
 constructor(tag){ this.tag=tag;this.children=[];this.style={};this.events={}; }
 append(...items){ this.children.push(...items); items.forEach(x=>x.parent=this); }
 remove(){ if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this); }
 addEventListener(type,fn){this.events[type]=fn;}
 querySelectorAll(tag){return this.children.flatMap(x=>[...(x.tag===tag?[x]:[]),...x.querySelectorAll(tag)]);}
 click(){if(!this.disabled)this.events.click?.();}
}
const body=new Element('body');let locks=0;let closeEvent;
globalThis.CustomEvent=class{constructor(type,args){this.type=type;this.detail=args.detail;}};
globalThis.document={body,createElement:t=>new Element(t),addEventListener(){},removeEventListener(){},exitPointerLock(){locks++;},dispatchEvent(e){closeEvent=e;}};
let solved=0;const repair=createRobotRepair({onSolved(){solved++;}});
repair.open();assert.ok(repair.isOpen);assert.equal(locks,1);
const buttons=body.querySelectorAll('button');
const run=buttons.find(b=>b.textContent==='Run diagnostics');
buttons[0].click();run.click();assert.equal(solved,0);assert.ok(buttons[0].textContent.includes('0 units'));
for(let i=0;i<2;i++)buttons[0].click();
for(let i=0;i<3;i++)buttons[1].click();
buttons[2].click();run.click();assert.equal(solved,1);assert.ok(repair.solved);
const back=buttons.find(b=>b.textContent==='Return to room');assert.ok(!back.disabled);back.click();
assert.ok(!repair.isOpen);assert.equal(closeEvent.detail.resume,true);
repair.dispose();assert.equal(body.children.length,0);
console.log('Robot repair checks passed: incorrect reset, valid allocation, recovered clue callback, usable return button and cleanup.');
