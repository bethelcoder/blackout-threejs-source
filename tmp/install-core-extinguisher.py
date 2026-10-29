from pathlib import Path
p=Path('src/scenes/coreChair.js').read_text().replace('buildCoreChair', 'buildCoreExtinguisher').replace('Level 3 workstation chair', 'Level 3 wall-mounted fire extinguisher').replace('group.position.set(-4.92, 0, 0)', 'group.position.set(-6.75, 0.85, 2.15)').replace('// Source seat faces +Z; point it toward the workstation on the left wall.\n  group.rotation.y = -Math.PI / 2;', '// Face into the room from the left wall.\n  group.rotation.y = Math.PI / 2;').replace('core-office-chair.glb', 'core-fire-extinguisher.glb').replace('Imported Office Chair', 'Imported Fire Extinguisher').replace('1.25 / size.y', '0.75 / size.y').replace('Office chair model unavailable.', 'Fire extinguisher model unavailable.')
p=p.replace('    collider.setFromObject(group);', '''    collider.setFromObject(group);
    // Place its back against the wall, without burying any model parts.
    group.position.x += -6.94 - collider.min.x;
    group.updateWorldMatrix(true, true);
    collider.setFromObject(group);''')
Path('src/scenes/coreExtinguisher.js').write_text(p)
