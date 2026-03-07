import type { TowerType } from "./towerTypes";

export type EnemySpawn = {
  x: number;
  z: number;
};

export type DamageKind = "ballistic" | "fire" | "energy" | "corrosive";

export type EnemyResistances = {
  ballistic: number;
  fire: number;
  energy: number;
  corrosive: number;
  slow: number;
};

export type EnemyProgressionStats = {
  attackDamage: number;
  attackIntervalSeconds: number;
  moveSpeedMultiplier: number;
  healthMultiplier: number;
  armor: number;
  resistances: EnemyResistances;
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
  const laneWidth = Math.min(width * 0.72, 220);
  const topZ = -Math.min(depth * 0.22, 62);
  const secondRowZ = topZ + 9;
  const spawns: EnemySpawn[] = [];

  for (let i = 0; i < safeCount; i += 1) {
    const t = safeCount === 1 ? 0.5 : i / (safeCount - 1);
    const laneX = -laneWidth / 2 + t * laneWidth;
    const jitterX = ((i % 3) - 1) * 1.4;
    const rowOffset = i % 2 === 0 ? topZ : secondRowZ;
    spawns.push({
      x: laneX + jitterX,
      z: rowOffset,
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
  const maxHealth = 30;
  return { dumbness, maxHealth, hat };
}

export function shouldRespawnEnemy(dead: boolean, respawnAt: number | null, elapsed: number): boolean {
  return dead && respawnAt !== null && elapsed >= respawnAt;
}

export function getRespawnHealth(previousMaxHealth: number): number {
  const safe = Math.max(1, previousMaxHealth);
  return Math.ceil(safe * 1.2);
}

export function getGoldRewardForKill(upgradeLevel: number): number {
  const lvl = Math.max(0, upgradeLevel);
  // 500% increased gain means 6x the original reward.
  return (8 + lvl * 4) * 6;
}

export function getEnemyProgressionStats(
  wave: number,
  upgradeLevel: number,
  enemyIndex: number
): EnemyProgressionStats {
  const w = Math.max(1, wave);
  const u = Math.max(0, upgradeLevel);
  const affinity = enemyIndex % 6;

  let attackDamage = 4 + w * 0.9 + u * 0.8;
  let attackIntervalSeconds = Math.max(0.38, 1.4 - w * 0.07 - u * 0.05);
  let moveSpeedMultiplier = 1 + (w - 1) * 0.08 + u * 0.03;
  let healthMultiplier = 1 + (w - 1) * 0.26 + u * 0.16;
  let armor = Math.min(0.65, 0.06 * (w - 1) + 0.04 * u);
  const resistances: EnemyResistances = {
    ballistic: 0,
    fire: 0,
    energy: 0,
    corrosive: 0,
    slow: 0,
  };

  // Give each enemy family a pronounced specialty.
  if (affinity === 0) {
    attackDamage *= 1.35;
  } else if (affinity === 1) {
    attackIntervalSeconds *= 0.72;
  } else if (affinity === 2) {
    moveSpeedMultiplier *= 1.28;
  } else if (affinity === 3) {
    healthMultiplier *= 1.4;
  } else if (affinity === 4) {
    armor = Math.min(0.75, armor + 0.18);
    resistances.ballistic = 0.22;
  } else {
    resistances.fire = 0.3;
    resistances.energy = 0.18;
    resistances.corrosive = 0.25;
    resistances.slow = 0.4;
  }

  return {
    attackDamage,
    attackIntervalSeconds,
    moveSpeedMultiplier,
    healthMultiplier,
    armor,
    resistances,
  };
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
