import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { asset } from "../config";
type Props = {
  progress: number;
  onLoaded: () => void;
  view: "root-zone" | "groundwater";
  motion: boolean;
  quality: string;
  explode: boolean;
  layers: boolean;
  roots: boolean;
  process: string;
  rain: number;
  depth: number;
  reset: number;
  interactive: boolean;
};
function Model(p: Props) {
  const gltf = useGLTF(asset(`models/${p.view}-v2.glb`));
  const model = useMemo(() => gltf.scene.clone(true), [gltf]);
  const group = useRef<THREE.Group>(null);
  const initial = useMemo(() => {
    const m = new Map<string, THREE.Vector3>();
    model.traverse((o) => m.set(o.uuid, o.position.clone()));
    return m;
  }, [model]);
  useEffect(() => {
    p.onLoaded();
    model.traverse((o) => {
      if (o.name.startsWith("Layer_")) {
        o.visible = p.layers;
        const pos = initial.get(o.uuid)!;
        o.position.copy(pos);
        if (p.explode) {
          if (o.name.includes("Subsoil")) o.position.y -= 0.2;
          if (o.name.includes("Parent")) o.position.y -= 0.45;
        }
      }
      if (o.name.startsWith("Roots_")) o.visible = p.roots;
      if (o.name.startsWith("Water_")) o.visible = false;
    });
  }, [model, initial, p.layers, p.roots, p.explode]);
  useFrame(({ clock, pointer }, delta) => {
    if (group.current)
      group.current.rotation.y = THREE.MathUtils.damp(
        group.current.rotation.y,
        p.motion
          ? Math.sin(clock.elapsedTime * 0.16) * 0.018 +
              p.progress * 0.8 +
              (p.interactive ? 0 : pointer.x * 0.06)
          : 0,
        4,
        delta,
      );
    model.traverse((o) => {
      if (o.name.startsWith("Layer_")) {
        const base = initial.get(o.uuid)!.y;
        const spread = p.explode ? 0.2 : Math.max(0, p.progress - 0.35) * 0.5;
        const offset = o.name.includes("Subsoil")
          ? spread
          : o.name.includes("Parent")
            ? spread * 1.8
            : 0;
        o.position.y = THREE.MathUtils.damp(
          o.position.y,
          base - offset,
          5,
          delta,
        );
      }
      if (
        o.name === "Surface_Leaves" ||
        o.name === "Surface_Grain" ||
        o.name === "Surface_Stalks"
      )
        o.rotation.z = p.motion ? Math.sin(clock.elapsedTime * 0.8) * 0.004 : 0;
    });
  });
  return (
    <group ref={group}>
      <primitive object={model} />
      {p.view === "groundwater" && <Pores depth={p.depth} />}
      <Processes {...p} />
    </group>
  );
}
function Pores({ depth }: { depth: number }) {
  const positions = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 160; i++) {
      const x = Math.sin(i * 27.3) * 1.94;
      const y = -depth / 10 - ((Math.sin(i * 4.7) + 1) / 2) * (2 - depth / 10);
      arr.push(x, y, 1.54);
    }
    return new Float32Array(arr);
  }, [depth]);
  return (
    <>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#4d9fac" size={0.036} />
      </points>
      <mesh position={[0, -depth / 10, 1.55]}>
        <boxGeometry args={[4, 0.018, 0.012]} />
        <meshBasicMaterial color="#3c8a9b" />
      </mesh>
    </>
  );
}
function Processes(p: Props) {
  const points = useRef<THREE.Points>(null);
  const values = useMemo(
    () =>
      new Float32Array(
        Array.from({ length: 60 }, (_, i) =>
          i % 3 === 0 ? Math.sin(i) * 1.9 : i % 3 === 1 ? 1 : 1.6,
        ),
      ),
    [],
  );
  useFrame(({ clock }) => {
    if (!points.current || !p.motion || p.process === "none") return;
    const a = points.current.geometry.attributes.position;
    for (let i = 0; i < 20; i++) {
      const t = (clock.elapsedTime * 0.35 + i / 20) % 1;
      const y =
        p.process === "rain"
          ? 1.8 - t * 1.8
          : p.process === "infiltration"
            ? -t * 1.15
            : p.process === "uptake"
              ? -1.1 + t * 1.1
              : t * 0.9;
      a.setY(i, y);
    }
    a.needsUpdate = true;
  });
  if (p.process === "none" || !p.motion) return null;
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[values, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={p.process === "rain" ? 0.025 : 0.035}
        color={p.process === "uptake" ? "#d3ad51" : "#68a9bc"}
        transparent
        opacity={0.65}
      />
    </points>
  );
}
export default function SoilCanvas(p: Props) {
  const [visible, setVisible] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    ob.observe(el);
    const handler = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => {
      ob.disconnect();
      document.removeEventListener("visibilitychange", handler);
    };
  }, []);
  return (
    <div ref={ref} className="canvas-frame">
      <Canvas
        key={`${p.view}-${p.reset}`}
        dpr={p.quality === "low" ? 1 : [1, 1.5]}
        frameloop={visible && p.motion ? "always" : "demand"}
        camera={{ position: [4.8, 3.2, 6.6], fov: 34 }}
        gl={{
          antialias: p.quality !== "low",
          alpha: true,
          powerPreference: "low-power",
        }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            gl.domElement.dispatchEvent(
              new CustomEvent("fieldshift-context-lost", { bubbles: true }),
            );
          });
        }}
      >
        <ambientLight intensity={1.8} />
        <directionalLight position={[3, 6, 4]} intensity={3} color="#fff1cd" />
        <directionalLight
          position={[-4, 2, -2]}
          intensity={1.2}
          color="#c7d8ec"
        />
        <Suspense fallback={null}>
          <group>
            <Model {...p} />
          </group>
        </Suspense>
        <OrbitControls
          enableZoom={p.interactive}
          enableRotate={p.interactive}
          target={[0, -0.55, 0]}
          enablePan={false}
          minDistance={4}
          maxDistance={12}
          minPolarAngle={0.3}
          maxPolarAngle={Math.PI / 2}
          enableDamping={p.motion}
        />
      </Canvas>
    </div>
  );
}
