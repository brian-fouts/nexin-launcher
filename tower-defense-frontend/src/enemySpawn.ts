export type SpawnPoint = {
  x: number;
  z: number;
};

export function getFarEnemySpawn(width: number, depth: number, playerX = 0, playerZ = 0): SpawnPoint {
  const marginX = Math.max(12, width * 0.15);
  const marginZ = Math.max(12, depth * 0.15);
  const candidates: SpawnPoint[] = [
    { x: -width / 2 + marginX, z: -depth / 2 + marginZ },
    { x: width / 2 - marginX, z: -depth / 2 + marginZ },
    { x: -width / 2 + marginX, z: depth / 2 - marginZ },
    { x: width / 2 - marginX, z: depth / 2 - marginZ },
  ];

  let best = candidates[0];
  let bestDistance = -1;
  for (const point of candidates) {
    const dx = point.x - playerX;
    const dz = point.z - playerZ;
    const distance = Math.hypot(dx, dz);
    if (distance > bestDistance) {
      bestDistance = distance;
      best = point;
    }
  }
  return best;
}
