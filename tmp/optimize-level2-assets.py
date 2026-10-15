"""Lossless vertex indexing; batch rack parts by material offline, retaining textures."""
import json,struct,copy
from pathlib import Path
names=['venator-room-modules','terminal-desk','retro-computer','office-chair','data-center-server-rack','server-racking-system','venator-small-door']
report=[]
for name in names:
    path=Path('src/assets/models')/(name+'.glb')
    raw=path.read_bytes();jl=struct.unpack_from('<I',raw,12)[0]
    doc=json.loads(raw[20:20+jl]);old=copy.deepcopy(doc);binary=raw[28+jl:]
    if all('indices' in p for m in doc['meshes'] for p in m['primitives']):
        print(name,'already indexed');continue
    data=bytearray();views=[];accessors=[]
    def view(content):
        while len(data)%4:data.append(0)
        index=len(views);views.append({'buffer':0,'byteOffset':len(data),'byteLength':len(content)});data.extend(content);return index
    for image in doc.get('images',[]):
        v=old['bufferViews'][image['bufferView']]
        image['bufferView']=view(binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])
    batches={}
    batching=name in ('data-center-server-rack','server-racking-system')
    if batching: assert all(not any(k in n for k in ('matrix','rotation','translation','scale')) for n in old['nodes'])
    for mi,mesh in enumerate(old['meshes']):
        for pi,primitive in enumerate(mesh['primitives']):
            key=(primitive.get('material'),tuple(sorted(primitive['attributes']))) if batching else (mi,pi)
            batches.setdefault(key,[]).append((mesh,primitive))
    meshes=[];oldToNew={}
    for entries in batches.values():
        keys=sorted(entries[0][1]['attributes']);vertexMap={};attributes={k:bytearray() for k in keys};indices=[]
        for mesh,primitive in entries:
            streams={}
            for key,ai in primitive['attributes'].items():
                acc=old['accessors'][ai];v=old['bufferViews'][acc['bufferView']]
                assert acc['componentType']==5126 and 'byteStride' not in v
                size={'VEC2':8,'VEC3':12,'VEC4':16}[acc['type']]
                start=v.get('byteOffset',0)+acc.get('byteOffset',0)
                streams[key]=(binary[start:start+acc['count']*size],size)
            count=old['accessors'][primitive['attributes']['POSITION']]['count']
            for vertex in range(count):
                row=tuple(streams[k][0][vertex*streams[k][1]:(vertex+1)*streams[k][1]] for k in keys)
                if row not in vertexMap:
                    vertexMap[row]=len(vertexMap)
                    for key,part in zip(keys,row):attributes[key].extend(part)
                indices.append(vertexMap[row])
        primitive=copy.deepcopy(entries[0][1]);primitive['attributes']={}
        for key in keys:
            acc=copy.deepcopy(old['accessors'][entries[0][1]['attributes'][key]])
            acc.pop('byteOffset',None);acc['bufferView']=view(attributes[key]);acc['count']=len(vertexMap)
            if 'min' in acc:
                mins=[old['accessors'][p['attributes'][key]]['min'] for _,p in entries]
                maxs=[old['accessors'][p['attributes'][key]]['max'] for _,p in entries]
                acc['min']=[min(v[a] for v in mins) for a in range(len(mins[0]))]
                acc['max']=[max(v[a] for v in maxs) for a in range(len(maxs[0]))]
            primitive['attributes'][key]=len(accessors);accessors.append(acc)
        small=len(vertexMap)<65536
        indexBytes=struct.pack('<'+('H' if small else 'I')*len(indices),*indices)
        primitive['indices']=len(accessors)
        accessors.append({'bufferView':view(indexBytes),'componentType':5123 if small else 5125,'count':len(indices),'type':'SCALAR'})
        newIndex=len(meshes);meshes.append({'name':doc['materials'][primitive['material']]['name'] if batching else entries[0][0]['name'],'primitives':[primitive]})
        for mesh,_ in entries:oldToNew[id(mesh)]=newIndex
    if batching:
        doc['nodes']=[{'name':m['name'],'mesh':i} for i,m in enumerate(meshes)]
        doc['scenes']=[{'nodes':list(range(len(meshes)))}]
    else:
        # These assets have one primitive per mesh and retain all semantic node names.
        assert len(meshes)==len(old['meshes'])
    doc['meshes']=meshes;doc['bufferViews']=views;doc['accessors']=accessors;doc['buffers']=[{'byteLength':len(data)}]
    encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*(-len(encoded)%4);data+=b'\0'*(-len(data)%4)
    output=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(data))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(data),0x004e4942)+data
    # Verify exact reconstruction of every original triangle attribute before replacing.
    for (entries,newMesh) in zip(batches.values(),meshes):
        primitive=newMesh['primitives'][0];ia=accessors[primitive['indices']];iv=views[ia['bufferView']]
        ix=struct.unpack_from('<'+('H' if ia['componentType']==5123 else 'I')*ia['count'],data,iv['byteOffset'])
        for key in primitive['attributes']:
            newAcc=accessors[primitive['attributes'][key]];nv=views[newAcc['bufferView']];size={'VEC2':8,'VEC3':12,'VEC4':16}[newAcc['type']]
            original=bytearray()
            for _,p in entries:
                a=old['accessors'][p['attributes'][key]];v=old['bufferViews'][a['bufferView']];start=v.get('byteOffset',0)+a.get('byteOffset',0)
                original.extend(binary[start:start+a['count']*size])
            rebuilt=b''.join(data[nv['byteOffset']+i*size:nv['byteOffset']+(i+1)*size] for i in ix)
            assert rebuilt==original,(name,key,'attribute mismatch')
    path.write_bytes(output)
    report.append({'name':name,'before':len(raw),'after':len(output),'meshesBefore':len(old['meshes']),'meshesAfter':len(meshes)})
    print(name,len(raw),'->',len(output),'meshes',len(old['meshes']),'->',len(meshes))
Path('tmp/level2-optimization-report.json').write_text(json.dumps(report,indent=2))
