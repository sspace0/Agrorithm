import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { asset } from "../config";
const ease = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
function Earth({
  progress,
  motion,
  onReady,
}: {
  progress: number;
  motion: boolean;
  onReady: () => void;
}) {
  const texture = useLoader(
    THREE.TextureLoader,
    asset("images/earth-2004.webp"),
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  const nasa = useLoader(GLTFLoader, asset("models/earth-nasa.glb"));
  const model = useMemo(() => {
    const scene = nasa.scene.clone(true);
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const mesh = o as THREE.Mesh;
        const original = mesh.material as THREE.MeshStandardMaterial;
        const material = original.clone();
        material.transparent = true;
        material.metalness = 0;
        material.roughness = 0.54;
        material.normalScale.setScalar(0.45);
        mesh.material = material;
      }
    });
    return scene;
  }, [nasa]);
  const globe = useRef<THREE.Group>(null),
    group = useRef<THREE.Group>(null),
    map = useRef<THREE.Mesh>(null),
    mapMaterial = useRef<THREE.MeshBasicMaterial>(null),
    halo = useRef<THREE.ShaderMaterial>(null);
  const { camera, size, pointer } = useThree();
  useEffect(() => {
    onReady();
  }, [texture, model, onReady]);
  useFrame((_, delta) => {
    const aspect = size.width / size.height,
      portrait = aspect < 1.15,
      openingDistance = portrait
        ? Math.max(
            6.8,
            1.12 /
              Math.sin(
                Math.atan(Math.tan((34 * Math.PI) / 360) * aspect * 0.88),
              ),
          )
        : 5.3,
      p = motion ? progress : 0,
      turn = ease((p - 0.08) / 0.58),
      flat = ease((p - 0.68) / 0.26);
    if (globe.current)
      globe.current.rotation.y = motion
        ? THREE.MathUtils.damp(
            globe.current.rotation.y,
            (THREE.MathUtils.lerp(-12, -36.5, turn) * Math.PI) / 180,
            2.3,
            Math.min(0.05, delta),
          )
        : (-12 * Math.PI) / 180;
    model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh)
        ((o as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity =
          1 - flat;
    });
    if (mapMaterial.current) mapMaterial.current.opacity = flat;
    if (map.current) map.current.scale.setScalar(0.75 + 0.25 * flat);
    if (halo.current) halo.current.uniforms.strength.value = 1 - flat;
    const distance = THREE.MathUtils.lerp(
      openingDistance,
      5.7 /
        (2 * Math.tan((34 * Math.PI) / 360) * (size.width / size.height) * 1),
      flat,
    );
    camera.position.set(0, 0, distance + 1.2 * flat);
    camera.lookAt(0, 0, 0);
    if (group.current)
      group.current.position.x =
        (portrait ? 0 : 0.95 * Math.min(1, Math.max(0, (aspect - 1) / 0.44))) *
        (1 - ease((p - 0.44) / 0.26));
    if (group.current) {
      group.current.position.y = portrait
        ? -Math.min(0.85, Math.max(0.48, 0.48 + (0.7 - aspect) * 1.6)) *
          (1 - flat)
        : 0;
      group.current.rotation.x = motion
        ? THREE.MathUtils.damp(
            group.current.rotation.x,
            pointer.y * 0.025 * (1 - flat),
            1.8,
            Math.min(0.05, delta),
          )
        : 0;
    }
  });
  return (
    <group ref={group}>
      <group ref={globe}>
        <primitive object={model} />
      </group>
      <mesh ref={map} position={[0, 0, 1.2]}>
        <planeGeometry args={[5.7, 2.85]} />
        <meshBasicMaterial
          ref={mapMaterial}
          map={texture}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.12, 96, 48]} />
        <shaderMaterial
          ref={halo}
          uniforms={{ strength: { value: 1 } }}
          vertexShader="varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}"
          fragmentShader="uniform float strength;varying vec3 n;varying vec3 v;void main(){float rim=pow(1.0-abs(dot(normalize(n),normalize(v))),4.5);gl_FragColor=vec4(0.25,0.55,0.85,rim*0.35*strength);}"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
function Sun({ progress, motion }: { progress: number; motion: boolean }) {
  const core = useRef<THREE.MeshBasicMaterial>(null),
    glow = useRef<THREE.SpriteMaterial>(null);
  const texture = useMemo(() => {
    const d = new Uint8Array(64 * 64 * 4);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const r = Math.hypot(x - 31.5, y - 31.5) / 31.5,
          i = (y * 64 + x) * 4;
        d.set(
          [255, 208, 120, Math.round(Math.pow(Math.max(0, 1 - r), 3) * 200)],
          i,
        );
      }
    const t = new THREE.DataTexture(d, 64, 64);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  }, []);
  useFrame(() => {
    const opacity = 1 - ease(((motion ? progress : 0) - 0.35) / 0.2);
    if (core.current) core.current.opacity = opacity;
    if (glow.current) glow.current.opacity = opacity;
  });
  return (
    <group position={[-2.1, 1.4, -0.6]}>
      <mesh>
        <sphereGeometry args={[0.075, 24, 16]} />
        <meshBasicMaterial ref={core} color="#fff4d2" transparent />
      </mesh>
      <sprite scale={[1.3, 1.3, 1]}>
        <spriteMaterial
          ref={glow}
          map={texture}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
    </group>
  );
}
function Stars() {
  const points = useMemo(
    () =>
      new Float32Array(
        Array.from({ length: 900 }, (_, i) =>
          i % 3 === 0
            ? Math.sin(i * 19.3) * 10
            : i % 3 === 1
              ? Math.sin(i * 8.7) * 6
              : -4 - Math.abs(Math.sin(i)) * 4,
        ),
      ),
    [],
  );
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#e1e9db"
        size={0.018}
        sizeAttenuation
        transparent
        opacity={0.72}
      />
    </points>
  );
}
export default function EarthCanvas({
  progress,
  motion,
  visible,
  onReady,
  onFail,
}: {
  progress: number;
  motion: boolean;
  visible: boolean;
  onReady: () => void;
  onFail: () => void;
}) {
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  return (
    <Canvas
      dpr={matchMedia("(max-width:760px)").matches ? 1 : [1, 1.5]}
      frameloop={motion && visible ? "always" : "demand"}
      camera={{ position: [0, 0, 5.3], fov: 34 }}
      gl={{ alpha: true, powerPreference: "low-power", antialias: true }}
      onCreated={({ gl }) => {
        gl.setClearColor(0, 0);
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          if (alive.current) onFail();
        });
      }}
    >
      <ambientLight intensity={0.16} />
      <directionalLight
        position={[-5, 2.8, 5]}
        intensity={3.7}
        color="#fff4df"
      />
      <Sun progress={progress} motion={motion} />
      <Stars />
      <Suspense fallback={null}>
        <Earth progress={progress} motion={motion} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
