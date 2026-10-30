from pathlib import Path
script=Path('tmp/convert-terminal-assets.py').read_text()
script=script.replace("[('Desk_design_1','terminal-desk'),('Retro_computer','retro-computer')]", "[('Vent','maintenance-vent-cover')]")
exec(compile(script,'vent-conversion','exec'))
