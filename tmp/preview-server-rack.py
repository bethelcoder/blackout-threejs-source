import json,struct
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection

def load(path):
 b=Path(path).read_bytes();n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);data=b[28+n:]
 def attr(i):
  a=d['accessors'][i];v=d['bufferViews'][a['bufferView']];size={'VEC3':3,'SCALAR':1}[a['type']]
  return np.frombuffer(data,dtype={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']],count=a['count']*size,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,size)
 tris=[];colors=[]
 def visit(i,parent):
  node=d['nodes'][i];matrix=np.array(node.get('matrix',np.eye(4).T.flatten())).reshape(4,4).T
  if 'translation' in node:matrix[:3,3]=node['translation']
  if 'scale' in node:matrix[:3,:3]@=np.diag(node['scale'])
  world=parent@matrix
  if 'mesh' in node:
   for p in d['meshes'][node['mesh']]['primitives']:
    pos=attr(p['attributes']['POSITION']);pos=(np.c_[pos,np.ones(len(pos))]@world.T)[:,:3]
    t=pos[attr(p['indices']).reshape(-1,3)];tris.append(t)
    mat=d['materials'][p['material']];color=mat.get('pbrMetallicRoughness',{}).get('baseColorFactor',[.6,.6,.6,1])[:3]
    color=np.maximum(color,mat.get('emissiveFactor',[0,0,0]));colors.append(np.tile(color,(len(t),1)))
  for child in node.get('children',[]):visit(child,world)
 for i in d['scenes'][d.get('scene',0)]['nodes']:visit(i,np.eye(4))
 return np.concatenate(tris),np.concatenate(colors)

fig,axes=plt.subplots(2,3,figsize=(12,9),facecolor='#19232e')
for row,path in enumerate(['tmp/server-racking-system-original.glb','src/assets/models/server-racking-system.glb']):
 t,c=load(path)
 print(path,'triangles',len(t),'bounds',t.min((0,1)),t.max((0,1)))
 for col,yaw in enumerate([0,.65,3.8]):
  co,si=np.cos(yaw),np.sin(yaw);rot=np.array([[co,0,si],[0,1,0],[-si,0,co]])
  v=t@rot.T
  normal=np.cross(v[:,1]-v[:,0],v[:,2]-v[:,0]);normal/=np.maximum(np.linalg.norm(normal,axis=1,keepdims=True),1e-10)
  shade=.32+.68*np.abs(normal@np.array([.35,.6,.72]))
  colors=np.clip(c**(1/2.2)*shade[:,None],0,1)
  order=np.argsort(v[:,:,2].mean(1));ax=axes[row,col]
  ax.add_collection(PolyCollection(v[order,:,:2],facecolors=colors[order],edgecolors='none',rasterized=True))
  ax.autoscale();ax.set_aspect('equal');ax.set_facecolor('#19232e');ax.axis('off');ax.set_title(('Original' if row==0 else 'Optimized')+f' / view {col+1}',color='white')
fig.tight_layout();fig.savefig('tmp/server-rack-comparison.png',dpi=120)
