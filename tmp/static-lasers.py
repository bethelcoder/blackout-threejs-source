from pathlib import Path
p = Path('src/scenes/laserSecurity.js')
s = p.read_text(encoding='utf-8')
start = s.index('  for (const [row, z]')
end = s.index('\n  // Right wall', start)
s = s[:start] + '''  // Alternate jump and duck lanes, with diagonal overhead strands like the reference.
  // The front two lanes span both entry routes before the shutdown button.
  const layout = [
    [[-6.88, 0.42, 4.1], [6.88, 0.52, 3.7]],
    [[-6.88, 1.45, 1.2], [6.88, 1.28, 1.7]],
    [[-6.88, 0.45, -1.6], [6.88, 0.55, -1.3]],
    [[-6.88, 1.35, -3.5], [6.88, 1.55, -3.7]],
    [[-6.88, 2.85, 5], [6.88, 2.25, -0.8]],
    [[-6.88, 2.25, -0.8], [6.88, 2.85, 5]],
    [[-6.88, 3.25, 1.8], [6.88, 2.5, -5]],
    [[-6.88, 2.5, -5], [6.88, 3.25, 1.8]],
  ];
  for (const [start, end] of layout) {
    const core = new THREE.Mesh(beamGeo, green);
    const halo = new THREE.Mesh(beamGeo, glow);
    const dot = new THREE.Mesh(dotGeo, spotMaterial);
    beams.add(core, halo, dot);
    rays.push({ start: new THREE.Vector3(...start), end: new THREE.Vector3(...end), core, halo, dot });
  }
''' + s[end:]
s = s.replace('  let time = 0;','  let previousHeight = 1.7;')
start = s.index('  function positionBeams(')
end = s.index('      for (const [mesh, radius]', start)
s = s[:start] + '''  function positionBeams() {
    for (const beam of rays) {
      direction.subVectors(beam.end, beam.start);
      let length = direction.length();
      direction.normalize();
      surfaceNormal.set(-1, 0, 0);
      ray.set(beam.start, direction);
      for (const box of occluders) {
        if (ray.intersectBox(box, hitPoint)) {
          const distance = hitPoint.distanceTo(beam.start);
          if (distance < length) {
            length = distance;
            surfaceNormal.set(0, 1, 0);
            if (Math.abs(hitPoint.x - box.min.x) < 0.001) surfaceNormal.set(-1, 0, 0);
            if (Math.abs(hitPoint.x - box.max.x) < 0.001) surfaceNormal.set(1, 0, 0);
            if (Math.abs(hitPoint.z - box.min.z) < 0.001) surfaceNormal.set(0, 0, -1);
            if (Math.abs(hitPoint.z - box.max.z) < 0.001) surfaceNormal.set(0, 0, 1);
          }
        }
      }
      beam.end.copy(beam.start).addScaledVector(direction, length);
''' + s[end:]
s = s.replace('positionBeams(0);', 'positionBeams();')
s = s.replace('      const startTime = time;\n      time += delta;\n', '')
s = s.replace('      if (!previous) previous = camera.position.clone();', '''      const height = camera.userData.playerHeight ?? 1.7;
      if (!previous) { previous = camera.position.clone(); previousHeight = height; }''')
s = s.replace('      // Sample both movement and beam sweep so sprinting cannot skip a thin beam.', '      // Sweep the actual standing/crouched body so sprinting cannot skip a beam.')
s = s.replace('        positionBeams(startTime + delta * step / steps);\n', '')
s = s.replace('        playerBox.min.set(player.x - 0.37, player.y - 1.7, player.z - 0.37);', '''        const bodyHeight = THREE.MathUtils.lerp(previousHeight, height, step / steps);
        playerBox.min.set(player.x - 0.37, player.y - bodyHeight, player.z - 0.37);''')
s = s.replace('Laser alarm! Time your crossing while the beams are high. Reach the shutdown button midway along the right wall.', 'Laser alarm! Jump low beams (Space), duck high beams (hold C or Ctrl). Reach the shutdown button midway along the right wall.')
s = s.replace('            positionBeams(time);', '            previousHeight = camera.userData.playerHeight ?? 1.7;')
s = s.replace('      previous.copy(camera.position);\n    },', '      previous.copy(camera.position);\n      previousHeight = height;\n    },')
s = s.replace('// The imported beam mesh fans across each aisle; no sight/attachment hardware is used.', '// Fixed crisscross beams using the imported mesh; no sight/attachment hardware.')
p.write_text(s, encoding='utf-8')
p = Path('src/scenes/level2.js')
s = p.read_text(encoding='utf-8').replace('Avoid the sweeping green lasers. Reach the shutdown button midway along the right wall (E).', 'Jump low lasers (Space), duck high lasers (hold C or Ctrl). Reach the shutdown button midway along the right wall (E).')
p.write_text(s, encoding='utf-8')
p = Path('index.html')
s = p.read_text(encoding='utf-8').replace('SPACE to jump &middot;', 'SPACE to jump &middot; C / CTRL to duck &middot;').replace('<span><kbd>Space</kbd> Jump</span>', '<span><kbd>Space</kbd> Jump</span>\n        <span><kbd>C / Ctrl</kbd> Duck (hold)</span>')
p.write_text(s, encoding='utf-8')
