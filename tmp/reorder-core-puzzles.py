from pathlib import Path
p=Path('src/scenes/level3.js');s=p.read_text().replace("import { createRobotRepair }", "import { createRobotRepair, createCoreOverride }")
a=s.index('  const recoveredClue =');b=s.index('  const phaseIndex',a)
s=s[:a]+'''  let wavesDisabled = false;
  const overrideCode = '7319';
  const recoveredClue = () => hud.setObjective(`ROBOT RECORD: emergency core override code ${overrideCode}. Enter it at the display terminal beside the left desk.`);
  const robotRepair = createRobotRepair({ onSolved: () => {
    recoveredClue();
    sound.playAccessGranted();
  } });
  const coreOverride = createCoreOverride({ code: overrideCode, onSolved: () => {
    if (wavesDisabled && robotRepair.solved && !finished) beginIsolation();
  } });
  Object.assign(deskBot.group.userData, {
    interactable: true,
    label: 'Repair robot',
    getLabel: () => !wavesDisabled ? 'Robot unsafe - disable shockwave feeders first' : robotRepair.solved ? 'Replay robot maintenance clue' : 'Repair robot',
    onInteract: () => {
      if (!wavesDisabled) { hud.setObjective('Disable the shockwaves first: isolate the three feeders from highest load to lowest. Check the maintenance schedule.'); return; }
      if (robotRepair.solved) recoveredClue(); else robotRepair.open();
    },
  });
  Object.assign(displayTerminal.group.userData, {
    interactable: true,
    label: 'Use core override terminal',
    onInteract: () => {
      if (finished) return;
      if (!wavesDisabled) { hud.setObjective('Override locked. Disable the shockwaves using the three feeders first.'); return; }
      if (!robotRepair.solved) { hud.setObjective('Authorization missing. Repair the robot on the other side of the desk to recover the override code.'); return; }
      coreOverride.open();
    },
  });
''' + s[b:]
s=s.replace('if (progress === correctOrder.length) { beginIsolation(); return; }', '''if (progress === correctOrder.length) {
        wavesDisabled = true;
        waves.forEach(w => { w.active = false; });
        waveMat.uniforms.uRadius.value.fill(-10);
        waveMat.uniforms.uCharge.value = 0;
        secondIn = -1;
        charge = 0;
        hud.setObjective('Shockwaves disabled. The room is safe. Repair the robot beside the left desk to recover the core override clue.');
        return;
      }''')
s=s.replace('if (robotRepair.isOpen) return;', 'if (robotRepair.isOpen || coreOverride.isOpen) return;').replace('    if (!finished) {\n      timeToNext', '    if (!finished && !wavesDisabled) {\n      timeToNext')
s=s.replace('phase.interval + (robotRepair.solved ? 2 : 0)', 'phase.interval').replace('phase.speed * (robotRepair.solved ? 0.8 : 1) * delta', 'phase.speed * delta')
s=s.replace('    robotRepair.dispose();', '    robotRepair.dispose();\n    coreOverride.dispose();').replace('return robotRepair.isOpen;','return robotRepair.isOpen || coreOverride.isOpen;')
s=s.replace("objective: 'Repair the robot beside the left desk to recover a clue and slow the pulses. Then isolate the feeders and jump or use the green safe gap.'", "objective: 'Disable shockwaves: read the maintenance schedule and isolate feeders from highest load to lowest. Then repair the robot and use the override terminal.'")
p.write_text(s)
p=Path('src/systems/robotRepair.js');s=p.read_text().replace('REPAIR COMPLETE — Maintenance record recovered. Isolate the highest-load feeder first, then work down to the lowest. The robot has slowed the security pulses.', 'REPAIR COMPLETE — Maintenance record recovered. Emergency override code: 7319. Enter it at the display terminal beside the desk. You can replay this recording by interacting with the robot.');p.write_text(s)
