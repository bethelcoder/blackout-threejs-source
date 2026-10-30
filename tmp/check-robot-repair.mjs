import assert from 'node:assert/strict';
import { createRobotRepair } from '../src/systems/robotRepair.js';
class Element {
 constructor(tag){ this.tag=tag;this.children=[];this.style={};this.events={}; }
 append(...items){ this.children.push(...items); items.forEach(x=>x.parent=this); }
 remove(){ if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this); }
 setAttribute(){}
 addEventListener(type,fn){this.events[type]=fn;}
 querySelectorAll(tag){return this.children.flatMap(x=>[...(x.tag===tag?[x]:[]),...x.querySelectorAll(tag)]);}
 click(){if(!this.disabled)this.events.click?.();}
}
const body=new Element('body');let locks=0;let closeEvent;
globalThis.CustomEvent=class{constructor(type,args){this.type=type;this.detail=args.detail;}};
globalThis.document={body,createElement:t=>new Element(t),addEventListener(){},removeEventListener(){},exitPointerLock(){locks++;},dispatchEvent(e){closeEvent=e;}};
let solved=0;const repair=createRobotRepair({onSolved(){solved++;}});
repair.open();assert.ok(repair.isOpen);assert.equal(locks,1);
function send(value){body.querySelectorAll('input')[0].value=value;body.querySelectorAll('button').find(b=>b.textContent==='Send message').click();}
send('river');assert.deepEqual(repair.parts,[]);
send('hello');send('wrong');assert.equal(repair.solved,false);
send('river');assert.equal(repair.parts.length,1);
body.querySelectorAll('button').find(b=>b.textContent==='Return to room').click();
assert.ok(!repair.isOpen);assert.equal(closeEvent.detail.resume,true);
repair.open();send('footsteps');send('keyboard');assert.equal(repair.solved,true);assert.equal(solved,1);assert.equal(repair.parts.length,3);
repair.dispose();assert.equal(closeEvent.detail.resume,false);
repair.open();assert.equal(repair.solved,true);assert.equal(solved,1);repair.dispose();
console.log('Robot riddle checks passed: wake-up, wrong answers, parts, retained progress, completion and disposal.');
