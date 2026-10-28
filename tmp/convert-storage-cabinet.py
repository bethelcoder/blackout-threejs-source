from pathlib import Path

script = Path('tmp/convert-electric-box.py').read_text()
script = script.replace('Electric_Box.usdz', 'Metal_Storage_Cabinet.usdz')
script = script.replace('electric-box', 'metal-storage-cabinet')
script = script.replace('Electric Box by Payam Tavakoli', 'Metal Storage Cabinet by jimbogies')
script = script.replace('https://sketchfab.com/payamtavakoli', 'https://sketchfab.com/jimbogies')
script = script.replace('electric-box-fe0c923107b545dfac7e65062701feef', 'metal-storage-cabinet-4d49691a269745cabe0e1d5c1c3bef9b')
# The broad name replacement above also changes the old attribution URL prefix.
script = script.replace('metal-storage-cabinet-fe0c923107b545dfac7e65062701feef', 'metal-storage-cabinet-4d49691a269745cabe0e1d5c1c3bef9b')
exec(compile(script, 'storage-cabinet-conversion', 'exec'))
