import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { fitModelDistance } from "../engine/presentation";
export type SceneOptions = {
  view?: "root-zone" | "groundwater";
  layers?: boolean;
  roots?: boolean;
  explode?: boolean;
  process?: string;
  depth?: number;
  rain?: number;
};
export type SceneAnnotation = {
  id: string;
  title: string;
  detail: string;
  node?: string;
  position?: [number, number, number];
};
export type ModelCommands = {
  reset: () => void;
  zoom: (factor: number) => void;
  resume: () => void;
  inspect: () => void;
};
export type ModelSceneProps = {
  url: string;
  motion: boolean;
  low: boolean;
  visible: boolean;
  progress: number;
  options: SceneOptions;
  annotations: SceneAnnotation[];
  resetKey?: number;
  interactive: boolean;
  onReady: () => void;
  onFail: () => void;
  onProgress: (value: number | null) => void;
  onManual: (value: boolean) => void;
  onCommands: (commands: ModelCommands) => void;
  host: HTMLDivElement | null;
};
function boundsInLocalSpace(object: THREE.Object3D) {
  object.updateWorldMatrix(true, true);
  const inverse = object.matrixWorld.clone().invert(),
    box = new THREE.Box3();
  object.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    if (mesh.geometry.boundingBox)
      box.union(
        mesh.geometry.boundingBox
          .clone()
          .applyMatrix4(
            new THREE.Matrix4().multiplyMatrices(inverse, child.matrixWorld),
          ),
      );
  });
  return box;
}
function closestSurfaceAnchor(object: THREE.Object3D, desired: THREE.Vector3) {
  object.updateWorldMatrix(true, true);
  const inverse = object.matrixWorld.clone().invert(),
    triangle = new THREE.Triangle();
  const candidate = new THREE.Vector3(),
    closest = desired.clone();
  let best = Infinity;
  object.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const geometry = (child as THREE.Mesh).geometry,
      positions = geometry.attributes.position;
    if (!positions) return;
    const index = geometry.index,
      count = index?.count ?? positions.count;
    const relative = new THREE.Matrix4().multiplyMatrices(
      inverse,
      child.matrixWorld,
    );
    for (let i = 0; i + 2 < count; i += 3) {
      triangle.a
        .fromBufferAttribute(positions, index ? index.getX(i) : i)
        .applyMatrix4(relative);
      triangle.b
        .fromBufferAttribute(positions, index ? index.getX(i + 1) : i + 1)
        .applyMatrix4(relative);
      triangle.c
        .fromBufferAttribute(positions, index ? index.getX(i + 2) : i + 2)
        .applyMatrix4(relative);
      triangle.closestPointToPoint(desired, candidate);
      const distance = candidate.distanceToSquared(desired);
      if (distance < best) {
        best = distance;
        closest.copy(candidate);
      }
    }
  });
  return closest;
}
function Asset(p: ModelSceneProps) {
  const gltf = useLoader(GLTFLoader, p.url, undefined, (event) =>
    p.onProgress(
      event.lengthComputable && event.total ? event.loaded / event.total : null,
    ),
  );
  const model = useMemo(() => gltf.scene.clone(true), [gltf]);
  const initial = useMemo(() => {
    const positions = new Map<string, THREE.Vector3>();
    model.traverse((o) => positions.set(o.uuid, o.position.clone()));
    return positions;
  }, [model]);
  const bounds = useMemo(() => new THREE.Box3().setFromObject(model), [model]);
  const center = useMemo(() => bounds.getCenter(new THREE.Vector3()), [bounds]);
  const size = useMemo(() => bounds.getSize(new THREE.Vector3()), [bounds]);
  const stage = useRef<THREE.Group>(null),
    manual = useRef(false),
    controls = useRef<OrbitControls | null>(null),
    frameTime = useRef(0);
  const { camera, gl, size: viewport, invalidate } = useThree();
  const fitted = useRef(1),
    radius = size.length() / 2;
  const annotations = useMemo(
    () =>
      p.annotations.map((a) => {
        let box = bounds;
        let target: THREE.Object3D = model;
        if (a.node) {
          let found: THREE.Object3D | undefined;
          model.traverse((o) => {
            if (
              o.name.includes(a.node!) ||
              (a.node === "Leaves" && o.name.includes("Leaflets"))
            )
              found = o;
          });
          if (found) {
            const localBox = boundsInLocalSpace(found);
            if (!localBox.isEmpty()) {
              box = localBox;
              target = found;
            }
          }
        }
        let anchor = a.position
          ? new THREE.Vector3(...a.position)
          : box.getCenter(new THREE.Vector3());
        if (a.position) target = model;
        if (!a.position) {
          anchor.z = box.max.z + 0.035 * radius;
          if (a.node === "Leaves")
            anchor.x -= box.getSize(new THREE.Vector3()).x * 0.24;
          // A combined-mesh box can contain empty space. Point to its actual surface.
          anchor = closestSurfaceAnchor(target, anchor);
        }
        return { ...a, anchor, target };
      }),
    [p.annotations, model, bounds, radius],
  );
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const c = new OrbitControls(cam, gl.domElement);
    controls.current = c;
    c.enableDamping = p.motion;
    c.dampingFactor = 0.09;
    c.zoomToCursor = true;
    c.enableZoom = p.interactive;
    c.zoomSpeed = 1.25;
    c.panSpeed = 0.65;
    c.minPolarAngle = 0.12;
    c.maxPolarAngle = Math.PI - 0.12;
    const interactive = () => {
      if (!p.interactive) return;
      manual.current = true;
      p.onManual(true);
      c.enablePan = true;
    };
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey) {
        e.stopImmediatePropagation();
        return;
      }
      interactive();
    };
    gl.domElement.addEventListener("wheel", wheel, {
      capture: true,
      passive: false,
    });
    const changed = () => invalidate();
    c.addEventListener("start", interactive);
    c.addEventListener("change", changed);
    const fit = () => {
      const direction = p.options.view
        ? new THREE.Vector3(1, 0.7, 2.4)
        : new THREE.Vector3(0.6, 0.15, 3);
      const d = fitModelDistance(
        size.toArray() as [number, number, number],
        viewport.width / viewport.height,
        cam.fov,
        direction.toArray() as [number, number, number],
      );
      fitted.current = d * (p.options.view ? 1.1 : 1.12);
      cam.near = Math.max(0.0001, radius * 0.002);
      cam.far = Math.max(100, radius * 150);
      cam.updateProjectionMatrix();
      cam.position.copy(
        direction.normalize().multiplyScalar(d * (p.options.view ? 1.1 : 1)),
      );
      c.target.set(0, 0, 0);
      c.minDistance = radius * 0.06;
      c.maxDistance = radius * 80;
      c.enablePan = false;
      c.update();
      manual.current = false;
      p.onManual(false);
      invalidate();
    };
    p.onCommands({
      reset: fit,
      resume: () => {
        manual.current = false;
        p.onManual(false);
        c.enablePan = false;
        fit();
      },
      inspect: interactive,
      zoom: (factor) => {
        interactive();
        const v = cam.position.clone().sub(c.target);
        v.multiplyScalar(factor);
        v.clampLength(c.minDistance, c.maxDistance);
        cam.position.copy(c.target).add(v);
        c.update();
        invalidate();
      },
    });
    fit();
    p.onReady();
    return () => {
      gl.domElement.removeEventListener("wheel", wheel, true);
      c.removeEventListener("start", interactive);
      c.removeEventListener("change", changed);
      c.dispose();
      controls.current = null;
    };
  }, [
    camera,
    gl,
    viewport.width,
    viewport.height,
    p.url,
    p.resetKey,
    p.motion,
    p.interactive,
  ]);
  useEffect(() => {
    model.traverse((o) => {
      if (o.name.startsWith("Layer_")) o.visible = p.options.layers !== false;
      if (o.name.startsWith("Roots_")) o.visible = p.options.roots !== false;
      if (o.name.startsWith("Water_")) o.visible = false;
    });
    invalidate();
  }, [model, p.options.layers, p.options.roots, invalidate]);
  useFrame(({ clock }, delta) => {
    const c = controls.current;
    if (!c || !stage.current) return;
    c.enableRotate =
      p.interactive &&
      (!matchMedia("(pointer:coarse)").matches || manual.current);
    gl.domElement.style.touchAction = manual.current ? "none" : "pan-y";
    if (!manual.current) {
      const yaw = p.motion ? -0.13 + p.progress * 0.55 : 0;
      stage.current.rotation.y = p.motion
        ? THREE.MathUtils.damp(stage.current.rotation.y, yaw, 4, delta)
        : yaw;
      const direction = p.options.view
        ? new THREE.Vector3(1, 0.7, 2.4)
        : new THREE.Vector3(0.6, 0.15, 3);
      const target = direction
        .normalize()
        .multiplyScalar(
          fitted.current *
            (1 + (p.motion ? 0.025 * p.progress : 0)) *
            (p.options.explode ? 1.18 : 1),
        );
      camera.position.lerp(target, p.motion ? 1 - Math.exp(-4 * delta) : 1);
      c.target.lerp(
        new THREE.Vector3(
          0,
          p.motion ? Math.sin(p.progress * Math.PI) * size.y * 0.025 : 0,
          0,
        ),
        p.motion ? 1 - Math.exp(-4 * delta) : 1,
      );
    }
    c.update();
    model.traverse((o) => {
      if (o.name.startsWith("Layer_")) {
        const original = initial.get(o.uuid)!;
        let offset = 0;
        if (p.options.explode) {
          if (o.name.includes("Subsoil")) offset = -0.2;
          if (o.name.includes("Parent")) offset = -0.4;
        }
        o.position.y = p.motion
          ? THREE.MathUtils.damp(o.position.y, original.y + offset, 6, delta)
          : original.y + offset;
      }
      if (o.name.startsWith("Surface_") && !o.name.includes("Grass"))
        o.rotation.z = p.motion ? Math.sin(clock.elapsedTime * 0.7) * 0.002 : 0;
    });
    if (p.motion && p.visible && clock.elapsedTime - frameTime.current < 0.12)
      return;
    frameTime.current = clock.elapsedTime;
    model.updateWorldMatrix(true, true);
    const worldBounds = new THREE.Box3().setFromObject(model);
    const screen = [];
    for (const x of [worldBounds.min.x, worldBounds.max.x])
      for (const y of [worldBounds.min.y, worldBounds.max.y])
        for (const z of [worldBounds.min.z, worldBounds.max.z]) {
          const v = new THREE.Vector3(x, y, z).project(camera);
          screen.push([
            ((v.x + 1) * viewport.width) / 2,
            ((-v.y + 1) * viewport.height) / 2,
          ]);
        }
    const xs = screen.map((v) => v[0]),
      ys = screen.map((v) => v[1]);
    if (p.host) {
      p.host.dataset.bounds = JSON.stringify({
        left: Math.min(...xs),
        top: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
      });
      p.host.dataset.cameraMode = manual.current ? "manual" : "scroll";
      p.host.dataset.clearAlpha = String(gl.getClearAlpha());
    }
    const occupied: { x: number; y: number; w: number; h: number }[] = [];
    const occluders: THREE.Object3D[] = [];
    model.traverse((o) => {
      if (
        (o as THREE.Mesh).isMesh &&
        o.visible &&
        (!p.options.view || o.name.startsWith("Layer_"))
      )
        occluders.push(o);
    });
    for (const a of annotations) {
      const el = p.host?.querySelector<HTMLElement>(
        `[data-annotation="${a.id}"]`,
      );
      if (!el) continue;
      const world = a.target.localToWorld(a.anchor.clone()),
        v = world.clone().project(camera),
        ray = new THREE.Raycaster(
          camera.position,
          world.clone().sub(camera.position).normalize(),
        );
      const hit = ray.intersectObjects(occluders, false)[0];
      let featureHidden = false;
      for (
        let object: THREE.Object3D | null = a.target;
        object;
        object = object.parent
      ) {
        if (!object.visible) {
          featureHidden = true;
          break;
        }
        if (object === model) break;
      }
      const hidden =
        featureHidden ||
        v.z > 1 ||
        v.z < -1 ||
        (hit &&
          hit.distance < camera.position.distanceTo(world) - radius * 0.08);
      const width = Math.min(190, viewport.width * 0.42),
        height = el.offsetHeight || 54;
      const x = Math.max(
        12,
        Math.min(
          viewport.width - width - 12,
          ((v.x + 1) * viewport.width) / 2 < viewport.width / 2
            ? Math.min(...xs) - width - 18
            : Math.max(...xs) + 18,
        ),
      );
      let y = Math.max(
        15,
        Math.min(
          viewport.height - height - 88,
          ((-v.y + 1) * viewport.height) / 2 - height * 0.5,
        ),
      );
      for (const r of occupied)
        if (
          x < r.x + r.w + 8 &&
          x + width > r.x - 8 &&
          y < r.y + r.h + 8 &&
          y + height > r.y - 8
        )
          y = Math.min(viewport.height - height - 88, r.y + r.h + 10);
      if (viewport.width < 600) {
        y = 10;
      }
      const collision = occupied.some(
        (r) =>
          x < r.x + r.w && x + width > r.x && y < r.y + r.h && y + height > r.y,
      );
      const targetX = ((v.x + 1) * viewport.width) / 2;
      const targetY = ((-v.y + 1) * viewport.height) / 2;
      const targetOutside =
        targetX < 8 ||
        targetY < 8 ||
        targetX > viewport.width - 8 ||
        targetY > viewport.height - 8;
      const isVisible =
        !hidden &&
        !targetOutside &&
        !collision &&
        !(
          viewport.width < 600 &&
          annotations.indexOf(a) !==
            Math.min(
              annotations.length - 1,
              Math.floor(p.progress * annotations.length),
            )
        );
      el.style.width = `${width}px`;
      el.style.transform = `translate(${x}px,${y}px)`;
      el.style.visibility = isVisible ? "visible" : "hidden";
      const leader = p.host?.querySelector<SVGGElement>(
        `[data-annotation-leader="${a.id}"]`,
      );
      if (leader) {
        leader.setAttribute("visibility", isVisible ? "visible" : "hidden");
        if (isVisible) {
          // Intersect the feature direction with the annotation's padded edge.
          const cx = x + width / 2,
            cy = y + height / 2,
            dx = targetX - cx,
            dy = targetY - cy;
          const edge =
            1 /
            Math.max(
              Math.abs(dx) / (width / 2 + 4),
              Math.abs(dy) / (height / 2 + 4),
              1,
            );
          const fromX = cx + dx * edge,
            fromY = cy + dy * edge;
          const path = `M${fromX.toFixed(2)} ${fromY.toFixed(2)} L${targetX.toFixed(2)} ${targetY.toFixed(2)}`;
          leader
            .querySelector("[data-leader-outline]")
            ?.setAttribute("d", path);
          leader.querySelector("[data-leader-path]")?.setAttribute("d", path);
          leader.dataset.featureX = targetX.toFixed(2);
          leader.dataset.featureY = targetY.toFixed(2);
        }
      }
      if (isVisible) occupied.push({ x, y, w: width, h: height });
    }
  });
  return (
    <group ref={stage}>
      <group position={center.clone().multiplyScalar(-1)}>
        <primitive object={model} dispose={null} />
        {p.options.view && <Processes options={p.options} motion={p.motion} />}
      </group>
    </group>
  );
}
function Processes({
  options: o,
  motion,
}: {
  options: SceneOptions;
  motion: boolean;
}) {
  const points = useRef<THREE.Points>(null);
  const water = useMemo(
    () =>
      new Float32Array(
        Array.from({ length: 360 }, (_, i) => {
          const index = Math.floor(i / 3);
          return i % 3 === 0
            ? Math.sin(index * 27.3) * 1.94
            : i % 3 === 1
              ? -(o.depth ?? 7) / 10 -
                ((Math.sin(index * 4.7) + 1) / 2) * (2 - (o.depth ?? 7) / 10)
              : 1.545;
        }),
      ),
    [o.depth],
  );
  const flow = useMemo(
    () =>
      new Float32Array(
        Array.from({ length: 60 }, (_, i) =>
          i % 3 === 0 ? Math.sin(i) * 1.9 : i % 3 === 1 ? 1 : 1.58,
        ),
      ),
    [],
  );
  useFrame(({ clock }) => {
    if (!points.current || !motion) return;
    const a = points.current.geometry.attributes.position;
    for (let i = 0; i < 20; i++) {
      const t = (clock.elapsedTime * 0.25 + i / 20) % 1;
      const y =
        o.process === "rain"
          ? 1.8 - t * 1.8
          : o.process === "infiltration"
            ? -t * 1.1
            : o.process === "uptake"
              ? -1.1 + t * 1.1
              : t * 0.9;
      a.setY(i, y);
    }
    a.needsUpdate = true;
  });
  return (
    <>
      {o.view === "groundwater" && (
        <>
          <points>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[water, 3]} />
            </bufferGeometry>
            <pointsMaterial color="#398aa2" size={0.035} />
          </points>
          <mesh position={[0, -(o.depth ?? 7) / 10, 1.55]}>
            <boxGeometry args={[4, 0.018, 0.012]} />
            <meshBasicMaterial color="#398aa2" />
          </mesh>
        </>
      )}
      {o.process && o.process !== "none" && motion && (
        <points ref={points}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[flow, 3]} />
          </bufferGeometry>
          <pointsMaterial
            color={o.process === "uptake" ? "#d9aa45" : "#5a9ab5"}
            size={0.035}
          />
        </points>
      )}
    </>
  );
}
export default function ModelScene(p: ModelSceneProps) {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <Canvas
      dpr={p.low ? 1 : [1, 1.5]}
      frameloop={p.visible && p.motion ? "always" : "demand"}
      camera={{ position: [0, 0, 5], fov: 34 }}
      gl={{ alpha: true, antialias: !p.low, powerPreference: "low-power" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          if (mounted.current) p.onFail();
        });
      }}
    >
      <ambientLight intensity={1.4} />
      <directionalLight position={[3, 6, 5]} intensity={2.4} color="#fff3dc" />
      <directionalLight
        position={[-4, 2, -2]}
        intensity={1.3}
        color="#cbdde2"
      />
      <Suspense fallback={null}>
        <Asset {...p} />
      </Suspense>
    </Canvas>
  );
}
