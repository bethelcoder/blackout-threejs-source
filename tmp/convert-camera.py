from pathlib import Path
import zipfile
source = r'C:\Users\anovu\Downloads\Security_Camera.usdz'
output = Path('src/assets/models/security-camera')
output.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(source) as archive:
    for name in archive.namelist():
        if name.endswith(('.jpg', '.png')):
            (output / name.split('/')[-1]).write_bytes(archive.read(name))
script = Path('tmp/convert-button.py').read_text()
script = script.replace(r'C:\Users\anovu\Downloads\Button_ru2.usdz', source)
script = script.replace("prim.GetName()", "prim.GetParent().GetParent().GetName()")
script = script.replace("src/assets/models/button/button.json", "src/assets/models/security-camera/camera.json")
script = script.replace("'Button_ru2.usdz'", "'Security_Camera.usdz'")
exec(compile(script, 'camera-conversion', 'exec'))
