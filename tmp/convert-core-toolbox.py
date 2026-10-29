from pathlib import Path
script=Path('tmp/convert-terminal-assets.py').read_text().replace("[('Desk_design_1','terminal-desk'),('Retro_computer','retro-computer')]", "[('Toolbox','core-toolbox')]")
exec(compile(script, 'toolbox-conversion', 'exec'))
