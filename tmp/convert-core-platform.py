from pathlib import Path

filter_geometry = '''
keep = []
for prim in stage.Traverse():
    if not prim.IsA(UsdGeom.Mesh): continue
    name = prim.GetName()
    if name == 'Floor_005_M_Floor_003_0' or name.startswith('ControlPanel'):
        keep.append(str(prim.GetPath()))
remove = [str(prim.GetPath()) for prim in stage.Traverse() if prim.IsA(UsdGeom.Mesh) and str(prim.GetPath()) not in keep]
for path in remove: stage.RemovePrim(path)
assert len(keep) == 4, keep
print('Central platform parts:', keep)
'''
script = Path('tmp/convert-electric-box.py').read_text()
script = script.replace('Electric_Box.usdz', 'Module_XB1101_-_Sci-Fi_Corridor_Halo_Inspired.usdz').replace('electric-box', 'core-platform')
script = script.replace('Electric Box by Payam Tavakoli', 'Module XB1101 by KainHunter1997')
script = script.replace('https://sketchfab.com/payamtavakoli', 'https://sketchfab.com/KainHunterDesign')
script = script.replace('core-platform-fe0c923107b545dfac7e65062701feef', 'module-xb1101-sci-fi-corridor-halo-inspired-5c66489569294dac93215877dcda0b83')
injection = "script = script.replace('cache = UsdGeom.XformCache()', " + repr(filter_geometry + '\ncache = UsdGeom.XformCache()') + ")\nnamespace = {}"
script = script.replace('namespace = {}', injection)
script = script.replace("('normal', 'normalTexture', material)]", "('normal', 'normalTexture', material), ('emissiveColor', 'emissiveTexture', material)]")
script = script.replace("        metal, rough =", "        if 'emissiveTexture' in material: material['emissiveFactor'] = [0.35, 0.35, 0.35]\n        metal, rough =")
script = script.replace('scaled and mounted for gameplay.', 'central floor and three control panels extracted; corridor, purple hologram planet and glow cones removed; centred and scaled beneath the original red AI orb.')
exec(compile(script, 'core-platform-conversion', 'exec'))
