import struct,json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
b=open('src/assets/models/retro-computer.glb','rb').read();n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);base=28+n
faces=[]
for mesh in d['meshes']:
    acc=d['accessors'][mesh['primitives'][0]['attributes']['POSITION']];v=d['bufferViews'][acc['bufferView']]
    pts=struct.unpack_from('<'+'f'*acc['count']*3,b,base+v['byteOffset'])
    for i in range(0,len(pts),9*5):
        faces.append([[pts[i+k],pts[i+k+2],pts[i+k+1]] for k in (0,3,6)])
fig=plt.figure(figsize=(12,6))
for i,az in enumerate([35,215]):
    ax=fig.add_subplot(1,2,i+1,projection='3d');ax.add_collection3d(Poly3DCollection(faces,facecolors='#a7b4bc',edgecolors='#4c5661',linewidths=.1))
    ax.set_xlim(-100,100);ax.set_ylim(-67,67);ax.set_zlim(-78,78);ax.set_box_aspect((200,134,156));ax.view_init(elev=35,azim=az);ax.set_xlabel('X');ax.set_ylabel('Z');ax.set_zlabel('Y')
fig.tight_layout();fig.savefig('tmp/retro-layout.png',dpi=120)
