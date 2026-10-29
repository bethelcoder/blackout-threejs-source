from pathlib import Path
p=Path('src/scenes/coreChair.js').read_text().replace('buildCoreChair', 'buildCoreToolboxes').replace('Level 3 workstation chair', 'Level 3 stacked toolboxes').replace('group.position.set(-4.92, 0, 0)', 'group.position.set(-5.65, 0, 5.15)').replace('// Source seat faces +Z; point it toward the workstation on the left wall.\n  group.rotation.y = -Math.PI / 2;', '// Long side runs along the maintenance wall.\n  group.rotation.y = Math.PI / 2;').replace('core-office-chair.glb', 'core-toolbox.glb').replace('Imported Office Chair', 'Lower toolbox').replace('1.25 / size.y', '0.9 / Math.max(size.x, size.z)').replace('Office chair model unavailable.', 'Stacked toolbox model unavailable.')
p=p.replace('    group.add(model);', '''    const upper = model.clone(true);
    upper.name = 'Upper toolbox';
    upper.position.y += size.y * scale;
    group.add(model, upper);''')
Path('src/scenes/coreToolboxes.js').write_text(p)
