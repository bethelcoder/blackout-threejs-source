from pathlib import Path
p=Path('tmp/check-level3.mjs');s=p.read_text().replace("import assert from 'node:assert/strict';", "import assert from 'node:assert/strict';\nimport { CIRCUIT_PATH } from '../src/systems/circuitPuzzle.js';")
s=s.replace('const level = buildLevel3(', 'const buildRandom = Math.random;\nMath.random = () => 0.5;\nconst level = buildLevel3(').replace('await level.ready;', 'await level.ready;\nMath.random = buildRandom;')
a=s.index("scene.getObjectByName('Level 3 display terminal beside left desk').userData.onInteract();");b=s.index('for (let frame = 0; frame < 200;',a)
s=s[:a]+'''scene.getObjectByName('Core holographic wall screen').userData.onInteract();
assert.ok(level.panelOpen);
buttons=document.body.querySelectorAll('button');
const authorize=buttons.find(b=>b.textContent==='Authorize shutdown');
authorize.click();assert.ok(level.panelOpen,'Broken circuit cannot finish level');
for(const id of CIRCUIT_PATH){if(id===30||id===5)continue;buttons[id].click();buttons[id].click();}
authorize.click();assert.ok(!level.panelOpen,'Correct route closes circuit');
''' +s[b:]
s=s.replace('override code, ending', 'hologram circuit, ending');p.write_text(s)
