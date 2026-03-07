export type Point2 = { x: number; z: number };

export function getTouchApproachPoint(
  player: Point2,
  tower: Point2,
  touchDistance: number
): Point2 {
  const dx = player.x - tower.x;
  const dz = player.z - tower.z;
  const len = Math.hypot(dx, dz);
  const safe = Math.max(0.001, touchDistance);
  if (len < 0.0001) {
    return { x: tower.x, z: tower.z + safe };
  }
  const nx = dx / len;
  const nz = dz / len;
  return {
    x: tower.x + nx * safe,
    z: tower.z + nz * safe,
  };
}
