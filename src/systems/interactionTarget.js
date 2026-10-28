import * as THREE from 'three';

// Aim assistance covers a small circle around the crosshair (about 4 degrees).
// Test only actionable meshes off-centre, then check the winning ray for walls.
export class InteractionTarget {
  constructor() {
    this.raycaster = new THREE.Raycaster();
    this.point = new THREE.Vector2();
    this.meshes = [];
    this.candidates = [];
    this.hits = [];
    this.sphere = new THREE.Sphere();
    this.origin = new THREE.Vector3();
  }

  find(camera, scene, reach, accepts) {
    this.meshes.length = 0;
    this.candidates.length = 0;
    camera.getWorldPosition(this.origin);
    const owners = new Map();
    scene.traverseVisible(object => {
      if (!object.isMesh) return;
      let owner = null;
      for (let node = object; node; node = node.parent) {
        if (node.isCamera || node.userData.ignoreInteraction) return;
        if (!owner && accepts(node)) owner = node;
      }
      // Reject distant geometry before doing expensive triangle/skinning work.
      // Bounding spheres are cached on geometry and transformed without mutation.
      if (!object.geometry.boundingSphere) object.geometry.computeBoundingSphere();
      this.sphere.copy(object.geometry.boundingSphere).applyMatrix4(object.matrixWorld);
      if (this.origin.distanceTo(this.sphere.center) - this.sphere.radius > reach) return;
      this.meshes.push(object);
      if (owner) {
        this.candidates.push(object);
        owners.set(object, owner);
      }
    });
    if (!this.candidates.length) return null;
    this.raycaster.far = reach;
    const radiusY = Math.tan(THREE.MathUtils.degToRad(4)) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    for (let sample = 0; sample < 9; sample++) {
      const angle = (sample - 1) * Math.PI / 4;
      this.point.set(sample ? Math.cos(angle) * radiusY / camera.aspect : 0,
        sample ? Math.sin(angle) * radiusY : 0);
      this.raycaster.setFromCamera(this.point, camera);
      this.hits.length = 0;
      this.raycaster.intersectObjects(this.candidates, false, this.hits);
      const candidate = this.hits[0];
      const owner = candidate && owners.get(candidate.object);
      if (!owner || candidate.distance > (owner.userData.reach ?? reach)) continue;
      this.hits.length = 0;
      this.raycaster.intersectObjects(this.meshes, false, this.hits);
      if (owners.get(this.hits[0]?.object) !== owner) continue;
      return owner;
    }
    return null;
  }
}
