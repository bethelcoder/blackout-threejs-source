from pathlib import Path
import sys, json, struct, io, zipfile
import numpy as np
from PIL import Image
sys.path.insert(0, str(Path('tmp/usd-tools').resolve()))
from pxr import UsdGeom, UsdShade

source = r'C:\Users\anovu\Downloads\Electric_Box.usdz'
script = Path('tmp/convert-button.py').read_text().replace(r'C:\Users\anovu\Downloads\Button_ru2.usdz', source)
script = '\n'.join(line for line in script.splitlines() if not line.startswith("Path('src/assets/models/button/button.json')"))
namespace = {}
exec(compile(script, 'electric-box-conversion', 'exec'), namespace)
stage, parts = namespace['stage'], namespace['parts']
archive = zipfile.ZipFile(source)
data = bytearray()
doc = {'asset': {'version': '2.0', 'generator': 'BLACKOUT USDZ conversion', 'copyright': 'Electric Box by Payam Tavakoli, CC BY 4.0'},
       'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': [], 'materials': [], 'images': [], 'textures': [], 'bufferViews': [], 'accessors': []}
def view(raw, target=None):
    while len(data) % 4: data.append(0)
    result = {'buffer': 0, 'byteOffset': len(data), 'byteLength': len(raw)}
    if target: result['target'] = target
    data.extend(raw)
    doc['bufferViews'].append(result)
    return len(doc['bufferViews']) - 1
def attribute(values, width):
    array = np.asarray(values, dtype='<f4').reshape(-1, width)
    doc['accessors'].append({'bufferView': view(array.tobytes(), 34962), 'componentType': 5126, 'count': len(array),
        'type': {2: 'VEC2', 3: 'VEC3'}[width], 'min': array.min(axis=0).tolist(), 'max': array.max(axis=0).tolist()})
    return len(doc['accessors']) - 1
texture_cache = {}
def texture(raw, key, mime='image/jpeg'):
    if key in texture_cache: return texture_cache[key]
    doc['images'].append({'bufferView': view(raw), 'mimeType': mime})
    doc['textures'].append({'source': len(doc['images']) - 1})
    index = len(doc['textures']) - 1
    texture_cache[key] = {'index': index}
    return texture_cache[key]
def input_texture(shader, name):
    connection = shader.GetInput(name).GetConnectedSource()
    if not connection: return None
    value = connection[0].GetInput('file').Get()
    return str(value.path) if value else None
material_indices = {}
for part, prim in zip(parts, (p for p in stage.Traverse() if p.IsA(UsdGeom.Mesh))):
    binding = prim.GetRelationship('material:binding').GetTargets()[0]
    if str(binding) not in material_indices:
        shader = UsdShade.Shader(stage.GetPrimAtPath(str(binding) + '/pbr_shader'))
        color = shader.GetInput('diffuseColor').Get() or (1, 1, 1)
        pbr = {'baseColorFactor': [*color, 1], 'metallicFactor': 1, 'roughnessFactor': 1}
        material = {'name': str(binding).split('/')[-1], 'pbrMetallicRoughness': pbr}
        for input_name, destination, container in [('diffuseColor', 'baseColorTexture', pbr), ('normal', 'normalTexture', material)]:
            name = input_texture(shader, input_name)
            if name: container[destination] = texture(archive.read(name), name)
        metal, rough = input_texture(shader, 'metallic'), input_texture(shader, 'roughness')
        if metal or rough:
            m = Image.open(io.BytesIO(archive.read(metal))).convert('L') if metal else Image.new('L', (1, 1), 0)
            r = Image.open(io.BytesIO(archive.read(rough))).convert('L') if rough else Image.new('L', (1, 1), 180)
            size = (max(m.width, r.width), max(m.height, r.height))
            packed = Image.merge('RGB', (Image.new('L', size, 255), r.resize(size), m.resize(size)))
            encoded = io.BytesIO(); packed.save(encoded, format='PNG')
            pbr['metallicRoughnessTexture'] = texture(encoded.getvalue(), (metal, rough), 'image/png')
        material_indices[str(binding)] = len(doc['materials'])
        doc['materials'].append(material)
    attributes = {'POSITION': attribute(part['positions'], 3), 'TEXCOORD_0': attribute(part['uvs'], 2)}
    if part['normals']: attributes['NORMAL'] = attribute(part['normals'], 3)
    doc['meshes'].append({'name': part['name'], 'primitives': [{'attributes': attributes, 'material': material_indices[str(binding)]}]})
    doc['nodes'].append({'mesh': len(doc['meshes']) - 1})
    doc['scenes'][0]['nodes'].append(len(doc['nodes']) - 1)
doc['buffers'] = [{'byteLength': len(data)}]
encoded = json.dumps(doc, separators=(',', ':')).encode()
encoded += b' ' * (-len(encoded) % 4)
data.extend(b'\0' * (-len(data) % 4))
glb = struct.pack('<III', 0x46546c67, 2, 12 + 8 + len(encoded) + 8 + len(data)) + struct.pack('<II', len(encoded), 0x4e4f534a) + encoded + struct.pack('<II', len(data), 0x004e4942) + data
Path('public/models/electric-box.glb').write_bytes(glb)
Path('src/assets/models/electric-box-attribution.md').write_text('Electric Box by Payam Tavakoli (https://sketchfab.com/payamtavakoli)\nSource: https://sketchfab.com/3d-models/electric-box-fe0c923107b545dfac7e65062701feef\nLicense: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)\nConverted from user-supplied USDZ to GLB, packed PBR textures, scaled and mounted for gameplay.\n')
print('GLB bytes:', len(glb))
