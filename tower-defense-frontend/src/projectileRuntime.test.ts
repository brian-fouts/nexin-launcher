import { describe, expect, it } from "vitest";

import { getProjectileLifetime, hasProjectileHitEnemy } from "./projectileRuntime";

describe("getProjectileLifetime", () => {
  it("increases projectile life for longer travel distance", () => {
    const near = getProjectileLifetime(20, 100);
    const far = getProjectileLifetime(120, 100);
    expect(far).toBeGreaterThan(near);
  });

  it("guards against invalid speed values", () => {
    const t = getProjectileLifetime(100, 0);
    expect(t).toBeGreaterThan(0);
  });
});

describe("hasProjectileHitEnemy", () => {
  it("detects hit when within combined radii", () => {
    const hit = hasProjectileHitEnemy(
      { x: 5, y: 2, z: 1, radius: 1.5 },
      { x: 6.2, y: 2, z: 1, radius: 1 }
    );
    expect(hit).toBe(true);
  });

  it("returns false when projectile is outside range", () => {
    const hit = hasProjectileHitEnemy(
      { x: 0, y: 0, z: 0, radius: 1 },
      { x: 5, y: 0, z: 0, radius: 1 }
    );
    expect(hit).toBe(false);
  });
});
