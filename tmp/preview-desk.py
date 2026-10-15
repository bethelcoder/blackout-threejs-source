import sys
from pathlib import Path
sys.path.insert(0,str(Path('tmp/usd-tools').resolve()))
from pxr import Usd,UsdGeom,Gf
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
stage=Usd.Stage.Open(r'C:\Users\anovu\Downloads\Desk_design_1.usdz')
cache=UsdGeom.XformCache()
triangles=[]
for p in stage.Traverse():
    if not p.IsA(UsdGeom.Mesh): continue
    mesh=UsdGeom.Mesh(p); transform=cache.GetLocalToWorldTransform(p)
    pts=[list(transform.Transform(Gf.Vec3d(v))) for v in mesh.GetPointsAttr().Get()]
    indices=mesh.GetFaceVertexIndicesAttr().Get(); offset=0
    for count in mesh.GetFaceVertexCountsAttr().Get():
        for j in range(1,count-1): triangles.append([pts[indices[offset+k]] for k in (0,j,j+1)])
        offset+=count
fig=plt.figure(figsize=(12,6))
for i,az in enumerate([35,215]):
    ax=fig.add_subplot(1,2,i+1,projection='3d')
    # Matplotlib Z is vertical; USD Y is vertical.
    faces=[[[v[0],v[2],v[1]] for v in t] for t in triangles]
    ax.add_collection3d(Poly3DCollection(faces,facecolors='#a7b4bc',edgecolors='#4c5661',linewidths=.15))
    ax.set_xlim(-100,250);ax.set_ylim(-160,320);ax.set_zlim(0,310)
    ax.set_box_aspect((350,480,310));ax.view_init(elev=30,azim=az)
    ax.set_xlabel('X');ax.set_ylabel('Z');ax.set_zlabel('Y')
fig.tight_layout();fig.savefig('tmp/desk-layout.png',dpi=120)
