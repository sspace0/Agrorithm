export function fitModelDistance(
  size: [number, number, number],
  aspect: number,
  fovDegrees = 34,
  direction: [number, number, number] = [1, 0.55, 2.5],
  fill = 0.84,
) {
  const length = Math.hypot(...direction),
    forward = direction.map((v) => v / length);
  const rl = Math.hypot(forward[2], forward[0]);
  const right = [forward[2] / rl, 0, -forward[0] / rl];
  const up = [
    forward[1] * right[2],
    forward[2] * right[0] - forward[0] * right[2],
    -forward[1] * right[0],
  ];
  const tv = Math.tan((fovDegrees * Math.PI) / 360) * fill,
    th = tv * Math.max(0.2, aspect);
  let distance = 0;
  for (const x of [-0.5, 0.5])
    for (const y of [-0.5, 0.5])
      for (const z of [-0.5, 0.5]) {
        const p = [x * size[0], y * size[1], z * size[2]],
          dot = (v: number[]) => p.reduce((sum, n, i) => sum + n * v[i], 0);
        distance = Math.max(
          distance,
          Math.abs(dot(right)) / th + dot(forward),
          Math.abs(dot(up)) / tv + dot(forward),
        );
      }
  return Math.max(0.01, distance);
}
export function equirectangularPoint(lat: number, lon: number) {
  return { x: (lon + 180) / 360, y: (90 - lat) / 180 };
}
