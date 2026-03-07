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
  // Canvas Y grows downward. This mapping aligns world top (negative Z)
  // with texture top, matching the rendered ground orientation.
  const nz = worldZ / worldDepth + 0.5;
  const cx = Math.max(0, Math.min(1, nx));
  const cz = Math.max(0, Math.min(1, nz));
  return {
    x: Math.round(cx * (textureWidth - 1)),
    y: Math.round(cz * (textureHeight - 1)),
  };
}
