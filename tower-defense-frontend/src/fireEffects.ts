export type Vec3 = { x: number; y: number; z: number };

export function computeFlameVelocity(
  from: Vec3,
  to: Vec3,
  pulse: number,
  randomFn: () => number = Math.random
): Vec3 {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = dx / len;
  const nz = dz / len;
  const speed = (46 + randomFn() * 34) * (0.82 + pulse * 0.35);
  return {
    x: nx * speed + (randomFn() - 0.5) * 22,
    y: 8 + randomFn() * 10,
    z: nz * speed + (randomFn() - 0.5) * 22,
  };
}

export function getFlamethrowerPulse(timeSeconds: number, seed = 0): number {
  const pulseA = Math.sin(timeSeconds * 14 + seed) * 0.5 + 0.5;
  const pulseB = Math.sin(timeSeconds * 27 + seed * 1.3) * 0.5 + 0.5;
  return 0.35 + pulseA * 0.45 + pulseB * 0.2;
}
