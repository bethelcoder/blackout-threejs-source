from pathlib import Path
p=Path('src/scenes/level1.js')
s=p.read_text(encoding='utf-8')
s=s.replace("import { buildCardboardBoxes } from './cardboardBoxes.js';", "import { buildCardboardBoxes } from './cardboardBoxes.js';\nimport { buildSecurityCamera, createRoomSecurityView } from './securityCamera.js';")
start=s.index('  // SECURITY SYSTEM')
end=s.index('  // Hazard stripe & Exit Door',start)
s=s[:start]+'''  // High-mounted fixed wide-angle camera, looking into the room from above the doors.
  const cctvCamera = createRoomSecurityView();
  const securityCamera = buildSecurityCamera();
  securityCamera.group.position.copy(cctvCamera.position);
  securityCamera.group.lookAt(0, 0, -0.8);
  scene.add(securityCamera.group);
  cleanup.push(() => securityCamera.dispose());
  const cameraStatus = new THREE.PointLight(0xff3322, 0.5, 1.5);
  cameraStatus.position.copy(cctvCamera.position);
  scene.add(cameraStatus);
  cleanup.push(() => scene.remove(cameraStatus));
  const securityFrustum = new THREE.Frustum();
  securityFrustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cctvCamera.projectionMatrix, cctvCamera.matrixWorldInverse));
  const sightRay = new THREE.Ray();
  const sightDirection = new THREE.Vector3();
  const obstruction = new THREE.Vector3();

'''+s[end:]
start=s.index('    camHead.rotation.y')
end=s.index('      aiState.raise(28 * delta);',start)
s=s[:start]+'''    if (sparks.userData.update) sparks.userData.update(delta);

    sightDirection.subVectors(camera.position, cctvCamera.position);
    const distance = sightDirection.length();
    sightRay.set(cctvCamera.position, sightDirection.normalize());
    const hidden = colliders.some(box => !box.isEmpty() && sightRay.intersectBox(box, obstruction) && obstruction.distanceTo(cctvCamera.position) < distance - 0.35);
    if (securityFrustum.containsPoint(camera.position) && !hidden) {
'''+s[end:]
s=s.replace('  let t = 0;\n', '').replace('    t += delta;\n', '')
p.write_text(s,encoding='utf-8')
