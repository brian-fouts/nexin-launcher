import { describe, expect, it } from "vitest";

import {
  buildEnemySpawns,
  getEnemyHatProfile,
  getHatScaleForHealth,
  getTowerRange,
  shouldRespawnEnemy,
} from "./enemyRuntime";

describe("enemyRuntime", () => {
  it("builds requested number of enemy spawns with first one visible", () => {
    const spawns = buildEnemySpawns(320, 320, 21);
    expect(spawns).toHaveLength(21);
    expect(Math.hypot(spawns[0].x, spawns[0].z)).toBeLessThan(80);
  });

  it("returns range for every tower type", () => {
    expect(getTowerRange("machine_gun")).toBeGreaterThan(getTowerRange("flamethrower"));
    expect(getTowerRange("rocket")).toBeGreaterThan(getTowerRange("cannon"));
    expect(getTowerRange("oil")).toBeLessThan(getTowerRange("slime"));
  });

  it("starts all enemies at 10 health regardless of hat type", () => {
    const total = 21;
    const early = getEnemyHatProfile(0, total);
    const mid = getEnemyHatProfile(10, total);
    const late = getEnemyHatProfile(20, total);
    expect(early.maxHealth).toBe(10);
    expect(mid.maxHealth).toBe(10);
    expect(late.maxHealth).toBe(10);
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
});
