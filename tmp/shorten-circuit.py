from pathlib import Path
p=Path('src/systems/circuitPuzzle.js');s=p.read_text(encoding='utf-8-sig')
s=s.replace('[30,31,32,26,25,24,18,19,20,21,15,14,13,7,8,9,10,16,17,11,5]', '[12,13,9,8,4,5,6,10,11,7,3]')
s=s.replace('%6','%4').replace('/6','/4').replace('[0,2,3,6,27,28]', '[0,1,14,15]').replace('length:36','length:16').replace('[[32,1,3],[18,2,-2],[9,3,1]]','[[13,1,3],[4,2,-2],[6,3,1]]')
s=s.replace('tiles[22].delta=2;tiles[4].delta=-3;', 'tiles[2].delta=-3;')
s=s.replace('tiles[30]','tiles[12]').replace('tiles[5]','tiles[3]').replace('tiles[31]','tiles[13]').replace('id=30','id=12').replace('[5,30]','[3,12]').replace('id===5','id===3').replace('x>5','x>3').replace('y>5','y>3').replace('next=y*6+x','next=y*4+x').replace('repeat(6,','repeat(4,').replace('i===30','i===12').replace('i===5','i===3').replace('width:min(660px','width:min(500px')
p.write_text(s,encoding='utf-8')
p=Path('tmp/check-circuit-puzzle.mjs');s=p.read_text().replace('tiles[18]', 'tiles[4]').replace('tiles[14].rotation=1','tiles[9].rotation=1').replace('result.active.size<21','result.active.size<11');p.write_text(s)
p=Path('tmp/check-level3.mjs');s=p.read_text().replace('id===30||id===5','id===12||id===3');p.write_text(s)
