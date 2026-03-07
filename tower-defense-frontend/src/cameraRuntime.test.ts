import { describe, expect, it } from "vitest";

import { getTopDownFitDistance } from "./cameraRuntime";

describe("getTopDownFitDistance", () => {
  it("returns larger distance for larger worlds", () => {
    const small = getTopDownFitDistance(140, 110, 52, 16 / 9);
    const large = getTopDownFitDistance(320, 320, 52, 16 / 9);
    expect(large).toBeGreaterThan(small);
  });

  it("returns larger distance for narrower aspect", () => {
    const wide = getTopDownFitDistance(320, 320, 52, 16 / 9);
    const narrow = getTopDownFitDistance(320, 320, 52, 9 / 16);
    expect(narrow).toBeGreaterThan(wide);
  });
});
