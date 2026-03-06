import type { MapDefinition } from "./mapUtils";

export type GroundDecorPoint = {
  x: number;
  z: number;
  yaw: number;
  scale: number;
};

export type GroundLayout = {
  sticks: GroundDecorPoint[];
  leaves: GroundDecorPoint[];
  seed: number;
};

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromMap(map: MapDefinition): number {
  let h = 2166136261;
  const sample = [
    map.width,
    map.depth,
    map.groundColor.length,
    map.trees.length,
    ...map.trees.flatMap((tree) => [tree.x, tree.z, tree.trunkHeight, tree.crownRadius]),
  ];
  for (const n of sample) {
    const v = Math.round((n + 1000) * 1000);
    h ^= v;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function generateGroundLayout(width: number, depth: number, seed: number): GroundLayout {
  const rng = mulberry32(seed);
  const area = width * depth;
  const stickCount = Math.max(180, Math.round(area / 90));
  const leafCount = Math.max(260, Math.round(area / 65));
  const sticks: GroundDecorPoint[] = [];
  const leaves: GroundDecorPoint[] = [];

  for (let i = 0; i < stickCount; i += 1) {
    sticks.push({
      x: (rng() - 0.5) * width,
      z: (rng() - 0.5) * depth,
      yaw: rng() * Math.PI * 2,
      scale: 0.7 + rng() * 0.8,
    });
  }

  for (let i = 0; i < leafCount; i += 1) {
    leaves.push({
      x: (rng() - 0.5) * width,
      z: (rng() - 0.5) * depth,
      yaw: rng() * Math.PI * 2,
      scale: 0.35 + rng() * 1.1,
    });
  }

  return { sticks, leaves, seed };
}

export function quantizedDuplicateRatio(points: GroundDecorPoint[], quant = 0.75): number {
  if (points.length === 0) return 0;
  const buckets = new Set<string>();
  for (const point of points) {
    const qx = Math.round(point.x / quant);
    const qz = Math.round(point.z / quant);
    buckets.add(`${qx}:${qz}`);
  }
  return 1 - buckets.size / points.length;
}
