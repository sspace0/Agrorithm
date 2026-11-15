import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
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
  const geometry = useMemo(
      () => new THREE.PlaneGeometry(5.7, 2.85, 96, 48),
      [],
    ),
    mesh = useRef<THREE.Group>(null),
    halo = useRef<THREE.ShaderMaterial>(null),
    globeMaterial = useRef<THREE.MeshStandardMaterial>(null),
    mapMaterial = useRef<THREE.MeshBasicMaterial>(null),
    mapMesh = useRef<THREE.Mesh>(null),
    last = useRef(-1);
  const { camera, size } = useThree();
  useEffect(() => {
    onReady();
  }, [onReady, texture]);
  useFrame(() => {
    const p = motion ? progress : 0,
      turn = ease((p - 0.08) / 0.35),
      flat = ease((p - 0.48) / 0.4),
      angle = THREE.MathUtils.lerp(1.35, (-73 * Math.PI) / 180, turn);
    if (last.current !== p) {
      const positions = geometry.attributes.position,
        normals = geometry.attributes.normal,
        uv = geometry.attributes.uv;
      for (let i = 0; i < positions.count; i++) {
        const u = uv.getX(i),
          v = uv.getY(i),
          lon = (u - 0.5) * 2 * Math.PI,
          lat = (v - 0.5) * Math.PI;
        const a = new THREE.Vector3(
          Math.sin(lon) * Math.cos(lat),
          Math.sin(lat),
          Math.cos(lon) * Math.cos(lat),
        ).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        positions.setXYZ(i, a.x * 1.1, a.y * 1.1, a.z * 1.1);
        normals.setXYZ(i, a.x, a.y, a.z);
      }
      positions.needsUpdate = true;
      normals.needsUpdate = true;
      geometry.computeBoundingSphere();
      last.current = p;
    }
    const distance = THREE.MathUtils.lerp(
      size.width < 760 ? 6.8 : 5.3,
      Math.max(
        5.7,
        5.7 /
          (2 *
            Math.tan((34 * Math.PI) / 360) *
            (size.width / size.height) *
            0.88),
      ),
      flat,
    );
    camera.position.set(0, 0, distance + 1.2 * flat);
    camera.lookAt(0, 0, 0);
    if (halo.current) halo.current.uniforms.strength.value = 1 - flat;
    if (globeMaterial.current) globeMaterial.current.opacity = 1 - flat;
    if (mapMaterial.current) mapMaterial.current.opacity = flat;
    if (mapMesh.current) mapMesh.current.scale.setScalar(0.75 + flat * 0.25);
    if (mesh.current)
      mesh.current.position.x =
        (size.width < 760 ? 0 : 1.15) * (1 - ease((p - 0.28) / 0.28));
  });
  return (
    <group ref={mesh}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          ref={globeMaterial}
          map={texture}
          transparent
          roughness={1}
          metalness={0}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh ref={mapMesh} position={[0, 0, 1.2]}>
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
        <sphereGeometry args={[1.12, 48, 24]} />
        <shaderMaterial
          ref={halo}
          uniforms={{ strength: { value: 1 } }}
          vertexShader={`varying vec3 n; varying vec3 v; void main(){ vec4 p=modelViewMatrix*vec4(position,1.0); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p; }`}
          fragmentShader={`uniform float strength; varying vec3 n; varying vec3 v; void main(){ float rim=pow(1.0-abs(dot(normalize(n),normalize(v))),4.5); gl_FragColor=vec4(0.25,0.55,0.85,rim*0.55*strength); }`}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
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
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );
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
      <ambientLight intensity={1.05} />
      <directionalLight position={[-3, 2, 5]} intensity={2.3} color="#fff5df" />
      <Stars />
      <Suspense fallback={null}>
        <Earth progress={progress} motion={motion} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
