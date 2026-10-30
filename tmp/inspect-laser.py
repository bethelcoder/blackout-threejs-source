import sys
from pathlib import Path
sys.path.insert(0, str(Path('tmp/usd-tools').resolve()))
from pxr import Usd, UsdGeom, UsdShade
stage = Usd.Stage.Open(r'C:\Users\anovu\Downloads\Low_Poly__Laser_Sight_Attachment.usdz')
for prim in stage.Traverse():
    if prim.IsA(UsdGeom.Mesh):
        mesh = UsdGeom.Mesh(prim)
        mat, _ = UsdShade.MaterialBindingAPI(prim).ComputeBoundMaterial()
        print(prim.GetPath(), 'points', len(mesh.GetPointsAttr().Get()), 'material', mat.GetPath() if mat else None)
    if prim.IsA(UsdShade.Shader):
        print(prim.GetPath(), [(i.GetBaseName(), str(i.Get())) for i in UsdShade.Shader(prim).GetInputs()])
Path('tmp/laser-inspection.usda').write_text(stage.GetRootLayer().ExportToString())
