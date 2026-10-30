import io,json,struct
from pathlib import Path
from PIL import Image
assets={'public/models/radiation-wall-sign.glb':512}

report=[]
for name,limit in assets.items():
 p=Path(name);data=p.read_bytes();jl=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+jl]);binary=data[28+jl:];replacements={};before=after=0
 for image in doc.get('images',[]):
  if 'bufferView' not in image:continue
  idx=image['bufferView'];v=doc['bufferViews'][idx];raw=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
  im=Image.open(io.BytesIO(raw));before+=im.width*im.height*4*4/3
  if max(im.size)>limit:
   im.thumbnail((limit,limit),Image.Resampling.LANCZOS);out=io.BytesIO()
   if image.get('mimeType')=='image/png':im.save(out,format='PNG',optimize=True)
   else:im.convert('RGB').save(out,format='JPEG',quality=90)
   replacements[idx]=out.getvalue()
  after+=im.width*im.height*4*4/3
 if not replacements:continue
 blob=bytearray()
 for idx,v in enumerate(doc['bufferViews']):
  while len(blob)%4:blob.append(0)
  raw=replacements.get(idx,binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])
  v['byteOffset']=len(blob);v['byteLength']=len(raw);blob.extend(raw)
 doc['buffers'][0]['byteLength']=len(blob)
 while len(blob)%4:blob.append(0)
 j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*(-len(j)%4)
 out=struct.pack('<III',0x46546c67,2,28+len(j)+len(blob))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(blob),0x004e4942)+blob
 p.write_bytes(out)
 report.append({'asset':name,'maxTextureSize':limit,'beforeMiB':round(before/1048576,2),'afterMiB':round(after/1048576,2)})
Path('tmp/wall-sign-optimization.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2));print('TOTAL MiB',sum(r['beforeMiB'] for r in report),'->',sum(r['afterMiB'] for r in report))
