export const TOWER_ORDER = [
  "machine_gun",
  "flamethrower",
  "cannon",
  "laser",
  "rocket",
  "slime",
  "oil",
] as const;

export type TowerType = (typeof TOWER_ORDER)[number];

export type TowerDefinition = {
  label: string;
  description: string;
  range: number;
  damage: number;
  fireInterval: number;
};

export const TOWER_DEFINITIONS: Record<TowerType, TowerDefinition> = {
  machine_gun: {
    label: "Machine Gun Turret",
    description: "Very fast and very long range, low damage per hit.",
    range: 130,
    damage: 4,
    fireInterval: 0.12,
  },
  flamethrower: {
    label: "Flamethrower Turret",
    description: "3s active / 2s inactive. Short range directional area damage.",
    range: 45,
    damage: 20,
    fireInterval: 0.2,
  },
  cannon: {
    label: "Cannon Tower",
    description: "Slow firing, small tower range, large impact area.",
    range: 70,
    damage: 60,
    fireInterval: 2.8,
  },
  laser: {
    label: "Laser Tower",
    description: "Continuous medium range beam with damage over time.",
    range: 90,
    damage: 16,
    fireInterval: 0.1,
  },
  rocket: {
    label: "Rocket Tower",
    description: "Very long range, very slow fire, high damage, small blast radius.",
    range: 150,
    damage: 140,
    fireInterval: 4.2,
  },
  slime: {
    label: "Slime Tower",
    description: "Fast goo shot: applies corrosion DoT and 50% slow for 5 seconds.",
    range: 82,
    damage: 8,
    fireInterval: 0.6,
  },
  oil: {
    label: "Oil Tower",
    description: "Creates an oil puddle. Enemies touching it become oil-saturated.",
    range: 20,
    damage: 0,
    fireInterval: 0.5,
  },
};

export function isFlamethrowerActive(elapsedSeconds: number): boolean {
  const cycle = elapsedSeconds % 5;
  return cycle < 3;
}

export function getEmblazeDurationOnFireHit(isOilSaturated: boolean): number {
  return isOilSaturated ? 10 : 0;
}
