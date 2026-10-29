from pathlib import Path

script = Path('tmp/convert-electric-box.py').read_text()
script = script.replace('Electric_Box.usdz', 'Wooden_Crates.usdz').replace('electric-box', 'wooden-crates')
script = script.replace('Electric Box by Payam Tavakoli', 'Wooden Crates by RudiH')
script = script.replace('https://sketchfab.com/payamtavakoli', 'https://sketchfab.com/RudiH')
script = script.replace('wooden-crates-fe0c923107b545dfac7e65062701feef', 'wooden-crates-89a193b33bdb4a5597a6b5ea0b08739d')
script = script.replace('CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)', 'Sketchfab Standard (https://sketchfab.com/licenses)').replace('CC BY 4.0', 'Sketchfab Standard')
exec(compile(script, 'wooden-crates-conversion', 'exec'))
