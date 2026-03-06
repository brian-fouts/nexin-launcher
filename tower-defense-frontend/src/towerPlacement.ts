import type { TowerType } from "./towerTypes";

export type PlacedTower = {
  id: string;
  towerType: TowerType | string;
  x: number;
  z: number;
};

export function buildPlacedTower(towerType: TowerType, x: number, z: number, nowMs = Date.now()): PlacedTower {
  return {
    id: `local-${towerType}-${nowMs}-${Math.round((x + 999) * 10)}-${Math.round((z + 999) * 10)}`,
    towerType,
    x: Number(x.toFixed(2)),
    z: Number(z.toFixed(2)),
  };
}

export function appendTower<T extends PlacedTower>(existing: T[], next: T): T[] {
  return [...existing, next];
}
