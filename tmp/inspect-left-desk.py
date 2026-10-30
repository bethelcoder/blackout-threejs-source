import sys, zipfile
sys.path.insert(0, 'tmp/usd-tools')
from pxr import Usd, UsdGeom, Gf
for filename in ['Computer_Desk.usdz', 'Personal_Computer (1).usdz']:
    path = 'C:/Users/anovu/Downloads/' + filename
    stage = Usd.Stage.Open(path)
    print(filename, stage.GetRootLayer().customLayerData)
    print(zipfile.ZipFile(path).namelist())
    cache = UsdGeom.XformCache()
    for prim in stage.Traverse():
        if not prim.IsA(UsdGeom.Mesh): continue
        mesh = UsdGeom.Mesh(prim)
        transform = cache.GetLocalToWorldTransform(prim)
        points = [transform.Transform(Gf.Vec3d(p)) for p in mesh.GetPointsAttr().Get()]
        print(prim.GetName(), len(points), [(round(min(p[a] for p in points), 2), round(max(p[a] for p in points), 2)) for a in range(3)])
