export function getTopDownFitDistance(
  worldWidth: number,
  worldDepth: number,
  fovDegrees: number,
  aspect: number,
  padding = 1.12
): number {
  const safeAspect = Math.max(0.1, aspect);
  const safeWidth = Math.max(1, worldWidth) * Math.max(1, padding);
  const safeDepth = Math.max(1, worldDepth) * Math.max(1, padding);
  const fovRad = (Math.max(1, fovDegrees) * Math.PI) / 180;
  const tanHalf = Math.tan(fovRad / 2);
  const byDepth = safeDepth / 2 / Math.max(0.0001, tanHalf);
  const byWidth = safeWidth / 2 / Math.max(0.0001, tanHalf * safeAspect);
  return Math.max(byDepth, byWidth);
}
