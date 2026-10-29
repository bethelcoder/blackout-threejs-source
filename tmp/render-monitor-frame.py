import json,struct,io
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
b=Path('public/models/sci-fi-monitor.glb').read_bytes();jl=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+jl]);base=28+jl
out=Image.new('RGBA',(1100,760));tris=[]
for m in j['meshes']:
 if m['name'] in ['BG','pPlane1']:continue
 for p in m['primitives']:
  a=j['accessors'][p['attributes']['POSITION']];v=j['bufferViews'][a['bufferView']];pts=np.frombuffer(b,dtype='<f4',count=a['count']*3,offset=base+v.get('byteOffset',0)).reshape(-1,3)
  if abs(pts[:,0]).max()>8.1:continue
  mat=j['materials'][p['material']];rgb=mat['pbrMetallicRoughness']['baseColorFactor'][:3]
  color=tuple(int(255*c**(1/2.2)) for c in rgb)+(255,)
  if mat['name']=='TV_MTL':color=(44,65,86,255)
  for i in range(0,len(pts),3):
   t=pts[i:i+3];xy=[((x+8.4)/16.8*1100,(11.9-y)/11.8*760) for x,y,z in t];tris.append((t[:,2].mean(),xy,color))
d=ImageDraw.Draw(out)
for _,xy,col in sorted(tris,key=lambda t:t[0]):d.polygon(xy,fill=col)
Path('src/assets/ui').mkdir(exist_ok=True)
out.save('src/assets/ui/sci-fi-monitor-frame.png')
with __import__('zipfile').ZipFile(r'C:\Users\anovu\Downloads\sci_fi_monitor.usdz') as z:
 im=Image.open(io.BytesIO(z.read('0/BG_MTL_baseColor.png')));im.crop((92,170,928,864)).resize((600,500)).save('src/assets/ui/monitor-grid.png')
