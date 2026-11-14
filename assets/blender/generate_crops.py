"""Editable, lightweight crop category studies for the FieldShift selectors.

blender --background --threads 6 --python assets/blender/generate_crops.py
Append -- --only maize to build just the detailed maize study. Plant geometry,
stage, cultivar, density and normalized presentation scale are illustrative.
"""
import bpy, math, random, json, hashlib, gzip, sys
from mathutils import Vector
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
random.seed(20261114)
for folder in ['assets/blender','public/models/crops','public/images/crops']:(ROOT/folder).mkdir(parents=True,exist_ok=True)

def mat(name,color,rough=.8):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
    m.use_backface_culling=False
    return m

green=mat('Leaf • natural deep green',(.045,.19,.025));sun=mat('Leaf • young green',(.18,.34,.045));mid=mat('Leaf • middle green',(.10,.28,.036))
vein=mat('Vein • subtle green',(.22,.37,.074));stem=mat('Stem • green',(.15,.29,.045));husk=mat('Husk • pale green',(.31,.43,.10));gold=mat('Grain • warm gold',(.65,.43,.12));pale=mat('Glume • green gold',(.42,.46,.15));red=mat('Sorghum • red brown grain',(.33,.12,.04));flower=mat('Mungbean • small yellow flower',(.85,.62,.08));silk=mat('Maize • dry silks',(.35,.19,.06))
bark=mat('Tree • warm rough bark',(.19,.105,.046),.94);tomato_red=mat('Tomato • ripe red fruit',(.57,.025,.012),.43);fruit_green=mat('Fruit • unripe green',(.20,.34,.025),.54);orange=mat('Citrus • orange fruit',(.94,.30,.018),.63);mango_yellow=mat('Mango • yellow green fruit',(.63,.48,.045),.56)

def mesh(name,v,f,materials,ids=None,smooth=True):
    me=bpy.data.meshes.new(name+'_mesh');me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o)
    for m in materials:me.materials.append(m)
    for p in me.polygons:p.use_smooth=smooth
    if ids:
        for p,i in zip(me.polygons,ids):p.material_index=i
    return o

def add(g,v,f):
    off=len(g[0]);g[0].extend(v);g[1].extend(tuple(i+off for i in face) for face in f)

def tube(g,pts,rs,n=6):
    v=[];f=[]
    for i,p in enumerate(pts):
        p=Vector(p);t=Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(i-1,0)]);t.normalize();a=t.cross(Vector((0,1,0)))
        if a.length<.01:a=t.cross(Vector((1,0,0)))
        a.normalize();b=t.cross(a).normalized()
        for j in range(n):v.append(tuple(p+(a*math.cos(j*math.tau/n)+b*math.sin(j*math.tau/n))*rs[i]))
    for i in range(len(pts)-1):
        for j in range(n):a=i*n+j;b=i*n+(j+1)%n;f.append((a,b,b+n,a+n))
    f.extend([tuple(range(n-1,-1,-1)),tuple((len(pts)-1)*n+j for j in range(n))]);add(g,v,f)

def ellipsoid(g,c,s,seg=8,rings=3,axis=None):
    v=[(0,0,s[2])];f=[]
    for j in range(1,rings):
        for k in range(seg):a=k*math.tau/seg;t=j*math.pi/rings;v.append((math.sin(t)*math.cos(a)*s[0],math.sin(t)*math.sin(a)*s[1],math.cos(t)*s[2]))
    v.append((0,0,-s[2]))
    for k in range(seg):f.append((0,1+k,1+(k+1)%seg))
    for j in range(rings-2):
        for k in range(seg):a=1+j*seg+k;b=1+j*seg+(k+1)%seg;f.append((a,a+seg,b+seg,b))
    last=len(v)-1
    for k in range(seg):f.append((last,last-seg+(k+1)%seg,last-seg+k))
    rot=Vector((0,0,1)).rotation_difference(Vector(axis).normalized()) if axis else None
    add(g,[tuple(Vector(c)+(rot@Vector(p) if rot else Vector(p))) for p in v],f)

def blade(g,base,angle,length,width,rise=.22,droop=.3,sections=12,cross=6,rib=True):
    v=[];f=[]
    for i in range(sections+1):
        t=i/sections;r=length*t;w=width*(math.sin(math.pi*t)**.7 if 0<t<1 else .015)
        z=base[2]+rise*math.sin(t*math.pi*.7)-droop*t*t
        for j in range(cross+1):
            q=2*j/cross-1;fold=.012*(1-q*q)*math.sin(math.pi*t)+.002*math.cos(q*math.pi*4)*math.sin(math.pi*t) if rib else .004*(1-q*q)
            v.append((base[0]+math.cos(angle)*r-math.sin(angle)*w*q,base[1]+math.sin(angle)*r+math.cos(angle)*w*q,z+fold))
    for i in range(sections):
        for j in range(cross):a=i*(cross+1)+j;f.append((a,a+1,a+cross+2,a+cross+1))
    add(g,v,f)

def clear():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def maize():
    stalk=[[],[]];leaves=[[],[]];ribs=[[],[]];husks=[[],[]];kernels=[[],[]];tassel=[[],[]];anthers=[[],[]];silks=[[],[]]
    pts=[(.015*math.sin(k*.8),0,k*.145) for k in range(10)];tube(stalk,pts,[.015-k*.0008 for k in range(10)],10)
    for k in range(1,9):
        base=pts[k];a=(k%2)*math.pi+.3+random.uniform(-.24,.24);length=.38+.22*math.sin(k/10*math.pi)
        blade(leaves,base,a,length,.065+.02*math.sin(k/10*math.pi),rise=.20,droop=.25,sections=14,cross=8)
        ribpts=[]
        for j in range(12):t=j/11;ribpts.append((base[0]+math.cos(a)*length*t,base[1]+math.sin(a)*length*t,base[2]+.20*math.sin(t*math.pi*.7)-.25*t*t+.013*math.sin(math.pi*t)))
        tube(ribs,ribpts,[.0025*(1-j/13) for j in range(12)],4)
        # Leaf sheath and swollen internode remain visible around the culm.
        tube(stalk,[(base[0],base[1],base[2]-.025),(base[0],base[1],base[2]+.018)],[.018,.016],10)
    # A partly opened cob exposes actual staggered kernel rows; the second ear is green and closed.
    for ear in range(2):
        base=Vector((-.006,0,.60+ear*.24));a=-.9+ear*2.7;axis=Vector((math.cos(a)*.44,math.sin(a)*.44,.9)).normalized();rot=Vector((0,0,1)).rotation_difference(axis)
        tube(stalk,[tuple(base),tuple(base+axis*.19)],[.013,.009],8)
        if ear==0:
            for row in range(13):
                taper=.75+.25*math.sin((row+.5)/13*math.pi)
                for k in range(14):
                    angle=k*math.tau/14+(row%2)*.06;r=.029*taper
                    center=base+rot@Vector((r*math.cos(angle),r*math.sin(angle),.035+row*.012))
                    ellipsoid(kernels,center,(.0077,.0077,.0082),8,3,axis)
        for j in range(5):
            aa=j*math.tau/5;local=[[],[]];length=.21 if ear else .15
            blade(local,(0,0,0),aa,length,.024,rise=.15 if ear else .06,droop=.015,sections=9,cross=4)
            # Husks curl from the cob base; opening leaves the upper kernels readable.
            add(husks,[tuple(base+rot@Vector((x*.35,y*.35,z+length*.2))) for x,y,z in local[0]],local[1])
        for j in range(14):
            tip=base+axis*(.22 if ear else .205);d=Vector((random.uniform(-.025,.025),random.uniform(-.025,.025),random.uniform(.01,.04)))
            tube(silks,[tuple(tip),tuple(tip+d*.6),tuple(tip+d+Vector((.01,0,-.02)))],[.0008,.0006,.0002],3)
    tube(tassel,[(.01,0,1.28),(.01,0,1.51)],[.004,.0008],5)
    for n in range(11):
        a=n*2.4;z=1.31+(n%4)*.032;base=Vector((.01,0,z));tip=base+Vector((math.cos(a)*(.14-(n%3)*.02),math.sin(a)*(.14-(n%3)*.02),.085))
        tube(tassel,[tuple(base),tuple((base+tip)/2+Vector((0,0,.025))),tuple(tip)],[.002,.0014,.0004],5)
        for j in range(9):t=(j+.5)/9;p=base.lerp(tip,t);ellipsoid(anthers,p,(.002,.002,.006),5,2)
    mesh('Maize_Jointed_Stem',*stalk,[stem]);mesh('Maize_Broad_Ribbed_Leaves',*leaves,[mid]);mesh('Maize_Leaf_Midribs',*ribs,[vein]);mesh('Maize_Layered_Husks',*husks,[husk]);mesh('Maize_Individual_Kernels',*kernels,[gold]);mesh('Maize_Branching_Tassel',*tassel,[pale]);mesh('Maize_Tassel_Anthers',*anthers,[gold]);mesh('Maize_Cob_Silks',*silks,[silk])

def wheat():
    stalk=[[],[]];leaves=[[],[]];grains=[[],[]];awns=[[],[]]
    for n in range(4):
        a=n*2.4;h=1.15+random.uniform(-.12,.12);x=.04*math.cos(a);y=.04*math.sin(a)
        tube(stalk,[(0,0,0),(x,y,h*.5),(x*2,y*2,h)],[.006,.004,.002],7)
        for j in range(4):blade(leaves,(x,y,h*(.22+j*.17)),a+j*2.3,.25,.018,.10,.11,12,4)
        for level in range(8):
            for side in [-1,1]:
                center=(x*2+side*.011,y*2,h+level*.02);ellipsoid(grains,center,(.012,.008,.022),8,3,(side*.35,0,1))
                tube(awns,[center,(center[0]+side*.034,center[1],center[2]+.07)],[.0007,.0002],3)
    mesh('Wheat_Tillering_Stems',*stalk,[stem]);mesh('Wheat_Narrow_Curved_Leaves',*leaves,[mid]);mesh('Wheat_Paired_Spikelets',*grains,[pale]);mesh('Wheat_Fine_Awns',*awns,[pale])

def rice():
    stalk=[[],[]];leaves=[[],[]];branches=[[],[]];grains=[[],[]]
    for n in range(9):
        a=n*2.4;h=random.uniform(.9,1.13);end=Vector((math.cos(a)*.10,math.sin(a)*.10,h));tube(stalk,[(0,0,0),tuple(end*.5),tuple(end)],[.0045,.003,.0015],6)
        for j in range(3):blade(leaves,tuple(end*(.20+j*.23)),a+j*2,.36,.013,.20,.13,12,4)
        tip=end+Vector((math.cos(a)*.12,math.sin(a)*.12,.04));tube(branches,[tuple(end),tuple(tip)],[.0018,.0004],4)
        for j in range(7):
            t=j/7;base=end.lerp(tip,t);aa=a+(-1 if j%2 else 1)*.6;bt=base+Vector((math.cos(aa)*.075,math.sin(aa)*.075,-.035-j*.006));tube(branches,[tuple(base),tuple(bt)],[.0009,.0003],4)
            for k in range(4):p=base.lerp(bt,(k+1)/4);ellipsoid(grains,p,(.003,.004,.010),6,3,(.4,0,1))
    mesh('Rice_Clump_Stems',*stalk,[stem]);mesh('Rice_Long_Narrow_Leaves',*leaves,[green]);mesh('Rice_Drooping_Panicle_Branches',*branches,[pale]);mesh('Rice_Individual_Panicle_Grains',*grains,[pale])

def leaflet(g,base,angle,length,width):blade(g,base,angle,length,width,.025,.04,10,6,False)

def mungbean():
    stalk=[[],[]];leaves=[[],[]];veins=[[],[]];pods=[[],[]];flowers=[[],[]]
    tube(stalk,[(0,0,0),(.015,0,.35),(0,0,.7)],[.009,.006,.002],8)
    for n in range(7):
        a=n*2.4;z=.18+n*.07;base=Vector((0,0,z));tip=base+Vector((math.cos(a)*.18,math.sin(a)*.18,.09));tube(stalk,[tuple(base),tuple(tip)],[.004,.0015],6)
        for j in [-1,0,1]:
            aa=a+j*.8;size=.15 if j==0 else .12;leaflet(leaves,tuple(tip),aa,size,.057)
            tube(veins,[tuple(tip),tuple(tip+Vector((math.cos(aa)*size*.85,math.sin(aa)*size*.85,-.01)))],[.0011,.0002],3)
        if n>1:
            for j in range(2):
                start=tip+Vector((.015*j,-.015*j,-.015));end=start+Vector((math.cos(a)*.035,math.sin(a)*.035,-.13-random.random()*.04))
                tube(pods,[tuple(start),tuple(start.lerp(end,.5)+Vector((.008,0,0))),tuple(end)],[.003,.006,.0015],7)
            for j in range(4):ellipsoid(flowers,tip+Vector((math.cos(j*1.6)*.008,math.sin(j*1.6)*.008,.008)),(.007,.004,.009),6,3)
    mesh('Mungbean_Branching_Stem',*stalk,[stem]);mesh('Mungbean_Trifoliate_Leaflets',*leaves,[mid]);mesh('Mungbean_Leaf_Veins',*veins,[vein]);mesh('Mungbean_Long_Slender_Pods',*pods,[green]);mesh('Mungbean_Small_Yellow_Flowers',*flowers,[flower])

def sorghum():
    stalk=[[],[]];leaves=[[],[]];panicle=[[],[]];grain=[[],[]]
    tube(stalk,[(0,0,0),(.01,0,.6),(0,0,1.15)],[.012,.009,.004],9)
    for n in range(7):blade(leaves,(0,0,.14+n*.13),n*2.8,.42-.02*n,.042,.18,.24,14,6)
    for n in range(26):
        a=n*2.4;z=1.13+(n%7)*.027;r=.055*math.sin((z-1.10)/.25*math.pi);tip=Vector((math.cos(a)*r,math.sin(a)*r,z));tube(panicle,[(0,0,1.11),tuple(tip)],[.0017,.0008],4)
        for j in range(10):
            c=tip+Vector((random.uniform(-.015,.015),random.uniform(-.015,.015),random.uniform(-.015,.015)));ellipsoid(grain,c,(.006,.006,.007),6,3)
    mesh('Sorghum_Strong_Culm',*stalk,[stem]);mesh('Sorghum_Arching_Leaves',*leaves,[mid]);mesh('Sorghum_Compact_Panicle_Branches',*panicle,[pale]);mesh('Sorghum_Dense_Seed_Head',*grain,[red])

def leaf_3d(g,base,direction,length,width,serrated=False):
    d=Vector(direction).normalized();side=d.cross(Vector((0,0,1)))
    if side.length<.01:side=d.cross(Vector((0,1,0)))
    side.normalize();normal=side.cross(d).normalized();v=[];f=[];sections=10;cross=4
    for i in range(sections+1):
        t=i/sections;shape=math.sin(math.pi*t)**.75 if 0<t<1 else .008
        if serrated:shape*=1+.11*math.sin(i*math.pi*.8)
        for j in range(cross+1):
            q=j/cross*2-1;p=Vector(base)+d*(length*t)+side*(width*shape*q)+normal*(.016*math.sin(math.pi*t)-.006*abs(q)*math.sin(math.pi*t));v.append(tuple(p))
    for i in range(sections):
        for j in range(cross):a=i*(cross+1)+j;f.append((a,a+1,a+cross+2,a+cross+1))
    add(g,v,f)

def tomato():
    stalk=[[],[]];leaves=[[],[]];ripe=[[],[]];unripe=[[],[]];calyx=[[],[]]
    tube(stalk,[(0,0,0),(.015,0,.40),(-.01,.01,.87)],[.011,.007,.0025],8)
    for n in range(8):
        a=n*2.4;z=.16+n*.085;base=Vector((0,0,z));end=base+Vector((math.cos(a)*.22,math.sin(a)*.22,.10));tube(stalk,[tuple(base),tuple(base.lerp(end,.6)),tuple(end)],[.004,.0025,.0009],6)
        tangent=(end-base).normalized();side=tangent.cross(Vector((0,0,1))).normalized()
        for level in range(3):
            origin=base.lerp(end,.30+level*.22)
            for sign in [-1,1]:leaf_3d(leaves,origin,tangent*.2+side*sign+Vector((0,0,.14)),.11+level*.018,.038,True)
        leaf_3d(leaves,end,tangent,.16,.044,True)
        if n%2==0:
            for j in range(3):
                c=end+Vector((math.cos(a+j)*.035,math.sin(a+j)*.035,-.045-j*.036));r=.030+j*.003;tube(stalk,[tuple(end),tuple(c+Vector((0,0,r)))],[.0016,.0009],5)
                ellipsoid(ripe if j!=2 else unripe,c,(r,r,r*.90),10,5)
                top=c+Vector((0,0,r*.87))
                for k in range(5):
                    angle=k*math.tau/5;tip=top+Vector((math.cos(angle)*r*.85,math.sin(angle)*r*.85,.008));left=top+Vector((math.cos(angle+.45)*.008,math.sin(angle+.45)*.008,0));right=top+Vector((math.cos(angle-.45)*.008,math.sin(angle-.45)*.008,0));add(calyx,[tuple(left),tuple(right),tuple(tip)],[(0,1,2)])
    mesh('Tomato_Branching_Herb_Stems',*stalk,[stem]);mesh('Tomato_Compound_Serrated_Leaflets',*leaves,[mid]);mesh('Tomato_Ripe_Red_Fruit',*ripe,[tomato_red]);mesh('Tomato_Green_Fruit',*unripe,[fruit_green]);mesh('Tomato_Star_Calyxes',*calyx,[green])

def fruit_tree(kind):
    woody=[[],[]];leaves=[[],[]];young=[[],[]];fruit=[[],[]];unripe=[[],[]];petioles=[[],[]]
    tube(woody,[(0,0,0),(.025,.012,.35),(.005,0,.68),(0,.015,.96)],[.037,.029,.018,.006],10)
    terminals=[]
    for n in range(14):
        a=n*2.4;base=Vector((.01,0,.35+(n%6)*.08));r=.25+.06*math.sin(n*1.7);end=Vector((math.cos(a)*r,math.sin(a)*r,.68+(n%5)*.08));middle=base.lerp(end,.6)+Vector((0,0,.055));tube(woody,[tuple(base),tuple(middle),tuple(end)],[.012,.007,.0024],7);terminals.append(end)
        for k in range(9):
            aa=a+k*math.tau/9;origin=end+Vector((math.cos(aa)*.025,math.sin(aa)*.025,(k%3-1)*.035));direction=Vector((math.cos(aa),math.sin(aa),random.uniform(-.75,.4)))
            if kind=='mango':leaf_3d(leaves,origin,direction,.22+random.uniform(-.025,.025),.025)
            else:leaf_3d(young if k%5==0 else leaves,origin,direction,.12+random.uniform(-.015,.015),.037)
        if n%2==0:
            c=end+Vector((0,0,-.065));tube(petioles,[tuple(end),tuple(c+Vector((0,0,.04)))],[.002,.001],5)
            if kind=='mango':ellipsoid(unripe if n%4 else fruit,c,(.035,.029,.057),10,5,(.20,.08,-1))
            else:ellipsoid(fruit,c,(.041,.041,.040),12,5)
    mesh(kind.title()+'_Woody_Trunk_And_Branches',*woody,[bark]);mesh(kind.title()+('_Long_Drooping_Leaves' if kind=='mango' else '_Oval_Glossy_Leaves'),*leaves,[green]);mesh(kind.title()+'_Fruit_Stems',*petioles,[stem]);mesh(kind.title()+('_Yellow_Fruit' if kind=='mango' else '_Orange_Fruit'),*fruit,[mango_yellow if kind=='mango' else orange])
    if young[0]:mesh('Citrus_Young_Green_Leaves',*young,[sun])
    if unripe[0]:mesh('Mango_Green_Fruit',*unripe,[fruit_green])

def citrus():fruit_tree('citrus')
def mango():fruit_tree('mango')

def point(o,t):o.rotation_euler=(Vector(t)-o.location).to_track_quat('-Z','Y').to_euler()

def export(name):
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];allv=[o.matrix_world@v.co for o in objects for v in o.data.vertices];height=max(p.z for p in allv)
    for o in objects:
        for v in o.data.vertices:v.co*=1.5/height
    scene=bpy.context.scene;scene['geometry_status']='Illustrative botanical study, not a cultivar claim, crop observation or forecast. Uniformly normalized to 1.5 m presentation height; not a field scale comparison.'
    scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=1200;scene.render.resolution_y=1400;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=True;scene.view_settings.view_transform='AgX';scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.68,.75,.8,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.55
    bpy.ops.object.camera_add(location=(2.6,-4,2.1));cam=bpy.context.object;cam.name='Camera_Botanical_Study';cam.data.type='ORTHO';cam.data.ortho_scale=1.91;point(cam,(0,0,.75));scene.camera=cam
    for location,energy,size,color in [((0,-3,4),400,3,(1,.93,.80)),((-2,1,3),500,3,(.8,.9,1)),((2,2,1),200,2,(1,1,.9))]:
        bpy.ops.object.light_add(type='AREA',location=location);l=bpy.context.object;l.data.energy=energy;l.data.size=size;l.data.color=color;point(l,(0,0,.7))
    source=ROOT/f'assets/blender/crop-{name}.blend';glb=ROOT/f'public/models/crops/{name}.glb';poster=ROOT/f'public/images/crops/{name}.png';bpy.ops.wm.save_as_mainfile(filepath=str(source));bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_cameras=False,export_lights=False,export_yup=True)
    scene.render.filepath=str(poster);bpy.ops.render.render(write_still=True)
    tris=sum(len(p.vertices)-2 for o in objects for p in o.data.polygons);bounds=[o.matrix_world@v.co for o in objects for v in o.data.vertices]
    return {'crop':name,'triangles':tris,'meshNodes':[o.name for o in objects],'presentationHeightMeters':1.5,'blenderBoundsMeters':{'min':[round(min(v[a] for v in bounds),4) for a in range(3)],'max':[round(max(v[a] for v in bounds),4) for a in range(3)]},'origin':'Base at (0,0,0); Blender Z up, exported glTF Y up','glbBytes':glb.stat().st_size,'gzipGlbBytes':len(gzip.compress(glb.read_bytes())),'blendBytes':source.stat().st_size,'posterBytes':poster.stat().st_size,'sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'geometryStatus':scene['geometry_status']}

names=['maize','mungbean','tomato','citrus']
if '--only' in sys.argv:names=sys.argv[sys.argv.index('--only')+1].split(',')
path=ROOT/'assets/blender/validation-crops.json';report=json.loads(path.read_text()) if path.exists() else {'blender':bpy.app.version_string,'seed':20261114,'status':'Illustrative procedural botanical studies; no external plant textures','crops':[]}
for name in names:
    if name in ['tomato','citrus','mango']:random.seed(20261114+sum((i+1)*ord(c) for i,c in enumerate(name)))
    clear();globals()[name]();result=export(name);report['crops']=[x for x in report['crops'] if x['crop']!=name]+[result];path.write_text(json.dumps(report,indent=2));print('CROP_COMPLETE',json.dumps(result),flush=True)
