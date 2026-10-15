import sys
from pathlib import Path
sys.path.insert(0, str(Path('tmp/usd-tools').resolve()))
from pxr import Usd, UsdGeom, UsdShade
s = Usd.Stage.Open(r'C:\Users\anovu\Downloads\Button_ru2.usdz')
print('upAxis', UsdGeom.GetStageUpAxis(s))
for p in s.Traverse():
    if p.IsA(UsdGeom.Mesh):
        m = UsdGeom.Mesh(p)
        print('MESH', p.GetPath(), len(m.GetPointsAttr().Get()), 'extent', m.GetExtentAttr().Get())
    if p.IsA(UsdShade.Shader):
        print('SHADER', p.GetPath(), [(i.GetBaseName(), str(i.Get())) for i in UsdShade.Shader(p).GetInputs()])
