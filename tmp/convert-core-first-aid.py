from pathlib import Path
script=Path('tmp/convert-terminal-assets.py').read_text().replace("[('Desk_design_1','terminal-desk'),('Retro_computer','retro-computer')]", "[('First_Aid_Box','core-first-aid-box')]")
exec(compile(script, 'first-aid-conversion', 'exec'))
