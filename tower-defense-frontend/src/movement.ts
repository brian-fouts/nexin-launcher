type Point = {
  x: number;
  z: number;
};

type StepResult = Point & {
  reached: boolean;
};

export function stepToward(current: Point, target: Point, speed: number, deltaSeconds: number): StepResult {
  const dx = target.x - current.x;
  const dz = target.z - current.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.001) {
    return { x: target.x, z: target.z, reached: true };
  }

  const maxStep = Math.max(speed * Math.max(deltaSeconds, 0), 0);
  if (maxStep >= distance) {
    return { x: target.x, z: target.z, reached: true };
  }

  const t = maxStep / distance;
  return {
    x: current.x + dx * t,
    z: current.z + dz * t,
    reached: false,
  };
}
