"""Rebuild the detailed conceptual groundwater scene from deterministic geometry.

Blender --background --threads 6 --python assets/blender/enhance_groundwater.py
The 0–20 m display scale, demo 7 m water table and enlarged pore geometry are
illustrations. They do not estimate field geology, permeability or aquifer change.
Run after generate_v2.py when rebuilding all scenes; only groundwater outputs change.
"""
import bpy
import gzip
import hashlib
import importlib.util
import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('cutaway_base', Path(__file__).with_name('generate_v2.py'))
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
random.seed(20261115)
base.groundwater_scene()
scene = bpy.context.scene
scene.name = 'Agrorithm • porous unconfined groundwater'
for obj in list(scene.objects):
    if obj.name.startswith('Water_') or obj.name == 'Soil_Aggregates':
        bpy.data.objects.remove(obj, do_unlink=True)

void = base.material('Pore openings • enlarged section illustration', (.064, .053, .039), rough=.97)
rim = base.material('Pore mineral rims • warm alluvium', (.31, .265, .19), rough=.94)
wet = base.material('Pore water • restrained opaque blue-grey', (.055, .255, .285), rough=.49)
fracture = base.material('Mineral fracture shadow', (.092, .077, .056), rough=.98)
lamina = base.material('Compacted fine sediment laminae', (.22, .185, .137), rough=.96)

def batch():
    return [[], []]

def lump(target, point, scale, rotation=0, segments=8, rings=4):
    base.append_geometry(target, *base.ellipsoid_data(point, scale, rotation, segments, rings))

def face_point(face, u, z, outward=.014):
    return (u, -1.5-outward, z) if face == 'front' else (2+outward, u, z)

def disk(target, face, u, z, radius, aspect=1, outward=.019):
    # Convex mineral/pore section; enlarged to remain legible at web-view scale.
    scale = (radius, .006, radius*aspect) if face == 'front' else (.006, radius, radius*aspect)
    lump(target, face_point(face, u, z, outward), scale, 0, 8, 4)

stones = batch(); stone_ids = []
pores = batch(); rims = batch(); filled = batch(); seams = batch(); water_seams = batch(); beds = batch()
for face in ['front', 'right']:
    umin, umax = (-1.94, 1.94) if face == 'front' else (-1.44, 1.44)
    for index in range(265 if face == 'front' else 170):
        u = random.uniform(umin, umax); z = random.uniform(-1.96, -.055)
        r = random.uniform(.010, .036) * (1.25 if -.68 > z > -1.62 else .76)
        scale = (r, .010, r*.62) if face == 'front' else (.010, r, r*.62)
        v, f = base.ellipsoid_data(face_point(face, u, z, .012), scale, 0, 7, 4)
        base.append_geometry(stones, v, f); stone_ids.extend([index%3]*len(f))
    for index in range(124 if face == 'front' else 84):
        u = random.uniform(umin+.04, umax-.04); z = random.uniform(-1.61, -.13)
        r = random.uniform(.014, .029); aspect = random.uniform(.48, .88)
        disk(rims, face, u, z, r*1.28, aspect, .019)
        disk(pores, face, u, z, r, aspect, .026)
        if z < -.70:
            disk(filled, face, u, z-r*.12, r*.76, aspect*.72, .033)
    for index in range(18 if face == 'front' else 13):
        u = random.uniform(umin+.12, umax-.12); z = random.uniform(-1.48, -.27)
        points = [face_point(face, u+.015*math.sin(k*1.8+index), z-k*.034, .018) for k in range(5)]
        base.add_tube(seams, points, [.0028,.0031,.0024,.0021,.0008], 5)
        if z < -.74:
            points = [face_point(face, u+.015*math.sin(k*1.8+index), z-k*.034, .024) for k in range(5)]
            base.add_tube(water_seams, points, [.0014,.0017,.0013,.0011,.0005], 5)
    for level in range(7):
        z = -1.70-level*.043
        for n in range(5):
            start = umin+(umax-umin)*n/5+random.uniform(.005,.03)
            end = min(umax, start+random.uniform(.30,.63))
            pts = [face_point(face, start+(end-start)*k/9, z+.009*math.sin(k*.7+n), .009) for k in range(10)]
            base.add_tube(beds, pts, [.002]*10, 4)

base.mesh_object('Soil_Aggregates', *stones, base.stone_mats, stone_ids, smooth=True)
base.mesh_object('Pore_Mineral_Rims_Illustrative', *rims, [rim], smooth=True)
base.mesh_object('Pore_Section_Openings_Illustrative', *pores, [void], smooth=True)
base.mesh_object('Mineral_Fractures_Illustrative', *seams, [fracture], smooth=True)
base.mesh_object('Compacted_Fine_Sediment_Laminae', *beds, [lamina], smooth=True)
base.mesh_object('Water_Detailed_Pores_Illustrative', *filled, [wet], smooth=True)
base.mesh_object('Water_Detailed_Fractures_Illustrative', *water_seams, [wet], smooth=True)
# Named boundary is retained for tools inspecting the Blender source. The browser
# uses its existing user-controlled boundary and clips detailed water to that depth.
boundary = batch()
base.add_tube(boundary, [(-2,-1.54,-.7),(2,-1.54,-.7)], [.006,.006], 6)
base.add_tube(boundary, [(2.04,-1.5,-.7),(2.04,1.5,-.7)], [.005,.005], 6)
base.mesh_object('Water_Table_Boundary', *boundary, [wet])

scene['geometry_status'] = ('Illustrative unconfined groundwater, conceptual 0–20 m vertical scale with demo table at 7 m. '
    'Enlarged pore openings, mineral grains, water films and fine fractures explain porous material; they are not measured porosity, '
    'a site-specific horizon, water storage or field depth. No aquifer dynamics or recharge prediction. No free underground pool.')
scene['illustrative_water_table_m'] = 7.0
scene['pore_geometry_status'] = 'Enlarged cross-section teaching geometry, not resolved field pore size.'
# Preserve the photographic normal/roughness detail while making the default wet
# zone a clear blue teaching color. The web uses the same plane at the chosen depth.
for obj in scene.objects:
    if not obj.type == 'MESH' or not obj.name.startswith(('Layer_', 'Soil_', 'Pore_', 'Mineral_', 'Compacted_')):
        continue
    for slot in obj.material_slots:
        original = slot.material
        if not original or original.name.endswith(' • wet display'):
            continue
        mat = original.copy(); mat.name = original.name + ' • wet display'; slot.material = mat
        nt = mat.node_tree; bs = nt.nodes.get('Principled BSDF')
        source = bs.inputs['Base Color'].links[0].from_socket if bs.inputs['Base Color'].is_linked else None
        if source is None:
            rgb = nt.nodes.new('ShaderNodeRGB'); rgb.outputs[0].default_value = bs.inputs['Base Color'].default_value; source = rgb.outputs[0]
        geometry = nt.nodes.new('ShaderNodeNewGeometry')
        separate = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(geometry.outputs['Position'], separate.inputs[0])
        below = nt.nodes.new('ShaderNodeMath'); below.operation = 'LESS_THAN'; below.inputs[1].default_value = -.7; nt.links.new(separate.outputs['Z'], below.inputs[0])
        luminance = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(source, luminance.inputs[0])
        blue = nt.nodes.new('ShaderNodeMixRGB'); blue.blend_type = 'MULTIPLY'; blue.inputs[0].default_value = 1; blue.inputs[2].default_value = (.34,.66,.90,1); nt.links.new(luminance.outputs[0], blue.inputs[1])
        mix = nt.nodes.new('ShaderNodeMixRGB'); nt.links.new(below.outputs[0], mix.inputs[0]); nt.links.new(source, mix.inputs[1]); nt.links.new(blue.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], bs.inputs['Base Color'])
        # The material's nonprocedural textures remain available for glTF. These
        # Blender display nodes are applied only after the browser GLB is exported.
base.setup_render()
scene.cycles.samples = 48
scene.cycles.device = 'CPU'
scene.render.threads_mode = 'FIXED'; scene.render.threads = 6
scene.render.film_transparent = True
bpy.context.preferences.filepaths.save_version = 0
source = ROOT/'assets/blender/groundwater-v2.blend'
glb = ROOT/'public/models/groundwater-v2.glb'
poster = ROOT/'public/images/groundwater-v2.png'
# Temporarily use the underlying exportable PBR materials for the GLB. Runtime
# saturation tint is implemented by the shared browser shader at the selected depth.
slots = [(slot, slot.material) for obj in scene.objects if obj.type=='MESH' for slot in obj.material_slots if slot.material.name.endswith(' • wet display')]
for slot, mat in slots:
    slot.material = bpy.data.materials.get(mat.name.removesuffix(' • wet display'))
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', export_cameras=False, export_lights=False, export_image_format='JPEG', export_jpeg_quality=82, export_yup=True)
for slot, mat in slots: slot.material = mat
bpy.ops.wm.save_as_mainfile(filepath=str(source))
scene.render.filepath = str(poster); bpy.ops.render.render(write_still=True)
tris = sum(sum(len(p.vertices)-2 for p in obj.data.polygons) for obj in scene.objects if obj.type=='MESH')
nodes = [obj.name for obj in scene.objects if obj.type=='MESH']
bounds = [obj.matrix_world @ base.Vector(point) for obj in scene.objects if obj.type=='MESH' for point in obj.bound_box]
stats = {'scene':'groundwater-v2', 'triangles':tris, 'meshObjects':len(nodes), 'meshNodes':nodes,
    'blenderBoundsMeters':{'min':[round(min(point[axis] for point in bounds),4) for axis in range(3)], 'max':[round(max(point[axis] for point in bounds),4) for axis in range(3)]},
    'coordinateConvention':'Blender Z up; glTF Y up. Groundwater vertical scale is conceptual with a scale break.',
    'glbBytes':glb.stat().st_size, 'gzipGlbBytes':len(gzip.compress(glb.read_bytes())), 'blendBytes':source.stat().st_size,
    'posterBytes':poster.stat().st_size, 'sha256':hashlib.sha256(glb.read_bytes()).hexdigest(), 'blender':bpy.app.version_string,
    'geometryStatus':scene['geometry_status']}
stats['detailRevision'] = 'porous-section-2026-11-15'
stats['runtimeWater'] = 'Named detailed water meshes use a user-controlled clipping plane in the browser; no inferred water depth.'
stats['wetDisplay'] = 'Blue wet saturation is an illustrative display color: Blender poster uses the default 7 m plane; browser uses the selected plane, preserving mineral luminance/normal detail.'
validation_path = ROOT/'assets/blender/validation-v2.json'
validation = json.loads(validation_path.read_text())
validation['scenes'] = [stats if item['scene']=='groundwater-v2' else item for item in validation['scenes']]
validation_path.write_text(json.dumps(validation, indent=2))
print('AGRORITHM_GROUNDWATER_RESULT', json.dumps(stats), flush=True)
