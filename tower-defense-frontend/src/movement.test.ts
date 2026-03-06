import { describe, expect, it } from "vitest";

import { stepToward } from "./movement";

describe("stepToward", () => {
  it("moves toward target without overshooting", () => {
    const result = stepToward({ x: 0, z: 0 }, { x: 10, z: 0 }, 4, 1);
    expect(result.x).toBeCloseTo(4);
    expect(result.z).toBeCloseTo(0);
    expect(result.reached).toBe(false);
  });

  it("snaps to target when step would overshoot", () => {
    const result = stepToward({ x: 0, z: 0 }, { x: 3, z: 4 }, 20, 1);
    expect(result.x).toBeCloseTo(3);
    expect(result.z).toBeCloseTo(4);
    expect(result.reached).toBe(true);
  });
});
