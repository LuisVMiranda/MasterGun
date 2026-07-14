import argparse
import math
import os
import sys

import bpy


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    return parser.parse_args(args)


def material(name, color, metallic=0.0, roughness=0.5):
    value = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1.0)
    value.metallic = metallic
    value.roughness = roughness
    return value


MATERIALS = {
    "steel": material("Steel", (0.12, 0.15, 0.18), 0.7, 0.24),
    "steel_light": material("Steel Light", (0.34, 0.39, 0.43), 0.55, 0.3),
    "olive": material("Olive", (0.29, 0.34, 0.14), 0.18, 0.5),
    "rubber": material("Rubber", (0.035, 0.05, 0.06), 0.05, 0.82),
    "enemy": material("Enemy Red", (0.72, 0.035, 0.07), 0.1, 0.34),
    "soldier": material("Soldier Blue", (0.035, 0.32, 0.74), 0.1, 0.34),
    "skin": material("Skin", (0.58, 0.29, 0.2), 0.0, 0.62),
}


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def cube(name, size, location, material_id, rotation=(0, 0, 0), bevel=0.035):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new("Edge bevel", "BEVEL")
    modifier.width = min(bevel, min(size) * 0.2)
    modifier.segments = 2
    obj.data.materials.append(MATERIALS[material_id])
    return obj


def cylinder(name, radius, depth, location, material_id, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(MATERIALS[material_id])
    return obj


def socket(name, location):
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=location)
    bpy.context.object.name = name


def build_weapon(weapon_id):
    specs = {
        "pistol": ((0.42, 0.2, 0.82), 0.92, 1.02),
        "shotgun": ((0.56, 0.3, 0.72), 1.62, 1.88),
        "machineGun": ((0.58, 0.34, 0.82), 1.25, 2.28),
        "rifle": ((0.46, 0.28, 1.02), 1.62, 2.97),
    }
    receiver, barrel_length, muzzle_z = specs[weapon_id]
    cube("receiver", receiver, (0, 0.42, 0.06), "olive")
    cube("grip", (0.27, 0.58, 0.3), (0, 0.05, -0.2), "rubber", (-0.24, 0, 0))
    cylinder("barrel", 0.055 if weapon_id != "rifle" else 0.035, barrel_length, (0, 0.5, muzzle_z - barrel_length / 2), "steel_light")
    if weapon_id != "pistol":
        cube("stock", (0.44, 0.38, 0.78), (0, 0.3, -0.68), "rubber", (-0.08, 0, 0), 0.055)
        cube("handguard", (0.45, 0.24, 0.72), (0, 0.42, 0.72), "olive", bevel=0.05)
    if weapon_id in ("machineGun", "rifle"):
        cube("magazine", (0.25, 0.58, 0.3), (0, 0.04, 0.08), "steel", (-0.16, 0, 0))
    if weapon_id == "rifle":
        cylinder("scope", 0.105, 0.72, (0, 0.77, 0.42), "steel")
    for name, location in socket_locations(muzzle_z).items():
        socket(name, location)


def socket_locations(muzzle_z):
    return {
        "muzzle": (0, 0.5, muzzle_z),
        "eject": (0.26, 0.48, 0.2),
        "grip_primary": (0, 0.08, -0.12),
        "grip_support": (0, 0.28, min(0.72, muzzle_z * 0.35)),
        "shadow_anchor": (0, 0, 0.4),
    }


def build_operator(faction):
    body_material = "enemy" if faction == "enemy" else "soldier"
    cube("torso", (0.48, 0.66, 0.3), (0, 1.08, 0), body_material, bevel=0.1)
    cube("chest_plate", (0.55, 0.42, 0.13), (0, 1.13, -0.19), "steel", bevel=0.05)
    cube("pelvis", (0.52, 0.13, 0.32), (0, 0.72, 0), "steel", bevel=0.04)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.21, location=(0, 1.58, 0))
    bpy.context.object.data.materials.append(MATERIALS["skin"])
    for side in (-1, 1):
        cylinder("arm", 0.075, 0.66, (side * 0.34, 1.08, 0), body_material, (math.pi / 2, 0, side * 0.34))
        cylinder("leg", 0.09, 0.82, (side * 0.16, 0.35, 0), body_material, (math.pi / 2, 0, side * 0.08))
        cube("boot", (0.22, 0.14, 0.38), (side * 0.16, -0.05, -0.08), "rubber", bevel=0.05)
    socket("muzzle", (0.05, 1.22, -1.18))
    socket("grip_primary", (0.12, 1.08, -0.22))
    socket("grip_support", (-0.12, 1.03, -0.5))
    socket("shadow_anchor", (0, 0.02, 0))


def export_asset(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_yup=True)


def main():
    output = parse_args().output
    for weapon_id in ("pistol", "shotgun", "machineGun", "rifle"):
        clear_scene()
        build_weapon(weapon_id)
        export_asset(os.path.join(output, "weapons", f"{weapon_id}.glb"))
    for asset_id, faction in (("operatorEnemy", "enemy"), ("operatorSoldier", "soldier")):
        clear_scene()
        build_operator(faction)
        export_asset(os.path.join(output, "operators", f"{asset_id}.glb"))


main()
