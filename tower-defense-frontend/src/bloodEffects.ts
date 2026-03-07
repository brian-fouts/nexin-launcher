export type BloodMistSpec = {
  vx: number;
  vy: number;
  vz: number;
  radius: number;
};

export type ClampedXZ = {
  x: number;
  z: number;
  clamped: boolean;
};

export function buildBloodMistSpecs(count: number, randomFn: () => number = Math.random): BloodMistSpec[] {
  const safeCount = Math.max(1, count);
  const specs: BloodMistSpec[] = [];
  for (let i = 0; i < safeCount; i += 1) {
    const theta = randomFn() * Math.PI * 2;
    const speed = 6 + randomFn() * 15;
    const up = 8 + randomFn() * 14;
    specs.push({
      vx: Math.cos(theta) * speed,
      vy: up,
      vz: Math.sin(theta) * speed,
      radius: 0.15 + randomFn() * 0.45,
    });
  }
  return specs;
}

export function clampToRadius(
  x: number,
  z: number,
  originX: number,
  originZ: number,
  maxRadius: number
): ClampedXZ {
  const r = Math.max(0.001, maxRadius);
  const dx = x - originX;
  const dz = z - originZ;
  const dist = Math.hypot(dx, dz);
  if (dist <= r) {
    return { x, z, clamped: false };
  }
  const scale = r / dist;
  return {
    x: originX + dx * scale,
    z: originZ + dz * scale,
    clamped: true,
  };
}
