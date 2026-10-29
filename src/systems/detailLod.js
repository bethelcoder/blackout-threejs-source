import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Distance-gated detail (LOD) for heavy set dressing.
 *
 * Near   : the imported model renders in full, shadows included.
 * Mid    : small fittings (screws, handles, cables) are hidden; the silhouette stays.
 * Far    : a vertex-clustered stand-in replaces the model, so the far side of the
 *          room keeps its shape without paying the full triangle count or shadows.
 * Beyond : the prop is not drawn at all.
 */

const DEFAULTS = {
  detailRange: 7,   // metres at which small parts stop drawing
  proxyRange: 15,     // metres at which the clustered stand-in takes over
  cullRange: 34,      // metres past which the prop is not drawn
  detailSize: 0.22,   // metres; parts smaller than this count as detail
  proxyBudget: 20000, // triangles below which a stand-in is not worth building
  cellSize: 0.04,     // metres; clustering grid for the stand-in
  hysteresis: 0.12,   // fraction of a range a prop must cross before it switches
};

const _size = new THREE.Vector3();
const _centroid = new THREE.Vector3();

function triangleCount(geometry) {
  if (!geometry) return 0;
  return (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
}

const clusterCache = new WeakMap();
const transformedClusterCache = new WeakMap();

/**
 * One triangle per occupied grid cell, taken whole so flat, densely tessellated
 * surfaces (light strips, labels) keep their colour and coverage. Clustering
 * would drop these entirely because each tiny triangle fits inside one cell.
 */
function samplePerCell(geometry, cell, box, nx, ny, nz) {
  const position = geometry.attributes.position;
  const names = ['position', 'normal', 'uv'].filter(name => geometry.attributes[name]);
  const index = geometry.index ? geometry.index.array : null;
  const triCount = index ? index.length / 3 : position.count / 3;
  const seen = new Set();
  const output = names.map(() => []);
  const clamp = (value, max) => Math.min(max - 1, Math.max(0, Math.floor(value)));
  for (let t = 0; t < triCount; t++) {
    const ia = index ? index[t * 3] : t * 3;
    const ib = index ? index[t * 3 + 1] : t * 3 + 1;
    const ic = index ? index[t * 3 + 2] : t * 3 + 2;
    _centroid.set(
      (position.getX(ia) + position.getX(ib) + position.getX(ic)) / 3,
      (position.getY(ia) + position.getY(ib) + position.getY(ic)) / 3,
      (position.getZ(ia) + position.getZ(ib) + position.getZ(ic)) / 3,
    );
    const key = (clamp((_centroid.x - box.min.x) / cell, nx) * ny
      + clamp((_centroid.y - box.min.y) / cell, ny)) * nz
      + clamp((_centroid.z - box.min.z) / cell, nz);
    if (seen.has(key)) continue;
    seen.add(key);
    names.forEach((name, n) => {
      const attribute = geometry.attributes[name];
      const size = attribute.itemSize;
      const array = attribute.array;
      for (const vertex of [ia, ib, ic]) {
        const offset = vertex * size;
        for (let k = 0; k < size; k++) output[n].push(array[offset + k]);
      }
    });
  }
  const simplified = new THREE.BufferGeometry();
  names.forEach((name, n) => {
    simplified.setAttribute(name, new THREE.Float32BufferAttribute(output[n], geometry.attributes[name].itemSize));
  });
  // A sequential index keeps this geometry mergeable with the clustered ones.
  const indices = new Uint32Array(output[0].length / position.itemSize);
  for (let i = 0; i < indices.length; i++) indices[i] = i;
  simplified.setIndex(new THREE.BufferAttribute(indices, 1));
  simplified.computeBoundingBox();
  simplified.computeBoundingSphere();
  return simplified;
}

/**
 * Vertex clustering: every grid cell keeps one representative vertex and triangles
 * that collapse onto fewer than three cells are dropped. UVs and normals come from
 * the representatives, so the original textures still map onto the stand-in.
 */
function clusterGeometry(geometry, cell) {
  if (!geometry?.attributes?.position) return geometry;
  const perCell = clusterCache.get(geometry) || new Map();
  clusterCache.set(geometry, perCell);
  if (perCell.has(cell)) return perCell.get(cell);

  const position = geometry.attributes.position;
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const nx = Math.max(1, Math.ceil((box.max.x - box.min.x) / cell));
  const ny = Math.max(1, Math.ceil((box.max.y - box.min.y) / cell));
  const nz = Math.max(1, Math.ceil((box.max.z - box.min.z) / cell));
  const cellOf = new Int32Array(position.count);
  const lookups = new Map();
  const reps = [];
  for (let i = 0; i < position.count; i++) {
    const ix = Math.min(nx - 1, Math.floor((position.getX(i) - box.min.x) / cell));
    const iy = Math.min(ny - 1, Math.floor((position.getY(i) - box.min.y) / cell));
    const iz = Math.min(nz - 1, Math.floor((position.getZ(i) - box.min.z) / cell));
    const key = (ix * ny + iy) * nz + iz;
    let rep = lookups.get(key);
    if (rep === undefined) {
      rep = reps.length;
      reps.push(i);
      lookups.set(key, rep);
    }
    cellOf[i] = rep;
  }
  const index = geometry.index ? geometry.index.array : null;
  const triCount = index ? index.length / 3 : position.count / 3;
  const kept = [];
  const used = new Uint8Array(reps.length);
  for (let t = 0; t < triCount; t++) {
    const a = cellOf[index ? index[t * 3] : t * 3];
    const b = cellOf[index ? index[t * 3 + 1] : t * 3 + 1];
    const c = cellOf[index ? index[t * 3 + 2] : t * 3 + 2];
    if (a === b || b === c || a === c) continue;
    kept.push(a, b, c);
    used[a] = used[b] = used[c] = 1;
  }
  let simplified;
  if (kept.length < triCount * 0.2) {
    simplified = samplePerCell(geometry, cell, box, nx, ny, nz);
  } else {
    const remap = new Int32Array(reps.length).fill(-1);
    let vertexCount = 0;
    for (let r = 0; r < reps.length; r++) if (used[r]) remap[r] = vertexCount++;
    simplified = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      const attribute = geometry.attributes[name];
      if (!attribute) continue;
      const array = new Float32Array(vertexCount * attribute.itemSize);
      const source = attribute.array;
      let write = 0;
      for (let r = 0; r < reps.length; r++) {
        if (remap[r] < 0) continue;
        const offset = reps[r] * attribute.itemSize;
        for (let k = 0; k < attribute.itemSize; k++) array[write++] = source[offset + k];
      }
      simplified.setAttribute(name, new THREE.BufferAttribute(array, attribute.itemSize));
    }
    const indices = new Uint32Array(kept.length);
    for (let i = 0; i < kept.length; i++) indices[i] = remap[kept[i]];
    simplified.setIndex(new THREE.BufferAttribute(indices, 1));
    simplified.computeBoundingBox();
    simplified.computeBoundingSphere();
  }
  perCell.set(cell, simplified);
  return simplified;
}

/**
 * Stand-in: clustered geometry flattened into one mesh per material, so a distant
 * prop costs a handful of draw calls instead of one per screw and panel.
 */
function buildProxy(root, cellSize) {
  root.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const local = new THREE.Matrix4();
  // Geometry is baked into root-local space, so the clustering grid is measured
  // in those units; only the root's own scale has to be divided out.
  const rootScale = Math.max(
    Math.abs(root.matrixWorld.elements[0]),
    Math.abs(root.matrixWorld.elements[5]),
    Math.abs(root.matrixWorld.elements[10]),
  ) || 1;
  const cell = cellSize / rootScale;
  const batches = new Map();
  const loose = [];
  root.traverse(object => {
    if (!object.isMesh) return;
    const geometry = object.geometry;
    if (!geometry?.attributes?.position) return;
    const uv = !!geometry.attributes.uv;
    const batchable = uv && !Array.isArray(object.material) && !geometry.morphAttributes?.position;
    local.multiplyMatrices(inverse, object.matrixWorld);
    // Rack copies share source geometry and local transforms. Simplify each
    // shape once instead of repeating the expensive work for every rack.
    let variants = transformedClusterCache.get(geometry);
    if (!variants) { variants = new Map(); transformedClusterCache.set(geometry, variants); }
    const signature = `${cell}|${local.elements.map(value => Math.round(value * 1e6)).join(',')}`;
    let transformed = variants.get(signature);
    if (!transformed) {
      const baked = geometry.clone().applyMatrix4(local);
      transformed = clusterGeometry(baked, cell);
      if (transformed !== baked) baked.dispose();
      variants.set(signature, transformed);
    }
    if (!batchable) { loose.push({ geometry: transformed, material: object.material }); return; }
    // Attribute sets must match for merging, so they are part of the batch key.
    const key = `${object.material.uuid}|${Object.keys(transformed.attributes).sort().join(',')}`;
    if (!batches.has(key)) batches.set(key, { material: object.material, geometries: [] });
    batches.get(key).geometries.push(transformed);
  });
  const proxy = new THREE.Group();
  proxy.position.copy(root.position);
  proxy.quaternion.copy(root.quaternion);
  proxy.scale.copy(root.scale);
  proxy.name = `${root.name || 'prop'} stand-in`;
  const owned = new Set();
  for (const { material, geometries } of batches.values()) {
    const merged = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
    if (merged) {
      owned.add(merged);
      proxy.add(new THREE.Mesh(merged, material));
      continue;
    }
    for (const geometry of geometries) {
      owned.add(geometry);
      proxy.add(new THREE.Mesh(geometry, material));
    }
  }
  for (const { geometry, material } of loose) {
    owned.add(geometry);
    proxy.add(new THREE.Mesh(geometry, material));
  }
  return { group: proxy, geometries: owned };
}

export class DetailLod {
  constructor() {
    this.entries = [];
    this.enabled = true;
  }

  /**
   * @param {THREE.Object3D} root  static prop group already added to the scene
   * @param {object} [options]     overrides for DEFAULTS ranges
   */
  add(root, options = {}) {
    const ranges = { ...DEFAULTS, ...options };
    root.updateMatrixWorld(true);
    const detailMeshes = [];
    const shadowCasters = new Map();
    let triangles = 0;
    root.traverse(object => {
      if (!object.isMesh) return;
      triangles += triangleCount(object.geometry);
      shadowCasters.set(object, object.castShadow);
      if (object.userData.keepDetail) return;
      const size = new THREE.Box3().setFromObject(object).getSize(_size).length();
      if (size <= ranges.detailSize) detailMeshes.push(object);
    });
    const built = triangles >= ranges.proxyBudget ? buildProxy(root, ranges.cellSize) : null;
    const proxy = built?.group ?? null;
    if (proxy) {
      proxy.visible = false;
      proxy.userData.lodStandin = true;
      root.parent?.add(proxy);
    }
    const entry = {
      root, proxy, detailMeshes, shadowCasters, triangles, ranges,
      standinGeometries: built?.geometries ?? null, tier: 0,
    };
    entry.apply = () => {
      // Without a stand-in the model stays drawn at any distance; only its
      // small parts and its shadow pass are dropped.
      const tier = proxy ? entry.tier : Math.min(entry.tier, 1);
      root.visible = tier < 2;
      if (proxy) proxy.visible = tier === 2;
      for (const mesh of detailMeshes) mesh.visible = tier < 1;
      // A stand-in has no shadow pass; the full model keeps its shadows up close.
      for (const [mesh, cast] of shadowCasters) mesh.castShadow = cast && tier < 2;
    };
    this.entries.push(entry);
    return entry;
  }

  /** Register scene children by name, including numbered copies (`Name 2`, ...). */
  addByName(scene, names, options = {}) {
    const added = [];
    // Snapshot first: add() appends stand-ins to the same parent.
    for (const child of [...scene.children]) {
      if (child.userData.lodStandin) continue;
      if (!names.some(name => child.name === name || child.name.startsWith(`${name} `))) continue;
      added.push(this.add(child, options));
    }
    return added;
  }

  update(camera) {
    if (!this.enabled || !camera) return;
    const eye = camera.position;
    for (const entry of this.entries) {
      const distance = eye.distanceTo(entry.center ?? (entry.center = new THREE.Box3()
        .setFromObject(entry.root).getCenter(new THREE.Vector3())));
      const { detailRange, proxyRange, cullRange, hysteresis } = entry.ranges;
      const down = 1 - hysteresis;
      let tier = entry.tier;
      if (tier < 2) {
        if (distance > detailRange * down) tier = distance > proxyRange * down ? 2 : 1;
        else tier = 0;
      } else if (tier === 2) {
        tier = distance > cullRange * down ? 3 : distance < detailRange * down ? 0
          : distance < proxyRange * down ? 1 : 2;
      } else {
        tier = distance < cullRange * down ? 2 : 3;
      }
      if (tier !== entry.tier) {
        entry.tier = tier;
        entry.apply();
      }
    }
  }

  stats() {
    return this.entries.map(entry => {
      let standinTriangles = null;
      if (entry.proxy) {
        standinTriangles = 0;
        entry.proxy.traverse(object => {
          if (object.isMesh) standinTriangles += triangleCount(object.geometry);
        });
        standinTriangles = Math.round(standinTriangles);
      }
      return {
        name: entry.root.name,
        tier: entry.tier,
        triangles: Math.round(entry.triangles),
        detailMeshes: entry.detailMeshes.length,
        detailTriangles: Math.round(entry.detailMeshes
          .reduce((sum, mesh) => sum + triangleCount(mesh.geometry), 0)),
        standinTriangles,
      };
    });
  }

  dispose() {
    for (const entry of this.entries) {
      entry.proxy?.removeFromParent();
      // Stand-in geometry is built per prop, so it can be freed with the level.
      entry.standinGeometries?.forEach(geometry => geometry.dispose());
    }
    this.entries.length = 0;
  }
}
