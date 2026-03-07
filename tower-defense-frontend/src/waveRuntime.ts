export type WaveConfig = {
  wave: number;
  spawnCount: number;
  spawnIntervalSeconds: number;
  healthMultiplier: number;
  speedMultiplier: number;
  archetypeName: string;
  tuning: WaveTuning;
};

export type WaveTuning = {
  attackDamageMultiplier: number;
  attackRateMultiplier: number;
  moveSpeedMultiplier: number;
  healthMultiplier: number;
  armorBonus: number;
  resistanceBonus: {
    ballistic: number;
    fire: number;
    energy: number;
    corrosive: number;
    slow: number;
  };
};

type WaveArchetype = {
  name: string;
  tuning: WaveTuning;
};

const ARCHETYPES: WaveArchetype[] = [
  {
    name: "Bulwark",
    tuning: {
      attackDamageMultiplier: 0.92,
      attackRateMultiplier: 0.92,
      moveSpeedMultiplier: 0.9,
      healthMultiplier: 1.45,
      armorBonus: 0.12,
      resistanceBonus: { ballistic: 0.18, fire: 0, energy: 0, corrosive: 0, slow: 0 },
    },
  },
  {
    name: "Blitz",
    tuning: {
      attackDamageMultiplier: 1.05,
      attackRateMultiplier: 1.28,
      moveSpeedMultiplier: 1.22,
      healthMultiplier: 0.92,
      armorBonus: 0,
      resistanceBonus: { ballistic: 0, fire: 0, energy: 0, corrosive: 0, slow: 0.12 },
    },
  },
  {
    name: "Pyroproof",
    tuning: {
      attackDamageMultiplier: 1.0,
      attackRateMultiplier: 1.0,
      moveSpeedMultiplier: 0.97,
      healthMultiplier: 1.08,
      armorBonus: 0.02,
      resistanceBonus: { ballistic: 0, fire: 0.35, energy: 0, corrosive: 0, slow: 0 },
    },
  },
  {
    name: "Juggernaut",
    tuning: {
      attackDamageMultiplier: 1.18,
      attackRateMultiplier: 0.85,
      moveSpeedMultiplier: 0.86,
      healthMultiplier: 1.35,
      armorBonus: 0.15,
      resistanceBonus: { ballistic: 0.08, fire: 0, energy: 0, corrosive: 0.1, slow: 0 },
    },
  },
  {
    name: "Disruptor",
    tuning: {
      attackDamageMultiplier: 1.1,
      attackRateMultiplier: 1.18,
      moveSpeedMultiplier: 1.02,
      healthMultiplier: 1.0,
      armorBonus: 0.03,
      resistanceBonus: { ballistic: 0, fire: 0, energy: 0.28, corrosive: 0, slow: 0.1 },
    },
  },
  {
    name: "Corrosive",
    tuning: {
      attackDamageMultiplier: 1.03,
      attackRateMultiplier: 1.08,
      moveSpeedMultiplier: 0.96,
      healthMultiplier: 1.12,
      armorBonus: 0.04,
      resistanceBonus: { ballistic: 0, fire: 0, energy: 0, corrosive: 0.35, slow: 0.08 },
    },
  },
  {
    name: "Skirmisher",
    tuning: {
      attackDamageMultiplier: 0.96,
      attackRateMultiplier: 1.22,
      moveSpeedMultiplier: 1.26,
      healthMultiplier: 0.94,
      armorBonus: 0,
      resistanceBonus: { ballistic: 0, fire: 0.08, energy: 0, corrosive: 0, slow: 0.15 },
    },
  },
  {
    name: "Adaptive",
    tuning: {
      attackDamageMultiplier: 1.07,
      attackRateMultiplier: 1.07,
      moveSpeedMultiplier: 1.07,
      healthMultiplier: 1.07,
      armorBonus: 0.05,
      resistanceBonus: { ballistic: 0.08, fire: 0.08, energy: 0.08, corrosive: 0.08, slow: 0.08 },
    },
  },
];

export function getWaveConfig(wave: number, totalEnemies: number): WaveConfig {
  const w = Math.max(1, Math.floor(wave));
  const count = Math.min(totalEnemies, 5 + (w - 1) * 3);
  const archetype = ARCHETYPES[(w - 1) % ARCHETYPES.length];
  return {
    wave: w,
    spawnCount: count,
    spawnIntervalSeconds: Math.max(0.18, 0.55 - (w - 1) * 0.03),
    healthMultiplier: 1 + (w - 1) * 0.3,
    speedMultiplier: 1 + (w - 1) * 0.08,
    archetypeName: archetype.name,
    tuning: archetype.tuning,
  };
}
