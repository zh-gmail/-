"""
Blender 发型生成脚本 — 发片（hair cards）方式
生成 3 个发型：短发、长发、波波头
导出为 GLB 格式，适用于 Three.js AR 渲染
用法: blender --background --python scripts/blender-hair-generator.py
"""

import bpy
import math
import os
import sys

# === 配置 ===
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'assets', 'hairstyles')
HEAD_CENTER = (0.0, 0.0, 1.7)  # 头顶中心（相对头部模型）
HAIR_BASE = 1.65  # 发根高度

# 清理场景
def clean_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    # 删除所有材质
    for mat in bpy.data.materials:
        bpy.data.materials.remove(mat)

def make_hair_material(name, color_hex="#1a1a1a"):
    """创建基础发色材质"""
    mat = bpy.data.materials.new(name=name)
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        r, g, b = int(color_hex[1:3], 16)/255, int(color_hex[3:5], 16)/255, int(color_hex[5:7], 16)/255
        bsdf.inputs['Base Color'].default_value = (r, g, b, 1.0)
        bsdf.inputs['Roughness'].default_value = 0.7
        bsdf.inputs['Specular IOR Level'].default_value = 0.3
    return mat

def create_hair_card(pos, rotation, scale, subdivisions=4):
    """创建单个发片"""
    bpy.ops.mesh.primitive_grid_add(
        x_subdivisions=subdivisions,
        y_subdivisions=1,
        size=1,
        location=pos,
        rotation=rotation,
        scale=scale
    )
    card = bpy.context.active_object
    return card

def create_short_hair():
    """短发 — 多层发片覆盖头顶"""
    group = bpy.data.objects.new('short_hair', None)
    group.empty_display_size = 0
    bpy.context.collection.objects.link(group)

    layers = [
        # (angle_from_vertical, count, length, z_offset, radius)
        (0.0, 1, 0.35, 0.0, 0.25),      # 顶部
        (0.3, 8, 0.30, -0.02, 0.28),     # 上层
        (0.6, 12, 0.25, -0.04, 0.30),    # 中层
        (0.9, 10, 0.20, -0.06, 0.32),    # 下层
        (1.2, 8, 0.15, -0.08, 0.30),     # 鬓角
    ]

    mat = make_hair_material('short_hair_mat', '#2a2a2a')

    for tilt, count, length, z_off, radius in layers:
        for i in range(count):
            angle = (i / count) * 2 * math.pi + tilt * 0.5
            x = math.cos(angle) * radius
            y = math.sin(angle) * radius
            z = HAIR_BASE + z_off

            # 发片朝向和倾斜
            rot_x = tilt * 0.8
            rot_z = angle

            # 发片宽度随位置变化
            width = 0.06 + 0.02 * (1 - abs(tilt - 0.6) / 1.2)
            card = create_hair_card(
                (x, y, z),
                (rot_x, 0, rot_z + math.pi/2),
                (width, 1, length * 0.8 + 0.05),
                subdivisions=3
            )
            card.name = f'short_strand_{i}'
            card.data.materials.append(mat)
            card.parent = group

    return group

def create_long_hair():
    """长发 — 顶部短 + 后背长发丝"""
    group = bpy.data.objects.new('long_hair', None)
    group.empty_display_size = 0
    bpy.context.collection.objects.link(group)

    mat = make_hair_material('long_hair_mat', '#1a1a1a')

    # 顶部覆盖发片
    for i in range(20):
        tilt = 0.3 + (i / 20) * 0.5
        angle = (i / 20) * 2 * math.pi
        radius = 0.22 + tilt * 0.1
        x = math.cos(angle) * radius
        y = math.sin(angle) * radius
        z = HAIR_BASE - 0.02

        length = 0.25 + 0.1 * (1 - tilt / 0.8)
        width = 0.05 + 0.02 * (1 - tilt / 0.8)

        card = create_hair_card(
            (x, y, z),
            (tilt * 0.6, 0, angle + math.pi/2),
            (width, 1, length),
            subdivisions=2
        )
        card.name = f'long_top_{i}'
        card.data.materials.append(mat)
        card.parent = group

    # 后背长发丝 — 从后脑勺下垂
    for i in range(30):
        angle = -1.2 + (i / 30) * 2.4  # 背面范围
        radius = 0.15 + 0.12 * (1 - abs(angle) / 1.5)
        x = math.sin(angle) * radius
        y = 0.15  # 略微向后偏移
        z = HAIR_BASE - 0.1 * (1 - abs(angle) / 1.5)

        length = 0.7 + 0.2 * (1 - abs(angle) / 1.5)
        width = 0.04 + 0.015 * (1 - abs(angle) / 1.5)

        card = create_hair_card(
            (x, y, z),
            (0.1 + abs(angle) * 0.3, 0, angle + math.pi/2),
            (width, 1, length),
            subdivisions=4
        )
        card.name = f'long_back_{i}'
        card.data.materials.append(mat)
        card.parent = group

    return group

def create_bob_hair():
    """波波头 — 齐下巴长度，整齐边缘"""
    group = bpy.data.objects.new('bob_hair', None)
    group.empty_display_size = 0
    bpy.context.collection.objects.link(group)

    mat = make_hair_material('bob_hair_mat', '#1a1a1a')

    # 顶部覆盖
    for i in range(16):
        tilt = 0.2 + (i / 16) * 0.4
        angle = (i / 16) * 2 * math.pi
        radius = 0.24 + tilt * 0.08
        x = math.cos(angle) * radius
        y = math.sin(angle) * radius
        z = HAIR_BASE

        length = 0.3
        width = 0.06

        card = create_hair_card(
            (x, y, z),
            (tilt * 0.5, 0, angle + math.pi/2),
            (width, 1, length),
            subdivisions=2
        )
        card.name = f'bob_top_{i}'
        card.data.materials.append(mat)
        card.parent = group

    # 侧面发片 — 整齐垂直到下巴
    for i in range(24):
        angle = -1.8 + (i / 24) * 3.6
        radius = 0.20 + 0.10 * (1 - abs(angle) / 1.8)
        x = math.sin(angle) * radius
        y = math.cos(angle) * radius * 0.5
        z = HAIR_BASE - 0.1

        length = 0.45 + 0.08 * (1 - abs(angle) / 1.8)
        width = 0.04 + 0.02 * (1 - abs(angle) / 1.8)

        # 发梢微微内扣
        tilt_factor = abs(angle) / 1.8
        curve = 0.15 * tilt_factor

        card = create_hair_card(
            (x, y, z),
            (0.3 + curve, 0.05 * abs(angle), angle + math.pi/2),
            (width, 1, length),
            subdivisions=5
        )
        card.name = f'bob_side_{i}'
        card.data.materials.append(mat)
        card.parent = group

    # 刘海
    for i in range(8):
        angle = -0.6 + (i / 8) * 1.2
        radius = 0.08
        x = math.sin(angle) * radius
        y = -0.20 - 0.02 * (1 - abs(angle) / 0.6)
        z = HAIR_BASE + 0.02

        card = create_hair_card(
            (x, y, z),
            (0.5, 0, angle + math.pi/2),
            (0.03, 1, 0.25),
            subdivisions=2
        )
        card.name = f'bob_bangs_{i}'
        card.data.materials.append(mat)
        card.parent = group

    return group

def export_glb(group_obj, filename):
    """导出为 GLB 文件 — 将 group 下所有子 mesh 合并为一个"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filepath = os.path.join(OUTPUT_DIR, filename)

    # 选择 group 下所有子 mesh
    bpy.ops.object.select_all(action='DESELECT')
    meshes = [c for c in group_obj.children if c.type == 'MESH']
    for m in meshes:
        m.select_set(True)
        bpy.context.view_layer.objects.active = m

    if not meshes:
        print("  WARNING: no mesh children found!")
        return filepath

    # 合并所有 mesh 为一个对象
    bpy.ops.object.join()
    merged = bpy.context.active_object

    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=True,
        export_texcoords=False,
        export_normals=True,
        export_draco_mesh_compression_enable=False,
        export_apply=True
    )
    return filepath


# ===== 主流程 =====
clean_scene()

print("=" * 50)
print("Generating Short Hair...")
short = create_short_hair()
short_path = export_glb(short, 'short-hair.glb')
print(f"  -> {short_path}")

print("Generating Long Hair...")
long = create_long_hair()
long_path = export_glb(long, 'long-hair.glb')
print(f"  -> {long_path}")

print("Generating Bob Hair...")
bob = create_bob_hair()
bob_path = export_glb(bob, 'bob-hair.glb')
print(f"  -> {bob_path}")

print("=" * 50)
print(f"Done! Files:")
print(f"  {short_path}")
print(f"  {long_path}")
print(f"  {bob_path}")
