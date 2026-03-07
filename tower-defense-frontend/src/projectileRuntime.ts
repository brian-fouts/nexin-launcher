export function getProjectileLifetime(distance: number, speed: number, extraSeconds = 0.08): number {
  const safeDistance = Math.max(0, distance);
  const safeSpeed = Math.max(1, speed);
  return safeDistance / safeSpeed + extraSeconds;
}

export function hasProjectileHitEnemy(
  projectile: { x: number; y: number; z: number; radius: number },
  enemy: { x: number; y: number; z: number; radius: number }
): boolean {
  const dx = projectile.x - enemy.x;
  const dy = projectile.y - enemy.y;
  const dz = projectile.z - enemy.z;
  const hitDistance = Math.max(0, projectile.radius) + Math.max(0, enemy.radius);
  return dx * dx + dy * dy + dz * dz <= hitDistance * hitDistance;
}
