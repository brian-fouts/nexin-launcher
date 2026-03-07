export type Circle = {
  x: number;
  z: number;
  radius: number;
};

export type Square = {
  x: number;
  z: number;
  halfSize: number;
};

export function circlesOverlap(a: Circle, b: Circle): boolean {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  const minDist = a.radius + b.radius;
  return dx * dx + dz * dz < minDist * minDist;
}

export function circleOverlapsSquare(circle: Circle, square: Square): boolean {
  const minX = square.x - square.halfSize;
  const maxX = square.x + square.halfSize;
  const minZ = square.z - square.halfSize;
  const maxZ = square.z + square.halfSize;
  const nearestX = Math.max(minX, Math.min(maxX, circle.x));
  const nearestZ = Math.max(minZ, Math.min(maxZ, circle.z));
  const dx = circle.x - nearestX;
  const dz = circle.z - nearestZ;
  return dx * dx + dz * dz < circle.radius * circle.radius;
}

export function resolveCircleOverlap(a: Circle, b: Circle): { ax: number; az: number } {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  const dist = Math.hypot(dx, dz);
  const minDist = a.radius + b.radius;
  if (dist >= minDist) {
    return { ax: a.x, az: a.z };
  }

  const nx = dist > 0.0001 ? dx / dist : 1;
  const nz = dist > 0.0001 ? dz / dist : 0;
  const push = minDist - dist;
  return {
    ax: a.x + nx * push,
    az: a.z + nz * push,
  };
}

export function resolveCircleSquareOverlap(circle: Circle, square: Square): { ax: number; az: number } {
  const minX = square.x - square.halfSize;
  const maxX = square.x + square.halfSize;
  const minZ = square.z - square.halfSize;
  const maxZ = square.z + square.halfSize;
  const nearestX = Math.max(minX, Math.min(maxX, circle.x));
  const nearestZ = Math.max(minZ, Math.min(maxZ, circle.z));
  const dx = circle.x - nearestX;
  const dz = circle.z - nearestZ;
  const distSq = dx * dx + dz * dz;
  const r = circle.radius;
  if (distSq >= r * r) {
    return { ax: circle.x, az: circle.z };
  }

  if (distSq > 1e-8) {
    const dist = Math.sqrt(distSq);
    const push = r - dist;
    const nx = dx / dist;
    const nz = dz / dist;
    return {
      ax: circle.x + nx * push,
      az: circle.z + nz * push,
    };
  }

  // Circle center is inside square; push toward nearest expanded face.
  const candidates = [
    { ax: minX - r, az: circle.z, delta: Math.abs((minX - r) - circle.x) },
    { ax: maxX + r, az: circle.z, delta: Math.abs((maxX + r) - circle.x) },
    { ax: circle.x, az: minZ - r, delta: Math.abs((minZ - r) - circle.z) },
    { ax: circle.x, az: maxZ + r, delta: Math.abs((maxZ + r) - circle.z) },
  ];
  candidates.sort((a, b) => a.delta - b.delta);
  return { ax: candidates[0].ax, az: candidates[0].az };
}
