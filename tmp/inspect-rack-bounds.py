import sys
from pathlib import Path
sys.path.insert(0,str(Path('tmp/usd-tools').resolve()))
from pxr import Usd,UsdGeom,UsdShade
for name in ['Data_Center_Server_Rack','Server_Racking_System']:
    stage=Usd.Stage.Open(str(Path(r'C:\Users\anovu\Downloads')/(name+'.usdz')))
    bounds=UsdGeom.BBoxCache(Usd.TimeCode.Default(),['default','render','proxy']).ComputeWorldBound(stage.GetPseudoRoot()).ComputeAlignedRange()
    print(name,'bounds',bounds)
    if name.startswith('Data'):
        for p in stage.Traverse():
            if p.IsA(UsdShade.Shader) and 'PBS5' in str(p.GetPath()): print(p.GetPath(),[(i.GetBaseName(),str(i.Get())) for i in UsdShade.Shader(p).GetInputs()])
