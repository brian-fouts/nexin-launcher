import { describe, expect, it } from "vitest";

import { computeFlameVelocity, getFlamethrowerPulse } from "./fireEffects";

describe("computeFlameVelocity", () => {
  it("produces upward-biased velocity toward target", () => {
    const v = computeFlameVelocity({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, 1, () => 0.5);
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBeGreaterThan(0);
  });

  it("creates a bounded pulse value", () => {
    const p = getFlamethrowerPulse(1.23, 0.77);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(2);
  });
});
