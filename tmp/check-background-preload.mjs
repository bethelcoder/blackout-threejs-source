import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = fs.readFileSync('src/main.js', 'utf8');
const start = source.indexOf('  // Warm the next room');
const end = source.indexOf('\n  hud.setObjective', start);
const run = new Function('index','setTimeout','getState','preloadLevel2Models','preloadLevel3Models',
  'const {currentLevelIndex,levelLoading,gameEnded}=getState();\n'+source.slice(start,end));
let scheduled = 0, calls = 0;
run(0,(callback,delay)=>{scheduled++;assert.equal(delay,1500);callback();},()=>({currentLevelIndex:0,levelLoading:false,gameEnded:false}),async()=>{calls++;});
assert.equal(scheduled,1);assert.equal(calls,1);
let coreCalls = 0;
run(1,callback=>{scheduled++;callback();},()=>({currentLevelIndex:1,levelLoading:false,gameEnded:false}),async()=>{calls++;},async()=>{coreCalls++;});
assert.equal(coreCalls,1,'Level 2 starts preparation of the core');
run(2,()=>{scheduled++;},()=>({}),async()=>{calls++;},async()=>{coreCalls++;});
assert.equal(scheduled,2,'The final room does not schedule another preload');
run(0,callback=>callback(),()=>({currentLevelIndex:1,levelLoading:true,gameEnded:false}),async()=>{calls++;});
assert.equal(calls,1,'A transition already underway does not start a background job');
console.log('Background preload scheduling checks passed.');
