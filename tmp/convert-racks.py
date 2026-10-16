from pathlib import Path
script=Path('tmp/convert-terminal-assets.py').read_text()
script=script.replace("[('Desk_design_1','terminal-desk'),('Retro_computer','retro-computer')]", "[('Data_Center_Server_Rack','data-center-server-rack'),('Server_Racking_System','server-racking-system')]")
exec(compile(script,'rack-conversion','exec'))
