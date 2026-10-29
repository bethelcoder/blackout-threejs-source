from pathlib import Path
p=Path('src/scenes/level3.js');s=p.read_text();s='\n'.join(line for line in s.split('\n') if not line.startswith(('<<<<<<<','=======','>>>>>>>')))
s=s.replace("import { createSparkParticles } from '../systems/particles.js';\n",'').replace('    sparks.userData.update(delta);\n','').replace("  // which already drives the corrupted panel's intensity. The shockwaves stay\n", "  // without adding another damage source. The shockwaves stay\n")
p.write_text(s)
