import { describe, expect, it } from "vitest";

import {
  buildEnemySpawns,
  getEnemyHatProfile,
  getGoldRewardForKill,
  getEnemyProgressionStats,
  getHatScaleForHealth,
  getRespawnHealth,
  getTowerRange,
  shouldRespawnEnemy,
} from "./enemyRuntime";

describe("enemyRuntime", () => {
  it("builds requested number of enemy spawns with first one visible", () => {
    const spawns = buildEnemySpawns(320, 320, 21);
    expect(spawns).toHaveLength(21);
    expect(spawns[0].z).toBeLessThan(0);
    for (const s of spawns) {
      expect(s.x).toBeGreaterThanOrEqual(-160);
      expect(s.x).toBeLessThanOrEqual(160);
      expect(s.z).toBeLessThanOrEqual(0);
    }
  });

  it("returns range for every tower type", () => {
    expect(getTowerRange("machine_gun")).toBeGreaterThan(getTowerRange("flamethrower"));
    expect(getTowerRange("rocket")).toBeGreaterThan(getTowerRange("cannon"));
    expect(getTowerRange("oil")).toBeLessThan(getTowerRange("slime"));
  });

  it("starts all enemies at 30 health regardless of hat type", () => {
    const total = 21;
    const early = getEnemyHatProfile(0, total);
    const mid = getEnemyHatProfile(10, total);
    const late = getEnemyHatProfile(20, total);
    expect(early.maxHealth).toBe(30);
    expect(mid.maxHealth).toBe(30);
    expect(late.maxHealth).toBe(30);
    expect(early.dumbness).toBeLessThanOrEqual(mid.dumbness);
    expect(mid.dumbness).toBeLessThanOrEqual(late.dumbness);
  });

  it("respawns enemy when dead and timer elapsed", () => {
    expect(shouldRespawnEnemy(true, 4, 4.1)).toBe(true);
    expect(shouldRespawnEnemy(true, 4, 3.9)).toBe(false);
    expect(shouldRespawnEnemy(false, 4, 10)).toBe(false);
    expect(shouldRespawnEnemy(true, null, 10)).toBe(false);
  });

  it("shrinks hats as health drops", () => {
    const baseScale = 2.5;
    expect(getHatScaleForHealth(10, 10, baseScale)).toBeCloseTo(2.5);
    expect(getHatScaleForHealth(5, 10, baseScale)).toBeCloseTo(1.25);
    expect(getHatScaleForHealth(0, 10, baseScale)).toBeCloseTo(0.5);
  });

  it("increases respawn health by 20 percent each death", () => {
    expect(getRespawnHealth(30)).toBe(36);
    expect(getRespawnHealth(36)).toBe(44);
  });

  it("scales kill gold with upgrade level", () => {
    expect(getGoldRewardForKill(0)).toBe(48);
    expect(getGoldRewardForKill(1)).toBe(72);
    expect(getGoldRewardForKill(5)).toBe(168);
  });

  it("provides escalating progression stats with wave/upgrade", () => {
    const low = getEnemyProgressionStats(1, 0, 0);
    const high = getEnemyProgressionStats(6, 4, 3);
    expect(high.attackDamage).toBeGreaterThan(low.attackDamage);
    expect(high.moveSpeedMultiplier).toBeGreaterThan(low.moveSpeedMultiplier);
    expect(high.healthMultiplier).toBeGreaterThan(low.healthMultiplier);
    expect(high.armor).toBeGreaterThanOrEqual(low.armor);
  });
});
