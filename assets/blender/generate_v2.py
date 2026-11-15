"""Deterministic FieldShift v2 cutaways.

Run Blender 5.2 LTS: blender --background --threads 6 --python assets/blender/generate_v2.py
Depths, crop density, roots and pore markers are illustrative, never a measured
Punjab profile. Groundwater uses a separate conceptual 0–20 m vertical scale.
Only the existing CC0 source textures are used. Color edits are baked into packed
image pixels so Blender and glTF show the same neutral mineral materials.
"""
import bpy, math, random, json, hashlib, gzip
from mathutils import Vector
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
random.seed(20261114)
for folder in ['public/models', 'public/images', 'assets/blender']:
    (ROOT / folder).mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.name = 'FieldShift • natural cutaway v2'

def processed_image(asset, channel, tint=None, size=512):
    path = ROOT / f'assets/textures/{asset}_{channel}.jpg'
    original = bpy.data.images.load(str(path), check_existing=True)
    image = original.copy()
    image.name = f'Packed_{asset}_{channel}_{"mineral" if tint else "natural"}'
    image.scale(size, size)
    if channel != 'Diffuse':
        image.colorspace_settings.name = 'Non-Color'
    elif tint:
        pixels = list(image.pixels[:])
        # Remove moss/vegetation chroma while retaining photographic fine detail.
        for i in range(0, len(pixels), 4):
            lum = .2126*pixels[i] + .7152*pixels[i+1] + .0722*pixels[i+2]
            for j in range(3):
                pixels[i+j] = max(0, min(1, lum*tint[j]))
        image.pixels[:] = pixels
        image.update()
    image.pack()
    return image

def material(name, color, asset=None, tint=None, rough=.88):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    nt = mat.node_tree
    bs = nt.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = rough
    if asset:
        for channel, target in [('Diffuse', 'Base Color'), ('Rough', 'Roughness'), ('nor_gl', 'Normal')]:
            tex = nt.nodes.new('ShaderNodeTexImage')
            tex.image = processed_image(asset, channel, tint)
            tex.extension = 'REPEAT'
            if channel == 'nor_gl':
                normal = nt.nodes.new('ShaderNodeNormalMap')
                normal.inputs['Strength'].default_value = .35
                nt.links.new(tex.outputs['Color'], normal.inputs['Color'])
                nt.links.new(normal.outputs['Normal'], bs.inputs[target])
            else:
                nt.links.new(tex.outputs['Color'], bs.inputs[target])
    return mat

top = material('PBR_Topsoil • damp earth', (.17,.11,.065), 'brown_mud_02', (.78,.61,.44))
sub = material('PBR_Subsoil • brown mineral', (.32,.22,.13), 'forest_ground_04', (1.05,.84,.62))
parent = material('PBR_Parent • neutral alluvial mineral', (.43,.34,.24), 'aerial_grass_rock', (1.18,.99,.76))
clay = material('PBR_Clay • low permeability illustration', (.25,.20,.16), 'brown_mud_02', (.83,.76,.65))
leaf_mats = [material('Leaf_deep_green', (.065,.22,.027), rough=.75), material('Leaf_sunlit_green', (.14,.32,.048), rough=.74), material('Leaf_olive_green', (.24,.37,.08), rough=.82)]
stem_mat = material('Stems • green grain-filling illustration', (.19,.31,.065), rough=.78)
grain_mat = material('Wheat • green grain-filling ear', (.40,.43,.18), rough=.82)
awn_mat = material('Wheat • fine pale green awns', (.44,.48,.23), rough=.9)
root_mat = material('Roots • tan fine fibers', (.49,.37,.22), rough=.94)
root_tip = material('Roots • pale active tips', (.66,.54,.35), rough=.93)
stone_mats = [material('Aggregate_dark', (.24,.20,.16)),material('Aggregate_light',(.41,.36,.28)),material('Aggregate_ochre',(.33,.26,.17))]
water_mat = material('Pore water • blue markers', (.08,.32,.39), rough=.58)

def mesh_object(name, vertices, faces, mats, indices=None, smooth=False):
    mesh = bpy.data.meshes.new(name + '_mesh')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for mat in mats: mesh.materials.append(mat)
    if indices:
        for poly, idx in zip(mesh.polygons, indices): poly.material_index = idx
    if smooth:
        for poly in mesh.polygons: poly.use_smooth = True
    return obj

def planar_uv(obj, tile_m=1.6):
    uv = obj.data.uv_layers.new(name='Physical_planar_UV')
    for poly in obj.data.polygons:
        axis = max(range(3), key=lambda a: abs(poly.normal[a]))
        for loop_index in poly.loop_indices:
            p = obj.data.vertices[obj.data.loops[loop_index].vertex_index].co
            a,b = (p.x,p.y) if axis==2 else (p.x,p.z) if axis==1 else (p.y,p.z)
            uv.data[loop_index].uv = (a/tile_m, b/tile_m)

def noise(x,y,phase=0):
    return math.sin(x*2.6+y*.9+phase)*.026 + math.sin(x*5.9-y*3.8+phase)*.009

def horizon(i,x,y):
    if i==0: return noise(x,y,0)*.45
    if i==1: return -.39 + noise(x,y,1.4)*1.5 + .022*math.sin(x*1.5)
    if i==2: return -1.13 + noise(x,y,2.7)*1.9
    return -2.02 + noise(x,y,4)*.55

def layer(name, top_fn, bottom_fn, mat, nx=32, ny=24):
    verts=[];faces=[]
    for fn in [top_fn,bottom_fn]:
        for j in range(ny+1):
            y=-1.5+3*j/ny
            for i in range(nx+1):
                x=-2+4*i/nx
                verts.append((x,y,fn(x,y)))
    stride=nx+1;offset=(nx+1)*(ny+1)
    for j in range(ny):
        for i in range(nx):
            a=j*stride+i
            faces.append((a,a+1,a+1+stride,a+stride))
            a+=offset
            faces.append((a+stride,a+1+stride,a+1,a))
    edge=[]
    edge += [i for i in range(nx+1)]
    edge += [j*stride+nx for j in range(1,ny+1)]
    edge += [ny*stride+i for i in range(nx-1,-1,-1)]
    edge += [j*stride for j in range(ny-1,0,-1)]
    for i,a in enumerate(edge):
        b=edge[(i+1)%len(edge)]
        faces.append((a,a+offset,b+offset,b))
    obj=mesh_object(name,verts,faces,[mat])
    planar_uv(obj)
    return obj

def tube_data(points, radii, radial=5):
    verts=[];faces=[]
    for i,p in enumerate(points):
        p=Vector(p)
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])
        tangent.normalize()
        side=tangent.cross(Vector((0,1,0)))
        if side.length<.01: side=tangent.cross(Vector((1,0,0)))
        side.normalize();up=tangent.cross(side).normalized()
        for k in range(radial):
            a=2*math.pi*k/radial
            verts.append(tuple(p+(side*math.cos(a)+up*math.sin(a))*radii[i]))
    for i in range(len(points)-1):
        for k in range(radial):
            a=i*radial+k;b=i*radial+(k+1)%radial
            faces.append((a,b,b+radial,a+radial))
    faces.append(tuple(range(radial-1,-1,-1)))
    faces.append(tuple((len(points)-1)*radial+k for k in range(radial)))
    return verts,faces

def append_geometry(target,vertices,faces):
    offset=len(target[0]);target[0].extend(vertices);target[1].extend(tuple(i+offset for i in face) for face in faces)

def add_tube(target,points,radii,radial=5): append_geometry(target,*tube_data(points,radii,radial))

def ellipsoid_data(center,scale,rotation=0,segments=8,rings=3):
    vertices=[(0,0,scale[2])]
    for j in range(1,rings):
        t=math.pi*j/rings
        for k in range(segments):
            a=2*math.pi*k/segments
            vertices.append((math.sin(t)*math.cos(a)*scale[0], math.sin(t)*math.sin(a)*scale[1], math.cos(t)*scale[2]))
    vertices.append((0,0,-scale[2]));faces=[]
    for k in range(segments): faces.append((0,1+k,1+(k+1)%segments))
    for j in range(rings-2):
        for k in range(segments):
            a=1+j*segments+k;b=1+j*segments+(k+1)%segments
            faces.append((a,a+segments,b+segments,b))
    last=len(vertices)-1
    for k in range(segments):faces.append((last,last-segments+(k+1)%segments,last-segments+k))
    ca,sa=math.cos(rotation),math.sin(rotation)
    return [(center[0]+x*ca-y*sa,center[1]+x*sa+y*ca,center[2]+z) for x,y,z in vertices],faces

def create_surface(wheat=True):
    grass=[[],[]];grass_ids=[]
    count=2100 if wheat else 800
    for k in range(count):
        x=random.uniform(-1.98,1.98);y=random.uniform(-1.48,1.48);z=horizon(0,x,y)
        h=random.uniform(.045,.14) if wheat else random.uniform(.04,.12)
        angle=random.uniform(0,math.tau);dx=math.cos(angle);dy=math.sin(angle);w=random.uniform(.003,.008)
        verts=[]
        for j in range(4):
            t=j/3;curve=t*t*h*.44
            for side in [-1,1]:verts.append((x+dx*curve-dy*w*side*(1-t),y+dy*curve+dx*w*side*(1-t),z+h*t))
        faces=[(j*2,j*2+1,j*2+3,j*2+2) for j in range(3)]
        append_geometry(grass,verts,faces);grass_ids.extend([k%3]*3)
    mesh_object('Surface_Grass',*grass,leaf_mats,grass_ids,smooth=True)
    if not wheat:return
    stems=[[],[]];leaves=[[],[]];leaf_ids=[];grains=[[],[]];awns=[[],[]]
    for row in range(9):
        for col in range(20):
            x=-1.9+col*.2+random.uniform(-.044,.044);y=-1.28+row*.32+random.uniform(-.044,.044)
            z=horizon(0,x,y);height=random.uniform(.60,.87)
            lean_x=random.uniform(-.055,.055);lean_y=random.uniform(-.035,.045)
            points=[(x+lean_x*(j/6)**1.5,y+lean_y*(j/6)**1.5,z+height*j/6) for j in range(7)]
            add_tube(stems,points,[.006*(1-j/12) for j in range(7)],6)
            for j in range(4):
                t0=.20+j*.17;ang=random.uniform(0,math.tau);length=random.uniform(.21,.32);width=random.uniform(.010,.016)
                verts=[]
                for k in range(9):
                    t=k/8;r=length*t;leaf_z=z+height*t0+length*(.45*math.sin(t*math.pi)-.15*t)
                    base_x=x+lean_x*t0+math.cos(ang)*r;base_y=y+lean_y*t0+math.sin(ang)*r
                    w=width*math.sin(math.pi*t)**.55 if t>0 else .001
                    verts.extend([(base_x-math.sin(ang)*w,base_y+math.cos(ang)*w,leaf_z),(base_x+math.sin(ang)*w,base_y-math.cos(ang)*w,leaf_z+.003*math.sin(math.pi*t))])
                append_geometry(leaves,verts,[(k*2,k*2+1,k*2+3,k*2+2) for k in range(8)])
                leaf_ids.extend([(row+col+j)%3]*8)
            hx,hy,hz=points[-1];ear_h=random.uniform(.10,.145);ear_rot=random.uniform(0,math.tau)
            add_tube(stems,[(hx,hy,hz),(hx+.012,hy,hz+ear_h)],[.0035,.0015],5)
            for n in range(12):
                side=-1 if n%2 else 1;level=n//2;off=side*(.0105+.002*math.sin(level))
                center=(hx+math.cos(ear_rot)*off,hy+math.sin(ear_rot)*off,hz+.012+level*ear_h/6)
                append_geometry(grains,*ellipsoid_data(center,(.011,.007,.017),ear_rot))
                if n%2==0:
                    # Crossed very thin awn ribbons read naturally at web size.
                    tip=(center[0]+side*.021*math.cos(ear_rot),center[1]+side*.021*math.sin(ear_rot),center[2]+.048)
                    for dx,dy in [(.0006,0),(0,.0006)]:append_geometry(awns,[(center[0]-dx,center[1]-dy,center[2]),(center[0]+dx,center[1]+dy,center[2]),tip],[(0,1,2)])
    mesh_object('Surface_Stalks',*stems,[stem_mat],smooth=True)
    mesh_object('Surface_Leaves',*leaves,leaf_mats,leaf_ids,smooth=True)
    mesh_object('Surface_Grain',*grains,[grain_mat],smooth=True)
    mesh_object('Surface_Awns',*awns,[awn_mat])

def create_roots(shallow=False):
    main=[[],[]];fine=[[],[]]
    for clump in range(15):
        x=-1.85+clump*.265+random.uniform(-.035,.035);top_z=horizon(0,x,-1.48)
        for strand in range(5):
            depth=random.uniform(.30,.90) if not shallow else random.uniform(.08,.24)
            spread=random.uniform(-.18,.18);base_y=random.uniform(-1.525,-1.49)
            pts=[]
            for k in range(9):
                t=k/8;pts.append((x+spread*t+.025*math.sin(t*7+strand)*t,base_y-.018*math.sin(t*6+clump),top_z-depth*t))
            add_tube(main,pts,[.0048*(1-k/10)**1.2 for k in range(9)],5)
            if not shallow:
                for branch in [3,5,6]:
                    bx,by,bz=pts[branch];side=random.choice([-1,1]);extent=random.uniform(.05,.12)
                    bpts=[(bx,by,bz),(bx+side*extent*.5,by-.012,bz-depth*.055),(bx+side*extent,by-.01,bz-depth*.14)]
                    add_tube(fine,bpts,[.0018,.0010,.0003],4)
    mesh_object('Roots_Illustrative_Fibrous',*main,[root_mat],smooth=True)
    if fine[0]:mesh_object('Roots_Fine_Laterals',*fine,[root_tip],smooth=True)
    # Some roots are visible on the right cut face and genuinely extend in depth.
    side=[[],[]]
    for n in range(9):
        y=random.uniform(-1.4,1.4);dep=random.uniform(.22,.65)
        pts=[(2.008+.009*math.sin(k),y+.06*math.sin(k*1.3+n),-.01-dep*k/6) for k in range(7)]
        add_tube(side,pts,[.0035*(1-k/7) for k in range(7)],4)
    mesh_object('Roots_Right_Section',*side,[root_mat],smooth=True)

def aggregates(count=200):
    geom=[[],[]];indices=[]
    for i in range(count):
        x=random.uniform(-1.97,1.97);z=random.uniform(-1.98,-.05);r=random.uniform(.009,.035)
        y=-1.503-random.uniform(.001,.01)
        v,f=ellipsoid_data((x,y,z),(r,random.uniform(.008,.018),r*.7),random.random()*math.tau,6,3)
        append_geometry(geom,v,f);indices.extend([i%3]*len(f))
    mesh_object('Soil_Aggregates',*geom,stone_mats,indices,smooth=True)

def root_scene():
    for i,name,mat in [(0,'Layer_Topsoil',top),(1,'Layer_Subsoil',sub),(2,'Layer_Parent',parent)]:
        layer(name,lambda x,y,j=i:horizon(j,x,y),lambda x,y,j=i:horizon(j+1,x,y),mat)
    create_surface(True);create_roots();aggregates()
    scene['geometry_status']='Illustrative alluvial-style soil, not a measured profile. Approximate boundaries 0.39, 1.13 and 2.02 m vary smoothly. Illustrative wheat/fibrous roots and planting density; no cultivar or future growth claim.'

def groundwater_scene():
    layer('Layer_Unsaturated',lambda x,y:noise(x,y)*.3,lambda x,y:-.69+noise(x,y,1)*1.2,sub)
    layer('Layer_Saturated',lambda x,y:-.69+noise(x,y,1)*1.2,lambda x,y:-1.65+noise(x,y,4)*1.3,parent)
    layer('Layer_LowPermeability',lambda x,y:-1.65+noise(x,y,4)*1.3,lambda x,y:-2.02+noise(x,y,7)*.5,clay)
    create_surface(False);create_roots(True);aggregates(150)
    water=[[],[]]
    for i in range(300):
        center=(random.uniform(-1.97,1.97),-1.516,random.uniform(-1.62,-.72))
        r=random.uniform(.006,.013)
        append_geometry(water,*ellipsoid_data(center,(r,.006,r*.75),0,6,3))
    mesh_object('Water_In_Pores',*water,[water_mat],smooth=True)
    line=[[],[]];add_tube(line,[(-2,-1.526,-.7),(2,-1.526,-.7)],[.007,.007],5)
    mesh_object('Water_Table_Boundary',*line,[water_mat])
    # Fine fracture marks remain within solid material; they are not a water void.
    fracture=[[],[]]
    for i in range(12):
        x=random.uniform(-1.8,1.8);z=random.uniform(-1.5,-.8)
        add_tube(fracture,[(x,-1.52,z),(x+.035,-1.522,z-.08),(x-.015,-1.52,z-.15)],[.0025,.002,.0005],4)
    mesh_object('Water_Filled_Fractures_Illustrative',*fracture,[water_mat])
    scene['geometry_status']='Illustrative unconfined groundwater in pores/fractures. Explicit separate 0–20 m conceptual scale; boundary shown at demo 7 m. No NASA-derived depth or aquifer dynamics. Layers, roots and fractures are not site measurements.'

def point_at(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

def setup_render():
    scene.render.engine='CYCLES';scene.cycles.samples=40
    scene.cycles.use_denoising=True
    scene.render.resolution_x=1600;scene.render.resolution_y=1250;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.film_transparent=True
    scene.view_settings.view_transform='AgX'
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.64,.72,.78,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.55
    bpy.ops.object.camera_add(location=(5.0,-7.8,3.7));camera=bpy.context.object;camera.name='Camera_Cutaway_v2';camera.data.type='ORTHO';camera.data.ortho_scale=6.5;point_at(camera,(0,0,-.45));scene.camera=camera
    for name,location,energy,size,color in [('Key_soft',(0,-4.5,6),700,5,(1,.90,.73)),('Rim_soft',(-4,2,4),900,4,(.73,.85,1)),('Cut_face_fill',(2,-5,1),180,4,(1,.96,.88))]:
        bpy.ops.object.light_add(type='AREA',location=location);light=bpy.context.object;light.name=name;light.data.energy=energy;light.data.shape='DISK';light.data.size=size;light.data.color=color;point_at(light,(0,0,-.6))

def export(name):
    source=ROOT/f'assets/blender/{name}.blend';glb=ROOT/f'public/models/{name}.glb';poster=ROOT/f'public/images/{name}.png'
    bpy.ops.wm.save_as_mainfile(filepath=str(source))
    bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_cameras=False,export_lights=False,export_image_format='JPEG',export_jpeg_quality=82,export_yup=True)
    scene.render.filepath=str(poster);bpy.ops.render.render(write_still=True)
    tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in scene.objects if o.type=='MESH')
    nodes=[o.name for o in scene.objects if o.type=='MESH']
    bounds=[o.matrix_world@Vector(v) for o in scene.objects if o.type=='MESH' for v in o.bound_box]
    return {'scene':name,'triangles':tris,'meshObjects':len(nodes),'meshNodes':nodes,'blenderBoundsMeters':{'min':[round(min(v[a] for v in bounds),4) for a in range(3)],'max':[round(max(v[a] for v in bounds),4) for a in range(3)]},'coordinateConvention':'Blender Z up, front cut face Y=-1.5; glTF exported Y up. Groundwater vertical units are conceptual with an explicit scale break.','glbBytes':glb.stat().st_size,'gzipGlbBytes':len(gzip.compress(glb.read_bytes())),'blendBytes':source.stat().st_size,'posterBytes':poster.stat().st_size,'sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'blender':bpy.app.version_string,'geometryStatus':scene['geometry_status']}

if __name__ == '__main__':
    root_scene();setup_render();stats=[export('root-zone-v2')]
    for obj in list(scene.objects):
        if obj.type not in ['CAMERA','LIGHT']:bpy.data.objects.remove(obj,do_unlink=True)
    groundwater_scene();stats.append(export('groundwater-v2'))
    report={'seed':20261114,'textureProcessing':'Existing CC0 PBR maps, 512px packed copies; diffuse chroma removed and warm mineral tint baked to image pixels. Physical planar UV tile 1.6 m. No moss or grass diffuse in underground layers.','scenes':stats}
    (ROOT/'assets/blender/validation-v2.json').write_text(json.dumps(report,indent=2))
    print('AGRORITHM_V2_RESULT',json.dumps(report),flush=True)
