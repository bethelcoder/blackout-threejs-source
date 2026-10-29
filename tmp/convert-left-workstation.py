from pathlib import Path

template = Path('tmp/convert-electric-box.py').read_text()
optimize = '''
class SizedTextures:
    def __init__(self, archive): self.archive = archive
    def read(self, name):
        raw = self.archive.read(name)
        if not name.endswith(('.jpg', '.png')): return raw
        image = Image.open(io.BytesIO(raw))
        if max(image.size) <= 1024: return raw
        image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        image.save(output, format='PNG' if name.endswith('.png') else 'JPEG', quality=90)
        return output.getvalue()
archive = SizedTextures(archive)
data = bytearray()
'''
for filename, slug, title, author, profile, url, license_name, license_url in [
    ('Computer_Desk.usdz', 'left-computer-desk', 'Computer Desk', 'draakon_4d', 'draakon_4d', 'computer-desk-98c5bd86d7bb4ca98dbc26dabb5e7196', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/'),
    ('Personal_Computer (1).usdz', 'left-personal-computer', 'Personal Computer', 'CommunicationNode', 'Starven38', 'personal-computer-aa398650fe6e4baa8771c71266d842f4', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/'),
]:
    script = template.replace('Electric_Box.usdz', filename).replace('electric-box', slug)
    script = script.replace('Electric Box by Payam Tavakoli', title + ' by ' + author)
    script = script.replace('https://sketchfab.com/payamtavakoli', 'https://sketchfab.com/' + profile)
    script = script.replace(slug + '-fe0c923107b545dfac7e65062701feef', url)
    script = script.replace('CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)', license_name + ' (' + license_url + ')')
    if license_name != 'CC BY 4.0': script = script.replace('CC BY 4.0', license_name)
    script = script.replace('data = bytearray()', optimize)
    script = script.replace("texture(archive.read(name), name)", "texture(archive.read(name), name, 'image/png' if name.endswith('.png') else 'image/jpeg')")
    script = script.replace("        metal, rough =", "        emission = shader.GetInput('emissiveColor').Get()\n        if emission: material['emissiveFactor'] = [min(1, max(0, float(v))) for v in emission]\n        metal, rough =")
    exec(compile(script, slug + '-conversion', 'exec'), {})
