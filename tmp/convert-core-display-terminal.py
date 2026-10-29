from pathlib import Path
script=Path('tmp/convert-terminal-assets.py').read_text().replace("[('Desk_design_1','terminal-desk'),('Retro_computer','retro-computer')]", "[('Display_Terminal','core-display-terminal')]")
exec(compile(script, 'display-terminal-conversion', 'exec'))
