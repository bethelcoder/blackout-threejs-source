from pathlib import Path
script = Path('tmp/convert-terminal-assets.py').read_text()
script = script.replace("[('Desk_design_1','terminal-desk'),('Retro_computer','retro-computer')]", "[('Office_Chair','office-chair')]")
exec(compile(script, 'chair-conversion', 'exec'))
