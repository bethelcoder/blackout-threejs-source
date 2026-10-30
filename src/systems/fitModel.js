import * as THREE from 'three';

/**
 * Fit a loaded gltf.scene to a target size, center it horizontally,
 * and put its pivot on the base. Every downloaded GLB should go through this.
 *
 * @param source      gltf.scene
 * @param targetSize  { h: 0.5 }    to fit height to 0.5 m
 *                    { max: 0.8 }  to fit the largest dimension to 0.8 m
 * @param rotateY     optional rotation before fit (radians)
 */
export function fitModel(source, targetSize, rotateY = 0) {
  source.rotation.y = rotateY;
  source.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(source);
  const size = box.getSize(new THREE.Vector3());

  const factor = targetSize.h
    ? targetSize.h / size.y
    : targetSize.max
      ? targetSize.max / Math.max(size.x, size.y, size.z)
      : 1;
  source.scale.setScalar(factor);
  source.updateMatrixWorld(true);

  box.setFromObject(source);
  const c = box.getCenter(new THREE.Vector3());
  source.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));

  source.traverse(o => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });

  return source;
}