"""Rebuild editable illustration scenes, bundled GLBs and poster renders.
Run: blender --background --python assets/blender/generate.py
Geometry is illustrative and uses separate vertical scales for groundwater.
"""
import bpy, math, random, json, os
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
random.seed(42)
for p in ['public/models','public/images','assets/blender']:(ROOT/p).mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,texture=None):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=.88
 if texture:
  nt=m.node_tree
  for ch,input_name in [('Diffuse','Base Color'),('Rough','Roughness'),('nor_gl','Normal')]:
   path=ROOT/f'assets/textures/{texture}_{ch}.jpg';img=bpy.data.images.load(str(path),check_existing=True)
   # Runtime textures are resized and packed; original permitted assets remain editable.
   if img.size[0]>512:img.scale(512,512)
   img.pack();node=nt.nodes.new('ShaderNodeTexImage');node.image=img
   if ch=='Diffuse':nt.links.new(node.outputs['Color'],bs.inputs[input_name])
   elif ch=='Rough':img.colorspace_settings.name='Non-Color';nt.links.new(node.outputs['Color'],bs.inputs[input_name])
   else:
    img.colorspace_settings.name='Non-Color';normal=nt.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.5;nt.links.new(node.outputs['Color'],normal.inputs['Color']);nt.links.new(normal.outputs['Normal'],bs.inputs['Normal'])
 return m
top=material('Soil • organic surface',(.22,.13,.065),'brown_mud_02')
sub=material('Soil • mineral cut face',(.42,.25,.12),'forest_ground_04')
parent=material('Alluvial parent • illustrative',(.55,.42,.27),'aerial_grass_rock')
green=material('Leaves • sage',(.25,.38,.08));lightgreen=material('Leaves • sunlit',(.39,.5,.13));gold=material('Grain • ochre',(.68,.5,.18));rootmat=material('Roots • ivory',(.69,.53,.30));stone=material('Aggregates • warm grey',(.36,.31,.23));blue=material('Saturated pores • blue',(.11,.42,.48))
def box(name,loc,scale,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 # Bevel the external cut edge very slightly; preserve readable section faces.
 be=o.modifiers.new('Soft sectional edge','BEVEL');be.width=.025;be.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=be.name)
 return o
def curve(name,points,r,mat):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=2;c.bevel_depth=r;c.bevel_resolution=1
 s=c.splines.new('POLY');s.points.add(len(points)-1)
 for p,co in zip(s.points,points):p.co=(*co,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(mat);return o
def join_by_material(objects,name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();bpy.context.object.name=name;return bpy.context.object
layers=[]
layers.append(box('Layer_Topsoil',(0,0,-.23),(4,3,.46),top))
layers.append(box('Layer_Subsoil',(0,0,-.85),(4,3,.78),sub))
layers.append(box('Layer_Parent',(0,0,-1.65),(4,3,.82),parent))
blades=[];stems=[];heads=[]
verts=[];faces=[]
for i in range(1700):
 x=random.uniform(-1.95,1.95);y=random.uniform(-1.45,1.45);h=random.uniform(.06,.23);w=.018
 k=len(verts);verts.extend([(x-w,y,.005),(x+w,y,.005),(x+random.uniform(-.06,.06),y+.025,h)]);faces.append((k,k+1,k+2))
mesh=bpy.data.meshes.new('Instanced-style grass patch');mesh.from_pydata(verts,[],faces);mesh.materials.append(green);grass=bpy.data.objects.new('Surface_Grass',mesh);bpy.context.collection.objects.link(grass)
for row in range(6):
 for col in range(15):
  x=-1.8+col*.255+random.uniform(-.04,.04);y=-1.12+row*.43+random.uniform(-.03,.03);h=random.uniform(.5,.83)
  stems.append(curve('Stalk',[(x,y,0),(x+.025,y,h)],.012,green))
  for side in [-1,1]:
   z=h*.45;v=[(x,y,z),(x+side*.25,y+.06,z+.15),(x+side*.35,y+.08,z+.08),(x+side*.12,y,z+.03)]
   me=bpy.data.meshes.new('Leaf');me.from_pydata(v,[],[(0,1,2,3)]);me.materials.append(lightgreen);ob=bpy.data.objects.new('Leaf',me);bpy.context.collection.objects.link(ob);blades.append(ob)
  for j in range(4):
   bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.048,location=(x+.025,y,h+j*.045));o=bpy.context.object;o.scale=(.7,.7,1.25);o.data.materials.append(gold);heads.append(o)
join_by_material(stems,'Surface_Stalks');join_by_material(blades,'Surface_Leaves');join_by_material(heads,'Surface_Grain')
roots=[]
for i in range(36):
 x=random.uniform(-1.9,1.9);y=-1.512;depth=random.uniform(.38,1.13);points=[]
 for j in range(7):points.append((x+.05*math.sin(j*2+i),y-.008*j,-j*depth/6))
 roots.append(curve('Root',points,.012,rootmat))
 for k in [2,3,4]:
  start=points[k];side=random.choice([-1,1]);roots.append(curve('Lateral root',[start,(start[0]+side*.12,y-.04,start[2]-.05),(start[0]+side*.25,y-.05,start[2]-.18)],.005,rootmat))
join_by_material(roots,'Roots_Illustrative_1m')
stones=[]
for i in range(100):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=random.uniform(.015,.07),location=(random.uniform(-1.94,1.94),-1.515,random.uniform(-2.02,-.1)));o=bpy.context.object;o.scale=(1,.5,.65);o.data.materials.append(stone);stones.append(o)
join_by_material(stones,'Soil_Aggregates')
scene=bpy.context.scene
scene['geometry_status']='Illustrative root zone. Demo depths: 0–0.46, 0.46–1.24, 1.24–2.06 m, not measured horizons.'
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1400;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=True
world=scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.64,.64,1);world.node_tree.nodes['Background'].inputs[1].default_value=.65
def point(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(5.1,-7.4,4.1));cam=bpy.context.object;cam.name='Camera_Cutaway';cam.data.type='ORTHO';cam.data.ortho_scale=6.6;point(cam,(0,0,-.5));scene.camera=cam
for name,loc,power,size in [('Key',(1,-3,6),650,5),('Rim',(-4,2,4),800,4)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;point(o,(0,0,0))
def export(name):
 # Pack images into editable source; GLB includes all glTF-supported PBR maps.
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/f'assets/blender/{name}.blend'))
 bpy.ops.export_scene.gltf(filepath=str(ROOT/f'public/models/{name}.glb'),export_format='GLB',export_cameras=False,export_lights=False,export_image_format='JPEG',export_jpeg_quality=78,export_yup=True)
 scene.render.filepath=str(ROOT/f'public/images/{name}.png');bpy.ops.render.render(write_still=True)
 mesh_objects=[o for o in scene.objects if o.type=='MESH'];tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in mesh_objects)
 return {'scene':name,'triangles':tris,'meshObjects':len(mesh_objects),'glbBytes':(ROOT/f'public/models/{name}.glb').stat().st_size,'blender':bpy.app.version_string}
stats=[export('root-zone')]
# A different depth scale: pore markers embedded in solid sediment, never a water cavity.
for o in list(scene.objects):
 if o.type not in ['CAMERA','LIGHT']:bpy.data.objects.remove(o,do_unlink=True)
box('Layer_Unsaturated',(0,0,-.35),(4,3,.7),sub)
box('Layer_Saturated',(0,0,-1.18),(4,3,.96),parent)
box('Layer_LowPermeability',(0,0,-1.86),(4,3,.4),top)
pores=[]
for i in range(290):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=random.uniform(.016,.037),location=(random.uniform(-1.94,1.94),-1.52,random.uniform(-1.63,-.72)));o=bpy.context.object;o.data.materials.append(blue);pores.append(o)
join_by_material(pores,'Water_In_Pores')
curve('Water_Table_Boundary',[(-2,-1.53,-.7),(2,-1.53,-.7)],.015,blue)
box('Surface',(0,0,.015),(4,3,.03),green)
scene['geometry_status']='Illustrative unconfined aquifer with scale break. Water table is user controlled, not a NASA depth observation. Vertical display spans 0–20 m conceptually.'
stats.append(export('groundwater'))
(ROOT/'assets/blender/validation.json').write_text(json.dumps(stats,indent=2))
print(json.dumps(stats))
