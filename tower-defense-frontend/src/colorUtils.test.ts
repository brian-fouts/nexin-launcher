import { describe, expect, it } from "vitest";

import { colorFromHslDegrees } from "./colorUtils";

describe("colorFromHslDegrees", () => {
  it("creates non-white colors for saturated inputs", () => {
    const c = colorFromHslDegrees(180, 80, 50);
    expect(c.getHexString()).not.toBe("ffffff");
  });

  it("wraps hue degrees and clamps channels", () => {
    const a = colorFromHslDegrees(420, 85, 60);
    const b = colorFromHslDegrees(60, 85, 60);
    expect(a.getHexString()).toBe(b.getHexString());
  });
});
