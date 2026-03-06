export type TreeDefinition = {
  x: number;
  z: number;
  trunkHeight: number;
  crownRadius: number;
};

export type MapDefinition = {
  width: number;
  depth: number;
  groundColor: string;
  trees: TreeDefinition[];
};

export type TreeTilt = {
  x: number;
  z: number;
};

export function countTreeClusters(trees: TreeDefinition[], maxDistance = 12): number {
  if (trees.length === 0) return 0;
  const visited = new Set<number>();
  let clusters = 0;

  const stack: number[] = [];
  for (let i = 0; i < trees.length; i += 1) {
    if (visited.has(i)) continue;
    clusters += 1;
    stack.push(i);
    visited.add(i);

    while (stack.length > 0) {
      const current = stack.pop() as number;
      const a = trees[current];
      for (let j = 0; j < trees.length; j += 1) {
        if (visited.has(j)) continue;
        const b = trees[j];
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance <= maxDistance) {
          visited.add(j);
          stack.push(j);
        }
      }
    }
  }

  return clusters;
}

export function mapMeetsTreeRequirement(map: MapDefinition): boolean {
  return map.trees.length >= 10 && countTreeClusters(map.trees) >= 3;
}

export function getTreeTilt(tree: TreeDefinition): TreeTilt {
  const hash = Math.sin(tree.x * 12.9898 + tree.z * 78.233) * 43758.5453;
  const normalized = Math.abs(hash % 1);
  const angle = 0.16 + normalized * 0.12;
  const zSign = normalized > 0.5 ? 1 : -1;
  return {
    x: -angle,
    z: zSign * angle * 0.18,
  };
}
