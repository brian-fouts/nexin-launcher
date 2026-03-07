import { describe, expect, it } from "vitest";

import { getTouchApproachPoint } from "./placementRuntime";

describe("getTouchApproachPoint", () => {
  it("returns a point at touch distance from tower", () => {
    const p = getTouchApproachPoint({ x: 20, z: 0 }, { x: 0, z: 0 }, 10);
    expect(Math.hypot(p.x, p.z)).toBeCloseTo(10, 5);
  });

  it("handles player exactly on tower point", () => {
    const p = getTouchApproachPoint({ x: 0, z: 0 }, { x: 0, z: 0 }, 8);
    expect(p.x).toBeCloseTo(0);
    expect(p.z).toBeCloseTo(8);
  });
});
