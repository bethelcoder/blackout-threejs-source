import sys,json,struct,zipfile,io
from pathlib import Path
sys.path.insert(0,str(Path('tmp/usd-tools').resolve()))
from pxr import Usd,UsdGeom,UsdShade,Gf
from PIL import Image

for sourceName,outputName in [('Game_Ready_Sci-Fi_Crate_Pile','sci-fi-crate-pile')]:
    source=Path(r'C:\Users\anovu\Downloads')/(sourceName+'.usdz')
    stage=Usd.Stage.Open(str(source));cache=UsdGeom.XformCache();blob=bytearray()
    doc={'asset':{'version':'2.0','generator':'Original USDZ workstation conversion'},'buffers':[{}],'bufferViews':[],'accessors':[],'meshes':[],'nodes':[],'scenes':[{'nodes':[]}],'scene':0,'images':[],'textures':[],'materials':[]}
    def view(data):
        while len(blob)%4:blob.append(0)
        i=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':len(blob),'byteLength':len(data)});blob.extend(data);return i
    def texture(data,mime='image/jpeg'):
        i=len(doc['textures']);doc['images'].append({'bufferView':view(data),'mimeType':mime});doc['textures'].append({'source':len(doc['images'])-1});return {'index':i}
    def attribute(values,size,kind):
        i=len(doc['accessors']);acc={'bufferView':view(struct.pack('<'+'f'*len(values),*values)),'componentType':5126,'count':len(values)//size,'type':kind}
        if kind=='VEC3':acc.update({'min':[min(values[a::size]) for a in range(size)],'max':[max(values[a::size]) for a in range(size)]})
        doc['accessors'].append(acc);return i
    mats={}
    with zipfile.ZipFile(source) as archive:
        for prim in stage.Traverse():
            if not prim.IsA(UsdShade.Material):continue
            paths={}
            for shader in Usd.PrimRange(prim):
                if not shader.IsA(UsdShade.Shader):continue
                inp=UsdShade.Shader(shader).GetInput('file')
                if inp and inp.Get():paths[shader.GetName()]=inp.Get().path
            shader = next((UsdShade.Shader(p) for p in Usd.PrimRange(prim) if p.IsA(UsdShade.Shader) and UsdShade.Shader(p).GetIdAttr().Get() == 'UsdPreviewSurface'), None)
            def value(key, default):
                inp = shader.GetInput(key) if shader else None
                return inp.Get() if inp and inp.Get() is not None else default
            def tex(key):
                path=paths[key];return texture(archive.read(path),'image/png' if path.endswith('.png') else 'image/jpeg')
            mat={'name':prim.GetName(),'pbrMetallicRoughness':{'baseColorFactor':list(value('diffuseColor',[0.3,0.3,0.3]))+[1], 'metallicFactor':float(value('metallic',0)), 'roughnessFactor':float(value('roughness',0.7))}}
            if 'tex_base' in paths:
                mat['pbrMetallicRoughness'].update({'baseColorTexture':tex('tex_base'),'baseColorFactor':[1,1,1,1]})
            if 'tex_metallic' in paths and 'tex_roughness' in paths:
                metal=Image.open(io.BytesIO(archive.read(paths['tex_metallic']))).convert('L')
                rough=Image.open(io.BytesIO(archive.read(paths['tex_roughness']))).convert('L')
                size=(max(metal.width,rough.width),max(metal.height,rough.height))
                packed=Image.merge('RGB',(Image.new('L',size,255),rough.resize(size),metal.resize(size)))
                encoded=io.BytesIO();packed.save(encoded,format='PNG')
                mat['pbrMetallicRoughness'].update({'metallicRoughnessTexture':texture(encoded.getvalue(),'image/png'),'metallicFactor':1,'roughnessFactor':1})
            if 'tex_normal' in paths:mat['normalTexture']=tex('tex_normal')
            if 'tex_emissive' in paths:mat.update({'emissiveTexture':tex('tex_emissive'),'emissiveFactor':[1,1,1]})
            if 'tex_occlusion' in paths:mat['occlusionTexture']=tex('tex_occlusion')
            if paths.get('tex_base','').endswith('.png'):mat.update({'alphaMode':'MASK','alphaCutoff':0.05})
            opacity=float(value('opacity',1))
            if opacity < 1:
                mat['pbrMetallicRoughness']['baseColorFactor'][3]=opacity
                mat['alphaMode']='BLEND'
            mats[str(prim.GetPath())]=len(doc['materials']);doc['materials'].append(mat)
        for prim in stage.Traverse():
            if not prim.IsA(UsdGeom.Mesh):continue
            mesh=UsdGeom.Mesh(prim);transform=cache.GetLocalToWorldTransform(prim)
            pts=[transform.Transform(Gf.Vec3d(p)) for p in mesh.GetPointsAttr().Get()]
            normals=mesh.GetNormalsAttr().Get();nm=mesh.GetNormalsInterpolation();nt=transform.GetInverse().GetTranspose()
            uv=next((p for p in UsdGeom.PrimvarsAPI(prim).GetPrimvars() if str(p.GetTypeName()).startswith('texCoord2')),None);uvs=uv.ComputeFlattened() if uv else [[0,0]];um=uv.GetInterpolation() if uv else 'constant'
            indices=mesh.GetFaceVertexIndicesAttr().Get();positions=[];outNormals=[];outUvs=[];offset=0
            def ix(mode,fv,vertex,face):return fv if mode=='faceVarying' else vertex if mode in ('vertex','varying') else face if mode=='uniform' else 0
            for face,count in enumerate(mesh.GetFaceVertexCountsAttr().Get()):
                for corner in range(1,count-1):
                    corners=(0,corner+1,corner) if transform.GetDeterminant()<0 else (0,corner,corner+1)
                    for c in corners:
                        fv=offset+c;vertex=indices[fv];positions.extend(pts[vertex]);st=uvs[ix(um,fv,vertex,face)];outUvs.extend([st[0],1-st[1]])
                        if normals:outNormals.extend(nt.TransformDir(Gf.Vec3d(normals[ix(nm,fv,vertex,face)])).GetNormalized())
                offset+=count
            attrs={'POSITION':attribute(positions,3,'VEC3'),'TEXCOORD_0':attribute(outUvs,2,'VEC2')}
            if outNormals:attrs['NORMAL']=attribute(outNormals,3,'VEC3')
            mat,_=UsdShade.MaterialBindingAPI(prim).ComputeBoundMaterial();i=len(doc['meshes']);name=prim.GetParent().GetParent().GetName()
            doc['meshes'].append({'name':name,'primitives':[{'attributes':attrs,'material':mats[str(mat.GetPath())]}]});doc['nodes'].append({'name':name,'mesh':i});doc['scenes'][0]['nodes'].append(i)

            if sourceName=='Desk_design_1':Path('tmp/desk-world-positions.json').write_text(json.dumps(positions))
    doc['buffers'][0]['byteLength']=len(blob);j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*(-len(j)%4);blob+=b'\0'*(-len(blob)%4)
    glb=struct.pack('<III',0x46546c67,2,28+len(j)+len(blob))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(blob),0x004e4942)+blob
    Path('public/models/'+outputName+'.glb').write_bytes(glb)
    print(outputName,len(glb),'bytes')
