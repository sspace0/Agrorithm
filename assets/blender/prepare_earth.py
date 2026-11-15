"""Optimize NASA VTAD's Earth-with-clouds model for the opening scene."""
import bpy
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/".cache/nasa-earth.glb"))
objects=[o for o in bpy.context.scene.objects if o.type=="MESH"]
points=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box]
low=Vector(tuple(min(p[i] for p in points) for i in range(3)))
high=Vector(tuple(max(p[i] for p in points) for i in range(3)))
center=(low+high)/2
scale=2.2/max(high-low)
for obj in objects:
    obj.name="NASA_Earth_Surface_Clouds"
    for v in obj.data.vertices:
        v.co=(obj.matrix_world@v.co-center)*scale
    obj.matrix_world.identity()
    for polygon in obj.data.polygons: polygon.use_smooth=True
for image in bpy.data.images:
    if image.type in {"RENDER_RESULT","COMPOSITING"}: continue
    if len(image.pixels): _=image.pixels[0]
    if not image.has_data: continue
    target=2048 if "diff" in image.name.lower() else 1024
    ratio=min(1,target/max(image.size))
    if ratio<1: image.scale(round(image.size[0]*ratio),round(image.size[1]*ratio))
    image.filepath_raw=str(ROOT/".cache"/("earth-"+str(target)+".png"))
    image.file_format="PNG"
    image.save()
    if image.packed_file: image.unpack(method="REMOVE")
    image.pack()
for material in bpy.data.materials:
    if not material.use_nodes: continue
    for node in material.node_tree.nodes:
        if node.type=="BSDF_PRINCIPLED":
            node.inputs["Metallic"].default_value=0
            node.inputs["Roughness"].default_value=.6
        if node.type=="NORMAL_MAP": node.inputs["Strength"].default_value=.45
bpy.context.scene["source"]="NASA VTAD Earth with Clouds; historical illustration, not current cloud observations"
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/"assets/blender/earth-nasa.blend"),compress=True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/"public/models/earth-nasa.glb"),export_format="GLB",export_image_format="JPEG",export_jpeg_quality=88)
print("EARTH_EXPORT_COMPLETE",len(objects),sum(len(o.data.polygons) for o in objects))
