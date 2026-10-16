import struct,json
from pathlib import Path
p=Path('src/assets/models/data-center-server-rack.glb')
b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];doc=json.loads(b[20:20+n])
for material in doc['materials']:
    if material['name']=='StingrayPBS5':
        material['pbrMetallicRoughness']['baseColorFactor'][3]=0.012659837491810322
        material['alphaMode']='BLEND'
data=json.dumps(doc,separators=(',',':')).encode();data+=b' '*(-len(data)%4)
tail=b[20+n:]
p.write_bytes(struct.pack('<III',0x46546c67,2,20+len(data)+len(tail))+struct.pack('<II',len(data),0x4e4f534a)+data+tail)
