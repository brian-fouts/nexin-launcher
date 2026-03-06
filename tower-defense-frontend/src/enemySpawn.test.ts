import { describe, expect, it } from "vitest";

import { getFarEnemySpawn } from "./enemySpawn";

describe("getFarEnemySpawn", () => {
  it("returns a spawn point far from player and within map bounds", () => {
    const spawn = getFarEnemySpawn(320, 320, 0, 0);
    const distance = Math.hypot(spawn.x, spawn.z);

    expect(distance).toBeGreaterThan(140);
    expect(spawn.x).toBeGreaterThanOrEqual(-160);
    expect(spawn.x).toBeLessThanOrEqual(160);
    expect(spawn.z).toBeGreaterThanOrEqual(-160);
    expect(spawn.z).toBeLessThanOrEqual(160);
  });
});
