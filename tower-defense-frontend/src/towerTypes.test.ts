import { describe, expect, it } from "vitest";

import {
  TOWER_DEFINITIONS,
  TOWER_ORDER,
  getEmblazeDurationOnFireHit,
  isFlamethrowerActive,
} from "./towerTypes";

describe("towerTypes", () => {
  it("exposes all six expected tower types", () => {
    expect(TOWER_ORDER).toEqual([
      "machine_gun",
      "flamethrower",
      "cannon",
      "laser",
      "rocket",
      "slime",
      "oil",
    ]);
    for (const type of TOWER_ORDER) {
      expect(TOWER_DEFINITIONS[type].label.length).toBeGreaterThan(3);
      expect(TOWER_DEFINITIONS[type].range).toBeGreaterThan(0);
      expect(TOWER_DEFINITIONS[type].cost).toBeGreaterThan(0);
    }
    expect(TOWER_DEFINITIONS.machine_gun.damage).toBe(4);
  });

  it("prices towers in +100 increments from top to bottom", () => {
    const costs = TOWER_ORDER.map((type) => TOWER_DEFINITIONS[type].cost);
    expect(costs).toEqual([100, 200, 300, 400, 500, 600, 700]);
  });

  it("keeps flamethrower active for 3 seconds and inactive for 2", () => {
    expect(isFlamethrowerActive(0.5)).toBe(true);
    expect(isFlamethrowerActive(2.99)).toBe(true);
    expect(isFlamethrowerActive(3.1)).toBe(false);
    expect(isFlamethrowerActive(4.8)).toBe(false);
    expect(isFlamethrowerActive(5.2)).toBe(true);
  });

  it("only applies emblaze duration when enemy is oil-saturated", () => {
    expect(getEmblazeDurationOnFireHit(true)).toBe(10);
    expect(getEmblazeDurationOnFireHit(false)).toBe(0);
  });
});
