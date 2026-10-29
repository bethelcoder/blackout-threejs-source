import fs from 'node:fs';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier } from './rack-optimizer/node_modules/meshoptimizer/index.js';
await MeshoptSimplifier.ready;
const path = 'src/assets/models/server-racking-system.glb';
const backup = 'tmp/server-racking-system-original.glb';
if (!fs.existsSync(backup)) fs.copyFileSync(path, backup);
const input = fs.readFileSync(backup);
const length = input.readUInt32LE(12);
const doc = JSON.parse(input.subarray(20, 20 + length));
const bin = input.subarray(28 + length);
const oldViews = doc.bufferViews, oldAccessors = doc.accessors;
doc.bufferViews = []; doc.accessors = [];
const chunks = []; let offset = 0;
function read(index) {
  const a = oldAccessors[index], v = oldViews[a.bufferView];
  const Type = {5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array}[a.componentType];
  const size = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4}[a.type];
  const start = (v.byteOffset || 0) + (a.byteOffset || 0);
  const bytes = bin.subarray(start, start + a.count * size * Type.BYTES_PER_ELEMENT);
  return {array: new Type(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)), size};
}
function write(array, size, type, target) {
  const padding = (4 - offset % 4) % 4;
  if (padding) { chunks.push(Buffer.alloc(padding)); offset += padding; }
  const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
  const view = doc.bufferViews.length;
  doc.bufferViews.push({buffer: 0, byteOffset: offset, byteLength: bytes.length, target});
  chunks.push(bytes); offset += bytes.length;
  const a = {bufferView: view, componentType: type, count: array.length / size, type: {1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4'}[size]};
  if (size === 3 && type === 5126) {
    a.min = [Infinity,Infinity,Infinity]; a.max = [-Infinity,-Infinity,-Infinity];
    for (let i=0;i<array.length;i++) { const c=i%3; a.min[c]=Math.min(a.min[c],array[i]);a.max[c]=Math.max(a.max[c],array[i]); }
  }
  doc.accessors.push(a); return doc.accessors.length - 1;
}
const report = [];
for (const mesh of doc.meshes) for (const p of mesh.primitives) {
  let geo = new THREE.BufferGeometry();
  for (const [name, index] of Object.entries(p.attributes)) {
    const a = read(index); geo.setAttribute(name, new THREE.BufferAttribute(a.array, a.size));
  }
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(read(p.indices).array), 1));
  geo = mergeVertices(geo, 1e-6);
  const before = geo.index.count / 3;
  const positions = geo.attributes.POSITION.array;
  const normals = geo.attributes.NORMAL.array;
  // Keep hard edges and material borders; constrain shape error to 0.1%.
  const [indices, error] = MeshoptSimplifier.simplifyWithAttributes(
    new Uint32Array(geo.index.array), positions, 3, normals, 3, [0.5,0.5,0.5], null,
    Math.floor(geo.index.count * 0.3 / 3) * 3, 0.001, ['LockBorder']);
  const used = new Map(); const oldVertices = [];
  const compact = Array.from(indices, old => {
    if (!used.has(old)) {used.set(old, used.size);oldVertices.push(old);}
    return used.get(old);
  });
  for (const [name, a] of Object.entries(geo.attributes)) {
    const array = new Float32Array(oldVertices.length * a.itemSize);
    oldVertices.forEach((v,i) => array.set(a.array.subarray(v*a.itemSize,(v+1)*a.itemSize),i*a.itemSize));
    p.attributes[name] = write(array, a.itemSize, 5126, 34962);
  }
  const out = used.size <= 65535 ? new Uint16Array(compact) : new Uint32Array(compact);
  p.indices = write(out, 1, out instanceof Uint16Array ? 5123 : 5125, 34963);
  report.push({mesh:mesh.name,before,after:indices.length/3,error});
}
doc.buffers = [{byteLength:offset}];
let json = Buffer.from(JSON.stringify(doc));
json = Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
let binary = Buffer.concat(chunks); binary = Buffer.concat([binary,Buffer.alloc((4-binary.length%4)%4)]);
const header = Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+binary.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
const bh = Buffer.alloc(8);bh.writeUInt32LE(binary.length,0);bh.writeUInt32LE(0x004e4942,4);
const output = Buffer.concat([header,json,bh,binary]);fs.writeFileSync(path,output);
const result = {beforeBytes:input.length,afterBytes:output.length,meshes:report};
fs.writeFileSync('tmp/server-rack-optimization.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
