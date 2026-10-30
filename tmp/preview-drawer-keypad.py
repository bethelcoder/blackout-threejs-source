import json,struct,io
from PIL import Image,ImageDraw
import numpy as np
from pathlib import Path
b=Path('public/models/drawer-keypad.glb').read_bytes();jl=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+jl]);base=28+jl
p=j['meshes'][0]['primitives'][0]
def arr(k,n):
 a=j['accessors'][p['attributes'][k]];v=j['bufferViews'][a['bufferView']];return np.frombuffer(b,dtype='<f4',count=a['count']*n,offset=base+v.get('byteOffset',0)).reshape(-1,n)
pts=arr('POSITION',3);uv=arr('TEXCOORD_0',2)
v=j['bufferViews'][j['images'][0]['bufferView']];tex=Image.open(io.BytesIO(b[base+v['byteOffset']:base+v['byteOffset']+v['byteLength']])).convert('RGB')
w,h=400,572;out=Image.new('RGB',(w,h),'#10151e');height=np.ptp(pts[:,1])*1.07
screen=np.stack((w/2+pts[:,0]/(height*.7)*w,h/2-pts[:,1]/height*h),axis=1)
for t in sorted(range(len(pts)//3),key=lambda t:pts[t*3:t*3+3,2].mean()):
 xy=screen[t*3:t*3+3]; coords=uv[t*3:t*3+3]*tex.size
 mat=np.c_[xy,np.ones(3)]
 if abs(np.linalg.det(mat))<.01:continue
 x0=max(0,int(np.floor(xy[:,0].min())));y0=max(0,int(np.floor(xy[:,1].min())));x1=min(w,int(np.ceil(xy[:,0].max())));y1=min(h,int(np.ceil(xy[:,1].max())))
 if x1<=x0 or y1<=y0:continue
 coef=np.linalg.solve(mat,coords);a,bb,c=coef[:,0];d,e,f=coef[:,1]
 patch=tex.transform((x1-x0,y1-y0),Image.Transform.AFFINE,(a,bb,c+a*x0+bb*y0,d,e,f+d*x0+e*y0),Image.Resampling.BILINEAR)
 mask=Image.new('L',patch.size);ImageDraw.Draw(mask).polygon([(x-x0,y-y0) for x,y in xy],fill=255);out.paste(patch,(x0,y0),mask)
# Mark clickable button bounds for alignment verification.
draw=ImageDraw.Draw(out)
for i,k in enumerate('123456789*0#'):
 x=(i%3-1)*1.82225;y=2.2129-(i//3)*1.86496
 cx=w/2+x/(height*.7)*w;cy=h/2-y/height*h;rw=1.5/(height*.7)*w;rh=1.5/height*h
 draw.rectangle((cx-rw/2,cy-rh/2,cx+rw/2,cy+rh/2),outline='#00ffff',width=1)
out.save('tmp/drawer-keypad-alignment.png')
