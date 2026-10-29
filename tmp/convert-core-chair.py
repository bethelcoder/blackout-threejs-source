from pathlib import Path
script = Path('tmp/convert-terminal-assets.py').read_text()
script = script.replace("[('Desk_design_1','terminal-desk'),('Retro_computer','retro-computer')]", "[('Office_Chair (2)','core-office-chair')]")
exec(compile(script, 'core-chair-conversion', 'exec'))
