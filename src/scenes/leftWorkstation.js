import * as THREE from 'three';
import { loadModel } from '../systems/modelCache.js';

export function buildLeftWorkstation() {
  const group = new THREE.Group();
  group.name = 'Level 3 left-wall computer desk';
  group.position.set(-6.25, 0, 0);
  group.rotation.y = Math.PI / 2;
  const collider = new THREE.Box3();
  const bookAnchor = new THREE.Group();
  bookAnchor.name = 'Engineer logbook';
  const monitorNoteAnchor = new THREE.Group();
  const uvPickup = new THREE.Group();
  uvPickup.name = 'UV flashlight pickup';
  uvPickup.visible = false;
  const drawer = new THREE.Group();
  drawer.name = 'Engineer upper locking drawer';
  group.add(bookAnchor, monitorNoteAnchor);
  let disposed = false;
  let drawerTarget = 0;
  let drawerTravel = 0;
  function disposeModel(root) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    root.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const mat of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
        materials.add(mat); Object.values(mat).forEach(value => { if (value?.isTexture) textures.add(value); });
      }
    });
    geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose());
  }
  const load = url => loadModel(url).then(gltf => gltf.scene).catch(error => { console.warn('Workstation asset unavailable.', url, error); return null; });
  const ready = Promise.all([load('./models/sci-fi-office-desk.glb'), load('./models/left-personal-computer.glb'), load('./models/drawer-keypad.glb'), load('./models/engineer-logbook.glb'), load('./models/monitor-sticky-note.glb'), load('./models/uv-flashlight.glb')]).then(([desk, computer, keypad, book, sticky, uv]) => {
    if (disposed || !desk) { for (const model of [desk, computer, keypad, book, sticky, uv]) if (model) disposeModel(model); return; }
    const bounds = new THREE.Box3().setFromObject(desk);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 2.8 / size.x;
    drawerTravel = 0.32 / scale;
    const tabletop = size.y * scale;
    desk.name = 'Sci-Fi Office Desk';
    desk.scale.setScalar(scale);
    desk.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    group.add(desk);
    // The converted model retains the original drawer mesh names and materials.
    const upperDrawer = [];
    desk.traverse(object => { if (object.isMesh && object.name.startsWith('Desk_Drawer1')) upperDrawer.push(object); });
    upperDrawer.forEach(object => drawer.add(object));
    // Measure the original drawer before it inherits the desk's world transform.
    const drawerBounds = new THREE.Box3().setFromObject(drawer);
    if (keypad && !drawerBounds.isEmpty()) {
      const keypadBounds = new THREE.Box3().setFromObject(keypad);
      const keypadSize = keypadBounds.getSize(new THREE.Vector3());
      const keypadCenter = keypadBounds.getCenter(new THREE.Vector3());
      const keypadScale = 0.22 / (scale * keypadSize.y);
      keypad.name = 'Upper drawer code keypad';
      keypad.scale.setScalar(keypadScale);
      keypad.position.set(
        (drawerBounds.min.x + drawerBounds.max.x) / 2 - keypadCenter.x * keypadScale,
        (drawerBounds.min.y + drawerBounds.max.y) / 2 - keypadCenter.y * keypadScale,
        drawerBounds.max.z + 0.002 / scale - keypadBounds.min.z * keypadScale,
      );
      // Parenting to the interactable drawer also routes keypad hits to its code UI.
      drawer.add(keypad);
    } else if (keypad) {
      disposeModel(keypad);
    }
    if (uv && !drawerBounds.isEmpty()) {
      const uvBounds = new THREE.Box3().setFromObject(uv);
      const uvSize = uvBounds.getSize(new THREE.Vector3());
      const uvCenter = uvBounds.getCenter(new THREE.Vector3());
      const uvScale = 0.22 / (scale * Math.max(uvSize.x, uvSize.y, uvSize.z));
      uv.name = 'Imported UV flashlight';
      uv.scale.setScalar(uvScale);
      uv.position.set(-uvCenter.x * uvScale, -uvBounds.min.y * uvScale, -uvCenter.z * uvScale);
      uvPickup.position.set(
        (drawerBounds.min.x + drawerBounds.max.x) / 2,
        drawerBounds.min.y + 0.012 / scale,
        drawerBounds.max.z - 0.12 / scale,
      );
      uvPickup.add(uv);
      drawer.add(uvPickup);
    } else if (uv) {
      disposeModel(uv);
    }
    desk.add(drawer);
    bookAnchor.position.set(-0.85, tabletop + 0.006, 0.15);
    if (book) {
      const bookBounds = new THREE.Box3().setFromObject(book);
      const bookSize = bookBounds.getSize(new THREE.Vector3());
      const bookCenter = bookBounds.getCenter(new THREE.Vector3());
      const bookScale = 0.42 / Math.max(bookSize.x, bookSize.z);
      book.name = 'Imported Book';
      book.scale.setScalar(bookScale);
      book.position.set(-bookCenter.x * bookScale, -bookBounds.min.y * bookScale, -bookCenter.z * bookScale);
      bookAnchor.rotation.y = -0.12;
      bookAnchor.add(book);
    }
    if (computer) {
      const pcBounds = new THREE.Box3().setFromObject(computer);
      const pcSize = pcBounds.getSize(new THREE.Vector3());
      const pcCenter = pcBounds.getCenter(new THREE.Vector3());
      const pcScale = Math.min(1.1 / pcSize.x, 0.9 / pcSize.z);
      computer.name = 'Imported Personal Computer';
      computer.scale.setScalar(pcScale);
      computer.position.set(-pcCenter.x * pcScale, tabletop + 0.005 - pcBounds.min.y * pcScale, -pcCenter.z * pcScale);
      // Mount the paper on the front of the existing monitor, facing the room.
      computer.updateMatrixWorld(true);
      const screen = computer.getObjectByName('Cube_Screen_0');
      if (screen) {
        const screenBounds = new THREE.Box3().setFromObject(screen);
        monitorNoteAnchor.position.set(screenBounds.max.x - 0.15, screenBounds.min.y + 0.1, screenBounds.max.z + 0.012);
      } else {
        monitorNoteAnchor.position.set(0.22, tabletop + pcSize.y * pcScale * 0.68, pcSize.z * pcScale / 2 + 0.012);
      }
      group.add(computer);
    }
    if (sticky) {
      // Stand the supplied curled paper upright; replace its sample wording.
      const paperBounds = new THREE.Box3().setFromObject(sticky);
      const paperSize = paperBounds.getSize(new THREE.Vector3());
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 512;
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffff65'; context.fillRect(0, 0, 512, 512);
      context.fillStyle = '#272219'; context.textAlign = 'center'; context.font = 'bold 62px cursive';
      context.fillText('Trust the', 256, 220); context.fillText('stamps.', 256, 310);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      sticky.traverse(object => {
        if (!object.isMesh) return;
        const positions = object.geometry.attributes.position;
        const uv = new Float32Array(positions.count * 2);
        for (let i = 0; i < positions.count; i++) {
          uv[i * 2] = (positions.getX(i) - paperBounds.min.x) / paperSize.x;
          uv[i * 2 + 1] = (paperBounds.max.z - positions.getZ(i)) / paperSize.z;
        }
        object.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        object.material.map?.dispose();
        object.material.map = texture;
        object.material.color.set(0xffffff);
        object.material.side = THREE.DoubleSide;
        object.material.needsUpdate = true;
      });
      sticky.name = 'Imported sticky note';
      sticky.rotation.x = Math.PI / 2;
      sticky.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(sticky);
      const center = bounds.getCenter(new THREE.Vector3());
      const noteScale = 0.22 / bounds.getSize(new THREE.Vector3()).x;
      sticky.scale.setScalar(noteScale);
      sticky.position.set(-center.x * noteScale, -center.y * noteScale, -bounds.min.z * noteScale);
      monitorNoteAnchor.rotation.z = -0.08;
      monitorNoteAnchor.add(sticky);
    }
    group.traverse(object => { if (object.isMesh) object.castShadow = object.receiveShadow = true; });
    group.updateWorldMatrix(true, true);
    // Keep this footprint fixed: expanding a solid desk-wide AABB as the drawer
    // slides can engulf the player and make every movement step collide.
    collider.setFromObject(group);
  });
  function update(delta) {
    if (disposed || !drawer.parent || drawer.position.z === drawerTarget) return;
    drawer.position.z = THREE.MathUtils.damp(drawer.position.z, drawerTarget, 6, delta);
    if (Math.abs(drawer.position.z - drawerTarget) < 0.01) drawer.position.z = drawerTarget;
    group.updateWorldMatrix(true, true);
  }
  return { group, collider, ready, bookAnchor, monitorNoteAnchor, drawer, uvPickup,
    openDrawer() { drawerTarget = drawerTravel; uvPickup.visible = true; }, update, dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    disposeModel(group);
    group.clear();
  } };
}
