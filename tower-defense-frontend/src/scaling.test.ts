import { describe, expect, it } from "vitest";

import { GLOBAL_SCALING_FACTOR, getTowerVisualScale, getWorldScale } from "./scaling";

describe("scaling", () => {
  it("exposes a single global scaling factor", () => {
    expect(getWorldScale()).toBe(GLOBAL_SCALING_FACTOR);
    expect(GLOBAL_SCALING_FACTOR).toBeGreaterThan(0);
  });

  it("keeps tower visuals about player-sized via multiplier", () => {
    expect(getTowerVisualScale()).toBeGreaterThan(getWorldScale());
  });
});
