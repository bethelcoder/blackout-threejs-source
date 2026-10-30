from pathlib import Path
import zipfile

source = r'C:\Users\anovu\Downloads\Light_Switch.usdz'
output = Path('src/assets/models/light-switch')
output.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(source) as archive:
    for name in archive.namelist():
        if name.endswith(('.jpg', '.png')):
            (output / Path(name).name).write_bytes(archive.read(name))
script = Path('tmp/convert-button.py').read_text()
script = script.replace(r'C:\Users\anovu\Downloads\Button_ru2.usdz', source)
script = script.replace('src/assets/models/button/button.json', 'src/assets/models/light-switch/switch.json')
script = script.replace("'Button_ru2.usdz'", "'Light_Switch.usdz'")
exec(compile(script, 'switch-conversion', 'exec'))
Path(output / 'ATTRIBUTION.md').write_text('Light Switch by Avot (https://sketchfab.com/avot)\nSource: https://sketchfab.com/3d-models/light-switch-808c3de4dd874fc1b67ff15cd2645555\nLicense: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)\nConverted from the user-supplied USDZ to triangulated Three.js geometry; scaled and positioned for gameplay.\n')
