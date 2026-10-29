from pathlib import Path
script=Path('tmp/convert-terminal-assets.py').read_text().replace("[('Desk_design_1','terminal-desk'),('Retro_computer','retro-computer')]", "[('Fire_Exting','core-fire-extinguisher')]")
exec(compile(script, 'fire-extinguisher-conversion', 'exec'))
