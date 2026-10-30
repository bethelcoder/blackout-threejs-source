from pathlib import Path

script = Path('tmp/convert-office-drawer.py').read_text()
start = script.index('for sourceName,outputName in ')
end = script.index(':', start)
script = script[:start] + "for sourceName,outputName in [('caution_wet_floor__cleaning_sign','core-wet-floor-sign')]" + script[end:]
exec(compile(script, 'wet-floor-sign-conversion', 'exec'))
