import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { asset, cropAsset } from "../config";
function Plant({ crop, onReady }: { crop: string; onReady: () => void }) {
  const gltf = useGLTF(asset(`models/crops/${cropAsset(crop)}.glb`));
  useEffect(() => onReady(), [gltf, onReady]);
  return <primitive object={gltf.scene} />;
}
export default function CropCanvas({
  crop,
  motion,
  low,
  onReady,
  onLost,
}: {
  crop: string;
  motion: boolean;
  low: boolean;
  onReady: () => void;
  onLost: () => void;
}) {
  return (
    <Canvas
      dpr={low ? 1 : [1, 1.5]}
      camera={{ position: [1.9, 1.05, 2.4], fov: 38 }}
      frameloop={motion ? "always" : "demand"}
      gl={{ antialias: !low, powerPreference: "low-power", alpha: true }}
      onCreated={({ gl }) =>
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onLost();
        })
      }
    >
      <ambientLight intensity={1.5} />
      <directionalLight position={[2, 4, 3]} intensity={2.5} color="#fff2d4" />
      <directionalLight
        position={[-3, 1, -1]}
        intensity={1.4}
        color="#c9dbda"
      />
      <Suspense fallback={null}>
        <Plant crop={crop} onReady={onReady} />
      </Suspense>
      <OrbitControls
        target={[0, 0.72, 0]}
        enablePan={false}
        minDistance={1.4}
        maxDistance={5}
        autoRotate={motion}
        autoRotateSpeed={0.4}
        enableDamping={motion}
      />
    </Canvas>
  );
}
