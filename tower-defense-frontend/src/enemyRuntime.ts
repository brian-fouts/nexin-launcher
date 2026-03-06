import type { TowerType } from "./towerTypes";

export type EnemySpawn = {
  x: number;
  z: number;
};

export type HatVariant =
  | "tiny-cap"
  | "cone-party"
  | "propeller"
  | "bucket"
  | "satellite-dish";

export type EnemyHatProfile = {
  dumbness: number;
  maxHealth: number;
  hat: HatVariant;
};

export function buildEnemySpawns(width: number, depth: number, count: number): EnemySpawn[] {
  const safeCount = Math.max(1, count);
  const radiusX = width * 0.32;
  const radiusZ = depth * 0.32;
  const spawns: EnemySpawn[] = [{ x: radiusX * 0.2, z: -radiusZ * 0.2 }];
  for (let i = 1; i < safeCount; i += 1) {
    const a = (i / (safeCount - 1)) * Math.PI * 2;
    const ring = 0.75 + ((i % 4) * 0.08);
    spawns.push({
      x: Math.cos(a) * radiusX * ring,
      z: Math.sin(a) * radiusZ * ring,
    });
  }
  return spawns;
}

export function getEnemyHatProfile(index: number, total: number): EnemyHatProfile {
  const safeTotal = Math.max(1, total);
  const normalized = safeTotal === 1 ? 1 : index / (safeTotal - 1);
  const dumbness = Math.max(1, Math.min(5, 1 + Math.floor(normalized * 5)));
  const hatsByDumbness: HatVariant[] = ["tiny-cap", "cone-party", "propeller", "bucket", "satellite-dish"];
  const hat = hatsByDumbness[index % hatsByDumbness.length];
  const maxHealth = 10;
  return { dumbness, maxHealth, hat };
}

export function shouldRespawnEnemy(dead: boolean, respawnAt: number | null, elapsed: number): boolean {
  return dead && respawnAt !== null && elapsed >= respawnAt;
}

export function getHatScaleForHealth(currentHealth: number, maxHealth: number, baseScale: number): number {
  if (maxHealth <= 0) return baseScale * 0.2;
  const ratio = Math.max(0, Math.min(1, currentHealth / maxHealth));
  return Math.max(baseScale * 0.2, baseScale * ratio);
}

export function getTowerRange(type: TowerType): number {
  if (type === "machine_gun") return 130;
  if (type === "flamethrower") return 45;
  if (type === "cannon") return 70;
  if (type === "laser") return 90;
  if (type === "rocket") return 150;
  if (type === "slime") return 82;
  return 20; // oil
}
