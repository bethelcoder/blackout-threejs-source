from pathlib import Path
p=Path('src/systems/robotRepair.js');s=p.read_text().replace("removeEventListener('keydown', keydown)", "removeEventListener('keydown', keydown, true)").replace("b.disabled = true;", "if (b.textContent !== 'Return to room') b.disabled = true;");p.write_text(s)
p=Path('src/scenes/level3.js');s=p.read_text().replace("import { buildCoreBot } from './coreBot.js';", "import { buildCoreBot } from './coreBot.js';\nimport { createRobotRepair } from '../systems/robotRepair.js';")
s=s.replace('const WAVE_THICKNESS = 0.7', 'const WAVE_THICKNESS = 0.5').replace('const CHARGE_TIME = 0.9', 'const CHARGE_TIME = 1.6').replace('const JUMP_CLEARANCE = 0.35', 'const JUMP_CLEARANCE = 0.22')
s=s.replace('{ interval: 4.2, speed: 3.2, burst: 1, gap: 1.6 }', '{ interval: 6.5, speed: 2.5, burst: 1, gap: 2.1 }').replace('{ interval: 3.5, speed: 3.9, burst: 1, gap: 1.3 }', '{ interval: 6.0, speed: 2.7, burst: 1, gap: 2.0 }').replace('{ interval: 3.2, speed: 4.5, burst: 2, gap: 1.1 }', '{ interval: 5.5, speed: 2.9, burst: 1, gap: 1.9 }')
s=s.replace('  let finished = false;', '''  let finished = false;
  const recoveredClue = () => hud.setObjective(`ROBOT RECORD: isolate highest load first: ${correctOrder.join(' > ')}. Robot dampener active: slower, less frequent pulses.`);
  const robotRepair = createRobotRepair({ onSolved: () => {
    recoveredClue();
    waves.forEach(w => { w.active = false; });
    timeToNext = 10;
    charge = 0;
    sound.playAccessGranted();
  } });
  Object.assign(deskBot.group.userData, {
    interactable: true,
    label: 'Repair robot',
    getLabel: () => robotRepair.solved ? 'Replay robot maintenance clue' : 'Repair robot',
    onInteract: () => robotRepair.solved ? recoveredClue() : robotRepair.open(),
  });''')
s=s.replace('  const waveMat = createShockwaveFloorMaterial();', '  const waveMat = createShockwaveFloorMaterial();\n  waveMat.uniforms.uThickness.value = WAVE_THICKNESS;')
s=s.replace('let timeToNext = 3.5;', 'let timeToNext = 8;')
s=s.replace('    t += delta;', '    if (robotRepair.isOpen) return;\n    t += delta;')
s=s.replace('timeToNext = phase.interval;', 'timeToNext = phase.interval + (robotRepair.solved ? 2 : 0);')
s=s.replace('w.r += phase.speed * delta', 'w.r += phase.speed * (robotRepair.solved ? 0.8 : 1) * delta')
s=s.replace('    deskBot.dispose();', '    robotRepair.dispose();\n    deskBot.dispose();')
s=s.replace('    colliders,\n    update,', '    colliders,\n    get panelOpen() { return robotRepair.isOpen; },\n    update,')
s=s.replace("objective: 'Read the maintenance schedule (south-east corner), isolate the feeders in order, and jump the core\\'s shockwaves!'", "objective: 'Repair the robot beside the left desk to recover a clue and slow the pulses. Then isolate the feeders and jump or use the green safe gap.'")
p.write_text(s)
p=Path('src/main.js');s=p.read_text().replace("document.addEventListener('wiring-panel-close', resumeAfterPanel);", "document.addEventListener('wiring-panel-close', resumeAfterPanel);\ndocument.addEventListener('robot-repair-close', resumeAfterPanel);")
s=s.replace("  if (terminal.open) return;", "  if (terminal.open || currentLevel?.panelOpen) return;")
p.write_text(s)
