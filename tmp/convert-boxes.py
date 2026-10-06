import sys, json
from pathlib import Path
sys.path.insert(0, str(Path('tmp/usd-tools').resolve()))
from pxr import Usd, UsdGeom, UsdShade, Gf

source = r'C:\Users\anovu\Downloads\Stacked_Cardboard_Boxes__Crafted_by_jerovdl.usdz'
stage = Usd.Stage.Open(source)
cache = UsdGeom.XformCache()
parts = []
for prim in stage.Traverse():
    if not prim.IsA(UsdGeom.Mesh):
        continue
    mesh = UsdGeom.Mesh(prim)
    points = mesh.GetPointsAttr().Get()
    counts = mesh.GetFaceVertexCountsAttr().Get()
    indices = mesh.GetFaceVertexIndicesAttr().Get()
    transform = cache.GetLocalToWorldTransform(prim)
    positions = []
    offset = 0
    for count in counts:
        for corner in range(1, count - 1):
            for vertex in (0, corner, corner + 1):
                point = transform.Transform(Gf.Vec3d(points[indices[offset + vertex]]))
                positions.extend(float(v) for v in point)
        offset += count
    color = [0.55, 0.36, 0.18]
    material, _ = UsdShade.MaterialBindingAPI(prim).ComputeBoundMaterial()
    if material:
        for shaderPrim in Usd.PrimRange(material.GetPrim()):
            if shaderPrim.IsA(UsdShade.Shader):
                diffuse = UsdShade.Shader(shaderPrim).GetInput('diffuseColor')
                if diffuse and diffuse.Get() is not None:
                    color = list(diffuse.Get())
    parts.append({'name': prim.GetName(), 'positions': positions, 'color': color})
assert parts, 'No meshes found in USDZ'
output = Path('src/assets/models/stacked-cardboard-boxes.json')
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps({'upAxis': str(UsdGeom.GetStageUpAxis(stage)), 'parts': parts}, separators=(',', ':')))
print(f'Converted {len(parts)} meshes, {sum(len(p["positions"]) // 9 for p in parts)} triangles; up axis {UsdGeom.GetStageUpAxis(stage)}')
