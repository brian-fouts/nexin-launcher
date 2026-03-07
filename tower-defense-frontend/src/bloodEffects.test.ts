import { describe, expect, it } from "vitest";

import { buildBloodMistSpecs, clampToRadius } from "./bloodEffects";

describe("bloodEffects", () => {
  it("builds requested number of mist specs with upward velocity", () => {
    const specs = buildBloodMistSpecs(30, () => 0.5);
    expect(specs).toHaveLength(30);
    for (const spec of specs) {
      expect(spec.vy).toBeGreaterThan(0);
      expect(spec.radius).toBeGreaterThan(0);
    }
  });

  it("clamps blood drift around death position", () => {
    const c = clampToRadius(20, 0, 0, 0, 5);
    expect(c.clamped).toBe(true);
    expect(Math.hypot(c.x, c.z)).toBeLessThanOrEqual(5.001);
    const inside = clampToRadius(2, 2, 0, 0, 5);
    expect(inside.clamped).toBe(false);
  });
});
