import { describe, expect, it } from "vitest";

import { getWaveConfig } from "./waveRuntime";

describe("getWaveConfig", () => {
  it("increases difficulty each wave", () => {
    const w1 = getWaveConfig(1, 21);
    const w4 = getWaveConfig(4, 21);
    expect(w4.spawnCount).toBeGreaterThan(w1.spawnCount);
    expect(w4.healthMultiplier).toBeGreaterThan(w1.healthMultiplier);
    expect(w4.speedMultiplier).toBeGreaterThan(w1.speedMultiplier);
    expect(w4.spawnIntervalSeconds).toBeLessThan(w1.spawnIntervalSeconds);
  });

  it("caps spawn count by enemy pool size", () => {
    const w99 = getWaveConfig(99, 21);
    expect(w99.spawnCount).toBe(21);
  });

  it("cycles deterministic unique archetypes", () => {
    const w1 = getWaveConfig(1, 21);
    const w2 = getWaveConfig(2, 21);
    const w3 = getWaveConfig(3, 21);
    expect(w1.archetypeName).not.toBe(w2.archetypeName);
    expect(w2.archetypeName).not.toBe(w3.archetypeName);
    expect(getWaveConfig(9, 21).archetypeName).toBe(w1.archetypeName);
  });

  it("focuses difficulty in subsets, not every stat maxed", () => {
    const w = getWaveConfig(2, 21);
    const t = w.tuning;
    const boosted = [
      t.attackDamageMultiplier > 1.15,
      t.attackRateMultiplier > 1.15,
      t.moveSpeedMultiplier > 1.15,
      t.healthMultiplier > 1.15,
      t.armorBonus > 0.1,
      t.resistanceBonus.ballistic > 0.2 ||
        t.resistanceBonus.fire > 0.2 ||
        t.resistanceBonus.energy > 0.2 ||
        t.resistanceBonus.corrosive > 0.2 ||
        t.resistanceBonus.slow > 0.2,
    ].filter(Boolean).length;
    expect(boosted).toBeLessThanOrEqual(3);
  });
});
