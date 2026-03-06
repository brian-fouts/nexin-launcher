import { describe, expect, it } from "vitest";

import { appendTower, buildPlacedTower } from "./towerPlacement";

describe("towerPlacement", () => {
  it("builds a normalized placed tower record", () => {
    const tower = buildPlacedTower("rocket", 12.345, -8.765, 123456);
    expect(tower.id).toContain("local-rocket-123456");
    expect(tower.x).toBe(12.35);
    expect(tower.z).toBe(-8.77);
  });

  it("appends tower without mutating source array", () => {
    const first = buildPlacedTower("machine_gun", 0, 0, 1);
    const second = buildPlacedTower("laser", 10, 10, 2);
    const before = [first];
    const after = appendTower(before, second);
    expect(before).toHaveLength(1);
    expect(after).toHaveLength(2);
    expect(after[1].towerType).toBe("laser");
  });
});
