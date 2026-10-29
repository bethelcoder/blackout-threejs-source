from pathlib import Path
script=Path('tmp/convert-terminal-assets.py').read_text().replace("[('Desk_design_1','terminal-desk'),('Retro_computer','retro-computer')]", "[('AI_Kitchen__just_a_bit_fun','core-kitchen-bot')]")
exec(compile(script, 'kitchen-bot-conversion', 'exec'))
