import sys,json
from pathlib import Path
sys.path.insert(0,str(Path('tmp/usd-tools').resolve()))
from pxr import Usd,UsdGeom,UsdShade
for name in ['Desk_design_1','Retro_computer']:
    stage=Usd.Stage.Open(str(Path(r'C:\Users\anovu\Downloads')/(name+'.usdz')))
    cache=UsdGeom.BBoxCache(Usd.TimeCode.Default(),['default','render','proxy'])
    rows=[]
    for p in stage.Traverse():
        if p.IsA(UsdGeom.Mesh):
            m=UsdGeom.Mesh(p); b=cache.ComputeWorldBound(p).ComputeAlignedRange()
            mat,_=UsdShade.MaterialBindingAPI(p).ComputeBoundMaterial()
            rows.append({'path':str(p.GetPath()),'points':len(m.GetPointsAttr().Get()),'min':list(b.GetMin()),'max':list(b.GetMax()),'material':str(mat.GetPath()) if mat else None})
    Path('tmp/'+name+'-meshes.json').write_text(json.dumps(rows,indent=2))
    print(name,'axis',UsdGeom.GetStageUpAxis(stage),'meshes',len(rows))
    for r in rows: print(r)
    for p in stage.Traverse():
        if p.IsA(UsdShade.Shader): print('SHADER',p.GetPath(),[(i.GetBaseName(),str(i.Get())) for i in UsdShade.Shader(p).GetInputs()])
