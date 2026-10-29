from pathlib import Path
s=Path('src/scenes/coreChair.js').read_text().replace("import { GLTFLoader }", "import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';\nimport { GLTFLoader }")
s=s.replace('buildCoreChair', 'buildCoreDisplayTerminal').replace('Level 3 workstation chair', 'Level 3 display terminal beside left desk').replace('group.position.set(-4.92, 0, 0)', 'group.position.set(-6.25, 0, -2.15)').replace('// Source seat faces +Z; point it toward the workstation on the left wall.\n  group.rotation.y = -Math.PI / 2;', '// Face the terminal into the room beside the workstation.\n  group.rotation.y = Math.PI / 2;').replace('core-office-chair.glb', 'core-display-terminal.glb').replace('Imported Office Chair', 'Imported Display Terminal').replace('1.25 / size.y', '1.65 / size.y').replace('Office chair model unavailable.', 'Display terminal model unavailable.')
s=s.replace('    const model = gltf.scene;', '''    const model = new THREE.Group();
    // The converter bakes transforms into vertices. Batch matching materials
    // so the many cable details do not each require their own draw call.
    const batches = new Map();
    gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      if (!batches.has(object.material)) batches.set(object.material, []);
      batches.get(object.material).push(object.geometry);
    });
    for (const [material, geometries] of batches) {
      const merged = mergeGeometries(geometries, false);
      if (merged) {
        model.add(new THREE.Mesh(merged, material));
        geometries.forEach(geometry => geometry.dispose());
      } else {
        geometries.forEach(geometry => model.add(new THREE.Mesh(geometry, material)));
      }
    }''')
Path('src/scenes/coreDisplayTerminal.js').write_text(s)
