from pathlib import Path

script = Path('tmp/convert-electric-box.py').read_text()
script = script.replace('Electric_Box.usdz', 'Column.usdz').replace('electric-box', 'core-pillar')
script = script.replace('Electric Box by Payam Tavakoli', 'Column by Ted Mebratu')
script = script.replace('https://sketchfab.com/payamtavakoli', 'https://sketchfab.com/paraside')
script = script.replace('core-pillar-fe0c923107b545dfac7e65062701feef', 'column-100b0055fc554285bb52b574cf45f2fd')
exec(compile(script, 'core-pillar-conversion', 'exec'))
