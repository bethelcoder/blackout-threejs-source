from pathlib import Path
script=Path('tmp/convert-terminal-assets.py').read_text()
script=script.replace("[('Desk_design_1','terminal-desk'),('Retro_computer','retro-computer')]", "[('Star_Wars_The_Clone_Wars_Venator_Prefab','venator-small-door')]")
script=script.replace("if not prim.IsA(UsdShade.Material):continue", "if not prim.IsA(UsdShade.Material) or prim.GetName() != 'VenatorV3_SmallDoor_WallLight':continue")
script=script.replace("if not prim.IsA(UsdGeom.Mesh):continue", "if not prim.IsA(UsdGeom.Mesh) or prim.GetParent().GetParent().GetName() not in ('Small_DoorFrame','Venator_Door1'):continue")
exec(compile(script,'small-door-conversion','exec'))
