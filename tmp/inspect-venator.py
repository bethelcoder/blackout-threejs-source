import sys, json
from pathlib import Path
sys.path.insert(0, str(Path('tmp/usd-tools').resolve()))
from pxr import Usd, UsdGeom, UsdShade
s = Usd.Stage.Open(r'C:\Users\anovu\Downloads\Star_Wars_The_Clone_Wars_Venator_Prefab.usdz')
cache = UsdGeom.BBoxCache(Usd.TimeCode.Default(), ['default', 'render', 'proxy'])
rows=[]
for p in s.Traverse():
    if p.IsA(UsdGeom.Mesh):
        m=UsdGeom.Mesh(p)
        bounds=cache.ComputeWorldBound(p).ComputeAlignedRange()
        mat,_=UsdShade.MaterialBindingAPI(p).ComputeBoundMaterial()
        rows.append({'path':str(p.GetPath()),'points':len(m.GetPointsAttr().Get()),'min':list(bounds.GetMin()),'max':list(bounds.GetMax()),'material':str(mat.GetPath()) if mat else None})
Path('tmp/venator-meshes.json').write_text(json.dumps(rows,indent=2))
print('axis',UsdGeom.GetStageUpAxis(s),'mesh count',len(rows))
for row in rows[:100]: print(row)
for p in s.Traverse():
    if p.IsA(UsdShade.Shader): print('SHADER',p.GetPath(),[(i.GetBaseName(),str(i.Get())) for i in UsdShade.Shader(p).GetInputs()])
