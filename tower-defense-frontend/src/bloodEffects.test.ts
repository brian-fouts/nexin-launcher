import { describe, expect, it } from "vitest";

import { buildBloodMistSpecs } from "./bloodEffects";

describe("bloodEffects", () => {
  it("builds requested number of mist specs with upward velocity", () => {
    const specs = buildBloodMistSpecs(30, () => 0.5);
    expect(specs).toHaveLength(30);
    for (const spec of specs) {
      expect(spec.vy).toBeGreaterThan(0);
      expect(spec.radius).toBeGreaterThan(0);
    }
  });
});
