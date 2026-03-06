export type BloodPixel = {
  x: number;
  y: number;
};

export function worldToBloodPixel(
  worldX: number,
  worldZ: number,
  worldWidth: number,
  worldDepth: number,
  textureWidth: number,
  textureHeight: number
): BloodPixel {
  const nx = worldX / worldWidth + 0.5;
  const nz = 0.5 - worldZ / worldDepth;
  const cx = Math.max(0, Math.min(1, nx));
  const cz = Math.max(0, Math.min(1, nz));
  return {
    x: Math.round(cx * (textureWidth - 1)),
    y: Math.round(cz * (textureHeight - 1)),
  };
}
