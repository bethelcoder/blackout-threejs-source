from pathlib import Path

script = Path('tmp/convert-electric-box.py').read_text()
script = script.replace('Electric_Box.usdz', 'Earth_globe_hologram_2MB_looping_animation.usdz').replace('electric-box', 'earth-hologram')
script = script.replace('Electric Box by Payam Tavakoli', 'Earth globe hologram 2MB looping animation by IZ.MdVerz')
script = script.replace('https://sketchfab.com/payamtavakoli', 'https://sketchfab.com/IZ.MdVerz')
script = script.replace('earth-hologram-fe0c923107b545dfac7e65062701feef', 'earth-globe-hologram-2mb-looping-animation-37cac2803bbd4e9cad150a772215c343')
script = script.replace("texture(archive.read(name), name)", "texture(archive.read(name), name, 'image/png' if name.endswith('.png') else 'image/jpeg')")
script = script.replace("('normal', 'normalTexture', material)]", "('normal', 'normalTexture', material), ('emissiveColor', 'emissiveTexture', material)]")
script = script.replace("        metal, rough =", "        if 'emissiveTexture' in material: material['emissiveFactor'] = [1, 1, 1]\n        metal, rough =")
script = script.replace('scaled and mounted for gameplay.', 'globe and projection mesh extracted, scaled and animated in a cyan projector display in Level 3.')
exec(compile(script, 'earth-hologram-conversion', 'exec'))
