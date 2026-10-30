from pathlib import Path
p=Path('src/scenes/coreCrates.js').read_text()
p=p.replace('buildCoreCrates', 'buildCoreChair').replace('Level 3 wooden crates', 'Level 3 workstation chair').replace('group.position.set(-3.4, 0, 3.6)', 'group.position.set(-4.92, 0, 0)').replace('group.rotation.y = 0.18', 'group.rotation.y = Math.PI').replace("'./models/wooden-crates.glb'", "new URL('../assets/models/core-office-chair.glb', import.meta.url).href").replace('Imported Wooden Crates', 'Imported Office Chair').replace('2.2 / Math.max(size.x, size.z)', '1.25 / size.y').replace('Wooden crates model unavailable.', 'Office chair model unavailable.')
Path('src/scenes/coreChair.js').write_text(p)
p=Path('src/scenes/coreFurnishings.js').read_text()
start=p.index('  // Operator chair faces')
end=p.index("  screen('OPERATIONS", start)
p=p[:start]+p[end:]
p=p.replace("  const upholstery = new THREE.MeshStandardMaterial({ color: 0x263d46, roughness: 0.95 });\n", '').replace('silver, upholstery, cyan', 'silver, cyan')
Path('src/scenes/coreFurnishings.js').write_text(p)
