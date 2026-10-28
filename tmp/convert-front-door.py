from pathlib import Path

script = Path('tmp/convert-electric-box.py').read_text()
script = script.replace('Electric_Box.usdz', 'door_door_metal.usdz')
script = script.replace('electric-box', 'front-door')
script = script.replace('Electric Box by Payam Tavakoli', 'door door metal by ahmagh2e')
script = script.replace('https://sketchfab.com/payamtavakoli', 'https://sketchfab.com/ahmagh2e')
script = script.replace('front-door-fe0c923107b545dfac7e65062701feef', 'door-door-metal-b21ec273c1a342568ab9f9ac14291c5b')
exec(compile(script, 'front-door-conversion', 'exec'))
