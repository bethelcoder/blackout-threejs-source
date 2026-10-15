import sys, json, struct, zipfile
from pathlib import Path
sys.path.insert(0, str(Path('tmp/usd-tools').resolve()))
from pxr import Usd, UsdGeom, Gf

source = r'C:\Users\anovu\Downloads\Modular_Sci-fi_Floor.usdz'
stage = Usd.Stage.Open(source)
cache = UsdGeom.XformCache()
blob = bytearray()
doc = {'asset': {'version': '2.0', 'generator': 'USD floor module conversion'}, 'buffers': [{}], 'bufferViews': [], 'accessors': [], 'meshes': [], 'nodes': [], 'scenes': [{'nodes': []}], 'scene': 0, 'images': [], 'textures': [], 'materials': []}
def view(data):
    while len(blob) % 4: blob.append(0)
    index = len(doc['bufferViews'])
    doc['bufferViews'].append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(data)})
    blob.extend(data)
    return index
def attribute(values, components, kind):
    index = len(doc['accessors'])
    data = struct.pack('<' + 'f' * len(values), *values)
    acc = {'bufferView': view(data), 'componentType': 5126, 'count': len(values) // components, 'type': kind}
    if kind == 'VEC3':
        acc['min'] = [min(values[a::components]) for a in range(components)]
        acc['max'] = [max(values[a::components]) for a in range(components)]
    doc['accessors'].append(acc)
    return index
with zipfile.ZipFile(source) as archive:
    for name in ['Scene_-_Root_baseColor.jpg', 'Scene_-_Root_metallicRoughness_metal.jpg', 'Scene_-_Root_normal.jpg', 'Scene_-_Root_emissive.jpg']:
        image = len(doc['images'])
        doc['images'].append({'bufferView': view(archive.read('0/' + name)), 'mimeType': 'image/jpeg'})
        doc['textures'].append({'source': image})
# Separate metal map is grayscale; roughness in the source is a constant.
doc['materials'].append({'name': 'Original sci-fi floor', 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicRoughnessTexture': {'index': 1}, 'metallicFactor': 1, 'roughnessFactor': 0.75}, 'normalTexture': {'index': 2}, 'emissiveTexture': {'index': 3}, 'emissiveFactor': [1, 1, 1]})
selected = ('Cube_000__0', 'Cube_012__0', 'Cube_013__0', 'Cube_018__0')
for prim in stage.Traverse():
    if not prim.IsA(UsdGeom.Mesh) or prim.GetName() not in selected: continue
    mesh = UsdGeom.Mesh(prim)
    transform = cache.GetLocalToWorldTransform(prim)
    points = [transform.Transform(Gf.Vec3d(p)) for p in mesh.GetPointsAttr().Get()]
    mins = [min(p[a] for p in points) for a in range(3)]
    maxs = [max(p[a] for p in points) for a in range(3)]
    scale = 2 / (maxs[0] - mins[0])
    points = [[(p[0] - (mins[0] + maxs[0]) / 2) * scale, (p[1] - maxs[1]) * scale, (p[2] - (mins[2] + maxs[2]) / 2) * 2 / (maxs[2] - mins[2])] for p in points]
    normals = mesh.GetNormalsAttr().Get()
    normalMode = mesh.GetNormalsInterpolation()
    normalTransform = transform.GetInverse().GetTranspose()
    uvPrimvar = next(p for p in UsdGeom.PrimvarsAPI(prim).GetPrimvars() if str(p.GetTypeName()).startswith('texCoord2'))
    uvs = uvPrimvar.ComputeFlattened()
    uvMode = uvPrimvar.GetInterpolation()
    indices = mesh.GetFaceVertexIndicesAttr().Get()
    positions, outNormals, outUvs = [], [], []
    offset = 0
    def attributeIndex(mode, fv, vertex, face):
        return fv if mode == 'faceVarying' else vertex if mode in ('vertex', 'varying') else face if mode == 'uniform' else 0
    for face, count in enumerate(mesh.GetFaceVertexCountsAttr().Get()):
        for corner in range(1, count - 1):
            for v in (0, corner, corner + 1):
                fv = offset + v
                vertex = indices[fv]
                positions.extend(points[vertex])
                # GLTFLoader uses flipY=false, so convert USD texture coordinates.
                uv = uvs[attributeIndex(uvMode, fv, vertex, face)]
                outUvs.extend([uv[0], 1 - uv[1]])
                if normals:
                    outNormals.extend(normalTransform.TransformDir(Gf.Vec3d(normals[attributeIndex(normalMode, fv, vertex, face)])).GetNormalized())
        offset += count
    attrs = {'POSITION': attribute(positions, 3, 'VEC3'), 'TEXCOORD_0': attribute(outUvs, 2, 'VEC2')}
    if outNormals: attrs['NORMAL'] = attribute(outNormals, 3, 'VEC3')
    mi = len(doc['meshes'])
    doc['meshes'].append({'name': prim.GetName(), 'primitives': [{'attributes': attrs, 'material': 0}]})
    doc['nodes'].append({'name': prim.GetName(), 'mesh': mi})
    doc['scenes'][0]['nodes'].append(mi)
    print(prim.GetName(), len(positions) // 9, 'triangles', 'original bounds', mins, maxs)
assert len(doc['meshes']) == 4
doc['buffers'][0]['byteLength'] = len(blob)
jsonBytes = json.dumps(doc, separators=(',', ':')).encode()
jsonBytes += b' ' * (-len(jsonBytes) % 4)
blob += b'\0' * (-len(blob) % 4)
glb = struct.pack('<III', 0x46546c67, 2, 12 + 8 + len(jsonBytes) + 8 + len(blob)) + struct.pack('<II', len(jsonBytes), 0x4e4f534a) + jsonBytes + struct.pack('<II', len(blob), 0x004e4942) + blob
output = Path('src/assets/models/modular-sci-fi-floor.glb')
output.write_bytes(glb)
print('Wrote', len(glb), 'bytes with embedded original textures')
