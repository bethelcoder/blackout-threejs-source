from pathlib import Path
p=Path('src/scenes/level3.js');s=p.read_text().replace('createRobotRepair, createCoreOverride','createRobotRepair').replace("import { createRobotRepair } from '../systems/robotRepair.js';", "import { createRobotRepair } from '../systems/robotRepair.js';\nimport { createCircuitPuzzle } from '../systems/circuitPuzzle.js';")
s=s.replace("  const overrideCode = '7319';\n",'').replace('const recoveredClue = () => hud.setObjective(`ROBOT RECORD: emergency core override code ${overrideCode}. Enter it at the display terminal beside the left desk.`);', "const recoveredClue = () => hud.setObjective('ROBOT RECORD: the hologram circuit starts at 3V and must finish at 5V. Route through all three relays: R1 boosts +3V, R2 drains 2V, R3 boosts +1V. A connected wire alone is not enough.');")
s=s.replace('createCoreOverride({ code: overrideCode, onSolved:', 'createCircuitPuzzle({ onSolved:')
a=s.index('  Object.assign(displayTerminal.group.userData');b=s.index('  const phaseIndex',a)
s=s[:a]+'''  const openCircuit = () => {
    if (finished) return;
    if (!wavesDisabled) { hud.setObjective('Circuit locked. Disable the shockwaves using the three feeders first.'); return; }
    if (!robotRepair.solved) { hud.setObjective('Repair the robot beside the desk to restore circuit access and recover the routing clue.'); return; }
    coreOverride.open();
  };
  Object.assign(hologramScreen.group.userData, {
    interactable: true,
    label: 'Connect hologram shutdown circuit',
    reach: 3.5,
    onInteract: openCircuit,
  });
  Object.assign(displayTerminal.group.userData, {
    interactable: true,
    label: 'Read circuit access status',
    onInteract: () => hud.setObjective(robotRepair.solved
      ? 'Circuit access restored. Use the large wall hologram to connect the shutdown route through all three relays at 5V.'
      : 'Repair the robot beside this desk after disabling the shockwave feeders. It can restore access to the wall hologram circuit.'),
  });
''' +s[b:]
s=s.replace('Then repair the robot and use the override terminal.', 'Then repair the robot and solve the circuit on the large wall hologram.')
p.write_text(s)
p=Path('src/systems/robotRepair.js');s=p.read_text();s=s[:s.index('\nexport function createCoreOverride')];s=s.replace('REPAIR COMPLETE — Maintenance record recovered. Emergency override code: 7319. Enter it at the display terminal beside the desk. You can replay this recording by interacting with the robot.', 'REPAIR COMPLETE — Wall hologram access restored. Circuit input: 3V. Required output: 5V. Include R1 (+3V), R2 (−2V), and R3 (+1V). Beware the decoy modifiers. Use the large wall hologram to route the shutdown signal.');p.write_text(s)
