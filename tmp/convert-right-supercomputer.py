from pathlib import Path

script = Path('tmp/convert-electric-box.py').read_text()
script = script.replace('Electric_Box.usdz', 'Super_computer.usdz').replace('electric-box', 'right-supercomputer')
script = script.replace('Electric Box by Payam Tavakoli', 'Super computer by ARComputerFundamentals')
script = script.replace('https://sketchfab.com/payamtavakoli', 'https://sketchfab.com/adilaijaz10')
script = script.replace('right-supercomputer-fe0c923107b545dfac7e65062701feef', 'super-computer-c7626bef858b44cea1c12851e7d8956f')
script = script.replace("'metallicFactor': 1, 'roughnessFactor': 1", "'metallicFactor': float(shader.GetInput('metallic').Get() or 0), 'roughnessFactor': float(shader.GetInput('roughness').Get() or 0.7)")
exec(compile(script, 'right-supercomputer-conversion', 'exec'))
