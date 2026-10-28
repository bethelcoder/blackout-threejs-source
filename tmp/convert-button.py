import sys, json
from pathlib import Path
sys.path.insert(0, str(Path('tmp/usd-tools').resolve()))
from pxr import Usd, UsdGeom, Gf
stage = Usd.Stage.Open(r'C:\Users\anovu\Downloads\Button_ru2.usdz')
cache = UsdGeom.XformCache()
parts = []
for prim in stage.Traverse():
    if not prim.IsA(UsdGeom.Mesh): continue
    mesh = UsdGeom.Mesh(prim)
    transform = cache.GetLocalToWorldTransform(prim)
    points = mesh.GetPointsAttr().Get()
    normals = mesh.GetNormalsAttr().Get()
    normalMode = mesh.GetNormalsInterpolation()
    normalTransform = transform.GetInverse().GetTranspose()
    uvPrimvars = [p for p in UsdGeom.PrimvarsAPI(prim).GetPrimvars() if str(p.GetTypeName()).startswith('texCoord2')]
    uvPrimvar = uvPrimvars[0] if uvPrimvars else None
    uvs = uvPrimvar.ComputeFlattened() if uvPrimvar else [(0, 0)]
    uvMode = uvPrimvar.GetInterpolation() if uvPrimvar else 'constant'
    indices = mesh.GetFaceVertexIndicesAttr().Get()
    positions, outNormals, outUvs = [], [], []
    offset = 0
    for face, count in enumerate(mesh.GetFaceVertexCountsAttr().Get()):
        for corner in range(1, count - 1):
            for v in (0, corner, corner + 1):
                fv = offset + v
                vertex = indices[fv]
                positions.extend(transform.Transform(Gf.Vec3d(points[vertex])))
                uvIndex = fv if uvMode == 'faceVarying' else vertex if uvMode in ('vertex', 'varying') else face if uvMode == 'uniform' else 0
                outUvs.extend(uvs[uvIndex])
                if normals:
                    ni = fv if normalMode == 'faceVarying' else vertex if normalMode in ('vertex', 'varying') else face if normalMode == 'uniform' else 0
                    outNormals.extend(normalTransform.TransformDir(Gf.Vec3d(normals[ni])).GetNormalized())
        offset += count
    parts.append({'name': prim.GetName(), 'positions': positions, 'normals': outNormals, 'uvs': outUvs, 'pressable': 'Circle_001' in str(prim.GetPath())})
    print(prim.GetName(), 'world bounds', [(min(positions[a::3]), max(positions[a::3])) for a in range(3)], 'UV', uvMode)
Path('src/assets/models/button/button.json').write_text(json.dumps({'source': 'Button_ru2.usdz', 'parts': parts}, separators=(',', ':')))
