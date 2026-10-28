from pathlib import Path

script = Path('tmp/convert-electric-box.py').read_text()
script = script.replace('Electric_Box.usdz', 'Metal_Door_2.usdz')
script = script.replace('electric-box', 'storage-door')
script = script.replace('Electric Box by Payam Tavakoli', 'Metal Door 2 by tboiston')
script = script.replace('https://sketchfab.com/payamtavakoli', 'https://sketchfab.com/tboiston')
script = script.replace('storage-door-fe0c923107b545dfac7e65062701feef', 'metal-door-2-4da6b538427244aaababe36d3e228a40')
exec(compile(script, 'storage-door-conversion', 'exec'))
