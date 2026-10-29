from pathlib import Path

script = Path('tmp/convert-electric-box.py').read_text()
script = script.replace('Electric_Box.usdz', 'Office_Ceiling_Tiles.usdz').replace('electric-box', 'core-ceiling')
script = script.replace('Electric Box by Payam Tavakoli', 'Office Ceiling Tiles by joaoantoniolucon2')
script = script.replace('https://sketchfab.com/payamtavakoli', 'https://sketchfab.com/joaoantoniolucon2')
script = script.replace('core-ceiling-fe0c923107b545dfac7e65062701feef', 'office-ceiling-tiles-c89b6a06ac884271816791af6d28c5ec')
exec(compile(script, 'core-ceiling-conversion', 'exec'))
