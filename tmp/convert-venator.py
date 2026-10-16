import sys, json, struct, zipfile
from pathlib import Path
sys.path.insert(0, str(Path('tmp/usd-tools').resolve()))
from pxr import Usd, UsdGeom, Gf
source = r'C:\Users\anovu\Downloads\Star_Wars_The_Clone_Wars_Venator_Prefab.usdz'
stage = Usd.Stage.Open(source)
cache = UsdGeom.XformCache()
blob = bytearray()
doc = {'asset': {'version': '2.0', 'generator': 'Venator wall and overhead modules from USDZ'}, 'buffers': [{}], 'bufferViews': [], 'accessors': [], 'meshes': [], 'nodes': [], 'scenes': [{'nodes': []}], 'scene': 0, 'images': [], 'textures': [], 'materials': []}
def view(data):
    while len(blob) % 4: blob.append(0)
    i = len(doc['bufferViews'])
    doc['bufferViews'].append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(data)})
    blob.extend(data)
    return i
def attribute(values, size, kind):
    i = len(doc['accessors'])
    acc = {'bufferView': view(struct.pack('<' + 'f' * len(values), *values)), 'componentType': 5126, 'count': len(values) // size, 'type': kind}
    if kind == 'VEC3':
        acc['min'] = [min(values[a::size]) for a in range(size)]
        acc['max'] = [max(values[a::size]) for a in range(size)]
    doc['accessors'].append(acc)
    return i
with zipfile.ZipFile(source) as archive:
    for prefix in ['VenatorV3_WallPanels', 'VenatorV3_SmallDoor_WallLight']:
        textures = {}
        for suffix in ['baseColor', 'metallicRoughness_metal', 'metallicRoughness_rough', 'normal', 'emissive']:
            name = f'0/{prefix}_{suffix}.jpg'
            if name not in archive.namelist(): continue
            index = len(doc['textures'])
            doc['images'].append({'bufferView': view(archive.read(name)), 'mimeType': 'image/jpeg'})
            doc['textures'].append({'source': len(doc['images']) - 1})
            textures[suffix] = index
        material = {'name': prefix, 'pbrMetallicRoughness': {'baseColorTexture': {'index': textures['baseColor']}, 'metallicFactor': 1, 'roughnessFactor': 1}, 'normalTexture': {'index': textures['normal']},
                    'extras': {'metalnessTexture': textures['metallicRoughness_metal'], 'roughnessTexture': textures['metallicRoughness_rough']}}
        if 'emissive' in textures:
            material.update({'emissiveTexture': {'index': textures['emissive']}, 'emissiveFactor': [1, 1, 1]})
        doc['materials'].append(material)

for prim in stage.Traverse():
    if not prim.IsA(UsdGeom.Mesh): continue
    name = prim.GetParent().GetParent().GetName()
    if name not in ('WallPanel6', 'WallPanel8', 'VenatorLight7'): continue
    mesh = UsdGeom.Mesh(prim)
    transform = cache.GetLocalToWorldTransform(prim)
    pts = [transform.Transform(Gf.Vec3d(p)) for p in mesh.GetPointsAttr().Get()]
    mins = [min(p[a] for p in pts) for a in range(3)]
    maxs = [max(p[a] for p in pts) for a in range(3)]
    sizes = [maxs[a] - mins[a] for a in range(3)]
    isLight = name.startswith('VenatorLight')
    # Wall faces +Z, width 1, height 1, with all relief behind the mounting plane.
    # Light runs along +Z, width/length 1; y=0 is the underside of its housing.
    if isLight:
        pts = [[(p[0] - (mins[0] + maxs[0]) / 2) / sizes[0], (p[1] - mins[1]) * 4 / sizes[2], (p[2] - (mins[2] + maxs[2]) / 2) / sizes[2]] for p in pts]
        scale = Gf.Matrix4d().SetScale(Gf.Vec3d(1 / sizes[0], 4 / sizes[2], 1 / sizes[2]))
    else:
        pts = [[(p[0] - (mins[0] + maxs[0]) / 2) / sizes[0], (p[1] - mins[1]) / sizes[1], (p[2] - maxs[2]) * 4.2 / sizes[1]] for p in pts]
        scale = Gf.Matrix4d().SetScale(Gf.Vec3d(1 / sizes[0], 1 / sizes[1], 4.2 / sizes[1]))
    # Normals must include the inverse-transpose of the canonical scaling.
    normalTransform = (transform * scale).GetInverse().GetTranspose()
    normals = mesh.GetNormalsAttr().Get()
    normalMode = mesh.GetNormalsInterpolation()
    uv = next(v for v in UsdGeom.PrimvarsAPI(prim).GetPrimvars() if str(v.GetTypeName()).startswith('texCoord2'))
    uvs = uv.ComputeFlattened()
    uvMode = uv.GetInterpolation()
    indices = mesh.GetFaceVertexIndicesAttr().Get()
    positions, outNormals, outUvs = [], [], []
    def ix(mode, fv, vertex, face): return fv if mode == 'faceVarying' else vertex if mode in ('vertex', 'varying') else face if mode == 'uniform' else 0
    offset = 0
    for face, count in enumerate(mesh.GetFaceVertexCountsAttr().Get()):
        for corner in range(1, count - 1):
            for c in (0, corner, corner + 1):
                fv = offset + c
                vertex = indices[fv]
                positions.extend(pts[vertex])
                st = uvs[ix(uvMode, fv, vertex, face)]
                outUvs.extend([st[0], 1 - st[1]])
                if normals: outNormals.extend(normalTransform.TransformDir(Gf.Vec3d(normals[ix(normalMode, fv, vertex, face)])).GetNormalized())
        offset += count
    attrs = {'POSITION': attribute(positions, 3, 'VEC3'), 'TEXCOORD_0': attribute(outUvs, 2, 'VEC2')}
    if outNormals: attrs['NORMAL'] = attribute(outNormals, 3, 'VEC3')
    i = len(doc['meshes'])
    doc['meshes'].append({'name': name, 'primitives': [{'attributes': attrs, 'material': 1 if isLight else 0}]})
    doc['nodes'].append({'name': name, 'mesh': i})
    doc['scenes'][0]['nodes'].append(i)
    print(name, len(positions) // 9, 'triangles')
assert len(doc['meshes']) == 3
doc['buffers'][0]['byteLength'] = len(blob)
jsonBytes = json.dumps(doc, separators=(',', ':')).encode()
jsonBytes += b' ' * (-len(jsonBytes) % 4)
blob += b'\0' * (-len(blob) % 4)
glb = struct.pack('<III', 0x46546c67, 2, 12 + 8 + len(jsonBytes) + 8 + len(blob)) + struct.pack('<II', len(jsonBytes), 0x4e4f534a) + jsonBytes + struct.pack('<II', len(blob), 0x004e4942) + blob
Path('src/assets/models/venator-room-modules.glb').write_bytes(glb)
print('GLB bytes', len(glb), 'embedded textures', len(doc['textures']))
