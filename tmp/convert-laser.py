import sys, json
from pathlib import Path
sys.path.insert(0, str(Path('tmp/usd-tools').resolve()))
from pxr import Usd, UsdGeom, Gf

stage = Usd.Stage.Open(r'C:\Users\anovu\Downloads\Low_Poly__Laser_Sight_Attachment.usdz')
matches = [p for p in stage.Traverse() if p.IsA(UsdGeom.Mesh) and str(p.GetPath()).endswith('/Cylinder/Cylinder_Green_0/Cylinder_Green_0')]
assert len(matches) == 1, 'Expected the standalone beam mesh, excluding all sight hardware'
prim = matches[0]
mesh = UsdGeom.Mesh(prim)
transform = UsdGeom.XformCache().GetLocalToWorldTransform(prim)
points = [list(transform.Transform(Gf.Vec3d(p))) for p in mesh.GetPointsAttr().Get()]
mins = [min(p[a] for p in points) for a in range(3)]
maxs = [max(p[a] for p in points) for a in range(3)]
sizes = [maxs[a] - mins[a] for a in range(3)]
axis = max(range(3), key=lambda a: sizes[a])
cross = [a for a in range(3) if a != axis]
radius = max(sizes[a] for a in cross) / 2
normalized = [[(p[cross[0]] - (mins[cross[0]] + maxs[cross[0]]) / 2) / radius,
               (p[axis] - (mins[axis] + maxs[axis]) / 2) / sizes[axis],
               (p[cross[1]] - (mins[cross[1]] + maxs[cross[1]]) / 2) / radius] for p in points]
indices = mesh.GetFaceVertexIndicesAttr().Get()
positions = []
offset = 0
for count in mesh.GetFaceVertexCountsAttr().Get():
    for c in range(1, count - 1):
        for v in (0, c, c + 1):
            positions.extend(normalized[indices[offset + v]])
    offset += count
Path('src/assets/models/laser-beam.json').write_text(json.dumps({
    'source': 'Low_Poly__Laser_Sight_Attachment.usdz', 'mesh': str(prim.GetPath()),
    'positions': positions, 'color': [0, 1, 0.33631012],
}, separators=(',', ':')))
print('Extracted beam only:', len(positions) // 9, 'triangles; original dimensions', sizes)
