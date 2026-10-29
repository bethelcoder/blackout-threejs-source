from pathlib import Path

filter_geometry = '''
remove = [str(p.GetPath()) for p in stage.Traverse() if p.IsA(UsdGeom.Mesh) and p.GetName() not in ('Object_2', 'Object_3')]
for path in remove: stage.RemovePrim(path)
assert sum(1 for p in stage.Traverse() if p.IsA(UsdGeom.Mesh)) == 2
'''
script = Path('tmp/convert-electric-box.py').read_text()
script = script.replace('Electric_Box.usdz', 'Ceiling_lowpoly_fluorescent_lamps_with_diffuser.usdz').replace('electric-box', 'core-lamp')
script = script.replace('Electric Box by Payam Tavakoli', 'Ceiling lowpoly fluorescent lamps with diffuser by Metallerz')
script = script.replace('https://sketchfab.com/payamtavakoli', 'https://sketchfab.com/Metallerz')
script = script.replace('core-lamp-fe0c923107b545dfac7e65062701feef', 'ceiling-lowpoly-fluorescent-lamps-with-diffuser-95cdcff49c484b66a966269d84143615')
script = script.replace('CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)', 'Sketchfab Standard (https://sketchfab.com/licenses)')
script = script.replace('CC BY 4.0', 'Sketchfab Standard')
injection = "script = script.replace('cache = UsdGeom.XformCache()', " + repr(filter_geometry + '\ncache = UsdGeom.XformCache()') + ")\nnamespace = {}"
script = script.replace('namespace = {}', injection)
script = script.replace("('normal', 'normalTexture', material)]", "('normal', 'normalTexture', material), ('emissiveColor', 'emissiveTexture', material)]")
script = script.replace("        metal, rough =", "        if 'emissiveTexture' in material: material['emissiveFactor'] = [1, 1, 1]\n        metal, rough =")
exec(compile(script, 'core-lamp-conversion', 'exec'))
