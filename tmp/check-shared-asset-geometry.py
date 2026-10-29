import json,struct,subprocess
from pathlib import Path
report=json.loads(Path('tmp/shared-texture-optimization.json').read_text())
def unpack(b):
 n=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+n]),b[28+n:]
for row in report:
 path=row['asset'];before=subprocess.run(['git','show',':'+path],capture_output=True,check=True).stdout;old,ob=unpack(before);new,nb=unpack(Path(path).read_bytes())
 assert old['accessors']==new['accessors'],path+' accessor changed'
 assert old['meshes']==new['meshes'],path+' mesh changed'
 assert old['nodes']==new['nodes'],path+' transform changed'
 images={i['bufferView'] for i in old.get('images',[]) if 'bufferView' in i}
 for i,(a,b) in enumerate(zip(old['bufferViews'],new['bufferViews'])):
  if i not in images:assert ob[a.get('byteOffset',0):a.get('byteOffset',0)+a['byteLength']]==nb[b.get('byteOffset',0):b.get('byteOffset',0)+b['byteLength']],path+' geometry bytes changed'
 print(path,': geometry, transforms, UVs and materials preserved')
